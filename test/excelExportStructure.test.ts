import assert from 'assert';
import { EnrichedPQRSRecord } from '../src/types';
import {
  CANONICAL_ANALYSIS_COLUMNS,
  buildExportRow,
  normalizeNivelConfianza,
  normalizeRequiereRevision
} from '../src/services/excelService';
import { buildPQRSAnalysis, generatePropuestaRespuesta, PQRInputRecord } from '../src/services/classifierEngine';

console.log('--- TEST SUITE: VERIFICACIÓN ESTRUCTURA EXPORTACIÓN EXCEL ---');

// 1. Verify CANONICAL_ANALYSIS_COLUMNS has exactly 9 items in exact order
console.log('1. Verificando lista canónica de 9 columnas de análisis...');
const expectedCanonical = [
  'CATEGORIA PRINCIPAL',
  'SUBCATEGORIA IA',
  'PRODUCTO DETECTADO',
  'PROBLEMA PRINCIPAL',
  'RESUMEN',
  'EVIDENCIA',
  'PROPUESTA DE RESPUESTA',
  'NIVEL DE CONFIANZA',
  'REQUIERE REVISIÓN'
];

assert.strictEqual(CANONICAL_ANALYSIS_COLUMNS.length, 9, 'Debe haber exactamente 9 columnas canónicas de análisis');
for (let i = 0; i < expectedCanonical.length; i++) {
  assert.strictEqual(CANONICAL_ANALYSIS_COLUMNS[i], expectedCanonical[i], `Columna ${i + 1} debe ser ${expectedCanonical[i]}`);
}
console.log('✔ Las 9 columnas canónicas coinciden exactamente en nombre y orden.');

// 2. Test record with original uploaded columns and ensure they are preserved without duplication
console.log('2. Verificando preservación de columnas originales y generación sin duplicados...');
const rawCase1: PQRInputRecord = {
  numero_expediente: 'EXP-90001',
  descripcion_original: 'Buenos días, en el último extracto de mi tarjeta de crédito me cobraron cuota de manejo por 32.000 pesos cuando al momento de contratar me dijeron que era exonerada por un año.',
  resumen_original: 'Inconformidad con cobro',
  producto_original: 'TARJETA DE CRÉDITO',
  columnas_adicionales: {
    'NO_SS': 'EXP-90001',
    'CANAL': 'WEB',
    'FECHA_RADICACION': '2023-10-15',
    'NOMBRE_PRODUCTO': 'TARJETA DE CRÉDITO',
    'SUBMOTIVO': 'Inconformidad con cobro',
    'DESC_DETALLADA': 'Buenos días, en el último extracto de mi tarjeta de crédito me cobraron cuota de manejo por 32.000 pesos cuando al momento de contratar me dijeron que era exonerada por un año.'
  }
};

const analysis1 = buildPQRSAnalysis(rawCase1);
const enriched1: EnrichedPQRSRecord = {
  id: 'rec-1',
  numero_expediente: rawCase1.numero_expediente,
  descripcion_original: rawCase1.descripcion_original,
  resumen_original: rawCase1.resumen_original || '',
  columnas_adicionales: rawCase1.columnas_adicionales,
  analisis: analysis1
};

const exportRow1 = buildExportRow(enriched1);
const rowKeys1 = Object.keys(exportRow1);
console.log('Columnas generadas en fila 1:', rowKeys1);

// Assert original columns exist
assert.strictEqual(exportRow1['NO_SS'], 'EXP-90001');
assert.strictEqual(exportRow1['CANAL'], 'WEB');
assert.strictEqual(exportRow1['FECHA_RADICACION'], '2023-10-15');
assert.strictEqual(exportRow1['NOMBRE_PRODUCTO'], 'TARJETA DE CRÉDITO');
assert.strictEqual(exportRow1['SUBMOTIVO'], 'Inconformidad con cobro');

// Assert each of the 9 canonical columns exists
for (const col of CANONICAL_ANALYSIS_COLUMNS) {
  assert(col in exportRow1, `Fila debe contener columna requerida: ${col}`);
}

// Assert no legacy duplicates exist
const forbiddenDuplicates = [
  'CATEGORÍA',
  'SUBCATEGORÍA',
  'CATEGORÍA PRINCIPAL',
  'CATEGORIA_PRINCIPAL',
  'CATEGORIA_IA',
  'SUBCATEGORIA_IA',
  'PRODUCTO_DETECTADO',
  'PRODUCTO',
  'PROBLEMA_PRINCIPAL',
  'SOLICITUD DEL CLIENTE',
  'SOLICITUD_CLIENTE',
  'QUÉ QUIERE EL CLIENTE',
  'RESUMEN NORMALIZADO',
  'RESUMEN_NORMALIZADO',
  'RESUMEN EJECUTIVO',
  'EVIDENCIA DE CLASIFICACIÓN',
  'EVIDENCIA_CLASIFICACION',
  'NIVEL_CONFIANZA',
  'REQUIERE_REVISION',
  'POSIBLE_INCONSISTENCIA',
  'MOTIVO_DE_REVISION',
  'FECHA DEL PAGO',
  'VALOR DEL PAGO'
];

for (const forb of forbiddenDuplicates) {
  assert(!(forb in exportRow1), `ERROR: Columna duplicada/legada no debe estar en el export: "${forb}"`);
}

// Check values of NIVEL DE CONFIANZA and REQUIERE REVISIÓN
assert(['ALTO', 'MEDIO', 'BAJO'].includes(exportRow1['NIVEL DE CONFIANZA']), `NIVEL DE CONFIANZA debe ser ALTO, MEDIO o BAJO, recibido: ${exportRow1['NIVEL DE CONFIANZA']}`);
assert(['SI', 'NO'].includes(exportRow1['REQUIERE REVISIÓN']), `REQUIERE REVISIÓN debe ser SI o NO, recibido: ${exportRow1['REQUIERE REVISIÓN']}`);
assert.strictEqual(exportRow1['CATEGORIA PRINCIPAL'], 'CUOTAS DE MANEJO');
assert(exportRow1['PROPUESTA DE RESPUESTA'].length > 10, 'Debe haber propuesta de respuesta redactada');

console.log('✔ Fila estándar probada: 0 columnas duplicadas, 9 columnas canónicas, valores estrictos normalizados.');

// 3. Test record with legacy columns in `columnas_adicionales` (e.g. from previously exported files re-uploaded)
console.log('3. Verificando depuración de columnas heredadas de archivos previamente enriquecidos...');
const dirtyRaw: PQRInputRecord = {
  numero_expediente: 'EXP-DIRTY-1',
  descripcion_original: 'Solicito renovar mi CDT que venció ayer con abono de intereses.',
  resumen_original: 'CDT renovación',
  producto_original: 'CDT',
  columnas_adicionales: {
    'NO_SS': 'EXP-DIRTY-1',
    'CLIENTE': 'PEDRO PÉREZ',
    // Injected legacy columns that must be cleaned out:
    'CATEGORÍA': 'OLD_CAT',
    'CATEGORIA_PRINCIPAL': 'OLD_CAT',
    'SUBCATEGORÍA IA': 'OLD_SUB',
    'PRODUCTO_DETECTADO': 'OLD_PROD',
    'POSIBLE_INCONSISTENCIA': 'SI',
    'FECHA DEL PAGO': '2023-01-01',
    'NIVEL_CONFIANZA': 'Alta'
  }
};

const dirtyAnalysis = buildPQRSAnalysis(dirtyRaw);
const dirtyRecord: EnrichedPQRSRecord = {
  id: 'rec-dirty',
  numero_expediente: dirtyRaw.numero_expediente,
  descripcion_original: dirtyRaw.descripcion_original,
  resumen_original: dirtyRaw.resumen_original || '',
  columnas_adicionales: dirtyRaw.columnas_adicionales,
  analisis: dirtyAnalysis
};

const exportRowDirty = buildExportRow(dirtyRecord);
const dirtyKeys = Object.keys(exportRowDirty);

assert.strictEqual(exportRowDirty['NO_SS'], 'EXP-DIRTY-1');
assert.strictEqual(exportRowDirty['CLIENTE'], 'PEDRO PÉREZ');
for (const forb of forbiddenDuplicates) {
  assert(!(forb in exportRowDirty), `La clave sucia "${forb}" debió ser eliminada`);
}
// Exact total columns: original non-dirty (NO_SS, CLIENTE) + 9 canonical = 11 columns
assert.strictEqual(dirtyKeys.length, 11, `Se esperaban 11 columnas únicas, pero hay ${dirtyKeys.length}: ${dirtyKeys.join(', ')}`);
console.log('✔ Archivo con columnas antiguas limpiado con éxito: exactamente 1 versión de cada campo.');

// 4. Test Propuesta de Respuesta rules (Section 5)
console.log('4. Verificando reglas de PROPUESTA DE RESPUESTA...');

// 4.1 Insufficient info fallback
const pRespSparse = generatePropuestaRespuesta('ok', 'OTRAS', 'GENERAL', 'DESCONOCIDO', '', false, false);
assert.strictEqual(
  pRespSparse,
  'NO APLICA - INFORMACIÓN INSUFICIENTE PARA PROPONER RESPUESTA.',
  'Debe retornar texto exacto para información insuficiente'
);
console.log('✔ Insuficiente información -> "NO APLICA - INFORMACIÓN INSUFICIENTE PARA PROPONER RESPUESTA."');

// 4.2 Security / Fraud fallback
const pRespFraud = generatePropuestaRespuesta(
  'Fui víctima de fraude y suplantación de identidad en mi cuenta, sacaron un crédito a mi nombre que nunca autoricé.',
  'FRAUDES',
  'SUPLANTACIÓN',
  'CUENTA',
  'Fraude',
  true,
  false
);
assert.strictEqual(
  pRespFraud,
  'NO APLICA - REQUIERE VALIDACIÓN INTERNA.',
  'Debe retornar texto exacto para fraude/suplantación/embargo'
);
console.log('✔ Fraude/Suplantación -> "NO APLICA - REQUIERE VALIDACIÓN INTERNA."');

// 4.3 Embargo fallback
const pRespEmbargo = generatePropuestaRespuesta(
  'Tengo un embargo judicial en mi cuenta y me retuvieron fondos de mi nómina.',
  'BLOQUEOS Y EMBARGOS',
  'EMBARGO',
  'CUENTA',
  'Embargo',
  true,
  false
);
assert.strictEqual(
  pRespEmbargo,
  'NO APLICA - REQUIERE VALIDACIÓN INTERNA.',
  'Debe retornar texto exacto para embargos'
);
console.log('✔ Embargos -> "NO APLICA - REQUIERE VALIDACIÓN INTERNA."');

// 4.4 CDT scenario
const cdtRaw: PQRInputRecord = {
  numero_expediente: 'EXP-CDT-01',
  descripcion_original: 'Deseo consultar por qué los rendimientos liquidados de mi CDT número 98765 no corresponden a la tasa de interés pactada del 12%.',
  resumen_original: 'Inconformidad rendimientos CDT',
  producto_original: 'CDT'
};
const cdtAnalysis = buildPQRSAnalysis(cdtRaw);
const pRespCDT = cdtAnalysis.propuesta_respuesta || '';
assert(pRespCDT.includes('CDT') || pRespCDT.includes('rendimiento') || pRespCDT.includes('interés'), 'Debe generar propuesta coherente para CDT');
assert(!pRespCDT.startsWith('NO APLICA'), 'No debe ser NO APLICA si hay información clara');
console.log('✔ CDT Rendimientos propuesta generada:', pRespCDT.substring(0, 75) + '...');

console.log('\n========================================');
console.log('TODAS LAS PRUEBAS DE EXPORTACIÓN EXCEL PASARON CON ÉXITO');
console.log('========================================\n');
