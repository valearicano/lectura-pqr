import { PQRSAnalysis } from '../types';

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
  categoria_principal: string;
  subcategoria: string;
  resumen_requerimiento: string; // Max 20 words
  intencion_cliente: string;
  confianza: number;
  requiere_revision_humana: boolean;
  motivo_de_revision?: string;
  existe_inconsistencia?: 'SI' | 'NO';
  motivo_inconsistencia?: string;
}

/**
 * Trims a text to a maximum number of words.
 */
function truncateWords(text: string, maxWords = 20): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ') + '...';
}

/**
 * Generates a clean 15-20 word summary of customer intent from description.
 */
function generateCompactSummary(desc: string, catPrincipal: string, subcat: string): string {
  if (!desc || desc.trim().length === 0) {
    return 'Sin descripción provista por el cliente.';
  }

  const clean = desc.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  // If description is already short, use it directly
  const words = clean.split(/\s+/);
  if (words.length <= 18) {
    return clean;
  }

  // Construct a direct, active intent statement
  const prefix = `Cliente solicita gestión de ${subcat.toLowerCase()}: `;
  const excerpt = clean.slice(0, 110).trim();
  return truncateWords(`${prefix}${excerpt}`, 20);
}

/**
 * Normalizes categories to the standard master catalog.
 */
export function normalizeCategoryName(raw: string): { categoria_principal: string; subcategoria: string } {
  if (!raw) return { categoria_principal: 'OTRAS', subcategoria: 'CASOS ATÍPICOS' };
  const clean = raw.trim().toUpperCase();

  // CDT
  if (clean.includes('CDT')) {
    if (clean.includes('VISUALIZ') || clean.includes('APP') || clean.includes('DESAPARECI')) {
      return { categoria_principal: 'CDT', subcategoria: 'CDT - VISUALIZACIÓN' };
    }
    if (clean.includes('RENDIMIENTO') || clean.includes('INTERES')) {
      return { categoria_principal: 'CDT', subcategoria: 'CDT - RENDIMIENTOS' };
    }
    if (clean.includes('PAGO') || clean.includes('CANCEL') || clean.includes('REDENCION') || clean.includes('VENCIMIENTO')) {
      return { categoria_principal: 'CDT', subcategoria: 'CDT - PAGO / CANCELACIÓN' };
    }
    if (clean.includes('CERTIFICADO') || clean.includes('SOPORTE') || clean.includes('DECEVAL')) {
      return { categoria_principal: 'CDT', subcategoria: 'CDT - CERTIFICADOS Y SOPORTES' };
    }
    return { categoria_principal: 'CDT', subcategoria: 'CDT - RENDIMIENTOS' };
  }

  // GMF / 4X1000
  if (clean.includes('GMF') || clean.includes('4X1000') || clean.includes('4*1000') || clean.includes('CUATRO POR MIL')) {
    if (clean.includes('DESMARCA')) return { categoria_principal: 'GMF / 4X1000', subcategoria: 'DESMARCACIÓN' };
    if (clean.includes('MARCA') || clean.includes('EXEN')) return { categoria_principal: 'GMF / 4X1000', subcategoria: 'MARCACIÓN' };
    if (clean.includes('DEVOL') || clean.includes('REINTEGRO') || clean.includes('REVERSION')) return { categoria_principal: 'GMF / 4X1000', subcategoria: 'DEVOLUCIÓN' };
    return { categoria_principal: 'GMF / 4X1000', subcategoria: 'COBRO' };
  }

  // CUOTA DE MANEJO -> COMISIONES Y COBROS
  if (clean.includes('CUOTA DE MANEJO') || clean.includes('CUOTA MANEJO')) {
    return { categoria_principal: 'COMISIONES Y COBROS', subcategoria: 'CUOTA DE MANEJO' };
  }

  // PSE -> PAGOS
  if (clean === 'PSE' || clean.includes('PSE')) {
    return { categoria_principal: 'PAGOS', subcategoria: 'PSE' };
  }

  // FRAUDE / NO RECONOCIDO -> FRAUDE Y SEGURIDAD
  if (clean.includes('FRAUDE') || clean.includes('NO RECONOCID') || clean.includes('CLONAC') || clean.includes('SUPLANT')) {
    if (clean.includes('SUPLANT') || clean.includes('CLONAC')) {
      return { categoria_principal: 'FRAUDE Y SEGURIDAD', subcategoria: 'SUPLANTACIÓN Y CLONACIÓN' };
    }
    return { categoria_principal: 'FRAUDE Y SEGURIDAD', subcategoria: 'TRANSACCIONES NO RECONOCIDAS' };
  }

  // CANALES DIGITALES
  if (clean.includes('CANAL') || clean.includes('APP') || clean.includes('PORTAL') || clean.includes('TOKEN') || clean.includes('CLAVE')) {
    if (clean.includes('FALLA') || clean.includes('ERROR') || clean.includes('PANTALLA') || clean.includes('CAIDA')) {
      return { categoria_principal: 'CANALES DIGITALES', subcategoria: 'FALLAS TECNOLÓGICAS' };
    }
    return { categoria_principal: 'CANALES DIGITALES', subcategoria: 'BANCA MÓVIL Y VIRTUAL' };
  }

  // PRODUCTOS
  if (clean.includes('CANCEL') && (clean.includes('PRODUCT') || clean.includes('CUENTA') || clean.includes('TARJETA'))) {
    return { categoria_principal: 'PRODUCTOS', subcategoria: 'CANCELACIÓN DE PRODUCTOS' };
  }
  if (clean.includes('ACTIVAC')) {
    return { categoria_principal: 'PRODUCTOS', subcategoria: 'ACTIVACIÓN DE PRODUCTOS' };
  }

  // SEGUROS
  if (clean.includes('SEGURO') || clean.includes('POLIZA')) {
    if (clean.includes('CANCEL') || clean.includes('DEVOL') || clean.includes('DESIST')) {
      return { categoria_principal: 'SEGUROS', subcategoria: 'CANCELACIÓN Y DEVOLUCIÓN' };
    }
    return { categoria_principal: 'SEGUROS', subcategoria: 'PÓLIZAS Y COBROS' };
  }

  // TARJETAS
  if (clean.includes('MILLA') || clean.includes('PUNTO') || clean.includes('LEALTAD')) {
    return { categoria_principal: 'TARJETAS', subcategoria: 'MILLAS Y PROGRAMAS DE LEALTAD' };
  }
  if (clean.includes('TARJETA') || clean.includes('PLASTICO')) {
    return { categoria_principal: 'TARJETAS', subcategoria: 'PLÁSTICO Y BLOQUEO' };
  }

  // CRÉDITOS
  if (clean.includes('CREDITO') || clean.includes('CARTERA') || clean.includes('PRESTAMO')) {
    if (clean.includes('REFINANC') || clean.includes('ACUERDO') || clean.includes('ALIVIO')) {
      return { categoria_principal: 'CRÉDITOS Y CARTERA', subcategoria: 'REFINANCIACIÓN Y ACUERDOS' };
    }
    return { categoria_principal: 'CRÉDITOS Y CARTERA', subcategoria: 'ESTADO DE OBLIGACIÓN / SALDOS' };
  }

  // PAGOS
  if (clean.includes('DEBITO AUTOMATICO') || clean.includes('DOMICILIAC')) {
    return { categoria_principal: 'PAGOS', subcategoria: 'DÉBITOS AUTOMÁTICOS' };
  }
  if (clean.includes('PAGO') || clean.includes('ABONO') || clean.includes('RECAUDO')) {
    return { categoria_principal: 'PAGOS', subcategoria: 'PAGOS Y RECAUDOS' };
  }

  // TRANSACCIONES
  if (clean.includes('TRANSFER')) {
    return { categoria_principal: 'TRANSACCIONES', subcategoria: 'TRANSFERENCIAS' };
  }
  if (clean.includes('SALDO') || clean.includes('MOVIMIENTO')) {
    return { categoria_principal: 'TRANSACCIONES', subcategoria: 'SALDOS Y MOVIMIENTOS' };
  }
  if (clean.includes('TRANSACCI')) {
    return { categoria_principal: 'TRANSACCIONES', subcategoria: 'ACLARACIÓN DE TRANSACCIONES' };
  }

  // DOCUMENTOS
  if (clean.includes('CERTIFICAD') || clean.includes('PAZ Y SALVO')) {
    return { categoria_principal: 'DOCUMENTOS Y CERTIFICACIONES', subcategoria: 'CERTIFICADOS Y PAZ Y SALVO' };
  }
  if (clean.includes('EXTRACT') || clean.includes('DOCUMENT') || clean.includes('CONTRATO')) {
    return { categoria_principal: 'DOCUMENTOS Y CERTIFICACIONES', subcategoria: 'EXTRACTOS Y DOCUMENTOS' };
  }

  // SERVICIO
  if (clean.includes('SERVICIO') || clean.includes('ATENCION') || clean.includes('ASESOR') || clean.includes('SUCURSAL')) {
    if (clean.includes('TIEMPO') || clean.includes('DEMORA')) {
      return { categoria_principal: 'SERVICIO Y ATENCIÓN', subcategoria: 'TIEMPOS DE RESPUESTA' };
    }
    return { categoria_principal: 'SERVICIO Y ATENCIÓN', subcategoria: 'ATENCIÓN ASESOR Y SUCURSAL' };
  }

  // COMISIONES Y COBROS
  if (clean.includes('COMISION') || clean.includes('COBRO') || clean.includes('TARIFA') || clean.includes('INTERES')) {
    if (clean.includes('INTERES')) {
      return { categoria_principal: 'COMISIONES Y COBROS', subcategoria: 'INTERESES' };
    }
    return { categoria_principal: 'COMISIONES Y COBROS', subcategoria: 'COMISIONES Y TARIFAS' };
  }

  // REVISIÓN HUMANA
  if (clean.includes('REVISION') || clean.includes('HUMANA') || clean.includes('INSUFICIENTE')) {
    return { categoria_principal: 'REVISIÓN HUMANA', subcategoria: 'INFORMACIÓN INSUFICIENTE' };
  }

  // OTRAS
  if (clean.includes('OTRA') || clean.includes('OTRO') || clean.includes('ATIPIC')) {
    return { categoria_principal: 'OTRAS', subcategoria: 'CASOS ATÍPICOS' };
  }

  return { categoria_principal: 'OTRAS', subcategoria: 'CASOS ATÍPICOS' };
}

/**
 * Evaluates real customer intent from DESC_DETALLADA, groups similar requests,
 * and maps to the homogeneous master catalog without ad-hoc fragmentation.
 */
export function classifyPQRDeterministic(record: PQRInputRecord): PQRClassificationResult {
  const expediente = String(record.numero_expediente || '').trim();
  const rawText = String(record.descripcion_original || '').trim();
  const lower = rawText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleanAlpha = lower.replace(/[^a-z0-9]/g, '');

  // 1. REVISIÓN HUMANA: Estrictamente si la descripción está vacía, es ruido o carece de información temática
  const isEssentiallyEmpty =
    cleanAlpha.length === 0 ||
    cleanAlpha === 'descripcion' ||
    cleanAlpha === 'descrip' ||
    cleanAlpha === 'sindescripcion' ||
    cleanAlpha === 'na' ||
    cleanAlpha === 'null' ||
    cleanAlpha === 'none' ||
    cleanAlpha === 'noaplica' ||
    cleanAlpha === 'revisar' ||
    cleanAlpha === 'revision' ||
    cleanAlpha === 'revisarmicaso' ||
    cleanAlpha === 'solicitorevisarmicaso' ||
    cleanAlpha === 'solicitorevision' ||
    cleanAlpha === 'favorrevisar' ||
    cleanAlpha === 'revisionhumana' ||
    cleanAlpha === 'revisarcaso';

  if (isEssentiallyEmpty) {
    return {
      expediente,
      categoria_principal: 'REVISIÓN HUMANA',
      subcategoria: 'INFORMACIÓN INSUFICIENTE',
      resumen_requerimiento: 'Descripción ausente o vaga sin temática identificable.',
      intencion_cliente: 'Sin información de solicitud identificable',
      confianza: 35,
      requiere_revision_humana: true,
      motivo_de_revision: 'DESC_DETALLADA carece de información sobre el producto, transacción o inconformidad del cliente.'
    };
  }

  // =========================================================================
  // EVALUACIÓN DE INTENCIÓN REAL (AGRUPACIÓN HOMOGÉNEA POR INTENCIÓN)
  // =========================================================================

  // A. INTENCIÓN: CDT
  if (lower.includes('cdt') || lower.includes('certificado de deposito') || lower.includes('deceval')) {
    let sub = 'CDT - RENDIMIENTOS';
    let intencion = 'Consulta o reclamo sobre rendimientos de CDT';
    if (lower.includes('no aparece') || lower.includes('no visualiz') || lower.includes('desapareci') || lower.includes('no encuentro') || lower.includes('app')) {
      sub = 'CDT - VISUALIZACIÓN';
      intencion = 'Problema para visualizar CDT en canales digitales';
    } else if (lower.includes('rendimiento') || lower.includes('interes') || lower.includes('liquidacion')) {
      sub = 'CDT - RENDIMIENTOS';
      intencion = 'Consulta o reclamo sobre rendimientos o intereses de CDT';
    } else if (lower.includes('pago') || lower.includes('cancel') || lower.includes('redenc') || lower.includes('vencim') || lower.includes('desembols')) {
      sub = 'CDT - PAGO / CANCELACIÓN';
      intencion = 'Redención o pago de CDT por vencimiento o cancelación';
    } else if (lower.includes('certificad') || lower.includes('soporte') || lower.includes('tributari') || lower.includes('titularidad')) {
      sub = 'CDT - CERTIFICADOS Y SOPORTES';
      intencion = 'Solicitud de certificados y soportes de CDT';
    }
    return {
      expediente,
      categoria_principal: 'CDT',
      subcategoria: sub,
      resumen_requerimiento: generateCompactSummary(rawText, 'CDT', sub),
      intencion_cliente: intencion,
      confianza: 98,
      requiere_revision_humana: false
    };
  }

  // B. INTENCIÓN: FRAUDE / SEGURIDAD (Prioridad alta en reclamaciones)
  const isFraud =
    lower.includes('no reconozco') ||
    lower.includes('no reconoce') ||
    lower.includes('no autorice') ||
    lower.includes('no autoricé') ||
    lower.includes('no autorizada') ||
    lower.includes('sin autorizacion') ||
    lower.includes('compra que no hice') ||
    lower.includes('debito que no hice') ||
    lower.includes('retiro que no hice') ||
    lower.includes('fraude') ||
    lower.includes('fraudulenta') ||
    lower.includes('clonacion') ||
    lower.includes('clonada') ||
    lower.includes('suplantacion') ||
    lower.includes('movimiento desconocido') ||
    lower.includes('operacion desconocida');

  if (isFraud) {
    const isImpersonation = lower.includes('suplantacion') || lower.includes('clonacion');
    const sub = isImpersonation ? 'SUPLANTACIÓN Y CLONACIÓN' : 'TRANSACCIONES NO RECONOCIDAS';
    return {
      expediente,
      categoria_principal: 'FRAUDE Y SEGURIDAD',
      subcategoria: sub,
      resumen_requerimiento: generateCompactSummary(rawText, 'FRAUDE Y SEGURIDAD', sub),
      intencion_cliente: 'Cliente reporta operaciones o débitos no realizados por él',
      confianza: 98,
      requiere_revision_humana: false
    };
  }

  // C. INTENCIÓN: GMF / 4X1000
  const isGMF =
    lower.includes('4x1000') ||
    lower.includes('4*1000') ||
    lower.includes('cuatro por mil') ||
    lower.includes('gmf') ||
    lower.includes('gravamen') ||
    ((lower.includes('marcar') || lower.includes('marcacion') || lower.includes('desmarcar')) && (lower.includes('cuenta') || lower.includes('exenta') || lower.includes('exento')));

  if (isGMF) {
    let sub = 'COBRO';
    let intencion = 'Inconformidad con cobro del gravamen 4x1000';
    if (lower.includes('desmarca') || lower.includes('retirar marcacion') || lower.includes('quitar marcacion') || lower.includes('quitar la marcacion') || lower.includes('eliminar marcacion')) {
      sub = 'DESMARCACIÓN';
      intencion = 'Solicitud de desmarcación de cuenta';
    } else if (lower.includes('marca') || lower.includes('exen') || lower.includes('solicito marcacion')) {
      sub = 'MARCACIÓN';
      intencion = 'Solicitud de marcación de cuenta como exenta';
    } else if (lower.includes('devol') || lower.includes('reintegro') || lower.includes('reversion')) {
      sub = 'DEVOLUCIÓN';
      intencion = 'Solicitud de devolución de 4x1000 debitado';
    }
    return {
      expediente,
      categoria_principal: 'GMF / 4X1000',
      subcategoria: sub,
      resumen_requerimiento: generateCompactSummary(rawText, 'GMF / 4X1000', sub),
      intencion_cliente: intencion,
      confianza: 98,
      requiere_revision_humana: false
    };
  }

  // D. INTENCIÓN: CUOTA DE MANEJO -> COMISIONES Y COBROS
  // Regla: "Agrupa por intención, no por palabras"
  const isCuotaManejo =
    lower.includes('cuota de manejo') ||
    lower.includes('cuotas de manejo') ||
    lower.includes('cuota manejo') ||
    lower.includes('cobro de cuota') ||
    lower.includes('cobro cuota') ||
    lower.includes('cuota mensual') ||
    (lower.includes('reversen el cobro') && lower.includes('cuenta'));

  if (isCuotaManejo) {
    return {
      expediente,
      categoria_principal: 'COMISIONES Y COBROS',
      subcategoria: 'CUOTA DE MANEJO',
      resumen_requerimiento: generateCompactSummary(rawText, 'COMISIONES Y COBROS', 'CUOTA DE MANEJO'),
      intencion_cliente: 'Inconformidad o solicitud de devolución sobre cuota de manejo',
      confianza: 98,
      requiere_revision_humana: false
    };
  }

  // E. INTENCIÓN: DOCUMENTOS Y CERTIFICACIONES (Paz y salvo, certificados, extractos)
  // Evaluado antes de créditos y transacciones para no perder la intención documental
  if (lower.includes('paz y salvo') || lower.includes('certificacion') || lower.includes('certificado') || lower.includes('extracto') || lower.includes('copia de contrato') || lower.includes('pagare') || lower.includes('derecho de peticion')) {
    const isCert = lower.includes('certificado') || lower.includes('certificacion') || lower.includes('paz y salvo');
    const sub = isCert ? 'CERTIFICADOS Y PAZ Y SALVO' : 'EXTRACTOS Y DOCUMENTOS';
    return {
      expediente,
      categoria_principal: 'DOCUMENTOS Y CERTIFICACIONES',
      subcategoria: sub,
      resumen_requerimiento: generateCompactSummary(rawText, 'DOCUMENTOS Y CERTIFICACIONES', sub),
      intencion_cliente: 'Solicitud de emisión o envío de documentos bancarios',
      confianza: 96,
      requiere_revision_humana: false
    };
  }

  // F. INTENCIÓN: CANCELACIÓN DE PRODUCTOS
  if ((lower.includes('cancel') || lower.includes('cierre') || lower.includes('terminar contrato')) &&
      (lower.includes('cuenta') || lower.includes('tarjeta') || lower.includes('credito') || lower.includes('leasing') || lower.includes('producto'))) {
    return {
      expediente,
      categoria_principal: 'PRODUCTOS',
      subcategoria: 'CANCELACIÓN DE PRODUCTOS',
      resumen_requerimiento: generateCompactSummary(rawText, 'PRODUCTOS', 'CANCELACIÓN DE PRODUCTOS'),
      intencion_cliente: 'Cliente desea cancelar o cerrar definitivamente un producto',
      confianza: 96,
      requiere_revision_humana: false
    };
  }

  // G. INTENCIÓN: CONDICIONES O BENEFICIOS DEL PRODUCTO
  if (lower.includes('tasa') || lower.includes('condicion') || lower.includes('beneficio') || lower.includes('cambio de condiciones') || lower.includes('migrada')) {
    return {
      expediente,
      categoria_principal: 'PRODUCTOS',
      subcategoria: 'CONDICIONES DEL PRODUCTO',
      resumen_requerimiento: generateCompactSummary(rawText, 'PRODUCTOS', 'CONDICIONES DEL PRODUCTO'),
      intencion_cliente: 'Aclaración de tasas, beneficios o condiciones contractuales',
      confianza: 94,
      requiere_revision_humana: false
    };
  }

  // H. INTENCIÓN: ACTIVACIÓN DE PRODUCTOS
  if (lower.includes('activar') || lower.includes('activacion') || lower.includes('habilitar uso') || lower.includes('habilitar para uso')) {
    return {
      expediente,
      categoria_principal: 'PRODUCTOS',
      subcategoria: 'ACTIVACIÓN DE PRODUCTOS',
      resumen_requerimiento: generateCompactSummary(rawText, 'PRODUCTOS', 'ACTIVACIÓN DE PRODUCTOS'),
      intencion_cliente: 'Solicitud de activación o habilitación operativa del producto',
      confianza: 95,
      requiere_revision_humana: false
    };
  }

  // I. INTENCIÓN: CRÉDITOS Y CARTERA (Refinanciaciones y acuerdos de pago deben evaluarse antes de pagos generales)
  if (lower.includes('acuerdo de pago') || lower.includes('acuerdos de pago') || lower.includes('refinanc') || lower.includes('alivio financiero') || lower.includes('reestructuracion') || lower.includes('credito') || lower.includes('cartera') || lower.includes('prestamo') || lower.includes('libranza') || lower.includes('hipotecario')) {
    const isRefinance = lower.includes('refinanc') || lower.includes('acuerdo') || lower.includes('alivio') || lower.includes('reestructur');
    const sub = isRefinance ? 'REFINANCIACIÓN Y ACUERDOS' : 'ESTADO DE OBLIGACIÓN / SALDOS';
    return {
      expediente,
      categoria_principal: 'CRÉDITOS Y CARTERA',
      subcategoria: sub,
      resumen_requerimiento: generateCompactSummary(rawText, 'CRÉDITOS Y CARTERA', sub),
      intencion_cliente: 'Consulta o gestión de obligación crediticia o acuerdo de pago',
      confianza: 96,
      requiere_revision_humana: false
    };
  }

  // H. INTENCIÓN: CANALES DIGITALES (App, Portal, Token, Errores técnicos)
  if (lower.includes('app') || lower.includes('portal') || lower.includes('banca virtual') || lower.includes('token') || lower.includes('otp') || lower.includes('clave') || lower.includes('usuario')) {
    const isTechGlitch = lower.includes('falla') || lower.includes('pantalla') || lower.includes('caida') || lower.includes('lentitud') || lower.includes('error');
    const sub = isTechGlitch ? 'FALLAS TECNOLÓGICAS' : 'BANCA MÓVIL Y VIRTUAL';
    return {
      expediente,
      categoria_principal: 'CANALES DIGITALES',
      subcategoria: sub,
      resumen_requerimiento: generateCompactSummary(rawText, 'CANALES DIGITALES', sub),
      intencion_cliente: 'Dificultad de acceso o falla operativa en canal digital',
      confianza: 95,
      requiere_revision_humana: false
    };
  }

  // I. INTENCIÓN: PSE -> PAGOS
  if (/\bpse\b/i.test(lower) || lower.includes('pasarela pse')) {
    return {
      expediente,
      categoria_principal: 'PAGOS',
      subcategoria: 'PSE',
      resumen_requerimiento: generateCompactSummary(rawText, 'PAGOS', 'PSE'),
      intencion_cliente: 'Transacción, soporte o débito en pasarela PSE',
      confianza: 98,
      requiere_revision_humana: false
    };
  }

  // J. INTENCIÓN: DÉBITOS AUTOMÁTICOS -> PAGOS
  if (lower.includes('debito automatico') || lower.includes('debitos automaticos') || lower.includes('domiciliac')) {
    return {
      expediente,
      categoria_principal: 'PAGOS',
      subcategoria: 'DÉBITOS AUTOMÁTICOS',
      resumen_requerimiento: generateCompactSummary(rawText, 'PAGOS', 'DÉBITOS AUTOMÁTICOS'),
      intencion_cliente: 'Gestión o inconformidad con débito automático',
      confianza: 96,
      requiere_revision_humana: false
    };
  }

  // K. INTENCIÓN: PAGOS Y RECAUDOS
  if (lower.includes('pago') || lower.includes('abono') || lower.includes('consignacion') || lower.includes('recaudo') || lower.includes('factura')) {
    return {
      expediente,
      categoria_principal: 'PAGOS',
      subcategoria: 'PAGOS Y RECAUDOS',
      resumen_requerimiento: generateCompactSummary(rawText, 'PAGOS', 'PAGOS Y RECAUDOS'),
      intencion_cliente: 'Aplicación o validación de pago o abono realizado',
      confianza: 95,
      requiere_revision_humana: false
    };
  }

  // L. INTENCIÓN: TRANSFERENCIAS -> TRANSACCIONES
  if (lower.includes('transferencia') || lower.includes('transferir') || lower.includes('transferi') || lower.includes('ach') || lower.includes('bre-b') || lower.includes('giro')) {
    return {
      expediente,
      categoria_principal: 'TRANSACCIONES',
      subcategoria: 'TRANSFERENCIAS',
      resumen_requerimiento: generateCompactSummary(rawText, 'TRANSACCIONES', 'TRANSFERENCIAS'),
      intencion_cliente: 'Problema o retraso con transferencia de dinero',
      confianza: 96,
      requiere_revision_humana: false
    };
  }

  // M. INTENCIÓN: ACLARACIÓN DE TRANSACCIONES -> TRANSACCIONES
  if (lower.includes('aclaracion') || lower.includes('explicacion de movimiento') || lower.includes('nota debito') || lower.includes('nota credito') || lower.includes('cajero') || lower.includes('operacion no clara')) {
    return {
      expediente,
      categoria_principal: 'TRANSACCIONES',
      subcategoria: 'ACLARACIÓN DE TRANSACCIONES',
      resumen_requerimiento: generateCompactSummary(rawText, 'TRANSACCIONES', 'ACLARACIÓN DE TRANSACCIONES'),
      intencion_cliente: 'Solicitud de aclaración sobre operación transaccional',
      confianza: 94,
      requiere_revision_humana: false
    };
  }

  // N. INTENCIÓN: SALDOS Y MOVIMIENTOS -> TRANSACCIONES
  if (lower.includes('saldo') || lower.includes('movimiento') || lower.includes('diferencia') || lower.includes('no reflejado')) {
    return {
      expediente,
      categoria_principal: 'TRANSACCIONES',
      subcategoria: 'SALDOS Y MOVIMIENTOS',
      resumen_requerimiento: generateCompactSummary(rawText, 'TRANSACCIONES', 'SALDOS Y MOVIMIENTOS'),
      intencion_cliente: 'Revisión de saldos o inconsistencias en movimientos',
      confianza: 94,
      requiere_revision_humana: false
    };
  }

  // O. INTENCIÓN: MILLAS Y BENEFICIOS -> TARJETAS
  if (lower.includes('milla') || lower.includes('puntos') || lower.includes('canje') || lower.includes('lealtad') || lower.includes('lifemiles')) {
    return {
      expediente,
      categoria_principal: 'TARJETAS',
      subcategoria: 'MILLAS Y PROGRAMAS DE LEALTAD',
      resumen_requerimiento: generateCompactSummary(rawText, 'TARJETAS', 'MILLAS Y PROGRAMAS DE LEALTAD'),
      intencion_cliente: 'Gestión o reclamo sobre millas o puntos acumulados',
      confianza: 96,
      requiere_revision_humana: false
    };
  }

  // P. INTENCIÓN: PLÁSTICO Y BLOQUEO -> TARJETAS
  if (lower.includes('tarjeta') || lower.includes('plastico') || lower.includes('entrega de tarjeta') || lower.includes('bloqueo de tarjeta') || lower.includes('cupo')) {
    return {
      expediente,
      categoria_principal: 'TARJETAS',
      subcategoria: 'PLÁSTICO Y BLOQUEO',
      resumen_requerimiento: generateCompactSummary(rawText, 'TARJETAS', 'PLÁSTICO Y BLOQUEO'),
      intencion_cliente: 'Gestión operativa, entrega o cupo de tarjeta física',
      confianza: 95,
      requiere_revision_humana: false
    };
  }

  // Q. INTENCIÓN: SEGUROS
  if (lower.includes('seguro') || lower.includes('poliza') || lower.includes('aseguradora')) {
    const isCancel = lower.includes('cancel') || lower.includes('devol') || lower.includes('desistir');
    const sub = isCancel ? 'CANCELACIÓN Y DEVOLUCIÓN' : 'PÓLIZAS Y COBROS';
    return {
      expediente,
      categoria_principal: 'SEGUROS',
      subcategoria: sub,
      resumen_requerimiento: generateCompactSummary(rawText, 'SEGUROS', sub),
      intencion_cliente: 'Reclamación o trámite referente a pólizas de seguro',
      confianza: 96,
      requiere_revision_humana: false
    };
  }

  // R. INTENCIÓN: CRÉDITOS Y CARTERA
  if (lower.includes('credito') || lower.includes('cartera') || lower.includes('prestamo') || lower.includes('libranza') || lower.includes('hipotecario')) {
    const isRefinance = lower.includes('refinanc') || lower.includes('acuerdo') || lower.includes('alivio') || lower.includes('reestructur');
    const sub = isRefinance ? 'REFINANCIACIÓN Y ACUERDOS' : 'ESTADO DE OBLIGACIÓN / SALDOS';
    return {
      expediente,
      categoria_principal: 'CRÉDITOS Y CARTERA',
      subcategoria: sub,
      resumen_requerimiento: generateCompactSummary(rawText, 'CRÉDITOS Y CARTERA', sub),
      intencion_cliente: 'Consulta o gestión de obligación crediticia',
      confianza: 94,
      requiere_revision_humana: false
    };
  }

  // S. INTENCIÓN: DOCUMENTOS Y CERTIFICACIONES
  if (lower.includes('certificado') || lower.includes('paz y salvo') || lower.includes('extracto') || lower.includes('contrato') || lower.includes('pagare') || lower.includes('documento')) {
    const isCert = lower.includes('certificado') || lower.includes('paz y salvo');
    const sub = isCert ? 'CERTIFICADOS Y PAZ Y SALVO' : 'EXTRACTOS Y DOCUMENTOS';
    return {
      expediente,
      categoria_principal: 'DOCUMENTOS Y CERTIFICACIONES',
      subcategoria: sub,
      resumen_requerimiento: generateCompactSummary(rawText, 'DOCUMENTOS Y CERTIFICACIONES', sub),
      intencion_cliente: 'Solicitud de emisión o envío de documentos bancarios',
      confianza: 95,
      requiere_revision_humana: false
    };
  }

  // T. INTENCIÓN: SERVICIO Y ATENCIÓN
  if (lower.includes('atencion') || lower.includes('servicio') || lower.includes('asesor') || lower.includes('sucursal') || lower.includes('oficina') || lower.includes('mal trato') || lower.includes('tiempo de espera') || lower.includes('tiempos de respuesta') || lower.includes('demora') || lower.includes('sin respuesta') || lower.includes('radicado sin')) {
    const isTime = lower.includes('tiempo') || lower.includes('demora') || lower.includes('plazo') || lower.includes('sin respuesta');
    const sub = isTime ? 'TIEMPOS DE RESPUESTA' : 'ATENCIÓN ASESOR Y SUCURSAL';
    return {
      expediente,
      categoria_principal: 'SERVICIO Y ATENCIÓN',
      subcategoria: sub,
      resumen_requerimiento: generateCompactSummary(rawText, 'SERVICIO Y ATENCIÓN', sub),
      intencion_cliente: 'Inconformidad con la calidad del servicio o tiempos',
      confianza: 92,
      requiere_revision_humana: false
    };
  }

  // U. COMISIONES Y TARIFAS GENERALES
  if (lower.includes('cobro') || lower.includes('comision') || lower.includes('tarifa') || lower.includes('cargo')) {
    return {
      expediente,
      categoria_principal: 'COMISIONES Y COBROS',
      subcategoria: 'COMISIONES Y TARIFAS',
      resumen_requerimiento: generateCompactSummary(rawText, 'COMISIONES Y COBROS', 'COMISIONES Y TARIFAS'),
      intencion_cliente: 'Aclaración o reclamo sobre cargos o comisiones',
      confianza: 90,
      requiere_revision_humana: false
    };
  }

  // V. Caso residual con texto legítimo
  if (cleanAlpha.length >= 8) {
    return {
      expediente,
      categoria_principal: 'OTRAS',
      subcategoria: 'CASOS ATÍPICOS',
      resumen_requerimiento: generateCompactSummary(rawText, 'OTRAS', 'CASOS ATÍPICOS'),
      intencion_cliente: 'Requerimiento bancario no encasillado en categorías estándar',
      confianza: 85,
      requiere_revision_humana: false
    };
  }

  return {
    expediente,
    categoria_principal: 'REVISIÓN HUMANA',
    subcategoria: 'INFORMACIÓN INSUFICIENTE',
    resumen_requerimiento: 'Texto insuficiente para determinar intención.',
    intencion_cliente: 'Revisión manual requerida',
    confianza: 40,
    requiere_revision_humana: true,
    motivo_de_revision: 'El caso contiene menos de 8 caracteres alfabéticos sin intención clara.'
  };
}

/**
 * Builds the complete PQRSAnalysis object incorporating Categoría Principal,
 * Subcategoría, and Resumen del Requerimiento (max 20 words).
 */
export function buildPQRSAnalysis(
  record: PQRInputRecord,
  result: PQRClassificationResult
): PQRSAnalysis {
  const catPrincipal = result.categoria_principal;
  const subcat = result.subcategoria;
  const conf = result.confianza;
  const reqRev = result.requiere_revision_humana;

  // Inconsistency check with original submotivo if present
  const submotivoOrig = (record.submotivo_original || record.resumen_original || '').toLowerCase();
  let existeInconsistencia: 'SI' | 'NO' = 'NO';
  let motivoInconsistencia: string | undefined = undefined;

  if (submotivoOrig) {
    if (catPrincipal === 'FRAUDE Y SEGURIDAD' && !submotivoOrig.includes('fraude') && !submotivoOrig.includes('no reconoc')) {
      existeInconsistencia = 'SI';
      motivoInconsistencia = `La descripción reporta una transacción no reconocida o fraude, pero el registro original decía "${record.submotivo_original || record.resumen_original}".`;
    } else if (subcat === 'CUOTA DE MANEJO' && !submotivoOrig.includes('cuota') && !submotivoOrig.includes('manejo')) {
      existeInconsistencia = 'SI';
      motivoInconsistencia = `La descripción reclama cobro de cuota de manejo, mientras que el registro original rotulaba "${record.submotivo_original || record.resumen_original}".`;
    } else if (catPrincipal === 'GMF / 4X1000' && !submotivoOrig.includes('gmf') && !submotivoOrig.includes('4x1000')) {
      existeInconsistencia = 'SI';
      motivoInconsistencia = `La descripción trata sobre el gravamen GMF / 4x1000, no contemplado en el registro original.`;
    }
  }

  const shortSummary = result.resumen_requerimiento || generateCompactSummary(record.descripcion_original, catPrincipal, subcat);

  return {
    numero_expediente: record.numero_expediente,
    categoria: catPrincipal, // Homogeneous main theme
    categoria_principal: catPrincipal,
    subcategoria: subcat,
    resumen_requerimiento: shortSummary,
    intencion_cliente: result.intencion_cliente,
    confianza: conf,
    requiere_revision_humana: reqRev ? 'SI' : 'NO',
    requiere_revision: reqRev,
    motivo_de_revision: result.motivo_de_revision,
    existe_inconsistencia: existeInconsistencia,
    posible_inconsistencia: existeInconsistencia === 'SI',
    motivo_inconsistencia: motivoInconsistencia,

    // Compact structured fields
    producto: record.producto_original || 'Identificado en descripción',
    tipo_pqr: catPrincipal === 'DOCUMENTOS Y CERTIFICACIONES' ? 'PETICIÓN' : catPrincipal === 'SERVICIO Y ATENCIÓN' ? 'QUEJA' : 'RECLAMO',
    motivo: catPrincipal,
    submotivo: subcat,
    tema_principal: catPrincipal,
    subtema: subcat,
    problema_principal: shortSummary,
    solicitud_cliente: result.intencion_cliente || shortSummary,
    que_solicita_exactamente: shortSummary,
    hechos_principales: record.descripcion_original.slice(0, 160).replace(/[\r\n]+/g, ' ').trim(),
    sustento_clasificacion: `Identificado en DESC_DETALLADA por análisis de intención: ${subcat}.`,
    resumen_normalizado: shortSummary,
    justificacion: `Agrupado bajo ${catPrincipal} > ${subcat} con base en la intención del cliente.`,
    nivel_confianza: conf >= 85 ? 'Alta' : conf >= 70 ? 'Media' : 'Baja',
    modelo_ia: 'gemini-3.8-flash',
    version_prompt: 'v3.2.0-intencion-homogenea',
    fecha_analisis: new Date().toISOString(),
    estado_revision: 'PENDIENTE'
  };
}

/**
 * Global consolidation step (Objetivo 10):
 * Audits the full list of classified records to merge fragmented subcategories,
 * normalize synonymous terms, and eliminate unnecessary 'OTRAS' or 'REVISIÓN HUMANA'.
 */
export function consolidateBatchClassifications(analyses: PQRSAnalysis[]): PQRSAnalysis[] {
  return analyses.map(item => {
    const rawCat = item.categoria || item.categoria_principal || '';
    const rawSub = item.subcategoria || '';

    // If an item fell into OTRAS or REVISIÓN HUMANA, try intent recovery from facts/summary
    if (rawCat === 'OTRAS' || (rawCat === 'REVISIÓN HUMANA' && item.hechos_principales && item.hechos_principales.length > 15)) {
      const recovered = classifyPQRDeterministic({
        numero_expediente: item.numero_expediente,
        descripcion_original: item.hechos_principales || item.problema_principal
      });
      if (recovered.categoria_principal !== 'OTRAS' && recovered.categoria_principal !== 'REVISIÓN HUMANA') {
        return buildPQRSAnalysis({
          numero_expediente: item.numero_expediente,
          descripcion_original: item.hechos_principales || item.problema_principal
        }, recovered);
      }
    }

    // Normalize any synonymous categories
    const normalized = normalizeCategoryName(`${rawCat} ${rawSub}`);
    if (normalized.categoria_principal !== rawCat || normalized.subcategoria !== rawSub) {
      return {
        ...item,
        categoria: normalized.categoria_principal,
        categoria_principal: normalized.categoria_principal,
        subcategoria: normalized.subcategoria,
        motivo: normalized.categoria_principal,
        submotivo: normalized.subcategoria,
        tema_principal: normalized.categoria_principal,
        subtema: normalized.subcategoria
      };
    }

    return item;
  });
}
