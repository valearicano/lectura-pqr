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
 * Generates and downloads the enriched Excel file (PQRS_ANALIZADAS.xlsx)
 * preserving all original columns (NO_SS, SUBMOTIVO, NOMBRE_PRODUCTO, FECHA_RADICACION, FECHA_DE_COMPROMISO, DESC_DETALLADA)
 * and appending the exact master classification results.
 */
export function exportEnrichedExcel(
  records: EnrichedPQRSRecord[],
  filename = 'PQRS_ANALIZADAS.xlsx',
  filterRevisionOnly = false
): void {
  const filteredRecords = filterRevisionOnly
    ? records.filter(r => r.analisis?.requiere_revision || r.analisis?.requiere_revision_humana === 'SI' || r.analisis?.categoria === 'REVISIÓN HUMANA')
    : records;

  const exportRows = filteredRecords.map(r => {
    const row: Record<string, any> = {};

    // 1. Maintain all original columns exactly as uploaded
    if (r.columnas_adicionales && Object.keys(r.columnas_adicionales).length > 0) {
      for (const [key, val] of Object.entries(r.columnas_adicionales)) {
        row[key] = val;
      }
    } else {
      row['NO_SS'] = r.numero_expediente;
      row['SUBMOTIVO'] = r.resumen_original;
      row['DESC_DETALLADA'] = r.descripcion_original;
    }

    // Ensure NO_SS is present
    if (!('NO_SS' in row) && !('no_ss' in row)) {
      row['NO_SS'] = r.numero_expediente;
    }

    // 2. Append standard AI master classification columns
    const a = r.analisis;
    const catPrincipal = a?.categoria_principal || a?.categoria || 'Sin procesar';
    const subcat = a?.subcategoria || 'General';
    const resumenReq = a?.resumen_requerimiento || a?.resumen_normalizado || '';
    const intencion = a?.intencion_cliente || a?.solicitud_cliente || '';
    const conf = a?.confianza !== undefined ? a.confianza : 90;
    const reqRev = a?.requiere_revision_humana === 'SI' || a?.requiere_revision || catPrincipal === 'REVISIÓN HUMANA' ? 'SI' : 'NO';

    row['CATEGORIA_PRINCIPAL'] = catPrincipal;
    row['SUBCATEGORIA'] = subcat;
    row['RESUMEN_REQUERIMIENTO'] = resumenReq;
    row['INTENCION_REAL_CLIENTE'] = intencion;
    row['CATEGORIA_MAESTRA'] = catPrincipal;
    row['CONFIANZA'] = conf;
    row['REQUIERE_REVISION_HUMANA'] = reqRev;
    row['FORMATO_JSON_CORTO'] = JSON.stringify({
      expediente: r.numero_expediente,
      categoria_principal: catPrincipal,
      subcategoria: subcat,
      resumen_requerimiento: resumenReq,
      confianza: conf,
      requiere_revision_humana: reqRev === 'SI'
    });

    // Complementary audit details
    row['MOTIVO_DE_REVISION'] = a?.motivo_de_revision || '';
    row['EXISTE_INCONSISTENCIA'] = a?.existe_inconsistencia === 'SI' || a?.posible_inconsistencia ? 'SI' : 'NO';
    row['TIPO_PQR'] = a?.tipo_pqr || (catPrincipal === 'DOCUMENTOS Y CERTIFICACIONES' ? 'PETICIÓN' : 'RECLAMO');
    row['FECHA_ANALISIS'] = a?.fecha_analisis || new Date().toISOString().split('T')[0];

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PQRS Analizadas');

  XLSX.writeFile(workbook, filename);
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

