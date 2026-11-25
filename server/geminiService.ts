import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import {
  BatchTelemetryMetrics,
  GeminiStageUsage,
  PQRSAnalysis,
  SegundaValidacionOtrasInfo
} from '../src/types';
import { hashText } from '../src/services/textNormalizer';
import { getCatalogSummary, validateCatalogPair } from '../src/services/catalog';
import {
  classifyPQRDeterministic,
  buildPQRSAnalysis,
  consolidateBatchClassifications,
  hasExplicitClassificationRule,
  hasExpressCarteraReversionRequest,
  isCreditCardPrimaryContext,
  normalizeCategoryName
} from '../src/services/classifierEngine';
import { createEmptyBatchTelemetry } from '../src/services/qualityMetricsService';

const GEMINI_TEXT_MODEL = 'gemini-4-hydrogen';
const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-2';
const GEMINI_TIMEOUT_MS = 60000;
const GEMINI_MAX_RETRIES = 2;
const SECOND_PASS_BATCH_SIZE = 8;
const CACHE_SCHEMA_VERSION = 'v11-bdb-tc-vs-cartera-reversion';

let aiInstance: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no está configurada en el servidor.');
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiInstance;
}

// In-memory cache for analyzed descriptions (includes tipo_caso and second-pass OTRAS outcome)
const analysisCache = new Map<string, PQRSAnalysis>();
const embeddingCache = new Map<string, number[]>();

export function clearAnalysisCacheForTests(): void {
  analysisCache.clear();
}

export type BatchInputRecord = {
  numero_expediente: string;
  resumen_original: string;
  descripcion_original: string;
  submotivo_original?: string;
  producto_original?: string;
  fecha_radicacion?: string;
  fecha_compromiso?: string;
  hash_descripcion?: string;
  columnas_adicionales?: Record<string, any>;
};

export type GenerateContentFn = (params: any) => Promise<{
  text?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}>;

export interface AnalyzeBatchOptions {
  /** Optional custom model invocation used only in automated tests to verify selective pass-2 & quota fallback */
  generateContentFn?: GenerateContentFn;
  /** Skip in-memory cache (optional, useful in isolated test runs) */
  bypassCache?: boolean;
  /** Optional override for second-pass batch chunk size */
  secondPassBatchSize?: number;
}

export interface AnalyzeBatchWithMetricsResult {
  analyses: PQRSAnalysis[];
  telemetry: BatchTelemetryMetrics;
}

function buildRecordCacheKey(rec: BatchInputRecord): string {
  const contextKey = `${CACHE_SCHEMA_VERSION}|${rec.descripcion_original || ''}|${rec.submotivo_original || ''}|${rec.resumen_original || ''}|${rec.producto_original || ''}`;
  return hashText(contextKey);
}

function recordUsageMetadata(
  telemetry: BatchTelemetryMetrics,
  stage: keyof BatchTelemetryMetrics['por_etapa'],
  recordsSent: number,
  response: any
): void {
  const stageBucket: GeminiStageUsage = telemetry.por_etapa[stage];
  stageBucket.llamadas += 1;
  stageBucket.expedientes_enviados += recordsSent;

  telemetry.llamadas_gemini_total += 1;
  if (stage === 'clasificacion_inicial') telemetry.llamadas_clasificacion_inicial += 1;
  if (stage === 'tipo_caso') telemetry.llamadas_tipo_caso += 1;
  if (stage === 'segunda_validacion_otras') telemetry.llamadas_segunda_validacion_otras += 1;

  const meta = response?.usageMetadata;
  if (meta && typeof meta === 'object') {
    const promptTokens = Number(meta.promptTokenCount || 0);
    const candidatesTokens = Number(meta.candidatesTokenCount || 0);
    const totalTokens = Number(meta.totalTokenCount || promptTokens + candidatesTokens);

    if (promptTokens > 0 || candidatesTokens > 0 || totalTokens > 0) {
      stageBucket.prompt_tokens += promptTokens;
      stageBucket.candidates_tokens += candidatesTokens;
      stageBucket.total_tokens += totalTokens;

      telemetry.tokens.disponible = true;
      telemetry.tokens.prompt_tokens += promptTokens;
      telemetry.tokens.candidates_tokens += candidatesTokens;
      telemetry.tokens.total_tokens += totalTokens;
    }
  }
}

function hasExplicitCDTMention(descripcion: string): boolean {
  const lowerDesc = String(descripcion || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return (
    /\bcdt\b/i.test(lowerDesc) ||
    /\bcdts\b/i.test(lowerDesc) ||
    /\bc\.d\.t\b/i.test(lowerDesc) ||
    lowerDesc.includes('certificado de deposito') ||
    lowerDesc.includes('certificado a termino') ||
    lowerDesc.includes('deposito a termino') ||
    lowerDesc.includes('inversion cdt') ||
    lowerDesc.includes('deceval')
  );
}

function isTransientGeminiError(err: any): boolean {
  const status = Number(err?.status ?? err?.code ?? err?.error?.code ?? 0);
  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  const msg = String(err?.message || err || '').toLowerCase();
  if (
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('permission_denied') ||
    msg.includes('api_key_invalid') ||
    msg.includes('not_found') ||
    msg.includes('429') ||
    msg.includes('403') ||
    msg.includes('401') ||
    msg.includes('400')
  ) {
    return false;
  }
  return (
    msg.includes('timeout en ') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('deadline_exceeded') ||
    msg.includes('temporarily unavailable') ||
    msg.includes('etimedout') ||
    msg.includes('econnreset') ||
    msg.includes('fetch failed') ||
    msg.includes('"code":503') ||
    msg.includes('"code":500')
  );
}

function extractReadableGeminiError(err: any): string {
  const raw = String(err?.message || err || 'Error desconocido en Gemini').trim();
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) {
      const codePrefix = parsed.error.code ? `[${parsed.error.code}] ` : '';
      return `${codePrefix}${parsed.error.message}`;
    }
  } catch {
    // Keep raw message if not JSON
  }
  return raw;
}

async function invokeGenerateContent(
  generateFn: GenerateContentFn,
  params: any,
  timeoutLabel: string,
  opts?: { timeoutMs?: number; maxRetries?: number }
): Promise<any> {
  const timeoutMs = opts?.timeoutMs ?? GEMINI_TIMEOUT_MS;
  const maxRetries = opts?.maxRetries ?? GEMINI_MAX_RETRIES;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const apiCall = Promise.resolve().then(() => generateFn(params));
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Timeout en ${timeoutLabel} (${Math.round(timeoutMs / 1000)}s)`)),
          timeoutMs
        );
      });
      return await Promise.race([apiCall, timeoutPromise]);
    } catch (err: any) {
      lastError = err;
      const shouldRetry = attempt < maxRetries && isTransientGeminiError(err);
      if (!shouldRetry) {
        throw err;
      }
      const backoffMs = 1000 * Math.pow(2, attempt) + Math.floor(Math.random() * 400);
      console.warn(
        `[IRIS] Reintento ${attempt + 1}/${maxRetries} en ${timeoutLabel} tras error transitorio: ${err?.message || err}`
      );
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  }

  throw lastError;
}

interface SecondPassCandidate {
  originalIdx: number;
  hash: string;
  rec: BatchInputRecord;
  initialAnalysis: PQRSAnalysis;
}

/**
 * Selective second-pass semantic validation executed EXCLUSIVELY for records
 * that remained in category "OTRAS" after the initial classification.
 *
 * - Reuses description, context, catalog, and first-pass analysis in memory.
 * - Processes candidates in bounded batches to optimize token/call usage.
 * - Never forces a category just to reduce OTRAS.
 * - On Gemini quota/availability errors, preserves the initial OTRAS result
 *   without interrupting batch processing and records detailed traceability.
 */
async function runSecondValidationForOtras(
  generateFn: GenerateContentFn,
  candidates: SecondPassCandidate[],
  activeCatalogSummary: string,
  telemetry: BatchTelemetryMetrics,
  results: PQRSAnalysis[],
  bypassCache: boolean,
  chunkSize: number = SECOND_PASS_BATCH_SIZE
): Promise<void> {
  if (candidates.length === 0) return;

  const effectiveChunkSize = Math.max(1, chunkSize);

  for (let start = 0; start < candidates.length; start += effectiveChunkSize) {
    const chunk = candidates.slice(start, start + effectiveChunkSize);

    const formattedOtrasCases = chunk.map(item => ({
      expediente: String(item.rec.numero_expediente),
      DESC_DETALLADA: String(item.rec.descripcion_original || ''),
      SUBMOTIVO_CONTEXTO: String(item.rec.submotivo_original || item.rec.resumen_original || 'No provisto'),
      NOMBRE_PRODUCTO_CONTEXTO: String(item.rec.producto_original || 'No provisto'),
      ANALISIS_INICIAL_REUTILIZADO: {
        categoria_inicial: item.initialAnalysis.categoria_principal || item.initialAnalysis.categoria,
        subcategoria_inicial: item.initialAnalysis.subcategoria,
        producto_detectado: item.initialAnalysis.producto_detectado || 'NO ESPECIFICADO',
        problema_principal: item.initialAnalysis.problema_principal || '',
        solicitud_cliente: item.initialAnalysis.solicitud_cliente || '',
        evidencia_textual: item.initialAnalysis.evidencia_textual || '',
        confianza: item.initialAnalysis.confianza
      }
    }));

    const secondPassPrompt = `
# SEGUNDA VALIDACIÓN SEMÁNTICA SELECTIVA EXCLUSIVA PARA CASOS "OTRAS" – IRIS (BANCO DE BOGOTÁ)

Eres un analista senior experto en PQRS bancarias. Recibes ÚNICAMENTE expedientes que en la primera etapa quedaron clasificados en "OTRAS".
Tu objetivo es determinar con rigor semántico —comprendiendo el contexto y la intención real del cliente, NO buscando palabras literales— si cada expediente realmente corresponde a una categoría y subcategoría válida del catálogo vigente o si debe permanecer en "OTRAS".

### REGLAS OBLIGATORIAS ANTES DE CONSERVAR "OTRAS"
Comprueba sistemáticamente para cada expediente:
1. ¿El problema descrito ya existe en alguna categoría del catálogo vigente?
2. ¿El cliente está describiendo una situación bancaria conocida con lenguaje cotidiano, coloquial, indirecto o con errores ortográficos?
3. ¿Es posible identificar el producto involucrado a partir de la descripción completa aunque el resumen original sea impreciso?
4. ¿Existe una subcategoría válida que corresponda al motivo principal del cliente (especialmente si menciona varios temas: prioriza siempre el problema principal o solicitud central)?
5. ¿La descripción contiene hechos suficientes para sustentar la clasificación SIN inventar información?

### REGLAS ESTRICTAS PARA NO FORZAR CLASIFICACIONES
PROHIBIDO forzar una categoría solamente para reducir el porcentaje de OTRAS.
DEBE conservarse "OTRAS" (decision: "CONSERVAR_OTRAS") cuando:
- No existe ninguna categoría del catálogo vigente que represente razonablemente el problema.
- La descripción es insuficiente, contradictoria o demasiado ambigua para determinar el motivo real.
- No se puede identificar razonablemente qué ocurrió ni qué espera el cliente.
- Elegir una categoría alternativa requeriría inventar hechos o asumir información ausente.

### INTEGRIDAD DEL CATÁLOGO Y REGLAS ESPECIALES VIGENTES
- NO inventes, renombres ni fusiones categorías o subcategorías. Usa EXCLUSIVAMENTE combinaciones padre-hijo exactas del catálogo vigente.
- La descripción completa del cliente (DESC_DETALLADA) prevalece siempre sobre un resumen o submotivo impreciso.
- Respeta todas las reglas especiales vigentes:
  * CDT solo cuando el expediente mencione explícitamente CDT / certificado de depósito a término / Deceval (la palabra "cuenta" nunca es CDT).
  * CUOTAS DE MANEJO solo para cuota de manejo/administración de tarjetas o cuentas (nunca cuotas de crédito/cartera).
  * EMBARGOS solo ante medida cautelar judicial real (nunca por la conjunción "sin embargo").
  * Cancelación/cierre de tarjeta de crédito o producto -> PRODUCTOS > CANCELACIÓN DE PRODUCTOS (no CONDICIONES).
  * Las menciones a Itaú no son categoría ni producto; clasifica bajo el catálogo vigente del Banco de Bogotá.
- Reutiliza del bloque ANALISIS_INICIAL_REUTILIZADO los datos que ya sean correctos (producto, evidencia) cuando no requieran corrección.
- REGLA PRIORITARIA DE PRODUCTO (CRÉDITO/CARTERA vs. TARJETA DE CRÉDITO): identifica primero si el cliente habla de TARJETA DE CRÉDITO (tarjeta, TC, cupo, pago/compras/extracto/deuda de tarjeta) o de CRÉDITO/CARTERA (consumo, vivienda, vehículo, leasing, libranza). NUNCA recuperes un caso de TARJETA DE CRÉDITO hacia CRÉDITOS / CARTERA (y nunca hacia CRÉDITOS / CARTERA > REVERSIÓN).
- CRITERIO ESTRICTO DE REVERSIÓN (CRÉDITOS / CARTERA): solo asigna CRÉDITOS / CARTERA > REVERSIÓN cuando el cliente solicite expresamente reversar, anular o devolver a su cuenta un pago YA APLICADO a una obligación de cartera (nunca para TC, pagos no reflejados, rastreo, traslado entre obligaciones, pago duplicado sin pedir devolución, corrección de aplicación ni reliquidación/aclaración de saldo).
- NO redactes respuestas oficiales definitivas del banco; la propuesta de respuesta es únicamente una orientación interna breve para el analista.

### CATÁLOGO VIGENTE (ÚNICAS COMBINACIONES PERMITIDAS)
${activeCatalogSummary}

### TRAZABILIDAD OBLIGATORIA
- Si decision = "RECUPERAR": entrega categoria_principal y subcategoria exactas del catálogo vigente, evidencia_textual fiel tomada de DESC_DETALLADA, producto_detectado, problema_principal, solicitud_cliente, resumen_requerimiento (máx. 20 palabras) y resultado_validacion explicando por qué se recuperó.
- Si decision = "CONSERVAR_OTRAS": conserva categoria_principal = "OTRAS" y subcategoria = "CASOS ATÍPICOS", e indica de forma concreta (NUNCA genérica):
  * motivo_permanencia_otras: razón específica por la que permanece en OTRAS.
  * producto_detectado: producto identificable o "NO ESPECIFICADO".
  * problema_principal: problema central identificado en la descripción.
  * solicitud_cliente: qué solicita o espera el cliente.
  * evidencia_textual: fragmento textual tomado de DESC_DETALLADA.
  * resultado_validacion: conclusión concreta de esta segunda validación.
  * motivo_revision_humana: justificación concreta por la que un analista humano debe revisarlo.

EXPEDIENTES EN OTRAS A REVALIDAR (JSON):
${JSON.stringify(formattedOtrasCases, null, 2)}
`;

    try {
      const response = await invokeGenerateContent(
        generateFn,
        {
          model: GEMINI_TEXT_MODEL,
          contents: secondPassPrompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  expediente: { type: Type.STRING },
                  decision: {
                    type: Type.STRING,
                    enum: ['RECUPERAR', 'CONSERVAR_OTRAS'],
                    description: 'RECUPERAR si corresponde a una categoría válida del catálogo; CONSERVAR_OTRAS si debe mantenerse en OTRAS'
                  },
                  categoria_principal: { type: Type.STRING },
                  subcategoria: { type: Type.STRING },
                  producto_detectado: { type: Type.STRING },
                  problema_principal: { type: Type.STRING },
                  solicitud_cliente: { type: Type.STRING },
                  resumen_requerimiento: { type: Type.STRING },
                  evidencia_textual: { type: Type.STRING },
                  confianza: { type: Type.INTEGER },
                  motivo_permanencia_otras: { type: Type.STRING },
                  resultado_validacion: { type: Type.STRING },
                  motivo_revision_humana: { type: Type.STRING }
                },
                required: [
                  'expediente',
                  'decision',
                  'categoria_principal',
                  'subcategoria',
                  'problema_principal',
                  'solicitud_cliente',
                  'evidencia_textual',
                  'resultado_validacion'
                ]
              }
            }
          }
        },
        'segunda validación semántica OTRAS Gemini'
      );

      recordUsageMetadata(telemetry, 'segunda_validacion_otras', chunk.length, response);

      const parsedText = response.text ? response.text.trim() : '[]';
      const parsedArray = JSON.parse(parsedText);
      if (!Array.isArray(parsedArray)) {
        throw new Error('La segunda validación de Gemini no devolvió una lista JSON válida.');
      }

      const nowIso = new Date().toISOString();

      chunk.forEach((item, idx) => {
        const aiData =
          parsedArray.find(
            (p: any) =>
              String(p.expediente || p.numero_expediente) === String(item.rec.numero_expediente)
          ) || parsedArray[idx];

        const initial = item.initialAnalysis;
        const initialCat = initial.categoria_principal || initial.categoria || 'OTRAS';
        const initialSub = initial.subcategoria || 'CASOS ATÍPICOS';
        const decision = String(aiData?.decision || 'CONSERVAR_OTRAS').trim().toUpperCase();
        const rawCat = String(aiData?.categoria_principal || '').trim();
        const rawSub = String(aiData?.subcategoria || '').trim();

        const catalogCheck = validateCatalogPair(rawCat, rawSub);
        const cdtAllowed =
          catalogCheck.categoria !== 'CDT' || hasExplicitCDTMention(item.rec.descripcion_original);
        const tcCarteraAllowed =
          catalogCheck.categoria !== 'CRÉDITOS / CARTERA' ||
          !isCreditCardPrimaryContext(
            item.rec.descripcion_original,
            item.rec.submotivo_original || item.rec.resumen_original || '',
            String(aiData?.producto_detectado || item.rec.producto_original || '')
          );
        const reversionAllowed =
          !(catalogCheck.categoria === 'CRÉDITOS / CARTERA' && catalogCheck.subcategoria === 'REVERSIÓN') ||
          hasExpressCarteraReversionRequest(item.rec.descripcion_original);

        const canRecover =
          decision === 'RECUPERAR' &&
          catalogCheck.valid &&
          catalogCheck.categoria !== 'OTRAS' &&
          cdtAllowed &&
          tcCarteraAllowed &&
          reversionAllowed;

        const evidenciaFinal =
          String(aiData?.evidencia_textual || '').trim() ||
          initial.evidencia_textual ||
          item.rec.descripcion_original.slice(0, 120);

        const productoFinal =
          String(aiData?.producto_detectado || '').trim() ||
          initial.producto_detectado ||
          item.rec.producto_original ||
          'NO ESPECIFICADO';

        const problemaFinal =
          String(aiData?.problema_principal || '').trim() ||
          initial.problema_principal ||
          item.rec.descripcion_original.slice(0, 100);

        const solicitudFinal =
          String(aiData?.solicitud_cliente || '').trim() ||
          initial.solicitud_cliente ||
          'Revisión del requerimiento expuesto por el cliente';

        const resumenFinal =
          String(aiData?.resumen_requerimiento || '').trim() ||
          initial.resumen_requerimiento ||
          `${catalogCheck.categoria}: ${item.rec.descripcion_original.slice(0, 90)}`;

        if (canRecover) {
          const conf =
            typeof aiData?.confianza === 'number'
              ? Math.min(100, Math.max(0, aiData.confianza))
              : Math.max(82, initial.confianza || 82);
          const reqRev = catalogCheck.categoria === 'REVISIÓN HUMANA' || conf < 70;

          const segundaValidacionInfo: SegundaValidacionOtrasInfo = {
            ejecutada: true,
            estado: 'RECUPERADO',
            categoria_inicial: initialCat,
            subcategoria_inicial: initialSub,
            categoria_final: catalogCheck.categoria,
            subcategoria_final: catalogCheck.subcategoria,
            resultado_validacion:
              String(aiData?.resultado_validacion || '').trim() ||
              `Recuperado desde OTRAS hacia ${catalogCheck.categoria} > ${catalogCheck.subcategoria} con sustento en la descripción completa.`,
            evidencia_validacion: evidenciaFinal,
            motivo_revision_humana: reqRev
              ? String(aiData?.motivo_revision_humana || '').trim() ||
                'Requiere confirmación manual del analista.'
              : undefined,
            fecha_validacion: nowIso
          };

          const recoveredAnalysis = buildPQRSAnalysis(item.rec, {
            expediente: item.rec.numero_expediente,
            categoria_principal: catalogCheck.categoria,
            subcategoria: catalogCheck.subcategoria,
            resumen_requerimiento: resumenFinal,
            intencion_cliente: solicitudFinal,
            confianza: conf,
            requiere_revision_humana: reqRev,
            motivo_de_revision: segundaValidacionInfo.motivo_revision_humana,
            producto_detectado: productoFinal,
            problema_principal: problemaFinal,
            solicitud_cliente: solicitudFinal,
            evidencia_textual: evidenciaFinal,
            origen_clasificacion: 'RECUPERADO_SEGUNDA_VALIDACION',
            segunda_validacion_otras: segundaValidacionInfo
          });

          results[item.originalIdx] = {
            ...recoveredAnalysis,
            modelo_ia: GEMINI_TEXT_MODEL
          };

          if (!bypassCache) {
            analysisCache.set(item.hash, results[item.originalIdx]);
          }
        } else {
          // Confirmed OTRAS with full concrete internal traceability
          const motivoPermanencia =
            String(aiData?.motivo_permanencia_otras || '').trim() ||
            (decision === 'RECUPERAR' && !catalogCheck.valid
              ? `La categoría sugerida ("${rawCat} > ${rawSub}") no pertenece al catálogo vigente; se conserva en OTRAS sin forzar clasificación.`
              : 'La descripción no corresponde de forma sustentada a ninguna categoría operativa del catálogo vigente sin inventar información.');

          const resultadoValidacion =
            String(aiData?.resultado_validacion || '').trim() ||
            'Segunda validación semántica completada: se confirma permanencia en OTRAS por ausencia de categoría aplicable o información insuficiente.';

          const motivoRevision =
            String(aiData?.motivo_revision_humana || '').trim() ||
            `Confirmado en OTRAS tras segunda validación: ${motivoPermanencia}`;

          const segundaValidacionInfo: SegundaValidacionOtrasInfo = {
            ejecutada: true,
            estado: 'CONFIRMADO_OTRAS',
            categoria_inicial: initialCat,
            subcategoria_inicial: initialSub,
            categoria_final: 'OTRAS',
            subcategoria_final: 'CASOS ATÍPICOS',
            motivo_permanencia_otras: motivoPermanencia,
            resultado_validacion: resultadoValidacion,
            evidencia_validacion: evidenciaFinal,
            motivo_revision_humana: motivoRevision,
            fecha_validacion: nowIso
          };

          const confirmedOtras: PQRSAnalysis = {
            ...initial,
            categoria: 'OTRAS',
            categoria_principal: 'OTRAS',
            subcategoria: 'CASOS ATÍPICOS',
            categoria_ia: 'OTRAS',
            subcategoria_ia: 'CASOS ATÍPICOS',
            producto: productoFinal,
            producto_detectado: productoFinal,
            problema_principal: problemaFinal,
            solicitud_cliente: solicitudFinal,
            que_solicita_exactamente: solicitudFinal,
            evidencia_textual: evidenciaFinal,
            evidencia_clasificacion: evidenciaFinal,
            requiere_revision: true,
            requiere_revision_humana: 'SI',
            motivo_de_revision: motivoRevision,
            origen_clasificacion: 'CONFIRMADO_OTRAS',
            segunda_validacion_otras: segundaValidacionInfo,
            modelo_ia: GEMINI_TEXT_MODEL
          };

          results[item.originalIdx] = confirmedOtras;

          if (!bypassCache) {
            analysisCache.set(item.hash, confirmedOtras);
          }
        }
      });
    } catch (err: any) {
      // Resilient error handling: keep initial OTRAS results, never interrupt processing, never invent a category
      const errMsg = extractReadableGeminiError(err);
      telemetry.por_etapa.segunda_validacion_otras.errores += 1;
      telemetry.errores_segunda_validacion.push(
        `Segunda validación OTRAS (${chunk.length} exp.): ${errMsg}`
      );
      console.error('[IRIS] Error en segunda validación selectiva de OTRAS (se conserva resultado inicial):', errMsg);

      const nowIso = new Date().toISOString();

      chunk.forEach(item => {
        const initial = item.initialAnalysis;
        const initialCat = initial.categoria_principal || initial.categoria || 'OTRAS';
        const initialSub = initial.subcategoria || 'CASOS ATÍPICOS';
        const evidenciaFinal =
          initial.evidencia_textual || item.rec.descripcion_original.slice(0, 120);
        const motivoPermanencia =
          'Se conservó en OTRAS para validación manual del analista.';
        const motivoRevision =
          'Requiere validación humana: el expediente quedó en OTRAS para confirmación manual.';

        const segundaValidacionInfo: SegundaValidacionOtrasInfo = {
          ejecutada: true,
          estado: 'ERROR_CONSERVADO_OTRAS',
          categoria_inicial: initialCat,
          subcategoria_inicial: initialSub,
          categoria_final: initialCat,
          subcategoria_final: initialSub,
          motivo_permanencia_otras: motivoPermanencia,
          resultado_validacion:
            'Se conservó el resultado inicial en OTRAS para validación manual.',
          evidencia_validacion: evidenciaFinal,
          motivo_revision_humana: motivoRevision,
          error_api: errMsg,
          fecha_validacion: nowIso
        };

        results[item.originalIdx] = {
          ...initial,
          requiere_revision: true,
          requiere_revision_humana: 'SI',
          motivo_de_revision: motivoRevision,
          origen_clasificacion: 'CONFIRMADO_OTRAS',
          segunda_validacion_otras: segundaValidacionInfo
        };
        // Intentionally do NOT cache failed pass-2 records so future attempts can re-validate
      });
    }
  }
}

export async function analyzePQRSBatchWithMetrics(
  records: BatchInputRecord[],
  catalogSummary?: string,
  options?: AnalyzeBatchOptions
): Promise<AnalyzeBatchWithMetricsResult> {
  const telemetry = createEmptyBatchTelemetry();
  const results: PQRSAnalysis[] = new Array(records.length);
  const pendingIndices: number[] = [];
  const recordsToAnalyze: BatchInputRecord[] = [];
  const bypassCache = Boolean(options?.bypassCache);

  // 1. Check cache and evaluate explicit business rules first (ZERO Gemini calls for rule-matched cases)
  records.forEach((rec, idx) => {
    const hash = buildRecordCacheKey(rec);
    if (!bypassCache && analysisCache.has(hash)) {
      const cached = analysisCache.get(hash)!;
      telemetry.cache_hits += 1;
      results[idx] = {
        ...cached,
        numero_expediente: rec.numero_expediente
      };
      return;
    }

    // Evaluate business rules ladder
    const deterministic = classifyPQRDeterministic(rec);

    // Explicit business rules have absolute priority and never consume Gemini quota
    if (hasExplicitClassificationRule(deterministic)) {
      const analysis = buildPQRSAnalysis(rec, {
        ...deterministic,
        origen_clasificacion: 'CLASIFICACION_INICIAL',
        segunda_validacion_otras: {
          ejecutada: false,
          estado: 'NO_APLICA',
          categoria_inicial: deterministic.categoria_principal,
          subcategoria_inicial: deterministic.subcategoria,
          categoria_final: deterministic.categoria_principal,
          subcategoria_final: deterministic.subcategoria,
          resultado_validacion: 'Clasificado en categoría válida en la primera etapa.'
        }
      });
      results[idx] = analysis;
      if (!bypassCache) {
        analysisCache.set(hash, analysis);
      }
    } else {
      pendingIndices.push(idx);
      recordsToAnalyze.push(rec);
    }
  });

  // If every single record was resolved by cache or explicit rules, return immediately with ZERO Gemini calls
  if (recordsToAnalyze.length === 0) {
    return {
      analyses: consolidateBatchClassifications(results),
      telemetry
    };
  }

  const generateFn: GenerateContentFn =
    options?.generateContentFn ||
    ((params: any) => getAiClient().models.generateContent(params));

  // 3. Pass 1 semantic classification via Gemini (unchanged prompt, rules & catalog)
  const activeCatalogSummary =
    catalogSummary && catalogSummary.trim() ? catalogSummary.trim() : getCatalogSummary();
  const formattedCases = recordsToAnalyze.map(r => ({
    expediente: String(r.numero_expediente),
    DESC_DETALLADA: String(r.descripcion_original || ''),
    SUBMOTIVO_CONTEXTO: String(r.submotivo_original || r.resumen_original || 'No provisto'),
    NOMBRE_PRODUCTO_CONTEXTO: String(r.producto_original || 'No provisto')
  }));

  const prompt = `
# MOTOR DE CLASIFICACIÓN INTELIGENTE PQRS – BANCO DE BOGOTÁ
## VERSIÓN REFORZADA: CONTROL DE OTRAS, PRODUCTOS Y SUBCATEGORÍAS

### 1. ROL Y OBJETIVO
Actúa como un analista experto en PQRS bancarias del Banco de Bogotá, especializado en interpretación de solicitudes, reclamaciones, productos financieros y procesos operativos.
Tu función es identificar la intención real del cliente y clasificar cada expediente utilizando EXCLUSIVAMENTE el catálogo vigente de la aplicación.
No te limites a buscar palabras clave. Comprende qué ocurrió, qué producto está involucrado, cuál es el inconveniente y qué espera el cliente que se resuelva.
Objetivo principal: clasificación precisa, específica y consistente, reduciendo drásticamente los casos enviados incorrectamente a OTRAS y evitando cruces entre categorías y subcategorías.

### 2. REGLAS OBLIGATORIAS DE INTEGRIDAD DEL CATÁLOGO
1. No inventes, renombres, combines, dividas ni elimines categorías o subcategorías.
2. Utiliza EXCLUSIVAMENTE las combinaciones válidas del catálogo vigente que aparece abajo.
3. Respeta exactamente los nombres, las mayúsculas, las tildes y la relación padre-hijo entre categoría principal y subcategoría.
4. No alteres la estructura de salida ni las columnas del sistema.
5. Si existe más de un tema en la descripción, prioriza la solicitud o inconformidad principal del cliente, no los antecedentes secundarios.
6. Interpreta lenguaje cotidiano, redacción informal, abreviaturas, errores ortográficos, textos largos tipo Derecho de Petición y descripciones sin términos técnicos exactos.

### 3. CONTROL ESTRICTO DE LA CATEGORÍA OTRAS
OTRAS (CASOS ATÍPICOS) es estrictamente residual y excepcional.
PROHIBIDO enviar a OTRAS cuando:
- El texto sea extenso, informal, narrativo o contenga errores ortográficos.
- El expediente mencione un producto identificable y una petición, queja o reclamo operativo claro.
- Se trate de un Derecho de Petición que en realidad solicita un trámite bancario específico (cancelación, reversión, pago, extracto, certificado, ajuste de cuota, etc.).
- El cliente describa el problema con palabras cotidianas en lugar de palabras exactas del catálogo.
Antes de asignar OTRAS, descarta exhaustivamente todas las categorías operativas del catálogo (PRODUCTOS, TARJETAS, CRÉDITOS / CARTERA, CONDICIONES, CDT, CUOTAS DE MANEJO, HONORARIOS Y GASTOS DE COBRANZA, PAGOS / ABONOS, TRANSFERENCIAS, COMISIONES Y COBROS, CANALES DIGITALES, INFORMACIÓN Y DOCUMENTOS, ACTUALIZACIÓN DE DATOS, SEGUROS, SERVICIO / ATENCIÓN, FRAUDES, PSE, GMF, GT5, EMBARGOS).
Solo usa REVISIÓN HUMANA > INFORMACIÓN INSUFICIENTE cuando el texto sea ruido puro, esté vacío o sea genuinamente ininterpretable.

### 4. REGLA PRIORITARIA: CRÉDITO/CARTERA VS. TARJETA DE CRÉDITO (TC) Y REVERSIÓN
Antes de asignar cualquier categoría o subcategoría, determina obligatoriamente si el producto involucrado es:
- TARJETA DE CRÉDITO (TC): tarjeta de crédito, tarjeta, TC, TDC, cupo de tarjeta, pago de tarjeta, compras con tarjeta, extracto de tarjeta, deuda de tarjeta o cualquier operación directa de este producto.
- CRÉDITO / CARTERA: crédito de consumo, crédito de vivienda/hipotecario, crédito de vehículo, leasing, libranza u otras obligaciones de cartera.
La palabra "crédito" por sí sola NO implica automáticamente CRÉDITOS / CARTERA (una tarjeta de crédito también es un producto de crédito). Si no queda claro el producto, no lo inventes.

- REGLA DE PROTECCIÓN PARA TARJETA DE CRÉDITO:
  Si el expediente trata de una tarjeta de crédito / TC, NUNCA lo clasifiques en CRÉDITOS / CARTERA (y NUNCA en CRÉDITOS / CARTERA > REVERSIÓN), incluso si menciona reversión de pagos, devolución de dinero, reintegro, abonos, pagos duplicados, pagos no aplicados, saldos pendientes, ajustes de deuda, intereses, cobros o compras no reconocidas. Conserva producto_detectado: "TARJETA DE CRÉDITO" y usa la categoría/subcategoría correspondiente del catálogo vigente (ej.: PAGOS / ABONOS > APLICACIÓN DE PAGO para pagos no reflejados/duplicados/reversión de pago de TC; TARJETAS > COMPRAS Y DEVOLUCIONES para devolución de compras o cobros a la tarjeta; COMISIONES Y COBROS > INTERESES para intereses cobrados en la tarjeta; FRAUDES para compras no reconocidas; PRODUCTOS > CANCELACIÓN DE PRODUCTOS para cierre de tarjeta).

- CRITERIO ESTRICTO PARA CRÉDITOS / CARTERA > REVERSIÓN:
  Asigna CRÉDITOS / CARTERA > REVERSIÓN ÚNICAMENTE cuando se cumplan TODAS estas condiciones:
  1) El producto es un CRÉDITO / CARTERA (consumo, vivienda, vehículo, leasing, libranza u obligación de cartera; NUNCA tarjeta de crédito).
  2) El cliente solicita EXPRESAMENTE reversar, anular, deshacer o devolver a su cuenta de origen un pago o abono que YA FUE APLICADO a esa obligación de cartera.
  PROHIBIDO clasificar como CRÉDITOS / CARTERA > REVERSIÓN cuando:
  - El producto sea una tarjeta de crédito (TC).
  - El pago NO aparece aplicado o no se ve reflejado -> PAGOS / ABONOS > APLICACIÓN DE PAGO.
  - El cliente pide rastrear un pago o validar dónde quedó aplicado -> PAGOS / ABONOS > APLICACIÓN DE PAGO.
  - El cliente pide trasladar un pago entre obligaciones o corregir la aplicación de un pago -> CRÉDITOS / CARTERA > REAPLICACIONES.
  - El cliente reporta un pago duplicado SIN solicitar expresamente reversión o devolución del dinero -> PAGOS / ABONOS > APLICACIÓN DE PAGO.
  - El cliente pide reliquidación, ajuste de saldo o aclaración de saldo -> CRÉDITOS / CARTERA > ESTADO DE OBLIGACIÓN / SALDOS.
  - El cliente pide devolución de compras en comercios, transacciones con tarjeta o fraude -> TARJETAS > COMPRAS Y DEVOLUCIONES o FRAUDES.
  - Solo aparecen palabras como "devolución", "reintegro", "ajuste" o "error" sin solicitud expresa de reversar un pago previamente aplicado a cartera.

- PRIORIDAD ENTRE SUBCATEGORÍAS DE PAGOS EN CARTERA:
  1) Pago no reflejado / pendiente / rastreo / validación de aplicación -> PAGOS / ABONOS > APLICACIÓN DE PAGO.
  2) Cambiar imputación a capital, plazo, cobertura de cuota, corregir aplicación o trasladar entre obligaciones -> CRÉDITOS / CARTERA > REAPLICACIONES.
  3) Consulta de pagos anteriores / relación histórica -> CRÉDITOS / CARTERA > HISTÓRICO DE PAGO.
  4) Reliquidación, aclaración o ajuste de saldo de obligación -> CRÉDITOS / CARTERA > ESTADO DE OBLIGACIÓN / SALDOS.
  5) Solicitud expresa de devolver/reversar un pago ya aplicado a cartera hacia la cuenta de origen -> CRÉDITOS / CARTERA > REVERSIÓN.

- CANCELACIÓN DE TARJETA DE CRÉDITO (PRIORIDAD ALTA):
  Cuando el cliente solicita cancelar, cerrar, terminar o dar de baja su tarjeta de crédito, reporta que no ha podido cancelarla, indica que sigue activa después de solicitar su cancelación, manifiesta que no desea continuar con el producto o pide confirmar que su tarjeta quedó cancelada:
  -> Clasifica SIEMPRE en: PRODUCTOS > CANCELACIÓN DE PRODUCTOS (con producto_detectado: "TARJETA DE CRÉDITO").
  -> NUNCA clasifiques la cancelación de tarjeta de crédito en CONDICIONES, incluso si el cliente menciona como antecedente que ya no le sirven las condiciones o la tasa.
- DIFERENCIAS OBLIGATORIAS EN TARJETAS:
  1) Cancelar/cerrar el producto tarjeta -> PRODUCTOS > CANCELACIÓN DE PRODUCTOS.
  2) Cancelación/pago total de la deuda u obligación (sin pedir cierre del plástico) -> PAGOS / ABONOS o CRÉDITOS / CARTERA según el producto real, NO cancelación de producto.
  3) Bloqueo, desbloqueo, plástico retenido, deterioro, no entrega o reposición -> TARJETAS > PLÁSTICO Y BLOQUEO.
  4) Cobro de cuota de manejo después de haber cancelado la tarjeta -> CUOTAS DE MANEJO > COBRO POSTERIOR A CANCELACIÓN.
  5) Activación o imposibilidad de activar la tarjeta -> PRODUCTOS > ACTIVACIÓN DE PRODUCTOS.
  6) Cupo (aumento, disminución, cupo no disponible, sobrecupo, avances) -> TARJETAS > CUPO Y AVANCES.
  7) Compras, devoluciones comerciales, cobros en tarjeta o doble cobro en datáfono -> TARJETAS > COMPRAS Y DEVOLUCIONES.
  8) Compras diferidas, rediferir o número de cuotas de compra -> TARJETAS > DIFERIDOS Y FINANCIACIÓN.
  9) Millas, puntos, LATAM, Socio LATAM, Millas LATAM, LATAM Pass, TuPlus -> TARJETAS > MILLAS Y PROGRAMAS DE LEALTAD.
  10) Inconformidad pura con tasa/condiciones del crédito o tarjeta SIN solicitud de cancelación -> CONDICIONES (subcategoría correspondiente).

### 5. REGLAS ESPECÍFICAS POR PRODUCTO Y OPERACIÓN
- PAGOS / ABONOS: Clasifica según la intención real del cliente en la subcategoría correspondiente: APLICACIÓN DE PAGO (pagos no reflejados, no aplicados, rastreo, demorados, mal aplicados, duplicados sin solicitud de devolución o reversión de pago de tarjeta de crédito), DÉBITOS AUTOMÁTICOS (inscripción, cancelación o débitos automáticos duplicados) o PAGOS Y RECAUDOS (convenios, facturas o servicios públicos); excluye PSE. Cuando exista una categoría más específica en el catálogo para una obligación de cartera (como CRÉDITOS / CARTERA > REVERSIÓN únicamente para solicitud expresa de reversar/devolver un pago ya aplicado a cartera, REAPLICACIONES para imputación a capital/cuota/plazo o traslado entre obligaciones, HÁBITO DE PAGO, HISTÓRICO DE PAGO o TRANSFERENCIAS), utiliza esa categoría específica. Las menciones a Itaú no alteran la categoría, el producto ni la clasificación. Si la certeza es baja por falta de información real, enviar a REVISIÓN HUMANA.
- FRAUDES: Operación, compra, débito, transferencia o producto no reconocido, suplantación o hurto -> FRAUDES.
- PSE: Pago, error o soporte a través de PSE -> PSE (conservando producto_detectado).
- CDT: Si menciona CDT / certificado de depósito a término / Deceval -> categoría CDT.
  ¡REGLA PRIORITARIA VISUALIZACIÓN!: Si menciona "visualización" o no poder ver/consultar el CDT en canales/app/banca virtual -> CDT > VISUALIZACIÓN (prioridad sobre CERTIFICADO DE SALDO O DECEVAL).
  Diferenciar PAGO (CDT ya cancelado/liquidado pero no han entregado el dinero) vs CANCELACIÓN (desea cancelar anticipadamente) vs RENDIMIENTOS / INTERESES vs RENOVACIÓN vs CERTIFICADOS TRIBUTARIOS vs CERTIFICADO DE SALDO O DECEVAL vs APERTURA. ¡La palabra "cuenta" NUNCA es CDT!
- CUOTAS DE MANEJO: Solo cuando exista evidencia real de cargo por manejo/administración/mantenimiento de tarjeta o cuenta. ¡PROHIBIDO clasificar cuotas de crédito, plan de pagos, leasing o vivienda como CUOTAS DE MANEJO!
- HONORARIOS Y GASTOS DE COBRANZA: Gastos de cobranza, honorarios jurídicos/casa de cobranza, cobro sin mora o posterior al pago.
- CARTERA / CRÉDITOS: Diferenciar exactamente entre PLAN DE PAGOS, FRECH (incluyendo errores ortográficos FRESH/FRENCH/FRESCH), AUMENTO DE CUOTA, ENDOSO, REVERSIÓN (solo devolución/reversión expresa de pago ya aplicado a cartera), REAPLICACIONES, HÁBITO DE PAGO, HISTÓRICO DE PAGO, TITULARES, CAMBIO DE FECHA, REFINANCIACIÓN Y ACUERDOS, ESTADO DE OBLIGACIÓN / SALDOS. Si menciona Impuesto Predial en crédito hipotecario o leasing habitacional -> CRÉDITOS / CARTERA (PLAN DE PAGOS o ESTADO DE OBLIGACIÓN / SALDOS según si es liquidación/plan o estado/cobro).
- GT5: Cargo a cuenta oficina / cargo cuenta día / RECUP TRANX -> GT5.
- GMF: 4x1000, marcación, desmarcación o devolución -> GMF.
- EMBARGOS: Medida cautelar judicial real. ¡NUNCA confundir la expresión "sin embargo" con un embargo financiero!
- CANALES DIGITALES, TRANSFERENCIAS, INFORMACIÓN Y DOCUMENTOS, ACTUALIZACIÓN DE DATOS, SEGUROS, SERVICIO / ATENCIÓN: asigna la combinación exacta del catálogo vigente.

VALIDACIÓN FINAL OBLIGATORIA ANTES DE ENTREGAR CADA EXPEDIENTE:
1) Verifica si el cliente habla de TARJETA DE CRÉDITO o de CRÉDITO/CARTERA.
2) Si es TARJETA DE CRÉDITO, confirma que NO quedó en CRÉDITOS / CARTERA.
3) Si asignaste CRÉDITOS / CARTERA > REVERSIÓN, confirma que el pago YA fue aplicado a una obligación de cartera y que el cliente pidió EXPRESAMENTE reversarlo o devolver el dinero a su cuenta.
4) Confirma que no corresponde a una subcategoría más precisa (APLICACIÓN DE PAGO, REAPLICACIONES, HISTÓRICO DE PAGO, ESTADO DE OBLIGACIÓN / SALDOS, COMPRAS Y DEVOLUCIONES o FRAUDES).
5) Confirma que la categoría y subcategoría existen literalmente en el catálogo vigente.

### 6. CATÁLOGO VIGENTE (ÚNICAS COMBINACIONES PERMITIDAS)
${activeCatalogSummary}

### 7. SALIDA ESTRUCTURADA OBLIGATORIA
Para cada expediente devuelve un objeto JSON con:
- expediente: mismo identificador recibido.
- categoria_principal: nombre EXACTO de una categoría del catálogo vigente.
- subcategoria: nombre EXACTO de una subcategoría válida perteneciente a esa categoria_principal.
- producto_detectado: producto financiero involucrado (ej. "TARJETA DE CRÉDITO", "CDT", "CUENTA DE AHORROS", "CRÉDITO HIPOTECARIO", "CRÉDITO DE LIBRE INVERSIÓN", "LEASING HABITACIONAL", etc.).
- problema_principal: causa concreta del caso en frase breve y clara.
- resumen_requerimiento: máximo 20 palabras explicando la petición o reclamo real del cliente.
- intencion_cliente: intención operativa real del cliente.
- evidencia_textual: fragmento breve y fiel de la descripción que sustenta la clasificación.
- propuesta_respuesta: orientación breve y profesional para el analista (no es respuesta oficial definitiva; o "NO APLICA - REQUIERE VALIDACIÓN INTERNA." para fraudes/embargos; o "NO APLICA - INFORMACIÓN INSUFICIENTE PARA PROPONER RESPUESTA." si es insuficiente).
- confianza: entero de 0 a 100.
- requiere_revision_humana: true si la información es insuficiente para clasificar con certeza.

EXPEDIENTES A ANALIZAR (JSON):
${JSON.stringify(formattedCases, null, 2)}
`;

  const response = await invokeGenerateContent(
    generateFn,
    {
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              expediente: { type: Type.STRING },
              categoria_principal: { type: Type.STRING },
              subcategoria: { type: Type.STRING },
              producto_detectado: {
                type: Type.STRING,
                description: 'Producto financiero detectado en el expediente'
              },
              problema_principal: {
                type: Type.STRING,
                description: 'Problema o necesidad principal del cliente'
              },
              resumen_requerimiento: {
                type: Type.STRING,
                description: 'Máximo 20 palabras resumiendo la solicitud'
              },
              intencion_cliente: {
                type: Type.STRING,
                description: 'Intención real interpretada del cliente'
              },
              evidencia_textual: {
                type: Type.STRING,
                description: 'Extracto textual que respalda la clasificación'
              },
              propuesta_respuesta: {
                type: Type.STRING,
                description: 'Propuesta breve de respuesta orientativa'
              },
              confianza: { type: Type.INTEGER, description: 'Nivel de confianza de 0 a 100' },
              requiere_revision_humana: { type: Type.BOOLEAN }
            },
            required: [
              'expediente',
              'categoria_principal',
              'subcategoria',
              'resumen_requerimiento',
              'confianza',
              'requiere_revision_humana'
            ]
          }
        }
      }
    },
    'respuesta clasificación inicial Gemini'
  );

  recordUsageMetadata(telemetry, 'clasificacion_inicial', recordsToAnalyze.length, response);

  const parsedText = response.text ? response.text.trim() : '[]';
  const parsedArray = JSON.parse(parsedText);

  if (!Array.isArray(parsedArray) || parsedArray.length === 0) {
    throw new Error('Gemini no devolvió resultados estructurados para el lote.');
  }

  const otrosCandidates: SecondPassCandidate[] = [];

  recordsToAnalyze.forEach((rec, idx) => {
    const originalIdx = pendingIndices[idx];
    const aiData =
      parsedArray.find(
        (p: any) => String(p.expediente || p.numero_expediente) === String(rec.numero_expediente)
      ) || parsedArray[idx];

    const rawCatPrincipal = String(aiData?.categoria_principal || aiData?.categoria || '').trim();
    const rawSub = String(aiData?.subcategoria || '').trim();

    // Strict catalog pair verification first; fallback to normalizeCategoryName + catalog validation
    const directValid = validateCatalogPair(rawCatPrincipal, rawSub);
    let normalized = directValid.valid
      ? { categoria_principal: directValid.categoria, subcategoria: directValid.subcategoria }
      : (() => {
          const norm = normalizeCategoryName(`${rawCatPrincipal} ${rawSub}`);
          const checked = validateCatalogPair(norm.categoria_principal, norm.subcategoria);
          return {
            categoria_principal: checked.categoria,
            subcategoria: checked.subcategoria
          };
        })();

    // STRICT VALIDATION: If AI tried to assign CDT without explicit CDT mention, reject and reclassify
    if (normalized.categoria_principal === 'CDT' && !hasExplicitCDTMention(rec.descripcion_original)) {
      const deterministicFix = classifyPQRDeterministic(rec);
      normalized = {
        categoria_principal: deterministicFix.categoria_principal,
        subcategoria: deterministicFix.subcategoria
      };
    }

    // CONTROL OF OTRAS (Zero-token local reuse): If Gemini returned OTRAS but deterministic engine finds a specific valid category, prefer it
    if (normalized.categoria_principal === 'OTRAS') {
      const deterministicFallback = classifyPQRDeterministic(rec);
      if (
        deterministicFallback.categoria_principal !== 'OTRAS' &&
        deterministicFallback.categoria_principal !== 'REVISIÓN HUMANA'
      ) {
        normalized = {
          categoria_principal: deterministicFallback.categoria_principal,
          subcategoria: deterministicFallback.subcategoria
        };
      }
    }

    const conf = typeof aiData?.confianza === 'number' ? Math.min(100, Math.max(0, aiData.confianza)) : 94;
    const reqRev =
      normalized.categoria_principal === 'REVISIÓN HUMANA' ||
      conf < 70 ||
      Boolean(aiData?.requiere_revision_humana);

    const isStillOtras = normalized.categoria_principal === 'OTRAS';

    const analysis = buildPQRSAnalysis(rec, {
      expediente: rec.numero_expediente,
      categoria_principal: normalized.categoria_principal,
      subcategoria: normalized.subcategoria,
      resumen_requerimiento:
        aiData?.resumen_requerimiento ||
        `${normalized.categoria_principal}: ${rec.descripcion_original.slice(0, 90)}`,
      intencion_cliente: aiData?.intencion_cliente || `Gestión de ${normalized.subcategoria}`,
      confianza: conf,
      requiere_revision_humana: reqRev,
      motivo_de_revision: reqRev
        ? 'Requiere validación humana por información insuficiente o baja confianza.'
        : undefined,
      producto_detectado: aiData?.producto_detectado || rec.producto_original || 'NO ESPECIFICADO',
      problema_principal:
        aiData?.problema_principal || aiData?.resumen_requerimiento || 'Gestión operativa de producto',
      solicitud_cliente:
        aiData?.solicitud_cliente || aiData?.intencion_cliente || 'Atención de solicitud',
      evidencia_textual: aiData?.evidencia_textual || rec.descripcion_original.slice(0, 100),
      propuesta_respuesta: aiData?.propuesta_respuesta || undefined,
      origen_clasificacion: isStillOtras ? 'CONFIRMADO_OTRAS' : 'CLASIFICACION_INICIAL',
      segunda_validacion_otras: isStillOtras
        ? undefined
        : {
            ejecutada: false,
            estado: 'NO_APLICA',
            categoria_inicial: normalized.categoria_principal,
            subcategoria_inicial: normalized.subcategoria,
            categoria_final: normalized.categoria_principal,
            subcategoria_final: normalized.subcategoria,
            resultado_validacion: 'Clasificado en categoría válida desde la primera etapa.'
          }
    });

    results[originalIdx] = {
      ...analysis,
      modelo_ia: GEMINI_TEXT_MODEL
    };

    const hash = buildRecordCacheKey(rec);
    if (isStillOtras) {
      otrosCandidates.push({
        originalIdx,
        hash,
        rec,
        initialAnalysis: results[originalIdx]
      });
    } else if (!bypassCache) {
      analysisCache.set(hash, results[originalIdx]);
    }
  });

  // 4. SELECTIVE SECOND PASS: Executed EXCLUSIVELY for records still in OTRAS
  if (otrosCandidates.length > 0) {
    await runSecondValidationForOtras(
      generateFn,
      otrosCandidates,
      activeCatalogSummary,
      telemetry,
      results,
      bypassCache,
      options?.secondPassBatchSize ?? SECOND_PASS_BATCH_SIZE
    );
  }

  return {
    analyses: consolidateBatchClassifications(results),
    telemetry
  };
}

/**
 * Backwards-compatible entry point returning only the array of PQRSAnalysis.
 */
export async function analyzePQRSBatch(
  records: BatchInputRecord[],
  catalogSummary?: string,
  options?: AnalyzeBatchOptions
): Promise<PQRSAnalysis[]> {
  const { analyses } = await analyzePQRSBatchWithMetrics(records, catalogSummary, options);
  return analyses;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const hash = hashText(text);
  if (embeddingCache.has(hash)) {
    return embeddingCache.get(hash)!;
  }

  if (!process.env.GEMINI_API_KEY) {
    return [];
  }

  const ai = getAiClient();
  const res: any = await ai.models.embedContent({
    model: GEMINI_EMBEDDING_MODEL,
    contents: text
  });

  const values = res.embedding?.values || res.embeddings?.[0]?.values;
  if (values && values.length > 0) {
    embeddingCache.set(hash, values);
    return values;
  }

  return [];
}
