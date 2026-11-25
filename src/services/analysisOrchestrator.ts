import {
  BatchTelemetryMetrics,
  EnrichedPQRSRecord,
  PQRSAnalysis,
  SemanticGroup
} from '../types';
import {
  buildPQRSAnalysis,
  classifyPQRDeterministic,
  hasExplicitClassificationRule,
  PQRClassificationResult,
  PQRInputRecord,
  recordRequiresHumanReview
} from './classifierEngine';
import { clusterRecords } from './similarityService';
import { createEmptyBatchTelemetry, mergeBatchTelemetry } from './qualityMetricsService';

export interface OrchestratorProgressUpdate {
  loteActual: number;
  totalLotes: number;
  expedientesProcesados: number;
  faseActual: string;
  porcentaje: number;
  estado: 'PROCESSING' | 'EMBEDDING' | 'GROUPING' | 'COMPLETED';
}

export interface OrchestratorResult {
  records: EnrichedPQRSRecord[];
  groups: SemanticGroup[];
  telemetry: BatchTelemetryMetrics;
  usedRulesFallback: boolean;
  totalClasificadosAutomaticamente: number;
  totalRevisionHumana: number;
  geminiBatchCallsAttempted: number;
}

export interface OrchestratorOptions {
  batchSize?: number;
  maxConsecutiveGeminiFailures?: number;
  fetchFn?: typeof fetch;
  onProgress?: (update: OrchestratorProgressUpdate) => void;
}

function buildRecordInput(rec: EnrichedPQRSRecord): PQRInputRecord {
  const submotivo =
    rec.columnas_adicionales?.['SUBMOTIVO'] ||
    rec.columnas_adicionales?.['submotivo'] ||
    rec.columnas_adicionales?.['SUB_MOTIVO'] ||
    rec.resumen_original;

  const producto =
    rec.columnas_adicionales?.['NOMBRE_PRODUCTO'] ||
    rec.columnas_adicionales?.['nombre_producto'] ||
    rec.columnas_adicionales?.['PRODUCTO'] ||
    rec.columnas_adicionales?.['producto'];

  return {
    numero_expediente: rec.numero_expediente,
    resumen_original: rec.resumen_original,
    descripcion_original: rec.descripcion_original,
    submotivo_original: submotivo,
    producto_original: producto,
    columnas_adicionales: rec.columnas_adicionales
  };
}

function isJsonResponse(res: Response): boolean {
  const contentType = res.headers?.get?.('content-type') || '';
  return contentType.toLowerCase().includes('application/json');
}

async function parseValidatedJson(res: Response, endpointLabel: string): Promise<any> {
  if (!res.ok) {
    throw new Error(`${endpointLabel} respondió con estado HTTP ${res.status}`);
  }
  if (!isJsonResponse(res)) {
    const contentType = res.headers?.get?.('content-type') || 'desconocido';
    throw new Error(`${endpointLabel} devolvió content-type no JSON (${contentType})`);
  }
  try {
    return await res.json();
  } catch (err: any) {
    throw new Error(`${endpointLabel} devolvió JSON inválido: ${err?.message || String(err)}`);
  }
}

/**
 * Orchestrates IRIS PQRS analysis:
 * 1. Applies local deterministic business rules first; records matching an explicit rule
 *    are finalized immediately without calling Gemini.
 * 2. Sends ONLY records without an explicit rule match to `/api/analyze-batch`.
 * 3. Validates `res.ok` and `content-type: application/json` before reading any response.
 * 4. On any Gemini/network/HTTP/JSON error, logs solely to `console.error` and continues
 *    silently with local rules without flooding Revisión humana.
 * 5. Circuit breaker: after 2 consecutive batch failures, skips Gemini for the remainder
 *    of the execution and finishes exclusively with local rules.
 */
export async function runPQRSAnalysisPipeline(
  validRecords: EnrichedPQRSRecord[],
  options: OrchestratorOptions = {}
): Promise<OrchestratorResult> {
  const batchSize = options.batchSize ?? 10;
  const maxConsecutiveFailures = options.maxConsecutiveGeminiFailures ?? 2;
  const fetchImpl = options.fetchFn ?? fetch;

  const analyzedSlots: (EnrichedPQRSRecord | undefined)[] = new Array(validRecords.length);
  const precomputedInputs: PQRInputRecord[] = new Array(validRecords.length);
  const precomputedDeterministic: PQRClassificationResult[] = new Array(validRecords.length);
  const unmatchedIndices: number[] = [];

  let processedCount = 0;

  // Step 1: Evaluate deterministic rules locally for all records
  for (let idx = 0; idx < validRecords.length; idx++) {
    const rec = validRecords[idx];
    const recordInput = buildRecordInput(rec);
    const deterministic = classifyPQRDeterministic(recordInput);
    precomputedInputs[idx] = recordInput;
    precomputedDeterministic[idx] = deterministic;

    if (hasExplicitClassificationRule(deterministic)) {
      const analysis = buildPQRSAnalysis(recordInput, deterministic);
      analyzedSlots[idx] = {
        ...rec,
        analisis: analysis,
        estado_procesamiento: 'COMPLETADO'
      };
      processedCount++;
    } else {
      unmatchedIndices.push(idx);
    }
  }

  const totalGeminiBatches = Math.ceil(unmatchedIndices.length / batchSize);
  const displayTotalBatches = Math.max(1, totalGeminiBatches);

  let accumulatedTelemetry: BatchTelemetryMetrics = createEmptyBatchTelemetry();
  let consecutiveGeminiFailures = 0;
  let geminiCircuitOpen = false;
  let usedRulesFallback = false;
  let geminiBatchCallsAttempted = 0;

  options.onProgress?.({
    loteActual: 1,
    totalLotes: displayTotalBatches,
    expedientesProcesados: processedCount,
    faseActual:
      totalGeminiBatches === 0
        ? `Clasificación: ${processedCount} expedientes clasificados con reglas internas...`
        : `Clasificación: analizando ${validRecords.length} expedientes...`,
    porcentaje: totalGeminiBatches === 0 ? 65 : 10,
    estado: 'PROCESSING'
  });

  // Step 2: Send ONLY unmatched cases to Gemini in batches
  for (let batchIdx = 0; batchIdx < totalGeminiBatches; batchIdx++) {
    const sliceIndices = unmatchedIndices.slice(batchIdx * batchSize, (batchIdx + 1) * batchSize);
    const currentBatchNum = batchIdx + 1;

    options.onProgress?.({
      loteActual: currentBatchNum,
      totalLotes: totalGeminiBatches,
      expedientesProcesados: processedCount,
      faseActual: `Clasificación: procesando lote ${currentBatchNum} de ${totalGeminiBatches} (${sliceIndices.length} casos)...`,
      porcentaje: Math.round(10 + (batchIdx / totalGeminiBatches) * 60),
      estado: 'PROCESSING'
    });

    const applyLocalRulesToSlice = () => {
      sliceIndices.forEach(origIdx => {
        const rec = validRecords[origIdx];
        const analysis = buildPQRSAnalysis(precomputedInputs[origIdx], precomputedDeterministic[origIdx]);
        analyzedSlots[origIdx] = {
          ...rec,
          analisis: analysis,
          estado_procesamiento: 'COMPLETADO'
        };
      });
    };

    if (geminiCircuitOpen) {
      usedRulesFallback = true;
      applyLocalRulesToSlice();
      processedCount += sliceIndices.length;
      options.onProgress?.({
        loteActual: currentBatchNum,
        totalLotes: totalGeminiBatches,
        expedientesProcesados: processedCount,
        faseActual: `Clasificación: procesando lote ${currentBatchNum} de ${totalGeminiBatches}...`,
        porcentaje: Math.round(10 + ((batchIdx + 1) / totalGeminiBatches) * 60),
        estado: 'PROCESSING'
      });
      continue;
    }

    const payload = sliceIndices.map(origIdx => {
      const rec = validRecords[origIdx];
      const input = precomputedInputs[origIdx];
      return {
        numero_expediente: rec.numero_expediente,
        resumen_original: rec.resumen_original,
        descripcion_original: rec.descripcion_original,
        submotivo_original: input.submotivo_original,
        producto_original: input.producto_original,
        hash_descripcion: rec.hash_descripcion,
        columnas_adicionales: rec.columnas_adicionales
      };
    });

    try {
      geminiBatchCallsAttempted++;
      const res = await fetchImpl('/api/analyze-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: payload })
      });

      const data = await parseValidatedJson(res, '/api/analyze-batch');

      if (!data?.success || !Array.isArray(data.analyses) || data.analyses.length !== sliceIndices.length) {
        throw new Error(data?.details || data?.error || 'Respuesta incompleta en /api/analyze-batch');
      }

      consecutiveGeminiFailures = 0;

      if (data.telemetry) {
        accumulatedTelemetry = mergeBatchTelemetry(accumulatedTelemetry, data.telemetry);
        const secondPassErrors = data.telemetry.por_etapa?.segunda_validacion_otras?.errores || 0;
        if (secondPassErrors > 0) {
          usedRulesFallback = true;
          if (Array.isArray(data.telemetry.errores_segunda_validacion)) {
            console.error(
              `[IRIS] Errores en segunda validación del lote ${currentBatchNum}:`,
              data.telemetry.errores_segunda_validacion
            );
          }
        }
      }

      sliceIndices.forEach((origIdx, pos) => {
        const rec = validRecords[origIdx];
        const analysis: PQRSAnalysis = data.analyses[pos];
        analyzedSlots[origIdx] = {
          ...rec,
          analisis: analysis,
          estado_procesamiento: 'COMPLETADO'
        };
      });
    } catch (batchErr: any) {
      console.error(`[IRIS] Fallo en /api/analyze-batch (lote ${currentBatchNum}):`, batchErr);
      usedRulesFallback = true;
      consecutiveGeminiFailures++;
      if (consecutiveGeminiFailures >= maxConsecutiveFailures) {
        geminiCircuitOpen = true;
        console.error(
          `[IRIS] Se alcanzó el límite de ${maxConsecutiveFailures} fallos consecutivos de Gemini. El resto de la ejecución continuará solo con reglas internas.`
        );
      }
      applyLocalRulesToSlice();
    }

    processedCount += sliceIndices.length;
    options.onProgress?.({
      loteActual: currentBatchNum,
      totalLotes: totalGeminiBatches,
      expedientesProcesados: processedCount,
      faseActual: `Clasificación: lote ${currentBatchNum} de ${totalGeminiBatches} procesado`,
      porcentaje: Math.round(10 + ((batchIdx + 1) / totalGeminiBatches) * 60),
      estado: 'PROCESSING'
    });
  }

  const analyzedRecords: EnrichedPQRSRecord[] = analyzedSlots.map((slot, idx) => {
    if (slot) return slot;
    const rec = validRecords[idx];
    return {
      ...rec,
      analisis: buildPQRSAnalysis(precomputedInputs[idx], precomputedDeterministic[idx]),
      estado_procesamiento: 'COMPLETADO'
    };
  });

  // Step 3: Embeddings (skipped if Gemini circuit breaker is open; validated strictly for JSON)
  options.onProgress?.({
    loteActual: displayTotalBatches,
    totalLotes: displayTotalBatches,
    expedientesProcesados: analyzedRecords.length,
    faseActual: 'Calculando similitud entre expedientes...',
    porcentaje: 75,
    estado: 'EMBEDDING'
  });

  if (!geminiCircuitOpen && analyzedRecords.length > 0) {
    try {
      const textDescriptions = analyzedRecords.map(r => r.descripcion_normalizada || r.descripcion_original);
      const embRes = await fetchImpl('/api/embeddings-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: textDescriptions })
      });
      const embData = await parseValidatedJson(embRes, '/api/embeddings-batch');
      if (embData?.success && Array.isArray(embData.embeddings)) {
        analyzedRecords.forEach((rec, idx) => {
          rec.embedding = embData.embeddings[idx];
        });
      }
    } catch (embErr) {
      console.error('[IRIS] Embeddings fallback local activado:', embErr);
    }
  }

  // Step 4: Grouping
  options.onProgress?.({
    loteActual: displayTotalBatches,
    totalLotes: displayTotalBatches,
    expedientesProcesados: analyzedRecords.length,
    faseActual: 'Agrupando expedientes con problemáticas similares...',
    porcentaje: 88,
    estado: 'GROUPING'
  });

  const { groups, recordsWithGroups } = clusterRecords(analyzedRecords, 0.78);

  const totalRevisionHumana = recordsWithGroups.filter(r => recordRequiresHumanReview(r)).length;
  const totalClasificadosAutomaticamente = Math.max(0, recordsWithGroups.length - totalRevisionHumana);

  options.onProgress?.({
    loteActual: displayTotalBatches,
    totalLotes: displayTotalBatches,
    expedientesProcesados: recordsWithGroups.length,
    faseActual: 'Clasificación completada',
    porcentaje: 100,
    estado: 'COMPLETED'
  });

  return {
    records: recordsWithGroups,
    groups,
    telemetry: accumulatedTelemetry,
    usedRulesFallback,
    totalClasificadosAutomaticamente,
    totalRevisionHumana,
    geminiBatchCallsAttempted
  };
}
