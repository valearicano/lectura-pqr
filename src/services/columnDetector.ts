import { ColumnDetectionResult } from '../types';

export function detectColumns(headers: string[]): ColumnDetectionResult {
  const normalizedHeaders = headers.map(h => ({
    original: h,
    clean: h.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents for matching
  }));

  const expedienteKeywords = [
    'numero expediente', 'número expediente', 'numero_expediente', 'expediente',
    'numero radicado', 'número radicado', 'numero_radicado', 'radicado',
    'id expediente', 'id_expediente', 'id', 'radicacion', 'nro expediente',
    'nro radicado', 'caso_id', 'caso', 'ticket', 'folio'
  ];

  const resumenKeywords = [
    'resumen pqrs', 'resumen', 'asunto', 'tema', 'descripcion corta',
    'descripción corta', 'motivo corto', 'titulo', 'asunto caso', 'subtema'
  ];

  const descripcionKeywords = [
    'descripcion de la radicacion', 'descripción de la radicación',
    'descripcion radicacion', 'descripción radicación', 'descripcion de la solicitud',
    'descripcion del caso', 'descripción del caso', 'detalle de la solicitud',
    'texto pqrs', 'descripcion completa', 'descripción completa', 'solicitud',
    'detalle', 'descripcion', 'descripción', 'motivo', 'hechos', 'texto',
    'cuerpo', 'observaciones'
  ];

  let detectedExpediente = '';
  let detectedResumen = '';
  let detectedDescripcion = '';

  // 1. Match Expediente
  for (const kw of expedienteKeywords) {
    const match = normalizedHeaders.find(h => h.clean === kw || h.clean.includes(kw));
    if (match) {
      detectedExpediente = match.original;
      break;
    }
  }

  // 2. Match Descripcion (prioritize longer phrases like "descripcion de la radicacion" before generic "descripcion")
  for (const kw of descripcionKeywords) {
    const match = normalizedHeaders.find(h => h.clean === kw || h.clean.includes(kw));
    if (match && match.original !== detectedExpediente) {
      detectedDescripcion = match.original;
      break;
    }
  }

  // 3. Match Resumen
  for (const kw of resumenKeywords) {
    const match = normalizedHeaders.find(h => h.clean === kw || h.clean.includes(kw));
    if (match && match.original !== detectedExpediente && match.original !== detectedDescripcion) {
      detectedResumen = match.original;
      break;
    }
  }

  // Fallbacks if not detected
  if (!detectedExpediente && headers.length > 0) {
    detectedExpediente = headers[0];
  }
  if (!detectedDescripcion && headers.length > 1) {
    // Pick the header with 'desc' or longest average content, or last column
    const fallbackDesc = headers.find(h => h !== detectedExpediente && h !== detectedResumen);
    detectedDescripcion = fallbackDesc || (headers[1] || headers[0]);
  }
  if (!detectedResumen) {
    const fallbackResumen = headers.find(h => h !== detectedExpediente && h !== detectedDescripcion);
    detectedResumen = fallbackResumen || '';
  }

  return {
    expedienteCol: detectedExpediente,
    resumenCol: detectedResumen,
    descripcionCol: detectedDescripcion,
    todasLasColumnas: headers,
    confianzaDeteccion: {
      expediente: Boolean(detectedExpediente),
      resumen: Boolean(detectedResumen),
      descripcion: Boolean(detectedDescripcion)
    }
  };
}
