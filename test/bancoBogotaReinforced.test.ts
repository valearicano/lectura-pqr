import assert from 'assert';
import {
  classifyPQRDeterministic,
  buildPQRSAnalysis,
  validateClassificationConsistency,
  PQRInputRecord
} from '../src/services/classifierEngine';
import {
  isValidCatalogPair,
  validateCatalogPair,
  getCatalogSummary,
  DEFAULT_CATALOG
} from '../src/services/catalog';
import { buildExportRow, CANONICAL_ANALYSIS_COLUMNS } from '../src/services/excelService';

function makeRecord(
  id: string,
  descripcion: string,
  overrides: Partial<PQRInputRecord> = {}
): PQRInputRecord {
  return {
    numero_expediente: id,
    resumen_original: '',
    descripcion_original: descripcion,
    producto_original: overrides.producto_original || '',
    tipo_origen: overrides.tipo_origen || '',
    submotivo_original: overrides.submotivo_original || '',
    ...overrides
  };
}

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

console.log('\n=== BANCO DE BOGOTÁ REINFORCED PQRS ENGINE TEST SUITE ===\n');

// 1. Credit card cancellation MUST map to PRODUCTOS > CANCELACIÓN DE PRODUCTOS (NEVER CONDICIONES)
runTest('Cancelación directa de tarjeta de crédito -> PRODUCTOS > CANCELACIÓN DE PRODUCTOS', () => {
  const rec = makeRecord(
    'BDB-001',
    'Solicito la cancelación inmediata de mi tarjeta de crédito Visa terminada en 4421 porque ya no deseo continuar con el producto.'
  );
  const res = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.strictEqual(res.categoria_principal, 'PRODUCTOS');
  assert.strictEqual(res.subcategoria, 'CANCELACIÓN DE PRODUCTOS');
  assert.strictEqual(res.producto_detectado, 'TARJETA DE CRÉDITO');
  assert.ok(isValidCatalogPair(res.categoria_principal, res.subcategoria));
});

runTest('Cancelación de tarjeta con antecedente de condiciones/tasa -> PRODUCTOS > CANCELACIÓN DE PRODUCTOS (NO CONDICIONES)', () => {
  const rec = makeRecord(
    'BDB-002',
    'No estoy de acuerdo con las condiciones ni con la tasa de interés actual de mi tarjeta de crédito, por eso solicito cancelar la tarjeta definitivamente y dar de baja el plástico.'
  );
  const res = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.strictEqual(res.categoria_principal, 'PRODUCTOS');
  assert.strictEqual(res.subcategoria, 'CANCELACIÓN DE PRODUCTOS');
  assert.strictEqual(res.producto_detectado, 'TARJETA DE CRÉDITO');
});

runTest('Tarjeta sigue activa después de solicitar cancelación -> PRODUCTOS > CANCELACIÓN DE PRODUCTOS', () => {
  const rec = makeRecord(
    'BDB-003',
    'El mes pasado llamé a cancelar mi tarjeta de crédito Mastercard pero sigue activa en la app; necesito confirmar que mi tarjeta quedó cancelada.'
  );
  const res = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.strictEqual(res.categoria_principal, 'PRODUCTOS');
  assert.strictEqual(res.subcategoria, 'CANCELACIÓN DE PRODUCTOS');
  assert.strictEqual(res.producto_detectado, 'TARJETA DE CRÉDITO');
});

runTest('Guard #8 corrige si IA erróneamente envía cancelación de tarjeta a CONDICIONES', () => {
  const rec = makeRecord(
    'BDB-004',
    'Quiero cerrar y dar de baja mi tarjeta de crédito porque no deseo continuar con el producto.'
  );
  const guarded = validateClassificationConsistency(rec, {
    expediente: rec.numero_expediente,
    categoria_principal: 'CONDICIONES',
    subcategoria: 'OTRAS CONDICIONES DEL CRÉDITO',
    resumen_requerimiento: 'Cliente inconforme con condiciones.',
    intencion_cliente: 'Revisar condiciones',
    confianza: 88,
    requiere_revision_humana: false,
    producto_detectado: 'TARJETA DE CRÉDITO',
    problema_principal: 'Condiciones del producto',
    solicitud_cliente: 'Revisión de condiciones',
    evidencia_textual: rec.descripcion_original.slice(0, 80)
  });
  assert.strictEqual(guarded.categoria_principal, 'PRODUCTOS');
  assert.strictEqual(guarded.subcategoria, 'CANCELACIÓN DE PRODUCTOS');
});

// 2. Distinctions: debt payoff vs card closure, blocking vs cancellation, post-cancellation management fee
runTest('Cancelación/pago total de deuda NO es cancelación de producto', () => {
  const rec = makeRecord(
    'BDB-005',
    'Realicé el pago total para la cancelación de la deuda de mi tarjeta de crédito el día 10 de abril y el pago todavía no se ve reflejado en el saldo.'
  );
  const res = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.notStrictEqual(res.subcategoria, 'CANCELACIÓN DE PRODUCTOS');
  assert.strictEqual(res.categoria_principal, 'PAGOS / ABONOS');
  assert.strictEqual(res.subcategoria, 'APLICACIÓN DE PAGO');
});

runTest('Bloqueo de plástico -> TARJETAS > PLÁSTICO Y BLOQUEO (NO CANCELACIÓN)', () => {
  const rec = makeRecord(
    'BDB-006',
    'Mi tarjeta de crédito aparece bloqueada y no me deja comprar en datáfono, solicito el desbloqueo urgente del plástico.'
  );
  const res = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.strictEqual(res.categoria_principal, 'TARJETAS');
  assert.strictEqual(res.subcategoria, 'PLÁSTICO Y BLOQUEO');
});

runTest('Cobro de cuota de manejo posterior a cancelación -> CUOTAS DE MANEJO > COBRO POSTERIOR A CANCELACIÓN', () => {
  const rec = makeRecord(
    'BDB-007',
    'Me siguen cobrando cuota de manejo en una tarjeta de crédito que ya había cancelado hace tres meses.'
  );
  const res = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.strictEqual(res.categoria_principal, 'CUOTAS DE MANEJO');
  assert.strictEqual(res.subcategoria, 'COBRO POSTERIOR A CANCELACIÓN');
});

runTest('Inconformidad genuina con condiciones SIN solicitud de cancelación -> CONDICIONES', () => {
  const rec = makeRecord(
    'BDB-008',
    'No estoy de acuerdo con la tasa de interés aplicada a mi crédito de libre inversión, me cobraron una tasa mayor a la pactada al momento de la firma.'
  );
  const res = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.strictEqual(res.categoria_principal, 'CONDICIONES');
  assert.strictEqual(res.subcategoria, 'TASA DE INTERÉS');
});

// 3. Reinforced Credit Card scenarios (cupo, LATAM/millas, entrega/reposición)
runTest('Disminución de cupo de tarjeta -> TARJETAS > CUPO Y AVANCES', () => {
  const rec = makeRecord(
    'BDB-009',
    'El banco me bajaron el cupo de mi tarjeta de crédito sin avisarme y ahora no tengo cupo disponible para mis pagos.'
  );
  const res = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.strictEqual(res.categoria_principal, 'TARJETAS');
  assert.strictEqual(res.subcategoria, 'CUPO Y AVANCES');
});

runTest('Socio LATAM / Millas LATAM -> TARJETAS > MILLAS Y PROGRAMAS DE LEALTAD', () => {
  const rec = makeRecord(
    'BDB-010',
    'Soy socio LATAM con tarjeta de crédito del banco y no me han acreditado las millas LATAM de mis compras del último trimestre.'
  );
  const res = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.strictEqual(res.categoria_principal, 'TARJETAS');
  assert.strictEqual(res.subcategoria, 'MILLAS Y PROGRAMAS DE LEALTAD');
});

// 4. Impuesto Predial & FRECH in Cartera / Créditos
runTest('Impuesto Predial en leasing habitacional -> CRÉDITOS / CARTERA (subcategoría válida del catálogo)', () => {
  const rec = makeRecord(
    'BDB-011',
    'Solicito aclaración sobre el cobro del impuesto predial incluido en el valor de la obligación de mi leasing habitacional.'
  );
  const res = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.strictEqual(res.categoria_principal, 'CRÉDITOS / CARTERA');
  assert.ok(isValidCatalogPair(res.categoria_principal, res.subcategoria));
});

runTest('FRECH con error ortográfico FRESH -> CRÉDITOS / CARTERA > FRECH', () => {
  const rec = makeRecord(
    'BDB-012',
    'En mi crédito hipotecario dejaron de aplicar el subsidio FRESH de vivienda desde este mes.'
  );
  const res = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.strictEqual(res.categoria_principal, 'CRÉDITOS / CARTERA');
  assert.strictEqual(res.subcategoria, 'FRECH');
});

// 5. Derecho de Petición should NOT hijack underlying operational issues or send to OTRAS
runTest('Derecho de Petición sobre transferencia fallida -> TRANSFERENCIAS (NO OTRAS ni INFORMACIÓN)', () => {
  const rec = makeRecord(
    'BDB-013',
    'Por medio del presente Derecho de Petición solicito la devolución urgente de una transferencia realizada desde mi cuenta de ahorros que fue debitada pero nunca llegó al destinatario.'
  );
  const res = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.strictEqual(res.categoria_principal, 'TRANSFERENCIAS');
  assert.notStrictEqual(res.categoria_principal, 'OTRAS');
  assert.ok(isValidCatalogPair(res.categoria_principal, res.subcategoria));
});

runTest('Derecho de Petición sobre falla en App -> CANALES DIGITALES (NO OTRAS ni INFORMACIÓN)', () => {
  const rec = makeRecord(
    'BDB-014',
    'Presento Derecho de Petición porque la app móvil presenta error constante al intentar ingresar con mi clave y token digital.'
  );
  const res = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.strictEqual(res.categoria_principal, 'CANALES DIGITALES');
  assert.ok(isValidCatalogPair(res.categoria_principal, res.subcategoria));
});

// 6. CDT VISUALIZACIÓN priority + Embargo "sin embargo" guard
runTest('CDT visualización conserva prioridad sobre CERTIFICADO DE SALDO O DECEVAL', () => {
  const rec = makeRecord(
    'BDB-015',
    'No puedo visualizar mi CDT en la banca virtual para ver el saldo ni aparece en los canales digitales.'
  );
  const res = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.strictEqual(res.categoria_principal, 'CDT');
  assert.strictEqual(res.subcategoria, 'VISUALIZACIÓN');
});

runTest('Expresión "sin embargo" NO dispara categoría EMBARGOS', () => {
  const rec = makeRecord(
    'BDB-016',
    'Pagué la tarjeta la semana pasada; sin embargo, no me han aplicado el abono y el saldo sigue igual.'
  );
  const res = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  assert.notStrictEqual(res.categoria_principal, 'EMBARGOS');
  assert.strictEqual(res.categoria_principal, 'PAGOS / ABONOS');
});

// 7. Strict catalog integrity validation (Guard #9 + validateCatalogPair + getCatalogSummary)
runTest('validateCatalogPair rechaza combinaciones inventadas y preserva combinaciones válidas', () => {
  const valid = validateCatalogPair('PRODUCTOS', 'CANCELACIÓN DE PRODUCTOS');
  assert.strictEqual(valid.valid, true);
  assert.strictEqual(valid.categoria, 'PRODUCTOS');
  assert.strictEqual(valid.subcategoria, 'CANCELACIÓN DE PRODUCTOS');

  const crossed = validateCatalogPair('CONDICIONES', 'CANCELACIÓN DE PRODUCTOS');
  assert.strictEqual(crossed.valid, false);
  assert.strictEqual(crossed.categoria, 'CONDICIONES');
  assert.ok(isValidCatalogPair(crossed.categoria, crossed.subcategoria));

  const invented = validateCatalogPair('CATEGORIA INVENTADA', 'SUB INVENTADA');
  assert.strictEqual(invented.valid, false);
  assert.strictEqual(invented.categoria, 'OTRAS');
  assert.strictEqual(invented.subcategoria, 'CASOS ATÍPICOS');
});

runTest('getCatalogSummary expone todas las categorías activas del catálogo vigente', () => {
  const summary = getCatalogSummary();
  for (const cat of DEFAULT_CATALOG) {
    assert.ok(summary.includes(cat.nombre), `Falta categoría ${cat.nombre} en getCatalogSummary()`);
  }
});

// 8. Canonical Excel export preserved intact (9 original columns + Tipo de caso)
runTest('Exportación Excel conserva exactamente las 10 columnas canónicas (incluyendo Tipo de caso) sin duplicaciones', () => {
  const rec = makeRecord(
    'BDB-017',
    'Solicito cancelar mi tarjeta de crédito porque no deseo continuar con el producto.'
  );
  const analysis = buildPQRSAnalysis(rec, classifyPQRDeterministic(rec));
  const row = buildExportRow({
    ...rec,
    analisis: analysis,
    columnas_adicionales: {}
  } as any);
  for (const col of CANONICAL_ANALYSIS_COLUMNS) {
    assert.ok(col in row, `Falta columna canónica ${col}`);
  }
  assert.strictEqual(CANONICAL_ANALYSIS_COLUMNS.length, 10);
  assert.strictEqual(row['CATEGORIA PRINCIPAL'], 'PRODUCTOS');
  assert.strictEqual(row['SUBCATEGORIA IA'], 'CANCELACIÓN DE PRODUCTOS');
  assert.strictEqual(row['Tipo de caso'], 'Solicitud');
});

console.log(`\nResumen: ${passed} pasaron, ${failed} fallaron.`);
if (failed > 0) {
  process.exit(1);
}
