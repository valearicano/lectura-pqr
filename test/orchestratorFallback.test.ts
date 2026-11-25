import assert from 'assert';
import { runPQRSAnalysisPipeline } from '../src/services/analysisOrchestrator';
import { recordRequiresHumanReview } from '../src/services/classifierEngine';
import { buildExportRow } from '../src/services/excelService';
import { EnrichedPQRSRecord } from '../src/types';

function makeRecord(id: string, exp: string, resumen: string, desc: string): EnrichedPQRSRecord {
  return {
    id,
    numero_expediente: exp,
    resumen_original: resumen,
    descripcion_original: desc,
    descripcion_normalizada: desc.toLowerCase(),
    hash_descripcion: `hash_${id}`,
    estado_procesamiento: 'PENDIENTE',
    columnas_adicionales: {
      NO_SS: exp,
      SUBMOTIVO: resumen,
      DESC_DETALLADA: desc
    }
  };
}

async function runOrchestratorFallbackTests(): Promise<void> {
  let passed = 0;
  let failed = 0;

  const check = (label: string, condition: boolean, detail?: string) => {
    if (condition) {
      passed++;
      console.log(`✓ [PASÓ] ${label}`);
    } else {
      failed++;
      console.error(`✗ [FALLÓ] ${label}${detail ? ` -> ${detail}` : ''}`);
    }
  };

  console.log('='.repeat(80));
  console.log('PRUEBAS ORQUESTADOR IRIS – GEMINI CAÍDO (HTML), CIRCUIT BREAKER Y COHERENCIA');
  console.log('='.repeat(80));

  // Silence expected console.error logs during simulated outage while asserting they ARE logged
  const capturedConsoleErrors: unknown[][] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    capturedConsoleErrors.push(args);
  };

  try {
    // =========================================================================
    // TEST 1: All rule-matched cases -> ZERO calls to /api/analyze-batch
    // =========================================================================
    {
      let analyzeBatchCalls = 0;
      const ruleOnlyRecords: EnrichedPQRSRecord[] = [
        makeRecord('r1', 'RULE-001', 'Fraude', 'No reconozco una compra de $900.000 con mi tarjeta de crédito.'),
        makeRecord('r2', 'RULE-002', 'PSE', 'Pagué por PSE y el sistema rechazó la operación pero debitó el saldo.'),
        makeRecord('r3', 'RULE-003', 'GMF', 'Solicito marcación de mi cuenta de ahorros como exenta del 4x1000.'),
        makeRecord('r4', 'RULE-004', 'CDT', 'No puedo visualizar mi CDT en la banca virtual del banco.'),
        makeRecord('r5', 'RULE-005', 'Seguro', 'Me descuentan un seguro de desempleo que nunca autoricé, solicito cancelación y devolución.')
      ];

      const mockFetch = (async (url: string) => {
        if (String(url).includes('/api/analyze-batch')) {
          analyzeBatchCalls++;
        }
        return new Response('<html><body>502 Bad Gateway</body></html>', {
          status: 502,
          headers: { 'content-type': 'text/html; charset=utf-8' }
        });
      }) as unknown as typeof fetch;

      const res = await runPQRSAnalysisPipeline(ruleOnlyRecords, {
        batchSize: 2,
        fetchFn: mockFetch
      });

      check(
        'Test 1a: Casos con regla explícita NO llaman a /api/analyze-batch (0 llamadas)',
        analyzeBatchCalls === 0 && res.geminiBatchCallsAttempted === 0
      );
      check(
        'Test 1b: Casos con regla explícita NO se envían a Revisión humana',
        res.totalRevisionHumana === 0 &&
          res.totalClasificadosAutomaticamente === 5 &&
          res.usedRulesFallback === false
      );
      check(
        'Test 1c: Tipo de caso resuelto localmente (Solicitud/Reclamo) sin llamadas a Gemini',
        res.records.every(r => r.analisis?.tipo_caso === 'Solicitud' || r.analisis?.tipo_caso === 'Reclamo')
      );
    }

    // =========================================================================
    // TEST 2: Gemini down returning HTML page (200 OK text/html + 502 text/html)
    //   - 4 unmatched batches (batchSize = 2 -> 8 unmatched records)
    //   - 4 rule-matched records (must NOT be sent to Gemini nor to human review)
    //   - 1 insufficient-info record (MUST go to human review)
    // =========================================================================
    {
      let analyzeCalls = 0;
      let embeddingsCalls = 0;

      const mixedRecords: EnrichedPQRSRecord[] = [
        // 4 explicit-rule cases (must stay classified automatically, NOT human review)
        makeRecord('m1', 'EXP-01', 'Fraude', 'No reconozco una compra realizada en mi tarjeta débito por $1.200.000.'),
        makeRecord('m2', 'EXP-02', 'Pago', 'Realicé el pago de mi tarjeta de crédito ayer y no se ve reflejado en el saldo.'),
        makeRecord('m3', 'EXP-03', 'GMF', 'Solicito la marcación formal de mi cuenta de ahorros como exenta del 4x1000.'),
        makeRecord('m4', 'EXP-04', 'Cuota manejo', 'Reclamo por cobro duplicado de cuota de manejo en mi tarjeta de crédito.'),
        // 1 insufficient-info case (genuine human review)
        makeRecord('m5', 'EXP-05', 'Caso', 'Revisar caso.'),
        // 8 unmatched cases -> 4 batches of size 2 -> circuit breaker MUST stop after 2 calls!
        makeRecord('u1', 'UNM-01', 'Consulta general', 'Escribo como junta comunal para solicitar patrocinio institucional para nuestro festival barrial anual.'),
        makeRecord('u2', 'UNM-02', 'Consulta general', 'Quisiera presentar una alianza académica cultural con la universidad local para charlas comunitarias.'),
        makeRecord('u3', 'UNM-03', 'Consulta general', 'Deseo proponer un convenio deportivo barrial para eventos de fin de semana con vecinos del sector.'),
        makeRecord('u4', 'UNM-04', 'Consulta general', 'Envío invitación formal para participar en la feria de emprendimiento comunitario del municipio.'),
        makeRecord('u5', 'UNM-05', 'Consulta general', 'Solicito información sobre convocatorias de patrocinio artístico para teatro juvenil independiente.'),
        makeRecord('u6', 'UNM-06', 'Consulta general', 'Busco contacto del área de responsabilidad ambiental para jornada de siembra en el parque.'),
        makeRecord('u7', 'UNM-07', 'Consulta general', 'Quiero remitir una propuesta de voluntariado educativo con colegios públicos de la localidad.'),
        makeRecord('u8', 'UNM-08', 'Consulta general', 'Escribo para consultar cómo postular un proyecto fotográfico cultural en las sedes regionales.')
      ];

      const mockHtmlDownFetch = (async (url: string) => {
        if (String(url).includes('/api/analyze-batch')) {
          analyzeCalls++;
          // Simulate HTML error page even with HTTP 200 on first call and 502 on second call
          return new Response(
            '<!DOCTYPE html><html><head><title>Service Unavailable</title></head><body><h1>502 Bad Gateway</h1></body></html>',
            {
              status: analyzeCalls === 1 ? 200 : 502,
              headers: { 'content-type': 'text/html; charset=utf-8' }
            }
          );
        }
        if (String(url).includes('/api/embeddings-batch')) {
          embeddingsCalls++;
          return new Response('<html><body>Error</body></html>', {
            status: 503,
            headers: { 'content-type': 'text/html' }
          });
        }
        throw new Error(`Unexpected URL: ${url}`);
      }) as unknown as typeof fetch;

      const phases: string[] = [];
      const res = await runPQRSAnalysisPipeline(mixedRecords, {
        batchSize: 2,
        maxConsecutiveGeminiFailures: 2,
        fetchFn: mockHtmlDownFetch,
        onProgress: p => phases.push(p.faseActual)
      });

      check(
        'Test 2a: Proceso termina completo sin excepciones ante respuesta HTML en /api/analyze-batch',
        res.records.length === mixedRecords.length &&
          phases[phases.length - 1] === 'Clasificación completada'
      );
      check(
        'Test 2b: Circuit breaker detiene llamadas tras 2 fallos seguidos (solo 2 intentos en 4 lotes y 0 embeddings)',
        analyzeCalls === 2 && res.geminiBatchCallsAttempted === 2 && embeddingsCalls === 0
      );
      check(
        'Test 2c: Marca usedRulesFallback=true y registra detalle solo en console.error',
        res.usedRulesFallback === true && capturedConsoleErrors.length >= 2
      );

      // Verify rule-classified cases are NOT flooded into human review
      const ruleCases = res.records.slice(0, 4);
      const insufficientCase = res.records[4];
      check(
        'Test 2d: Bandeja de Revisión humana NO se llena con casos clasificados por reglas',
        ruleCases.every(r => !recordRequiresHumanReview(r)) &&
          recordRequiresHumanReview(insufficientCase) === true
      );

      // Verify 100% parity across Resumen, Revisión humana, UploadView summary, and Excel REQUIERE REVISIÓN
      const dashboardCount = res.records.filter(r => recordRequiresHumanReview(r)).length;
      const trayCount = res.records.filter(r => recordRequiresHumanReview(r)).length;
      const exportRows = res.records.map(r => buildExportRow(r));
      const excelSiCount = exportRows.filter(row => row['REQUIERE REVISIÓN'] === 'SI').length;

      check(
        'Test 2e: Conteo de Revisión humana coincide 100% entre Resumen, Bandeja, Panel final y Excel',
        dashboardCount === trayCount &&
          dashboardCount === res.totalRevisionHumana &&
          dashboardCount === excelSiCount &&
          res.totalClasificadosAutomaticamente + res.totalRevisionHumana === res.records.length
      );

      // Verify NO technical error messages appear in any record analysis or Excel export row
      const serializedExport = JSON.stringify(exportRows);
      const hasTechErrorLeak =
        /502|Bad Gateway|text\/html|content-type|JSON|Gemini|RESOURCE_EXHAUSTED|<!DOCTYPE/i.test(serializedExport);
      check(
        'Test 2f: Ningún mensaje técnico de error aparece en las columnas del Excel',
        !hasTechErrorLeak
      );

      // Verify undecided tipo_caso exports as 'Pendiente'
      const insufficientRow = buildExportRow(insufficientCase);
      check(
        'Test 2g: Caso sin tipo_caso decidido exporta "Pendiente" y REQUIERE REVISIÓN = "SI"',
        insufficientRow['Tipo de caso'] === 'Pendiente' && insufficientRow['REQUIERE REVISIÓN'] === 'SI'
      );

      // Verify approving in Revisión humana clears Excel REQUIERE REVISIÓN immediately
      const approvedRecord: EnrichedPQRSRecord = {
        ...insufficientCase,
        analisis: {
          ...insufficientCase.analisis!,
          requiere_revision: false,
          requiere_revision_humana: 'NO',
          estado_revision: 'APROBADO'
        }
      };
      check(
        'Test 2h: Tras aprobar en Revisión humana, shared helper y Excel coinciden en NO',
        !recordRequiresHumanReview(approvedRecord) &&
          buildExportRow(approvedRecord)['REQUIERE REVISIÓN'] === 'NO'
      );
    }
  } finally {
    console.error = originalConsoleError;
  }

  console.log('-'.repeat(80));
  console.log(`RESULTADO ORQUESTADOR FALLBACK: ${passed}/${passed + failed} pruebas pasadas (${failed} fallidas)`);
  console.log('='.repeat(80));

  assert.strictEqual(failed, 0, `${failed} pruebas del orquestador fallaron.`);
}

runOrchestratorFallbackTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
