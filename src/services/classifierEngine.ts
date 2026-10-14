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
  producto_detectado: string;
  problema_principal: string;
  solicitud_cliente: string;
  evidencia_textual: string;
}

/**
 * Trims text strictly to a maximum number of words.
 */
function truncateWords(text: string, maxWords = 20): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return words.slice(0, maxWords).join(' ');
}

/**
 * Identifies the banking product involved in the ticket based on text evidence
 * prioritizing DESC_DETALLADA, with submotivo and producto as context.
 */
export function detectProduct(
  desc: string,
  submotivo?: string,
  productoOriginal?: string
): string {
  const fullText = `${desc || ''} ${submotivo || ''} ${productoOriginal || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (
    fullText.includes('tarjeta de credito') ||
    fullText.includes('tarjeta credito') ||
    fullText.includes('tdc') ||
    fullText.includes('tarjeta visa') ||
    fullText.includes('tarjeta mastercard') ||
    fullText.includes('tarjeta amex') ||
    fullText.includes('tarjeta american express') ||
    fullText.includes('tarjeta lifemiles') ||
    fullText.includes('cupo de la tarjeta') ||
    fullText.includes('cupo de mi tarjeta') ||
    fullText.includes('aumento de cupo') ||
    fullText.includes('compra diferida') ||
    fullText.includes('diferir compra') ||
    fullText.includes('extracto de la tarjeta') ||
    fullText.includes('extracto de mi tarjeta') ||
    (fullText.includes('tarjeta') && (fullText.includes('cupo') || fullText.includes('diferid') || fullText.includes('avance')))
  ) {
    return 'TARJETA DE CRÉDITO';
  }

  if (fullText.includes('tarjeta debito') || fullText.includes('tarjeta débito')) {
    return 'TARJETA DÉBITO';
  }

  if (fullText.includes('tarjeta') || fullText.includes('plastico')) {
    return 'TARJETA DE CRÉDITO';
  }

  if (/\bcdt\b/i.test(fullText) || fullText.includes('certificado de deposito') || fullText.includes('deceval')) {
    return 'CDT';
  }

  if (fullText.includes('cuenta de ahorros') || fullText.includes('cta ahorros') || fullText.includes('cuenta ahorros')) {
    return 'CUENTA DE AHORROS';
  }

  if (fullText.includes('cuenta corriente') || fullText.includes('cta corriente')) {
    return 'CUENTA CORRIENTE';
  }

  if (fullText.includes('cuenta') || fullText.includes('cta')) {
    return 'CUENTA DE AHORROS';
  }

  if (
    fullText.includes('credito') ||
    fullText.includes('prestamo') ||
    fullText.includes('libranza') ||
    fullText.includes('hipotecario') ||
    fullText.includes('cartera')
  ) {
    return 'CRÉDITO / CARTERA';
  }

  if (fullText.includes('seguro') || fullText.includes('poliza')) {
    return 'SEGURO';
  }

  if (productoOriginal && productoOriginal.trim().length > 0) {
    return productoOriginal.trim().toUpperCase();
  }

  return 'NO ESPECIFICADO';
}

/**
 * Generates a clean, natural summary strictly capped at 20 words.
 * Explains what the customer is requesting or claiming without template artifacts.
 */
function generateConciseSummary(
  desc: string,
  catPrincipal: string,
  subcat: string,
  producto: string,
  customSummary?: string
): string {
  if (customSummary && customSummary.trim().length > 0) {
    return truncateWords(customSummary, 20);
  }

  if (!desc || desc.trim().length === 0) {
    return 'Sin descripción provista por el cliente.';
  }

  const clean = desc.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length <= 16) {
    return clean;
  }

  return truncateWords(clean, 20);
}

/**
 * Normalizes categories and subcategories to the official operational catalog.
 */
export function normalizeCategoryName(raw: string): { categoria_principal: string; subcategoria: string } {
  if (!raw) return { categoria_principal: 'OTRAS', subcategoria: 'CASOS ATÍPICOS' };
  const clean = raw.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. FRAUDES
  if (clean.includes('FRAUDE') || clean.includes('NO RECONOCID') || clean.includes('DESCONOCID') || clean.includes('SUPLANT') || clean.includes('CLONAC')) {
    if (clean.includes('SUPLANT') || clean.includes('CLONAC') || clean.includes('ROBO') || clean.includes('HURTO')) {
      return { categoria_principal: 'FRAUDES', subcategoria: 'SUPLANTACIÓN O ROBO' };
    }
    return { categoria_principal: 'FRAUDES', subcategoria: 'OPERACIÓN NO RECONOCIDA' };
  }

  // 2. PSE
  if (clean === 'PSE' || clean.includes('PSE')) {
    if (clean.includes('ERROR') || clean.includes('FALLA') || clean.includes('RECHAZ') || clean.includes('NO FUNCIONA')) {
      return { categoria_principal: 'PSE', subcategoria: 'ERROR / FALLA PSE' };
    }
    if (clean.includes('SOPORTE') || clean.includes('COMPRA') || clean.includes('COMPROBANTE')) {
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
  if (clean.includes('CUOTA DE MANEJO') || clean.includes('CUOTA MANEJO') || clean.includes('CUOTAS DE MANEJO')) {
    if (clean.includes('DEVOL') || clean.includes('REVERSION') || clean.includes('REINTEGRO')) return { categoria_principal: 'CUOTA DE MANEJO', subcategoria: 'DEVOLUCIÓN / REVERSIÓN' };
    if (clean.includes('EXONERAC') || clean.includes('RECLAM') || clean.includes('INCONFORMIDAD')) return { categoria_principal: 'CUOTA DE MANEJO', subcategoria: 'RECLAMACIÓN / INCONFORMIDAD' };
    return { categoria_principal: 'CUOTA DE MANEJO', subcategoria: 'COBRO' };
  }

  // 7. SEGUROS
  if (clean.includes('SEGURO') || clean.includes('POLIZA') || clean.includes('ASEGURADORA')) {
    if (clean.includes('CANCEL') || clean.includes('DEVOL') || clean.includes('DESIST')) {
      return { categoria_principal: 'SEGUROS', subcategoria: 'CANCELACIÓN Y DEVOLUCIÓN' };
    }
    return { categoria_principal: 'SEGUROS', subcategoria: 'PÓLIZAS Y COBROS' };
  }

  // 8. EMBARGOS (Financial only, ignoring conjunction "sin embargo")
  if (clean.includes('EMBARGO') || clean.includes('DESEMBARGO')) {
    if (clean.includes('SIN EMBARGO') && !clean.includes('DESEMBARGO') && !clean.includes('JUZGADO') && !clean.includes('MEDIDA CAUTELAR') && !clean.includes('LEVANTAMIENTO')) {
      // "Sin embargo" false positive, skip to other categories
    } else {
      if (clean.includes('DESEMBARGO') || clean.includes('LEVANTAMIENTO')) return { categoria_principal: 'EMBARGOS', subcategoria: 'DESEMBARGO' };
      return { categoria_principal: 'EMBARGOS', subcategoria: 'APLICACIÓN DE EMBARGO' };
    }
  }

  // 9. ACTUALIZACIÓN DE DATOS
  if (clean.includes('DATOS') && (clean.includes('ACTUALIZ') || clean.includes('CAMBIO') || clean.includes('DIRECCION') || clean.includes('TELEFONO') || clean.includes('CORREO'))) {
    return { categoria_principal: 'ACTUALIZACIÓN DE DATOS', subcategoria: 'DATOS DE CONTACTO' };
  }

  // 10. INFORMACIÓN Y DOCUMENTOS
  if (clean.includes('DOCUMENT') || clean.includes('CERTIFICAD') || clean.includes('PAZ Y SALVO') || clean.includes('EXTRACT') || clean.includes('CONTRATO') || clean.includes('PETICION') || clean.includes('FECHA DE CORTE')) {
    if (clean.includes('CERTIFICAD') || clean.includes('PAZ Y SALVO')) {
      return { categoria_principal: 'INFORMACIÓN Y DOCUMENTOS', subcategoria: 'CERTIFICADOS Y PAZ Y SALVO' };
    }
    return { categoria_principal: 'INFORMACIÓN Y DOCUMENTOS', subcategoria: 'EXTRACTOS Y DOCUMENTOS' };
  }

  // 11. CRÉDITOS / CARTERA
  if ((clean.includes('CREDITO') && !clean.includes('TARJETA DE CREDITO') && !clean.includes('TARJETA CREDITO')) || clean.includes('CARTERA') || clean.includes('PRESTAMO') || clean.includes('LIBRANZA')) {
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

  // 14. TARJETAS (Detailed subcategories)
  if (clean.includes('CUPO') || clean.includes('AVANCE') || clean.includes('SOBRECUPO')) {
    return { categoria_principal: 'TARJETAS', subcategoria: 'CUPO Y AVANCES' };
  }
  if (clean.includes('DIFERID') || clean.includes('FINANCIACION') || clean.includes('REDIFER')) {
    return { categoria_principal: 'TARJETAS', subcategoria: 'DIFERIDOS Y FINANCIACIÓN' };
  }
  if (clean.includes('DEVOLUCION') || clean.includes('COMERCIO') || clean.includes('DATAFONO')) {
    return { categoria_principal: 'TARJETAS', subcategoria: 'COMPRAS Y DEVOLUCIONES' };
  }
  if (clean.includes('MILLA') || clean.includes('PUNTO') || clean.includes('LEALTAD') || clean.includes('CASHBACK') || clean.includes('LIFEMILES')) {
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

  const submotivoLower = String(record.submotivo_original || record.resumen_original || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const detectedProduct = detectProduct(rawText, record.submotivo_original || record.resumen_original, record.producto_original);

  // =========================================================================
  // REVISIÓN HUMANA (PRIORIDAD 10 / FILTRO PREVIO)
  // Estrictamente si la descripción está vacía, es ruido, o únicamente menciona
  // el nombre aislado del producto sin describir el problema o solicitud.
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
    cleanAlpha === 'revisarcaso' ||
    cleanAlpha === 'ayuda' ||
    cleanAlpha === 'caso' ||
    cleanAlpha === 'informacion';

  if (isEssentiallyEmpty) {
    return {
      expediente,
      categoria_principal: 'REVISIÓN HUMANA',
      subcategoria: 'INFORMACIÓN INSUFICIENTE',
      resumen_requerimiento: 'Descripción ausente o vaga sin temática identificable.',
      intencion_cliente: 'Sin información de solicitud identificable',
      confianza: 35,
      requiere_revision_humana: true,
      motivo_de_revision: 'DESC_DETALLADA carece de información sobre el producto, transacción o inconformidad del cliente.',
      producto_detectado: detectedProduct,
      problema_principal: 'Descripción insuficiente para determinar el tema',
      solicitud_cliente: 'No especificada',
      evidencia_textual: rawText
    };
  }

  // Mención aislada de producto sin acción, sin reclamo y sin verbo
  const isIsolatedProduct =
    cleanAlpha === 'cuentadeahorros' ||
    cleanAlpha === 'cuentacorriente' ||
    cleanAlpha === 'cuenta' ||
    cleanAlpha === 'micuenta' ||
    cleanAlpha === 'problemaconcuenta' ||
    cleanAlpha === 'tarjetadecredito' ||
    cleanAlpha === 'mitarjetadecredito' ||
    cleanAlpha === 'tarjetadecreditovisa' ||
    cleanAlpha === 'tarjetadecreditomastercard' ||
    cleanAlpha === 'tarjetadecreditoamex' ||
    cleanAlpha === 'tarjetadecreditoamericanexpress' ||
    cleanAlpha === 'tarjetasdecredito' ||
    cleanAlpha === 'tarjetacredito' ||
    cleanAlpha === 'tarjeta' ||
    cleanAlpha === 'mitarjeta' ||
    cleanAlpha === 'tarjetadebito' ||
    cleanAlpha === 'problemacontarjeta' ||
    cleanAlpha === 'cdt' ||
    cleanAlpha === 'seguro' ||
    cleanAlpha === 'credito' ||
    cleanAlpha === 'prestamo' ||
    (!rawText.includes(' ') && (cleanAlpha.includes('tarjeta') || cleanAlpha.includes('cuenta') || cleanAlpha.includes('credito'))) ||
    (rawText.trim().split(/\s+/).length <= 4 && (lower.includes('tarjeta') || lower.includes('cuenta')) && !(
      lower.includes('pago') || lower.includes('cobro') || lower.includes('error') || lower.includes('falla') ||
      lower.includes('cupo') || lower.includes('avance') || lower.includes('robo') || lower.includes('hurto') ||
      lower.includes('fraude') || lower.includes('reconozco') || lower.includes('desconozco') || lower.includes('autorice') ||
      lower.includes('extracto') || lower.includes('cuota') || lower.includes('interes') || lower.includes('devolucion') ||
      lower.includes('diferid') || lower.includes('cancel') || lower.includes('activ') || lower.includes('bloque') ||
      lower.includes('reposic') || lower.includes('entrega') || lower.includes('milla') || lower.includes('punto') ||
      lower.includes('embargo') || lower.includes('desembargo') || lower.includes('seguro') || lower.includes('no aparece') ||
      lower.includes('pse') || lower.includes('cdt') || lower.includes('transferencia') || lower.includes('movimiento')
    ));

  if (isIsolatedProduct) {
    const prodName = detectedProduct !== 'NO ESPECIFICADO' ? detectedProduct : 'producto';
    return {
      expediente,
      categoria_principal: 'REVISIÓN HUMANA',
      subcategoria: 'INFORMACIÓN INSUFICIENTE',
      resumen_requerimiento: `Solo menciona ${prodName.toLowerCase()} sin especificar la solicitud o inconveniente.`,
      intencion_cliente: 'Información insuficiente para determinar el motivo de reclamación',
      confianza: 30,
      requiere_revision_humana: true,
      motivo_de_revision: `El caso únicamente menciona ${prodName.toLowerCase()} sin describir ningún hecho, inconveniente o solicitud específica.`,
      producto_detectado: detectedProduct,
      problema_principal: 'Mención de producto sin problema específico',
      solicitud_cliente: 'No especificada',
      evidencia_textual: rawText
    };
  }

  // Clean text from conjunction "sin embargo" so it never triggers false positive EMBARGOS
  const textWithoutSinEmbargo = lower.replace(/\bsin embargo\b/gi, ' ');
  // Clean "tarjeta de credito" from matching generic loan "credito"
  const textWithoutTarjetaCredito = lower.replace(/tarjeta(s)?\s+(de\s+)?credito/g, ' ');

  // =========================================================================
  // PRIORIDAD 1: FRAUDES
  // Si el cliente manifiesta que NO reconoce una operación, compra, producto o movimiento.
  // Exception: insurance enrollment disputes ("seguro asociado", "seguro que no autorice")
  // belong to SEGUROS as defined by business rules.
  // =========================================================================
  const isInsuranceDispute = lower.includes('seguro') || lower.includes('poliza');

  const isFraudManifestation =
    !isInsuranceDispute && (
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
      lower.includes('no he realizado') ||
      lower.includes('no he hecho') ||
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
      lower.includes('clonaron') ||
      lower.includes('suplantacion') ||
      lower.includes('suplantaron') ||
      lower.includes('uso no autorizado') ||
      lower.includes('operacion desconocida') ||
      lower.includes('movimiento desconocido') ||
      lower.includes('compra desconocida') ||
      lower.includes('debito desconocido') ||
      lower.includes('retiro desconocido') ||
      lower.includes('cargo desconocido') ||
      lower.includes('transaccion desconocida') ||
      lower.includes('consumo desconocido') ||
      lower.includes('compra que no hice') ||
      lower.includes('debito que no hice') ||
      lower.includes('retiro que no hice') ||
      lower.includes('pago que no hice') ||
      lower.includes('no reconozco el producto') ||
      lower.includes('no reconozco esta tarjeta') ||
      lower.includes('no reconozco esta cuenta') ||
      lower.includes('fraude') ||
      lower.includes('fraudulenta') ||
      submotivoLower.includes('no reconoce') ||
      submotivoLower.includes('fraude')
    );

  if (isFraudManifestation) {
    const isTheft =
      lower.includes('suplantacion') ||
      lower.includes('suplantaron') ||
      lower.includes('clonacion') ||
      lower.includes('clonada') ||
      lower.includes('clonaron') ||
      lower.includes('me robaron') ||
      lower.includes('hurto') ||
      lower.includes('me hurtaron');

    const sub = isTheft ? 'SUPLANTACIÓN O ROBO' : 'OPERACIÓN NO RECONOCIDA';
    const prodDesc = detectedProduct !== 'NO ESPECIFICADO' ? ` en ${detectedProduct.toLowerCase()}` : '';
    return {
      expediente,
      categoria_principal: 'FRAUDES',
      subcategoria: sub,
      resumen_requerimiento: generateConciseSummary(rawText, 'FRAUDES', sub, detectedProduct, `Cliente no reconoce compra u operación registrada${prodDesc}.`),
      intencion_cliente: 'Cliente manifiesta desconocimiento o no autorización de operación o producto',
      confianza: 98,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: `Operación o compra no reconocida por el cliente${prodDesc}`,
      solicitud_cliente: 'Bloqueo, investigación y reverso de la transacción desconocida',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // =========================================================================
  // PRIORIDAD 2: PSE
  // Si el caso hace referencia a PSE (pago, error, soporte de PSE)
  // Conserva el producto detectado (ej: TARJETA DE CRÉDITO)
  // =========================================================================
  const isPSE = /\bpse\b/i.test(lower) || lower.includes('pasarela pse') || /\bpse\b/i.test(submotivoLower);

  if (isPSE) {
    let sub = 'PAGO PSE';
    let intencion = 'Gestión o reclamación sobre transacción PSE';
    let problema = 'Operación o pago a través de pasarela PSE';
    if (lower.includes('error') || lower.includes('rechaz') || lower.includes('no funciona') || lower.includes('fall') || lower.includes('no aplicado') || lower.includes('declinad')) {
      sub = 'ERROR / FALLA PSE';
      intencion = 'Falla técnica o rechazo en operación por pasarela PSE';
      problema = 'Falla o rechazo al pagar mediante pasarela PSE';
    } else if (lower.includes('soporte') || lower.includes('compra') || lower.includes('comprobante')) {
      sub = 'SOPORTE TRANSACCIONAL';
      intencion = 'Consulta o soporte transaccional de pago PSE';
      problema = 'Confirmación y soporte de comprobante de pago PSE';
    }
    return {
      expediente,
      categoria_principal: 'PSE',
      subcategoria: sub,
      resumen_requerimiento: generateConciseSummary(rawText, 'PSE', sub, detectedProduct, `Cliente reporta inconveniente con pago o transacción a través de PSE.`),
      intencion_cliente: intencion,
      confianza: 98,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: problema,
      solicitud_cliente: 'Acreditación, confirmación o soporte de pago PSE',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // =========================================================================
  // PRIORIDAD 3: CDT
  // Únicamente si hace referencia explícita e inequívoca a un CDT.
  // =========================================================================
  const isExplicitCDT =
    /\bcdt\b/i.test(lower) ||
    lower.includes('certificado de deposito a termino') ||
    lower.includes('certificado de deposito') ||
    lower.includes('titulo cdt') ||
    lower.includes('rendimiento cdt') ||
    lower.includes('redencion cdt') ||
    lower.includes('vencimiento cdt') ||
    lower.includes('cancelacion cdt') ||
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
      resumen_requerimiento: generateConciseSummary(rawText, 'CDT', sub, 'CDT', `Cliente solicita gestión de su certificado de depósito a término CDT.`),
      intencion_cliente: intencion,
      confianza: 98,
      requiere_revision_humana: false,
      producto_detectado: 'CDT',
      problema_principal: 'Gestión o reclamación sobre CDT',
      solicitud_cliente: intencion,
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // =========================================================================
  // PRIORIDAD 4: GT5
  // =========================================================================
  const isGT5 =
    lower.includes('cargo a cuenta en oficina') ||
    lower.includes('cargo cuenta dia') ||
    lower.includes('cargo transaccion no aplicada') ||
    lower.includes('transaccion no aplicada') ||
    lower.includes('recup tranx') ||
    lower.includes('recuper tranx') ||
    lower.includes('recuperacion de transaccion') ||
    lower.includes('recuperacion transaccion') ||
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
    } else if (lower.includes('recup tranx') || lower.includes('recuper')) {
      sub = 'RECUP TRANX';
      intencion = 'Ajuste transaccional RECUP TRANX';
    }
    return {
      expediente,
      categoria_principal: 'GT5',
      subcategoria: sub,
      resumen_requerimiento: generateConciseSummary(rawText, 'GT5', sub, detectedProduct, `Cliente solicita revisión de movimiento especial o ajuste GT5 en su cuenta.`),
      intencion_cliente: intencion,
      confianza: 98,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: 'Ajuste operativo especial GT5 en cuenta',
      solicitud_cliente: intencion,
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // =========================================================================
  // PRIORIDAD 5: GMF (4x1000)
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
    if (lower.includes('desmarca') || lower.includes('retirar marcacion') || lower.includes('quitar marcacion')) {
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
      resumen_requerimiento: generateConciseSummary(rawText, 'GMF', sub, detectedProduct, `Cliente solicita gestión del impuesto 4x1000 GMF en su cuenta.`),
      intencion_cliente: intencion,
      confianza: 98,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: 'Cobro o estado de exención del impuesto 4x1000 GMF',
      solicitud_cliente: intencion,
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // =========================================================================
  // PRIORIDAD 6: CUOTA DE MANEJO
  // =========================================================================
  const isCuotaManejo =
    lower.includes('cuota de manejo') ||
    lower.includes('cuotas de manejo') ||
    lower.includes('cuota manejo') ||
    lower.includes('cobro de cuota') ||
    lower.includes('cobro cuota') ||
    lower.includes('cuota mensual') ||
    submotivoLower.includes('cuota de manejo') ||
    submotivoLower.includes('cuota manejo');

  if (isCuotaManejo) {
    let sub = 'COBRO';
    let intencion = 'Inconformidad con cobro de cuota de manejo';
    if (lower.includes('devol') || lower.includes('reversion') || lower.includes('reintegro')) {
      sub = 'DEVOLUCIÓN / REVERSIÓN';
      intencion = 'Solicitud de devolución o reversión de cuota de manejo';
    } else if (lower.includes('cobro de cuota') || lower.includes('cobrando cuota') || lower.includes('cobro cuota') || lower.includes('cobro de cuotas') || lower.includes('me cobran cuota') || lower.includes('tarifa mensual')) {
      sub = 'COBRO';
      intencion = 'Inconformidad o reclamación por cobro de cuota de manejo';
    } else if (lower.includes('exonerac') || lower.includes('prometieron') || lower.includes('acuerdo')) {
      sub = 'RECLAMACIÓN / INCONFORMIDAD';
      intencion = 'Reclamo por cobro de cuota exonerada o no acordada';
    }
    const prodDesc = detectedProduct !== 'NO ESPECIFICADO' ? ` en ${detectedProduct.toLowerCase()}` : '';
    return {
      expediente,
      categoria_principal: 'CUOTA DE MANEJO',
      subcategoria: sub,
      resumen_requerimiento: generateConciseSummary(rawText, 'CUOTA DE MANEJO', sub, detectedProduct, `Cliente solicita gestión de cobro de cuota de manejo${prodDesc}.`),
      intencion_cliente: intencion,
      confianza: 98,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: `Cobro de cuota de manejo${prodDesc}`,
      solicitud_cliente: intencion,
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // =========================================================================
  // PRIORIDAD 7: SEGUROS (Asociados a tarjeta o individuales)
  // =========================================================================
  if (isInsuranceDispute) {
    const isCancel = lower.includes('cancel') || lower.includes('devol') || lower.includes('desistir') || lower.includes('no autorice');
    const sub = isCancel ? 'CANCELACIÓN Y DEVOLUCIÓN' : 'PÓLIZAS Y COBROS';
    const prodDesc = detectedProduct !== 'NO ESPECIFICADO' ? ` vinculado a ${detectedProduct.toLowerCase()}` : '';
    return {
      expediente,
      categoria_principal: 'SEGUROS',
      subcategoria: sub,
      resumen_requerimiento: generateConciseSummary(rawText, 'SEGUROS', sub, detectedProduct, `Cliente solicita revisión o cancelación de póliza de seguro${prodDesc}.`),
      intencion_cliente: 'Reclamación o trámite referente a pólizas de seguro',
      confianza: 96,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: `Cobro o vinculación de seguro${prodDesc}`,
      solicitud_cliente: isCancel ? 'Cancelación y devolución del seguro' : 'Aclaración de póliza de seguro',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // =========================================================================
  // PRIORIDAD 8: REGLAS ESPECÍFICAS DE TARJETAS, PAGOS, EMBARGOS Y OPERATIVAS
  // =========================================================================

  // 8.1 EMBARGOS (Judiciales reales: desembargos, oficios, juzgado)
  // ¡NUNCA confundir "sin embargo" con un embargo financiero!
  const isRealEmbargo =
    textWithoutSinEmbargo.includes('desembargo') ||
    textWithoutSinEmbargo.includes('levantar embargo') ||
    textWithoutSinEmbargo.includes('levantamiento de embargo') ||
    textWithoutSinEmbargo.includes('medida cautelar') ||
    textWithoutSinEmbargo.includes('juzgado') ||
    textWithoutSinEmbargo.includes('orden judicial') ||
    textWithoutSinEmbargo.includes('cuenta embargada') ||
    textWithoutSinEmbargo.includes('embargo judicial') ||
    /\bembarg(o|os|ado|ada|aron)\b/.test(textWithoutSinEmbargo);

  if (isRealEmbargo) {
    const isDesembargo = textWithoutSinEmbargo.includes('desembargo') || textWithoutSinEmbargo.includes('levantar embargo') || textWithoutSinEmbargo.includes('levantamiento');
    const sub = isDesembargo ? 'DESEMBARGO' : 'APLICACIÓN DE EMBARGO';
    return {
      expediente,
      categoria_principal: 'EMBARGOS',
      subcategoria: sub,
      resumen_requerimiento: generateConciseSummary(rawText, 'EMBARGOS', sub, detectedProduct, `Cliente solicita trámite de ${sub.toLowerCase()} por oficio judicial.`),
      intencion_cliente: 'Gestión u oficio referente a medida cautelar de embargo',
      confianza: 96,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: 'Medida cautelar de embargo sobre cuenta bancaria',
      solicitud_cliente: isDesembargo ? 'Levantamiento de embargo y desembargo de cuenta' : 'Información sobre aplicación de embargo',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // 8.2 TARJETA / PAGOS: Pagos no aplicados, no reflejados o duplicados
  const hasPaymentWord = lower.includes('pago') || lower.includes('abono');
  const hasReflectionOrDuplicateIssue =
    lower.includes('no se ve reflejado') ||
    lower.includes('no veo reflejado') ||
    lower.includes('no se refleja') ||
    lower.includes('no aplicado') ||
    lower.includes('no aparece el pago') ||
    lower.includes('pendiente de reflejar') ||
    lower.includes('dos veces') ||
    lower.includes('duplicado') ||
    lower.includes('doble pago') ||
    lower.includes('doble cobro') ||
    lower.includes('pago incorrecto') ||
    lower.includes('abono mal aplicado');

  const isPaymentIssue =
    (hasPaymentWord && hasReflectionOrDuplicateIssue) ||
    lower.includes('pago no aplicado') ||
    lower.includes('pago duplicado') ||
    lower.includes('debito duplicado del pago');

  if (isPaymentIssue) {
    const prodDesc = detectedProduct !== 'NO ESPECIFICADO' ? ` de ${detectedProduct.toLowerCase()}` : '';
    return {
      expediente,
      categoria_principal: 'PAGOS / ABONOS',
      subcategoria: 'APLICACIÓN DE PAGO',
      resumen_requerimiento: generateConciseSummary(rawText, 'PAGOS / ABONOS', 'APLICACIÓN DE PAGO', detectedProduct, `Cliente reclama por pago${prodDesc} no aplicado o duplicado.`),
      intencion_cliente: 'Aplicación o corrección de pago realizado a la obligación',
      confianza: 97,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: `Pago${prodDesc} no aplicado, duplicado o pendiente de reflejar`,
      solicitud_cliente: 'Aplicación correcta y actualización de saldo del pago realizado',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // 8.3 TARJETA / CRÉDITO: Cobro de intereses de mora y corrientes
  const isInterestsIssue =
    lower.includes('interes de mora') ||
    lower.includes('intereses de mora') ||
    lower.includes('intereses moratorios') ||
    lower.includes('interes corriente') ||
    lower.includes('intereses corrientes') ||
    lower.includes('cobro de intereses') ||
    lower.includes('liquidacion de intereses') ||
    lower.includes('tasa de interes incorrecta');

  if (isInterestsIssue) {
    const prodDesc = detectedProduct !== 'NO ESPECIFICADO' ? ` en ${detectedProduct.toLowerCase()}` : '';
    return {
      expediente,
      categoria_principal: 'COMISIONES Y COBROS',
      subcategoria: 'INTERESES',
      resumen_requerimiento: generateConciseSummary(rawText, 'COMISIONES Y COBROS', 'INTERESES', detectedProduct, `Cliente reclama cobro de intereses moratorios o corrientes${prodDesc}.`),
      intencion_cliente: 'Revisión y reliquidación de cobro de intereses',
      confianza: 96,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: `Cobro o liquidación errónea de intereses${prodDesc}`,
      solicitud_cliente: 'Reliquidación y devolución de cobro indebido de intereses',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // 8.4 TARJETA: Cupo, avances y disponibilidad
  const isCupoOrAvances =
    lower.includes('aumento de cupo') ||
    lower.includes('solicitud de cupo') ||
    lower.includes('incremento de cupo') ||
    lower.includes('ampliacion de cupo') ||
    lower.includes('disminucion de cupo') ||
    lower.includes('bajar cupo') ||
    lower.includes('sobrecupo') ||
    lower.includes('cupo no disponible') ||
    lower.includes('diferencia en cupo') ||
    lower.includes('cupo de la tarjeta') ||
    lower.includes('cupo de mi tarjeta') ||
    lower.includes('avance') ||
    lower.includes('avances') ||
    lower.includes('disponibilidad de cupo');

  if (isCupoOrAvances) {
    return {
      expediente,
      categoria_principal: 'TARJETAS',
      subcategoria: 'CUPO Y AVANCES',
      resumen_requerimiento: generateConciseSummary(rawText, 'TARJETAS', 'CUPO Y AVANCES', 'TARJETA DE CRÉDITO', `Cliente solicita aumento de cupo o gestión de avances en su tarjeta de crédito.`),
      intencion_cliente: 'Gestión de cupo, disponibilidad o avances de tarjeta de crédito',
      confianza: 97,
      requiere_revision_humana: false,
      producto_detectado: 'TARJETA DE CRÉDITO',
      problema_principal: 'Límite de crédito, disponibilidad de cupo o avances en tarjeta',
      solicitud_cliente: 'Aumento, ajuste de cupo o habilitación para realizar avances',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // 8.5 TARJETA: Devolución de compras y transacciones comerciales
  const hasRefundWord = lower.includes('devolucion') || lower.includes('reintegro') || lower.includes('reversion');
  const hasCommerceWord = lower.includes('compra') || lower.includes('comercio') || lower.includes('establecimiento') || lower.includes('datafono');

  const isPurchaseRefund =
    (hasRefundWord && hasCommerceWord) ||
    lower.includes('compra duplicada en comercio') ||
    lower.includes('doble cobro en datafono') ||
    lower.includes('transaccion declinada pero cobrada');

  if (isPurchaseRefund) {
    return {
      expediente,
      categoria_principal: 'TARJETAS',
      subcategoria: 'COMPRAS Y DEVOLUCIONES',
      resumen_requerimiento: generateConciseSummary(rawText, 'TARJETAS', 'COMPRAS Y DEVOLUCIONES', 'TARJETA DE CRÉDITO', `Cliente solicita acreditación de devolución pendiente por compra con tarjeta.`),
      intencion_cliente: 'Acreditación de reintegro o reversión de compra comercial',
      confianza: 96,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct !== 'NO ESPECIFICADO' ? detectedProduct : 'TARJETA DE CRÉDITO',
      problema_principal: 'Devolución de compra en comercio no reflejada en la tarjeta',
      solicitud_cliente: 'Acreditación del dinero devuelto por el comercio en la tarjeta',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // 8.6 TARJETA: Compras diferidas y financiación
  const isDeferredPurchase =
    lower.includes('compra diferida') ||
    lower.includes('compras diferidas') ||
    lower.includes('diferido a cuotas') ||
    lower.includes('diferir a cuotas') ||
    lower.includes('diferir compra') ||
    lower.includes('cambio de cuotas') ||
    lower.includes('rediferir') ||
    lower.includes('rediferido') ||
    lower.includes('plazo de cuotas') ||
    lower.includes('financiacion de compras');

  if (isDeferredPurchase) {
    return {
      expediente,
      categoria_principal: 'TARJETAS',
      subcategoria: 'DIFERIDOS Y FINANCIACIÓN',
      resumen_requerimiento: generateConciseSummary(rawText, 'TARJETAS', 'DIFERIDOS Y FINANCIACIÓN', 'TARJETA DE CRÉDITO', `Cliente solicita rediferir o ajustar número de cuotas en compra diferida.`),
      intencion_cliente: 'Ajuste de cuotas o plazo de compra diferida',
      confianza: 96,
      requiere_revision_humana: false,
      producto_detectado: 'TARJETA DE CRÉDITO',
      problema_principal: 'Plazo o cuotas de compra diferida en tarjeta de crédito',
      solicitud_cliente: 'Modificación del número de cuotas o rediferido de compra',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // 8.7 INFORMACIÓN Y DOCUMENTOS: Extractos, saldos y fechas de corte
  const isStatementIssue =
    lower.includes('diferencia en extracto') ||
    lower.includes('saldo en extracto') ||
    lower.includes('inconsistencia en el extracto') ||
    lower.includes('no me llega el extracto') ||
    lower.includes('fecha de corte') ||
    lower.includes('fecha limite de pago') ||
    lower.includes('extracto de mi tarjeta') ||
    lower.includes('copia de extracto');

  if (isStatementIssue) {
    const prodDesc = detectedProduct !== 'NO ESPECIFICADO' ? ` de ${detectedProduct.toLowerCase()}` : '';
    return {
      expediente,
      categoria_principal: 'INFORMACIÓN Y DOCUMENTOS',
      subcategoria: 'EXTRACTOS Y DOCUMENTOS',
      resumen_requerimiento: generateConciseSummary(rawText, 'INFORMACIÓN Y DOCUMENTOS', 'EXTRACTOS Y DOCUMENTOS', detectedProduct, `Cliente reporta diferencia o consulta extracto${prodDesc}.`),
      intencion_cliente: 'Aclaración de movimientos en extracto o fechas de facturación',
      confianza: 96,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: `Diferencia de saldo o consulta de extracto${prodDesc}`,
      solicitud_cliente: 'Aclaración de saldos y envío de extractos actualizados',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // 8.8 PRODUCTOS: CANCELACIÓN VOLUNTARIA
  if (
    (lower.includes('cancel') || lower.includes('cierre') || lower.includes('terminar contrato')) &&
    (lower.includes('tarjeta') || lower.includes('cuenta') || lower.includes('credito') || lower.includes('producto'))
  ) {
    const prodDesc = detectedProduct !== 'NO ESPECIFICADO' ? ` de ${detectedProduct.toLowerCase()}` : '';
    return {
      expediente,
      categoria_principal: 'PRODUCTOS',
      subcategoria: 'CANCELACIÓN DE PRODUCTOS',
      resumen_requerimiento: generateConciseSummary(rawText, 'PRODUCTOS', 'CANCELACIÓN DE PRODUCTOS', detectedProduct, `Cliente solicita cancelación definitiva${prodDesc}.`),
      intencion_cliente: 'Cliente desea cancelar o cerrar definitivamente un producto',
      confianza: 96,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: `Cancelación voluntaria${prodDesc}`,
      solicitud_cliente: 'Cierre y paz y salvo del producto cancelado',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // 8.9 PRODUCTOS: ACTIVACIÓN DE PRODUCTOS
  if (lower.includes('activar') || lower.includes('activacion') || lower.includes('habilitar uso') || lower.includes('habilitar tarjeta')) {
    const prodDesc = detectedProduct !== 'NO ESPECIFICADO' ? ` de ${detectedProduct.toLowerCase()}` : '';
    return {
      expediente,
      categoria_principal: 'PRODUCTOS',
      subcategoria: 'ACTIVACIÓN DE PRODUCTOS',
      resumen_requerimiento: generateConciseSummary(rawText, 'PRODUCTOS', 'ACTIVACIÓN DE PRODUCTOS', detectedProduct, `Cliente solicita activación${prodDesc} para su uso.`),
      intencion_cliente: 'Solicitud de activación o habilitación operativa del producto',
      confianza: 95,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: `Activación de producto${prodDesc}`,
      solicitud_cliente: 'Habilitación operativa para uso del producto',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // 8.10 TARJETAS: Plástico, entrega, reposición y bloqueo
  if (
    lower.includes('entrega de tarjeta') ||
    lower.includes('envio de tarjeta') ||
    lower.includes('no me ha llegado la tarjeta') ||
    lower.includes('tarjeta deteriorada') ||
    lower.includes('reposicion de tarjeta') ||
    lower.includes('reexpedicion de plastico') ||
    lower.includes('bloqueo de tarjeta') ||
    lower.includes('bloqueo de plastico') ||
    lower.includes('plastico')
  ) {
    return {
      expediente,
      categoria_principal: 'TARJETAS',
      subcategoria: 'PLÁSTICO Y BLOQUEO',
      resumen_requerimiento: generateConciseSummary(rawText, 'TARJETAS', 'PLÁSTICO Y BLOQUEO', detectedProduct, `Cliente solicita gestión física, entrega o reposición de tarjeta.`),
      intencion_cliente: 'Gestión física de plástico, entrega, deterioro o reposición',
      confianza: 95,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct !== 'NO ESPECIFICADO' ? detectedProduct : 'TARJETA DE CRÉDITO',
      problema_principal: 'Novedad con plástico de tarjeta (entrega, deterioro o bloqueo)',
      solicitud_cliente: 'Envío de nuevo plástico o reposición de tarjeta',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // 8.11 TARJETAS: Millas y programas de lealtad
  if (lower.includes('milla') || lower.includes('puntos') || lower.includes('canje') || lower.includes('lealtad') || lower.includes('lifemiles') || lower.includes('cashback')) {
    return {
      expediente,
      categoria_principal: 'TARJETAS',
      subcategoria: 'MILLAS Y PROGRAMAS DE LEALTAD',
      resumen_requerimiento: generateConciseSummary(rawText, 'TARJETAS', 'MILLAS Y PROGRAMAS DE LEALTAD', detectedProduct, `Cliente reclama acumulación o canje de millas y puntos de tarjeta.`),
      intencion_cliente: 'Gestión o reclamo sobre millas o puntos acumulados',
      confianza: 96,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct !== 'NO ESPECIFICADO' ? detectedProduct : 'TARJETA DE CRÉDITO',
      problema_principal: 'Acumulación o redención de millas y puntos del programa de lealtad',
      solicitud_cliente: 'Acreditación de millas o puntos no reflejados',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // 8.12 ACTUALIZACIÓN DE DATOS
  if ((lower.includes('actualiz') || lower.includes('cambio de')) && (lower.includes('dato') || lower.includes('telefono') || lower.includes('direccion') || lower.includes('correo') || lower.includes('celular'))) {
    return {
      expediente,
      categoria_principal: 'ACTUALIZACIÓN DE DATOS',
      subcategoria: 'DATOS DE CONTACTO',
      resumen_requerimiento: generateConciseSummary(rawText, 'ACTUALIZACIÓN DE DATOS', 'DATOS DE CONTACTO', detectedProduct, `Cliente solicita actualización de datos personales o de contacto.`),
      intencion_cliente: 'Solicitud de actualización de datos personales o de contacto',
      confianza: 96,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: 'Actualización de información de contacto',
      solicitud_cliente: 'Registro de nuevos datos de contacto en sistemas del banco',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // 8.13 INFORMACIÓN Y DOCUMENTOS: Paz y salvo, certificaciones
  if (lower.includes('paz y salvo') || lower.includes('certificacion') || lower.includes('certificado') || lower.includes('copia de contrato') || lower.includes('derecho de peticion')) {
    return {
      expediente,
      categoria_principal: 'INFORMACIÓN Y DOCUMENTOS',
      subcategoria: 'CERTIFICADOS Y PAZ Y SALVO',
      resumen_requerimiento: generateConciseSummary(rawText, 'INFORMACIÓN Y DOCUMENTOS', 'CERTIFICADOS Y PAZ Y SALVO', detectedProduct, `Cliente solicita expedición de paz y salvo o certificación bancaria.`),
      intencion_cliente: 'Solicitud de emisión o envío de documentos bancarios',
      confianza: 96,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: 'Expedición de paz y salvo o certificado bancario',
      solicitud_cliente: 'Envío del certificado o documento solicitado',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // 8.14 CRÉDITOS / CARTERA: Acuerdos de pago y reestructuración de créditos (excluye tarjetas de crédito)
  if (
    lower.includes('acuerdo de pago') ||
    lower.includes('refinanc') ||
    lower.includes('alivio financiero') ||
    lower.includes('reestructuracion') ||
    textWithoutTarjetaCredito.includes('credito') ||
    lower.includes('cartera') ||
    lower.includes('prestamo') ||
    lower.includes('libranza') ||
    lower.includes('hipotecario')
  ) {
    const isRefinance = lower.includes('refinanc') || lower.includes('acuerdo') || lower.includes('alivio') || lower.includes('reestructur');
    const sub = isRefinance ? 'REFINANCIACIÓN Y ACUERDOS' : 'ESTADO DE OBLIGACIÓN / SALDOS';
    return {
      expediente,
      categoria_principal: 'CRÉDITOS / CARTERA',
      subcategoria: sub,
      resumen_requerimiento: generateConciseSummary(rawText, 'CRÉDITOS / CARTERA', sub, detectedProduct, `Cliente solicita acuerdo de pago o revisión de crédito.`),
      intencion_cliente: 'Consulta o gestión de obligación crediticia o acuerdo de pago',
      confianza: 95,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: 'Estado de crédito o solicitud de acuerdo de pago',
      solicitud_cliente: 'Acuerdo de pago o revisión de condiciones crediticias',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // 8.15 CANALES DIGITALES: Falla o acceso
  if (lower.includes('app') || lower.includes('portal') || lower.includes('banca virtual') || lower.includes('token') || lower.includes('otp') || lower.includes('clave') || lower.includes('usuario')) {
    const isTechGlitch = lower.includes('falla') || lower.includes('pantalla') || lower.includes('caida') || lower.includes('error');
    const sub = isTechGlitch ? 'FALLAS TECNOLÓGICAS' : 'BANCA MÓVIL Y VIRTUAL';
    return {
      expediente,
      categoria_principal: 'CANALES DIGITALES',
      subcategoria: sub,
      resumen_requerimiento: generateConciseSummary(rawText, 'CANALES DIGITALES', sub, detectedProduct, `Cliente reporta falla técnica o bloqueo de acceso a canal digital.`),
      intencion_cliente: 'Dificultad de acceso, bloqueo o falla operativa en canal digital',
      confianza: 95,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: 'Acceso o falla en canal digital bancario',
      solicitud_cliente: 'Desbloqueo de credenciales o solución a falla técnica',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // 8.16 TRANSFERENCIAS
  if (lower.includes('transferencia') || lower.includes('transferir') || lower.includes('ach') || lower.includes('bre-b') || lower.includes('giro')) {
    return {
      expediente,
      categoria_principal: 'TRANSFERENCIAS',
      subcategoria: 'TRANSFERENCIAS',
      resumen_requerimiento: generateConciseSummary(rawText, 'TRANSFERENCIAS', 'TRANSFERENCIAS', detectedProduct, `Cliente reporta inconveniente con transferencia de dinero.`),
      intencion_cliente: 'Problema o retraso con transferencia de dinero',
      confianza: 96,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: 'Transferencia no acreditada o con retraso',
      solicitud_cliente: 'Acreditación o confirmación de transferencia',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // 8.17 PAGOS / ABONOS GENERALES
  if (lower.includes('pago') || lower.includes('abono') || lower.includes('consignacion') || lower.includes('recaudo')) {
    return {
      expediente,
      categoria_principal: 'PAGOS / ABONOS',
      subcategoria: 'APLICACIÓN DE PAGO',
      resumen_requerimiento: generateConciseSummary(rawText, 'PAGOS / ABONOS', 'APLICACIÓN DE PAGO', detectedProduct, `Cliente solicita aplicación o revisión de pago efectuado.`),
      intencion_cliente: 'Aplicación o validación de pago o abono realizado',
      confianza: 95,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: 'Aplicación de pago o abono a producto',
      solicitud_cliente: 'Aplicación y reflejo del pago en el saldo',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // 8.18 COMISIONES Y TARIFAS
  if (lower.includes('cobro') || lower.includes('comision') || lower.includes('tarifa') || lower.includes('cargo a cuenta') || lower.includes('cargo')) {
    return {
      expediente,
      categoria_principal: 'COMISIONES Y COBROS',
      subcategoria: 'COMISIONES Y TARIFAS',
      resumen_requerimiento: generateConciseSummary(rawText, 'COMISIONES Y COBROS', 'COMISIONES Y TARIFAS', detectedProduct, `Cliente expresa inconformidad con comisiones o cargos aplicados.`),
      intencion_cliente: 'Aclaración o reclamo sobre cargos o comisiones operativas',
      confianza: 90,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: 'Cobro de comisiones o tarifas bancarias',
      solicitud_cliente: 'Aclaración y devolución de cobro aplicado',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // 8.19 SERVICIO / ATENCIÓN
  if (lower.includes('atencion') || lower.includes('servicio') || lower.includes('asesor') || lower.includes('sucursal') || lower.includes('oficina') || lower.includes('demora')) {
    const isTime = lower.includes('tiempo') || lower.includes('demora') || lower.includes('plazo') || lower.includes('sin respuesta');
    const sub = isTime ? 'TIEMPOS DE RESPUESTA' : 'ATENCIÓN ASESOR Y SUCURSAL';
    return {
      expediente,
      categoria_principal: 'SERVICIO / ATENCIÓN',
      subcategoria: sub,
      resumen_requerimiento: generateConciseSummary(rawText, 'SERVICIO / ATENCIÓN', sub, detectedProduct, `Cliente reclama inconformidad con atención o tiempos de respuesta.`),
      intencion_cliente: 'Inconformidad con la calidad del servicio o tiempos',
      confianza: 92,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: 'Calidad de atención o demora en trámite',
      solicitud_cliente: 'Respuesta oportuna y mejora en servicio',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // =========================================================================
  // PRIORIDAD 9: CASO ATÍPICO LEGÍTIMO (OTRAS)
  // Con texto explicativo suficiente que no encaja en la operativa estándar
  // =========================================================================
  if (cleanAlpha.length >= 25) {
    return {
      expediente,
      categoria_principal: 'OTRAS',
      subcategoria: 'CASOS ATÍPICOS',
      resumen_requerimiento: generateConciseSummary(rawText, 'OTRAS', 'CASOS ATÍPICOS', detectedProduct, `Cliente presenta solicitud particular clasificada como caso atípico.`),
      intencion_cliente: 'Requerimiento particular no encasillado en categorías operativas estándar',
      confianza: 85,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: 'Requerimiento bancario atípico con información detallada',
      solicitud_cliente: 'Gestión individual del caso según descripción provista',
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // =========================================================================
  // PRIORIDAD 10: REVISIÓN HUMANA
  // =========================================================================
  return {
    expediente,
    categoria_principal: 'REVISIÓN HUMANA',
    subcategoria: 'INFORMACIÓN INSUFICIENTE',
    resumen_requerimiento: 'Descripción vaga o sin detalle del problema para clasificar.',
    intencion_cliente: 'Sin información temática identificable',
    confianza: 30,
    requiere_revision_humana: true,
    motivo_de_revision: 'El caso no contiene detalles suficientes para clasificarlo con certeza.',
    producto_detectado: detectedProduct,
    problema_principal: 'Información insuficiente para clasificar',
    solicitud_cliente: 'No especificada',
    evidencia_textual: rawText
  };
}

/**
 * Independent validation step:
 * Audits the classification result against raw text evidence to detect and fix
 * contradictions, false positives (such as "sin embargo" triggering EMBARGOS, or CDT without CDT).
 */
export function validateClassificationConsistency(
  record: PQRInputRecord,
  result: PQRClassificationResult
): PQRClassificationResult {
  const rawText = String(record.descripcion_original || '');
  const lower = rawText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const textWithoutSinEmbargo = lower.replace(/\bsin embargo\b/gi, ' ');

  // 1. Contradiction: EMBARGOS triggered by "sin embargo" without any judicial terms
  if (result.categoria_principal === 'EMBARGOS') {
    const hasRealEmbargoTerms =
      textWithoutSinEmbargo.includes('desembargo') ||
      textWithoutSinEmbargo.includes('levantar embargo') ||
      textWithoutSinEmbargo.includes('levantamiento de embargo') ||
      textWithoutSinEmbargo.includes('medida cautelar') ||
      textWithoutSinEmbargo.includes('juzgado') ||
      textWithoutSinEmbargo.includes('orden judicial') ||
      textWithoutSinEmbargo.includes('cuenta embargada') ||
      textWithoutSinEmbargo.includes('embargo judicial') ||
      /\bembarg(o|os|ado|ada|aron)\b/.test(textWithoutSinEmbargo);

    if (!hasRealEmbargoTerms) {
      // Re-run classification ignoring false embargo
      const fallback = classifyPQRDeterministic({
        ...record,
        descripcion_original: textWithoutSinEmbargo
      });
      return {
        ...fallback,
        existe_inconsistencia: 'SI',
        motivo_inconsistencia: 'Se corrigió falso positivo: la frase "sin embargo" no corresponde a una medida judicial de embargo financiero.'
      };
    }
  }

  // 2. Contradiction: CDT without explicit CDT mention
  if (result.categoria_principal === 'CDT') {
    const hasExplicitCDT =
      /\bcdt\b/i.test(lower) ||
      lower.includes('certificado de deposito a termino') ||
      lower.includes('certificado de deposito') ||
      lower.includes('titulo cdt') ||
      lower.includes('deceval');

    if (!hasExplicitCDT) {
      const fixed = classifyPQRDeterministic({
        ...record,
        descripcion_original: lower.replace(/\bcuenta\b/g, 'producto')
      });
      return {
        ...fixed,
        categoria_principal: fixed.categoria_principal === 'CDT' ? 'PRODUCTOS' : fixed.categoria_principal,
        subcategoria: fixed.categoria_principal === 'CDT' ? 'CONDICIONES DEL PRODUCTO' : fixed.subcategoria,
        existe_inconsistencia: 'SI',
        motivo_inconsistencia: 'Se corrigió categorización: la mención de cuenta o producto no constituye evidencia explícita de CDT.'
      };
    }
  }

  // 3. Contradiction: Fraud manifestation not categorized as FRAUDES (excluding insurance disputes)
  const isInsurance = lower.includes('seguro') || lower.includes('poliza');
  const hasFraudMention =
    !isInsurance && (
      lower.includes('no reconozco') ||
      lower.includes('yo no hice') ||
      lower.includes('no autorice') ||
      lower.includes('desconozco') ||
      lower.includes('me robaron') ||
      lower.includes('compra no reconocida')
    );

  if (hasFraudMention && result.categoria_principal !== 'FRAUDES') {
    return {
      ...result,
      categoria_principal: 'FRAUDES',
      subcategoria: 'OPERACIÓN NO RECONOCIDA',
      confianza: 98,
      requiere_revision_humana: false,
      existe_inconsistencia: 'SI',
      motivo_inconsistencia: 'Prioridad 1 aplicada: el cliente manifiesta no reconocer una compra u operación.'
    };
  }

  return result;
}

/**
 * Builds the canonical PQRSAnalysis object preserving simple, unbloated fields.
 */
export function buildPQRSAnalysis(
  record: PQRInputRecord,
  result: PQRClassificationResult
): PQRSAnalysis {
  // Validate consistency independently before final build
  const validated = validateClassificationConsistency(record, result);

  const shortSummary = truncateWords(validated.resumen_requerimiento || record.descripcion_original || '', 20);
  const catPrincipal = validated.categoria_principal;
  const subcat = validated.subcategoria;
  const isHumanReview = catPrincipal === 'REVISIÓN HUMANA' || validated.requiere_revision_humana;
  const conf = Math.min(100, Math.max(0, validated.confianza));

  return {
    numero_expediente: record.numero_expediente,
    categoria: catPrincipal,
    categoria_principal: catPrincipal,
    subcategoria: subcat,
    resumen_requerimiento: shortSummary,
    intencion_cliente: validated.intencion_cliente || shortSummary,
    confianza: conf,
    requiere_revision_humana: isHumanReview ? 'SI' : 'NO',
    requiere_revision: isHumanReview,
    motivo_de_revision: validated.motivo_de_revision,
    existe_inconsistencia: validated.existe_inconsistencia || 'NO',
    posible_inconsistencia: validated.existe_inconsistencia === 'SI',
    motivo_inconsistencia: validated.motivo_inconsistencia,
    producto: validated.producto_detectado || record.producto_original || 'Identificado en descripción',
    producto_detectado: validated.producto_detectado,
    problema_principal: validated.problema_principal || shortSummary,
    solicitud_cliente: validated.solicitud_cliente || validated.intencion_cliente || shortSummary,
    evidencia_textual: validated.evidencia_textual || record.descripcion_original.slice(0, 100),
    tipo_pqr: catPrincipal === 'INFORMACIÓN Y DOCUMENTOS' ? 'PETICIÓN' : catPrincipal === 'SERVICIO / ATENCIÓN' ? 'QUEJA' : 'RECLAMO',
    motivo: catPrincipal,
    submotivo: subcat,
    tema_principal: catPrincipal,
    subtema: subcat,
    que_solicita_exactamente: validated.solicitud_cliente || shortSummary,
    hechos_principales: record.descripcion_original.slice(0, 160).replace(/[\r\n]+/g, ' ').trim(),
    sustento_clasificacion: `Clasificado bajo ${catPrincipal} > ${subcat} con producto ${validated.producto_detectado}.`,
    resumen_normalizado: shortSummary,
    justificacion: `Agrupado bajo ${catPrincipal} > ${subcat} con base en la evidencia textual y reglas de negocio.`,
    nivel_confianza: conf >= 85 ? 'Alta' : conf >= 70 ? 'Media' : 'Baja',
    modelo_ia: 'gemini-3.8-flash',
    version_prompt: 'v4.1.0-tarjetas-credito-mejoradas',
    fecha_analisis: new Date().toISOString(),
    estado_revision: 'PENDIENTE'
  };
}

/**
 * Global consolidation step:
 * Audits the full list of classified records to ensure homogeneous naming.
 */
export function consolidateBatchClassifications(analyses: PQRSAnalysis[]): PQRSAnalysis[] {
  return analyses.map(item => {
    const rawCat = item.categoria || item.categoria_principal || '';
    const rawSub = item.subcategoria || '';

    // Normalize synonymous category names
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
