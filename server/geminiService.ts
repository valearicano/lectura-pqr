import { GoogleGenAI, Type } from '@google/genai';
import { PQRSAnalysis, CATEGORIAS_MAESTRAS_16, CategoriaPQR16 } from '../src/types';
import { hashText } from '../src/services/textNormalizer';
import { 
  classifyPQRDeterministic, 
  buildPQRSAnalysis, 
  normalizeCategoria,
  PQRInputRecord 
} from '../src/services/classifierEngine';

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
    return results;
  }

  // Format cases for Gemini showing DESC_DETALLADA as primary source
  const formattedCases = recordsToAnalyze.map(r => ({
    expediente: String(r.numero_expediente),
    DESC_DETALLADA: String(r.descripcion_original || ''),
    SUBMOTIVO: String(r.submotivo_original || r.resumen_original || 'No provisto'),
    NOMBRE_PRODUCTO: String(r.producto_original || 'No provisto')
  }));

  const prompt = `
Quiero que actúes como un CLASIFICADOR DE PQR.

Tu objetivo NO es explicar ampliamente cada caso.
Tu objetivo principal es LEER "DESC_DETALLADA" y asignar cada PQR a UNA SOLA CATEGORÍA MAESTRA.

La clasificación debe ser simple, consistente y agrupada.
NO CREES CATEGORÍAS NUEVAS.
NO CREES SUBCATEGORÍAS.

UTILIZA ÚNICAMENTE ESTAS 16 CATEGORÍAS MAESTRAS:
1. CUOTA DE MANEJO
2. PSE
3. SEGUROS
4. GMF / 4X1000
5. FRAUDE / NO RECONOCIDO
6. PROBLEMAS TRANSACCIONES
7. PAGOS / ABONOS
8. TARJETAS
9. CRÉDITOS / CARTERA
10. CUENTAS
11. TRANSFERENCIAS
12. COBROS / CARGOS
13. DATOS / INFORMACIÓN
14. SERVICIO / ATENCIÓN
15. OTRAS
16. REVISIÓN HUMANA

==================================================
REGLAS DE CLASIFICACIÓN Y JERARQUÍA DE PRIORIDAD
==================================================

Cuando existan varias palabras o conceptos en una misma descripción, aplicar ESTRICTAMENTE esta prioridad:

1. FRAUDE / NO RECONOCIDO:
Si el cliente indica que NO reconoce una compra, débito, retiro, transferencia o transacción, clasificar como FRAUDE / NO RECONOCIDO.
Palabras clave: no reconozco, no reconoce, no autorizado, no autoricé, fraude, transacción fraudulenta, compra que no hice, débito que no hice, retiro que no hice, movimiento desconocido, inusual, desconocido, clonación, suplantación.

2. PSE (REGLA CRÍTICA):
PSE debe ser una categoría MAESTRA.
Si "DESC_DETALLADA" contiene "PSE" o claramente hace referencia a una operación PSE, clasificar como: PSE.
NO crear subcategorías. Todo esto queda en PSE: error PSE, pago PSE, compra PSE, PSE rechazado, no puede usar PSE, no funciona, bloqueado, transacción PSE, soporte PSE, devolución PSE, problema PSE, error 00001 de PSE.

3. CUOTA DE MANEJO:
Todo lo relacionado con cuota de manejo debe clasificarse como: CUOTA DE MANEJO.
No importa si el cliente reclama un cobro, solicita reversión, solicita devolución, pregunta por qué se cobró, manifiesta inconformidad, pide eliminar la cuota, o solicita aclaración.

4. SEGUROS:
Todo lo relacionado con seguros debe clasificarse como: SEGUROS.
Incluye: cobro de seguro, póliza, seguro de vida, seguro de tarjeta, seguro asociado a crédito, cancelación de seguro, devolución de seguro, reclamación de seguro, activación/desactivación. No importa el tipo de seguro.

5. GMF / 4X1000:
Todo lo relacionado con GMF, 4x1000 o marcación de cuentas debe clasificarse como: GMF / 4X1000.
Incluye: cobro del 4x1000, devolución del 4x1000, marcación para exención, desmarcación, solicitud de exención, cobro GMF, impuesto GMF, marcación de cuenta, retiro de marcación, error en marcación.

6. PAGOS / ABONOS:
Todo lo relacionado con pagos, abonos o aplicación de dinero debe clasificarse como: PAGOS / ABONOS.
Incluye: pago, abono, aplicación de pago, pago no aplicado, pago aplicado incorrectamente, pago pendiente, reversión de pago, devolución de pago, abono a crédito, dinero abonado, pago de obligación.
IMPORTANTE: Si el caso habla específicamente de un PAGO o ABONO a un crédito, usar PAGOS / ABONOS y NO CRÉDITOS / CARTERA.

7. TRANSFERENCIAS:
Todo lo relacionado con transferencias debe clasificarse como: TRANSFERENCIAS.
Incluye transferencias enviadas, recibidas, rechazadas, pendientes o con problemas.
EXCEPCIÓN: Si el cliente indica que la transferencia NO fue realizada por él o no la reconoce, clasificar: FRAUDE / NO RECONOCIDO.

8. TARJETAS:
Todo lo relacionado con tarjetas debe clasificarse como: TARJETAS.
Incluye: tarjeta de crédito, tarjeta débito, entrega de tarjeta, envío de tarjeta, activación, bloqueo, desbloqueo, renovación, cupo, problemas de tarjeta.

9. CRÉDITOS / CARTERA:
Todo lo relacionado directamente con créditos u obligaciones debe clasificarse como: CRÉDITOS / CARTERA.
Incluye: crédito, obligación, saldo de crédito, cuota de crédito, cartera, intereses, refinanciación, acuerdo de pago, estado de obligación.

10. PROBLEMAS TRANSACCIONES:
Todo problema general relacionado con una transacción debe clasificarse como: PROBLEMAS TRANSACCIONES.
Cuando el cliente habla de una transacción, operación, movimiento, débito o cajero pero NO indica que sea fraude o no reconocida.

11. CUENTAS:
Todo lo relacionado con una cuenta bancaria (ahorros, corriente, apertura, cancelación, bloqueo de cuenta) que no corresponda a otra categoría específica.

12. COBROS / CARGOS:
Usar esta categoría solamente cuando existe un cobro o cargo que NO corresponde claramente a: cuota de manejo, GMF, seguro, pago/abono, transacción no reconocida u otra categoría específica.

13. DATOS / INFORMACIÓN:
Usar cuando el cliente solicita información, certificados, paz y salvo, soportes, extractos, datos o documentos y no existe una categoría más específica.

14. SERVICIO / ATENCIÓN:
Usar cuando la PQR corresponde principalmente a problemas de atención, servicio, asesoría, oficina, canal de atención, bloqueo de clave/usuario o calidad del servicio.

15. OTRAS:
Usar solamente cuando el caso no corresponde claramente a ninguna de las categorías anteriores.

16. REVISIÓN HUMANA (REGLA CRÍTICA ESTRICTA):
Usar ÚNICAMENTE cuando:
* "DESC_DETALLADA" está vacía o es nula;
* Contiene solamente la palabra "Descripción";
* No existe información suficiente para determinar la categoría (menos de 4 caracteres o texto sin sentido).
PROHIBICIÓN:
- NO utilizar REVISIÓN HUMANA simplemente porque el texto tiene errores ortográficos o modismos.
- NO utilizar REVISIÓN HUMANA porque el caso sea complejo si existe una categoría clara.
- NO utilizar REVISIÓN HUMANA como opción predeterminada o por precaución.

UNA FILA = UNA SOLA CATEGORÍA MAESTRA.
FORMATO DE SALIDA: Devuelve exclusivamente un array JSON donde cada elemento contiene:
{
  "expediente": string,
  "categoria": string (una de las 16 categorías maestras exactas),
  "confianza": number (entero de 0 a 100),
  "requiere_revision_humana": boolean (true ÚNICAMENTE si categoria es REVISIÓN HUMANA)
}

CASOS A CLASIFICAR (JSON):
${JSON.stringify(formattedCases, null, 2)}
`;

  let parsedArray: any[] | null = null;
  const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest'];

  if (process.env.GEMINI_API_KEY) {
    for (const modelName of modelsToTry) {
      if (parsedArray) break;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
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
                    categoria: {
                      type: Type.STRING,
                      enum: [
                        'CUOTA DE MANEJO',
                        'PSE',
                        'SEGUROS',
                        'GMF / 4X1000',
                        'FRAUDE / NO RECONOCIDO',
                        'PROBLEMAS TRANSACCIONES',
                        'PAGOS / ABONOS',
                        'TARJETAS',
                        'CRÉDITOS / CARTERA',
                        'CUENTAS',
                        'TRANSFERENCIAS',
                        'COBROS / CARGOS',
                        'DATOS / INFORMACIÓN',
                        'SERVICIO / ATENCIÓN',
                        'OTRAS',
                        'REVISIÓN HUMANA'
                      ]
                    },
                    confianza: { type: Type.INTEGER, description: 'Nivel de confianza de 0 a 100' },
                    requiere_revision_humana: { type: Type.BOOLEAN }
                  },
                  required: ['expediente', 'categoria', 'confianza', 'requiere_revision_humana']
                }
              }
            }
          });

          const parsedText = response.text ? response.text.trim() : '[]';
          parsedArray = JSON.parse(parsedText);
          if (Array.isArray(parsedArray) && parsedArray.length > 0) {
            break;
          }
        } catch (err: any) {
          console.warn(`[Gemini API] Intento ${attempt} con ${modelName} falló:`, err.message || err);
          if (attempt < 2) {
            await new Promise(res => setTimeout(res, 800));
          }
        }
      }
    }
  }

  // Parse structured results from Gemini
  if (Array.isArray(parsedArray) && parsedArray.length > 0) {
    recordsToAnalyze.forEach((rec, idx) => {
      const originalIdx = pendingIndices[idx];
      const aiData = parsedArray!.find(p => String(p.expediente || p.numero_expediente) === String(rec.numero_expediente)) || parsedArray![idx];

      const rawCat = aiData?.categoria || '';
      const cat: CategoriaPQR16 = normalizeCategoria(rawCat);
      const conf = typeof aiData?.confianza === 'number' ? Math.min(100, Math.max(0, aiData.confianza)) : 92;
      const reqRev = cat === 'REVISIÓN HUMANA' || Boolean(aiData?.requiere_revision_humana);

      const analysis = buildPQRSAnalysis(rec, {
        expediente: rec.numero_expediente,
        categoria: cat,
        confianza: conf,
        requiere_revision_humana: reqRev,
        motivo_de_revision: reqRev ? 'Requiere validación humana.' : undefined
      });

      results[originalIdx] = analysis;
      const hash = rec.hash_descripcion || hashText(rec.descripcion_original || `empty_${originalIdx}`);
      analysisCache.set(hash, analysis);
    });

    return results;
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

  return results;
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
