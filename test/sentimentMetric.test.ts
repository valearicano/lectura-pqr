import {
  normalizeSentimiento,
  classifySentimentLocal,
  buildPQRSAnalysis,
  classifyPQRDeterministic
} from '../src/services/classifierEngine';
import {
  analyzePQRSBatchWithMetrics,
  clearAnalysisCacheForTests
} from '../server/geminiService';
import { getInitialDemoState } from '../src/services/sampleData';
import { buildExportRow, CANONICAL_ANALYSIS_COLUMNS } from '../src/services/excelService';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function runSuite() {
  console.log('=== PRUEBAS DE MÉTRICA DE SENTIMIENTO (REGLAS LOCALES + IA OPCIONAL) ===');

  // 1. normalizeSentimiento
  assert(normalizeSentimiento('positivo') === 'positivo', 'Normaliza "positivo"');
  assert(normalizeSentimiento('  NEGATIVO ') === 'negativo', 'Normaliza "  NEGATIVO "');
  assert(normalizeSentimiento('Neutro') === 'neutro', 'Normaliza "Neutro"');
  assert(normalizeSentimiento('Positive') === 'positivo', 'Normaliza equivalente "Positive"');
  assert(normalizeSentimiento('negative') === 'negativo', 'Normaliza equivalente "negative"');
  assert(normalizeSentimiento('neutral') === 'neutro', 'Normaliza equivalente "neutral"');
  assert(normalizeSentimiento('desconocido') === undefined, 'Ignora valores fuera de dominio');
  assert(normalizeSentimiento(undefined) === undefined, 'Maneja undefined correctamente');

  // 2. buildPQRSAnalysis preserva sentimiento incluso con validación de consistencia
  const recNeg = {
    numero_expediente: 'SENT-001',
    descripcion_original: 'Me cobraron una cuota de manejo que nunca acepté en mi tarjeta de crédito.'
  };
  const detNeg = classifyPQRDeterministic(recNeg);
  const anaNeg = buildPQRSAnalysis(recNeg, { ...detNeg, sentimiento: 'negativo' });
  assert(anaNeg.sentimiento === 'negativo', 'buildPQRSAnalysis preserva sentimiento negativo');
  assert(anaNeg.modelo_ia === 'gemini-4-hydrogen', 'buildPQRSAnalysis usa modelo gemini-4-hydrogen');

  // 3. Validación de consistencia (ej. corrección a FRAUDES) conserva sentimiento
  const recConsistency = {
    numero_expediente: 'SENT-002',
    descripcion_original: 'No reconozco una compra realizada ayer con mi tarjeta de crédito por $500.000.'
  };
  const anaConsistency = buildPQRSAnalysis(recConsistency, {
    expediente: 'SENT-002',
    categoria_principal: 'TARJETAS',
    subcategoria: 'COMPRAS Y DEVOLUCIONES',
    sentimiento: 'negativo',
    resumen_requerimiento: 'Compra no reconocida',
    intencion_cliente: 'Reversión de compra desconocida',
    confianza: 88,
    requiere_revision_humana: false,
    producto_detectado: 'TARJETA DE CRÉDITO',
    problema_principal: 'Compra no reconocida',
    solicitud_cliente: 'Reversión de compra desconocida',
    evidencia_textual: 'No reconozco una compra'
  });
  assert(
    anaConsistency.categoria_principal === 'FRAUDES' && anaConsistency.sentimiento === 'negativo',
    'validateClassificationConsistency conserva sentimiento al corregir categoría a FRAUDES'
  );

  // 4. Demo state tiene cobertura completa de positivo, neutro y negativo
  const demo = getInitialDemoState();
  const counts = { positivo: 0, neutro: 0, negativo: 0 };
  demo.records.forEach(r => {
    const s = r.analisis?.sentimiento;
    if (s === 'positivo' || s === 'neutro' || s === 'negativo') {
      counts[s]++;
    }
  });
  assert(
    counts.positivo > 0 && counts.neutro > 0 && counts.negativo > 0,
    'getInitialDemoState incluye expedientes positivo, neutro y negativo',
    JSON.stringify(counts)
  );
  assert(
    counts.positivo + counts.neutro + counts.negativo === demo.records.length,
    'Todos los expedientes demo tienen sentimiento definido'
  );

  // 5. Excel export mantiene estrictamente las 9 columnas canónicas
  const exportedRow = buildExportRow(demo.records[0]);
  const exportedKeys = Object.keys(exportedRow);
  assert(
    CANONICAL_ANALYSIS_COLUMNS.every(col => exportedKeys.includes(col)),
    'Excel export conserva las 9 columnas canónicas'
  );
  assert(
    !exportedKeys.includes('SENTIMIENTO') && !exportedKeys.includes('sentimiento'),
    'Excel export no agrega columnas extra que rompan la estructura de 9 columnas'
  );

  // 6. Reglas locales de sentimiento (claros vs dudosos)
  const localPos = classifySentimentLocal(
    'Quiero felicitar a la asesora por su excelente atención y rápida gestión en oficina.'
  );
  assert(
    localPos.sentimiento === 'positivo' && localPos.dudoso === false,
    'classifySentimentLocal detecta caso positivo claro sin marcarlo dudoso',
    JSON.stringify(localPos)
  );

  const localNeg = classifySentimentLocal(
    'No reconozco una compra en mi tarjeta de crédito, exijo reversión por fraude.'
  );
  assert(
    localNeg.sentimiento === 'negativo' && localNeg.dudoso === false,
    'classifySentimentLocal detecta caso negativo claro sin marcarlo dudoso',
    JSON.stringify(localNeg)
  );

  const localNeu = classifySentimentLocal(
    'Solicito certificado de paz y salvo de mi crédito de libre inversión.'
  );
  assert(
    localNeu.sentimiento === 'neutro' && localNeu.dudoso === false,
    'classifySentimentLocal detecta solicitud administrativa neutra clara sin marcarla dudosa',
    JSON.stringify(localNeu)
  );

  const localDoubtful = classifySentimentLocal(
    'Agradezco mucho la excelente atención en la oficina, pero hubo un retraso con mi solicitud de extracto.'
  );
  assert(
    localDoubtful.dudoso === true,
    'classifySentimentLocal marca como dudoso un caso con señales mixtas',
    JSON.stringify(localDoubtful)
  );

  // 7. Integración en analyzePQRSBatchWithMetrics: apagado por defecto (0 llamadas Gemini de sentimiento)
  clearAnalysisCacheForTests();
  const sentimentCallsOff: string[] = [];
  const sampleBatch = [
    {
      numero_expediente: 'OPT-CLEAR-NEG',
      resumen_original: 'Fraude tarjeta',
      descripcion_original: 'No reconozco una compra realizada ayer con mi tarjeta de crédito por $500.000.'
    },
    {
      numero_expediente: 'OPT-CLEAR-NEU',
      resumen_original: 'Certificado',
      descripcion_original: 'Solicito certificado de paz y salvo de mi crédito hipotecario.'
    },
    {
      numero_expediente: 'OPT-DOUBTFUL-MIX',
      resumen_original: 'Extracto con demora',
      descripcion_original: 'Muchas gracias por su amable atención, pero hubo un retraso con mi solicitud de extracto.'
    }
  ];

  const mockGenerateOff = async (params: any) => {
    const promptText = String(params?.contents || '');
    if (promptText.includes('sentimiento emocional del cliente')) {
      sentimentCallsOff.push(promptText);
      return {
        text: JSON.stringify([{ expediente: 'OPT-DOUBTFUL-MIX', sentimiento: 'neutro' }])
      };
    }
    return {
      text: JSON.stringify(
        sampleBatch.map(r => ({ expediente: r.numero_expediente, tipo_caso: 'Solicitud' }))
      )
    };
  };

  const resOff = await analyzePQRSBatchWithMetrics(sampleBatch, undefined, {
    bypassCache: true,
    useAiSentiment: false,
    generateContentFn: mockGenerateOff
  });

  assert(
    sentimentCallsOff.length === 0,
    'Con useAiSentiment=false NO se llama a Gemini para sentimiento',
    `llamadas=${sentimentCallsOff.length}`
  );
  assert(
    resOff.analyses[0].sentimiento === 'negativo' &&
      resOff.analyses[1].sentimiento === 'neutro' &&
      Boolean(resOff.analyses[2].sentimiento),
    'Con useAiSentiment=false todos los expedientes obtienen sentimiento por reglas locales'
  );

  // 8. Con useAiSentiment=true: llama a Gemini SOLO para casos marcados dudosos por reglas locales
  const sentimentPromptReceived: string[] = [];
  const mockGenerateOn = async (params: any) => {
    const promptText = String(params?.contents || '');
    if (promptText.includes('sentimiento emocional del cliente')) {
      sentimentPromptReceived.push(promptText);
      return {
        text: JSON.stringify([{ expediente: 'OPT-DOUBTFUL-MIX', sentimiento: 'positivo' }]),
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, totalTokenCount: 120 }
      };
    }
    return {
      text: JSON.stringify(
        sampleBatch.map(r => ({ expediente: r.numero_expediente, tipo_caso: 'Solicitud' }))
      )
    };
  };

  const resOn = await analyzePQRSBatchWithMetrics(sampleBatch, undefined, {
    bypassCache: true,
    useAiSentiment: true,
    generateContentFn: mockGenerateOn
  });

  assert(
    sentimentPromptReceived.length === 1,
    'Con useAiSentiment=true ejecuta exactamente 1 llamada a Gemini para los dudosos',
    `llamadas=${sentimentPromptReceived.length}`
  );
  assert(
    sentimentPromptReceived[0].includes('OPT-DOUBTFUL-MIX') &&
      !sentimentPromptReceived[0].includes('OPT-CLEAR-NEG') &&
      !sentimentPromptReceived[0].includes('OPT-CLEAR-NEU'),
    'Con useAiSentiment=true envía a Gemini ÚNICAMENTE los expedientes dudosos y omite los claros'
  );
  assert(
    resOn.analyses[0].sentimiento === 'negativo' &&
      resOn.analyses[1].sentimiento === 'neutro' &&
      resOn.analyses[2].sentimiento === 'positivo',
    'Con useAiSentiment=true conserva los claros locales y aplica el resultado de Gemini al caso dudoso'
  );

  // 9. Con useAiSentiment=true pero sin casos dudosos: 0 llamadas Gemini de sentimiento
  let sentimentCallsAllClear = 0;
  await analyzePQRSBatchWithMetrics(sampleBatch.slice(0, 2), undefined, {
    bypassCache: true,
    useAiSentiment: true,
    generateContentFn: async (params: any) => {
      const promptText = String(params?.contents || '');
      if (promptText.includes('sentimiento emocional del cliente')) {
        sentimentCallsAllClear += 1;
        return { text: '[]' };
      }
      return {
        text: JSON.stringify(
          sampleBatch.slice(0, 2).map(r => ({ expediente: r.numero_expediente, tipo_caso: 'Solicitud' }))
        )
      };
    }
  });
  assert(
    sentimentCallsAllClear === 0,
    'Con useAiSentiment=true y 0 casos dudosos NO consume cuota de Gemini para sentimiento'
  );

  console.log(`\nResultado Sentiment Metric Suite: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Error ejecutando Sentiment Metric Suite:', err);
  process.exit(1);
});
