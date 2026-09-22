import { PQRSRecord, ValidationSummary } from '../types';
import { normalizeText, hashText } from './textNormalizer';

export function validateRecords(
  rows: Record<string, any>[],
  expedienteCol: string,
  resumenCol: string,
  descripcionCol: string,
  archivoNombre: string = 'archivo.xlsx'
): ValidationSummary {
  const registrosValidos: PQRSRecord[] = [];
  const registrosConError: {
    fila: number;
    numero_expediente?: string;
    error: string;
    datosBrutos: any;
  }[] = [];

  const seenExpedientes = new Set<string>();
  let filasSinDescripcion = 0;
  let filasSinExpediente = 0;
  let filasDuplicadas = 0;

  rows.forEach((row, index) => {
    const filaNum = index + 2; // header is row 1
    const rawExp = row[expedienteCol];
    const rawDesc = row[descripcionCol];
    const rawResumen = resumenCol ? row[resumenCol] : '';

    // Check completely empty row
    const values = Object.values(row).filter(v => v !== null && v !== undefined && String(v).trim() !== '');
    if (values.length === 0) {
      // ignore completely empty row or mark as empty error
      return;
    }

    const expStr = rawExp !== null && rawExp !== undefined ? String(rawExp).trim() : '';
    const descStr = rawDesc !== null && rawDesc !== undefined ? String(rawDesc).trim() : '';
    const resumenStr = rawResumen !== null && rawResumen !== undefined ? String(rawResumen).trim() : '';

    // Error 1: Missing Expediente ID
    if (!expStr) {
      filasSinExpediente++;
      registrosConError.push({
        fila: filaNum,
        error: 'El expediente o radicado está vacío',
        datosBrutos: row
      });
      return;
    }

    // Error 2: Duplicate Expediente
    if (seenExpedientes.has(expStr)) {
      filasDuplicadas++;
      registrosConError.push({
        fila: filaNum,
        numero_expediente: expStr,
        error: `Número de expediente duplicado: "${expStr}"`,
        datosBrutos: row
      });
      return;
    }

    // Error 3: Empty or missing description
    if (!descStr) {
      filasSinDescripcion++;
      registrosConError.push({
        fila: filaNum,
        numero_expediente: expStr,
        error: 'La descripción de la radicación está vacía',
        datosBrutos: row
      });
      return;
    }

    // Error 4: Description too short (< 10 chars)
    if (descStr.length < 10) {
      registrosConError.push({
        fila: filaNum,
        numero_expediente: expStr,
        error: `Descripción demasiado corta (${descStr.length} caracteres), requiere al menos 10`,
        datosBrutos: row
      });
      return;
    }

    // Extract additional columns to preserve
    const columnasAdicionales: Record<string, any> = {};
    for (const [key, val] of Object.entries(row)) {
      if (key !== expedienteCol && key !== resumenCol && key !== descripcionCol) {
        columnasAdicionales[key] = val;
      }
    }

    seenExpedientes.add(expStr);

    const descNormalizada = normalizeText(descStr);

    registrosValidos.push({
      id: `pqrs_${index + 1}_${Date.now()}`,
      numero_expediente: expStr,
      resumen_original: resumenStr,
      descripcion_original: descStr,
      descripcion_normalizada: descNormalizada,
      fecha_carga: new Date().toISOString(),
      archivo_origen: archivoNombre,
      hash_descripcion: hashText(descNormalizada),
      columnas_adicionales: columnasAdicionales,
      estado_procesamiento: 'PENDIENTE'
    });
  });

  return {
    totalFilas: rows.length,
    totalColumnas: rows.length > 0 ? Object.keys(rows[0]).length : 0,
    filasValidas: registrosValidos.length,
    filasConError: registrosConError.length,
    filasSinDescripcion,
    filasSinExpediente,
    filasDuplicadas,
    registrosValidos,
    registrosConError
  };
}
