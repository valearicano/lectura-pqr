import {
  BatchTelemetryMetrics,
  EnrichedPQRSRecord,
  GeminiStageUsage,
  OrigenClasificacion
} from '../types';

export interface ClassificationQualityMetrics {
  totalProcesados: number;
  totalClasificadoInicialmente: number;
  totalInicialmenteEnOtras: number;
  totalRecuperadosSegundaValidacion: number;
  totalContinuaEnOtras: number;
  porcentajeRecuperacionOtras: number;
  porcentajeFinalOtras: number;
  totalRequiereRevisionHumana: number;
  motivosFrecuentesOtras: { motivo: string; cantidad: number }[];
  llamadasGemini: {
    total: number;
    clasificacionInicial: number;
    tipoCaso: number;
    segundaValidacionOtras: number;
    cacheHits: number;
  };
  consumoTokens: {
    disponible: boolean;
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
  };
  erroresSegundaValidacion: string[];
}

export function createEmptyStageUsage(): GeminiStageUsage {
  return {
    llamadas: 0,
    expedientes_enviados: 0,
    prompt_tokens: 0,
    candidates_tokens: 0,
    total_tokens: 0,
    errores: 0
  };
}

export function createEmptyBatchTelemetry(): BatchTelemetryMetrics {
  return {
    llamadas_gemini_total: 0,
    llamadas_clasificacion_inicial: 0,
    llamadas_tipo_caso: 0,
    llamadas_segunda_validacion_otras: 0,
    cache_hits: 0,
    tokens: {
      disponible: false,
      prompt_tokens: 0,
      candidates_tokens: 0,
      total_tokens: 0
    },
    por_etapa: {
      clasificacion_inicial: createEmptyStageUsage(),
      tipo_caso: createEmptyStageUsage(),
      segunda_validacion_otras: createEmptyStageUsage()
    },
    errores_segunda_validacion: []
  };
}

function addStageUsage(a: GeminiStageUsage, b: GeminiStageUsage): GeminiStageUsage {
  return {
    llamadas: a.llamadas + b.llamadas,
    expedientes_enviados: a.expedientes_enviados + b.expedientes_enviados,
    prompt_tokens: a.prompt_tokens + b.prompt_tokens,
    candidates_tokens: a.candidates_tokens + b.candidates_tokens,
    total_tokens: a.total_tokens + b.total_tokens,
    errores: a.errores + b.errores
  };
}

/**
 * Merges telemetry objects from sequential batches locally without extra API calls.
 */
export function mergeBatchTelemetry(
  acc: BatchTelemetryMetrics | null | undefined,
  next: BatchTelemetryMetrics | null | undefined
): BatchTelemetryMetrics {
  const base = acc ? acc : createEmptyBatchTelemetry();
  if (!next) return base;

  const promptTokens = base.tokens.prompt_tokens + next.tokens.prompt_tokens;
  const candidatesTokens = base.tokens.candidates_tokens + next.tokens.candidates_tokens;
  const totalTokens = base.tokens.total_tokens + next.tokens.total_tokens;

  return {
    llamadas_gemini_total: base.llamadas_gemini_total + next.llamadas_gemini_total,
    llamadas_clasificacion_inicial:
      base.llamadas_clasificacion_inicial + next.llamadas_clasificacion_inicial,
    llamadas_tipo_caso: base.llamadas_tipo_caso + next.llamadas_tipo_caso,
    llamadas_segunda_validacion_otras:
      base.llamadas_segunda_validacion_otras + next.llamadas_segunda_validacion_otras,
    cache_hits: base.cache_hits + next.cache_hits,
    tokens: {
      disponible: base.tokens.disponible || next.tokens.disponible || totalTokens > 0,
      prompt_tokens: promptTokens,
      candidates_tokens: candidatesTokens,
      total_tokens: totalTokens
    },
    por_etapa: {
      clasificacion_inicial: addStageUsage(
        base.por_etapa.clasificacion_inicial,
        next.por_etapa.clasificacion_inicial
      ),
      tipo_caso: addStageUsage(base.por_etapa.tipo_caso, next.por_etapa.tipo_caso),
      segunda_validacion_otras: addStageUsage(
        base.por_etapa.segunda_validacion_otras,
        next.por_etapa.segunda_validacion_otras
      )
    },
    errores_segunda_validacion: [
      ...base.errores_segunda_validacion,
      ...next.errores_segunda_validacion
    ]
  };
}

function isOtrasCategory(cat?: string): boolean {
  const clean = String(cat || '').trim().toUpperCase();
  return clean === 'OTRAS' || clean === 'OTROS' || clean === 'OTRAS SOLICITUDES';
}

/**
 * Resolves the authoritative origin of classification for a record, strictly separating:
 * - CLASIFICACION_INICIAL (already valid in pass 1 — NEVER counted as recovered)
 * - RECUPERADO_SEGUNDA_VALIDACION (pass 1 was OTRAS, pass 2 recovered a valid category)
 * - CONFIRMADO_OTRAS (remained in OTRAS after pass 2 or without recovery)
 */
export function resolveClassificationOrigin(record: EnrichedPQRSRecord): OrigenClasificacion {
  const a = record.analisis;
  if (!a) return 'CLASIFICACION_INICIAL';

  const currentCat = a.categoria_principal || a.categoria || '';
  const sv = a.segunda_validacion_otras;

  // Guard: never count an already-valid first-pass record as recovered
  if (sv?.ejecutada && sv.estado === 'RECUPERADO' && isOtrasCategory(sv.categoria_inicial) && !isOtrasCategory(currentCat)) {
    return 'RECUPERADO_SEGUNDA_VALIDACION';
  }

  if (a.origen_clasificacion === 'RECUPERADO_SEGUNDA_VALIDACION' && !isOtrasCategory(currentCat)) {
    return 'RECUPERADO_SEGUNDA_VALIDACION';
  }

  if (isOtrasCategory(currentCat)) {
    return 'CONFIRMADO_OTRAS';
  }

  return 'CLASIFICACION_INICIAL';
}

/**
 * Computes all quality & OTRAS recovery indicators locally from existing analyzed records
 * and accumulated batch telemetry. Performs ZERO external API / Gemini calls.
 */
export function computeClassificationQualityMetrics(
  records: EnrichedPQRSRecord[],
  telemetry?: BatchTelemetryMetrics | null
): ClassificationQualityMetrics {
  const processed = records.filter(r => Boolean(r.analisis));
  const totalProcesados = processed.length;

  let totalClasificadoInicialmente = 0;
  let totalRecuperadosSegundaValidacion = 0;
  let totalContinuaEnOtras = 0;
  let totalRequiereRevisionHumana = 0;
  const motivosMap = new Map<string, number>();

  processed.forEach(rec => {
    const a = rec.analisis!;
    const origin = resolveClassificationOrigin(rec);

    if (origin === 'CLASIFICACION_INICIAL') {
      totalClasificadoInicialmente++;
    } else if (origin === 'RECUPERADO_SEGUNDA_VALIDACION') {
      totalRecuperadosSegundaValidacion++;
    } else {
      totalContinuaEnOtras++;
      const rawReason =
        a.segunda_validacion_otras?.motivo_permanencia_otras ||
        a.segunda_validacion_otras?.motivo_revision_humana ||
        a.motivo_de_revision ||
        'Sin categoría aplicable en el catálogo vigente';
      const normalizedReason = rawReason.trim();
      motivosMap.set(normalizedReason, (motivosMap.get(normalizedReason) || 0) + 1);
    }

    const needsReview =
      a.requiere_revision === true ||
      a.requiere_revision_humana === 'SI' ||
      (a.categoria_principal || a.categoria) === 'REVISIÓN HUMANA';
    if (needsReview) {
      totalRequiereRevisionHumana++;
    }
  });

  const totalInicialmenteEnOtras = totalRecuperadosSegundaValidacion + totalContinuaEnOtras;
  const porcentajeRecuperacionOtras =
    totalInicialmenteEnOtras > 0
      ? Number(((totalRecuperadosSegundaValidacion / totalInicialmenteEnOtras) * 100).toFixed(1))
      : 0;
  const porcentajeFinalOtras =
    totalProcesados > 0
      ? Number(((totalContinuaEnOtras / totalProcesados) * 100).toFixed(1))
      : 0;

  const motivosFrecuentesOtras = Array.from(motivosMap.entries())
    .map(([motivo, cantidad]) => ({ motivo, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 6);

  const safeTelemetry = telemetry || createEmptyBatchTelemetry();

  return {
    totalProcesados,
    totalClasificadoInicialmente,
    totalInicialmenteEnOtras,
    totalRecuperadosSegundaValidacion,
    totalContinuaEnOtras,
    porcentajeRecuperacionOtras,
    porcentajeFinalOtras,
    totalRequiereRevisionHumana,
    motivosFrecuentesOtras,
    llamadasGemini: {
      total: safeTelemetry.llamadas_gemini_total,
      clasificacionInicial: safeTelemetry.llamadas_clasificacion_inicial,
      tipoCaso: safeTelemetry.llamadas_tipo_caso,
      segundaValidacionOtras: safeTelemetry.llamadas_segunda_validacion_otras,
      cacheHits: safeTelemetry.cache_hits
    },
    consumoTokens: {
      disponible: safeTelemetry.tokens.disponible,
      promptTokens: safeTelemetry.tokens.prompt_tokens,
      candidatesTokens: safeTelemetry.tokens.candidates_tokens,
      totalTokens: safeTelemetry.tokens.total_tokens
    },
    erroresSegundaValidacion: safeTelemetry.errores_segunda_validacion
  };
}
