import assert from 'node:assert/strict';
import {
  buildPQRSAnalysis,
  classifyPQRDeterministic,
  validateClassificationConsistency
} from '../src/services/classifierEngine.ts';
import { validateCatalogPair } from '../src/services/catalog.ts';

function makeRecord(id: string, descripcion: string, producto = '') {
  return {
    numero_expediente: id,
    descripcion_original: descripcion,
    producto_original: producto,
    resumen_original: '',
    submotivo_original: ''
  };
}

function classify(id: string, descripcion: string, producto = '') {
  const rec = makeRecord(id, descripcion, producto);
  const raw = classifyPQRDeterministic(rec);
  const analysis = buildPQRSAnalysis(rec, raw);
  const validPair = validateCatalogPair(analysis.categoria_principal || '', analysis.subcategoria || '');
  assert.equal(
    validPair.valid,
    true,
    `[${id}] debe devolver una combinación válida del catálogo vigente, obtuvo: ${analysis.categoria_principal} > ${analysis.subcategoria}`
  );
  return analysis;
}

console.log('=== PRUEBAS REGLA CRÉDITO/CARTERA VS. TARJETA DE CRÉDITO (TC) Y REVERSIÓN ===');

// ---------------------------------------------------------------------------
// 1. REGLA DE PROTECCIÓN PARA TARJETA DE CRÉDITO (NUNCA CRÉDITOS / CARTERA)
// ---------------------------------------------------------------------------
const tcCases = [
  {
    id: 'TC-001',
    desc: 'Pagué mi tarjeta de crédito y no veo reflejado el pago',
    expectedCat: 'PAGOS / ABONOS',
    expectedSub: 'APLICACIÓN DE PAGO'
  },
  {
    id: 'TC-002',
    desc: 'Me cobraron dos veces el pago de mi tarjeta',
    expectedCat: 'PAGOS / ABONOS',
    expectedSub: 'APLICACIÓN DE PAGO'
  },
  {
    id: 'TC-003',
    desc: 'Solicito reversar un pago realizado a mi tarjeta de crédito',
    expectedCat: 'PAGOS / ABONOS',
    expectedSub: 'APLICACIÓN DE PAGO'
  },
  {
    id: 'TC-004',
    desc: 'No estoy de acuerdo con los intereses cobrados en mi tarjeta',
    expectedCat: 'COMISIONES Y COBROS',
    expectedSub: 'INTERESES'
  },
  {
    id: 'TC-005',
    desc: 'Solicito devolución de un cobro realizado a mi tarjeta',
    expectedCat: 'TARJETAS',
    expectedSub: 'COMPRAS Y DEVOLUCIONES'
  },
  {
    id: 'TC-006',
    desc: 'Hice un pago duplicado a mi TC y solicito el reintegro del dinero',
    expectedCat: 'PAGOS / ABONOS',
    expectedSub: 'APLICACIÓN DE PAGO'
  },
  {
    id: 'TC-007',
    desc: 'Solicito devolución de una compra con tarjeta de crédito realizada en comercio',
    expectedCat: 'TARJETAS',
    expectedSub: 'COMPRAS Y DEVOLUCIONES'
  },
  {
    id: 'TC-008',
    desc: 'No reconozco una compra realizada en mi TC por valor de $500.000',
    expectedCat: 'FRAUDES',
    expectedSub: 'OPERACIÓN NO RECONOCIDA'
  }
];

for (const tc of tcCases) {
  const res = classify(tc.id, tc.desc);
  assert.notEqual(
    res.categoria_principal,
    'CRÉDITOS / CARTERA',
    `[${tc.id}] PROHIBIDO clasificar tarjeta de crédito en CRÉDITOS / CARTERA (obtuvo ${res.categoria_principal} > ${res.subcategoria})`
  );
  assert.equal(
    res.producto_detectado,
    'TARJETA DE CRÉDITO',
    `[${tc.id}] producto_detectado esperado TARJETA DE CRÉDITO, obtuvo: ${res.producto_detectado}`
  );
  assert.equal(
    res.categoria_principal,
    tc.expectedCat,
    `[${tc.id}] categoria_principal esperada ${tc.expectedCat}, obtuvo: ${res.categoria_principal}`
  );
  assert.equal(
    res.subcategoria,
    tc.expectedSub,
    `[${tc.id}] subcategoria esperada ${tc.expectedSub}, obtuvo: ${res.subcategoria}`
  );
  console.log(`  [PASS] ${tc.id}: ${res.categoria_principal} > ${res.subcategoria} (${res.producto_detectado})`);
}

// ---------------------------------------------------------------------------
// 2. CASOS VÁLIDOS DE CRÉDITOS / CARTERA > REVERSIÓN
// ---------------------------------------------------------------------------
const validReversionCases = [
  {
    id: 'REV-OK-001',
    desc: 'Realicé un pago a mi crédito de vivienda por error y necesito que sea reversado',
    expectedProd: 'CRÉDITO DE VIVIENDA'
  },
  {
    id: 'REV-OK-002',
    desc: 'Solicito la devolución del pago que ingresó a mi crédito de consumo',
    expectedProd: 'CRÉDITO DE CONSUMO'
  },
  {
    id: 'REV-OK-003',
    desc: 'Deseo anular el abono realizado a mi leasing',
    expectedProd: 'LEASING'
  },
  {
    id: 'REV-OK-004',
    desc: 'Necesito que el dinero del pago de mi crédito vuelva a mi cuenta',
    expectedProd: 'CRÉDITO / CARTERA'
  },
  {
    id: 'REV-OK-005',
    desc: 'Realicé un abono a mi obligación y solicito que se reversen los recursos',
    expectedProd: 'CRÉDITO / CARTERA'
  }
];

for (const c of validReversionCases) {
  const res = classify(c.id, c.desc);
  assert.equal(
    res.categoria_principal,
    'CRÉDITOS / CARTERA',
    `[${c.id}] esperado CRÉDITOS / CARTERA, obtuvo: ${res.categoria_principal}`
  );
  assert.equal(
    res.subcategoria,
    'REVERSIÓN',
    `[${c.id}] esperado REVERSIÓN, obtuvo: ${res.subcategoria}`
  );
  assert.equal(
    res.producto_detectado,
    c.expectedProd,
    `[${c.id}] producto esperado ${c.expectedProd}, obtuvo: ${res.producto_detectado}`
  );
  console.log(`  [PASS] ${c.id}: ${res.categoria_principal} > ${res.subcategoria} (${res.producto_detectado})`);
}

// ---------------------------------------------------------------------------
// 3. CASOS PROHIBIDOS EN CRÉDITOS / CARTERA > REVERSIÓN
// ---------------------------------------------------------------------------
const forbiddenReversionCases = [
  {
    id: 'REV-NO-001',
    desc: 'Hice un pago a mi crédito de vivienda pero todavía no aparece aplicado en el saldo',
    expectedCat: 'PAGOS / ABONOS',
    expectedSub: 'APLICACIÓN DE PAGO'
  },
  {
    id: 'REV-NO-002',
    desc: 'Necesito rastrear un pago de mi crédito de consumo y validar dónde quedó aplicado',
    expectedCat: 'PAGOS / ABONOS',
    expectedSub: 'APLICACIÓN DE PAGO'
  },
  {
    id: 'REV-NO-003',
    desc: 'Solicito trasladar un pago de mi crédito de consumo a mi crédito de vivienda',
    expectedCat: 'CRÉDITOS / CARTERA',
    expectedSub: 'REAPLICACIONES'
  },
  {
    id: 'REV-NO-004',
    desc: 'Reporto un pago duplicado en mi crédito de consumo realizado el lunes',
    expectedCat: 'PAGOS / ABONOS',
    expectedSub: 'APLICACIÓN DE PAGO'
  },
  {
    id: 'REV-NO-005',
    desc: 'Solicito corregir la aplicación de un pago en mi crédito de vivienda para abono a capital',
    expectedCat: 'CRÉDITOS / CARTERA',
    expectedSub: 'REAPLICACIONES'
  },
  {
    id: 'REV-NO-006',
    desc: 'Solicito reliquidación y aclaración de saldo de mi crédito de vivienda por un error en el ajuste',
    expectedCat: 'CRÉDITOS / CARTERA',
    expectedSub: 'ESTADO DE OBLIGACIÓN / SALDOS'
  },
  {
    id: 'REV-NO-007',
    desc: 'Solicito histórico de pagos realizados a mi crédito de libranza',
    expectedCat: 'CRÉDITOS / CARTERA',
    expectedSub: 'HISTÓRICO DE PAGO'
  },
  {
    id: 'REV-NO-008',
    desc: 'Solicito ajuste de saldo por un error en mi crédito de consumo',
    expectedCat: 'CRÉDITOS / CARTERA',
    expectedSub: 'ESTADO DE OBLIGACIÓN / SALDOS'
  }
];

for (const c of forbiddenReversionCases) {
  const res = classify(c.id, c.desc);
  assert.notEqual(
    `${res.categoria_principal} > ${res.subcategoria}`,
    'CRÉDITOS / CARTERA > REVERSIÓN',
    `[${c.id}] PROHIBIDO clasificar como CRÉDITOS / CARTERA > REVERSIÓN`
  );
  assert.equal(
    res.categoria_principal,
    c.expectedCat,
    `[${c.id}] categoria esperada ${c.expectedCat}, obtuvo: ${res.categoria_principal}`
  );
  assert.equal(
    res.subcategoria,
    c.expectedSub,
    `[${c.id}] subcategoria esperada ${c.expectedSub}, obtuvo: ${res.subcategoria}`
  );
  console.log(`  [PASS] ${c.id}: ${res.categoria_principal} > ${res.subcategoria}`);
}

// ---------------------------------------------------------------------------
// 4. VALIDACIÓN FINAL DE CONSISTENCIA (GUARD CONTRA RESULTADOS ERRÓNEOS DE IA)
// ---------------------------------------------------------------------------
{
  const rec = makeRecord('GUARD-TC-001', 'Solicito reversar un pago realizado a mi tarjeta de crédito');
  const badAiOutput = {
    expediente: 'GUARD-TC-001',
    categoria_principal: 'CRÉDITOS / CARTERA',
    subcategoria: 'REVERSIÓN',
    resumen_requerimiento: 'Reversión de pago',
    intencion_cliente: 'Reversión',
    confianza: 92,
    requiere_revision_humana: false,
    producto_detectado: 'CRÉDITO / CARTERA',
    problema_principal: 'Pago en tarjeta',
    solicitud_cliente: 'Reversar pago',
    evidencia_textual: 'reversar un pago realizado a mi tarjeta de crédito'
  };
  const guarded = validateClassificationConsistency(rec, badAiOutput);
  assert.notEqual(guarded.categoria_principal, 'CRÉDITOS / CARTERA', '[GUARD-TC-001] debe bloquear CRÉDITOS / CARTERA para TC');
  assert.equal(guarded.producto_detectado, 'TARJETA DE CRÉDITO', '[GUARD-TC-001] debe corregir producto_detectado a TARJETA DE CRÉDITO');
  console.log(`  [PASS] GUARD-TC-001: bloqueó CRÉDITOS/CARTERA -> ${guarded.categoria_principal} > ${guarded.subcategoria} (${guarded.producto_detectado})`);
}

{
  const rec = makeRecord('GUARD-REV-001', 'Reporto un pago duplicado en mi crédito de consumo');
  const badAiOutput = {
    expediente: 'GUARD-REV-001',
    categoria_principal: 'CRÉDITOS / CARTERA',
    subcategoria: 'REVERSIÓN',
    resumen_requerimiento: 'Pago duplicado',
    intencion_cliente: 'Reportar pago duplicado',
    confianza: 90,
    requiere_revision_humana: false,
    producto_detectado: 'CRÉDITO DE CONSUMO',
    problema_principal: 'Pago duplicado',
    solicitud_cliente: 'Revisar pago duplicado',
    evidencia_textual: 'pago duplicado en mi crédito de consumo'
  };
  const guarded = validateClassificationConsistency(rec, badAiOutput);
  assert.equal(guarded.categoria_principal, 'PAGOS / ABONOS', '[GUARD-REV-001] debe reclasificar pago duplicado sin solicitud expresa de devolución');
  assert.equal(guarded.subcategoria, 'APLICACIÓN DE PAGO');
  console.log(`  [PASS] GUARD-REV-001: bloqueó REVERSIÓN sin devolución expresa -> ${guarded.categoria_principal} > ${guarded.subcategoria}`);
}

console.log('\n✅ TODAS LAS PRUEBAS TC VS. CRÉDITO/CARTERA Y REVERSIÓN PASARON EXITOSAMENTE.');
