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

  let filasSinDescripcion = 0;
  let filasSinExpediente = 0;
  let filasDuplicadas = 0;
  const seenExpedientes = new Map<string, number>();

  rows.forEach((row, index) => {
    const filaNum = index + 2; // Row index in Excel (header is row 1)

    // Check if the row is completely empty across all columns
    const filledValues = Object.values(row).filter(
      v => v !== null && v !== undefined && String(v).trim() !== ''
    );
    if (filledValues.length === 0) {
      // Skip completely empty blank rows
      return;
    }

    const rawExp = row[expedienteCol];
    const rawDesc = row[descripcionCol];
    const rawResumen = resumenCol ? row[resumenCol] : '';

    let expStr = rawExp !== null && rawExp !== undefined ? String(rawExp).trim() : '';
    const descStr = rawDesc !== null && rawDesc !== undefined ? String(rawDesc).trim() : '';
    const resumenStr = rawResumen !== null && rawResumen !== undefined ? String(rawResumen).trim() : '';

    // If NO_SS / expediente is empty, preserve row by assigning placeholder
    if (!expStr) {
      filasSinExpediente++;
      expStr = `EXP_SIN_NO_SS_${filaNum}`;
    }

    // Check duplicate count for diagnostics without discarding
    if (seenExpedientes.has(expStr)) {
      filasDuplicadas++;
      seenExpedientes.set(expStr, seenExpedientes.get(expStr)! + 1);
    } else {
      seenExpedientes.set(expStr, 1);
    }

    // Flag empty description for diagnostics (record is NOT dropped, will go to REVISIÓN HUMANA)
    if (!descStr || descStr.toLowerCase() === 'descripcion') {
      filasSinDescripcion++;
    }

    // Preserve all original columns intact (including NO_SS, SUBMOTIVO, NOMBRE_PRODUCTO, FECHA_RADICACION, FECHA_DE_COMPROMISO)
    const columnasAdicionales: Record<string, any> = {};
    for (const [key, val] of Object.entries(row)) {
      columnasAdicionales[key] = val;
    }

    const descNormalizada = normalizeText(descStr);

    // Each Excel row generates exactly ONE PQRSRecord
    registrosValidos.push({
      id: `pqrs_${filaNum}_${Date.now()}_${index}`,
      numero_expediente: expStr,
      resumen_original: resumenStr,
      descripcion_original: descStr,
      descripcion_normalizada: descNormalizada,
      fecha_carga: new Date().toISOString(),
      archivo_origen: archivoNombre,
      hash_descripcion: hashText(descNormalizada || `empty_${filaNum}`),
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
