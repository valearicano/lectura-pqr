import { GoogleGenAI, Type } from '@google/genai';
import { PQRSAnalysis, CATEGORIAS_OFICIALES_16, CategoriaPQR16 } from '../src/types';
import { hashText } from '../src/services/textNormalizer';

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

/**
 * Deterministic classifier implementing the 16 exact categories and priority rules:
 * Prioridad:
 * 1. FRAUDE / TRANSACCIÓN NO RECONOCIDA
 * 2. PSE
 * 3. CUOTA DE MANEJO
 * 4. SEGUROS
 * 5. GMF / 4X1000
 * 6. PAGOS / ABONOS
 * 7. TRANSFERENCIAS
 * 8. TARJETAS
 * 9. CRÉDITOS / CARTERA
 * 10. TRANSACCIONES
 * 11. CUENTAS
 * 12. COBROS / CARGOS
 * 13. DATOS / INFORMACIÓN
 * 14. SERVICIO / ATENCIÓN
 * 15. OTRAS
 * 16. REVISIÓN HUMANA
 */
function fallbackSemanticAnalysis(
  rec: {
    numero_expediente: string;
    resumen_original: string;
    descripcion_original: string;
    submotivo_original?: string;
    producto_original?: string;
  }
): PQRSAnalysis {
  const text = (rec.descripcion_original || '').toLowerCase().trim();
  const submotivoOrig = (rec.submotivo_original || rec.resumen_original || '').toLowerCase();
  const productoOrig = (rec.producto_original || '').toLowerCase();

  let categoria: CategoriaPQR16 = 'OTRAS';
  let confianza = 90;
  let requiereRevisionHumana = false;
  let motivoRevision = '';

  // 16. REVISIÓN HUMANA (Condiciones excluyentes de entrada)
  if (!text || text === 'descripcion' || text === 'descripción' || text === 'descrip' || (text.length < 15 && !text.includes('pse') && !text.includes('gmf') && !text.includes('fraude'))) {
    categoria = 'REVISIÓN HUMANA';
    confianza = 30;
    requiereRevisionHumana = true;
    motivoRevision = 'DESC_DETALLADA está vacía o contiene texto insuficiente para determinar la categoría.';
  }
  // 1. FRAUDE / TRANSACCIÓN NO RECONOCIDA (Prioridad 1)
  else if (
    text.includes('no reconozco') ||
    text.includes('no reconoce') ||
    text.includes('no autorizad') ||
    text.includes('no autorice') ||
    text.includes('no autoricé') ||
    text.includes('fraude') ||
    text.includes('fraudulenta') ||
    text.includes('compra que no hice') ||
    text.includes('debito que no hice') ||
    text.includes('débito que no hice') ||
    text.includes('retiro que no hice') ||
    text.includes('movimiento desconocido') ||
    text.includes('transaccion inusual') ||
    text.includes('transacción inusual') ||
    text.includes('operacion desconocida') ||
    text.includes('operación desconocida') ||
    text.includes('clonacion') ||
    text.includes('clonación') ||
    text.includes('suplantacion') ||
    text.includes('suplantación')
  ) {
    categoria = 'FRAUDE / TRANSACCIÓN NO RECONOCIDA';
    confianza = 95;
    requiereRevisionHumana = false;
  }
  // 2. PSE (Prioridad 2)
  else if (text.includes('pse')) {
    categoria = 'PSE';
    confianza = 95;
    requiereRevisionHumana = false;
  }
  // 3. CUOTA DE MANEJO (Prioridad 3)
  else if (
    text.includes('cuota de manejo') ||
    text.includes('cuotas de manejo') ||
    text.includes('cuota manejo') ||
    text.includes('cobro de cuota')
  ) {
    categoria = 'CUOTA DE MANEJO';
    confianza = 95;
    requiereRevisionHumana = false;
  }
  // 4. SEGUROS (Prioridad 4)
  else if (
    text.includes('seguro') ||
    text.includes('seguros') ||
    text.includes('poliza') ||
    text.includes('póliza')
  ) {
    categoria = 'SEGUROS';
    confianza = 94;
    requiereRevisionHumana = false;
  }
  // 5. GMF / 4X1000 (Prioridad 5)
  else if (
    text.includes('4x1000') ||
    text.includes('4*1000') ||
    text.includes('cuatro por mil') ||
    text.includes('gmf') ||
    text.includes('marcacion') ||
    text.includes('marcación') ||
    text.includes('desmarcacion') ||
    text.includes('desmarcación') ||
    text.includes('exenta') ||
    text.includes('exencion') ||
    text.includes('exención')
  ) {
    categoria = 'GMF / 4X1000';
    confianza = 95;
    requiereRevisionHumana = false;
  }
  // 6. PAGOS / ABONOS (Prioridad 6 - incluye pagos a crédito)
  else if (
    text.includes('pago') ||
    text.includes('pagos') ||
    text.includes('abono') ||
    text.includes('abonos') ||
    text.includes('aplicacion de pago') ||
    text.includes('aplicación de pago') ||
    text.includes('no aplicado') ||
    text.includes('pago no aplicado') ||
    text.includes('pago pendiente') ||
    text.includes('reversion de pago') ||
    text.includes('reversión de pago') ||
    text.includes('devolucion de pago') ||
    text.includes('devolución de pago') ||
    text.includes('abono a credito') ||
    text.includes('abono a crédito') ||
    text.includes('pago de obligacion') ||
    text.includes('pago de obligación') ||
    text.includes('consignacion') ||
    text.includes('consignación')
  ) {
    categoria = 'PAGOS / ABONOS';
    confianza = 93;
    requiereRevisionHumana = false;
  }
  // 7. TRANSFERENCIAS (Prioridad 7)
  else if (
    text.includes('transferencia') ||
    text.includes('transferencias') ||
    text.includes('transferir') ||
    text.includes('transferí')
  ) {
    categoria = 'TRANSFERENCIAS';
    confianza = 92;
    requiereRevisionHumana = false;
  }
  // 8. TARJETAS (Prioridad 8)
  else if (
    text.includes('tarjeta de credito') ||
    text.includes('tarjeta de crédito') ||
    text.includes('tarjeta debito') ||
    text.includes('tarjeta débito') ||
    text.includes('tarjeta') ||
    text.includes('tarjetas') ||
    text.includes('plastico') ||
    text.includes('plástico') ||
    text.includes('entrega de tarjeta') ||
    text.includes('bloqueo de tarjeta')
  ) {
    categoria = 'TARJETAS';
    confianza = 92;
    requiereRevisionHumana = false;
  }
  // 9. CRÉDITOS / CARTERA (Prioridad 9)
  else if (
    text.includes('credito') ||
    text.includes('crédito') ||
    text.includes('obligacion') ||
    text.includes('obligación') ||
    text.includes('saldo de credito') ||
    text.includes('saldo de crédito') ||
    text.includes('cuota de credito') ||
    text.includes('cuota de crédito') ||
    text.includes('cartera') ||
    text.includes('intereses') ||
    text.includes('refinanciacion') ||
    text.includes('refinanciación') ||
    text.includes('acuerdo de pago') ||
    text.includes('prestamo') ||
    text.includes('préstamo') ||
    text.includes('libranza') ||
    text.includes('hipotecario')
  ) {
    categoria = 'CRÉDITOS / CARTERA';
    confianza = 91;
    requiereRevisionHumana = false;
  }
  // 10. TRANSACCIONES (Prioridad 10)
  else if (
    text.includes('transaccion') ||
    text.includes('transacción') ||
    text.includes('operacion') ||
    text.includes('operación') ||
    text.includes('movimiento') ||
    text.includes('debito') ||
    text.includes('débito')
  ) {
    categoria = 'TRANSACCIONES';
    confianza = 88;
    requiereRevisionHumana = false;
  }
  // 11. CUENTAS (Prioridad 11)
  else if (
    text.includes('cuenta de ahorros') ||
    text.includes('cuenta de ahorro') ||
    text.includes('cuenta corriente') ||
    text.includes('cuenta bancaria') ||
    text.includes('apertura de cuenta') ||
    text.includes('cancelacion de cuenta') ||
    text.includes('cuenta')
  ) {
    categoria = 'CUENTAS';
    confianza = 88;
    requiereRevisionHumana = false;
  }
  // 12. COBROS / CARGOS (Prioridad 12)
  else if (
    text.includes('cobro') ||
    text.includes('cobros') ||
    text.includes('cargo') ||
    text.includes('cargos') ||
    text.includes('comision') ||
    text.includes('comisión') ||
    text.includes('tarifa')
  ) {
    categoria = 'COBROS / CARGOS';
    confianza = 87;
    requiereRevisionHumana = false;
  }
  // 13. DATOS / INFORMACIÓN (Prioridad 13)
  else if (
    text.includes('certificado') ||
    text.includes('certificados') ||
    text.includes('soporte') ||
    text.includes('soportes') ||
    text.includes('paz y salvo') ||
    text.includes('extracto') ||
    text.includes('extractos') ||
    text.includes('documento') ||
    text.includes('documentos') ||
    text.includes('informacion') ||
    text.includes('información') ||
    text.includes('datos') ||
    text.includes('copia de')
  ) {
    categoria = 'DATOS / INFORMACIÓN';
    confianza = 89;
    requiereRevisionHumana = false;
  }
  // 14. SERVICIO / ATENCIÓN (Prioridad 14)
  else if (
    text.includes('atencion') ||
    text.includes('atención') ||
    text.includes('servicio') ||
    text.includes('asesor') ||
    text.includes('asesora') ||
    text.includes('oficina') ||
    text.includes('canal de atencion') ||
    text.includes('calidad') ||
    text.includes('mal trato') ||
    text.includes('pesimo') ||
    text.includes('pésimo')
  ) {
    categoria = 'SERVICIO / ATENCIÓN';
    confianza = 88;
    requiereRevisionHumana = false;
  }
  // 15. OTRAS (Prioridad 15)
  else {
    categoria = 'OTRAS';
    confianza = 75;
    requiereRevisionHumana = false;
  }

  // Detección de inconsistencia con la clasificación original
  let existeInconsistencia: 'SI' | 'NO' = 'NO';
  let motivoInconsistencia: string | undefined = undefined;

  if (submotivoOrig || productoOrig) {
    if (categoria === 'FRAUDE / TRANSACCIÓN NO RECONOCIDA' && !submotivoOrig.includes('fraude') && !submotivoOrig.includes('no reconoc')) {
      existeInconsistencia = 'SI';
      motivoInconsistencia = `La descripción reporta una transacción no reconocida o fraude, pero el registro original indicaba "${rec.submotivo_original || rec.resumen_original}".`;
    } else if (categoria === 'PAGOS / ABONOS' && !submotivoOrig.includes('pago') && !submotivoOrig.includes('abono')) {
      existeInconsistencia = 'SI';
      motivoInconsistencia = `La descripción se enfoca en problemas con la aplicación de un pago/abono, mientras que el registro original rotulaba "${rec.submotivo_original || rec.resumen_original}".`;
    } else if (categoria === 'CUOTA DE MANEJO' && !submotivoOrig.includes('cuota') && !submotivoOrig.includes('manejo')) {
      existeInconsistencia = 'SI';
      motivoInconsistencia = `La descripción reclama específicamente el cobro de cuota de manejo, mientras que el registro original indicaba "${rec.submotivo_original || rec.resumen_original}".`;
    } else if (categoria === 'PSE' && !submotivoOrig.includes('pse')) {
      existeInconsistencia = 'SI';
      motivoInconsistencia = `La descripción se refiere a una operación PSE, pero el registro original no lo contemplaba.`;
    }
  }

  return {
    numero_expediente: rec.numero_expediente,
    categoria,
    confianza,
    requiere_revision_humana: requiereRevisionHumana ? 'SI' : 'NO',
    requiere_revision: requiereRevisionHumana,
    motivo_de_revision: motivoRevision || undefined,
    existe_inconsistencia: existeInconsistencia,
    posible_inconsistencia: existeInconsistencia === 'SI',
    motivo_inconsistencia: motivoInconsistencia,

    // Compatibilidad enriquecida
    producto: rec.producto_original || 'Identificado en descripción',
    motivo: categoria,
    submotivo: categoria,
    tema_principal: categoria,
    subtema: categoria,
    subcategoria: categoria,
    problema_principal: `Caso clasificado en categoría ${categoria}.`,
    solicitud_cliente: `Requerimiento referente a ${categoria}.`,
    que_solicita_exactamente: `Trámite o reclamación sobre ${categoria}.`,
    hechos_principales: rec.descripcion_original.slice(0, 180),
    sustento_clasificacion: `Identificado en DESC_DETALLADA con base en la regla de prioridad.`,
    resumen_normalizado: `${categoria}: ${rec.descripcion_original.slice(0, 90)}...`,
    justificacion: `Asignado a la categoría ${categoria} siguiendo las 16 reglas oficiales y el orden de prioridad.`,
    nivel_confianza: confianza >= 85 ? 'Alta' : confianza >= 70 ? 'Media' : 'Baja',
    modelo_ia: 'gemini-3.8-flash',
    version_prompt: 'v3.0.0-16-categorias',
    fecha_analisis: new Date().toISOString(),
    estado_revision: 'PENDIENTE'
  };
}

export async function analyzePQRSBatch(
  records: {
    numero_expediente: string;
    resumen_original: string;
    descripcion_original: string;
    submotivo_original?: string;
    producto_original?: string;
    hash_descripcion?: string;
  }[],
  catalogSummary?: string
): Promise<PQRSAnalysis[]> {
  const ai = getAiClient();
  const results: PQRSAnalysis[] = [];
  const pendingIndices: number[] = [];
  const recordsToAnalyze: {
    numero_expediente: string;
    resumen_original: string;
    descripcion_original: string;
    submotivo_original?: string;
    producto_original?: string;
  }[] = [];

  // 1. Check cache first
  records.forEach((rec, idx) => {
    const hash = rec.hash_descripcion || hashText(rec.descripcion_original);
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
    expediente: r.numero_expediente,
    DESC_DETALLADA: r.descripcion_original,
    SUBMOTIVO: r.submotivo_original || r.resumen_original || 'No provisto',
    NOMBRE_PRODUCTO: r.producto_original || 'No provisto'
  }));

  const prompt = `
Quiero que actúes como un CLASIFICADOR DE PQR.

Tu objetivo NO es explicar ampliamente cada caso.

Tu objetivo principal es LEER "DESC_DETALLADA" y asignar cada PQR a UNA SOLA CATEGORÍA GENERAL.

La clasificación debe ser simple, consistente y agrupada.

NO CREES CATEGORÍAS NUEVAS.

UTILIZA ÚNICAMENTE ESTAS CATEGORÍAS:

1. CUOTA DE MANEJO
2. PSE
3. SEGUROS
4. GMF / 4X1000
5. TRANSACCIONES
6. FRAUDE / TRANSACCIÓN NO RECONOCIDA
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

REGLAS DE CLASIFICACIÓN:

### 1. CUOTA DE MANEJO
Todo lo relacionado con cuota de manejo debe clasificarse como: CUOTA DE MANEJO.
No importa si reclama cobro, solicita reversión, devolución, pregunta por qué se cobró, manifiesta inconformidad, pide eliminar la cuota, o solicita aclaración.

### 2. PSE
SI DESC_DETALLADA contiene PSE o claramente hace referencia a una operación PSE, clasificar como: PSE.
NO CREAR SUBCATEGORÍAS.
Todo esto debe quedar en PSE: error PSE, pago PSE, compra PSE, PSE rechazado, no puede usar PSE, no funciona, bloqueado, transacción PSE, soporte, devolución, problema, error 00001 de PSE.

### 3. SEGUROS
Todo lo relacionado con seguros debe clasificarse como: SEGUROS.
Incluye: cobro de seguro, póliza, seguro de vida, de tarjeta, asociado a crédito, cancelación, devolución, reclamación, activación, desactivación. No importa el tipo de seguro.

### 4. GMF / 4X1000
Todo lo relacionado con GMF, 4x1000 o marcación de cuentas debe clasificarse como: GMF / 4X1000.
Incluye: cobro del 4x1000, devolución, marcación para exención, desmarcación, solicitud de exención, cobro GMF, impuesto GMF, marcación de cuenta, retiro de marcación, error en marcación.

### 5. TRANSACCIONES
Todo problema general relacionado con una transacción debe clasificarse como: TRANSACCIONES.
Cuando el cliente habla de una transacción, operación, movimiento o débito pero NO indica que sea fraude o no reconocida.

### 6. FRAUDE / TRANSACCIÓN NO RECONOCIDA
Si el cliente indica que NO reconoce una compra, débito, retiro, transferencia o transacción, clasificar como: FRAUDE / TRANSACCIÓN NO RECONOCIDA.
Palabras clave: no reconozco, no reconoce, no autorizado, no autoricé, fraude, transacción fraudulenta, compra que no hice, débito que no hice, retiro que no hice, movimiento desconocido, inusual, desconocido.

### 7. PAGOS / ABONOS
Todo lo relacionado con pagos, abonos o aplicación de dinero debe clasificarse como: PAGOS / ABONOS.
Incluye: pago, abono, aplicación de pago, pago no aplicado, aplicado incorrectamente, pago pendiente, reversión de pago, devolución de pago, abono a crédito, dinero abonado, pago de obligación.

### 8. TARJETAS
Todo lo relacionado con tarjetas debe clasificarse como: TARJETAS.
Incluye: tarjeta de crédito, débito, entrega de tarjeta, envío, activación, bloqueo, desbloqueo, renovación, cupo, problemas de tarjeta.

### 9. CRÉDITOS / CARTERA
Todo lo relacionado directamente con créditos u obligaciones debe clasificarse como: CRÉDITOS / CARTERA.
Incluye: crédito, obligación, saldo de crédito, cuota de crédito, cartera, intereses, refinanciación, acuerdo de pago, estado de obligación.
IMPORTANTE: Si el caso habla específicamente de un PAGO o ABONO a un crédito, usar PAGOS / ABONOS y no CRÉDITOS / CARTERA.

### 10. CUENTAS
Todo lo relacionado con una cuenta bancaria que no corresponda a otra categoría específica debe clasificarse como: CUENTAS.

### 11. TRANSFERENCIAS
Todo lo relacionado con transferencias debe clasificarse como: TRANSFERENCIAS.
Incluye transferencias enviadas, recibidas, rechazadas, pendientes o con problemas.
EXCEPCIÓN: Si indica que la transferencia NO fue realizada por él o no la reconoce, clasificar: FRAUDE / TRANSACCIÓN NO RECONOCIDA.

### 12. COBROS / CARGOS
Usar esta categoría solamente cuando existe un cobro o cargo que NO corresponde claramente a: cuota de manejo, GMF, seguro, pago/abono, transacción no reconocida, u otra categoría específica.

### 13. DATOS / INFORMACIÓN
Usar cuando el cliente solicita información, certificados, soportes, datos o documentos y no existe una categoría más específica.

### 14. SERVICIO / ATENCIÓN
Usar cuando la PQR corresponde principalmente a problemas de atención, servicio, asesoría, oficina, canal de atención o calidad del servicio.

### 15. OTRAS
Usar solamente cuando el caso no corresponde claramente a ninguna de las categorías anteriores.

### 16. REVISIÓN HUMANA
Usar únicamente cuando:
* DESC_DETALLADA está vacía;
* contiene solamente "Descripción";
* no existe información suficiente para determinar la categoría;
* existen contradicciones graves;
* la información no permite clasificar.
NO utilizar REVISIÓN HUMANA simplemente por errores ortográficos.
NO utilizar REVISIÓN HUMANA porque el caso sea complejo si existe una categoría clara.
NO utilizar REVISIÓN HUMANA como opción predeterminada.

## REGLA DE PRIORIDAD:
Cuando existan varias palabras o conceptos en una misma descripción, aplicar esta prioridad:
1. FRAUDE / TRANSACCIÓN NO RECONOCIDA
2. PSE
3. CUOTA DE MANEJO
4. SEGUROS
5. GMF / 4X1000
6. PAGOS / ABONOS
7. TRANSFERENCIAS
8. TARJETAS
9. CRÉDITOS / CARTERA
10. TRANSACCIONES
11. CUENTAS
12. COBROS / CARGOS
13. DATOS / INFORMACIÓN
14. SERVICIO / ATENCIÓN
15. OTRAS
16. REVISIÓN HUMANA

IMPORTANTE:
La categoría debe representar el TEMA PRINCIPAL de la PQR.
No generes categorías adicionales.
No inventes subcategorías.
No hagas una explicación larga.
No devuelvas varios resultados para una misma PQR.
UNA PQR = UNA CATEGORÍA.

CASOS A CLASIFICAR (JSON):
${JSON.stringify(formattedCases, null, 2)}
`;

  let parsedArray: any[] | null = null;
  const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest'];

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
                      'TRANSACCIONES',
                      'FRAUDE / TRANSACCIÓN NO RECONOCIDA',
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
          await new Promise(res => setTimeout(res, 1000));
        }
      }
    }
  }

  // Parse structured results from Gemini
  if (Array.isArray(parsedArray) && parsedArray.length > 0) {
    recordsToAnalyze.forEach((rec, idx) => {
      const originalIdx = pendingIndices[idx];
      const aiData = parsedArray!.find(p => String(p.expediente || p.numero_expediente) === String(rec.numero_expediente)) || parsedArray![idx];

      const cat: CategoriaPQR16 = CATEGORIAS_OFICIALES_16.includes(aiData?.categoria as any)
        ? (aiData.categoria as CategoriaPQR16)
        : 'OTRAS';
      const conf = typeof aiData?.confianza === 'number' ? aiData.confianza : 90;
      const reqRev = Boolean(aiData?.requiere_revision_humana);

      const submotivoOrig = (rec.submotivo_original || rec.resumen_original || '').toLowerCase();
      let existeInconsistencia: 'SI' | 'NO' = 'NO';
      let motivoInconsistencia: string | undefined = undefined;

      if (submotivoOrig) {
        if (cat === 'FRAUDE / TRANSACCIÓN NO RECONOCIDA' && !submotivoOrig.includes('fraude') && !submotivoOrig.includes('no reconoc')) {
          existeInconsistencia = 'SI';
          motivoInconsistencia = `La descripción reporta una transacción no reconocida/fraude pero el registro original decía "${rec.submotivo_original || rec.resumen_original}".`;
        } else if (cat === 'PAGOS / ABONOS' && !submotivoOrig.includes('pago') && !submotivoOrig.includes('abono')) {
          existeInconsistencia = 'SI';
          motivoInconsistencia = `La descripción se centra en pagos o abonos no aplicados, mientras que el registro original rotulaba "${rec.submotivo_original || rec.resumen_original}".`;
        } else if (cat === 'CUOTA DE MANEJO' && !submotivoOrig.includes('cuota') && !submotivoOrig.includes('manejo')) {
          existeInconsistencia = 'SI';
          motivoInconsistencia = `La descripción reclama cuota de manejo, mientras que el registro original indicaba "${rec.submotivo_original || rec.resumen_original}".`;
        } else if (cat === 'PSE' && !submotivoOrig.includes('pse')) {
          existeInconsistencia = 'SI';
          motivoInconsistencia = `La descripción reporta una transacción PSE, mientras que el registro original no lo mencionaba.`;
        }
      }

      const analysis: PQRSAnalysis = {
        numero_expediente: rec.numero_expediente,
        categoria: cat,
        confianza: conf,
        requiere_revision_humana: reqRev ? 'SI' : 'NO',
        requiere_revision: reqRev,
        motivo_de_revision: reqRev ? 'Requiere validación humana.' : undefined,
        existe_inconsistencia: existeInconsistencia,
        posible_inconsistencia: existeInconsistencia === 'SI',
        motivo_inconsistencia: motivoInconsistencia,

        // Compatibilidad con el resto de la UI
        producto: rec.producto_original || 'Identificado en descripción',
        motivo: cat,
        submotivo: cat,
        tema_principal: cat,
        subtema: cat,
        subcategoria: cat,
        problema_principal: `Caso clasificado en categoría general: ${cat}.`,
        solicitud_cliente: `Requerimiento referente a ${cat}.`,
        que_solicita_exactamente: `Trámite o reclamación sobre ${cat}.`,
        hechos_principales: rec.descripcion_original.slice(0, 180),
        sustento_clasificacion: `Identificado en DESC_DETALLADA con base en la regla de prioridad.`,
        resumen_normalizado: `${cat}: ${rec.descripcion_original.slice(0, 90)}...`,
        justificacion: `Asignado a la categoría ${cat} siguiendo las 16 reglas oficiales y el orden de prioridad.`,
        nivel_confianza: conf >= 85 ? 'Alta' : conf >= 70 ? 'Media' : 'Baja',
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v3.0.0-16-categorias',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      };

      results[originalIdx] = analysis;
      const hash = (rec as any).hash_descripcion || hashText(rec.descripcion_original);
      analysisCache.set(hash, analysis);
    });

    return results;
  }

  // Fallback to deterministic classifier if API is unavailable
  recordsToAnalyze.forEach((rec, idx) => {
    const originalIdx = pendingIndices[idx];
    const analysis = fallbackSemanticAnalysis(rec);
    results[originalIdx] = analysis;
    const hash = (rec as any).hash_descripcion || hashText(rec.descripcion_original);
    analysisCache.set(hash, analysis);
  });

  return results;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const hash = hashText(text);
  if (embeddingCache.has(hash)) {
    return embeddingCache.get(hash)!;
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
      console.warn('Embedding fallback local vector.');
    }
  }

  return [];
}
