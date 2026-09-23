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

  // Extract all unique headers found across the rows
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
 * Generates and downloads the enriched Excel file (PQRS_ANALIZADAS.xlsx)
 * preserving all original columns and appending the 17 AI enrichment columns.
 */
export function exportEnrichedExcel(
  records: EnrichedPQRSRecord[],
  filename = 'PQRS_ANALIZADAS.xlsx',
  filterRevisionOnly = false
): void {
  const filteredRecords = filterRevisionOnly
    ? records.filter(r => r.analisis?.requiere_revision)
    : records;

  const exportRows = filteredRecords.map(r => {
    // 1. Start with original columns
    const row: Record<string, any> = {
      numero_expediente: r.numero_expediente,
      resumen_original: r.resumen_original,
      descripcion_original: r.descripcion_original
    };

    // Add any additional original columns
    if (r.columnas_adicionales) {
      for (const [key, val] of Object.entries(r.columnas_adicionales)) {
        row[key] = val;
      }
    }

    // 2. Append the structured AI analysis columns (16 Categorías Oficiales)
    const a = r.analisis;
    row['categoria'] = a?.categoria || 'Sin procesar';
    row['confianza'] = a?.confianza !== undefined ? a.confianza : 'N/A';
    row['requiere_revision_humana'] = a?.requiere_revision_humana === 'SI' || a?.requiere_revision ? 'SI' : 'NO';
    row['motivo_de_revision'] = a?.motivo_de_revision || '';
    row['existe_inconsistencia'] = a?.existe_inconsistencia === 'SI' || a?.posible_inconsistencia ? 'SI' : 'NO';
    row['motivo_inconsistencia'] = a?.motivo_inconsistencia || '';

    // Complementary details
    row['tipo_pqr'] = a?.tipo_pqr || 'RECLAMO';
    row['producto'] = a?.producto || 'NO IDENTIFICADO';
    row['motivo'] = a?.motivo || a?.categoria || 'No procesado';
    row['submotivo'] = a?.submotivo || a?.categoria || 'No procesado';
    row['que_solicita_exactamente'] = a?.que_solicita_exactamente || a?.solicitud_cliente || '';
    row['hechos_principales'] = a?.hechos_principales || a?.problema_principal || '';
    row['palabras_o_frases_sustento'] = a?.sustento_clasificacion || a?.justificacion || '';
    row['nivel_confianza'] = a?.nivel_confianza || (a?.confianza && a.confianza >= 85 ? 'Alta' : a?.confianza && a.confianza >= 70 ? 'Media' : 'Baja');

    // Grouping and workflow columns
    row['grupo_similitud_id'] = r.grupo_id || 'N/A';
    row['similitud_grupo'] = r.similitud_grupo !== undefined ? `${(r.similitud_grupo * 100).toFixed(1)}%` : 'N/A';
    row['resumen_normalizado'] = a?.resumen_normalizado || '';
    row['estado_revision'] = a?.estado_revision || 'PENDIENTE';
    row['fecha_analisis'] = a?.fecha_analisis || new Date().toISOString().split('T')[0];

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PQRS Analizadas');

  XLSX.writeFile(workbook, filename);
}

/**
 * Exports summary of categories and counts to Excel
 */
export function exportCategoriesSummaryExcel(
  records: EnrichedPQRSRecord[],
  filename = 'RESUMEN_CATEGORIAS_PQRS.xlsx'
): void {
  const catMap: Record<string, { total: number; altaConf: number; inconsistencias: number; revision: number }> = {};

  records.forEach(r => {
    const cat = r.analisis?.categoria || 'Sin clasificar';
    if (!catMap[cat]) {
      catMap[cat] = { total: 0, altaConf: 0, inconsistencias: 0, revision: 0 };
    }
    catMap[cat].total++;
    if (r.analisis?.nivel_confianza === 'Alta') catMap[cat].altaConf++;
    if (r.analisis?.posible_inconsistencia) catMap[cat].inconsistencias++;
    if (r.analisis?.requiere_revision) catMap[cat].revision++;
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
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Categorías');
  XLSX.writeFile(workbook, filename);
}

/**
 * Exports semantic groups summary to Excel
 */
export function exportSemanticGroupsExcel(
  groups: SemanticGroup[],
  filename = 'GRUPOS_SIMILARES_PQRS.xlsx'
): void {
  const rows = groups.map(g => ({
    grupo_id: g.id,
    nombre_grupo: g.nombre,
    categoria_sugerida: g.categoria_sugerida,
    cantidad_expedientes: g.cantidad_expedientes,
    similitud_promedio: `${(g.similitud_promedio * 100).toFixed(1)}%`,
    similitud_minima: `${(g.similitud_minima * 100).toFixed(1)}%`,
    similitud_maxima: `${(g.similitud_maxima * 100).toFixed(1)}%`,
    es_nuevo_patron: g.es_nuevo_patron ? 'SÍ' : 'NO',
    ejemplo_1: g.ejemplos_descripciones[0] || '',
    ejemplo_2: g.ejemplos_descripciones[1] || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Grupos Semánticos');
  XLSX.writeFile(workbook, filename);
}

export const exportGroupsExcel = exportSemanticGroupsExcel;

