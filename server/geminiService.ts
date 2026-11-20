import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import {
  BatchTelemetryMetrics,
  GeminiStageUsage,
  PQRSAnalysis,
  SegundaValidacionOtrasInfo,
  SentimientoPQR,
  TipoCasoSFC
} from '../src/types';
import { hashText } from '../src/services/textNormalizer';
import { getCatalogSummary, validateCatalogPair } from '../src/services/catalog';
import {
  classifyPQRDeterministic,
  classifySentimentLocal,
  buildPQRSAnalysis,
  consolidateBatchClassifications,
  normalizeCategoryName,
  normalizeSentimiento,
  normalizeTipoCaso
} from '../src/services/classifierEngine';
import { createEmptyBatchTelemetry } from '../src/services/qualityMetricsService';

const GEMINI_TEXT_MODEL = 'gemini-4-hydrogen';
const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-2';
const GEMINI_TIMEOUT_MS = 60000;
const SECOND_PASS_BATCH_SIZE = 8;
const CACHE_SCHEMA_VERSION = 'v9-bdb-otras-2pass';

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
  /** When true, calls Gemini for sentiment ONLY on cases marked doubtful by local rules (default: false) */
  useAiSentiment?: boolean;
}

export interface AnalyzeBatchWithMetricsResult {
  analyses: PQRSAnalysis[];
  telemetry: BatchTelemetryMetrics;
}

type TipoCasoDecision = {
  tipo_caso?: TipoCasoSFC;
  requiere_revision_humana: boolean;
};

const TIPO_CASO_SFC_RULES = `
CRITERIO OBLIGATORIO DE TIPO DE CASO (SUPERINTENDENCIA FINANCIERA DE COLOMBIA - campo "tipo_caso"):
Clasifica cada expediente en exactamente uno de estos valores:
- "Solicitud" (ajustes no monetarios): el cliente pide información, un documento, un trámite o una gestión sin que haya un cobro cuestionado. Ejemplos: consultas informativas, cuotas de manejo por reconocimiento comercial, certificados, inconvenientes con canales digitales, trámites, paz y salvo, compras, transacciones y comisiones, reaplicación de pagos, diferidos de compras, pagos extraordinarios y temas similares.
- "Reclamo" (ajustes monetarios): el cliente cuestiona un valor cobrado o pide que se le devuelva o ajuste dinero. Ejemplos: cobros de más que generan molestia, cobros dobles, descuentos indebidos, recobros, cargos, ajuste a cuenta y día, saldos a favor.
- "REVISION_HUMANA": si la certeza es baja o el caso no se puede decidir claramente entre Solicitud y Reclamo, NO lo fuerces; devuelve "REVISION_HUMANA" para enviarlo a Revisión humana.
`;

function buildRecordCacheKey(rec: BatchInputRecord, useAiSentiment = false): string {
  const sentimentMode = useAiSentiment ? 'ai-sent' : 'local-sent';
  const contextKey = `${CACHE_SCHEMA_VERSION}|${sentimentMode}|${rec.descripcion_original || ''}|${rec.submotivo_original || ''}|${rec.resumen_original || ''}|${rec.producto_original || ''}`;
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

function invokeGenerateContent(
  generateFn: GenerateContentFn,
  params: any,
  timeoutLabel: string
): Promise<any> {
  const apiCall = generateFn(params);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Timeout en ${timeoutLabel} (${GEMINI_TIMEOUT_MS / 1000}s)`)),
      GEMINI_TIMEOUT_MS
    )
  );
  return Promise.race([apiCall, timeoutPromise]);
}

/**
 * Evaluates Superfinanciera tipo_caso ('Solicitud' | 'Reclamo' | 'REVISION_HUMANA') in batch
 * using Gemini for records whose category was resolved by deterministic business rules.
 */
async function analyzeTipoCasoBatchWithGemini(
  generateFn: GenerateContentFn,
  records: BatchInputRecord[],
  telemetry: BatchTelemetryMetrics
): Promise<Map<string, TipoCasoDecision>> {
  const tipoCasoMap = new Map<string, TipoCasoDecision>();
  if (records.length === 0) return tipoCasoMap;

  const formattedCases = records.map(r => ({
    expediente: String(r.numero_expediente),
    resumen: String(r.resumen_original || ''),
    descripcion: String(r.descripcion_original || r.resumen_original || '')
  }));

  const prompt = `
Eres un analista senior de PQRS del sector financiero colombiano (Superintendencia Financiera).
${TIPO_CASO_SFC_RULES}
Devuelve exactamente un objeto JSON por cada expediente recibido respetando el mismo número de expediente.

EXPEDIENTES (JSON):
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
              tipo_caso: {
                type: Type.STRING,
                enum: ['Solicitud', 'Reclamo', 'REVISION_HUMANA'],
                description:
                  'Tipo de caso Superfinanciera: Solicitud (no monetario), Reclamo (monetario) o REVISION_HUMANA si no hay certeza'
              }
            },
            required: ['expediente', 'tipo_caso']
          }
        }
      }
    },
    'clasificación Tipo de caso Gemini'
  );

  recordUsageMetadata(telemetry, 'tipo_caso', records.length, response);

  const parsedText = response.text ? response.text.trim() : '[]';
  const parsedArray = JSON.parse(parsedText);

  if (Array.isArray(parsedArray)) {
    records.forEach((rec, idx) => {
      const match =
        parsedArray.find(
          (p: any) => String(p.expediente || p.numero_expediente) === String(rec.numero_expediente)
        ) || parsedArray[idx];
      const rawTipo = String(match?.tipo_caso || '').trim();
      if (rawTipo.toUpperCase() === 'REVISION_HUMANA') {
        tipoCasoMap.set(String(rec.numero_expediente), {
          tipo_caso: undefined,
          requiere_revision_humana: true
        });
      } else {
        const normalized = normalizeTipoCaso(rawTipo);
        if (normalized) {
          tipoCasoMap.set(String(rec.numero_expediente), {
            tipo_caso: normalized,
            requiere_revision_humana: false
          });
        }
      }
    });
  }

  return tipoCasoMap;
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
        tipo_caso: item.initialAnalysis.tipo_caso || 'NO_DEFINIDO',
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
- Reutiliza del bloque ANALISIS_INICIAL_REUTILIZADO los datos que ya sean correctos (tipo_caso, producto, evidencia) cuando no requieran corrección.
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
                  tipo_caso: {
                    type: Type.STRING,
                    enum: ['Solicitud', 'Reclamo', 'REVISION_HUMANA']
                  },
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

        const canRecover =
          decision === 'RECUPERAR' &&
          catalogCheck.valid &&
          catalogCheck.categoria !== 'OTRAS' &&
          cdtAllowed;

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

        const rawTipoCaso = String(aiData?.tipo_caso || '').trim();
        const tipoCasoUncertain = rawTipoCaso.toUpperCase() === 'REVISION_HUMANA';
        // Reuse pass-1 tipo_caso if pass 2 didn't supply a definitive value
        const resolvedTipoCaso = tipoCasoUncertain
          ? undefined
          : normalizeTipoCaso(rawTipoCaso) ?? initial.tipo_caso;

        if (canRecover) {
          const conf =
            typeof aiData?.confianza === 'number'
              ? Math.min(100, Math.max(0, aiData.confianza))
              : Math.max(82, initial.confianza || 82);
          const reqRev = catalogCheck.categoria === 'REVISIÓN HUMANA' || tipoCasoUncertain;

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
                'Se recuperó la categoría, pero requiere confirmación manual del tipo de caso.'
              : undefined,
            fecha_validacion: nowIso
          };

          const recoveredAnalysis = buildPQRSAnalysis(item.rec, {
            expediente: item.rec.numero_expediente,
            categoria_principal: catalogCheck.categoria,
            subcategoria: catalogCheck.subcategoria,
            tipo_caso: resolvedTipoCaso,
            sentimiento: initial.sentimiento,
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
      const errMsg = String(err?.message || 'Error desconocido en segunda validación Gemini');
      telemetry.por_etapa.segunda_validacion_otras.errores += 1;
      telemetry.errores_segunda_validacion.push(
        `Segunda validación OTRAS (${chunk.length} exp.): ${errMsg}`
      );
      console.warn('[IRIS] Error en segunda validación selectiva de OTRAS (se conserva resultado inicial):', errMsg);

      const nowIso = new Date().toISOString();

      chunk.forEach(item => {
        const initial = item.initialAnalysis;
        const initialCat = initial.categoria_principal || initial.categoria || 'OTRAS';
        const initialSub = initial.subcategoria || 'CASOS ATÍPICOS';
        const evidenciaFinal =
          initial.evidencia_textual || item.rec.descripcion_original.slice(0, 120);
        const motivoPermanencia =
          'Se conservó en OTRAS porque la segunda validación con Gemini no estuvo disponible en este intento (error de cuota o servicio).';
        const motivoRevision = `Requiere validación humana: el expediente quedó en OTRAS y la segunda validación semántica no pudo completarse (${errMsg}).`;

        const segundaValidacionInfo: SegundaValidacionOtrasInfo = {
          ejecutada: true,
          estado: 'ERROR_CONSERVADO_OTRAS',
          categoria_inicial: initialCat,
          subcategoria_inicial: initialSub,
          categoria_final: initialCat,
          subcategoria_final: initialSub,
          motivo_permanencia_otras: motivoPermanencia,
          resultado_validacion:
            'Segunda validación interrumpida por error de disponibilidad o cuota de Gemini; se conservó el resultado inicial sin inventar categoría.',
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

export async function analyzeDoubtfulSentimentBatchWithGemini(
  generateFn: GenerateContentFn,
  entries: { idx: number; hash: string; rec: BatchInputRecord }[],
  telemetry: BatchTelemetryMetrics
): Promise<Map<string, SentimientoPQR>> {
  const map = new Map<string, SentimientoPQR>();
  if (entries.length === 0) return map;

  const formattedCases = entries.map(({ rec }) => ({
    expediente: String(rec.numero_expediente),
    DESC_DETALLADA: String(rec.descripcion_original || ''),
    SUBMOTIVO_CONTEXTO: String(rec.submotivo_original || rec.resumen_original || 'No provisto')
  }));

  const prompt = `
Analiza ÚNICAMENTE el sentimiento emocional del cliente en cada expediente bancario PQRS.
Devuelve para cada expediente exactamente uno de estos valores en el campo "sentimiento":
- "positivo": felicitación, agradecimiento explícito por buena atención o satisfacción clara.
- "negativo": inconformidad, queja, reclamo, molestia, frustración, demora o perjuicio reportado.
- "neutro": solicitud administrativa o informativa objetiva sin carga emocional marcada.

EXPEDIENTES (JSON):
${JSON.stringify(formattedCases, null, 2)}
`;

  try {
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
                sentimiento: {
                  type: Type.STRING,
                  enum: ['positivo', 'negativo', 'neutro']
                }
              },
              required: ['expediente', 'sentimiento']
            }
          }
        }
      },
      'análisis de sentimiento para casos dudosos'
    );

    telemetry.llamadas_gemini_total += 1;
    const meta = response?.usageMetadata;
    if (meta && typeof meta === 'object') {
      const promptTokens = Number(meta.promptTokenCount || 0);
      const candidatesTokens = Number(meta.candidatesTokenCount || 0);
      const totalTokens = Number(meta.totalTokenCount || promptTokens + candidatesTokens);
      if (promptTokens > 0 || candidatesTokens > 0 || totalTokens > 0) {
        telemetry.tokens.disponible = true;
        telemetry.tokens.prompt_tokens += promptTokens;
        telemetry.tokens.candidates_tokens += candidatesTokens;
        telemetry.tokens.total_tokens += totalTokens;
      }
    }

    const parsedText = response.text ? response.text.trim() : '[]';
    const parsedArray = JSON.parse(parsedText);
    if (Array.isArray(parsedArray)) {
      parsedArray.forEach((item: any) => {
        const expId = String(item?.expediente || item?.numero_expediente || '').trim();
        const sent = normalizeSentimiento(item?.sentimiento);
        if (expId && sent) {
          map.set(expId, sent);
        }
      });
    }
  } catch (err: any) {
    console.warn('Error en análisis opcional de sentimiento con Gemini (se mantiene regla local):', err?.message || err);
  }

  return map;
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
  const explicitRuleEntries: { idx: number; hash: string; rec: BatchInputRecord }[] = [];
  const bypassCache = Boolean(options?.bypassCache);
  const useAiSentiment = Boolean(options?.useAiSentiment);

  // 1. Check cache and evaluate explicit business rules first (unchanged engine)
  records.forEach((rec, idx) => {
    const hash = buildRecordCacheKey(rec, useAiSentiment);
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

    // Explicit business rules that have absolute priority over generic semantic classification
    const hasExplicitRule =
      deterministic.categoria_principal === 'FRAUDES' ||
      deterministic.categoria_principal === 'PSE' ||
      deterministic.categoria_principal === 'CDT' ||
      deterministic.categoria_principal === 'GT5' ||
      deterministic.categoria_principal === 'GMF' ||
      deterministic.categoria_principal === 'CUOTAS DE MANEJO' ||
      deterministic.categoria_principal === 'CUOTA DE MANEJO' ||
      deterministic.categoria_principal === 'HONORARIOS Y GASTOS DE COBRANZA' ||
      (deterministic.categoria_principal === 'PRODUCTOS' &&
        (deterministic.subcategoria === 'CANCELACIÓN DE PRODUCTOS' ||
          deterministic.subcategoria === 'ACTIVACIÓN DE PRODUCTOS')) ||
      deterministic.categoria_principal === 'CONDICIONES' ||
      deterministic.categoria_principal === 'CRÉDITOS / CARTERA' ||
      deterministic.categoria_principal === 'SEGUROS' ||
      deterministic.categoria_principal === 'EMBARGOS' ||
      deterministic.categoria_principal === 'TARJETAS' ||
      deterministic.categoria_principal === 'PAGOS / ABONOS' ||
      deterministic.categoria_principal === 'COMISIONES Y COBROS' ||
      deterministic.categoria_principal === 'INFORMACIÓN Y DOCUMENTOS' ||
      deterministic.categoria_principal === 'ACTUALIZACIÓN DE DATOS' ||
      deterministic.categoria_principal === 'REVISIÓN HUMANA';

    if (hasExplicitRule) {
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
      explicitRuleEntries.push({ idx, hash, rec });
    } else {
      pendingIndices.push(idx);
      recordsToAnalyze.push(rec);
    }
  });

  // If every single record came from cache, return immediately with zero Gemini calls
  if (explicitRuleEntries.length === 0 && recordsToAnalyze.length === 0) {
    return {
      analyses: consolidateBatchClassifications(results),
      telemetry
    };
  }

  const generateFn: GenerateContentFn =
    options?.generateContentFn ||
    ((params: any) => getAiClient().models.generateContent(params));

  // 2. Run Gemini tipo_caso classification (for explicit rules) in parallel with pass-1 semantic classification
  const tipoCasoTask =
    explicitRuleEntries.length > 0
      ? analyzeTipoCasoBatchWithGemini(
          generateFn,
          explicitRuleEntries.map(entry => entry.rec),
          telemetry
        )
      : Promise.resolve(new Map<string, TipoCasoDecision>());

  const applyTipoCasoDecision = (
    idx: number,
    hash: string,
    rec: BatchInputRecord,
    decision?: TipoCasoDecision
  ) => {
    const base = results[idx];
    const needsReview = Boolean(base.requiere_revision || decision?.requiere_revision_humana);
    const updatedAnalysis: PQRSAnalysis = {
      ...base,
      tipo_caso: decision?.requiere_revision_humana ? undefined : (decision?.tipo_caso ?? base.tipo_caso),
      requiere_revision: needsReview,
      requiere_revision_humana: needsReview ? 'SI' : base.requiere_revision_humana,
      motivo_de_revision:
        decision?.requiere_revision_humana && !base.motivo_de_revision
          ? 'No fue posible determinar con certeza si el caso es Solicitud o Reclamo; requiere confirmación manual.'
          : base.motivo_de_revision,
      modelo_ia: GEMINI_TEXT_MODEL
    };
    results[idx] = updatedAnalysis;
    if (!bypassCache && (updatedAnalysis.tipo_caso || decision?.requiere_revision_humana)) {
      analysisCache.set(hash, updatedAnalysis);
    }
  };

  const resolveDoubtfulSentimentIfEnabled = async (
    processedEntries: { idx: number; hash: string; rec: BatchInputRecord }[]
  ) => {
    if (!useAiSentiment || processedEntries.length === 0) {
      return;
    }

    const doubtfulEntries = processedEntries.filter(({ idx, rec }) => {
      const analysis = results[idx];
      const localEval = classifySentimentLocal(
        rec.descripcion_original,
        analysis?.categoria_principal || analysis?.categoria
      );
      return localEval.dudoso;
    });

    if (doubtfulEntries.length === 0) {
      return;
    }

    const sentimentMap = await analyzeDoubtfulSentimentBatchWithGemini(
      generateFn,
      doubtfulEntries,
      telemetry
    );

    doubtfulEntries.forEach(({ idx, hash, rec }) => {
      const aiSent = sentimentMap.get(String(rec.numero_expediente));
      if (!aiSent) return;
      results[idx] = {
        ...results[idx],
        sentimiento: aiSent
      };
      if (!bypassCache && analysisCache.has(hash)) {
        analysisCache.set(hash, results[idx]);
      }
    });
  };

  if (recordsToAnalyze.length === 0) {
    const tipoCasoMap = await tipoCasoTask;
    explicitRuleEntries.forEach(({ idx, hash, rec }) => {
      applyTipoCasoDecision(idx, hash, rec, tipoCasoMap.get(String(rec.numero_expediente)));
    });
    await resolveDoubtfulSentimentIfEnabled(explicitRuleEntries);
    return {
      analyses: consolidateBatchClassifications(results),
      telemetry
    };
  }

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

### 4. REFORZAMIENTO CRÍTICO: TARJETAS DE CRÉDITO Y CANCELACIÓN DE PRODUCTOS
- CANCELACIÓN DE TARJETA DE CRÉDITO (PRIORIDAD ALTA):
  Cuando el cliente solicita cancelar, cerrar, terminar o dar de baja su tarjeta de crédito, reporta que no ha podido cancelarla, indica que sigue activa después de solicitar su cancelación, manifiesta que no desea continuar con el producto o pide confirmar que su tarjeta quedó cancelada:
  -> Clasifica SIEMPRE en: PRODUCTOS > CANCELACIÓN DE PRODUCTOS (con producto_detectado: "TARJETA DE CRÉDITO").
  -> NUNCA clasifiques la cancelación de tarjeta de crédito en CONDICIONES, incluso si el cliente menciona como antecedente que ya no le sirven las condiciones o la tasa.
- DIFERENCIAS OBLIGATORIAS EN TARJETAS:
  1) Cancelar/cerrar el producto tarjeta -> PRODUCTOS > CANCELACIÓN DE PRODUCTOS.
  2) Cancelación/pago total de la deuda u obligación (sin pedir cierre del plástico) -> PAGOS / ABONOS o CRÉDITOS / CARTERA según el caso, NO cancelación de producto.
  3) Bloqueo, desbloqueo, plástico retenido, deterioro, no entrega o reposición -> TARJETAS > PLÁSTICO Y BLOQUEO.
  4) Cobro de cuota de manejo después de haber cancelado la tarjeta -> CUOTAS DE MANEJO > COBRO POSTERIOR A CANCELACIÓN.
  5) Activación o imposibilidad de activar la tarjeta -> PRODUCTOS > ACTIVACIÓN DE PRODUCTOS.
  6) Cupo (aumento, disminución, cupo no disponible, sobrecupo, avances) -> TARJETAS > CUPO Y AVANCES.
  7) Compras, devoluciones comerciales o doble cobro en datáfono -> TARJETAS > COMPRAS Y DEVOLUCIONES.
  8) Compras diferidas, rediferir o número de cuotas de compra -> TARJETAS > DIFERIDOS Y FINANCIACIÓN.
  9) Millas, puntos, LATAM, Socio LATAM, Millas LATAM, LATAM Pass, TuPlus -> TARJETAS > MILLAS Y PROGRAMAS DE LEALTAD.
  10) Inconformidad pura con tasa/condiciones del crédito o tarjeta SIN solicitud de cancelación -> CONDICIONES (subcategoría correspondiente).

### 5. REGLAS ESPECÍFICAS POR PRODUCTO Y OPERACIÓN
- PAGOS / ABONOS: Clasifica según la intención real del cliente en la subcategoría correspondiente: APLICACIÓN DE PAGO (pagos no reflejados, no aplicados, demorados o mal aplicados), DÉBITOS AUTOMÁTICOS (inscripción, cancelación o débitos automáticos duplicados) o PAGOS Y RECAUDOS (convenios, facturas o servicios públicos); excluye PSE. Cuando exista una categoría más específica en el catálogo (como CRÉDITOS / CARTERA > REVERSIÓN para devolución/reversión de pagos duplicados o débitos automáticos, REAPLICACIONES para imputación a capital/cuota/plazo, HÁBITO DE PAGO, HISTÓRICO DE PAGO o TRANSFERENCIAS), utiliza esa categoría específica. Las menciones a Itaú no alteran la categoría, el producto ni la clasificación. Si la certeza es baja por falta de información real, enviar a REVISIÓN HUMANA.
- FRAUDES: Operación, compra, débito, transferencia o producto no reconocido, suplantación o hurto -> FRAUDES.
- PSE: Pago, error o soporte a través de PSE -> PSE (conservando producto_detectado).
- CDT: Si menciona CDT / certificado de depósito a término / Deceval -> categoría CDT.
  ¡REGLA PRIORITARIA VISUALIZACIÓN!: Si menciona "visualización" o no poder ver/consultar el CDT en canales/app/banca virtual -> CDT > VISUALIZACIÓN (prioridad sobre CERTIFICADO DE SALDO O DECEVAL).
  Diferenciar PAGO (CDT ya cancelado/liquidado pero no han entregado el dinero) vs CANCELACIÓN (desea cancelar anticipadamente) vs RENDIMIENTOS / INTERESES vs RENOVACIÓN vs CERTIFICADOS TRIBUTARIOS vs CERTIFICADO DE SALDO O DECEVAL vs APERTURA. ¡La palabra "cuenta" NUNCA es CDT!
- CUOTAS DE MANEJO: Solo cuando exista evidencia real de cargo por manejo/administración/mantenimiento de tarjeta o cuenta. ¡PROHIBIDO clasificar cuotas de crédito, plan de pagos, leasing o vivienda como CUOTAS DE MANEJO!
- HONORARIOS Y GASTOS DE COBRANZA: Gastos de cobranza, honorarios jurídicos/casa de cobranza, cobro sin mora o posterior al pago.
- CARTERA / CRÉDITOS: Diferenciar exactamente entre PLAN DE PAGOS, FRECH (incluyendo errores ortográficos FRESH/FRENCH/FRESCH), AUMENTO DE CUOTA, ENDOSO, REVERSIÓN, REAPLICACIONES, HÁBITO DE PAGO, HISTÓRICO DE PAGO, TITULARES, CAMBIO DE FECHA, REFINANCIACIÓN Y ACUERDOS, ESTADO DE OBLIGACIÓN / SALDOS. Si menciona Impuesto Predial en crédito hipotecario o leasing habitacional -> CRÉDITOS / CARTERA (PLAN DE PAGOS o ESTADO DE OBLIGACIÓN / SALDOS según si es liquidación/plan o estado/cobro).
- GT5: Cargo a cuenta oficina / cargo cuenta día / RECUP TRANX -> GT5.
- GMF: 4x1000, marcación, desmarcación o devolución -> GMF.
- EMBARGOS: Medida cautelar judicial real. ¡NUNCA confundir la expresión "sin embargo" con un embargo financiero!
- CANALES DIGITALES, TRANSFERENCIAS, INFORMACIÓN Y DOCUMENTOS, ACTUALIZACIÓN DE DATOS, SEGUROS, SERVICIO / ATENCIÓN: asigna la combinación exacta del catálogo vigente.

### 6. CATÁLOGO VIGENTE (ÚNICAS COMBINACIONES PERMITIDAS)
${activeCatalogSummary}

### 7. TIPO DE CASO (SUPERINTENDENCIA FINANCIERA)
${TIPO_CASO_SFC_RULES}

### 8. SALIDA ESTRUCTURADA OBLIGATORIA
Para cada expediente devuelve un objeto JSON con:
- expediente: mismo identificador recibido.
- categoria_principal: nombre EXACTO de una categoría del catálogo vigente.
- subcategoria: nombre EXACTO de una subcategoría válida perteneciente a esa categoria_principal.
- tipo_caso: "Solicitud" | "Reclamo" | "REVISION_HUMANA".
- producto_detectado: producto financiero involucrado (ej. "TARJETA DE CRÉDITO", "CDT", "CUENTA DE AHORROS", "CRÉDITO HIPOTECARIO", "CRÉDITO DE LIBRE INVERSIÓN", "LEASING HABITACIONAL", etc.).
- problema_principal: causa concreta del caso en frase breve y clara.
- resumen_requerimiento: máximo 20 palabras explicando la petición o reclamo real del cliente.
- intencion_cliente: intención operativa real del cliente.
- evidencia_textual: fragmento breve y fiel de la descripción que sustenta la clasificación.
- propuesta_respuesta: orientación breve y profesional para el analista (no es respuesta oficial definitiva; o "NO APLICA - REQUIERE VALIDACIÓN INTERNA." para fraudes/embargos; o "NO APLICA - INFORMACIÓN INSUFICIENTE PARA PROPONER RESPUESTA." si es insuficiente).
- confianza: entero de 0 a 100.
- requiere_revision_humana: true si la información es insuficiente o si tipo_caso es "REVISION_HUMANA".

EXPEDIENTES A ANALIZAR (JSON):
${JSON.stringify(formattedCases, null, 2)}
`;

  const pass1Task = invokeGenerateContent(
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
              tipo_caso: {
                type: Type.STRING,
                enum: ['Solicitud', 'Reclamo', 'REVISION_HUMANA'],
                description:
                  'Tipo de caso según Superfinanciera: Solicitud, Reclamo o REVISION_HUMANA si no hay certeza'
              },
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
              'tipo_caso',
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

  const [tipoCasoMap, response] = await Promise.all([tipoCasoTask, pass1Task]);

  recordUsageMetadata(telemetry, 'clasificacion_inicial', recordsToAnalyze.length, response);

  if (explicitRuleEntries.length > 0) {
    explicitRuleEntries.forEach(({ idx, hash, rec }) => {
      applyTipoCasoDecision(idx, hash, rec, tipoCasoMap.get(String(rec.numero_expediente)));
    });
  }

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

    const rawTipoCaso = String(aiData?.tipo_caso || '').trim();
    const tipoCasoUncertain = rawTipoCaso.toUpperCase() === 'REVISION_HUMANA';
    const tipoCaso = tipoCasoUncertain ? undefined : normalizeTipoCaso(rawTipoCaso);
    const conf = typeof aiData?.confianza === 'number' ? Math.min(100, Math.max(0, aiData.confianza)) : 94;
    const reqRev =
      normalized.categoria_principal === 'REVISIÓN HUMANA' ||
      tipoCasoUncertain ||
      Boolean(aiData?.requiere_revision_humana);
    const sentimiento = normalizeSentimiento(aiData?.sentimiento);

    const isStillOtras = normalized.categoria_principal === 'OTRAS';

    const analysis = buildPQRSAnalysis(rec, {
      expediente: rec.numero_expediente,
      categoria_principal: normalized.categoria_principal,
      subcategoria: normalized.subcategoria,
      tipo_caso: tipoCaso,
      sentimiento,
      resumen_requerimiento:
        aiData?.resumen_requerimiento ||
        `${normalized.categoria_principal}: ${rec.descripcion_original.slice(0, 90)}`,
      intencion_cliente: aiData?.intencion_cliente || `Gestión de ${normalized.subcategoria}`,
      confianza: conf,
      requiere_revision_humana: reqRev,
      motivo_de_revision: reqRev
        ? tipoCasoUncertain
          ? 'No fue posible determinar con certeza si el caso es Solicitud o Reclamo; requiere confirmación manual.'
          : 'Requiere validación humana por información insuficiente.'
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

    const hash = buildRecordCacheKey(rec, useAiSentiment);
    if (isStillOtras) {
      otrosCandidates.push({
        originalIdx,
        hash,
        rec,
        initialAnalysis: results[originalIdx]
      });
    } else if (!bypassCache && (analysis.tipo_caso || tipoCasoUncertain)) {
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

  // 5. OPTIONAL AI SENTIMENT: Executed ONLY when useAiSentiment is true AND ONLY for locally doubtful cases
  const allProcessedEntries = [
    ...explicitRuleEntries,
    ...recordsToAnalyze.map((rec, idx) => ({
      idx: pendingIndices[idx],
      hash: buildRecordCacheKey(rec, useAiSentiment),
      rec
    }))
  ];
  await resolveDoubtfulSentimentIfEnabled(allProcessedEntries);

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
