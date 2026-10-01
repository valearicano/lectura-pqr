import { CategoriaPQR16, CATEGORIAS_OFICIALES_16, PQRSAnalysis } from '../types';

export interface PQRInputRecord {
  numero_expediente: string;
  descripcion_original: string;
  resumen_original?: string;
  submotivo_original?: string;
  producto_original?: string;
  fecha_radicacion?: string;
  fecha_compromiso?: string;
  columnas_adicionales?: Record<string, any>;
}

export interface PQRClassificationResult {
  expediente: string;
  categoria: CategoriaPQR16;
  confianza: number;
  requiere_revision_humana: boolean;
  motivo_de_revision?: string;
  existe_inconsistencia?: 'SI' | 'NO';
  motivo_inconsistencia?: string;
}

/**
 * Normalizes category names to standard 16 master categories.
 * Maps synonyms like 'FRAUDE / TRANSACCIÓN NO RECONOCIDA' and 'TRANSACCIONES'.
 */
export function normalizeCategoria(raw: string): CategoriaPQR16 {
  if (!raw) return 'OTRAS';
  const clean = raw.trim().toUpperCase();

  if (clean.includes('FRAUDE') || clean.includes('NO RECONOCID') || clean.includes('NO RECONOCIDA')) {
    return 'FRAUDE / NO RECONOCIDO';
  }
  if (clean === 'PSE' || clean.includes('PSE')) {
    return 'PSE';
  }
  if (clean.includes('CUOTA DE MANEJO') || clean.includes('CUOTA MANEJO')) {
    return 'CUOTA DE MANEJO';
  }
  if (clean.includes('SEGURO')) {
    return 'SEGUROS';
  }
  if (clean.includes('GMF') || clean.includes('4X1000') || clean.includes('4*1000')) {
    return 'GMF / 4X1000';
  }
  if (clean.includes('PAGO') || clean.includes('ABONO')) {
    return 'PAGOS / ABONOS';
  }
  if (clean.includes('TRANSFERENCIA')) {
    return 'TRANSFERENCIAS';
  }
  if (clean.includes('TARJETA')) {
    return 'TARJETAS';
  }
  if (clean.includes('CRÉDITO') || clean.includes('CREDITO') || clean.includes('CARTERA')) {
    return 'CRÉDITOS / CARTERA';
  }
  if (clean.includes('TRANSACCI') || clean.includes('PROBLEMAS TRANSACCIONES')) {
    return 'PROBLEMAS TRANSACCIONES';
  }
  if (clean.includes('CUENTA')) {
    return 'CUENTAS';
  }
  if (clean.includes('COBRO') || clean.includes('CARGO')) {
    return 'COBROS / CARGOS';
  }
  if (clean.includes('DATO') || clean.includes('INFORMACI')) {
    return 'DATOS / INFORMACIÓN';
  }
  if (clean.includes('SERVICIO') || clean.includes('ATENCI')) {
    return 'SERVICIO / ATENCIÓN';
  }
  if (clean.includes('REVISI') || clean.includes('HUMANA')) {
    return 'REVISIÓN HUMANA';
  }
  return 'OTRAS';
}

/**
 * Deterministic classifier that strictly enforces the priority rules and the 16 Master Categories.
 * Fuente Principal: DESC_DETALLADA.
 * NO_SS se conserva intacto.
 */
export function classifyPQRDeterministic(record: PQRInputRecord): PQRClassificationResult {
  const expediente = String(record.numero_expediente || '').trim();
  const rawText = String(record.descripcion_original || '').trim();
  const lower = rawText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove accents for robust matching

  // Clean meaningless punctuation/spaces to test for empty or meaningless descriptions
  const cleanAlpha = lower.replace(/[^a-z0-9]/g, '');

  // 16. REVISIÓN HUMANA (ÚNICAMENTE si está vacía, solo dice "descripción", o texto insuficiente sin palabras clave)
  const isEssentiallyEmpty =
    cleanAlpha.length === 0 ||
    cleanAlpha === 'descripcion' ||
    cleanAlpha === 'descrip' ||
    cleanAlpha === 'sindescripcion' ||
    cleanAlpha === 'na' ||
    cleanAlpha === 'null' ||
    cleanAlpha === 'none' ||
    cleanAlpha === 'noaplica' ||
    cleanAlpha === 'x';

  if (isEssentiallyEmpty) {
    return {
      expediente,
      categoria: 'REVISIÓN HUMANA',
      confianza: 30,
      requiere_revision_humana: true,
      motivo_de_revision: 'DESC_DETALLADA está vacía o contiene únicamente un marcador de posición ("descripción").'
    };
  }

  // ====================================================================
  // REGLA DE PRIORIDAD ESTRICTA (1 AL 16)
  // ====================================================================

  // 1. FRAUDE / NO RECONOCIDO (Prioridad 1)
  // Palabras o expresiones clave de transacciones no autorizadas o desconocidas
  const hasFraude =
    lower.includes('no reconozco') ||
    lower.includes('no reconoce') ||
    lower.includes('no reconoci') ||
    lower.includes('no autorice') ||
    lower.includes('no autorizo') ||
    lower.includes('no autorizada') ||
    lower.includes('no autorizado') ||
    lower.includes('sin autorizacion') ||
    lower.includes('sin mi consentimiento') ||
    lower.includes('fraude') ||
    lower.includes('fraudulenta') ||
    lower.includes('fraudulento') ||
    lower.includes('compra que no hice') ||
    lower.includes('debito que no hice') ||
    lower.includes('retiro que no hice') ||
    lower.includes('movimiento desconocido') ||
    lower.includes('transaccion inusual') ||
    lower.includes('operacion desconocida') ||
    lower.includes('clonacion') ||
    lower.includes('suplantacion') ||
    lower.includes('hurto') ||
    lower.includes('robo') ||
    lower.includes('estafa');

  if (hasFraude) {
    return {
      expediente,
      categoria: 'FRAUDE / NO RECONOCIDO',
      confianza: 98,
      requiere_revision_humana: false
    };
  }

  // 2. PSE (Prioridad 2)
  // Regla Crítica: Si contiene PSE o hace referencia clara a PSE, SIEMPRE clasificar como PSE.
  // Sin importar si habla de error, pago, compra, rechazo, devolucion, etc.
  const hasPSE = /\bpse\b/i.test(lower) || lower.includes('pago seguro en linea') || lower.includes('pasarela pse');
  if (hasPSE) {
    return {
      expediente,
      categoria: 'PSE',
      confianza: 98,
      requiere_revision_humana: false
    };
  }

  // 3. CUOTA DE MANEJO (Prioridad 3)
  // Todo lo relacionado con cuota de manejo (cobro, reversión, reclamación, etc.)
  const hasCuotaManejo =
    lower.includes('cuota de manejo') ||
    lower.includes('cuotas de manejo') ||
    lower.includes('cuota manejo') ||
    lower.includes('cobro de cuota') ||
    lower.includes('cobro cuota') ||
    lower.includes('exoneracion de cuota') ||
    lower.includes('exonerar cuota') ||
    (lower.includes('cuota') && lower.includes('manejo'));

  if (hasCuotaManejo) {
    return {
      expediente,
      categoria: 'CUOTA DE MANEJO',
      confianza: 98,
      requiere_revision_humana: false
    };
  }

  // 4. SEGUROS (Prioridad 4)
  // Pólizas, seguro de vida, tarjeta, asociado a crédito, desempleo, cobro o cancelación
  const hasSeguros =
    lower.includes('seguro') ||
    lower.includes('seguros') ||
    lower.includes('poliza') ||
    lower.includes('aseguradora') ||
    lower.includes('cardif') ||
    lower.includes('sura') ||
    lower.includes('prima de seguro');

  if (hasSeguros) {
    return {
      expediente,
      categoria: 'SEGUROS',
      confianza: 97,
      requiere_revision_humana: false
    };
  }

  // 5. GMF / 4X1000 (Prioridad 5)
  // Gravamen, 4x1000, marcación o desmarcación de cuenta exenta
  const hasGMF =
    lower.includes('4x1000') ||
    lower.includes('4*1000') ||
    lower.includes('4 por 1000') ||
    lower.includes('cuatro por mil') ||
    lower.includes('gmf') ||
    lower.includes('marcacion') ||
    lower.includes('desmarcacion') ||
    lower.includes('cuenta exenta') ||
    lower.includes('exencion');

  if (hasGMF) {
    return {
      expediente,
      categoria: 'GMF / 4X1000',
      confianza: 98,
      requiere_revision_humana: false
    };
  }

  // 6. PAGOS / ABONOS (Prioridad 6)
  // Pagos, abonos, no reflejados, aplicación, reversiones, abonos a créditos
  // Nota contractual: pagos/abonos a crédito deben ir AQUÍ y no a créditos/cartera
  const hasPagosAbonos =
    lower.includes('pago') ||
    lower.includes('pagos') ||
    lower.includes('abono') ||
    lower.includes('abonos') ||
    lower.includes('aplicacion de pago') ||
    lower.includes('no aplicado') ||
    lower.includes('pago no aplicado') ||
    lower.includes('pago pendiente') ||
    lower.includes('reversion de pago') ||
    lower.includes('devolucion de pago') ||
    lower.includes('abono a credito') ||
    lower.includes('pago de obligacion') ||
    lower.includes('consignacion') ||
    lower.includes('consigne') ||
    lower.includes('pague') ||
    lower.includes('abone') ||
    lower.includes('no se refleja el pago') ||
    lower.includes('no se refleja el abono') ||
    lower.includes('dinero abonado');

  if (hasPagosAbonos) {
    return {
      expediente,
      categoria: 'PAGOS / ABONOS',
      confianza: 96,
      requiere_revision_humana: false
    };
  }

  // 7. TRANSFERENCIAS (Prioridad 7)
  // Transferencias enviadas, recibidas, retenidas, rechazadas
  const hasTransferencias =
    lower.includes('transferencia') ||
    lower.includes('transferencias') ||
    lower.includes('transferir') ||
    lower.includes('transferi') ||
    lower.includes('transfiri') ||
    lower.includes('envio de dinero') ||
    lower.includes('giro');

  if (hasTransferencias) {
    return {
      expediente,
      categoria: 'TRANSFERENCIAS',
      confianza: 95,
      requiere_revision_humana: false
    };
  }

  // 8. TARJETAS (Prioridad 8)
  // Tarjetas débito/crédito, entrega, activación, bloqueo, renovación, cupo
  const hasTarjetas =
    lower.includes('tarjeta') ||
    lower.includes('tarjetas') ||
    lower.includes('plastico') ||
    lower.includes('entrega de tarjeta') ||
    lower.includes('bloqueo de tarjeta') ||
    lower.includes('desbloqueo de tarjeta') ||
    lower.includes('activacion de tarjeta') ||
    lower.includes('renovacion de tarjeta') ||
    lower.includes('cupo de la tarjeta') ||
    lower.includes('cupo');

  if (hasTarjetas) {
    return {
      expediente,
      categoria: 'TARJETAS',
      confianza: 95,
      requiere_revision_humana: false
    };
  }

  // 9. CRÉDITOS / CARTERA (Prioridad 9)
  // Crédito, cartera, intereses, refinanciación, estado de deuda, liquidación
  const hasCreditos =
    lower.includes('credito') ||
    lower.includes('creditos') ||
    lower.includes('obligacion') ||
    lower.includes('obligaciones') ||
    lower.includes('cartera') ||
    lower.includes('intereses') ||
    lower.includes('refinanciacion') ||
    lower.includes('acuerdo de pago') ||
    lower.includes('prestamo') ||
    lower.includes('libranza') ||
    lower.includes('hipotecario') ||
    lower.includes('datacredito') ||
    lower.includes('cifin') ||
    lower.includes('centrales de riesgo');

  if (hasCreditos) {
    return {
      expediente,
      categoria: 'CRÉDITOS / CARTERA',
      confianza: 94,
      requiere_revision_humana: false
    };
  }

  // 10. PROBLEMAS TRANSACCIONES (Prioridad 10)
  // Transacciones u operaciones no fraudulentas (cajero, débito sin dinero, etc.)
  const hasTransacciones =
    lower.includes('transaccion') ||
    lower.includes('transacciones') ||
    lower.includes('operacion') ||
    lower.includes('operaciones') ||
    lower.includes('movimiento') ||
    lower.includes('movimientos') ||
    lower.includes('debito') ||
    lower.includes('cajero') ||
    lower.includes('retiro');

  if (hasTransacciones) {
    return {
      expediente,
      categoria: 'PROBLEMAS TRANSACCIONES',
      confianza: 92,
      requiere_revision_humana: false
    };
  }

  // 11. CUENTAS (Prioridad 11)
  // Cuentas bancarias de ahorros o corriente
  const hasCuentas =
    lower.includes('cuenta') ||
    lower.includes('cuentas') ||
    lower.includes('apertura de cuenta') ||
    lower.includes('cancelacion de cuenta') ||
    lower.includes('bloqueo de cuenta');

  if (hasCuentas) {
    return {
      expediente,
      categoria: 'CUENTAS',
      confianza: 91,
      requiere_revision_humana: false
    };
  }

  // 12. COBROS / CARGOS (Prioridad 12)
  // Comisiones, cobros o tarifas varias
  const hasCobros =
    lower.includes('cobro') ||
    lower.includes('cobros') ||
    lower.includes('cargo') ||
    lower.includes('cargos') ||
    lower.includes('comision') ||
    lower.includes('comisiones') ||
    lower.includes('tarifa') ||
    lower.includes('descuento');

  if (hasCobros) {
    return {
      expediente,
      categoria: 'COBROS / CARGOS',
      confianza: 90,
      requiere_revision_humana: false
    };
  }

  // 13. DATOS / INFORMACIÓN (Prioridad 13)
  // Certificados, extractos, paz y salvo, soportes, derecho de petición
  const hasDatos =
    lower.includes('certificado') ||
    lower.includes('certificados') ||
    lower.includes('soporte') ||
    lower.includes('soportes') ||
    lower.includes('paz y salvo') ||
    lower.includes('extracto') ||
    lower.includes('extractos') ||
    lower.includes('documento') ||
    lower.includes('documentos') ||
    lower.includes('informacion') ||
    lower.includes('datos') ||
    lower.includes('derecho de peticion') ||
    lower.includes('copia');

  if (hasDatos) {
    return {
      expediente,
      categoria: 'DATOS / INFORMACIÓN',
      confianza: 93,
      requiere_revision_humana: false
    };
  }

  // 14. SERVICIO / ATENCIÓN (Prioridad 14)
  // Asesoría, queja de trato, oficina, canal, portal web o app bloqueada
  const hasServicio =
    lower.includes('atencion') ||
    lower.includes('servicio') ||
    lower.includes('asesor') ||
    lower.includes('asesora') ||
    lower.includes('oficina') ||
    lower.includes('canal') ||
    lower.includes('calidad') ||
    lower.includes('mal trato') ||
    lower.includes('pesimo') ||
    lower.includes('tiempo de espera') ||
    lower.includes('bloqueo de usuario') ||
    lower.includes('clave') ||
    lower.includes('app') ||
    lower.includes('portal web') ||
    lower.includes('sucursal virtual');

  if (hasServicio) {
    return {
      expediente,
      categoria: 'SERVICIO / ATENCIÓN',
      confianza: 91,
      requiere_revision_humana: false
    };
  }

  // 15. OTRAS (Prioridad 15)
  // Texto con contenido legible pero sin temática bancaria específica identificable
  if (cleanAlpha.length >= 8) {
    return {
      expediente,
      categoria: 'OTRAS',
      confianza: 85,
      requiere_revision_humana: false
    };
  }

  // 16. REVISIÓN HUMANA (Caso límite: texto residual incomprensible de menos de 8 letras)
  return {
    expediente,
    categoria: 'REVISIÓN HUMANA',
    confianza: 40,
    requiere_revision_humana: true,
    motivo_de_revision: 'Texto de la descripción no contiene elementos suficientes para una clasificación confiable.'
  };
}

/**
 * Converts a classification result into the full PQRSAnalysis structure
 * used by all UI components without breaking backward compatibility.
 */
export function buildPQRSAnalysis(
  record: PQRInputRecord,
  result: PQRClassificationResult
): PQRSAnalysis {
  const cat = result.categoria;
  const conf = result.confianza;
  const reqRev = result.requiere_revision_humana;

  // Detect inconsistency with submotivo/producto context if present
  const submotivoOrig = (record.submotivo_original || record.resumen_original || '').toLowerCase();
  let existeInconsistencia: 'SI' | 'NO' = 'NO';
  let motivoInconsistencia: string | undefined = undefined;

  if (submotivoOrig) {
    if (cat === 'FRAUDE / NO RECONOCIDO' && !submotivoOrig.includes('fraude') && !submotivoOrig.includes('no reconoc')) {
      existeInconsistencia = 'SI';
      motivoInconsistencia = `La descripción reporta una transacción no reconocida o fraude, pero el registro original indicaba "${record.submotivo_original || record.resumen_original}".`;
    } else if (cat === 'PAGOS / ABONOS' && !submotivoOrig.includes('pago') && !submotivoOrig.includes('abono')) {
      existeInconsistencia = 'SI';
      motivoInconsistencia = `La descripción se enfoca en pagos o abonos no aplicados, mientras que el registro original rotulaba "${record.submotivo_original || record.resumen_original}".`;
    } else if (cat === 'CUOTA DE MANEJO' && !submotivoOrig.includes('cuota') && !submotivoOrig.includes('manejo')) {
      existeInconsistencia = 'SI';
      motivoInconsistencia = `La descripción reclama cobro de cuota de manejo, mientras que el registro original indicaba "${record.submotivo_original || record.resumen_original}".`;
    } else if (cat === 'PSE' && !submotivoOrig.includes('pse')) {
      existeInconsistencia = 'SI';
      motivoInconsistencia = `La descripción reporta una operación PSE, pero el registro original no lo contemplaba.`;
    }
  }

  const shortExcerpt = record.descripcion_original.slice(0, 160).replace(/[\r\n]+/g, ' ').trim();

  return {
    numero_expediente: record.numero_expediente,
    categoria: cat,
    confianza: conf,
    requiere_revision_humana: reqRev ? 'SI' : 'NO',
    requiere_revision: reqRev,
    motivo_de_revision: result.motivo_de_revision,
    existe_inconsistencia: existeInconsistencia,
    posible_inconsistencia: existeInconsistencia === 'SI',
    motivo_inconsistencia: motivoInconsistencia,

    // Compact structured fields
    producto: record.producto_original || 'Identificado en descripción',
    tipo_pqr: cat === 'DATOS / INFORMACIÓN' ? 'PETICIÓN' : cat === 'SERVICIO / ATENCIÓN' ? 'QUEJA' : 'RECLAMO',
    motivo: cat,
    submotivo: cat,
    tema_principal: cat,
    subtema: cat,
    subcategoria: cat,
    problema_principal: `Requerimiento clasificado en ${cat}.`,
    solicitud_cliente: `Gestión solicitada sobre ${cat}.`,
    que_solicita_exactamente: `Atención referente a ${cat}.`,
    hechos_principales: shortExcerpt,
    sustento_clasificacion: `Identificado en DESC_DETALLADA aplicando las reglas maestras de prioridad.`,
    resumen_normalizado: `${cat}: ${shortExcerpt.slice(0, 90)}...`,
    justificacion: `Asignado a la categoría maestra ${cat} según DESC_DETALLADA y jerarquía de prioridad.`,
    nivel_confianza: conf >= 85 ? 'Alta' : conf >= 70 ? 'Media' : 'Baja',
    modelo_ia: 'gemini-3.8-flash',
    version_prompt: 'v3.1.0-16-categorias-maestras',
    fecha_analisis: new Date().toISOString(),
    estado_revision: 'PENDIENTE'
  };
}
