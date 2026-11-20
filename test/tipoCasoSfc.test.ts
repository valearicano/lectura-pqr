import assert from 'assert';
import {
  buildPQRSAnalysis,
  classifyPQRDeterministic,
  inferTipoCasoSFC,
  normalizeTipoCaso
} from '../src/services/classifierEngine';
import { buildExportRow } from '../src/services/excelService';
import { getInitialDemoState } from '../src/services/sampleData';

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${err?.message || err}`);
    failed++;
  }
}

console.log('\n=== PRUEBAS TIPO DE CASO (SUPERINTENDENCIA FINANCIERA) ===\n');

runTest('normalizeTipoCaso acepta variantes de Solicitud y Reclamo', () => {
  assert.strictEqual(normalizeTipoCaso('Solicitud'), 'Solicitud');
  assert.strictEqual(normalizeTipoCaso('solicitudes'), 'Solicitud');
  assert.strictEqual(normalizeTipoCaso('RECLAMO'), 'Reclamo');
  assert.strictEqual(normalizeTipoCaso('reclamos'), 'Reclamo');
  assert.strictEqual(normalizeTipoCaso('REVISION_HUMANA'), undefined);
});

runTest('Certificado / paz y salvo -> Solicitud (ajuste no monetario)', () => {
  const rec = {
    numero_expediente: 'SFC-001',
    descripcion_original: 'Solicito certificado de paz y salvo y copia del contrato de mi crédito hipotecario.'
  };
  const analysis = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.strictEqual(analysis.tipo_caso, 'Solicitud');
});

runTest('Inconvenientes con canales digitales -> Solicitud', () => {
  const rec = {
    numero_expediente: 'SFC-002',
    descripcion_original: 'No puedo ingresar a la app móvil porque el token digital arroja error de autenticación.'
  };
  const analysis = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.strictEqual(analysis.tipo_caso, 'Solicitud');
});

runTest('Cuota de manejo por reconocimiento comercial / exoneración -> Solicitud', () => {
  const rec = {
    numero_expediente: 'SFC-003',
    descripcion_original: 'Solicito validar la exoneración comercial de cuota de manejo que me ofrecieron al abrir mi tarjeta de crédito.'
  };
  const analysis = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.strictEqual(analysis.tipo_caso, 'Solicitud');
});

runTest('Reaplicación de pagos / diferidos de compras -> Solicitud', () => {
  const rec = {
    numero_expediente: 'SFC-004',
    descripcion_original: 'Solicito la reaplicación de un pago extraordinario a capital en mi crédito de libre inversión.'
  };
  const analysis = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.strictEqual(analysis.tipo_caso, 'Solicitud');
});

runTest('Cobro doble / descuento indebido -> Reclamo (ajuste monetario)', () => {
  const rec = {
    numero_expediente: 'SFC-005',
    descripcion_original: 'Me hicieron un cobro doble y descuento indebido en la cuota de mi crédito, solicito devolución inmediata del dinero.'
  };
  const analysis = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.strictEqual(analysis.tipo_caso, 'Reclamo');
});

runTest('Ajuste a cuenta y día (GT5) -> Reclamo', () => {
  const rec = {
    numero_expediente: 'SFC-006',
    descripcion_original: 'Reclamo por cargo cuenta día GT5 aplicado sin justificación en mi cuenta de ahorros.'
  };
  const analysis = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.strictEqual(analysis.tipo_caso, 'Reclamo');
});

runTest('Caso ambiguo o en Revisión humana NO se fuerza a Solicitud ni Reclamo', () => {
  const rec = {
    numero_expediente: 'SFC-007',
    descripcion_original: 'Revisar mi caso por favor.'
  };
  const analysis = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.strictEqual(analysis.requiere_revision, true);
  assert.strictEqual(analysis.tipo_caso, undefined);
});

runTest('Expedientes demo ya analizados sin tipo_caso se clasifican automáticamente y se exportan en Excel', () => {
  const { records } = getInitialDemoState();
  let solicitudes = 0;
  let reclamos = 0;
  for (const r of records) {
    const tipo = r.analisis ? inferTipoCasoSFC(r, r.analisis) : undefined;
    if (tipo === 'Solicitud') solicitudes++;
    if (tipo === 'Reclamo') reclamos++;
    const row = buildExportRow(r);
    assert.ok('Tipo de caso' in row, 'El Excel debe incluir la columna Tipo de caso');
    if (tipo) {
      assert.strictEqual(row['Tipo de caso'], tipo);
    }
  }
  assert.ok(solicitudes > 0 && reclamos > 0, `Debe haber solicitudes (${solicitudes}) y reclamos (${reclamos})`);
});

console.log(`\nResumen Tipo de caso SFC: ${passed} pasaron, ${failed} fallaron.`);
if (failed > 0) {
  process.exit(1);
}
