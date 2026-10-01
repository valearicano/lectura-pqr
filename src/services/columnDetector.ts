import { ColumnDetectionResult } from '../types';

export function detectColumns(headers: string[]): ColumnDetectionResult {
  const normalizedHeaders = headers.map(h => ({
    original: h,
    clean: h.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), // remove accents
    rawNoSpecial: h.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
  }));

  // Match NO_SS and common ticket/expediente headers
  const expedienteKeywords = [
    'no_ss', 'noss', 'no ss', 'no. ss', 'num_ss', 'num ss', 'numero_ss', 'numero ss',
    'ss', 'numero_solicitud_servicio', 'solicitud_servicio', 'solicitud servicio',
    'numero_expediente', 'numero expediente', 'número expediente', 'expediente',
    'numero_radicado', 'numero radicado', 'número radicado', 'radicado',
    'id_expediente', 'id expediente', 'id', 'radicacion', 'nro_expediente',
    'nro radicado', 'caso_id', 'caso', 'ticket', 'folio', 'identificador'
  ];

  // Match DESC_DETALLADA and common detail headers
  const descripcionKeywords = [
    'desc_detallada', 'descdetallada', 'desc detallada', 'descripcion_detallada',
    'descripción detallada', 'descripcion detallada', 'descripcion_de_la_radicacion',
    'descripción de la radicación', 'descripcion_radicacion', 'descripción radicación',
    'descripcion_de_la_solicitud', 'descripcion_del_caso', 'descripción del caso',
    'detalle_de_la_solicitud', 'texto_pqrs', 'descripcion_completa',
    'descripción completa', 'solicitud', 'detalle', 'descripcion', 'descripción',
    'hechos', 'texto', 'cuerpo', 'observaciones'
  ];

  // Match SUBMOTIVO / Resumen
  const submotivoKeywords = [
    'submotivo', 'sub_motivo', 'sub motivo', 'submotivo_original', 'motivo_secundario',
    'resumen_pqrs', 'resumen pqrs', 'resumen', 'asunto', 'tema', 'descripcion corta',
    'descripción corta', 'motivo corto', 'titulo', 'asunto caso', 'subtema', 'motivo'
  ];

  // Match NOMBRE_PRODUCTO / Producto
  const productoKeywords = [
    'nombre_producto', 'nombre producto', 'nom_producto', 'nombreproducto',
    'producto', 'tipo_producto', 'producto_servicio', 'servicio'
  ];

  // Match FECHA_RADICACION
  const fechaRadicacionKeywords = [
    'fecha_radicacion', 'fecha radicacion', 'fecharadicacion', 'fecha_de_radicacion',
    'fecha de radicacion', 'fecha_radicado', 'fecha_apertura', 'fecha_ingreso', 'fecha'
  ];

  // Match FECHA_DE_COMPROMISO
  const fechaCompromisoKeywords = [
    'fecha_de_compromiso', 'fecha de compromiso', 'fechadecompromiso', 'fecha_compromiso',
    'fecha compromiso', 'fechacompromiso', 'compromiso', 'fecha_limite', 'fecha limite',
    'fecha_vencimiento', 'fecha vencimiento'
  ];

  let detectedExpediente = '';
  let detectedResumen = '';
  let detectedDescripcion = '';
  let detectedSubmotivo = '';
  let detectedProducto = '';
  let detectedFechaRadicacion = '';
  let detectedFechaCompromiso = '';

  // 1. Match Expediente (NO_SS prioritized)
  for (const kw of expedienteKeywords) {
    const kwClean = kw.replace(/[^a-z0-9]/g, '');
    const match = normalizedHeaders.find(h => h.clean === kw || h.rawNoSpecial === kwClean);
    if (match) {
      detectedExpediente = match.original;
      break;
    }
  }

  // 2. Match Descripcion (DESC_DETALLADA prioritized)
  for (const kw of descripcionKeywords) {
    const kwClean = kw.replace(/[^a-z0-9]/g, '');
    const match = normalizedHeaders.find(h => (h.clean === kw || h.rawNoSpecial === kwClean) && h.original !== detectedExpediente);
    if (match) {
      detectedDescripcion = match.original;
      break;
    }
  }

  // 3. Match Submotivo
  for (const kw of submotivoKeywords) {
    const kwClean = kw.replace(/[^a-z0-9]/g, '');
    const match = normalizedHeaders.find(h => 
      (h.clean === kw || h.rawNoSpecial === kwClean) && 
      h.original !== detectedExpediente && 
      h.original !== detectedDescripcion
    );
    if (match) {
      detectedSubmotivo = match.original;
      detectedResumen = match.original;
      break;
    }
  }

  // 4. Match Producto
  for (const kw of productoKeywords) {
    const kwClean = kw.replace(/[^a-z0-9]/g, '');
    const match = normalizedHeaders.find(h => 
      (h.clean === kw || h.rawNoSpecial === kwClean) && 
      h.original !== detectedExpediente && 
      h.original !== detectedDescripcion && 
      h.original !== detectedSubmotivo
    );
    if (match) {
      detectedProducto = match.original;
      break;
    }
  }

  // 5. Match Fecha Radicación
  for (const kw of fechaRadicacionKeywords) {
    const kwClean = kw.replace(/[^a-z0-9]/g, '');
    const match = normalizedHeaders.find(h => 
      (h.clean === kw || h.rawNoSpecial === kwClean) && 
      h.original !== detectedExpediente && 
      h.original !== detectedDescripcion && 
      h.original !== detectedSubmotivo &&
      h.original !== detectedProducto
    );
    if (match) {
      detectedFechaRadicacion = match.original;
      break;
    }
  }

  // 6. Match Fecha Compromiso
  for (const kw of fechaCompromisoKeywords) {
    const kwClean = kw.replace(/[^a-z0-9]/g, '');
    const match = normalizedHeaders.find(h => 
      (h.clean === kw || h.rawNoSpecial === kwClean) && 
      h.original !== detectedExpediente && 
      h.original !== detectedDescripcion && 
      h.original !== detectedSubmotivo &&
      h.original !== detectedProducto &&
      h.original !== detectedFechaRadicacion
    );
    if (match) {
      detectedFechaCompromiso = match.original;
      break;
    }
  }

  // Fallbacks if not detected
  if (!detectedExpediente && headers.length > 0) {
    detectedExpediente = headers[0];
  }
  if (!detectedDescripcion && headers.length > 1) {
    const fallbackDesc = headers.find(h => 
      h !== detectedExpediente && 
      h !== detectedSubmotivo && 
      h !== detectedProducto &&
      h !== detectedFechaRadicacion &&
      h !== detectedFechaCompromiso
    );
    detectedDescripcion = fallbackDesc || (headers[1] || headers[0]);
  }
  if (!detectedResumen) {
    detectedResumen = detectedSubmotivo || '';
  }

  return {
    expedienteCol: detectedExpediente,
    resumenCol: detectedResumen,
    descripcionCol: detectedDescripcion,
    submotivoCol: detectedSubmotivo,
    productoCol: detectedProducto,
    fechaRadicacionCol: detectedFechaRadicacion,
    fechaCompromisoCol: detectedFechaCompromiso,
    todasLasColumnas: headers,
    confianzaDeteccion: {
      expediente: Boolean(detectedExpediente),
      resumen: Boolean(detectedResumen),
      descripcion: Boolean(detectedDescripcion),
      submotivo: Boolean(detectedSubmotivo),
      producto: Boolean(detectedProducto),
      fechaRadicacion: Boolean(detectedFechaRadicacion),
      fechaCompromiso: Boolean(detectedFechaCompromiso)
    }
  };
}
