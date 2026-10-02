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
      apiKey: process.env.GEMINI_API_KEY || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
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

  // 1. Check cache first
  records.forEach((rec, idx) => {
    const hash = rec.hash_descripcion || hashText(rec.descripcion_original || `empty_${idx}`);
    if (analysisCache.has(hash)) {
      const cached = analysisCache.get(hash)!;
      results[idx] = {
        ...cached,
        numero_expediente: rec.numero_expediente
      };
    } else {
      pendingIndices.push(idx);
      recordsToAnalyze.push(rec);
    }
  });

  if (recordsToAnalyze.length === 0) {
    return consolidateBatchClassifications(results);
  }

  // Format cases for Gemini showing DESC_DETALLADA as primary source
  const formattedCases = recordsToAnalyze.map(r => ({
    expediente: String(r.numero_expediente),
    DESC_DETALLADA: String(r.descripcion_original || ''),
    SUBMOTIVO_CONTEXTO: String(r.submotivo_original || r.resumen_original || 'No provisto'),
    NOMBRE_PRODUCTO_CONTEXTO: String(r.producto_original || 'No provisto')
  }));

  const prompt = `
Quiero que actúes como un CLASIFICADOR INTELIGENTE DE PQR/PQRS BANCARIO.

OBJETIVO:
1. Leer principalmente "DESC_DETALLADA" como fuente de verdad primordial.
2. Interpretar la INTENCIÓN REAL del cliente (no te quedes únicamente en palabras clave literales).
3. Identificar el gran tema (CATEGORÍA PRINCIPAL).
4. Asignar la SUBCATEGORÍA correspondiente.
5. Redactar un RESUMEN DEL REQUERIMIENTO de MÁXIMO 20 PALABRAS (conciso, claro y directo).
6. Asignar nivel de CONFIANZA (0 a 100).
7. Determinar si realmente requiere REVISIÓN HUMANA (true ÚNICAMENTE si la descripción está vacía, es puro ruido o carece de información).
   PROHIBIDO enviar casos a "REVISIÓN HUMANA" por precaución o complejidad si el tema es identificable.
   PROHIBIDO utilizar "OTRAS" como comodín de descarte.

PRINCIPIO FUNDAMENTAL:
"AGRUPA POR INTENCIÓN, NO POR PALABRAS".
Ejemplo:
"Me cobraron cuota de manejo", "Solicito devolución de cuota de manejo", "No estoy de acuerdo con la cuota mensual" o "Quiero que me reversen el cobro de la cuenta"
-> Todos tienen la misma intención temática:
CATEGORÍA PRINCIPAL: COMISIONES Y COBROS
SUBCATEGORÍA: CUOTA DE MANEJO
(NO inventar subcategorías dispersas como "Cobro cuota", "Reversión cuota", etc.).

CATÁLOGO BASE HOMOGÉNEO:
- CDT:
  * CDT - VISUALIZACIÓN (no aparece, no visualizo en app, desapareció)
  * CDT - RENDIMIENTOS (pago de rendimientos, liquidación de intereses, diferencias)
  * CDT - PAGO / CANCELACIÓN (redención, vencimiento, cancelación, desembolso)
  * CDT - CERTIFICADOS Y SOPORTES (certificados Deceval, titularidad, tributarios)

- PRODUCTOS:
  * CANCELACIÓN DE PRODUCTOS (cancelación de cuentas, tarjetas, créditos, leasing, etc.)
  * CONDICIONES DEL PRODUCTO (tasas, beneficios, restricciones, cambios en condiciones)
  * ACTIVACIÓN DE PRODUCTOS (activación de cuenta, tarjeta, token, habilitación de uso)

- GMF / 4X1000:
  * COBRO (reclamo por cobro del gravamen)
  * MARCACIÓN (solicitud de marcación como cuenta exenta)
  * DESMARCACIÓN (solicitud de desmarcación o retiro de beneficio)
  * DEVOLUCIÓN (solicitud de reintegro de GMF cobrado)

- TRANSACCIONES:
  * TRANSFERENCIAS (transferencias rechazadas, retenidas, no recibidas, ACH, Bre-B)
  * ACLARACIÓN DE TRANSACCIONES (explicación de movimientos, notas débito/crédito)
  * SALDOS Y MOVIMIENTOS (saldo incorrecto, dinero no reflejado, diferencias)

- CANALES DIGITALES:
  * BANCA MÓVIL Y VIRTUAL (ingreso, usuario, contraseña, token, OTP, bloqueos)
  * FALLAS TECNOLÓGICAS (errores en pantalla, caídas de sistema, pantallas en blanco)

- PAGOS:
  * DÉBITOS AUTOMÁTICOS (inscripción, cancelación, no aplicado, duplicado)
  * PAGOS Y RECAUDOS (servicios públicos, convenios, abonos a obligaciones)
  * PSE (operaciones, compras, soporte o errores en pasarela PSE)

- COMISIONES Y COBROS:
  * CUOTA DE MANEJO (cobro, reclamación, exoneración o devolución de cuota de manejo)
  * COMISIONES Y TARIFAS (comisiones operativas, tarifas varias)
  * INTERESES (liquidación de intereses, mora no procedente)

- TARJETAS:
  * MILLAS Y PROGRAMAS DE LEALTAD (millas, puntos, beneficios, canjes)
  * PLÁSTICO Y BLOQUEO (envío, entrega, plástico deteriorado, cupo)

- CRÉDITOS Y CARTERA:
  * ESTADO DE OBLIGACIÓN / SALDOS (saldo pendiente, plan de pagos, liquidación)
  * REFINANCIACIÓN Y ACUERDOS (acuerdos de pago, reestructuración)

- SEGUROS:
  * PÓLIZAS Y COBROS (cobro de seguro de vida, crédito, desempleo)
  * CANCELACIÓN Y DEVOLUCIÓN (cancelación de seguro, devolución de primas)

- FRAUDE Y SEGURIDAD:
  * TRANSACCIONES NO RECONOCIDAS (compras, débitos, retiros o transferencias no autorizadas)
  * SUPLANTACIÓN Y CLONACIÓN (suplantación de identidad, clonación de tarjeta)

- DOCUMENTOS Y CERTIFICACIONES:
  * CERTIFICADOS Y PAZ Y SALVO (paz y salvo, certificaciones bancarias o de deuda)
  * EXTRACTOS Y DOCUMENTOS (copias de contratos, extractos históricos, pagarés)

- SERVICIO Y ATENCIÓN:
  * ATENCIÓN ASESOR Y SUCURSAL (inconformidad con el trato o mala asesoría)
  * TIEMPOS DE RESPUESTA (demoras injustificadas en atención o trámites)

- OTRAS:
  * CASOS ATÍPICOS (estrictamente casos singulares que no encajen en ningún tema)

- REVISIÓN HUMANA:
  * INFORMACIÓN INSUFICIENTE (únicamente descripciones vacías o incomprensibles)

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

  // Parse structured results from Gemini
  if (Array.isArray(parsedArray) && parsedArray.length > 0) {
    recordsToAnalyze.forEach((rec, idx) => {
      const originalIdx = pendingIndices[idx];
      const aiData = parsedArray!.find(p => String(p.expediente || p.numero_expediente) === String(rec.numero_expediente)) || parsedArray![idx];

      const rawCatPrincipal = aiData?.categoria_principal || aiData?.categoria || '';
      const rawSub = aiData?.subcategoria || '';
      const normalized = normalizeCategoryName(`${rawCatPrincipal} ${rawSub}`);

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
        motivo_de_revision: reqRev ? 'Requiere validación humana por información insuficiente.' : undefined
      });

      results[originalIdx] = analysis;
      const hash = rec.hash_descripcion || hashText(rec.descripcion_original || `empty_${originalIdx}`);
      analysisCache.set(hash, analysis);
    });

    return consolidateBatchClassifications(results);
  }

  // Fallback to high-accuracy deterministic classifier if API is unavailable or offline
  recordsToAnalyze.forEach((rec, idx) => {
    const originalIdx = pendingIndices[idx];
    const classification = classifyPQRDeterministic(rec);
    const analysis = buildPQRSAnalysis(rec, classification);
    results[originalIdx] = analysis;
    const hash = rec.hash_descripcion || hashText(rec.descripcion_original || `empty_${originalIdx}`);
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
