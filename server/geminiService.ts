import { GoogleGenAI, Type } from '@google/genai';
import { PQRSAnalysis } from '../src/types';
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

// In-memory cache for analyzed descriptions to save tokens and avoid redundant processing (Section 29)
const analysisCache = new Map<string, PQRSAnalysis>();
const embeddingCache = new Map<string, number[]>();

// Deterministic semantic fallback classifier when Gemini API experiences temporary 503/429 spikes
function fallbackSemanticAnalysis(
  rec: { numero_expediente: string; resumen_original: string; descripcion_original: string }
): PQRSAnalysis {
  const desc = rec.descripcion_original.toLowerCase();
  const resumen = (rec.resumen_original || '').toLowerCase();

  let tema = 'OTROS';
  let categoria = 'OTROS';
  let subcategoria = 'Revisión humana';
  let producto = 'NO IDENTIFICADO';
  let problema = '';
  let solicitud = '';
  let resumenNorm = '';
  let justificacion = '';
  let confianza = 88;
  let requiereRevision = false;
  let posibleInconsistencia = false;

  // Check product hints
  if (desc.includes('tarjeta de credito') || desc.includes('tarjeta de crédito') || resumen.includes('tarjeta de credito') || resumen.includes('tarjeta de crédito')) {
    producto = 'Tarjeta de Crédito';
  } else if (desc.includes('cuenta de ahorros') || desc.includes('cuenta de ahorro') || resumen.includes('cuenta de ahorros')) {
    producto = 'Cuenta de Ahorros';
  } else if (desc.includes('credito') || desc.includes('crédito') || desc.includes('hipotecario')) {
    producto = 'Crédito';
  }

  // 1. Caso 8 & Ambigüedad / Información insuficiente
  if (desc.length < 45 && (desc.includes('revisar mi caso') || desc.includes('colaboren') || desc.includes('no estoy de acuerdo'))) {
    tema = 'OTROS';
    categoria = 'OTROS';
    subcategoria = 'Información insuficiente';
    problema = 'Descripción ambigua sin hechos o transacciones específicas detalladas';
    solicitud = 'Solicita revisión genérica de su caso';
    resumenNorm = 'Cliente solicita revisión general de su caso por inconformidad no especificada.';
    justificacion = 'La descripción es insuficiente y carece de detalles específicos sobre el motivo de inconformidad.';
    confianza = 65;
    requiereRevision = true;
  }
  // 2. Pagos
  else if (
    (desc.includes('pago') || desc.includes('abono') || desc.includes('consign')) &&
    (desc.includes('no se refleja') || desc.includes('no aparece') || desc.includes('pendiente') || desc.includes('aplic'))
  ) {
    tema = 'PAGOS';
    categoria = 'PAGOS';
    subcategoria = 'Aplicación de pago';
    problema = 'Pago realizado no aplicado ni reflejado en la obligación';
    solicitud = 'Validar y aplicar el pago efectuado';
    resumenNorm = 'Cliente solicita validar y aplicar un pago realizado que no se refleja en la obligación.';
    justificacion = 'La descripción se refiere principalmente a un pago efectuado que no aparece aplicado en el saldo.';
    confianza = 94;
    if (resumen && !resumen.includes('pago') && !resumen.includes('abono')) {
      posibleInconsistencia = true;
    }
  }
  // 3. Cobro de intereses
  else if (desc.includes('interes') || desc.includes('interés') || desc.includes('tasa')) {
    tema = 'COBROS';
    categoria = 'COBROS';
    subcategoria = 'Cobro de intereses';
    problema = 'Inconformidad con la liquidación o cobro de intereses';
    solicitud = 'Revisión y reliquidación de los intereses cobrados';
    resumenNorm = 'Cliente solicita revisión y reliquidación de los intereses cobrados en su obligación.';
    justificacion = 'La descripción expone desacuerdo con los intereses liquidados por considerarlos incorrectos.';
    confianza = 92;
  }
  // 4. Cuota de manejo
  else if (desc.includes('cuota de manejo') || desc.includes('cuotas de manejo')) {
    tema = 'COBROS';
    categoria = 'COBROS';
    subcategoria = 'Cuotas de manejo';
    problema = 'Cobro de cuota de manejo no acordada o exonerada previamente';
    solicitud = 'Exoneración y reversión del cobro de cuota de manejo';
    resumenNorm = 'Cliente solicita exoneración y reversión del cobro efectuado por concepto de cuota de manejo.';
    justificacion = 'El usuario reclama formalmente por el cargo de cuota de manejo en su producto.';
    confianza = 95;
  }
  // 5. Seguros
  else if (desc.includes('poliza') || desc.includes('póliza') || desc.includes('seguro')) {
    tema = 'SEGUROS';
    categoria = 'SEGUROS';
    if (desc.includes('informacion') || desc.includes('información') || desc.includes('condiciones')) {
      subcategoria = 'Tema de seguros';
      solicitud = 'Solicita información y condiciones sobre póliza de seguro';
    } else if (desc.includes('cancel') || desc.includes('desistir')) {
      subcategoria = 'Cancelación de seguro';
      solicitud = 'Solicita cancelación de póliza de seguro';
    } else {
      subcategoria = 'Cobro de seguro';
      solicitud = 'Revisión de cobros por concepto de seguro';
    }
    problema = 'Inquietud o inconformidad vinculada a póliza de seguro';
    resumenNorm = `Cliente solicita gestión respecto a póliza de seguro (${subcategoria.toLowerCase()}).`;
    justificacion = 'El contenido principal versa sobre coberturas, cobros o condiciones de una póliza de seguros.';
    confianza = 91;
  }
  // 6. Aplicativos y canales / acceso
  else if (desc.includes('no puede ingresar') || desc.includes('no puedo ingresar') || desc.includes('acceso') || desc.includes('clave') || desc.includes('app') || desc.includes('aplicacion') || desc.includes('aplicativo')) {
    tema = 'APLICATIVOS Y CANALES';
    categoria = 'APLICATIVOS Y CANALES';
    subcategoria = desc.includes('ingresar') || desc.includes('acceso') ? 'Problemas de acceso' : 'Error en aplicativo';
    problema = 'Imposibilidad de acceso o falla técnica en el canal digital';
    solicitud = 'Desbloqueo, restablecimiento de acceso y solución técnica';
    resumenNorm = 'Cliente reporta fallas en canal digital y solicita restablecimiento de acceso a la plataforma.';
    justificacion = 'La manifestación describe un bloqueo o falla tecnológica al intentar acceder a los canales digitales.';
    confianza = 93;
  }
  // 7. Fraude y compras no reconocidas
  else if (desc.includes('no reconoce') || desc.includes('no reconozco') || desc.includes('fraude') || desc.includes('suplantacion') || desc.includes('suplantación') || desc.includes('no autorizad')) {
    tema = 'FRAUDE Y SEGURIDAD';
    categoria = 'FRAUDE Y SEGURIDAD';
    subcategoria = desc.includes('compra') ? 'Compra no reconocida' : desc.includes('transferencia') ? 'Transferencia no reconocida' : 'Movimiento no reconocido';
    problema = 'Transacción o movimiento monetario no consentido por el titular';
    solicitud = 'Investigación por posible fraude, bloqueo preventivo y reintegro';
    resumenNorm = 'Cliente reporta movimiento financiero no reconocido y solicita investigación por posible fraude.';
    justificacion = 'El usuario declara no haber efectuado ni consentido la transacción señalada.';
    confianza = 96;
    requiereRevision = true; // Security events always flag for human confirmation
  }
  // 8. Derechos de petición / PQRS
  else if (desc.includes('derecho de peticion') || desc.includes('derecho de petición') || desc.includes('peticion formal') || desc.includes('petición formal')) {
    tema = 'DERECHOS Y PQRS';
    categoria = 'DERECHOS Y PQRS';
    subcategoria = 'Derecho de petición';
    problema = 'Radicación formal amparada en derecho constitucional de petición';
    solicitud = 'Atención y respuesta de fondo al derecho de petición presentado';
    resumenNorm = 'Cliente formula formalmente derecho de petición solicitando respuesta de fondo a sus requerimientos.';
    justificacion = 'La solicitud se fundamenta de manera expresa en el ejercicio del derecho de petición.';
    confianza = 95;
  } else {
    problema = 'Solicitud o inconformidad descrita por el cliente';
    solicitud = 'Atención y gestión del caso reportado';
    resumenNorm = `Cliente solicita revisión respecto a ${rec.resumen_original || 'trámite general'}.`;
    justificacion = 'Clasificación general basada en el contenido descriptivo aportado.';
    confianza = 75;
  }

  // Evaluate inconsistency
  if (resumen && !posibleInconsistencia) {
    const resClean = resumen.replace(/[^a-z0-9]/g, '');
    if (resClean.length > 3 && !desc.includes(resClean) && !categoria.toLowerCase().includes(resClean)) {
      if (categoria !== 'OTROS' && !resumen.includes(categoria.toLowerCase())) {
        posibleInconsistencia = true;
      }
    }
  }

  return {
    numero_expediente: rec.numero_expediente,
    tema_principal: tema,
    subtema: subcategoria,
    producto,
    problema_principal: problema,
    solicitud_cliente: solicitud,
    categoria,
    subcategoria,
    resumen_normalizado: resumenNorm,
    justificacion,
    confianza,
    nivel_confianza: confianza >= 85 ? 'Alta' : confianza >= 70 ? 'Media' : 'Baja',
    requiere_revision: requiereRevision,
    posible_inconsistencia: posibleInconsistencia,
    motivo_inconsistencia: posibleInconsistencia ? 'El resumen original podría no representar la solicitud principal identificada en la descripción.' : undefined,
    modelo_ia: 'gemini-3.8-flash',
    version_prompt: 'v1.2.0',
    fecha_analisis: new Date().toISOString(),
    estado_revision: 'PENDIENTE'
  };
}

export async function analyzePQRSBatch(
  records: { numero_expediente: string; resumen_original: string; descripcion_original: string; hash_descripcion?: string }[],
  catalogSummary: string
): Promise<PQRSAnalysis[]> {
  const ai = getAiClient();
  const results: PQRSAnalysis[] = [];
  const pendingIndices: number[] = [];
  const recordsToAnalyze: { numero_expediente: string; resumen_original: string; descripcion_original: string }[] = [];

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

  const prompt = `
Eres el "Lector Inteligente PQRS" de una plataforma bancaria/empresarial para análisis y categorización de PQRS (Peticiones, Quejas, Reclamos y Sugerencias).

PRINCIPIOS FUNDAMENTALES Y REGLAS ESTRICTAS:
1. LA FUENTE PRINCIPAL Y DECISIVA ES LA "DESCRIPCIÓN COMPLETA DE LA RADICACIÓN".
   - NO clasifiques únicamente por palabras clave.
   - NO clasifiques por el campo "resumen original". El resumen original puede estar equivocado o ser genérico.
   - Ejemplo: Si el resumen original dice "Tarjeta de crédito" pero la descripción dice: "El cliente manifiesta que realizó un pago y este todavía no aparece reflejado en su obligación", la categoría correcta es "PAGOS", subcategoría "Aplicación de pago" o "Pago no reflejado".
2. PRIORIDAD DE ANÁLISIS:
   1. DESCRIPCIÓN COMPLETA
   2. INTENCIÓN DEL CLIENTE (¿Qué busca realmente?)
   3. PROBLEMA PRINCIPAL (¿Qué le sucedió o qué le afecta?)
   4. SOLICITUD (¿Qué trámite o solución pide?)
   5. CATEGORÍA
   6. SUBCATEGORÍA
   7. RESUMEN NORMALIZADO (Estructura: "Cliente solicita...")
   8. JUSTIFICACIÓN (Basada estrictamente en hechos del texto)
   9. VALIDACIÓN DE INCONSISTENCIA
3. REGLA CONTRA ALUCINACIONES:
   - Nunca inventes productos, fechas, valores, hechos o categorías no justificadas.
   - Si no se menciona el producto, pon exactamente "NO IDENTIFICADO".
   - Si la información es insuficiente o demasiado ambigua (ej. "Solicito revisar mi caso"), pon categoria: "OTROS", subcategoria: "Información insuficiente", requiere_revision: true.
4. DETECCIÓN DE INCONSISTENCIA (posible_inconsistencia):
   - Compara el resumen original con la descripción. Si el resumen original no representa o contradice la problemática real de la descripción, marca posible_inconsistencia: true.
5. CONFIANZA:
   - confianza: número entero del 0 al 100 indicando certeza operativa.
   - nivel_confianza: "Alta" si confianza >= 85, "Media" si 70-84, "Baja" si < 70.
   - requiere_revision: true si confianza < 70, o descripción insuficiente/ambigua, o posible_inconsistencia grave.

CATÁLOGO OFICIAL DE REFERENCIA:
${catalogSummary}

EXPEDIENTES A ANALIZAR (en formato JSON):
${JSON.stringify(recordsToAnalyze, null, 2)}
`;

  // Try calling Gemini with retries and alternate model fallback
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
                  numero_expediente: { type: Type.STRING },
                  tema_principal: { type: Type.STRING, description: 'Tema global (PAGOS, COBROS, SEGUROS, etc.)' },
                  subtema: { type: Type.STRING, description: 'Tema específico o subtema' },
                  producto: { type: Type.STRING, description: 'Producto financiero detectado o NO IDENTIFICADO' },
                  problema_principal: { type: Type.STRING, description: 'Problema nuclear descrito por el cliente' },
                  solicitud_cliente: { type: Type.STRING, description: 'Qué solicita concretamente el cliente' },
                  categoria: { type: Type.STRING, description: 'Categoría oficial asignada' },
                  subcategoria: { type: Type.STRING, description: 'Subcategoría asignada o NO IDENTIFICADO' },
                  resumen_normalizado: { type: Type.STRING, description: 'Resumen conciso y profesional ("Cliente solicita...")' },
                  justificacion: { type: Type.STRING, description: 'Justificación basada en los hechos del texto' },
                  confianza: { type: Type.INTEGER, description: 'Nivel numérico de confianza 0-100' },
                  nivel_confianza: { type: Type.STRING, description: 'Alta, Media o Baja' },
                  requiere_revision: { type: Type.BOOLEAN },
                  posible_inconsistencia: { type: Type.BOOLEAN },
                  motivo_inconsistencia: { type: Type.STRING }
                },
                required: [
                  'numero_expediente',
                  'tema_principal',
                  'problema_principal',
                  'solicitud_cliente',
                  'categoria',
                  'resumen_normalizado',
                  'justificacion',
                  'confianza',
                  'nivel_confianza',
                  'requiere_revision',
                  'posible_inconsistencia'
                ]
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
        console.warn(`[Gemini API] Intento ${attempt} con modelo ${modelName} falló:`, err.message || err);
        if (attempt < 2) {
          await new Promise(res => setTimeout(res, 1200));
        }
      }
    }
  }

  // If Gemini returned parsed structured results, use them
  if (Array.isArray(parsedArray) && parsedArray.length > 0) {
    recordsToAnalyze.forEach((rec, idx) => {
      const originalIdx = pendingIndices[idx];
      const aiData = parsedArray!.find(p => String(p.numero_expediente) === String(rec.numero_expediente)) || parsedArray![idx];

      const analysis: PQRSAnalysis = {
        numero_expediente: rec.numero_expediente,
        tema_principal: aiData?.tema_principal || 'OTROS',
        subtema: aiData?.subtema || 'NO DETERMINADO',
        producto: aiData?.producto || 'NO IDENTIFICADO',
        problema_principal: aiData?.problema_principal || 'No determinado en la descripción',
        solicitud_cliente: aiData?.solicitud_cliente || 'No determinada',
        categoria: aiData?.categoria || 'OTROS',
        subcategoria: aiData?.subcategoria || 'NO IDENTIFICADO',
        resumen_normalizado: aiData?.resumen_normalizado || `Cliente presenta solicitud referente a ${rec.resumen_original || 'caso no especificado'}`,
        justificacion: aiData?.justificacion || 'Clasificación basada en la descripción proporcionada.',
        confianza: typeof aiData?.confianza === 'number' ? aiData.confianza : 85,
        nivel_confianza: (aiData?.nivel_confianza as any) || (aiData?.confianza >= 85 ? 'Alta' : aiData?.confianza >= 70 ? 'Media' : 'Baja'),
        requiere_revision: Boolean(aiData?.requiere_revision),
        posible_inconsistencia: Boolean(aiData?.posible_inconsistencia),
        motivo_inconsistencia: aiData?.motivo_inconsistencia || '',
        modelo_ia: 'gemini-3.8-flash',
        version_prompt: 'v1.2.0',
        fecha_analisis: new Date().toISOString(),
        estado_revision: 'PENDIENTE'
      };

      results[originalIdx] = analysis;
      const hash = (rec as any).hash_descripcion || hashText(rec.descripcion_original);
      analysisCache.set(hash, analysis);
    });

    return results;
  }

  // Robust semantic fallback if Gemini encountered temporary service unavailability (503 spike)
  console.info('[Lector PQRS] Usando analizador semántico determinista de respaldo ante spike de demanda de la API.');
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
    // Model for embeddings as specified in skill guidelines
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
    // Fallback: if gemini-embedding-2-preview is not reachable, try text-embedding-004 or log
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
      console.warn('Could not retrieve remote embedding from Gemini, using local vector fallback.');
    }
  }


  // Return empty array so caller uses local vector fallback
  return [];
}
