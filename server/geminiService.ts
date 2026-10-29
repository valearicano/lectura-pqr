import { GoogleGenAI, Type } from '@google/genai';
import { PQRSAnalysis } from '../src/types';
import { hashText } from '../src/services/textNormalizer';
import { 
  classifyPQRDeterministic, 
  buildPQRSAnalysis, 
  consolidateBatchClassifications,
  normalizeCategoryName,
  PQRInputRecord 
} from '../src/services/classifierEngine';
import { getCatalogSummary } from '../src/services/catalog';

let aiInstance: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || ''
    });
  }
  return aiInstance;
}

// In-memory cache for analyzed descriptions
const analysisCache = new Map<string, PQRSAnalysis>();
const embeddingCache = new Map<string, number[]>();

export async function analyzePQRSBatch(
  records: {
    numero_expediente: string;
    resumen_original: string;
    descripcion_original: string;
    submotivo_original?: string;
    producto_original?: string;
    tipo_origen?: string;
    fecha_radicacion?: string;
    fecha_compromiso?: string;
    hash_descripcion?: string;
    columnas_adicionales?: Record<string, any>;
  }[],
  catalogSummary?: string
): Promise<PQRSAnalysis[]> {
  const ai = getAiClient();
  const results: PQRSAnalysis[] = [];
  const pendingIndices: number[] = [];
  const recordsToAnalyze: typeof records = [];

  // 1. Check cache and evaluate explicit business rules first
  records.forEach((rec, idx) => {
    const tipoOrigen = rec.tipo_origen ||
                       rec.columnas_adicionales?.['TIPO ORIGEN'] ||
                       rec.columnas_adicionales?.['tipo_origen'] ||
                       rec.columnas_adicionales?.['Tipo Origen'] ||
                       rec.columnas_adicionales?.['ORIGEN'];
    const contextKey = `${rec.descripcion_original || ''}|${rec.submotivo_original || ''}|${rec.resumen_original || ''}|${rec.producto_original || ''}|${tipoOrigen || ''}`;
    const hash = hashText(contextKey);
    if (analysisCache.has(hash)) {
      const cached = analysisCache.get(hash)!;
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
      deterministic.categoria_principal === 'PAGO A ITAU' ||
      deterministic.categoria_principal === 'FRAUDES' ||
      deterministic.categoria_principal === 'PSE' ||
      deterministic.categoria_principal === 'CDT' ||
      deterministic.categoria_principal === 'GT5' ||
      deterministic.categoria_principal === 'GMF' ||
      deterministic.categoria_principal === 'CUOTAS DE MANEJO' ||
      deterministic.categoria_principal === 'CUOTA DE MANEJO' ||
      deterministic.categoria_principal === 'HONORARIOS Y GASTOS DE COBRANZA' ||
      deterministic.categoria_principal === 'SEGUROS' ||
      deterministic.categoria_principal === 'EMBARGOS' ||
      deterministic.categoria_principal === 'TARJETAS' ||
      deterministic.categoria_principal === 'PAGOS / ABONOS' ||
      deterministic.categoria_principal === 'COMISIONES Y COBROS' ||
      deterministic.categoria_principal === 'INFORMACIÓN Y DOCUMENTOS' ||
      deterministic.categoria_principal === 'ACTUALIZACIÓN DE DATOS' ||
      deterministic.categoria_principal === 'REVISIÓN HUMANA';

    if (hasExplicitRule) {
      const analysis = buildPQRSAnalysis(rec, deterministic);
      results[idx] = analysis;
      analysisCache.set(hash, analysis);
    } else {
      pendingIndices.push(idx);
      recordsToAnalyze.push(rec);
    }
  });

  if (recordsToAnalyze.length === 0) {
    return consolidateBatchClassifications(results);
  }

  // Format remaining cases for Gemini (PRIORIDAD 9: CLASIFICACIÓN SEMÁNTICA)
  const formattedCases = recordsToAnalyze.map(r => ({
    expediente: String(r.numero_expediente),
    TIPO_ORIGEN: String(r.tipo_origen || r.columnas_adicionales?.['TIPO ORIGEN'] || r.columnas_adicionales?.['tipo_origen'] || 'No provisto'),
    DESC_DETALLADA: String(r.descripcion_original || ''),
    SUBMOTIVO_CONTEXTO: String(r.submotivo_original || r.resumen_original || 'No provisto'),
    NOMBRE_PRODUCTO_CONTEXTO: String(r.producto_original || 'No provisto')
  }));

  const prompt = `
Quiero que actúes como un CLASIFICADOR OPERATIVO DE PQR/PQRS BANCARIO.

REGLAS DE PRIORIDAD ABSOLUTA:
0. PAGO A ITAU: Exclusivamente para expedientes con TIPO ORIGEN = ITAU cuando el cliente reporta un pago no reflejado, pendiente, rechazado, demorado o no aplicado a la obligación. Si TIPO ORIGEN no es ITAU, NO asignar esta categoría. Si TIPO ORIGEN es ITAU pero el caso trata de fraude, cuota de manejo, extracto o cupo, asignar esa categoría específica.
1. FRAUDES: Si el cliente manifiesta no reconocer una compra, débito, transferencia o producto (ej: "no reconozco", "yo no hice", "no autoricé", "no sé qué es", "me robaron", "desconozco"). NO investigar si fue fraude, clasificar inmediatamente como FRAUDES.
2. PSE: Si el caso menciona PSE (pago, error, soporte de PSE). Si el pago de tarjeta fue por PSE, clasificar como PSE conservando el producto detectado.
3. CDT: SOLO si menciona explícitamente CDT o certificado de depósito a término. ¡La palabra "cuenta" NUNCA es CDT!
4. GT5: Casos de cargo a cuenta en oficina, cargo cuenta día, cargo transacción no aplicada o RECUP TRANX.
5. GMF: 4x1000, marcación, desmarcación o devolución.
6. CUOTAS DE MANEJO: Cobro, devolución/reversión, exoneración o beneficio no aplicado, cobro posterior a cancelación, duplicado, cobro no reconocido o aclaración del valor de cuota de manejo.
7. HONORARIOS Y GASTOS DE COBRANZA: Inconformidad con gastos de cobranza, honorarios de cobro/abogado, cobro cuestionado por no estar en mora o estar al día, cobro después del pago, cálculo no conforme, duplicado o falta de información/soportes.
8. SEGUROS: Pólizas de vida, desempleo, seguros asociados a tarjeta o atados a crédito.
8. TARJETAS DE CRÉDITO Y OPERATIVAS:
   - Pagos no aplicados o duplicados: PAGOS / ABONOS > APLICACIÓN DE PAGO.
   - Intereses de mora o corrientes: COMISIONES Y COBROS > INTERESES.
   - Cupo y avances: TARJETAS > CUPO Y AVANCES.
   - Compras y devoluciones comerciales: TARJETAS > COMPRAS Y DEVOLUCIONES.
   - Extractos y fechas de corte: INFORMACIÓN Y DOCUMENTOS > EXTRACTOS Y DOCUMENTOS.
   - Compras diferidas y financiación: TARJETAS > DIFERIDOS Y FINANCIACIÓN.
   - Entrega, deterioro y reposición de plástico: TARJETAS > PLÁSTICO Y BLOQUEO.
   - Cancelación voluntaria: PRODUCTOS > CANCELACIÓN DE PRODUCTOS.
   - Activación de tarjeta: PRODUCTOS > ACTIVACIÓN DE PRODUCTOS.
   - Millas y puntos: TARJETAS > MILLAS Y PROGRAMAS DE LEALTAD.
   - Embargos financieros reales: EMBARGOS > DESEMBARGO o APLICACIÓN DE EMBARGO (¡NUNCA confundir la conjunción "sin embargo" con un embargo financiero!).
9. OTRAS: Casos atípicos legítimos con información suficiente.
10. REVISIÓN HUMANA: ÚNICAMENTE si no hay información suficiente para clasificar (texto vacío, ruido o mención aislada de un producto sin problema específico).

RESUMEN DEL REQUERIMIENTO:
Máximo 20 palabras. Explica la petición o reclamo real del cliente.

CASOS A CLASIFICAR (JSON):
${JSON.stringify(formattedCases, null, 2)}
`;

  let parsedArray: any[] | null = null;
  const modelsToTry = ['gemini-3.8-flash'];

  if (process.env.GEMINI_API_KEY) {
    let rateLimited = false;
    for (const modelName of modelsToTry) {
      if (parsedArray || rateLimited) break;

      try {
        const apiCall = ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  expediente: { type: Type.STRING },
                  categoria_principal: { type: Type.STRING },
                  subcategoria: { type: Type.STRING },
                  resumen_requerimiento: { type: Type.STRING, description: 'Máximo 20 palabras resumiendo la solicitud' },
                  intencion_cliente: { type: Type.STRING, description: 'Intención real interpretada del cliente' },
                  confianza: { type: Type.INTEGER, description: 'Nivel de confianza de 0 a 100' },
                  requiere_revision_humana: { type: Type.BOOLEAN }
                },
                required: ['expediente', 'categoria_principal', 'subcategoria', 'resumen_requerimiento', 'confianza', 'requiere_revision_humana']
              }
            }
          }
        });

        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout de respuesta Gemini (4s)')), 4000)
        );

        const response: any = await Promise.race([apiCall, timeoutPromise]);

        const parsedText = response.text ? response.text.trim() : '[]';
        parsedArray = JSON.parse(parsedText);
        if (Array.isArray(parsedArray) && parsedArray.length > 0) {
          break;
        }
      } catch (err: any) {
        const errMsg = String(err.message || err);
        console.warn(`[Gemini API] Solicitud con ${modelName} falló:`, errMsg);
        if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota exceeded')) {
          rateLimited = true;
          break;
        }
      }
    }
  }

  // Parse structured results from Gemini or fallback
  if (Array.isArray(parsedArray) && parsedArray.length > 0) {
    recordsToAnalyze.forEach((rec, idx) => {
      const originalIdx = pendingIndices[idx];
      const aiData = parsedArray!.find(p => String(p.expediente || p.numero_expediente) === String(rec.numero_expediente)) || parsedArray![idx];

      const rawCatPrincipal = aiData?.categoria_principal || aiData?.categoria || '';
      const rawSub = aiData?.subcategoria || '';
      let normalized = normalizeCategoryName(`${rawCatPrincipal} ${rawSub}`);

      // STRICT VALIDATION: If AI tried to assign CDT without explicit CDT mention, reject and reclassify
      const lowerDesc = String(rec.descripcion_original || '').toLowerCase();
      if (normalized.categoria_principal === 'CDT' && !/\bcdt\b/i.test(lowerDesc) && !lowerDesc.includes('certificado de deposito') && !lowerDesc.includes('deceval')) {
        const deterministicFix = classifyPQRDeterministic(rec);
        normalized = {
          categoria_principal: deterministicFix.categoria_principal,
          subcategoria: deterministicFix.subcategoria
        };
      }

      const conf = typeof aiData?.confianza === 'number' ? Math.min(100, Math.max(0, aiData.confianza)) : 94;
      const reqRev = normalized.categoria_principal === 'REVISIÓN HUMANA' || Boolean(aiData?.requiere_revision_humana);

      const analysis = buildPQRSAnalysis(rec, {
        expediente: rec.numero_expediente,
        categoria_principal: normalized.categoria_principal,
        subcategoria: normalized.subcategoria,
        resumen_requerimiento: aiData?.resumen_requerimiento || `${normalized.categoria_principal}: ${rec.descripcion_original.slice(0, 90)}`,
        intencion_cliente: aiData?.intencion_cliente || `Gestión de ${normalized.subcategoria}`,
        confianza: conf,
        requiere_revision_humana: reqRev,
        motivo_de_revision: reqRev ? 'Requiere validación humana por información insuficiente.' : undefined,
        producto_detectado: aiData?.producto_detectado || (rec.producto_original || 'TARJETA DE CRÉDITO'),
        problema_principal: aiData?.problema_principal || aiData?.resumen_requerimiento || 'Gestión operativa de producto',
        solicitud_cliente: aiData?.solicitud_cliente || aiData?.intencion_cliente || 'Atención de solicitud',
        evidencia_textual: aiData?.evidencia_textual || rec.descripcion_original.slice(0, 100)
      });

      results[originalIdx] = analysis;
      const contextKey = `${rec.descripcion_original || ''}|${rec.submotivo_original || rec.resumen_original || ''}|${rec.producto_original || ''}`;
      const hash = rec.hash_descripcion || hashText(contextKey);
      analysisCache.set(hash, analysis);
    });

    return consolidateBatchClassifications(results);
  }

  // Fallback to high-accuracy deterministic classifier if API is unavailable, offline, or rate-limited
  recordsToAnalyze.forEach((rec, idx) => {
    const originalIdx = pendingIndices[idx];
    const classification = classifyPQRDeterministic(rec);
    const analysis = buildPQRSAnalysis(rec, classification);
    results[originalIdx] = analysis;
    const contextKey = `${rec.descripcion_original || ''}|${rec.submotivo_original || rec.resumen_original || ''}|${rec.producto_original || ''}`;
    const hash = rec.hash_descripcion || hashText(contextKey);
    analysisCache.set(hash, analysis);
  });

  return consolidateBatchClassifications(results);
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
  try {
    const res: any = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: text
    });

    const values = res.embedding?.values || res.embeddings?.[0]?.values;
    if (values && values.length > 0) {
      embeddingCache.set(hash, values);
      return values;
    }
  } catch (err) {
    try {
      const res: any = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: text
      });
      const values = res.embedding?.values || res.embeddings?.[0]?.values;
      if (values && values.length > 0) {
        embeddingCache.set(hash, values);
        return values;
      }
    } catch (e2) {
      // Local fallback silently ignored
    }
  }

  return [];
}
