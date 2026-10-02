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
 * Strictly adheres to max 20 words and focuses on what the customer claims.
 */
function generateCompactSummary(desc: string, catPrincipal: string, subcat: string): string {
  if (!desc || desc.trim().length === 0) {
    return 'Sin descripción provista por el cliente.';
  }

  const clean = desc.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  const words = clean.split(/\s+/);
  if (words.length <= 18) {
    return clean;
  }

  // Concise statement of intent under 20 words
  const excerpt = clean.slice(0, 110).trim();
  return truncateWords(`Cliente solicita gestión de ${subcat.toLowerCase()}: ${excerpt}`, 20);
}

/**
 * Normalizes categories to the standard business operational catalog.
 * Follows the 20 operational business categories explicitly.
 */
export function normalizeCategoryName(raw: string): { categoria_principal: string; subcategoria: string } {
  if (!raw) return { categoria_principal: 'OTRAS', subcategoria: 'CASOS ATÍPICOS' };
  const clean = raw.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. FRAUDES
  if (clean.includes('FRAUDE') || clean.includes('NO RECONOCID') || clean.includes('DESCONOCID') || clean.includes('SUPLANT') || clean.includes('CLONAC')) {
    if (clean.includes('SUPLANT') || clean.includes('CLONAC') || clean.includes('ROBO')) {
      return { categoria_principal: 'FRAUDES', subcategoria: 'SUPLANTACIÓN O ROBO' };
    }
    return { categoria_principal: 'FRAUDES', subcategoria: 'OPERACIÓN NO RECONOCIDA' };
  }

  // 2. PSE
  if (clean === 'PSE' || clean.includes('PSE')) {
    if (clean.includes('ERROR') || clean.includes('FALLA') || clean.includes('RECHAZ')) {
      return { categoria_principal: 'PSE', subcategoria: 'ERROR / FALLA PSE' };
    }
    if (clean.includes('SOPORTE') || clean.includes('COMPRA')) {
      return { categoria_principal: 'PSE', subcategoria: 'SOPORTE TRANSACCIONAL' };
    }
    return { categoria_principal: 'PSE', subcategoria: 'PAGO PSE' };
  }

  // 3. CDT (Only if explicitly mentions CDT)
  if (/\bCDT\b/.test(clean) || clean.includes('DEPOSITO A TERMINO') || clean.includes('DECEVAL')) {
    if (clean.includes('VISUALIZ') || clean.includes('APP') || clean.includes('DESAPARECI')) {
      return { categoria_principal: 'CDT', subcategoria: 'CDT - VISUALIZACIÓN' };
    }
    if (clean.includes('RENDIMIENTO') || clean.includes('INTERES')) {
      return { categoria_principal: 'CDT', subcategoria: 'CDT - RENDIMIENTOS' };
    }
    if (clean.includes('PAGO') || clean.includes('CANCEL') || clean.includes('REDENCION') || clean.includes('VENCIMIENTO')) {
      return { categoria_principal: 'CDT', subcategoria: 'CDT - PAGO / CANCELACIÓN' };
    }
    if (clean.includes('CERTIFICADO') || clean.includes('SOPORTE') || clean.includes('TITULARIDAD')) {
      return { categoria_principal: 'CDT', subcategoria: 'CDT - CERTIFICADOS Y SOPORTES' };
    }
    return { categoria_principal: 'CDT', subcategoria: 'CDT - RENDIMIENTOS' };
  }

  // 4. GT5
  if (clean.includes('GT5') || clean.includes('RECUP TRANX') || clean.includes('CUENTA DIA') || clean.includes('EN OFICINA') || clean.includes('NO APLICADA')) {
    if (clean.includes('EN OFICINA')) return { categoria_principal: 'GT5', subcategoria: 'CARGO A CUENTA EN OFICINA' };
    if (clean.includes('CUENTA DIA')) return { categoria_principal: 'GT5', subcategoria: 'CARGO CUENTA DÍA' };
    if (clean.includes('RECUP TRANX') || clean.includes('RECUPER')) return { categoria_principal: 'GT5', subcategoria: 'RECUP TRANX' };
    return { categoria_principal: 'GT5', subcategoria: 'TRANSACCIÓN NO APLICADA' };
  }

  // 5. GMF
  if (clean.includes('GMF') || clean.includes('4X1000') || clean.includes('4*1000') || clean.includes('CUATRO POR MIL')) {
    if (clean.includes('DESMARCA')) return { categoria_principal: 'GMF', subcategoria: 'DESMARCACIÓN' };
    if (clean.includes('MARCA') || clean.includes('EXEN')) return { categoria_principal: 'GMF', subcategoria: 'MARCACIÓN' };
    if (clean.includes('DEVOL') || clean.includes('REINTEGRO') || clean.includes('REVERSION')) return { categoria_principal: 'GMF', subcategoria: 'DEVOLUCIÓN' };
    return { categoria_principal: 'GMF', subcategoria: 'COBRO' };
  }

  // 6. CUOTA DE MANEJO
  if (clean.includes('CUOTA DE MANEJO') || clean.includes('CUOTA MANEJO')) {
    if (clean.includes('DEVOL') || clean.includes('REVERSION')) return { categoria_principal: 'CUOTA DE MANEJO', subcategoria: 'DEVOLUCIÓN / REVERSIÓN' };
    if (clean.includes('EXONERAC') || clean.includes('RECLAM')) return { categoria_principal: 'CUOTA DE MANEJO', subcategoria: 'RECLAMACIÓN / INCONFORMIDAD' };
    return { categoria_principal: 'CUOTA DE MANEJO', subcategoria: 'COBRO' };
  }

  // 7. SEGUROS
  if (clean.includes('SEGURO') || clean.includes('POLIZA') || clean.includes('ASEGURADORA')) {
    if (clean.includes('CANCEL') || clean.includes('DEVOL') || clean.includes('DESIST')) {
      return { categoria_principal: 'SEGUROS', subcategoria: 'CANCELACIÓN Y DEVOLUCIÓN' };
    }
    return { categoria_principal: 'SEGUROS', subcategoria: 'PÓLIZAS Y COBROS' };
  }

  // 8. EMBARGOS
  if (clean.includes('EMBARGO') || clean.includes('DESEMBARGO')) {
    if (clean.includes('DESEMBARGO')) return { categoria_principal: 'EMBARGOS', subcategoria: 'DESEMBARGO' };
    return { categoria_principal: 'EMBARGOS', subcategoria: 'APLICACIÓN DE EMBARGO' };
  }

  // 9. ACTUALIZACIÓN DE DATOS
  if (clean.includes('DATOS') && (clean.includes('ACTUALIZ') || clean.includes('CAMBIO') || clean.includes('DIRECCION') || clean.includes('TELEFONO') || clean.includes('CORREO'))) {
    return { categoria_principal: 'ACTUALIZACIÓN DE DATOS', subcategoria: 'DATOS DE CONTACTO' };
  }

  // 10. INFORMACIÓN Y DOCUMENTOS
  if (clean.includes('DOCUMENT') || clean.includes('CERTIFICAD') || clean.includes('PAZ Y SALVO') || clean.includes('EXTRACT') || clean.includes('CONTRATO') || clean.includes('PETICION')) {
    if (clean.includes('CERTIFICAD') || clean.includes('PAZ Y SALVO')) {
      return { categoria_principal: 'INFORMACIÓN Y DOCUMENTOS', subcategoria: 'CERTIFICADOS Y PAZ Y SALVO' };
    }
    return { categoria_principal: 'INFORMACIÓN Y DOCUMENTOS', subcategoria: 'EXTRACTOS Y DOCUMENTOS' };
  }

  // 11. CRÉDITOS / CARTERA
  if (clean.includes('CREDITO') || clean.includes('CARTERA') || clean.includes('PRESTAMO') || clean.includes('LIBRANZA')) {
    if (clean.includes('REFINANC') || clean.includes('ACUERDO') || clean.includes('ALIVIO')) {
      return { categoria_principal: 'CRÉDITOS / CARTERA', subcategoria: 'REFINANCIACIÓN Y ACUERDOS' };
    }
    return { categoria_principal: 'CRÉDITOS / CARTERA', subcategoria: 'ESTADO DE OBLIGACIÓN / SALDOS' };
  }

  // 12. PRODUCTOS
  if (clean.includes('CANCEL') && (clean.includes('PRODUCT') || clean.includes('CUENTA') || clean.includes('TARJETA'))) {
    return { categoria_principal: 'PRODUCTOS', subcategoria: 'CANCELACIÓN DE PRODUCTOS' };
  }
  if (clean.includes('ACTIVAC')) {
    return { categoria_principal: 'PRODUCTOS', subcategoria: 'ACTIVACIÓN DE PRODUCTOS' };
  }
  if (clean.includes('CONDICION') || clean.includes('TASA') || clean.includes('BENEFICIO')) {
    return { categoria_principal: 'PRODUCTOS', subcategoria: 'CONDICIONES DEL PRODUCTO' };
  }

  // 13. CANALES DIGITALES
  if (clean.includes('CANAL') || clean.includes('APP') || clean.includes('PORTAL') || clean.includes('TOKEN') || clean.includes('CLAVE') || clean.includes('BLOQUE')) {
    if (clean.includes('FALLA') || clean.includes('ERROR') || clean.includes('PANTALLA') || clean.includes('CAIDA')) {
      return { categoria_principal: 'CANALES DIGITALES', subcategoria: 'FALLAS TECNOLÓGICAS' };
    }
    return { categoria_principal: 'CANALES DIGITALES', subcategoria: 'BANCA MÓVIL Y VIRTUAL' };
  }

  // 14. TARJETAS
  if (clean.includes('MILLA') || clean.includes('PUNTO') || clean.includes('LEALTAD')) {
    return { categoria_principal: 'TARJETAS', subcategoria: 'MILLAS Y PROGRAMAS DE LEALTAD' };
  }
  if (clean.includes('TARJETA') || clean.includes('PLASTICO')) {
    return { categoria_principal: 'TARJETAS', subcategoria: 'PLÁSTICO Y BLOQUEO' };
  }

  // 15. TRANSFERENCIAS
  if (clean.includes('TRANSFER') || clean.includes('ACH') || clean.includes('BRE-B') || clean.includes('GIRO')) {
    return { categoria_principal: 'TRANSFERENCIAS', subcategoria: 'TRANSFERENCIAS' };
  }

  // 16. PAGOS / ABONOS
  if (clean.includes('DEBITO AUTOMATICO') || clean.includes('DOMICILIAC')) {
    return { categoria_principal: 'PAGOS / ABONOS', subcategoria: 'DÉBITOS AUTOMÁTICOS' };
  }
  if (clean.includes('PAGO') || clean.includes('ABONO') || clean.includes('RECAUDO') || clean.includes('CONSIGNAC')) {
    return { categoria_principal: 'PAGOS / ABONOS', subcategoria: 'APLICACIÓN DE PAGO' };
  }

  // 17. COMISIONES Y COBROS
  if (clean.includes('COMISION') || clean.includes('COBRO') || clean.includes('TARIFA') || clean.includes('INTERES')) {
    if (clean.includes('INTERES')) {
      return { categoria_principal: 'COMISIONES Y COBROS', subcategoria: 'INTERESES' };
    }
    return { categoria_principal: 'COMISIONES Y COBROS', subcategoria: 'COMISIONES Y TARIFAS' };
  }

  // 18. SERVICIO / ATENCIÓN
  if (clean.includes('SERVICIO') || clean.includes('ATENCION') || clean.includes('ASESOR') || clean.includes('SUCURSAL') || clean.includes('OFICINA') || clean.includes('DEMORA')) {
    if (clean.includes('TIEMPO') || clean.includes('DEMORA') || clean.includes('RESPUESTA')) {
      return { categoria_principal: 'SERVICIO / ATENCIÓN', subcategoria: 'TIEMPOS DE RESPUESTA' };
    }
    return { categoria_principal: 'SERVICIO / ATENCIÓN', subcategoria: 'ATENCIÓN ASESOR Y SUCURSAL' };
  }

  // 19. REVISIÓN HUMANA
  if (clean.includes('REVISION') || clean.includes('HUMANA') || clean.includes('INSUFICIENTE')) {
    return { categoria_principal: 'REVISIÓN HUMANA', subcategoria: 'INFORMACIÓN INSUFICIENTE' };
  }

  // 20. OTRAS
  if (clean.includes('OTRA') || clean.includes('OTRO') || clean.includes('ATIPIC')) {
    return { categoria_principal: 'OTRAS', subcategoria: 'CASOS ATÍPICOS' };
  }

  return { categoria_principal: 'OTRAS', subcategoria: 'CASOS ATÍPICOS' };
}

/**
 * Deterministic business rules engine prioritizing explicit business rules
 * over general statistical or semantic similarity.
 */
export function classifyPQRDeterministic(record: PQRInputRecord): PQRClassificationResult {
  const expediente = String(record.numero_expediente || '').trim();
  const rawText = String(record.descripcion_original || '').trim();
  const lower = rawText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleanAlpha = lower.replace(/[^a-z0-9]/g, '');

  // Submotivo & contextual fields
  const submotivoLower = String(record.submotivo_original || record.resumen_original || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // =========================================================================
  // REVISIÓN HUMANA (PRIORIDAD 10 / FILTRO PREVIO)
  // Únicamente si la descripción está vacía, es ruido o carece de información
  // sobre el problema real (ej. solo dice "cuenta de ahorros" o "revisar").
  // =========================================================================
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

  // Expresiones de un solo sustantivo de cuenta sin verbo, sin reclamo y sin acción
  const isIsolatedAccountName =
    cleanAlpha === 'cuentadeahorros' ||
    cleanAlpha === 'cuentacorriente' ||
    cleanAlpha === 'problemaconcuenta' ||
    cleanAlpha === 'micuenta' ||
    cleanAlpha === 'cuenta';

  if (isIsolatedAccountName) {
    return {
      expediente,
      categoria_principal: 'REVISIÓN HUMANA',
      subcategoria: 'INFORMACIÓN INSUFICIENTE',
      resumen_requerimiento: 'Solo menciona nombre de cuenta sin especificar la solicitud o problema.',
      intencion_cliente: 'Información insuficiente para determinar el motivo de reclamación',
      confianza: 30,
      requiere_revision_humana: true,
      motivo_de_revision: 'El caso únicamente menciona un tipo de producto o cuenta sin describir ningún hecho, inconformidad o solicitud.'
    };
  }

  // =========================================================================
  // PRIORIDAD 1: FRAUDES
  // Si el cliente manifiesta que NO reconoce una operación, producto o movimiento.
  // NO determinar si realmente fue fraude. NO investigar. Clasificar la manifestación.
  // =========================================================================
  const isFraudManifestation =
    lower.includes('no reconozco') ||
    lower.includes('no reconoce') ||
    lower.includes('no reconocid') ||
    lower.includes('desconozco') ||
    lower.includes('desconoce') ||
    lower.includes('desconocemos') ||
    lower.includes('desconocid') ||
    lower.includes('yo no hice') ||
    lower.includes('no fui yo') ||
    lower.includes('no lo hice') ||
    lower.includes('no realice') ||
    lower.includes('no autorice') ||
    lower.includes('no autorizo') ||
    lower.includes('no autoriza') ||
    lower.includes('no autorizada') ||
    lower.includes('sin autorizacion') ||
    lower.includes('sin mi autorizacion') ||
    lower.includes('sin consentimiento') ||
    lower.includes('no tengo conocimiento') ||
    lower.includes('no se que es') ||
    lower.includes('no se de donde salio') ||
    lower.includes('no se de que es') ||
    lower.includes('nunca hice') ||
    lower.includes('nunca realice') ||
    lower.includes('no recuerdo haber realizado') ||
    lower.includes('me robaron') ||
    lower.includes('me hurtaron') ||
    lower.includes('hurto') ||
    lower.includes('robo') ||
    lower.includes('clonacion') ||
    lower.includes('clonada') ||
    lower.includes('suplantacion') ||
    lower.includes('suplantaron') ||
    lower.includes('uso no autorizado') ||
    lower.includes('operacion desconocida') ||
    lower.includes('movimiento desconocido') ||
    lower.includes('compra desconocida') ||
    lower.includes('debito desconocido') ||
    lower.includes('retiro desconocido') ||
    lower.includes('compra que no hice') ||
    lower.includes('debito que no hice') ||
    lower.includes('retiro que no hice') ||
    lower.includes('no reconozco el producto') ||
    lower.includes('no reconozco esta tarjeta') ||
    lower.includes('no reconozco esta cuenta') ||
    lower.includes('fraude') ||
    lower.includes('fraudulenta') ||
    // Equivalente también en submotivo
    submotivoLower.includes('no reconoce') ||
    submotivoLower.includes('fraude');

  if (isFraudManifestation) {
    const isImpersonationOrTheft =
      lower.includes('suplantacion') ||
      lower.includes('suplantaron') ||
      lower.includes('clonacion') ||
      lower.includes('clonada') ||
      lower.includes('me robaron') ||
      lower.includes('hurto');

    const sub = isImpersonationOrTheft ? 'SUPLANTACIÓN O ROBO' : 'OPERACIÓN NO RECONOCIDA';
    return {
      expediente,
      categoria_principal: 'FRAUDES',
      subcategoria: sub,
      resumen_requerimiento: generateCompactSummary(rawText, 'FRAUDES', sub),
      intencion_cliente: 'Cliente manifiesta desconocimiento o no autorización de operación o producto',
      confianza: 98,
      requiere_revision_humana: false
    };
  }

  // =========================================================================
  // PRIORIDAD 2: PSE
  // Si el caso hace referencia a PSE (pago PSE, transacción PSE, error PSE, etc.)
  // PSE tiene prioridad sobre pagos generales, transferencias o fallas técnicas.
  // =========================================================================
  const isPSE = /\bpse\b/i.test(lower) || lower.includes('pasarela pse') || /\bpse\b/i.test(submotivoLower);

  if (isPSE) {
    let sub = 'PAGO PSE';
    let intencion = 'Gestión o reclamación sobre transacción PSE';
    if (lower.includes('error') || lower.includes('rechaz') || lower.includes('no funciona') || lower.includes('fall') || lower.includes('no aplicado')) {
      sub = 'ERROR / FALLA PSE';
      intencion = 'Falla técnica o rechazo en operación por pasarela PSE';
    } else if (lower.includes('soporte') || lower.includes('compra') || lower.includes('comprobante')) {
      sub = 'SOPORTE TRANSACCIONAL';
      intencion = 'Consulta o soporte transaccional de pago PSE';
    }
    return {
      expediente,
      categoria_principal: 'PSE',
      subcategoria: sub,
      resumen_requerimiento: generateCompactSummary(rawText, 'PSE', sub),
      intencion_cliente: intencion,
      confianza: 98,
      requiere_revision_humana: false
    };
  }

  // =========================================================================
  // PRIORIDAD 3: CDT
  // REGLA CRÍTICA: CDT SOLO SI HACE REFERENCIA EXPLÍCITA E INEQUÍVOCA A UN CDT.
  // La palabra "cuenta" NO ES CDT.
  // "Mi cuenta de ahorros no aparece" -> NO ES CDT.
  // "Mi cuenta corriente presenta un débito" -> NO ES CDT.
  // "Solicito revisar un CDT que no aparece" -> ES CDT.
  // =========================================================================
  const isExplicitCDT =
    /\bcdt\b/i.test(lower) ||
    lower.includes('certificado de deposito a termino') ||
    lower.includes('titulo cdt') ||
    lower.includes('deceval') ||
    /\bcdt\b/i.test(submotivoLower);

  if (isExplicitCDT) {
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

  // =========================================================================
  // PRIORIDAD 4: GT5
  // Casos que corresponden explícitamente a:
  // - cargo a cuenta en oficina
  // - cargo cuenta día
  // - cargo transacción no aplicada
  // - RECUP TRANX
  // =========================================================================
  const isGT5 =
    lower.includes('cargo a cuenta en oficina') ||
    lower.includes('cargo cuenta dia') ||
    lower.includes('cargo cuenta dia') ||
    lower.includes('cargo transaccion no aplicada') ||
    lower.includes('recup tranx') ||
    lower.includes('recuper tranx') ||
    lower.includes('recuperacion de transaccion') ||
    submotivoLower.includes('gt5') ||
    submotivoLower.includes('recup tranx') ||
    submotivoLower.includes('cargo cuenta dia');

  if (isGT5) {
    let sub = 'TRANSACCIÓN NO APLICADA';
    let intencion = 'Movimiento especial GT5 registrado en cuenta';
    if (lower.includes('en oficina')) {
      sub = 'CARGO A CUENTA EN OFICINA';
      intencion = 'Cargo a cuenta realizado en oficina';
    } else if (lower.includes('cuenta dia')) {
      sub = 'CARGO CUENTA DÍA';
      intencion = 'Movimiento de cargo cuenta día';
    } else if (lower.includes('recup tranx') || lower.includes('recuperacion')) {
      sub = 'RECUP TRANX';
      intencion = 'Ajuste transaccional RECUP TRANX';
    }
    return {
      expediente,
      categoria_principal: 'GT5',
      subcategoria: sub,
      resumen_requerimiento: generateCompactSummary(rawText, 'GT5', sub),
      intencion_cliente: intencion,
      confianza: 98,
      requiere_revision_humana: false
    };
  }

  // =========================================================================
  // PRIORIDAD 5: GMF
  // Gravamen a los Movimientos Financieros (4x1000):
  // - cobro, marcación, desmarcación, devolución
  // =========================================================================
  const isGMF =
    lower.includes('4x1000') ||
    lower.includes('4*1000') ||
    lower.includes('cuatro por mil') ||
    lower.includes('gmf') ||
    lower.includes('gravamen') ||
    ((lower.includes('marcar') || lower.includes('marcacion') || lower.includes('desmarcar')) && (lower.includes('cuenta') || lower.includes('exenta') || lower.includes('exento'))) ||
    submotivoLower.includes('4x1000') ||
    submotivoLower.includes('gmf');

  if (isGMF) {
    let sub = 'COBRO';
    let intencion = 'Inconformidad con cobro del gravamen 4x1000';
    if (lower.includes('desmarca') || lower.includes('retirar marcacion') || lower.includes('quitar marcacion') || lower.includes('quitar la marcacion') || lower.includes('eliminar marcacion')) {
      sub = 'DESMARCACIÓN';
      intencion = 'Solicitud de desmarcación de cuenta';
    } else if (lower.includes('marca') || lower.includes('exen') || lower.includes('solicito marcacion')) {
      sub = 'MARCACIÓN';
      intencion = 'Solicitud de marcación de cuenta como exenta de 4x1000';
    } else if (lower.includes('devol') || lower.includes('reintegro') || lower.includes('reversion')) {
      sub = 'DEVOLUCIÓN';
      intencion = 'Solicitud de devolución de 4x1000 debitado';
    }
    return {
      expediente,
      categoria_principal: 'GMF',
      subcategoria: sub,
      resumen_requerimiento: generateCompactSummary(rawText, 'GMF', sub),
      intencion_cliente: intencion,
      confianza: 98,
      requiere_revision_humana: false
    };
  }

  // =========================================================================
  // PRIORIDAD 6: CUOTA DE MANEJO
  // Si corresponde a cuota de manejo (tarjetas, cuentas):
  // - cobro, reclamación, exoneración, devolución
  // =========================================================================
  const isCuotaManejo =
    lower.includes('cuota de manejo') ||
    lower.includes('cuotas de manejo') ||
    lower.includes('cuota manejo') ||
    lower.includes('cobro de cuota') ||
    lower.includes('cobro cuota') ||
    lower.includes('cuota mensual') ||
    (lower.includes('reversen el cobro') && lower.includes('cuenta')) ||
    submotivoLower.includes('cuota de manejo') ||
    submotivoLower.includes('cuota manejo');

  if (isCuotaManejo) {
    let sub = 'COBRO';
    let intencion = 'Inconformidad con cobro de cuota de manejo';
    if (lower.includes('devol') || lower.includes('reversion') || lower.includes('reintegro')) {
      sub = 'DEVOLUCIÓN / REVERSIÓN';
      intencion = 'Solicitud de devolución o reversión de cuota de manejo';
    } else if (lower.includes('exonerac') || lower.includes('prometieron') || lower.includes('acuerdo')) {
      sub = 'RECLAMACIÓN / INCONFORMIDAD';
      intencion = 'Reclamo por cobro de cuota exonerada o no acordada';
    }
    return {
      expediente,
      categoria_principal: 'CUOTA DE MANEJO',
      subcategoria: sub,
      resumen_requerimiento: generateCompactSummary(rawText, 'CUOTA DE MANEJO', sub),
      intencion_cliente: intencion,
      confianza: 98,
      requiere_revision_humana: false
    };
  }

  // =========================================================================
  // PRIORIDAD 7: SEGUROS
  // Si corresponde a seguros o pólizas
  // =========================================================================
  const isSeguros =
    lower.includes('seguro') ||
    lower.includes('poliza') ||
    lower.includes('aseguradora') ||
    submotivoLower.includes('seguro') ||
    submotivoLower.includes('poliza');

  if (isSeguros) {
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

  // =========================================================================
  // PRIORIDAD 8: OTRAS CATEGORÍAS DE NEGOCIO EXISTENTES
  // =========================================================================

  // 8.1 EMBARGOS
  if (lower.includes('embargo') || lower.includes('desembargo') || lower.includes('medida cautelar') || lower.includes('juzgado')) {
    const isDesembargo = lower.includes('desembargo') || lower.includes('levantar embargo');
    const sub = isDesembargo ? 'DESEMBARGO' : 'APLICACIÓN DE EMBARGO';
    return {
      expediente,
      categoria_principal: 'EMBARGOS',
      subcategoria: sub,
      resumen_requerimiento: generateCompactSummary(rawText, 'EMBARGOS', sub),
      intencion_cliente: 'Gestión u oficio referente a medida cautelar de embargo',
      confianza: 96,
      requiere_revision_humana: false
    };
  }

  // 8.2 ACTUALIZACIÓN DE DATOS
  if ((lower.includes('actualiz') || lower.includes('cambio de')) && (lower.includes('dato') || lower.includes('telefono') || lower.includes('direccion') || lower.includes('correo') || lower.includes('celular'))) {
    return {
      expediente,
      categoria_principal: 'ACTUALIZACIÓN DE DATOS',
      subcategoria: 'DATOS DE CONTACTO',
      resumen_requerimiento: generateCompactSummary(rawText, 'ACTUALIZACIÓN DE DATOS', 'DATOS DE CONTACTO'),
      intencion_cliente: 'Solicitud de actualización de datos personales o de contacto',
      confianza: 96,
      requiere_revision_humana: false
    };
  }

  // 8.3 INFORMACIÓN Y DOCUMENTOS (Paz y salvo, certificaciones, extractos, derechos de petición)
  if (lower.includes('paz y salvo') || lower.includes('certificacion') || lower.includes('certificado') || lower.includes('extracto') || lower.includes('copia de contrato') || lower.includes('pagare') || lower.includes('derecho de peticion')) {
    const isCert = lower.includes('certificado') || lower.includes('certificacion') || lower.includes('paz y salvo');
    const sub = isCert ? 'CERTIFICADOS Y PAZ Y SALVO' : 'EXTRACTOS Y DOCUMENTOS';
    return {
      expediente,
      categoria_principal: 'INFORMACIÓN Y DOCUMENTOS',
      subcategoria: sub,
      resumen_requerimiento: generateCompactSummary(rawText, 'INFORMACIÓN Y DOCUMENTOS', sub),
      intencion_cliente: 'Solicitud de emisión o envío de documentos bancarios',
      confianza: 96,
      requiere_revision_humana: false
    };
  }

  // 8.4 PRODUCTOS: CANCELACIÓN DE PRODUCTOS
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

  // 8.5 PRODUCTOS: CONDICIONES DEL PRODUCTO
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

  // 8.6 PRODUCTOS: ACTIVACIÓN DE PRODUCTOS
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

  // 8.7 CRÉDITOS / CARTERA: REFINANCIACIÓN Y ACUERDOS DE PAGO
  if (lower.includes('acuerdo de pago') || lower.includes('acuerdos de pago') || lower.includes('refinanc') || lower.includes('alivio financiero') || lower.includes('reestructuracion') || lower.includes('credito') || lower.includes('cartera') || lower.includes('prestamo') || lower.includes('libranza') || lower.includes('hipotecario')) {
    const isRefinance = lower.includes('refinanc') || lower.includes('acuerdo') || lower.includes('alivio') || lower.includes('reestructur');
    const sub = isRefinance ? 'REFINANCIACIÓN Y ACUERDOS' : 'ESTADO DE OBLIGACIÓN / SALDOS';
    return {
      expediente,
      categoria_principal: 'CRÉDITOS / CARTERA',
      subcategoria: sub,
      resumen_requerimiento: generateCompactSummary(rawText, 'CRÉDITOS / CARTERA', sub),
      intencion_cliente: 'Consulta o gestión de obligación crediticia o acuerdo de pago',
      confianza: 96,
      requiere_revision_humana: false
    };
  }

  // 8.8 CANALES DIGITALES: BLOQUEO O ACCESO A BANCA VIRTUAL / MÓVIL
  if (lower.includes('app') || lower.includes('portal') || lower.includes('banca virtual') || lower.includes('token') || lower.includes('otp') || lower.includes('clave') || lower.includes('usuario') || (lower.includes('cuenta') && lower.includes('bloqueada'))) {
    const isTechGlitch = lower.includes('falla') || lower.includes('pantalla') || lower.includes('caida') || lower.includes('lentitud') || lower.includes('error');
    const sub = isTechGlitch ? 'FALLAS TECNOLÓGICAS' : 'BANCA MÓVIL Y VIRTUAL';
    return {
      expediente,
      categoria_principal: 'CANALES DIGITALES',
      subcategoria: sub,
      resumen_requerimiento: generateCompactSummary(rawText, 'CANALES DIGITALES', sub),
      intencion_cliente: 'Dificultad de acceso, bloqueo o falla operativa en canal digital',
      confianza: 95,
      requiere_revision_humana: false
    };
  }

  // 8.9 PAGOS / ABONOS: DÉBITOS AUTOMÁTICOS
  if (lower.includes('debito automatico') || lower.includes('debitos automaticos') || lower.includes('domiciliac')) {
    return {
      expediente,
      categoria_principal: 'PAGOS / ABONOS',
      subcategoria: 'DÉBITOS AUTOMÁTICOS',
      resumen_requerimiento: generateCompactSummary(rawText, 'PAGOS / ABONOS', 'DÉBITOS AUTOMÁTICOS'),
      intencion_cliente: 'Gestión o inconformidad con débito automático',
      confianza: 96,
      requiere_revision_humana: false
    };
  }

  // 8.10 PAGOS / ABONOS: APLICACIÓN DE PAGOS
  if (lower.includes('pago') || lower.includes('abono') || lower.includes('consignacion') || lower.includes('recaudo') || lower.includes('factura')) {
    return {
      expediente,
      categoria_principal: 'PAGOS / ABONOS',
      subcategoria: 'APLICACIÓN DE PAGO',
      resumen_requerimiento: generateCompactSummary(rawText, 'PAGOS / ABONOS', 'APLICACIÓN DE PAGO'),
      intencion_cliente: 'Aplicación o validación de pago o abono realizado',
      confianza: 95,
      requiere_revision_humana: false
    };
  }

  // 8.11 TRANSFERENCIAS
  if (lower.includes('transferencia') || lower.includes('transferir') || lower.includes('transferi') || lower.includes('ach') || lower.includes('bre-b') || lower.includes('giro')) {
    return {
      expediente,
      categoria_principal: 'TRANSFERENCIAS',
      subcategoria: 'TRANSFERENCIAS',
      resumen_requerimiento: generateCompactSummary(rawText, 'TRANSFERENCIAS', 'TRANSFERENCIAS'),
      intencion_cliente: 'Problema o retraso con transferencia de dinero',
      confianza: 96,
      requiere_revision_humana: false
    };
  }

  // 8.12 TRANSACCIONES / SALDOS Y MOVIMIENTOS
  if (lower.includes('saldo') || lower.includes('movimiento de cuenta') || lower.includes('diferencia de saldo') || lower.includes('no reflejado')) {
    return {
      expediente,
      categoria_principal: 'TRANSFERENCIAS',
      subcategoria: 'SALDOS Y MOVIMIENTOS',
      resumen_requerimiento: generateCompactSummary(rawText, 'TRANSFERENCIAS', 'SALDOS Y MOVIMIENTOS'),
      intencion_cliente: 'Revisión de saldos o inconsistencias en movimientos',
      confianza: 94,
      requiere_revision_humana: false
    };
  }

  // 8.13 TARJETAS: MILLAS Y BENEFICIOS
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

  // 8.14 TARJETAS: PLÁSTICO Y BLOQUEO
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

  // 8.15 SERVICIO / ATENCIÓN
  if (lower.includes('atencion') || lower.includes('servicio') || lower.includes('asesor') || lower.includes('sucursal') || lower.includes('oficina') || lower.includes('mal trato') || lower.includes('tiempo de espera') || lower.includes('tiempos de respuesta') || lower.includes('demora') || lower.includes('sin respuesta') || lower.includes('radicado sin')) {
    const isTime = lower.includes('tiempo') || lower.includes('demora') || lower.includes('plazo') || lower.includes('sin respuesta');
    const sub = isTime ? 'TIEMPOS DE RESPUESTA' : 'ATENCIÓN ASESOR Y SUCURSAL';
    return {
      expediente,
      categoria_principal: 'SERVICIO / ATENCIÓN',
      subcategoria: sub,
      resumen_requerimiento: generateCompactSummary(rawText, 'SERVICIO / ATENCIÓN', sub),
      intencion_cliente: 'Inconformidad con la calidad del servicio o tiempos',
      confianza: 92,
      requiere_revision_humana: false
    };
  }

  // 8.16 COMISIONES Y COBROS (Tarifas e Intereses)
  if (lower.includes('cobro') || lower.includes('comision') || lower.includes('tarifa') || lower.includes('cargo a cuenta') || lower.includes('cargo') || lower.includes('interes')) {
    const isInterest = lower.includes('interes');
    const sub = isInterest ? 'INTERESES' : 'COMISIONES Y TARIFAS';
    return {
      expediente,
      categoria_principal: 'COMISIONES Y COBROS',
      subcategoria: sub,
      resumen_requerimiento: generateCompactSummary(rawText, 'COMISIONES Y COBROS', sub),
      intencion_cliente: 'Aclaración o reclamo sobre cargos, comisiones o intereses',
      confianza: 90,
      requiere_revision_humana: false
    };
  }

  // Caso específico: "cuenta no aparece"
  if (lower.includes('cuenta') && lower.includes('no aparece')) {
    return {
      expediente,
      categoria_principal: 'PRODUCTOS',
      subcategoria: 'ACTIVACIÓN DE PRODUCTOS',
      resumen_requerimiento: 'Cliente informa que su cuenta no aparece disponible.',
      intencion_cliente: 'Verificación de visibilidad y activación de cuenta bancaria',
      confianza: 88,
      requiere_revision_humana: false
    };
  }

  // =========================================================================
  // PRIORIDAD 9: CASO ATÍPICO LEGÍTIMO (OTRAS)
  // Únicamente si tiene suficiente texto explicativo pero no corresponde
  // a la operativa estándar. NUNCA como descarte forzado.
  // =========================================================================
  if (cleanAlpha.length >= 14) {
    return {
      expediente,
      categoria_principal: 'OTRAS',
      subcategoria: 'CASOS ATÍPICOS',
      resumen_requerimiento: generateCompactSummary(rawText, 'OTRAS', 'CASOS ATÍPICOS'),
      intencion_cliente: 'Requerimiento particular no encasillado en categorías operativas estándar',
      confianza: 85,
      requiere_revision_humana: false
    };
  }

  // =========================================================================
  // PRIORIDAD 10: REVISIÓN HUMANA
  // Si no hay información suficiente para determinar la intención.
  // =========================================================================
  return {
    expediente,
    categoria_principal: 'REVISIÓN HUMANA',
    subcategoria: 'INFORMACIÓN INSUFICIENTE',
    resumen_requerimiento: 'Descripción vaga o sin detalle del problema para clasificar.',
    intencion_cliente: 'Sin información temática identificable',
    confianza: 30,
    requiere_revision_humana: true,
    motivo_de_revision: 'El caso no contiene detalles suficientes para clasificarlo con certeza.'
  };
}

/**
 * Builds the canonical PQRSAnalysis object preserving simple, unbloated fields.
 */
export function buildPQRSAnalysis(
  record: PQRInputRecord,
  result: PQRClassificationResult
): PQRSAnalysis {
  const shortSummary = truncateWords(result.resumen_requerimiento || record.descripcion_original || '', 20);
  const catPrincipal = result.categoria_principal;
  const subcat = result.subcategoria;
  const isHumanReview = catPrincipal === 'REVISIÓN HUMANA' || result.requiere_revision_humana;
  const conf = Math.min(100, Math.max(0, result.confianza));

  return {
    numero_expediente: record.numero_expediente,
    categoria: catPrincipal,
    categoria_principal: catPrincipal,
    subcategoria: subcat,
    resumen_requerimiento: shortSummary,
    intencion_cliente: result.intencion_cliente || shortSummary,
    confianza: conf,
    requiere_revision_humana: isHumanReview ? 'SI' : 'NO',
    requiere_revision: isHumanReview,
    motivo_de_revision: result.motivo_de_revision,
    existe_inconsistencia: result.existe_inconsistencia || 'NO',
    posible_inconsistencia: result.existe_inconsistencia === 'SI',
    motivo_inconsistencia: result.motivo_inconsistencia,
    producto: record.producto_original || 'Identificado en descripción',
    tipo_pqr: catPrincipal === 'INFORMACIÓN Y DOCUMENTOS' ? 'PETICIÓN' : catPrincipal === 'SERVICIO / ATENCIÓN' ? 'QUEJA' : 'RECLAMO',
    motivo: catPrincipal,
    submotivo: subcat,
    tema_principal: catPrincipal,
    subtema: subcat,
    problema_principal: shortSummary,
    solicitud_cliente: result.intencion_cliente || shortSummary,
    que_solicita_exactamente: shortSummary,
    hechos_principales: record.descripcion_original.slice(0, 160).replace(/[\r\n]+/g, ' ').trim(),
    sustento_clasificacion: `Clasificado bajo ${catPrincipal} > ${subcat} según reglas de negocio e intención del cliente.`,
    resumen_normalizado: shortSummary,
    justificacion: `Agrupado bajo ${catPrincipal} > ${subcat} con base en la intención del cliente.`,
    nivel_confianza: conf >= 85 ? 'Alta' : conf >= 70 ? 'Media' : 'Baja',
    modelo_ia: 'gemini-3.8-flash',
    version_prompt: 'v4.0.0-reglas-negocio-prioridad',
    fecha_analisis: new Date().toISOString(),
    estado_revision: 'PENDIENTE'
  };
}

/**
 * Global consolidation step:
 * Audits the full list of classified records to ensure homogeneous naming.
 * Does NOT force arbitrary categories onto unclassifiable records.
 */
export function consolidateBatchClassifications(analyses: PQRSAnalysis[]): PQRSAnalysis[] {
  return analyses.map(item => {
    const rawCat = item.categoria || item.categoria_principal || '';
    const rawSub = item.subcategoria || '';

    // Normalize any synonymous category names
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
