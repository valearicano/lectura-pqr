import { ColumnDetectionResult } from '../types';

export function detectColumns(headers: string[]): ColumnDetectionResult {
  const normalizedHeaders = headers.map(h => ({
    original: h,
    clean: h.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents for matching
  }));

  const expedienteKeywords = [
    'numero_expediente', 'numero expediente', 'número expediente', 'expediente',
    'numero_radicado', 'numero radicado', 'número radicado', 'radicado',
    'id_expediente', 'id expediente', 'id', 'radicacion', 'nro_expediente',
    'nro radicado', 'caso_id', 'caso', 'ticket', 'folio'
  ];

  const descripcionKeywords = [
    'desc_detallada', 'desc detallada', 'descripcion_detallada', 'descripción detallada',
    'descripcion_de_la_radicacion', 'descripción de la radicación',
    'descripcion_radicacion', 'descripción radicación', 'descripcion_de_la_solicitud',
    'descripcion_del_caso', 'descripción del caso', 'detalle_de_la_solicitud',
    'texto_pqrs', 'descripcion_completa', 'descripción completa', 'solicitud',
    'detalle', 'descripcion', 'descripción', 'hechos', 'texto',
    'cuerpo', 'observaciones'
  ];

  const submotivoKeywords = [
    'submotivo', 'sub_motivo', 'sub motivo', 'submotivo_original', 'motivo_secundario',
    'resumen pqrs', 'resumen', 'asunto', 'tema', 'descripcion corta',
    'descripción corta', 'motivo corto', 'titulo', 'asunto caso', 'subtema', 'motivo'
  ];

  const productoKeywords = [
    'nombre_producto', 'nombre producto', 'nom_producto', 'producto',
    'tipo_producto', 'producto_servicio', 'servicio'
  ];

  let detectedExpediente = '';
  let detectedResumen = '';
  let detectedDescripcion = '';
  let detectedSubmotivo = '';
  let detectedProducto = '';

  // 1. Match Expediente
  for (const kw of expedienteKeywords) {
    const match = normalizedHeaders.find(h => h.clean === kw || h.clean.replace(/[_\s]/g, '') === kw.replace(/[_\s]/g, ''));
    if (match) {
      detectedExpediente = match.original;
      break;
    }
  }

  // 2. Match Descripcion (DESC_DETALLADA has highest priority)
  for (const kw of descripcionKeywords) {
    const match = normalizedHeaders.find(h => h.clean === kw || h.clean.replace(/[_\s]/g, '') === kw.replace(/[_\s]/g, ''));
    if (match && match.original !== detectedExpediente) {
      detectedDescripcion = match.original;
      break;
    }
  }

  // 3. Match Submotivo / Resumen
  for (const kw of submotivoKeywords) {
    const match = normalizedHeaders.find(h => h.clean === kw || h.clean.replace(/[_\s]/g, '') === kw.replace(/[_\s]/g, ''));
    if (match && match.original !== detectedExpediente && match.original !== detectedDescripcion) {
      detectedResumen = match.original;
      detectedSubmotivo = match.original;
      break;
    }
  }

  // 4. Match Producto (NOMBRE_PRODUCTO)
  for (const kw of productoKeywords) {
    const match = normalizedHeaders.find(h => h.clean === kw || h.clean.replace(/[_\s]/g, '') === kw.replace(/[_\s]/g, ''));
    if (match && match.original !== detectedExpediente && match.original !== detectedDescripcion && match.original !== detectedResumen) {
      detectedProducto = match.original;
      break;
    }
  }

  // Fallbacks if not detected
  if (!detectedExpediente && headers.length > 0) {
    detectedExpediente = headers[0];
  }
  if (!detectedDescripcion && headers.length > 1) {
    const fallbackDesc = headers.find(h => h !== detectedExpediente && h !== detectedResumen && h !== detectedProducto);
    detectedDescripcion = fallbackDesc || (headers[1] || headers[0]);
  }
  if (!detectedResumen) {
    const fallbackResumen = headers.find(h => h !== detectedExpediente && h !== detectedDescripcion && h !== detectedProducto);
    detectedResumen = fallbackResumen || '';
    detectedSubmotivo = detectedResumen;
  }

  return {
    expedienteCol: detectedExpediente,
    resumenCol: detectedResumen,
    descripcionCol: detectedDescripcion,
    submotivoCol: detectedSubmotivo,
    productoCol: detectedProducto,
    todasLasColumnas: headers,
    confianzaDeteccion: {
      expediente: Boolean(detectedExpediente),
      resumen: Boolean(detectedResumen),
      descripcion: Boolean(detectedDescripcion),
      submotivo: Boolean(detectedSubmotivo),
      producto: Boolean(detectedProducto)
    }
  };
}
