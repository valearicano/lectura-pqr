import * as XLSX from 'xlsx';
import { EnrichedPQRSRecord, SemanticGroup } from '../types';

export interface ParsedSheetData {
  headers: string[];
  rows: Record<string, any>[];
  rawLength: number;
}

/**
 * Parses an Excel or CSV file buffer/ArrayBuffer
 */
export async function parseExcelFile(file: File): Promise<ParsedSheetData> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('El archivo no contiene hojas de cálculo.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  // Parse rows as JSON with original header keys
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false
  });

  if (rows.length === 0) {
    throw new Error('La hoja de cálculo está completamente vacía.');
  }

  // Extract all unique headers found across the rows in order of occurrence
  const headerSet = new Set<string>();
  rows.forEach(r => Object.keys(r).forEach(k => headerSet.add(k)));
  const headers = Array.from(headerSet);

  return {
    headers,
    rows,
    rawLength: rows.length
  };
}

/**
 * Canonical 9 analysis columns in strict requested order
 */
export const CANONICAL_ANALYSIS_COLUMNS = [
  'CATEGORIA PRINCIPAL',
  'SUBCATEGORIA IA',
  'PRODUCTO DETECTADO',
  'PROBLEMA PRINCIPAL',
  'RESUMEN',
  'EVIDENCIA',
  'PROPUESTA DE RESPUESTA',
  'NIVEL DE CONFIANZA',
  'REQUIERE REVISIÓN'
] as const;

/**
 * Legacy/duplicate column keys that must be stripped from source records if previously present
 */
const LEGACY_ANALYSIS_KEYS = new Set([
  'CATEGORIA PRINCIPAL',
  'CATEGORÍA PRINCIPAL',
  'CATEGORIA',
  'CATEGORÍA',
  'CATEGORIA_PRINCIPAL',
  'CATEGORÍA_PRINCIPAL',
  'CATEGORIA_IA',
  'CATEGORÍA_IA',
  'SUBCATEGORIA IA',
  'SUBCATEGORÍA IA',
  'SUBCATEGORIA',
  'SUBCATEGORÍA',
  'SUBCATEGORIA_IA',
  'SUBCATEGORÍA_IA',
  'PRODUCTO DETECTADO',
  'PRODUCTO_DETECTADO',
  'PRODUCTO',
  'PROBLEMA PRINCIPAL',
  'PROBLEMA_PRINCIPAL',
  'SOLICITUD DEL CLIENTE',
  'SOLICITUD_CLIENTE',
  'QUÉ QUIERE EL CLIENTE',
  'QUE QUIERE EL CLIENTE',
  'RESUMEN',
  'RESUMEN NORMALIZADO',
  'RESUMEN_NORMALIZADO',
  'RESUMEN EJECUTIVO',
  'RESUMEN_EJECUTIVO',
  'RESUMEN REQUERIMIENTO',
  'RESUMEN_REQUERIMIENTO',
  'EVIDENCIA',
  'EVIDENCIA DE CLASIFICACIÓN',
  'EVIDENCIA DE CLASIFICACION',
  'EVIDENCIA_CLASIFICACION',
  'EVIDENCIA_TEXTUAL',
  'PROPUESTA DE RESPUESTA',
  'PROPUESTA_RESPUESTA',
  'NIVEL DE CONFIANZA',
  'NIVEL_CONFIANZA',
  'CONFIANZA',
  'REQUIERE REVISIÓN',
  'REQUIERE REVISION',
  'REQUIERE_REVISION',
  'REQUIERE_REVISION_HUMANA',
  'POSIBLE_INCONSISTENCIA',
  'MOTIVO_DE_REVISION',
  'MOTIVO_REVISION',
  'FECHA DEL PAGO',
  'VALOR DEL PAGO',
  'FECHA DEL PAGO 2',
  'VALOR DEL PAGO 2'
]);

/**
 * Normalizes Nivel de Confianza strictly to: 'ALTO' | 'MEDIO' | 'BAJO'
 */
export function normalizeNivelConfianza(a?: EnrichedPQRSRecord['analisis']): 'ALTO' | 'MEDIO' | 'BAJO' {
  const raw = (a?.nivel_confianza || '').toString().trim().toUpperCase();
  if (raw === 'ALTO' || raw === 'ALTA' || raw.startsWith('ALT')) return 'ALTO';
  if (raw === 'BAJO' || raw === 'BAJA' || raw.startsWith('BAJ')) return 'BAJO';
  if (raw === 'MEDIO' || raw === 'MEDIA' || raw.startsWith('MED')) return 'MEDIO';

  if (typeof a?.confianza === 'number') {
    if (a.confianza >= 85) return 'ALTO';
    if (a.confianza >= 70) return 'MEDIO';
    return 'BAJO';
  }
  return 'MEDIO';
}

/**
 * Normalizes Requiere Revisión strictly to: 'SI' | 'NO'
 */
export function normalizeRequiereRevision(a?: EnrichedPQRSRecord['analisis']): 'SI' | 'NO' {
  if (!a) return 'NO';
  if (
    a.requiere_revision_humana === 'SI' ||
    a.requiere_revision === true ||
    a.categoria === 'REVISIÓN HUMANA' ||
    a.categoria_principal === 'REVISIÓN HUMANA'
  ) {
    return 'SI';
  }
  return 'NO';
}

/**
 * Builds the single-truth canonical analysis row for export
 */
export function buildExportRow(record: EnrichedPQRSRecord): Record<string, any> {
  const row: Record<string, any> = {};

  // 1. Maintain all original columns exactly as uploaded, filtering out any previous analysis duplicates
  if (record.columnas_adicionales && Object.keys(record.columnas_adicionales).length > 0) {
    for (const [key, val] of Object.entries(record.columnas_adicionales)) {
      const normalizedKey = key.trim();
      if (!LEGACY_ANALYSIS_KEYS.has(normalizedKey)) {
        row[key] = val;
      }
    }
  } else {
    row['NO_SS'] = record.numero_expediente;
    row['SUBMOTIVO'] = record.resumen_original || '';
    row['DESC_DETALLADA'] = record.descripcion_original || '';
  }

  // Ensure NO_SS is present
  const hasNoSs = Object.keys(row).some(k => k.trim().toUpperCase() === 'NO_SS' || k.trim().toUpperCase() === 'NO SS' || k.trim().toUpperCase() === 'EXPEDIENTE');
  if (!hasNoSs) {
    row['NO_SS'] = record.numero_expediente;
  }

  // 2. Extract values for the exact 9 canonical fields
  const a = record.analisis;
  const catPrincipal = a?.categoria_principal || a?.categoria || 'Sin procesar';
  const subcatIa = a?.subcategoria_ia || a?.subcategoria || 'General';
  const productoDetectado = a?.producto_detectado || a?.producto || 'NO ESPECIFICADO';
  const problemaPrincipal = a?.problema_principal || a?.solicitud_cliente || a?.que_solicita_exactamente || '';
  const resumen = a?.resumen_normalizado || a?.resumen_requerimiento || '';
  const evidencia = a?.evidencia_clasificacion || a?.evidencia_textual || a?.sustento_clasificacion || '';
  const propuestaRespuesta = a?.propuesta_respuesta || '';
  const nivelConfianza = normalizeNivelConfianza(a);
  const requiereRevision = normalizeRequiereRevision(a);

  // 3. Append strictly the 9 canonical columns in exact requested order:
  // 1. CATEGORIA PRINCIPAL
  // 2. SUBCATEGORIA IA
  // 3. PRODUCTO DETECTADO
  // 4. PROBLEMA PRINCIPAL
  // 5. RESUMEN
  // 6. EVIDENCIA
  // 7. PROPUESTA DE RESPUESTA
  // 8. NIVEL DE CONFIANZA
  // 9. REQUIERE REVISIÓN
  row['CATEGORIA PRINCIPAL'] = catPrincipal;
  row['SUBCATEGORIA IA'] = subcatIa;
  row['PRODUCTO DETECTADO'] = productoDetectado;
  row['PROBLEMA PRINCIPAL'] = problemaPrincipal;
  row['RESUMEN'] = resumen;
  row['EVIDENCIA'] = evidencia;
  row['PROPUESTA DE RESPUESTA'] = propuestaRespuesta;
  row['NIVEL DE CONFIANZA'] = nivelConfianza;
  row['REQUIERE REVISIÓN'] = requiereRevision;

  return row;
}

/**
 * Generates and downloads the enriched Excel file (PQRS_ANALIZADAS.xlsx)
 * with strictly 1 version of the 9 analysis columns, zero duplicate fields,
 * preserving original uploaded columns.
 */
export function exportEnrichedExcel(
  records: EnrichedPQRSRecord[],
  filename = 'PQRS_ANALIZADAS.xlsx',
  filterRevisionOnly = false
): void {
  const filteredRecords = filterRevisionOnly
    ? records.filter(r => normalizeRequiereRevision(r.analisis) === 'SI')
    : records;

  const exportRows = filteredRecords.map(r => buildExportRow(r));

  // Determine headers ordering: all original headers followed by canonical 9 analysis columns
  const headerKeys: string[] = [];
  if (exportRows.length > 0) {
    const firstRowKeys = Object.keys(exportRows[0]);
    const originalKeys = firstRowKeys.filter(k => !(CANONICAL_ANALYSIS_COLUMNS as readonly string[]).includes(k));
    headerKeys.push(...originalKeys, ...CANONICAL_ANALYSIS_COLUMNS);
  }

  const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: headerKeys });

  // Auto-fit column widths for excellent readability
  if (headerKeys.length > 0) {
    worksheet['!cols'] = headerKeys.map(k => {
      if (k === 'CATEGORIA PRINCIPAL') return { wch: 26 };
      if (k === 'SUBCATEGORIA IA') return { wch: 28 };
      if (k === 'PRODUCTO DETECTADO') return { wch: 24 };
      if (k === 'PROBLEMA PRINCIPAL') return { wch: 35 };
      if (k === 'RESUMEN') return { wch: 35 };
      if (k === 'EVIDENCIA') return { wch: 40 };
      if (k === 'PROPUESTA DE RESPUESTA') return { wch: 45 };
      if (k === 'NIVEL DE CONFIANZA') return { wch: 18 };
      if (k === 'REQUIERE REVISIÓN') return { wch: 18 };
      if (k.toUpperCase().includes('DESC')) return { wch: 45 };
      return { wch: 20 };
    });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PQRS Analizadas');

  XLSX.writeFile(workbook, filename);
}

/**
 * Unified with exportEnrichedExcel. Directs legacy calls to the single source of truth.
 */
export function exportItauPaymentsExcel(
  records: EnrichedPQRSRecord[],
  filename = 'PQRS_ANALIZADAS.xlsx'
): void {
  exportEnrichedExcel(records, filename);
}

/**
 * Exports summary of master categories and counts to Excel
 */
export function exportCategoriesSummaryExcel(
  records: EnrichedPQRSRecord[],
  filename = 'RESUMEN_CATEGORIAS_MAESTRAS_PQRS.xlsx'
): void {
  const catMap: Record<string, { total: number; altaConf: number; inconsistencias: number; revision: number }> = {};

  records.forEach(r => {
    const cat = r.analisis?.categoria || 'Sin clasificar';
    if (!catMap[cat]) {
      catMap[cat] = { total: 0, altaConf: 0, inconsistencias: 0, revision: 0 };
    }
    catMap[cat].total++;
    if (r.analisis?.nivel_confianza === 'Alta') catMap[cat].altaConf++;
    if (r.analisis?.posible_inconsistencia || r.analisis?.existe_inconsistencia === 'SI') catMap[cat].inconsistencias++;
    if (r.analisis?.requiere_revision || r.analisis?.requiere_revision_humana === 'SI' || cat === 'REVISIÓN HUMANA') catMap[cat].revision++;
  });

  const summaryRows = Object.entries(catMap).map(([categoria, stats]) => ({
    categoria,
    cantidad_expedientes: stats.total,
    porcentaje: `${((stats.total / (records.length || 1)) * 100).toFixed(1)}%`,
    alta_confianza: stats.altaConf,
    posibles_inconsistencias: stats.inconsistencias,
    requiere_revision: stats.revision
  }));

  const worksheet = XLSX.utils.json_to_sheet(summaryRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Categorías Maestras');
  XLSX.writeFile(workbook, filename);
}

/**
 * Exports semantic groups to Excel
 */
export function exportGroupsExcel(
  groups: SemanticGroup[],
  filename = 'GRUPOS_SEMANTICOS_PQRS.xlsx'
): void {
  const rows = groups.map(g => ({
    grupo_id: g.id,
    nombre: g.nombre,
    categoria_sugerida: g.categoria_sugerida,
    cantidad_expedientes: g.cantidad_expedientes,
    similitud_promedio: `${(g.similitud_promedio * 100).toFixed(1)}%`,
    es_nuevo_patron: g.es_nuevo_patron ? 'SÍ' : 'NO',
    descripcion_patron: g.descripcion_patron || '',
    ejemplos_descripciones: (g.ejemplos_descripciones || []).join(' | ')
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Grupos Semánticos');
  XLSX.writeFile(workbook, filename);
}

