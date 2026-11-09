import { PQRSAnalysis } from '../types';
import { extractItauPaymentDetails } from './paymentExtractor';

export interface PQRInputRecord {
  numero_expediente: string;
  descripcion_original: string;
  resumen_original?: string;
  submotivo_original?: string;
  producto_original?: string;
  tipo_origen?: string;
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
  fecha_pago?: string;
  valor_pago?: string;
  pagos_detectados?: {
    fecha?: string;
    valor?: string;
    descripcion?: string;
    confianza?: string;
  }[];
}

/**
 * Extracts and normalizes TIPO ORIGEN from record or additional columns.
 * Strictly adheres to the rule of not using description or summary to guess origin.
 */
export function extractTipoOrigen(record: PQRInputRecord): string {
  if (record.tipo_origen && String(record.tipo_origen).trim().length > 0) {
    return String(record.tipo_origen).trim();
  }
  if (record.columnas_adicionales) {
    // Check direct known column keys first
    const directKeys = [
      'TIPO ORIGEN', 'tipo_origen', 'Tipo Origen', 'TIPO_ORIGEN', 'tipo origen',
      'ORIGEN', 'origen', 'CANAL_ORIGEN', 'canal_origen', 'CANAL ORIGEN'
    ];
    for (const k of directKeys) {
      if (record.columnas_adicionales[k] !== undefined && record.columnas_adicionales[k] !== null) {
        const val = String(record.columnas_adicionales[k]).trim();
        if (val.length > 0) return val;
      }
    }
    // Search by normalized alphanumeric key
    for (const [key, val] of Object.entries(record.columnas_adicionales)) {
      const cleanKey = key.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      if (cleanKey === 'tipoorigen' || cleanKey === 'origen' || cleanKey === 'canalorigen') {
        if (val !== null && val !== undefined) {
          const s = String(val).trim();
          if (s.length > 0) return s;
        }
      }
    }
  }
  return '';
}

/**
 * Normalizes uppercase, lowercase, accents and spaces to compare against ITAU.
 */
export function isTipoOrigenItau(val?: any): boolean {
  if (val === null || val === undefined) return false;
  const clean = String(val)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  return clean === 'ITAU';
}

/**
 * Detects whether the detailed description corresponds to an unapplied, unreflected,
 * pending, partial, rejected, delayed payment, transfer not credited or missing payment receipt.
 */
export function isPaymentUnappliedIssue(rawText: string): boolean {
  if (!rawText || rawText.trim().length === 0) return false;
  const lower = rawText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Where are my payments / where is the payment
  if (
    lower.includes('donde esta el pago') ||
    lower.includes('donde estan los pagos') ||
    lower.includes('donde esta mi pago') ||
    lower.includes('donde estan mis pagos') ||
    lower.includes('que paso con el pago') ||
    lower.includes('que paso con mi pago') ||
    lower.includes('donde quedaron los pagos') ||
    lower.includes('donde quedo el pago')
  ) {
    return true;
  }

  // 2. Unreflected payments ("no veo el pago", "no veo mis pagos", "no se refleja", "no aparece reflejado", etc.)
  const hasPaymentWord =
    lower.includes('pago') ||
    lower.includes('pagos') ||
    lower.includes('pague') ||
    lower.includes('pagado') ||
    lower.includes('abono') ||
    lower.includes('abonos') ||
    lower.includes('abone') ||
    lower.includes('transferencia') ||
    lower.includes('transferi') ||
    lower.includes('consignacion') ||
    lower.includes('consigne') ||
    lower.includes('debito') ||
    lower.includes('debitado') ||
    lower.includes('debitaron') ||
    lower.includes('devitado') ||
    lower.includes('descontaron') ||
    lower.includes('descontado') ||
    lower.includes('descuento');

  const hasNotReflected =
    lower.includes('no veo el pago') ||
    lower.includes('no veo mis pagos') ||
    lower.includes('no veo los pagos') ||
    lower.includes('no veo reflejado') ||
    lower.includes('no se ve reflejado') ||
    lower.includes('no esta reflejado') ||
    lower.includes('no se refleja') ||
    lower.includes('sin reflejar') ||
    lower.includes('pendiente de reflejar') ||
    lower.includes('no aparece reflejado') ||
    lower.includes('no aparece el pago') ||
    lower.includes('no aparecen los pagos') ||
    lower.includes('no aparece en el saldo') ||
    lower.includes('no aparece en mi tarjeta') ||
    lower.includes('no aparece en la tarjeta') ||
    lower.includes('no aparece en el cupo') ||
    lower.includes('no aparece abonada') ||
    lower.includes('no aparece abonado') ||
    lower.includes('no aparece abonadas') ||
    lower.includes('no ha ingresado') ||
    lower.includes('no ingresa el pago') ||
    lower.includes('aun no aparece') ||
    lower.includes('todavia no aparece') ||
    lower.includes('sigue sin aparecer') ||
    lower.includes('no se ve el abono');

  if (hasPaymentWord && hasNotReflected) {
    return true;
  }

  // 3. Not applied / pending application
  const hasNotApplied =
    lower.includes('no se ha aplicado') ||
    lower.includes('no ha sido aplicado') ||
    lower.includes('no aplicado') ||
    lower.includes('no aplicada') ||
    lower.includes('sin aplicar') ||
    lower.includes('pendiente de aplicacion') ||
    lower.includes('pendiente de aplicar') ||
    lower.includes('sigue pendiente de aplicacion') ||
    lower.includes('falta aplicar') ||
    lower.includes('no aplicaron el pago') ||
    lower.includes('no abonaron el pago') ||
    lower.includes('aplicar el pago') ||
    lower.includes('solicito aplicar') ||
    lower.includes('solicitando aplicar') ||
    lower.includes('aplicacion de pago') ||
    lower.includes('aplicacion del pago') ||
    lower.includes('aplicar pago');

  if (hasPaymentWord && hasNotApplied) {
    return true;
  }

  // 4. Rejected / delayed payment
  const hasRejectionOrDelay =
    lower.includes('pago rechazado') ||
    lower.includes('pago fue rechazado') ||
    lower.includes('pago quedo pendiente') ||
    lower.includes('demora en su aplicacion') ||
    lower.includes('demora en la aplicacion') ||
    lower.includes('demora en el pago') ||
    lower.includes('demora del pago') ||
    lower.includes('retraso en el pago') ||
    lower.includes('retraso en la aplicacion') ||
    lower.includes('tardanza en el pago');

  if (hasRejectionOrDelay) {
    return true;
  }

  // 5. Transfer not credited ("Realicé una transferencia y no aparece abonada")
  if (
    lower.includes('transferencia') &&
    (lower.includes('no aparece abonada') ||
     lower.includes('no abonada') ||
     lower.includes('no acreditada') ||
     lower.includes('no se ve reflejada') ||
     lower.includes('no ha llegado') ||
     lower.includes('no aparece en la tarjeta') ||
     lower.includes('no aparece'))
  ) {
    return true;
  }

  // 6. Discounted/debited from account but not reflected or applied to card/obligation
  // "Me descontaron el dinero, pero no se refleja en mi tarjeta"
  // "El pago aparece debitado de mi cuenta, pero no aplicado a la obligación"
  if (
    (lower.includes('descontaron') || lower.includes('descuento') || lower.includes('debitado') || lower.includes('debitaron') || lower.includes('devitado')) &&
    (lower.includes('no se refleja') ||
     lower.includes('no aparece') ||
     lower.includes('no aplicado') ||
     lower.includes('no aplicada') ||
     lower.includes('sin aplicar') ||
     lower.includes('pendiente') ||
     lower.includes('a la obligacion'))
  ) {
    return true;
  }

  // 7. Partial / duplicated / multiple payments: "Solo aparece uno de los dos pagos que realicé", "dos pagos", "2 pagos"
  if (
    lower.includes('solo aparece uno de los') ||
    lower.includes('solo uno de los dos') ||
    lower.includes('solo uno de los pagos') ||
    lower.includes('uno de los dos pagos') ||
    lower.includes('dos pagos') ||
    lower.includes('2 pagos') ||
    lower.includes('ambos pagos') ||
    lower.includes('pago duplicado') ||
    lower.includes('doble pago') ||
    lower.includes('cobro duplicado del pago')
  ) {
    return true;
  }

  // 8. Missing payment receipt / record: "No encuentro el comprobante o el registro del pago realizado"
  if (
    (lower.includes('no encuentro') || lower.includes('no tengo') || lower.includes('no aparece') || lower.includes('donde esta')) &&
    (lower.includes('comprobante') || lower.includes('registro del pago') || lower.includes('soporte del pago') || lower.includes('comprobante de pago'))
  ) {
    return true;
  }

  // 9. Cross-month payment reflection issues: "Pagué en septiembre y todavía no aparece en octubre"
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
  const hasMonth = months.some(m => lower.includes(m));
  if (hasMonth) {
    if (
      (lower.includes('pague') || lower.includes('pago') || lower.includes('pagos')) &&
      (lower.includes('no veo') || lower.includes('no aparece') || lower.includes('todavia') || lower.includes('aun') || lower.includes('refleja'))
    ) {
      return true;
    }
  }

  return false;
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

  // 1. CDT (Highest priority for banking investments/certificates)
  // REGLA OBLIGATORIA: Si la descripción del cliente menciona CDT, el producto detectado debe ser CDT.
  if (
    /\bcdt\b/i.test(fullText) ||
    /\bcdts\b/i.test(fullText) ||
    /\bc\.d\.t\b/i.test(fullText) ||
    fullText.includes('certificado de deposito a termino') ||
    fullText.includes('certificados de deposito a termino') ||
    fullText.includes('certificado de deposito') ||
    fullText.includes('certificados de deposito') ||
    fullText.includes('certificado a termino') ||
    fullText.includes('certificados a termino') ||
    fullText.includes('deposito a termino') ||
    fullText.includes('depositos a termino') ||
    fullText.includes('inversion cdt') ||
    fullText.includes('inversion en cdt') ||
    fullText.includes('inversiones cdt') ||
    fullText.includes('rendimientos de cdt') ||
    fullText.includes('rendimiento de cdt') ||
    fullText.includes('cdt vencido') ||
    fullText.includes('cdt cancelado') ||
    fullText.includes('cdt renovado') ||
    fullText.includes('cdt fisico') ||
    fullText.includes('titulo cdt') ||
    fullText.includes('titulos cdt') ||
    fullText.includes('macrotitulo') ||
    fullText.includes('deceval')
  ) {
    return 'CDT';
  }

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

  if (fullText.includes('cuenta de ahorros') || fullText.includes('cta ahorros') || fullText.includes('cuenta ahorros')) {
    return 'CUENTA DE AHORROS';
  }

  if (fullText.includes('cuenta corriente') || /\bcta(\.|\s)+corriente/i.test(fullText)) {
    return 'CUENTA CORRIENTE';
  }

  if (fullText.includes('vivienda') || fullText.includes('hipotecari') || fullText.includes('frech') || fullText.includes('fresh') || fullText.includes('french')) {
    return 'CRÉDITO DE VIVIENDA';
  }

  if (fullText.includes('leasing')) {
    return 'LEASING';
  }

  if (fullText.includes('libre inversion') || fullText.includes('libre inversión')) {
    return 'CRÉDITO DE LIBRE INVERSIÓN';
  }

  if (fullText.includes('rotativo')) {
    return 'CRÉDITO ROTATIVO';
  }

  if (fullText.includes('vehiculo') || fullText.includes('vehículo') || fullText.includes('automotriz') || fullText.includes('auto')) {
    return 'CRÉDITO DE VEHÍCULO';
  }

  if (fullText.includes('consumo')) {
    return 'CRÉDITO DE CONSUMO';
  }

  if (fullText.includes('libranza') || fullText.includes('nomina') || fullText.includes('descuento de nomina')) {
    return 'LIBRANZA';
  }

  if (
    fullText.includes('credito') ||
    fullText.includes('prestamo') ||
    fullText.includes('amortizacion') ||
    fullText.includes('plan de pagos') ||
    fullText.includes('plan de pago') ||
    fullText.includes('cartera') ||
    fullText.includes('obligacion crediticia')
  ) {
    return 'CRÉDITO / CARTERA';
  }

  if (fullText.includes('cuenta de ahorros') || fullText.includes('cuenta') || /\bcta(\.|\b)/i.test(fullText)) {
    return 'CUENTA DE AHORROS';
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

  // 0. PAGO A ITAU
  if (clean.includes('PAGO A ITAU') || clean.includes('PAGO ITAU')) {
    if (clean.includes('TRANSFERENCIA') || clean.includes('ABONADA')) {
      return { categoria_principal: 'PAGO A ITAU', subcategoria: 'TRANSFERENCIA NO ABONADA' };
    }
    if (clean.includes('COMPROBANTE') || clean.includes('REGISTRO') || clean.includes('SOPORTE')) {
      return { categoria_principal: 'PAGO A ITAU', subcategoria: 'COMPROBANTE NO ENCONTRADO' };
    }
    if (clean.includes('DEMORA') || clean.includes('PENDIENTE') || clean.includes('RECHAZ')) {
      return { categoria_principal: 'PAGO A ITAU', subcategoria: 'PAGO PENDIENTE / DEMORA' };
    }
    if (clean.includes('DUPLICAD') || clean.includes('PARCIAL') || clean.includes('UNO DE LOS DOS')) {
      return { categoria_principal: 'PAGO A ITAU', subcategoria: 'PAGO DUPLICADO / PARCIAL' };
    }
    if (clean.includes('APLICACION') || clean.includes('APLICADO')) {
      return { categoria_principal: 'PAGO A ITAU', subcategoria: 'APLICACIÓN DE PAGO' };
    }
    return { categoria_principal: 'PAGO A ITAU', subcategoria: 'PAGO NO REFLEJADO' };
  }

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
  if (
    /\bCDT\b/.test(clean) ||
    /\bCDTS\b/.test(clean) ||
    /\bC\.D\.T\b/.test(clean) ||
    clean.includes('DEPOSITO A TERMINO') ||
    clean.includes('CERTIFICADO A TERMINO') ||
    clean.includes('CERTIFICADO DE DEPOSITO') ||
    clean.includes('INVERSION CDT') ||
    clean.includes('DECEVAL')
  ) {
    if (clean.includes('TRIBUTARI') || clean.includes('RENTA') || clean.includes('FISCAL') || clean.includes('RETEFUENTE') || clean.includes('EXOGENA') || clean.includes('DIAN')) {
      return { categoria_principal: 'CDT', subcategoria: 'CERTIFICADOS TRIBUTARIOS' };
    }
    if (
      clean.includes('CERTIFICADO DE SALDO') ||
      clean.includes('DECEVAL') ||
      clean.includes('SALDO O DECEVAL') ||
      clean.includes('CERTIFICADOS Y SOPORTES') ||
      clean.includes('TITULARIDAD') ||
      clean.includes('VALORES INICIALES') ||
      clean.includes('CDT FISICO') ||
      clean.includes('TITULO FISICO') ||
      clean.includes('MACROTITULO')
    ) {
      return { categoria_principal: 'CDT', subcategoria: 'CERTIFICADO DE SALDO O DECEVAL' };
    }
    if (clean.includes('RENOVAC') || clean.includes('PRORROG')) {
      return { categoria_principal: 'CDT', subcategoria: 'RENOVACIÓN' };
    }
    if (clean.includes('APERTUR') || clean.includes('CONSTITUC') || clean.includes('FORMALIZAC') || clean.includes('CREAC')) {
      return { categoria_principal: 'CDT', subcategoria: 'APERTURA' };
    }
    if (clean.includes('VISUALIZ') || clean.includes('APP') || clean.includes('DESAPARECI') || clean.includes('CANALES DIGITALES') || clean.includes('PORTAL')) {
      return { categoria_principal: 'CDT', subcategoria: 'VISUALIZACIÓN' };
    }
    if (clean.includes('ANTICIPAD') || clean.includes('CANCELACION') || clean.includes('CANCELAR') || clean.includes('RETIRAR ANTES') || clean.includes('PENALIDAD')) {
      return { categoria_principal: 'CDT', subcategoria: 'CANCELACIÓN' };
    }
    if (clean.includes('PAGO') || clean.includes('NO ENTREGADO') || clean.includes('NO ABONADO') || clean.includes('DESEMBOLS') || clean.includes('REDENCION') || clean.includes('VENCIMIENTO') || clean.includes('NO RECIBI')) {
      return { categoria_principal: 'CDT', subcategoria: 'PAGO' };
    }
    if (clean.includes('RENDIMIENTO') || clean.includes('INTERES') || clean.includes('TASA') || clean.includes('LIQUIDACION') || clean.includes('RENTABILIDAD') || clean.includes('GANANCIA')) {
      return { categoria_principal: 'CDT', subcategoria: 'RENDIMIENTOS / INTERESES' };
    }
    return { categoria_principal: 'CDT', subcategoria: 'CERTIFICADO DE SALDO O DECEVAL' };
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

  // 6. CUOTAS DE MANEJO
  if (clean.includes('CUOTA DE MANEJO') || clean.includes('CUOTA MANEJO') || clean.includes('CUOTAS DE MANEJO') || clean.includes('CUOTAS MANEJO')) {
    if (clean.includes('CANCEL') || clean.includes('BLOQUE') || clean.includes('CERRAD') || clean.includes('POSTERIOR') || clean.includes('NO USO') || clean.includes('SIN USO')) {
      return { categoria_principal: 'CUOTAS DE MANEJO', subcategoria: 'COBRO POSTERIOR A CANCELACIÓN' };
    }
    if (clean.includes('EXONERAC') || clean.includes('BENEFICIO') || clean.includes('GRATIS') || clean.includes('GRATUIT') || clean.includes('SIN COBRO')) {
      return { categoria_principal: 'CUOTAS DE MANEJO', subcategoria: 'EXONERACIÓN O BENEFICIO NO APLICADO' };
    }
    if (clean.includes('DUPLICAD') || clean.includes('DOBLE') || clean.includes('DOS VECES')) {
      return { categoria_principal: 'CUOTAS DE MANEJO', subcategoria: 'COBRO DUPLICADO' };
    }
    if (clean.includes('DEVOL') || clean.includes('REVERSION') || clean.includes('REINTEGRO') || clean.includes('ELIMIN') || clean.includes('RETIRAR')) {
      return { categoria_principal: 'CUOTAS DE MANEJO', subcategoria: 'DEVOLUCIÓN O REVERSIÓN' };
    }
    if (clean.includes('NO RECONOCID') || clean.includes('NO AUTORIZ') || clean.includes('DESCONOC')) {
      return { categoria_principal: 'CUOTAS DE MANEJO', subcategoria: 'COBRO NO RECONOCIDO' };
    }
    if (clean.includes('ACLARAC') || clean.includes('CONDICION') || clean.includes('VALOR') || clean.includes('INCONSIST') || clean.includes('DIFERENC') || clean.includes('EXPLICAC')) {
      return { categoria_principal: 'CUOTAS DE MANEJO', subcategoria: 'ACLARACIÓN DEL VALOR O LAS CONDICIONES' };
    }
    return { categoria_principal: 'CUOTAS DE MANEJO', subcategoria: 'COBRO' };
  }

  // 6.1 HONORARIOS Y GASTOS DE COBRANZA
  if (clean.includes('HONORARIO') || clean.includes('GASTO DE COBRANZA') || clean.includes('GASTOS DE COBRANZA') || clean.includes('GESTION DE COBRANZA') || clean.includes('GESTION DE COBRO') || clean.includes('COBRO PREJURIDICO') || clean.includes('COBRANZA PREJURIDICA') || clean.includes('GASTOS COBRANZA') || clean.includes('GASTOS COBRO')) {
    if (clean.includes('NO ESTABA EN MORA') || clean.includes('AL DIA') || clean.includes('ANTES DE LA FECHA') || clean.includes('A TIEMPO') || clean.includes('OPORTUN')) {
      return { categoria_principal: 'HONORARIOS Y GASTOS DE COBRANZA', subcategoria: 'COBRO CUESTIONADO POR NO ESTAR EN MORA' };
    }
    if (clean.includes('DESPUES DE PAGAR') || clean.includes('DESPUES DEL PAGO') || clean.includes('DEUDA PAGADA') || clean.includes('OBLIGACION PAGADA') || clean.includes('CANCELADA')) {
      return { categoria_principal: 'HONORARIOS Y GASTOS DE COBRANZA', subcategoria: 'COBRO DESPUÉS DEL PAGO' };
    }
    if (clean.includes('NORMALIZ') || clean.includes('REESTRUCT') || clean.includes('ACUERDO')) {
      return { categoria_principal: 'HONORARIOS Y GASTOS DE COBRANZA', subcategoria: 'COBRO POSTERIOR A NORMALIZACIÓN' };
    }
    if (clean.includes('SOPORTE') || clean.includes('SIN COMUNIC') || clean.includes('INFORMAC') || clean.includes('ORIGINO') || clean.includes('NO RECIBI')) {
      return { categoria_principal: 'HONORARIOS Y GASTOS DE COBRANZA', subcategoria: 'FALTA DE INFORMACIÓN O SOPORTES' };
    }
    if (clean.includes('DUPLICAD') || clean.includes('DOBLE') || clean.includes('REPETID') || clean.includes('DOS VECES')) {
      return { categoria_principal: 'HONORARIOS Y GASTOS DE COBRANZA', subcategoria: 'COBRO DUPLICADO' };
    }
    if (clean.includes('DEVOL') || clean.includes('REVERSION') || clean.includes('REINTEGRO') || clean.includes('ELIMIN') || clean.includes('RETIRAR') || clean.includes('AJUSTE DEL SALDO')) {
      return { categoria_principal: 'HONORARIOS Y GASTOS DE COBRANZA', subcategoria: 'DEVOLUCIÓN O REVERSIÓN' };
    }
    if (clean.includes('EXCESIV') || clean.includes('PORCENTAJE') || clean.includes('CALCULO') || clean.includes('VALOR NO CONFORME') || clean.includes('DESPROPORC') || clean.includes('MUY ALTO')) {
      return { categoria_principal: 'HONORARIOS Y GASTOS DE COBRANZA', subcategoria: 'VALOR O CÁLCULO NO CONFORME' };
    }
    if (clean.includes('HONORARIO') || clean.includes('ABOGADO') || clean.includes('PREJURIDIC') || clean.includes('JURIDIC')) {
      return { categoria_principal: 'HONORARIOS Y GASTOS DE COBRANZA', subcategoria: 'COBRO DE HONORARIOS' };
    }
    return { categoria_principal: 'HONORARIOS Y GASTOS DE COBRANZA', subcategoria: 'GASTOS DE COBRANZA' };
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

  // 11. CRÉDITOS / CARTERA (y CARTERA / CRÉDITOS)
  if (
    clean === 'CARTERA / CREDITOS' ||
    clean === 'CREDITOS / CARTERA' ||
    (clean.includes('CREDITO') && !clean.includes('TARJETA DE CREDITO') && !clean.includes('TARJETA CREDITO')) ||
    clean.includes('CARTERA') ||
    clean.includes('PRESTAMO') ||
    clean.includes('LIBRANZA') ||
    clean.includes('LEASING') ||
    clean.includes('VIVIENDA') ||
    clean.includes('PLAN DE PAGO') ||
    clean.includes('AMORTIZAC') ||
    clean.includes('CUOTA DE CREDITO') ||
    clean.includes('CUOTAS DE CREDITO') ||
    clean.includes('FRECH') ||
    clean.includes('FRESH') ||
    clean.includes('FRENCH') ||
    clean.includes('FRESCH') ||
    clean.includes('ENDOSO') ||
    clean.includes('REAPLICAC') ||
    clean.includes('HABITO DE PAGO') ||
    clean.includes('HISTORICO DE PAGO') ||
    clean.includes('TITULAR') ||
    clean.includes('CAMBIO DE FECHA')
  ) {
    if (clean.includes('FRECH') || clean.includes('FRESH') || clean.includes('FRENCH') || clean.includes('FRESCH') || clean.includes('SUBSIDIO DE VIVIENDA')) {
      return { categoria_principal: 'CRÉDITOS / CARTERA', subcategoria: 'FRECH' };
    }
    if (clean.includes('ENDOSO')) {
      return { categoria_principal: 'CRÉDITOS / CARTERA', subcategoria: 'ENDOSO' };
    }
    if (clean.includes('REAPLICAC') || clean.includes('ABONO A CAPITAL')) {
      return { categoria_principal: 'CRÉDITOS / CARTERA', subcategoria: 'REAPLICACIONES' };
    }
    if (clean.includes('HABITO DE PAGO') || clean.includes('NO DISMINUYE') || clean.includes('SOLO A INTERESES')) {
      return { categoria_principal: 'CRÉDITOS / CARTERA', subcategoria: 'HÁBITO DE PAGO' };
    }
    if (clean.includes('HISTORICO DE PAGO') || clean.includes('HISTORIAL DE PAGO')) {
      return { categoria_principal: 'CRÉDITOS / CARTERA', subcategoria: 'HISTÓRICO DE PAGO' };
    }
    if (clean.includes('TITULAR') || clean.includes('CODEUDOR') || clean.includes('COTITULAR')) {
      return { categoria_principal: 'CRÉDITOS / CARTERA', subcategoria: 'TITULARES' };
    }
    if (clean.includes('CAMBIO DE FECHA') || clean.includes('FECHA DE PAGO') || clean.includes('FECHA DE VENCIMIENTO')) {
      return { categoria_principal: 'CRÉDITOS / CARTERA', subcategoria: 'CAMBIO DE FECHA' };
    }
    if (clean.includes('REVERSION') || clean.includes('PAGO DOBLE') || clean.includes('MINIMO VITAL')) {
      return { categoria_principal: 'CRÉDITOS / CARTERA', subcategoria: 'REVERSIÓN' };
    }
    if (clean.includes('AUMENTO DE CUOTA') || clean.includes('INCREMENTO DE CUOTA') || clean.includes('CUOTA SUBIO') || clean.includes('PAGO MAS')) {
      return { categoria_principal: 'CRÉDITOS / CARTERA', subcategoria: 'AUMENTO DE CUOTA' };
    }
    if (clean.includes('PLAN DE PAGO') || clean.includes('AMORTIZAC')) {
      return { categoria_principal: 'CRÉDITOS / CARTERA', subcategoria: 'PLAN DE PAGOS' };
    }
    if (clean.includes('REFINANC') || clean.includes('ACUERDO') || clean.includes('ALIVIO')) {
      return { categoria_principal: 'CRÉDITOS / CARTERA', subcategoria: 'REFINANCIACIÓN Y ACUERDOS' };
    }
    return { categoria_principal: 'CRÉDITOS / CARTERA', subcategoria: 'PLAN DE PAGOS' };
  }

  // 11.1 CONDICIONES (CARTERA / CRÉDITOS)
  if (
    clean === 'CONDICIONES' ||
    clean.includes('CONDICION') ||
    clean.includes('TASA') ||
    clean.includes('PLAZO DEL CREDITO') ||
    clean.includes('CONDICIONES PACTADAS') ||
    clean.includes('CAMBIO DE TASA') ||
    clean.includes('CAMBIO DE CONDICIONES') ||
    clean.includes('CONDICIONES COMERCIALES') ||
    clean.includes('CONDICIONES DESPUES DE MIGRACION')
  ) {
    if (clean.includes('MIGRAC')) {
      return { categoria_principal: 'CONDICIONES', subcategoria: 'CONDICIONES DESPUÉS DE MIGRACIÓN' };
    }
    if (clean.includes('CAMBIO DE TASA') || clean.includes('AUMENTO DE TASA') || clean.includes('TASA FIJA') || clean.includes('TASA VARIABLE')) {
      return { categoria_principal: 'CONDICIONES', subcategoria: 'CAMBIO DE TASA' };
    }
    if (clean.includes('TASA')) {
      return { categoria_principal: 'CONDICIONES', subcategoria: 'TASA DE INTERÉS' };
    }
    if (clean.includes('PLAZO')) {
      return { categoria_principal: 'CONDICIONES', subcategoria: 'PLAZO DEL CRÉDITO' };
    }
    if (clean.includes('VALOR DE CUOTA') || clean.includes('CUOTA PACTADA') || clean.includes('CUOTA MAS ALTA') || clean.includes('CUOTA POR CONDICION')) {
      return { categoria_principal: 'CONDICIONES', subcategoria: 'VALOR DE CUOTA POR CONDICIONES' };
    }
    if (clean.includes('MODALIDAD')) {
      return { categoria_principal: 'CONDICIONES', subcategoria: 'MODALIDAD DE FINANCIACIÓN' };
    }
    if (clean.includes('COMERCIAL')) {
      return { categoria_principal: 'CONDICIONES', subcategoria: 'CONDICIONES COMERCIALES' };
    }
    if (clean.includes('PACTAD') || clean.includes('OFRECID') || clean.includes('INFORMAD')) {
      return { categoria_principal: 'CONDICIONES', subcategoria: 'CONDICIONES PACTADAS NO RESPETADAS' };
    }
    if (clean.includes('CAMBIO') || clean.includes('MODIFICAC')) {
      return { categoria_principal: 'CONDICIONES', subcategoria: 'CAMBIO DE CONDICIONES' };
    }
    return { categoria_principal: 'CONDICIONES', subcategoria: 'OTRAS CONDICIONES DEL CRÉDITO' };
  }

  // 12. PRODUCTOS
  if (clean.includes('CANCEL') && (clean.includes('PRODUCT') || clean.includes('CUENTA') || clean.includes('TARJETA'))) {
    return { categoria_principal: 'PRODUCTOS', subcategoria: 'CANCELACIÓN DE PRODUCTOS' };
  }
  if (clean.includes('ACTIVAC')) {
    return { categoria_principal: 'PRODUCTOS', subcategoria: 'ACTIVACIÓN DE PRODUCTOS' };
  }
  if (clean.includes('BENEFICIO') || clean.includes('PROGRAMA')) {
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
 * Extracts and combines all relevant text columns (DESC_DETALLADA, peticion, inconveniente, solicitud, hechos)
 * to ensure no contextual information is missed.
 */
export function extractFullContextText(record: PQRInputRecord): string {
  const parts: string[] = [];
  if (record.descripcion_original && record.descripcion_original.trim().length > 0) {
    parts.push(record.descripcion_original.trim());
  }

  if (record.columnas_adicionales) {
    const candidateKeys = [
      'peticion_del_cliente', 'peticion del cliente', 'petición del cliente',
      'inconveniente_del_cliente', 'inconveniente del cliente', 'inconveniente',
      'solicitud', 'peticion', 'petición', 'hechos', 'detalle', 'motivo'
    ];
    for (const [k, v] of Object.entries(record.columnas_adicionales)) {
      if (v && typeof v === 'string' && v.trim().length > 0) {
        const cleanK = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        if (candidateKeys.some(cand => cleanK.includes(cand))) {
          if (!parts.some(p => p.includes(v.trim()))) {
            parts.push(v.trim());
          }
        }
      }
    }
  }
  return parts.join(' ');
}

/**
 * Deep contextual detection and subcategorization for CDT (Certificados de Depósito a Término)
 * Strictly adheres to the 8 official subcategories and business rules:
 * 1. RENDIMIENTOS / INTERESES
 * 2. RENOVACIÓN
 * 3. PAGO
 * 4. CANCELACIÓN
 * 5. CERTIFICADO DE SALDO O DECEVAL
 * 6. CERTIFICADOS TRIBUTARIOS
 * 7. APERTURA
 * 8. VISUALIZACIÓN
 */
export function detectCDT(
  text: string,
  submotivo?: string,
  productoOriginal?: string
): {
  matches: boolean;
  subcategoria: string;
  intencion: string;
  problema: string;
  solicitud: string;
  resumen: string;
  evidencia: string;
  producto_detectado: string;
  requiere_revision: boolean;
  motivo_revision?: string;
} {
  const lower = (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const submotivoLower = (submotivo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const prodLower = (productoOriginal || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const full = `${lower} ${submotivoLower} ${prodLower}`;

  // Helper to extract evidence snippet around matched keywords
  const extractEvidence = (keywords: string[]): string => {
    let bestPos = -1;
    let matchedKw = '';
    for (const kw of keywords) {
      const pos = lower.indexOf(kw);
      if (pos !== -1 && (bestPos === -1 || pos > bestPos)) {
        bestPos = pos;
        matchedKw = kw;
      }
    }
    if (bestPos !== -1) {
      const start = Math.max(0, bestPos - 25);
      const end = Math.min(text.length, bestPos + matchedKw.length + 55);
      return text.slice(start, end).trim();
    }
    return text.slice(0, 100).trim();
  };

  // 1. Explicit CDT check (NEVER classify as CDT solely due to "cuenta")
  const hasExplicitCDT =
    /\bcdt\b/i.test(lower) ||
    /\bcdts\b/i.test(lower) ||
    /\bc\.d\.t\b/i.test(lower) ||
    lower.includes('certificado de deposito a termino') ||
    lower.includes('certificados de deposito a termino') ||
    lower.includes('certificado de deposito') ||
    lower.includes('certificados de deposito') ||
    lower.includes('certificado a termino') ||
    lower.includes('certificados a termino') ||
    lower.includes('deposito a termino') ||
    lower.includes('depositos a termino') ||
    lower.includes('inversion cdt') ||
    lower.includes('inversion en cdt') ||
    lower.includes('inversiones cdt') ||
    lower.includes('rendimientos de cdt') ||
    lower.includes('rendimiento de cdt') ||
    lower.includes('cdt vencido') ||
    lower.includes('cdt cancelado') ||
    lower.includes('cdt renovado') ||
    lower.includes('cdt fisico') ||
    lower.includes('titulo cdt') ||
    lower.includes('titulos cdt') ||
    lower.includes('macrotitulo') ||
    lower.includes('deceval') ||
    /\bcdt\b/i.test(submotivoLower) ||
    submotivoLower.includes('certificado de deposito') ||
    submotivoLower.includes('certificado a termino') ||
    submotivoLower.includes('deposito a termino') ||
    /\bcdt\b/i.test(prodLower) ||
    prodLower.includes('deposito a termino') ||
    prodLower.includes('certificado de deposito') ||
    prodLower.includes('certificado a termino');

  if (!hasExplicitCDT) {
    return {
      matches: false,
      subcategoria: '',
      intencion: '',
      problema: '',
      solicitud: '',
      resumen: '',
      evidencia: '',
      producto_detectado: 'NO ESPECIFICADO',
      requiere_revision: false
    };
  }

  // Helper to check if text indicates cancellation/maturity
  const mentionsCancellationOrMaturity =
    full.includes('cancele') ||
    full.includes('cancelado') ||
    full.includes('cancelaron') ||
    full.includes('se cancelo') ||
    full.includes('fue cancelado') ||
    full.includes('ya fue cancelado') ||
    full.includes('liquidado') ||
    full.includes('se liquido') ||
    full.includes('fue liquidado') ||
    full.includes('vencio') ||
    full.includes('vencido') ||
    full.includes('redimido') ||
    full.includes('redencion');

  // Helper to check if text indicates unpaid money/funds
  const mentionsUnpaidMoney =
    full.includes('no me han entregado el dinero') ||
    full.includes('no me entregaron el dinero') ||
    full.includes('no han entregado el dinero') ||
    full.includes('no veo el pago') ||
    full.includes('no veo reflejado el pago') ||
    full.includes('no recibi el capital') ||
    full.includes('no he recibido el capital') ||
    full.includes('no recibi los recursos') ||
    full.includes('no he recibido los recursos') ||
    full.includes('no recibi el dinero') ||
    full.includes('no me han abonado') ||
    full.includes('no han abonado') ||
    full.includes('no se ha abonado') ||
    full.includes('no me han pagado') ||
    full.includes('no han pagado') ||
    full.includes('no veo el dinero') ||
    full.includes('no aparece el dinero') ||
    full.includes('pago pendiente') ||
    full.includes('pago del cdt cancelado') ||
    full.includes('abono del cdt cancelado') ||
    full.includes('dinero no ha sido entregado') ||
    full.includes('dinero no entregado') ||
    full.includes('no me transfirieron') ||
    full.includes('no me han transferido') ||
    full.includes('no transfirieron') ||
    full.includes('no consignaron') ||
    full.includes('no me consignaron') ||
    full.includes('no me han consignado') ||
    full.includes('no han consignado') ||
    full.includes('desembolso pendiente') ||
    full.includes('recursos no entregados') ||
    ((full.includes('no me han') || full.includes('no he recibido') || full.includes('no recibi') || full.includes('sin recibir')) &&
      (full.includes('consigna') || full.includes('transf') || full.includes('recurso') || full.includes('capital') || full.includes('dinero') || full.includes('plata') || full.includes('pago')));

  // -------------------------------------------------------------------------
  // 6. CERTIFICADOS TRIBUTARIOS
  // Regla obligatoria: Si el cliente solicita un documento para fines tributarios,
  // fiscales o de declaración de renta, utiliza CERTIFICADOS TRIBUTARIOS y no CERTIFICADO DE SALDO O DECEVAL.
  // -------------------------------------------------------------------------
  const isTributario =
    full.includes('tributari') ||
    full.includes('retencion en la fuente') ||
    full.includes('retefuente') ||
    full.includes('declaracion de renta') ||
    full.includes('declarar renta') ||
    full.includes('para la renta') ||
    full.includes('fines tributarios') ||
    full.includes('fines fiscales') ||
    full.includes('soporte tributario') ||
    full.includes('soportes tributarios') ||
    full.includes('certificado fiscal') ||
    full.includes('certificados fiscales') ||
    full.includes('dian') ||
    full.includes('informacion exogena') ||
    full.includes('exogena') ||
    full.includes('certificado de retencion') ||
    full.includes('retencion aplicada') ||
    (full.includes('impuesto') && (full.includes('certificado') || full.includes('soporte') || full.includes('constancia')));

  if (isTributario) {
    const ev = extractEvidence([
      'tributari',
      'retencion en la fuente',
      'retefuente',
      'declaracion de renta',
      'fiscal',
      'dian',
      'exogena'
    ]);
    return {
      matches: true,
      subcategoria: 'CERTIFICADOS TRIBUTARIOS',
      intencion: 'Solicitud de certificados tributarios de CDT para efectos fiscales y declaración de renta',
      problema: 'Inconveniente o solicitud de certificado tributario, retención en la fuente o soporte fiscal de CDT para declaración de renta',
      solicitud: 'Expedición, corrección y envío del certificado tributario o constancia de retención en la fuente del CDT',
      resumen: `Cliente solicita certificado tributario o de retención en la fuente de su CDT para declaración de renta.`,
      evidencia: ev,
      producto_detectado: 'CDT',
      requiere_revision: false
    };
  }

  // -------------------------------------------------------------------------
  // 5. CERTIFICADO DE SALDO O DECEVAL
  // Reemplaza la anterior CERTIFICADOS Y SOPORTES.
  // Certificado de saldo, valores iniciales, constitución, saldo a fecha, o constancias Deceval.
  // -------------------------------------------------------------------------
  const isCertificadoSaldoDeceval =
    full.includes('deceval') ||
    full.includes('certificado de saldo') ||
    full.includes('certificado del saldo') ||
    full.includes('certificacion de saldo') ||
    full.includes('valores iniciales') ||
    full.includes('valor inicial') ||
    full.includes('saldo a fecha') ||
    full.includes('saldo a una fecha') ||
    full.includes('saldo a corte') ||
    full.includes('valores historicos') ||
    full.includes('valores actuales') ||
    full.includes('constancia deceval') ||
    full.includes('soporte deceval') ||
    full.includes('macrotitulo') ||
    full.includes('certificado de titularidad') ||
    full.includes('certificacion de titularidad') ||
    full.includes('constancia de inversion') ||
    full.includes('valores registrados') ||
    full.includes('cdt fisico') ||
    full.includes('titulo fisico') ||
    full.includes('papeleta de cdt') ||
    full.includes('copia del cdt') ||
    full.includes('extracto de mi cdt') ||
    full.includes('extracto del cdt') ||
    full.includes('estado de cuenta de mi cdt') ||
    full.includes('estado de mi cdt') ||
    full.includes('constancia del cdt') ||
    full.includes('soporte de mi cdt') ||
    full.includes('soporte del cdt') ||
    ((full.includes('certificado') || full.includes('certificacion') || full.includes('constancia') || full.includes('soporte')) &&
      (full.includes('saldo') || full.includes('constitucion') || full.includes('titularidad') || full.includes('monto') || full.includes('inversion') || full.includes('deposito')));

  if (isCertificadoSaldoDeceval) {
    const ev = extractEvidence([
      'deceval',
      'certificado de saldo',
      'valores iniciales',
      'saldo a fecha',
      'valores historicos',
      'constancia deceval',
      'soporte deceval',
      'titularidad',
      'certificado'
    ]);
    return {
      matches: true,
      subcategoria: 'CERTIFICADO DE SALDO O DECEVAL',
      intencion: 'Solicitud de certificado de saldo, constancia Deceval o soporte de constitución del CDT',
      problema: 'Solicitud o inconveniente con certificado de saldo, constancia Deceval o información de valores de constitución del CDT',
      solicitud: 'Expedición y envío de certificado de saldo o constancia Deceval del CDT',
      resumen: `Cliente solicita certificado de saldo, constancia Deceval o valores de constitución de su CDT.`,
      evidencia: ev,
      producto_detectado: 'CDT',
      requiere_revision: false
    };
  }

  // -------------------------------------------------------------------------
  // 4. CANCELACIÓN
  // Regla obligatoria: Cuando el cliente DESEA CANCELAR o retirar anticipadamente su CDT,
  // pero todavía no se ha cumplido la fecha de vencimiento.
  // -------------------------------------------------------------------------
  const isCancelacionCDT =
    full.includes('cancelacion anticipada') ||
    full.includes('cancelar antes de la fecha') ||
    full.includes('cancelar antes del vencimiento') ||
    full.includes('cancelar antes de que se cumpla') ||
    full.includes('cancelar antes de tiempo') ||
    full.includes('cancelar antes del plazo') ||
    full.includes('retirar antes del vencimiento') ||
    full.includes('retirar antes del plazo') ||
    full.includes('retirar antes de tiempo') ||
    full.includes('retirar mi dinero antes') ||
    full.includes('retirar anticipadamente') ||
    full.includes('retiro anticipado') ||
    full.includes('sacar la plata antes') ||
    full.includes('sacar mi dinero antes') ||
    full.includes('sacar el dinero antes') ||
    full.includes('quiero cancelar mi cdt') ||
    full.includes('deseo cancelar mi cdt') ||
    full.includes('deseo cancelar el cdt') ||
    full.includes('necesito cancelar mi cdt') ||
    full.includes('solicito cancelar mi cdt') ||
    full.includes('solicito la cancelacion de mi cdt') ||
    full.includes('solicito la cancelacion anticipada') ||
    full.includes('no quiero continuar con el cdt') ||
    full.includes('no deseo continuar con el cdt') ||
    full.includes('condiciones para cancelar mi cdt') ||
    full.includes('condiciones para cancelar el cdt') ||
    full.includes('condiciones para cancelar') ||
    full.includes('no me permiten cancelar el cdt') ||
    full.includes('no me dejan cancelar el cdt') ||
    full.includes('no me dejan cancelar mi cdt') ||
    full.includes('penalidad por cancelar') ||
    full.includes('penalidad por cancelacion') ||
    full.includes('penalidad para cancelar') ||
    full.includes('desistir del cdt') ||
    full.includes('cerrar mi cdt') ||
    ((full.includes('cancelar') || full.includes('cancelacion') || full.includes('retirar')) &&
      (full.includes('antes') || full.includes('anticipad') || full.includes('plazo') || full.includes('vencimiento') || full.includes('deseo') || full.includes('quiero') || full.includes('solicito')));

  if (isCancelacionCDT) {
    const ev = extractEvidence([
      'cancelacion anticipada',
      'cancelar antes',
      'retirar antes',
      'quiero cancelar',
      'deseo cancelar',
      'solicito cancelar',
      'solicito la cancelacion',
      'no quiero continuar',
      'condiciones para cancelar'
    ]);
    return {
      matches: true,
      subcategoria: 'CANCELACIÓN',
      intencion: 'Solicitud de cancelación anticipada de CDT antes de la fecha de vencimiento',
      problema: 'Solicitud o inconformidad por trámite de cancelación anticipada o retiro de fondos del CDT antes de su vencimiento',
      solicitud: 'Autorización y liquidación anticipada del CDT antes de la fecha de vencimiento pactada',
      resumen: `Cliente solicita la cancelación anticipada o retiro de fondos de su CDT antes de la fecha de vencimiento.`,
      evidencia: ev,
      producto_detectado: 'CDT',
      requiere_revision: false
    };
  }

  // -------------------------------------------------------------------------
  // 3. PAGO
  // Regla obligatoria: Exclusivamente los casos en los que el CDT YA FUE CANCELADO O LIQUIDADO,
  // pero el cliente manifiesta que NO HA RECIBIDO EL DINERO correspondiente.
  // -------------------------------------------------------------------------
  const isPagoCDT =
    (mentionsCancellationOrMaturity && mentionsUnpaidMoney) ||
    full.includes('cancele mi cdt y no me') ||
    full.includes('cancele mi cdt y no he') ||
    full.includes('cancele mi cdt y no veo') ||
    full.includes('cdt ya fue cancelado pero no') ||
    full.includes('cdt cancelado y no recibi') ||
    full.includes('cdt cancelado pero no') ||
    full.includes('no me han pagado el cdt cancelado') ||
    full.includes('pago de mi cdt cancelado') ||
    full.includes('no recibi el dinero de mi cdt') ||
    full.includes('vencio mi cdt y no me') ||
    full.includes('vencio mi cdt y no he') ||
    full.includes('vencio el cdt y no') ||
    full.includes('cdt vencido y no recibi') ||
    full.includes('cdt vencido y no me han pagado') ||
    (mentionsCancellationOrMaturity && (full.includes('no me han entregado') || full.includes('no veo el pago') || full.includes('no recibi') || full.includes('no me han abonado') || full.includes('pago pendiente') || full.includes('no aparece el dinero') || full.includes('no me consignaron') || full.includes('no me transfirieron')));

  if (isPagoCDT) {
    const ev = extractEvidence([
      'no me han entregado el dinero',
      'no recibi el capital',
      'no veo el pago',
      'no me han abonado',
      'no me han pagado',
      'pago del cdt cancelado',
      'cancelado pero no',
      'cancele mi cdt'
    ]);
    return {
      matches: true,
      subcategoria: 'PAGO',
      intencion: 'Reclamación por no entrega o abono del dinero de CDT cancelado o liquidado',
      problema: 'CDT cancelado, liquidado o vencido sin que los recursos o capital hayan sido entregados o abonados al cliente',
      solicitud: 'Abono y entrega inmediata de los recursos correspondientes al CDT cancelado',
      resumen: `Cliente manifiesta que su CDT fue cancelado o liquidado pero no ha recibido el pago del dinero o capital.`,
      evidencia: ev,
      producto_detectado: 'CDT',
      requiere_revision: false
    };
  }

  // -------------------------------------------------------------------------
  // 2. RENOVACIÓN
  // Renovación automática, renovación que no se realizó, o inconformidad con condiciones al renovar.
  // -------------------------------------------------------------------------
  const isRenovacionCDT =
    full.includes('renovacion') ||
    full.includes('renovar') ||
    full.includes('renovaron') ||
    full.includes('renovo') ||
    full.includes('renovado') ||
    full.includes('cdt renovado') ||
    full.includes('se renovo solo') ||
    full.includes('se renovo sin') ||
    full.includes('se renovo automaticamente') ||
    full.includes('prorroga') ||
    full.includes('prorrogo') ||
    full.includes('prorrogado') ||
    full.includes('prorrogada');

  if (isRenovacionCDT) {
    const ev = extractEvidence([
      'renovacion automatica',
      'renovaron',
      'renovo',
      'no se renovo',
      'condiciones de renovacion',
      'renovacion',
      'renovar',
      'prorroga'
    ]);
    return {
      matches: true,
      subcategoria: 'RENOVACIÓN',
      intencion: 'Reclamación o consulta sobre el proceso o condiciones de renovación del CDT',
      problema: 'Inconformidad o solicitud sobre la renovación del CDT (automática, no realizada, no autorizada o cambio de condiciones)',
      solicitud: 'Aclaración, revisión, reversión o ajuste de las condiciones de renovación del CDT',
      resumen: `Cliente presenta reclamo o solicitud sobre la renovación de su CDT y las condiciones pactadas.`,
      evidencia: ev,
      producto_detectado: 'CDT',
      requiere_revision: false
    };
  }

  // -------------------------------------------------------------------------
  // 7. APERTURA
  // Constitución, apertura, creación o formalización de un CDT.
  // -------------------------------------------------------------------------
  const isAperturaMention =
    full.includes('apertura') ||
    full.includes('aperturar') ||
    full.includes('abrir mi cdt') ||
    full.includes('abrir un cdt') ||
    full.includes('abrir el cdt') ||
    full.includes('constitucion') ||
    full.includes('constituir') ||
    full.includes('creacion de cdt') ||
    full.includes('crear un cdt') ||
    full.includes('crear mi cdt') ||
    full.includes('formalizacion') ||
    full.includes('formalizar') ||
    full.includes('inconvenientes para abrir') ||
    full.includes('problemas para abrir') ||
    full.includes('no se constituyo') ||
    full.includes('no se formalizo') ||
    full.includes('debitaron pero no abrieron') ||
    full.includes('descontaron pero no crearon') ||
    full.includes('solicito la apertura');

  const isAperturaHistoricContextOnly =
    full.includes('al momento de la apertura') ||
    full.includes('en el momento de la apertura') ||
    full.includes('desde la apertura') ||
    full.includes('pactada en la apertura') ||
    full.includes('pactada al momento de la apertura') ||
    full.includes('acordada en la apertura') ||
    full.includes('condiciones de apertura');

  const isAperturaCDT =
    isAperturaMention &&
    !isAperturaHistoricContextOnly && (
      full.includes('solicito apertura') ||
      full.includes('solicito la apertura') ||
      full.includes('abrir') ||
      full.includes('aperturar') ||
      full.includes('inconvenientes para abrir') ||
      full.includes('problemas para abrir') ||
      full.includes('no se constituyo') ||
      full.includes('no se formalizo') ||
      full.includes('debitaron pero no') ||
      full.includes('descontaron pero no') ||
      full.includes('creacion de cdt') ||
      full.includes('crear un cdt') ||
      full.includes('crear mi cdt') ||
      full.includes('formalizacion') ||
      full.includes('formalizar') ||
      full.includes('constitucion de cdt') ||
      full.includes('constitucion del cdt') ||
      full.includes('apertura de cdt') ||
      full.includes('apertura de un cdt') ||
      full.includes('apertura del cdt') ||
      (full.includes('constitucion') && (full.includes('tramite') || full.includes('solicitud') || full.includes('firma') || full.includes('sucursal')))
    );

  if (isAperturaCDT) {
    const ev = extractEvidence([
      'apertura',
      'aperturar',
      'abrir',
      'constitucion',
      'constituir',
      'formalizacion',
      'creacion'
    ]);
    return {
      matches: true,
      subcategoria: 'APERTURA',
      intencion: 'Gestión de constitución o apertura formal de CDT',
      problema: 'Inconvenientes, demora o fallas en la apertura, constitución o formalización del CDT',
      solicitud: 'Constitución formal, confirmación y activación del CDT solicitado',
      resumen: `Cliente reporta inconvenientes o solicita la formalización y apertura de su CDT.`,
      evidencia: ev,
      producto_detectado: 'CDT',
      requiere_revision: false
    };
  }

  // -------------------------------------------------------------------------
  // 8. VISUALIZACIÓN
  // Inconvenientes para visualizar el CDT en canales digitales, app o banca virtual.
  // -------------------------------------------------------------------------
  const isVisualizacionCDT =
    full.includes('no puedo ver') ||
    full.includes('no visualizo') ||
    full.includes('no aparece') ||
    full.includes('no se ve') ||
    full.includes('desaparecio') ||
    full.includes('no encuentro') ||
    full.includes('no me muestra') ||
    full.includes('no figura') ||
    full.includes('inconvenientes para consultar') ||
    full.includes('problemas para ver') ||
    full.includes('error al consultar') ||
    full.includes('no carga el cdt') ||
    full.includes('no carga') ||
    ((full.includes('visualiz') || full.includes('canales digitales') || full.includes('banca virtual') || full.includes('app') || full.includes('aplicacion') || full.includes('portal')) &&
      (full.includes('ver') || full.includes('consultar') || full.includes('aparece') || full.includes('carga')));

  if (isVisualizacionCDT) {
    const ev = extractEvidence([
      'no aparece',
      'no puedo ver',
      'no visualizo',
      'desaparecio',
      'no se ve',
      'inconvenientes para consultar',
      'visualiz'
    ]);
    return {
      matches: true,
      subcategoria: 'VISUALIZACIÓN',
      intencion: 'Problemas para visualizar o consultar CDT en canales digitales o app',
      problema: 'Inconvenientes para visualizar o consultar la información del CDT en canales digitales o app',
      solicitud: 'Habilitación técnica y corrección en la visualización del CDT en los canales electrónicos',
      resumen: `Cliente no puede visualizar o consultar la información de su CDT en los canales digitales o aplicación móvil.`,
      evidencia: ev,
      producto_detectado: 'CDT',
      requiere_revision: false
    };
  }

  // -------------------------------------------------------------------------
  // 1. RENDIMIENTOS / INTERESES
  // Inconformidad con intereses o rendimientos, diferencias entre pactados y liquidados,
  // tasa, o rendimientos durante el periodo de inversión.
  // -------------------------------------------------------------------------
  const isRendimientosCDT =
    full.includes('rendimiento') ||
    full.includes('rendimientos') ||
    full.includes('rendimientos de cdt') ||
    full.includes('rendimiento de cdt') ||
    full.includes('interes') ||
    full.includes('intereses') ||
    full.includes('tasa de interes') ||
    full.includes('tasa pactada') ||
    full.includes('liquidacion de rendimientos') ||
    full.includes('liquidacion de intereses') ||
    full.includes('calculo de rendimientos') ||
    full.includes('calculo de intereses') ||
    full.includes('ganancia') ||
    full.includes('ganancias') ||
    full.includes('rentabilidad') ||
    full.includes('capitalizacion') ||
    full.includes('tasa');

  if (isRendimientosCDT) {
    const ev = extractEvidence([
      'rendimiento',
      'rendimientos',
      'intereses',
      'interes',
      'tasa de interes',
      'tasa pactada',
      'liquidacion',
      'calculo de rendimientos'
    ]);
    return {
      matches: true,
      subcategoria: 'RENDIMIENTOS / INTERESES',
      intencion: 'Inconformidad o reclamación sobre intereses o rendimientos liquidados de CDT',
      problema: 'Inconformidad con la liquidación de rendimientos, tasa de interés o intereses generados por el CDT vigente',
      solicitud: 'Revisión, aclaración y reliquidación de los intereses o rendimientos pactados del CDT',
      resumen: `Cliente expresa inconformidad con los rendimientos, tasa pactada o liquidación de intereses de su CDT.`,
      evidencia: ev,
      producto_detectado: 'CDT',
      requiere_revision: false
    };
  }

  // -------------------------------------------------------------------------
  // REGLA OBLIGATORIA: PREVENCIÓN DE REVISIÓN HUMANA O OTRAS PARA CDT
  // Si la descripción del cliente menciona CDT, la categoría principal debe ser CDT.
  // No clasificar como REVISIÓN HUMANA si el texto permite inferir el motivo.
  // Asignar la subcategoría más cercana según el contexto general (por ejemplo, si
  // hace una consulta general sobre su CDT, su estado o certificado, asignar
  // CERTIFICADO DE SALDO O DECEVAL o RENDIMIENTOS / INTERESES en lugar de mandarlo a REVISIÓN HUMANA).
  // Solo usar REVISIÓN HUMANA si el texto es ruido puro o carece por completo de sentido interpretable.
  // -------------------------------------------------------------------------
  const meaningfulWords = lower.replace(/[^a-z0-9áéíóúüñ\s]/gi, ' ').split(/\s+/).filter(w => w.length > 2);
  const cleanTrimmed = lower.replace(/[^a-z0-9áéíóúüñ\s]/gi, ' ').replace(/\s+/g, ' ').trim();
  const isNoiseOrEmpty =
    meaningfulWords.length <= 2 ||
    cleanTrimmed === 'tengo un cdt en el banco' ||
    cleanTrimmed === 'tengo un cdt' ||
    cleanTrimmed === 'mi cdt' ||
    cleanTrimmed === 'cdt';

  if (isNoiseOrEmpty) {
    return {
      matches: true,
      subcategoria: 'INFORMACIÓN INSUFICIENTE',
      intencion: 'Requerimiento sobre CDT con información insuficiente para identificar el motivo',
      problema: 'El expediente menciona CDT pero no proporciona información suficiente para determinar el motivo de la reclamación',
      solicitud: 'Contacto con el cliente para aclarar el requerimiento específico sobre su CDT',
      resumen: `Expediente de CDT requiere revisión humana por descripción insuficiente.`,
      evidencia: text.slice(0, 100).trim(),
      producto_detectado: 'CDT',
      requiere_revision: true,
      motivo_revision: 'El expediente menciona CDT pero no proporciona información suficiente para determinar el motivo específico de la reclamación.'
    };
  }

  // If text has financial, yield, investment or monetary terms, assign RENDIMIENTOS / INTERESES
  if (
    lower.includes('dinero') ||
    lower.includes('plata') ||
    lower.includes('recursos') ||
    lower.includes('valor') ||
    lower.includes('cuanto') ||
    lower.includes('inversion') ||
    lower.includes('ganar') ||
    lower.includes('liquid')
  ) {
    return {
      matches: true,
      subcategoria: 'RENDIMIENTOS / INTERESES',
      intencion: 'Consulta o requerimiento sobre valores, rendimientos o liquidación de CDT',
      problema: 'Consulta o aclaración sobre los valores, rendimientos o liquidación de su CDT',
      solicitud: 'Aclaración detallada sobre los valores, rendimientos o estado de liquidación de su CDT',
      resumen: generateConciseSummary(text, 'CDT', 'RENDIMIENTOS / INTERESES', 'CDT', 'Consulta o solicita aclaración sobre valores o rendimientos de su CDT.'),
      evidencia: extractEvidence(['cdt', 'inversion', 'dinero', 'plata', 'recursos', 'valor']),
      producto_detectado: 'CDT',
      requiere_revision: false
    };
  }

  // Otherwise, default contextual assignment is CERTIFICADO DE SALDO O DECEVAL
  return {
    matches: true,
    subcategoria: 'CERTIFICADO DE SALDO O DECEVAL',
    intencion: 'Consulta o solicitud de información, certificado o soporte de su CDT',
    problema: 'Solicitud de información general, certificado o soporte sobre el estado de su CDT',
    solicitud: 'Suministro de información, certificado de saldo o soporte correspondiente al CDT',
    resumen: generateConciseSummary(text, 'CDT', 'CERTIFICADO DE SALDO O DECEVAL', 'CDT', 'Consulta o solicita información o soporte sobre su CDT.'),
    evidencia: extractEvidence(['cdt', 'certificado', 'titulo', 'deposito']),
    producto_detectado: 'CDT',
    requiere_revision: false
  };
}

/**
 * Deep contextual detection and subcategorization for CONDICIONES (CARTERA / CRÉDITOS)
 */
export function detectCondicionesCredito(
  text: string,
  submotivo: string,
  detectedProduct: string
): {
  matches: boolean;
  subcategoria: string;
  intencion: string;
  problema: string;
  solicitud: string;
  resumen: string;
  evidencia: string;
  producto_detectado: string;
} {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const submotivoLower = (submotivo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const full = `${lower} ${submotivoLower}`;

  // Helper to extract relevant snippet as evidence
  const extractEvidence = (keywords: string[]): string => {
    let bestPos = -1;
    let matchedKw = '';
    for (const kw of keywords) {
      const pos = lower.indexOf(kw);
      if (pos !== -1 && (bestPos === -1 || pos > bestPos)) {
        bestPos = pos;
        matchedKw = kw;
      }
    }
    if (bestPos !== -1) {
      const start = Math.max(0, bestPos - 30);
      const end = Math.min(text.length, bestPos + matchedKw.length + 60);
      return text.slice(start, end).trim();
    }
    return text.slice(0, 120);
  };

  // 1. DISAMBIGUATIONS & EXCLUSIONS
  // Pure request for contract copy without dispute
  const isContractCopyOnly =
    (full.includes('copia de mi contrato') ||
     full.includes('copia del contrato') ||
     full.includes('copia de contrato') ||
     full.includes('copia pagare') ||
     full.includes('solicito mi contrato') ||
     full.includes('envio de mi contrato') ||
     full.includes('copia de pagare') ||
     full.includes('copia del pagare')) &&
    !(
      full.includes('no acepto') ||
      full.includes('no estoy de acuerdo') ||
      full.includes('inconform') ||
      full.includes('reclamo') ||
      full.includes('cambiaron') ||
      full.includes('modificaron') ||
      full.includes('no es la que') ||
      full.includes('no coincide') ||
      full.includes('no corresponde') ||
      full.includes('distint') ||
      full.includes('diferente') ||
      full.includes('no respetaron') ||
      full.includes('sin autorizacion')
    );

  if (isContractCopyOnly) {
    return { matches: false, subcategoria: '', intencion: '', problema: '', solicitud: '', resumen: '', evidencia: '', producto_detectado: '' };
  }

  // Pure request for credit information without dispute
  const isInfoOnly =
    (full.includes('solicito informacion sobre mi credito') ||
     full.includes('solicito informacion de mi credito') ||
     full.includes('informacion sobre como funciona') ||
     full.includes('como funciona un credito') ||
     full.includes('como funciona el credito') ||
     full.includes('solicito informacion sobre') ||
     full.includes('certificado de deuda') ||
     full.includes('certificado de saldo')) &&
    !(
      full.includes('no acepto') ||
      full.includes('no estoy de acuerdo') ||
      full.includes('inconform') ||
      full.includes('reclamo') ||
      full.includes('cambiaron') ||
      full.includes('modificaron') ||
      full.includes('no corresponde') ||
      full.includes('no coinciden') ||
      full.includes('no son las') ||
      full.includes('no respetaron') ||
      full.includes('diferente') ||
      full.includes('superior')
    );

  if (isInfoOnly) {
    return { matches: false, subcategoria: '', intencion: '', problema: '', solicitud: '', resumen: '', evidencia: '', producto_detectado: '' };
  }

  // Pure late interest without rate/contract grievance
  const isLateInterestOnly =
    (full.includes('intereses de mora') ||
     full.includes('interes de mora') ||
     full.includes('intereses moratorios') ||
     full.includes('interes moratorio') ||
     full.includes('cobro de mora')) &&
    !(
      full.includes('tasa') ||
      full.includes('condicion') ||
      full.includes('plazo') ||
      full.includes('pactad') ||
      full.includes('ofrecid') ||
      full.includes('migrac')
    );

  if (isLateInterestOnly) {
    return { matches: false, subcategoria: '', intencion: '', problema: '', solicitud: '', resumen: '', evidencia: '', producto_detectado: '' };
  }

  // Pure credit card management fee without credit conditions grievance
  const isCuotaManejoPure =
    (full.includes('cuota de manejo') || full.includes('cuotas de manejo')) &&
    !(
      full.includes('tasa') ||
      full.includes('condiciones de mi credito') ||
      full.includes('condiciones del credito') ||
      full.includes('plazo del credito') ||
      full.includes('condiciones del leasing')
    );

  if (isCuotaManejoPure) {
    return { matches: false, subcategoria: '', intencion: '', problema: '', solicitud: '', resumen: '', evidencia: '', producto_detectado: '' };
  }

  // Product resolution
  let prod = 'CRÉDITO / CARTERA';
  if (full.includes('leasing')) prod = 'LEASING';
  else if (full.includes('vivienda') || full.includes('hipotecari')) prod = 'CRÉDITO DE VIVIENDA';
  else if (full.includes('libre inversion') || full.includes('libre inversión')) prod = 'CRÉDITO DE LIBRE INVERSIÓN';
  else if (full.includes('rotativo')) prod = 'CRÉDITO ROTATIVO';
  else if (full.includes('vehiculo') || full.includes('vehículo') || full.includes('auto') || full.includes('automotriz')) prod = 'CRÉDITO DE VEHÍCULO';
  else if (full.includes('consumo')) prod = 'CRÉDITO DE CONSUMO';
  else if (full.includes('libranza')) prod = 'LIBRANZA';
  else if (detectedProduct && detectedProduct !== 'NO ESPECIFICADO') prod = detectedProduct;

  // 2. DETECTOR TRIGGERS

  // A. Tasa de Interés / Cambio de Tasa signals
  const hasRateKeywords =
    full.includes('tasa de interes') ||
    full.includes('tasa de mi credito') ||
    full.includes('tasa de mi obligacion') ||
    full.includes('tasa asignada') ||
    full.includes('tasa que me colocaron') ||
    full.includes('tasa que me asignaron') ||
    full.includes('tasa que le asignaron') ||
    full.includes('tasa que tenia') ||
    full.includes('esa tasa no es la acordada') ||
    full.includes('tasa no es la acordada') ||
    full.includes('tasa diferente') ||
    full.includes('tasa incorrecta') ||
    full.includes('tasa errada') ||
    full.includes('tasa superior') ||
    full.includes('tasa del contrato') ||
    full.includes('tasa preferencial') ||
    full.includes('tasa fija') ||
    full.includes('tasa variable') ||
    full.includes('tasa efectiva anual') ||
    full.includes('tasa nominal') ||
    full.includes('cambio de tasa') ||
    full.includes('cambiaron la tasa') ||
    full.includes('cambio la tasa') ||
    full.includes('modificaron la tasa') ||
    full.includes('aumentaron la tasa') ||
    full.includes('aumento de tasa') ||
    full.includes('aumento la tasa') ||
    full.includes('subieron la tasa') ||
    full.includes('incrementaron la tasa') ||
    full.includes('revisar la tasa') ||
    full.includes('revisen la tasa') ||
    full.includes('no acepto la tasa') ||
    full.includes('no acepto esa tasa') ||
    full.includes('no acepto esta tasa') ||
    full.includes('no estoy de acuerdo con la tasa') ||
    full.includes('desacuerdo con la tasa') ||
    full.includes('inconforme con la tasa') ||
    full.includes('intereses no corresponde a la tasa') ||
    full.includes('intereses no corresponden a la tasa') ||
    (full.includes('tasa') && (
      full.includes('no es la que') ||
      full.includes('no corresponde') ||
      full.includes('otra') ||
      full.includes('cobrando de mas') ||
      full.includes('muy alta') ||
      full.includes('pactada') ||
      full.includes('ofrecida') ||
      full.includes('acordada')
    ));

  // B. Plazo del crédito signals
  const hasTermKeywords =
    full.includes('plazo asignado') ||
    full.includes('plazo del credito') ||
    full.includes('plazo de mi credito') ||
    full.includes('modificaron el plazo') ||
    full.includes('cambiaron el plazo') ||
    full.includes('plazo diferente') ||
    full.includes('tiempo de financiacion') ||
    full.includes('mas cuotas de las pactadas') ||
    full.includes('mas cuotas de las acordadas') ||
    full.includes('ampliacion o modificacion del plazo') ||
    full.includes('modificacion del plazo') ||
    (full.includes('plazo') && (
      full.includes('no estoy de acuerdo') ||
      full.includes('no acepto') ||
      full.includes('inconforme') ||
      full.includes('acordado') ||
      full.includes('pactado') ||
      full.includes('ofrecido')
    ));

  // C. Valor de cuota por condiciones signals
  const hasInstallmentConditionKeywords =
    full.includes('cuota mensual quedo mas alta de lo informado') ||
    full.includes('cuota mas alta de lo informado') ||
    full.includes('cuota mas alta de lo pactado') ||
    full.includes('cuota mas alta de lo ofrecido') ||
    full.includes('valor de la cuota no corresponde a lo acordado') ||
    full.includes('cuota no corresponde a lo acordado') ||
    full.includes('cuota no corresponde a lo pactado') ||
    full.includes('cuota quedo diferente a la pactada') ||
    full.includes('cuota diferente a la pactada') ||
    full.includes('cuota diferente a la acordada') ||
    full.includes('modificaron la cuota despues de cambiar las condiciones') ||
    full.includes('ofrecieron una cuota diferente') ||
    full.includes('plan de pagos no respeta las condiciones') ||
    full.includes('plan de pago no respeta las condiciones') ||
    (full.includes('cuota') && (
      full.includes('diferente a la pactada') ||
      full.includes('distinta a la pactada') ||
      full.includes('no corresponde a lo pactado') ||
      full.includes('no corresponde a lo acordado') ||
      full.includes('no es la pactada') ||
      full.includes('no es la acordada') ||
      full.includes('no es la que me ofrecieron')
    ));

  // D. Modalidad de financiación signals
  const hasModalityKeywords =
    full.includes('modalidad del credito') ||
    full.includes('modalidad de credito') ||
    full.includes('modalidad diferente') ||
    full.includes('condiciones de financiacion') ||
    full.includes('forma de financiacion') ||
    full.includes('financiacion aplicada no corresponde') ||
    full.includes('forma de liquidar mi credito') ||
    full.includes('condiciones del producto contratado');

  // E. Migración signals
  const hasMigrationKeywords =
    full.includes('despues de la migracion') ||
    full.includes('tras la migracion') ||
    full.includes('proceso de migracion') ||
    full.includes('migracion cambiaron') ||
    full.includes('cambio despues de una migracion') ||
    (full.includes('migrac') && (
      full.includes('condicion') ||
      full.includes('tasa') ||
      full.includes('cuota') ||
      full.includes('obligacion')
    ));

  // F. Condiciones comerciales signals
  const hasCommercialKeywords =
    full.includes('condiciones comerciales') ||
    full.includes('no respetaron las condiciones comerciales') ||
    full.includes('no cumplieron las condiciones comerciales') ||
    full.includes('condiciones al momento de la solicitud') ||
    (full.includes('beneficios') && (full.includes('no aplicaron') || full.includes('no cumplieron') || full.includes('ofrecieron beneficios')));

  // G. Condiciones pactadas no respetadas signals
  const hasBrokenPactKeywords =
    full.includes('no respetaron lo que me habian informado') ||
    full.includes('no respetaron lo informado') ||
    full.includes('las condiciones que me aplicaron no son las que me ofrecieron') ||
    full.includes('condiciones que me aplicaron no son') ||
    full.includes('condiciones distintas a las pactadas') ||
    full.includes('condiciones diferentes a las pactadas') ||
    full.includes('no respetaron lo pactado') ||
    full.includes('no respetaron lo acordado') ||
    full.includes('no respetaron la negociacion inicial') ||
    full.includes('condiciones aprobadas no coinciden') ||
    full.includes('condiciones aprobadas distintas') ||
    full.includes('condiciones que me ofrecieron') ||
    full.includes('ofrecieron unas condiciones diferentes') ||
    full.includes('condiciones distintas a las acordadas');

  // H. Cambio de condiciones signals
  const hasConditionChangeKeywords =
    full.includes('cambiaron las condiciones') ||
    full.includes('cambio de condiciones') ||
    full.includes('cambiaron condiciones') ||
    full.includes('modificaron unilateralmente') ||
    full.includes('modificacion unilateral') ||
    full.includes('modificaron las condiciones') ||
    full.includes('no acepto las nuevas condiciones') ||
    full.includes('nuevas condiciones') ||
    full.includes('no fui informado del cambio') ||
    full.includes('tenia unas condiciones y ahora aparecen otras') ||
    full.includes('aparecen otras condiciones') ||
    full.includes('respeten las condiciones originales') ||
    full.includes('modificacion aplicada');

  // I. General credit conditions dissatisfaction
  const hasGeneralConditionsKeywords =
    full.includes('no estoy de acuerdo con las condiciones de mi credito') ||
    full.includes('no acepto las condiciones de mi producto') ||
    full.includes('no estoy conforme con mi credito') ||
    full.includes('no estoy de acuerdo con las condiciones del leasing') ||
    full.includes('no estoy conforme con las condiciones') ||
    full.includes('no estoy de acuerdo con las condiciones') ||
    full.includes('desacuerdo con las condiciones') ||
    full.includes('inconforme con las condiciones') ||
    (full.includes('condiciones') && (
      full.includes('credito') ||
      full.includes('prestamo') ||
      full.includes('leasing') ||
      full.includes('obligacion') ||
      full.includes('libranza')
    ) && (
      full.includes('no estoy de acuerdo') ||
      full.includes('no acepto') ||
      full.includes('inconform') ||
      full.includes('reclamo') ||
      full.includes('disconform')
    ));

  const isCondicionesMatch =
    hasMigrationKeywords ||
    hasRateKeywords ||
    hasTermKeywords ||
    hasInstallmentConditionKeywords ||
    hasModalityKeywords ||
    hasCommercialKeywords ||
    hasBrokenPactKeywords ||
    hasConditionChangeKeywords ||
    hasGeneralConditionsKeywords;

  if (!isCondicionesMatch) {
    return { matches: false, subcategoria: '', intencion: '', problema: '', solicitud: '', resumen: '', evidencia: '', producto_detectado: '' };
  }

  // 3. SUBCATEGORY DETERMINATION (Hierarchical / Exact)
  let sub = 'OTRAS CONDICIONES DEL CRÉDITO';
  let intencion = 'Revisión y aclaración de condiciones pactadas del crédito';
  let problema = 'Discrepancia o inconformidad con condiciones del crédito';
  let solicitud = 'Revisión y ajuste a las condiciones ofrecidas y pactadas';
  let matchedKws: string[] = ['condiciones'];

  if (hasMigrationKeywords) {
    sub = 'CONDICIONES DESPUÉS DE MIGRACIÓN';
    intencion = 'Inconformidad con cambio de tasa, cuota o condiciones tras migración de la obligación';
    problema = 'Modificación de condiciones del crédito posterior a proceso de migración o cesión';
    solicitud = 'Restablecer condiciones originales previas a la migración de la obligación';
    matchedKws = ['migracion', 'tras la migracion', 'despues de la migracion'];
  } else if (
    full.includes('aumentaron la tasa') ||
    full.includes('aumento de tasa') ||
    full.includes('aumento la tasa') ||
    full.includes('subieron la tasa') ||
    full.includes('incrementaron la tasa') ||
    full.includes('cambiaron la tasa') ||
    full.includes('cambio de tasa') ||
    full.includes('tasa no es la que tenia') ||
    full.includes('tasa que tenia anteriormente') ||
    full.includes('tasa fija se convirtio en variable') ||
    full.includes('tasa fija y me aplicaron una variable') ||
    full.includes('tasa fija a variable') ||
    full.includes('no me explicaron el cambio de tasa')
  ) {
    sub = 'CAMBIO DE TASA';
    intencion = 'Reclamo por incremento, modificación o conversión de tasa fija a variable';
    problema = 'Aumento o cambio unilateral de la tasa de interés de la obligación';
    solicitud = 'Ajustar la tasa de interés a la pactada y reliquidar valores cobrados en exceso';
    matchedKws = ['aumentaron la tasa', 'cambiaron la tasa', 'tasa fija', 'variable', 'cambio de tasa', 'tasa no es la que tenia'];
  } else if (hasRateKeywords) {
    sub = 'TASA DE INTERÉS';
    intencion = 'Inconformidad con la tasa de interés asignada o aplicada al crédito';
    problema = 'Tasa de interés aplicada diferente o superior a la pactada u ofrecida';
    solicitud = 'Revisión y aplicación de la tasa de interés acordada en la adquisición del crédito';
    matchedKws = ['tasa de interes', 'no acepto la tasa', 'tasa que me colocaron', 'tasa incorrecta', 'tasa superior', 'tasa acordada'];
  } else if (hasTermKeywords) {
    sub = 'PLAZO DEL CRÉDITO';
    intencion = 'Inconformidad por modificación del plazo o número de cuotas del crédito';
    problema = 'Plazo asignado o número de cuotas no corresponde al tiempo acordado';
    solicitud = 'Ajuste del plazo y número de cuotas a los términos pactados';
    matchedKws = ['modificaron el plazo', 'plazo asignado', 'plazo del credito', 'mas cuotas de las pactadas'];
  } else if (hasInstallmentConditionKeywords) {
    sub = 'VALOR DE CUOTA POR CONDICIONES';
    intencion = 'Inconformidad con valor de cuota mensual que no respeta las condiciones acordadas';
    problema = 'Cuota mensual liquidada por valor superior o diferente al pactado según condiciones';
    solicitud = 'Ajustar el valor de la cuota mensual a las condiciones pactadas';
    matchedKws = ['cuota quedo diferente a la pactada', 'cuota mas alta de lo informado', 'plan de pagos no respeta las condiciones'];
  } else if (hasModalityKeywords) {
    sub = 'MODALIDAD DE FINANCIACIÓN';
    intencion = 'Desacuerdo con la modalidad de crédito o forma de liquidación aplicada';
    problema = 'Modalidad de crédito o condiciones de financiación distintas a las ofrecidas';
    solicitud = 'Ajustar la modalidad y forma de liquidación a lo ofrecido inicialmente';
    matchedKws = ['modalidad del credito', 'condiciones de financiacion', 'forma de liquidar'];
  } else if (hasCommercialKeywords) {
    sub = 'CONDICIONES COMERCIALES';
    intencion = 'Reclamo por incumplimiento de condiciones comerciales o beneficios ofrecidos';
    problema = 'No aplicación de beneficios o condiciones comerciales informadas en la solicitud';
    solicitud = 'Cumplimiento de las condiciones comerciales y beneficios ofrecidos';
    matchedKws = ['condiciones comerciales', 'beneficios que no aplicaron', 'oferta comercial'];
  } else if (hasBrokenPactKeywords) {
    sub = 'CONDICIONES PACTADAS NO RESPETADAS';
    intencion = 'Inconformidad porque las condiciones aplicadas no corresponden a las acordadas';
    problema = 'Incumplimiento de las condiciones acordadas o negociación inicial del crédito';
    solicitud = 'Respetar las condiciones aprobadas y pactadas al adquirir la obligación';
    matchedKws = ['no respetaron lo que me habian informado', 'condiciones distintas a las pactadas', 'no respetaron lo pactado'];
  } else if (hasConditionChangeKeywords) {
    sub = 'CAMBIO DE CONDICIONES';
    intencion = 'Inconformidad por modificación unilateral de las condiciones de la obligación';
    problema = 'Cambio unilateral de condiciones del crédito sin previo aviso o autorización';
    solicitud = 'Restablecer las condiciones contractuales originales de la obligación';
    matchedKws = ['cambiaron las condiciones', 'modificaron unilateralmente', 'nuevas condiciones'];
  } else {
    sub = 'OTRAS CONDICIONES DEL CRÉDITO';
    intencion = 'Inconformidad o desacuerdo general con las condiciones del crédito';
    problema = `Inconformidad con las condiciones aplicadas en ${prod.toLowerCase()}`;
    solicitud = 'Revisión y aclaración integral de las condiciones del crédito';
    matchedKws = ['condiciones de mi credito', 'condiciones del leasing', 'condiciones'];
  }

  const evidencia = extractEvidence(matchedKws);

  return {
    matches: true,
    subcategoria: sub,
    intencion,
    problema,
    solicitud,
    resumen: generateConciseSummary(text, 'CONDICIONES', sub, prod, `Cliente manifiesta inconformidad con ${sub.toLowerCase()} en su obligación crediticia.`),
    evidencia,
    producto_detectado: prod
  };
}

/**
 * Deep contextual detection and subcategorization for CRÉDITOS / CARTERA
 * Supporting all 10 official subcategories:
 * 1. PLAN DE PAGOS
 * 2. FRECH
 * 3. AUMENTO DE CUOTA
 * 4. ENDOSO
 * 5. REVERSIÓN
 * 6. REAPLICACIONES
 * 7. HÁBITO DE PAGO
 * 8. HISTÓRICO DE PAGO
 * 9. TITULARES
 * 10. CAMBIO DE FECHA
 * Plus backwards-compatible secondary subcategories:
 * - REFINANCIACIÓN Y ACUERDOS
 * - ESTADO DE OBLIGACIÓN / SALDOS
 */
export function detectCreditoCartera(
  text: string,
  submotivo: string,
  detectedProduct: string
): {
  matches: boolean;
  subcategoria: string;
  intencion: string;
  problema: string;
  solicitud: string;
  resumen: string;
  evidencia: string;
  producto_detectado: string;
} {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const submotivoLower = (submotivo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const full = `${lower} ${submotivoLower}`;

  // Credit card deferred purchases belong to TARJETAS > DIFERIDOS Y FINANCIACIÓN
  const isCardDeferredPurchase =
    (full.includes('tarjeta de credito') || full.includes('tarjeta credito') || detectedProduct === 'TARJETA DE CRÉDITO') &&
    (full.includes('compra diferida') || full.includes('rediferir') || full.includes('diferir compra') || full.includes('diferir a cuotas') || full.includes('plazo de cuotas')) &&
    !full.includes('credito de vivienda') && !full.includes('leasing') && !full.includes('libranza') && !full.includes('prestamo');

  if (isCardDeferredPurchase) {
    return { matches: false, subcategoria: '', intencion: '', problema: '', solicitud: '', resumen: '', evidencia: '', producto_detectado: '' };
  }

  // Credit card payment issues belong to PAGOS / ABONOS or PAGO A ITAU, not CRÉDITOS / CARTERA
  const isCreditCardPayment =
    (full.includes('tarjeta de credito') || full.includes('tarjeta credito') || detectedProduct === 'TARJETA DE CRÉDITO') &&
    (full.includes('pago de la tarjeta') || full.includes('pago de mi tarjeta') || full.includes('pague mi tarjeta') || full.includes('pago de tarjeta')) &&
    !full.includes('credito de vivienda') && !full.includes('leasing') && !full.includes('libranza') && !full.includes('prestamo') && !full.includes('cartera') && !full.includes('frech');

  if (isCreditCardPayment) {
    return { matches: false, subcategoria: '', intencion: '', problema: '', solicitud: '', resumen: '', evidencia: '', producto_detectado: '' };
  }

  // Pure cuota de manejo belongs to CUOTAS DE MANEJO
  const hasCreditContext =
    full.includes('credito') ||
    full.includes('prestamo') ||
    full.includes('vivienda') ||
    full.includes('leasing') ||
    full.includes('libranza') ||
    full.includes('cartera') ||
    full.includes('plan de pagos') ||
    full.includes('plan de pago') ||
    full.includes('amortizacion') ||
    full.includes('aumentaron la cuota') ||
    full.includes('aumento la cuota') ||
    full.includes('aumento de cuota') ||
    full.includes('cuota del credito') ||
    full.includes('cuota de credito');

  const isPureCuotaManejo =
    (full.includes('cuota de manejo') || full.includes('cuotas de manejo') || full.includes('tarifa de manejo')) &&
    !hasCreditContext;

  if (isPureCuotaManejo) {
    return { matches: false, subcategoria: '', intencion: '', problema: '', solicitud: '', resumen: '', evidencia: '', producto_detectado: '' };
  }

  // Pure debt collection charges belong to HONORARIOS Y GASTOS DE COBRANZA
  const isPureCobranza =
    (full.includes('honorarios') || full.includes('gastos de cobranza') || full.includes('gasto de cobranza') || full.includes('gastos de cobro')) &&
    (full.includes('abogado') || full.includes('casa de cobro') || full.includes('prejuridic') || full.includes('juridic') || full.includes('cobranza') || full.includes('cobro'));

  if (isPureCobranza && !full.includes('reversion') && !full.includes('devolucion') && !full.includes('debito automatico') && !full.includes('minimo vital')) {
    return { matches: false, subcategoria: '', intencion: '', problema: '', solicitud: '', resumen: '', evidencia: '', producto_detectado: '' };
  }

  // Helper to extract evidence around match
  const extractEvidence = (keywords: string[]): string => {
    let bestPos = -1;
    let matchedKw = '';
    for (const kw of keywords) {
      const pos = lower.indexOf(kw);
      if (pos !== -1 && (bestPos === -1 || pos > bestPos)) {
        bestPos = pos;
        matchedKw = kw;
      }
    }
    if (bestPos !== -1) {
      const start = Math.max(0, bestPos - 30);
      const end = Math.min(text.length, bestPos + matchedKw.length + 60);
      return text.slice(start, end).trim();
    }
    return text.slice(0, 120);
  };

  // Determine specific credit product
  let prod = 'CRÉDITO / CARTERA';
  if (full.includes('vivienda') || full.includes('hipotecari') || full.includes('frech') || full.includes('fresh') || full.includes('french')) {
    prod = 'CRÉDITO DE VIVIENDA';
  } else if (full.includes('leasing')) {
    prod = 'LEASING';
  } else if (full.includes('libre inversion') || full.includes('libre inversión')) {
    prod = 'CRÉDITO DE LIBRE INVERSIÓN';
  } else if (full.includes('rotativo')) {
    prod = 'CRÉDITO ROTATIVO';
  } else if (full.includes('vehiculo') || full.includes('automotriz') || full.includes('auto')) {
    prod = 'CRÉDITO DE VEHÍCULO';
  } else if (full.includes('consumo')) {
    prod = 'CRÉDITO DE CONSUMO';
  } else if (full.includes('libranza') || full.includes('nomina') || full.includes('descuento de nomina')) {
    prod = 'LIBRANZA';
  } else if (detectedProduct && detectedProduct !== 'NO ESPECIFICADO' && detectedProduct !== 'CUENTA DE AHORROS') {
    prod = detectedProduct;
  }

  // 1. ENDOSO
  const isEndoso =
    /\bendoso(s)?\b/i.test(full) ||
    full.includes('endoso') ||
    full.includes('endosar');
  if (isEndoso) {
    const kws = ['endoso de seguro', 'endoso de poliza', 'endoso hipotecario', 'endoso externo', 'endoso de vida', 'endoso de incendio', 'solicitud de endoso', 'endoso'];
    const evidencia = extractEvidence(kws);
    return {
      matches: true,
      subcategoria: 'ENDOSO',
      intencion: 'Solicitud o reclamación sobre el trámite de endoso de póliza asociada a la obligación crediticia',
      problema: `Trámite de endoso de póliza no aplicado, demorado o rechazado en ${prod.toLowerCase()}`,
      solicitud: 'Aplicación, actualización, aceptación o confirmación del endoso de la póliza',
      resumen: generateConciseSummary(text, 'CRÉDITOS / CARTERA', 'ENDOSO', prod, 'Solicita trámite, actualización o información sobre endoso de póliza.'),
      evidencia,
      producto_detectado: prod
    };
  }

  // 2. FRECH
  const isFrech =
    /\b(frech|fresh|french|fresch)\b/i.test(full) ||
    full.includes('subsidio frech') ||
    full.includes('subsidio fresh') ||
    full.includes('subsidio french') ||
    full.includes('subsidio fresch') ||
    full.includes('subsidio de vivienda') ||
    full.includes('subsidio a la tasa de vivienda') ||
    full.includes('subsidio a la tasa') ||
    full.includes('subsidio de tasa') ||
    full.includes('cobertura de tasa de interes de vivienda') ||
    full.includes('cobertura de tasa de vivienda') ||
    full.includes('cobertura de tasa') ||
    full.includes('cobertura frech') ||
    full.includes('beneficio de cobertura frech') ||
    full.includes('beneficio frech') ||
    full.includes('beneficio fresh');
  if (isFrech) {
    const kws = ['frech', 'fresh', 'french', 'fresch', 'subsidio de vivienda', 'subsidio a la tasa', 'cobertura de tasa', 'cobertura frech', 'beneficio frech'];
    const evidencia = extractEvidence(kws);
    return {
      matches: true,
      subcategoria: 'FRECH',
      intencion: 'Solicitud de aplicación, revisión o aclaración del beneficio o subsidio FRECH de vivienda',
      problema: 'Subsidio o cobertura de tasa FRECH no aplicado, suspendido o no reflejado en la cuota',
      solicitud: 'Aplicación de la cobertura FRECH y ajuste o reliquidación de la cuota mensual',
      resumen: generateConciseSummary(text, 'CRÉDITOS / CARTERA', 'FRECH', 'CRÉDITO DE VIVIENDA', 'Reclama por no aplicación o suspensión del beneficio o subsidio FRECH de vivienda.'),
      evidencia,
      producto_detectado: 'CRÉDITO DE VIVIENDA'
    };
  }

  // 3. CAMBIO DE FECHA
  const isCambioFecha =
    full.includes('cambiar la fecha de pago') ||
    full.includes('cambiar fecha de pago') ||
    full.includes('cambio de fecha de pago') ||
    full.includes('cambio de fecha') ||
    full.includes('modificar la fecha de mi cuota') ||
    full.includes('modificar fecha de cuota') ||
    full.includes('modificar la fecha de pago') ||
    full.includes('modificar fecha de pago') ||
    full.includes('cambiar el dia de pago') ||
    full.includes('cambiar dia de pago') ||
    full.includes('cambiar la fecha de vencimiento') ||
    full.includes('cambiar fecha de vencimiento') ||
    full.includes('mi cuota venza otro dia') ||
    full.includes('vence otro dia') ||
    full.includes('trasladar la fecha de pago') ||
    full.includes('trasladar fecha de pago') ||
    full.includes('ajustar el calendario de pagos') ||
    full.includes('cambiar la fecha limite') ||
    full.includes('cambiar la fecha de debito') ||
    full.includes('despues de mi fecha de pago de nomina') ||
    full.includes('se cobre despues de mi nomina') ||
    full.includes('despues de mi nomina');
  if (isCambioFecha) {
    const kws = ['cambio de fecha de pago', 'cambiar la fecha de pago', 'cambiar fecha de pago', 'cambiar el dia de pago', 'cambiar fecha de vencimiento', 'trasladar la fecha de pago', 'fecha de pago'];
    const evidencia = extractEvidence(kws);
    return {
      matches: true,
      subcategoria: 'CAMBIO DE FECHA',
      intencion: 'Solicitud de modificación de la fecha de pago o vencimiento de la cuota del crédito',
      problema: `Necesidad de modificar o trasladar la fecha de pago o vencimiento de la cuota en ${prod.toLowerCase()}`,
      solicitud: 'Modificación y traslado de la fecha mensual de pago del crédito',
      resumen: generateConciseSummary(text, 'CRÉDITOS / CARTERA', 'CAMBIO DE FECHA', prod, 'Solicita cambio o traslado en la fecha de pago o vencimiento de la cuota.'),
      evidencia,
      producto_detectado: prod
    };
  }

  // 4. REAPLICACIONES
  const isReaplicacion =
    full.includes('reaplicar') ||
    full.includes('reaplicacion') ||
    full.includes('reaplicaciones') ||
    full.includes('reaplicar el pago') ||
    full.includes('reaplicar mi cuota') ||
    full.includes('reaplicar el abono') ||
    full.includes('reaplicar al capital') ||
    full.includes('reaplicar a capital') ||
    full.includes('abono a capital') ||
    full.includes('pago a capital') ||
    full.includes('se aplique al capital') ||
    full.includes('se aplique a capital') ||
    full.includes('que el pago se aplique al capital') ||
    full.includes('cambiar la aplicacion del pago') ||
    full.includes('modificar la aplicacion del pago') ||
    full.includes('ajustar la aplicacion de mi pago') ||
    full.includes('reaplicar el pago al plazo') ||
    full.includes('reaplicar a plazo') ||
    full.includes('reduccion de la cuota mensual mediante reaplicacion') ||
    full.includes('reaplicar para reducir cuota') ||
    full.includes('reaplicar para reducir la cuota') ||
    full.includes('reduccion de la cuota mensual') ||
    full.includes('reaplicar a cobertura de cuota') ||
    full.includes('cobertura de cuota') ||
    full.includes('aplicacion a cobertura de cuota') ||
    full.includes('debe aplicarse a otra cuota') ||
    full.includes('cuota equivocada') ||
    full.includes('imputacion del pago') ||
    full.includes('imputacion de pago') ||
    full.includes('corregir la aplicacion de mi abono');
  if (isReaplicacion) {
    const kws = ['reaplicar', 'reaplicacion', 'reaplicaciones', 'abono a capital', 'pago a capital', 'reduccion de la cuota', 'cobertura de cuota', 'imputacion del pago'];
    const evidencia = extractEvidence(kws);
    return {
      matches: true,
      subcategoria: 'REAPLICACIONES',
      intencion: 'Solicitud de reaplicación, redistribución o cambio en la imputación de pagos o abonos a capital o plazo',
      problema: `Solicitud de reaplicación o cambio en la imputación de pagos en ${prod.toLowerCase()}`,
      solicitud: 'Reaplicar el pago o abono realizado a capital, reducción de cuota o plazo pactado',
      resumen: generateConciseSummary(text, 'CRÉDITOS / CARTERA', 'REAPLICACIONES', prod, 'Solicita reaplicación o cambio en la imputación de su pago a capital o plazo.'),
      evidencia,
      producto_detectado: prod
    };
  }

  // 5. HÁBITO DE PAGO
  const isHabitoPago =
    full.includes('habito de pago') ||
    full.includes('por que mi pago no se aplica a capital') ||
    full.includes('mi pago no se aplica a capital') ||
    full.includes('todo mi pago se esta yendo a intereses') ||
    full.includes('todo se va a intereses') ||
    full.includes('la mayoria se va a intereses') ||
    full.includes('todo se aplica a intereses') ||
    full.includes('se aplica principalmente a intereses') ||
    full.includes('no disminuye el saldo de mi deuda') ||
    full.includes('el saldo de mi deuda no disminuye') ||
    full.includes('la deuda no disminuye') ||
    full.includes('mi obligacion no disminuye') ||
    full.includes('mi saldo no disminuye') ||
    full.includes('estoy pagando y debo lo mismo') ||
    full.includes('pago y sigo debiendo lo mismo') ||
    full.includes('pago mensualmente pero la deuda sigue igual') ||
    full.includes('debo lo mismo') ||
    full.includes('no veo que baje el capital') ||
    full.includes('el capital no baja') ||
    full.includes('no baja el capital') ||
    full.includes('pago que no disminuye capital') ||
    full.includes('no entiendo como se distribuyen mis pagos') ||
    full.includes('los abonos no estan reduciendo el capital') ||
    full.includes('no se refleja la reduccion de mi deuda') ||
    full.includes('solicito explicacion de la distribucion de mis cuotas') ||
    full.includes('distribucion de mis cuotas') ||
    full.includes('estoy pagando intereses y el capital no disminuye') ||
    full.includes('mi saldo no baja despues de pagar') ||
    full.includes('comportamiento de mi obligacion no corresponde');
  if (isHabitoPago) {
    const kws = ['todo mi pago se esta yendo a intereses', 'todo se aplica a intereses', 'no disminuye el saldo', 'no disminuye capital', 'el capital no baja', 'estoy pagando y debo lo mismo', 'debo lo mismo', 'distribucion de mis cuotas', 'habito de pago'];
    const evidencia = extractEvidence(kws);
    return {
      matches: true,
      subcategoria: 'HÁBITO DE PAGO',
      intencion: 'Inconformidad con la amortización, distribución de pagos a intereses vs capital y saldo que no disminuye',
      problema: `Los pagos realizados en ${prod.toLowerCase()} se abonan predominantemente a intereses y no reducen el capital`,
      solicitud: 'Explicación de la amortización, revisión del saldo de capital y comportamiento de la deuda',
      resumen: generateConciseSummary(text, 'CRÉDITOS / CARTERA', 'HÁBITO DE PAGO', prod, 'Reclama porque los pagos efectuados no disminuyen el capital o se aplican a intereses.'),
      evidencia,
      producto_detectado: prod
    };
  }

  // 6. HISTÓRICO DE PAGO
  const isHistoricoPago =
    full.includes('historico de pagos') ||
    full.includes('historico de pago') ||
    full.includes('historial de pagos') ||
    full.includes('historial de pago') ||
    full.includes('registro historico de pagos') ||
    full.includes('relacion de pagos realizados') ||
    full.includes('relacion de mis pagos') ||
    full.includes('relacion de abonos') ||
    full.includes('conocer todos los pagos que he efectuado') ||
    full.includes('todos los pagos que he realizado') ||
    full.includes('detalle de los abonos de mi obligacion') ||
    full.includes('no aparecen mis pagos anteriores') ||
    full.includes('verificar los pagos realizados') ||
    full.includes('certificado historico de pagos') ||
    full.includes('reporte historico de pagos') ||
    full.includes('certificado o reporte historico de pagos') ||
    full.includes('fechas y valores de mis pagos anteriores') ||
    full.includes('registro de los pagos desde que adquiri el credito') ||
    full.includes('extracto de movimientos de mi credito') ||
    full.includes('detalle de pagos aplicados a capital e intereses');
  if (isHistoricoPago) {
    const kws = ['historico de pagos', 'historial de pagos', 'relacion de pagos realizados', 'certificado historico de pagos', 'reporte historico de pagos', 'historico de pago'];
    const evidencia = extractEvidence(kws);
    return {
      matches: true,
      subcategoria: 'HISTÓRICO DE PAGO',
      intencion: 'Solicitud de certificado, relación o reporte del histórico de pagos del crédito',
      problema: `Solicitud de consulta o verificación del histórico de pagos en ${prod.toLowerCase()}`,
      solicitud: 'Expedición y envío del reporte o certificado con el histórico y relación de pagos',
      resumen: generateConciseSummary(text, 'CRÉDITOS / CARTERA', 'HISTÓRICO DE PAGO', prod, 'Solicita histórico, relación o certificado de los pagos efectuados a su crédito.'),
      evidencia,
      producto_detectado: prod
    };
  }

  // 7. TITULARES
  const isTitulares =
    full.includes('ese credito no es mio') ||
    full.includes('este credito no es mio') ||
    full.includes('credito que no es mio') ||
    full.includes('no reconozco ser titular de ese credito') ||
    full.includes('no reconozco ser titular') ||
    full.includes('no soy titular de ese credito') ||
    full.includes('aparezco como titular de un credito que no reconozco') ||
    full.includes('aparezco como titular de un credito') ||
    full.includes('aparezco registrado como titular de un credito') ||
    full.includes('no aparezco como titular de mi obligacion') ||
    full.includes('no aparezco como titular') ||
    full.includes('no figura el segundo titular') ||
    full.includes('falta el segundo titular') ||
    full.includes('segundo titular del credito') ||
    full.includes('segundo titular') ||
    full.includes('no aparece el codeudor') ||
    full.includes('falta el codeudor') ||
    full.includes('codeudor') ||
    full.includes('no me incluyeron como cotitular') ||
    full.includes('cotitular') ||
    full.includes('titularidad compartida') ||
    full.includes('no se refleja la titularidad compartida') ||
    full.includes('el credito aparece a nombre de otra persona') ||
    full.includes('mi nombre no aparece en la obligacion') ||
    full.includes('corregir los titulares del credito') ||
    full.includes('actualizar la informacion de los titulares') ||
    full.includes('correccion de la titularidad') ||
    full.includes('no aparece mi pareja como segundo titular') ||
    full.includes('mi conyuge como segundo titular') ||
    full.includes('titulares del credito');
  if (isTitulares) {
    const kws = ['segundo titular', 'codeudor', 'cotitular', 'titularidad compartida', 'no es mio', 'no reconozco ser titular', 'titulares del credito', 'titular'];
    const evidencia = extractEvidence(kws);
    return {
      matches: true,
      subcategoria: 'TITULARES',
      intencion: 'Reclamación o solicitud sobre titularidad, cotitulares, codeudores o desvinculación de titularidad de la obligación',
      problema: `Inconsistencia en titulares registrados, falta de segundo titular/codeudor o inclusión errónea en ${prod.toLowerCase()}`,
      solicitud: 'Actualización, corrección o desvinculación de los titulares del crédito',
      resumen: generateConciseSummary(text, 'CRÉDITOS / CARTERA', 'TITULARES', prod, 'Reclama por inconsistencia en titulares, codeudores o titularidad del crédito.'),
      evidencia,
      producto_detectado: prod
    };
  }

  // 8. REVERSIÓN
  const isReversion =
    (full.includes('solicito reversion') ||
     full.includes('solicito devolucion') ||
     full.includes('necesito que me devuelvan') ||
     full.includes('solicito reintegro') ||
     full.includes('que reintegren') ||
     full.includes('reversar') ||
     full.includes('reversion del pago') ||
     full.includes('reversion de pago') ||
     full.includes('devolucion del pago') ||
     full.includes('devolucion de pago') ||
     full.includes('reversion de debito automatico') ||
     full.includes('devolucion de debito automatico') ||
     full.includes('reversar debito automatico') ||
     full.includes('reversion inmediata del debito automatico') ||
     full.includes('me debitaron automaticamente y solicito devolucion') ||
     full.includes('debitaron automaticamente dos veces') ||
     full.includes('pago doble') ||
     full.includes('pago duplicado') ||
     full.includes('cobro doble') ||
     full.includes('cobro duplicado') ||
     full.includes('cuota dos veces') ||
     full.includes('descuento que afecta mi minimo vital') ||
     full.includes('minimo vital') ||
     full.includes('afecta mi minimo vital') ||
     full.includes('vulnera mi minimo vital') ||
     full.includes('descontaron dinero de mi nomina') ||
     full.includes('descuento de mi nomina') ||
     full.includes('devolver un debito') ||
     full.includes('reversion por un pago aplicado indebidamente')) &&
    !full.includes('cuota de manejo') &&
    !full.includes('cuotas de manejo');

  if (isReversion) {
    const kws = ['reversion de debito automatico', 'debito automatico', 'pago doble', 'pago duplicado', 'minimo vital', 'devolucion', 'reversion', 'reintegro'];
    const evidencia = extractEvidence(kws);
    return {
      matches: true,
      subcategoria: 'REVERSIÓN',
      intencion: 'Solicitud de reversión, reintegro o devolución de dinero debitado, cobrado o descontado',
      problema: `Débito automático, cobro duplicado o descuento cuestionado en ${prod.toLowerCase()}`,
      solicitud: 'Reversión inmediata y reintegro del dinero debitado o descontado',
      resumen: generateConciseSummary(text, 'CRÉDITOS / CARTERA', 'REVERSIÓN', prod, 'Solicita reversión y devolución del débito automático, pago duplicado o descuento.'),
      evidencia,
      producto_detectado: prod
    };
  }

  // 9. AUMENTO DE CUOTA (Highest priority when client complains they now pay more than before)
  const isAumentoCuota =
    full.includes('aumento la cuota') ||
    full.includes('aumentaron la cuota') ||
    full.includes('aumento de la cuota') ||
    full.includes('aumento mi cuota') ||
    full.includes('aumentaron mi cuota') ||
    full.includes('aumento de cuota') ||
    full.includes('incremento de cuota') ||
    full.includes('incremento en la cuota') ||
    full.includes('incrementaron la cuota') ||
    full.includes('subio la cuota') ||
    full.includes('subieron la cuota') ||
    full.includes('subio mi cuota') ||
    full.includes('subieron mi cuota') ||
    full.includes('cuota mensual subio') ||
    full.includes('por que estoy pagando mas') ||
    full.includes('estoy pagando mas que antes') ||
    full.includes('estoy pagando mas') ||
    full.includes('antes pagaba menos') ||
    full.includes('ahora pago mas') ||
    full.includes('ahora me cobran mas') ||
    full.includes('la cuota no corresponde a lo que pagaba anteriormente') ||
    full.includes('no corresponde a lo que pagaba') ||
    full.includes('no estoy de acuerdo con el incremento de mi cuota') ||
    full.includes('no estoy de acuerdo con el incremento') ||
    full.includes('no estoy de acuerdo con el aumento de mi cuota') ||
    full.includes('cuota mas alta') ||
    (full.includes('migracion') && (full.includes('cuota') || full.includes('pagaba'))) ||
    full.includes('eso no era lo que pagaba en itau') ||
    full.includes('en itau pagaba un valor diferente') ||
    full.includes('mi cuota era de un valor y ahora me cobran otro') ||
    full.includes('no me informaron que iba a aumentar la cuota') ||
    full.includes('me cambiaron el valor mensual de la obligacion') ||
    full.includes('cambiaron el valor de la cuota') ||
    full.includes('cuota de vivienda aumento') ||
    full.includes('el valor de mi cuota subio') ||
    full.includes('el valor de la cuota subio') ||
    full.includes('solicito revisar el incremento de mi cuota') ||
    full.includes('solicito revisar el aumento de mi cuota') ||
    full.includes('no reconozco el nuevo valor de mi cuota');

  if (isAumentoCuota) {
    const kws = ['aumentaron la cuota', 'aumento la cuota', 'aumento de cuota', 'incremento de cuota', 'subio la cuota', 'estoy pagando mas', 'antes pagaba menos', 'mas alta despues de la migracion', 'cuota'];
    const evidencia = extractEvidence(kws);
    return {
      matches: true,
      subcategoria: 'AUMENTO DE CUOTA',
      intencion: 'Inconformidad o reclamación por incremento o aumento no informado en el valor de la cuota del crédito',
      problema: `Aumento o incremento no reconocido en el valor de la cuota mensual en ${prod.toLowerCase()}`,
      solicitud: 'Explicación del incremento, revisión y ajuste del valor de la cuota al pactado',
      resumen: generateConciseSummary(text, 'CRÉDITOS / CARTERA', 'AUMENTO DE CUOTA', prod, 'Reclama por incremento o aumento no reconocido en el valor de la cuota de su crédito.'),
      evidencia,
      producto_detectado: prod
    };
  }

  // 10. PLAN DE PAGOS
  const isPlanPagos =
    full.includes('plan de pagos') ||
    full.includes('plan de pago') ||
    full.includes('planes de pago') ||
    full.includes('planes de pagos') ||
    full.includes('amortizacion') ||
    full.includes('tabla de amortizacion') ||
    full.includes('cuadro de amortizacion') ||
    full.includes('cronograma de pagos') ||
    full.includes('cronograma de pago') ||
    full.includes('inconsistencias en el plan') ||
    full.includes('inconsistencia en el plan') ||
    full.includes('inconsistencias en la amortizacion') ||
    full.includes('inconsistencia en la amortizacion') ||
    full.includes('no entiendo como liquidaron mi credito') ||
    full.includes('explicacion de las cuotas del credito') ||
    full.includes('valores incorrectos en el plan') ||
    full.includes('valores incorrectos') ||
    full.includes('corregir mi plan de pagos') ||
    full.includes('distribucion de las cuotas en el plan') ||
    full.includes('copia del plan de pagos') ||
    full.includes('actualizacion del plan de pagos');

  if (isPlanPagos) {
    const kws = ['plan de pagos', 'plan de pago', 'amortizacion', 'tabla de amortizacion', 'cronograma de pagos', 'valores incorrectos'];
    const evidencia = extractEvidence(kws);
    return {
      matches: true,
      subcategoria: 'PLAN DE PAGOS',
      intencion: 'Inconformidad o solicitud de entrega/corrección del plan de amortización o pagos del crédito',
      problema: `Inconsistencia, diferencias o solicitud del plan de pagos y amortización en ${prod.toLowerCase()}`,
      solicitud: 'Entrega, revisión o corrección del plan de amortización y cronograma de pagos',
      resumen: generateConciseSummary(text, 'CRÉDITOS / CARTERA', 'PLAN DE PAGOS', prod, 'Reclama inconsistencias o solicita entrega/corrección de su plan de pagos y amortización.'),
      evidencia,
      producto_detectado: prod
    };
  }

  // Secondary: Acuerdos de pago y reestructuración
  const isAcuerdoDePago =
    full.includes('acuerdo de pago') ||
    full.includes('acuerdos de pago') ||
    full.includes('llegar a un acuerdo') ||
    full.includes('propuesta de acuerdo') ||
    (full.includes('acuerdo') && !full.includes('de acuerdo')) ||
    full.includes('refinanc') ||
    full.includes('reestructur') ||
    full.includes('alivio');

  if (isAcuerdoDePago) {
    const kws = ['acuerdo de pago', 'refinanciacion', 'reestructuracion', 'alivio'];
    const evidencia = extractEvidence(kws);
    return {
      matches: true,
      subcategoria: 'REFINANCIACIÓN Y ACUERDOS',
      intencion: 'Solicitud de acuerdo de pago, refinanciación o alivio financiero',
      problema: `Solicitud de acuerdo o reestructuración de obligación crediticia en ${prod.toLowerCase()}`,
      solicitud: 'Gestión de acuerdo de pago o refinanciación de cartera',
      resumen: generateConciseSummary(text, 'CRÉDITOS / CARTERA', 'REFINANCIACIÓN Y ACUERDOS', prod, 'Solicita acuerdo de pago o reestructuración de su crédito.'),
      evidencia,
      producto_detectado: prod
    };
  }

  // General credit installment or obligation inquiry
  const hasGenericCreditTerm =
    full.includes('credito de vivienda') ||
    full.includes('credito hipotecario') ||
    full.includes('hipotecario') ||
    full.includes('vivienda') ||
    full.includes('credito de leasing') ||
    full.includes('leasing') ||
    full.includes('libranza') ||
    full.includes('prestamo') ||
    full.includes('libre inversion') ||
    full.includes('microcredito') ||
    full.includes('cartera') ||
    full.includes('obligacion crediticia') ||
    (full.includes('credito') && !full.includes('tarjeta de credito') && !full.includes('tarjeta credito')) ||
    detectedProduct === 'CRÉDITO / CARTERA';

  const hasGenericInstallment =
    full.includes('cuota') ||
    full.includes('cuotas') ||
    full.includes('cuotas pendientes') ||
    full.includes('cuotas vencidas') ||
    full.includes('cuotas de financiacion') ||
    full.includes('revisar las cuotas') ||
    full.includes('revisar cuotas');

  if (hasGenericCreditTerm && hasGenericInstallment) {
    const kws = ['cuota del credito', 'cuota mensual', 'cuotas', 'cuota', 'credito'];
    const evidencia = extractEvidence(kws);
    return {
      matches: true,
      subcategoria: 'PLAN DE PAGOS',
      intencion: 'Solicitud de revisión, aclaración o consulta sobre cuotas de la obligación crediticia',
      problema: `Revisión o consulta sobre cuotas del crédito en ${prod.toLowerCase()}`,
      solicitud: 'Revisión y explicación del valor de las cuotas o estado del crédito',
      resumen: generateConciseSummary(text, 'CRÉDITOS / CARTERA', 'PLAN DE PAGOS', prod, 'Consulta o solicita revisión de cuotas de su crédito.'),
      evidencia,
      producto_detectado: prod
    };
  }

  return { matches: false, subcategoria: '', intencion: '', problema: '', solicitud: '', resumen: '', evidencia: '', producto_detectado: '' };
}

/**
 * Backwards compatibility alias for detectCreditoCartera
 */
export function detectCreditoCarteraCuotas(
  text: string,
  submotivo: string,
  detectedProduct: string
) {
  return detectCreditoCartera(text, submotivo, detectedProduct);
}

/**
 * Deep contextual detection and subcategorization for CUOTAS DE MANEJO
 */
export function detectCuotasDeManejo(
  text: string,
  submotivo: string,
  detectedProduct: string
): {
  matches: boolean;
  subcategoria: string;
  intencion: string;
  problema: string;
  solicitud: string;
  resumen: string;
} {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const submotivoLower = (submotivo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const hasCuotaWord =
    lower.includes('cuota de manejo') ||
    lower.includes('cuotas de manejo') ||
    lower.includes('cuota manejo') ||
    lower.includes('cuotas manejo') ||
    submotivoLower.includes('cuota de manejo') ||
    submotivoLower.includes('cuotas de manejo') ||
    submotivoLower.includes('cuota manejo');

  const hasAdminWord =
    lower.includes('administracion de la tarjeta') ||
    lower.includes('administracion de mi tarjeta') ||
    lower.includes('administracion de tarjeta') ||
    lower.includes('administracion tarjeta') ||
    lower.includes('administracion del producto') ||
    lower.includes('administracion de producto') ||
    lower.includes('administracion producto') ||
    lower.includes('administracion de mi cuenta') ||
    lower.includes('administracion de la cuenta') ||
    lower.includes('valor cobrado por administracion') ||
    lower.includes('cobrado por administracion') ||
    lower.includes('cobro por administracion') ||
    lower.includes('cobro de administracion') ||
    lower.includes('tarifa de manejo') ||
    lower.includes('tarifa manejo') ||
    lower.includes('valor de manejo') ||
    lower.includes('valor del manejo') ||
    lower.includes('valor por manejo') ||
    lower.includes('cargo de manejo') ||
    lower.includes('cargos de manejo') ||
    lower.includes('cargo por manejo');

  const hasHoldCardWord =
    lower.includes('por mantener la tarjeta') ||
    lower.includes('por mantener el plastico') ||
    lower.includes('por tener la tarjeta') ||
    lower.includes('por tener el plastico') ||
    lower.includes('por tener mi tarjeta') ||
    lower.includes('cobro por tener') ||
    lower.includes('cobran por tener') ||
    lower.includes('cobro por mantener') ||
    lower.includes('cobran por mantener');

  // Strict: monthly fee words ONLY apply if context confirms management/maintenance
  const hasMonthlyFeeWord =
    (lower.includes('cargo mensual de manejo') || lower.includes('cobro mensual de manejo') || lower.includes('tarifa mensual de manejo') || lower.includes('cobro periodico de manejo')) ||
    ((lower.includes('cargo mensual') || lower.includes('cobro mensual') || lower.includes('tarifa mensual') || lower.includes('cobro periodico') || lower.includes('cargo periodico')) &&
     (lower.includes('manejo') || lower.includes('administracion') || lower.includes('por mantener') || lower.includes('por tener')));

  const hasExonerationWord =
    (lower.includes('sin cuota de manejo') || lower.includes('cuota de manejo gratis') || lower.includes('exoneracion de cuota de manejo') || lower.includes('exencion de cuota de manejo') || lower.includes('sin cuota de manejo de por vida')) ||
    ((lower.includes('exoneracion') || lower.includes('exencion') || lower.includes('cuota gratis') || lower.includes('gratuidad')) &&
     (lower.includes('cuota de manejo') || lower.includes('cuota manejo') || lower.includes('manejo') || lower.includes('administracion')));

  const hasCancelledCardFee =
    (lower.includes('cancelad') || lower.includes('cerrad') || lower.includes('bloquead') || lower.includes('inactiv') || lower.includes('no utiliz') || lower.includes('no la uso') || lower.includes('no la he usado') || lower.includes('ya no tengo') || lower.includes('despues de cancelar')) &&
    (lower.includes('cuota de manejo') || lower.includes('cuotas de manejo') || lower.includes('cuota manejo') || lower.includes('manejo') || lower.includes('administracion'));

  // Disambiguation: loan installments (cuotas de crédito, vivienda, leasing, plan de pagos, etc.)
  // MUST NEVER be confused with cuota de manejo.
  const isLoanOrCreditContext =
    lower.includes('credito') ||
    lower.includes('prestamo') ||
    lower.includes('vivienda') ||
    lower.includes('leasing') ||
    lower.includes('libranza') ||
    lower.includes('hipotecari') ||
    lower.includes('plan de pagos') ||
    lower.includes('plan de pago') ||
    lower.includes('amortizacion') ||
    lower.includes('cuota del credito') ||
    lower.includes('cuota mensual del credito') ||
    lower.includes('cuota mensual de mi credito') ||
    lower.includes('cuotas de mi credito') ||
    lower.includes('cuota de vivienda') ||
    lower.includes('cuota de leasing') ||
    lower.includes('cuotas pendientes') ||
    lower.includes('cuotas de financiacion');

  const hasExplicitManejoEvidence =
    hasCuotaWord ||
    hasAdminWord ||
    hasHoldCardWord ||
    lower.includes('cuota de manejo') ||
    lower.includes('cuotas de manejo') ||
    lower.includes('cuota manejo') ||
    lower.includes('tarifa de manejo') ||
    lower.includes('cargo de manejo');

  if (isLoanOrCreditContext && !hasExplicitManejoEvidence) {
    return { matches: false, subcategoria: '', intencion: '', problema: '', solicitud: '', resumen: '' };
  }

  const isMatch =
    hasCuotaWord ||
    hasAdminWord ||
    hasHoldCardWord ||
    hasMonthlyFeeWord ||
    hasExonerationWord ||
    hasCancelledCardFee;

  if (!isMatch) {
    return { matches: false, subcategoria: '', intencion: '', problema: '', solicitud: '', resumen: '' };
  }

  let sub = 'COBRO';
  let intencion = 'Inconformidad con cobro de cuota de manejo';
  let problema = 'Cobro de cuota de manejo';
  let solicitud = 'Revisión del cobro de cuota de manejo facturado';
  let resumen = 'Inconformidad con cobro de cuota de manejo en su producto.';

  if (hasCancelledCardFee || lower.includes('cancel') || lower.includes('bloquead') || lower.includes('inactiv') || lower.includes('cerrad') || lower.includes('no utiliz') || lower.includes('no la uso') || lower.includes('no la he usado') || lower.includes('ya no tengo') || lower.includes('despues de cancelar') || lower.includes('posterior a la cancelacion') || lower.includes('sin uso')) {
    sub = 'COBRO POSTERIOR A CANCELACIÓN';
    intencion = 'Inconformidad por cobro de cuota de manejo en tarjeta o producto cancelado, bloqueado o inactivo';
    problema = 'Cobro de cuota de manejo en producto cancelado, bloqueado o sin uso';
    solicitud = 'Eliminación del cobro y confirmación de cancelación o cierre del producto';
    resumen = 'Reclama cobro de cuota de manejo en tarjeta cancelada, bloqueada o sin uso.';
  } else if (
    (lower.includes('promet') || lower.includes('ofrec') || lower.includes('pactad') || lower.includes('de por vida') || lower.includes('gratuita') || lower.includes('gratis') || lower.includes('sin cuota de manejo') || lower.includes('beneficio no aplicado') || lower.includes('era sin cuota') || lower.includes('alianza') || lower.includes('convenio')) ||
    (hasExonerationWord && !lower.includes('solicito exoneracion') && !lower.includes('pido exoneracion') && !lower.includes('solicito exonerar'))
  ) {
    sub = 'EXONERACIÓN O BENEFICIO NO APLICADO';
    intencion = 'Reclamo por cobro de cuota de manejo a pesar de contar con condición de exoneración o beneficio de gratuidad';
    problema = 'Cobro de cuota de manejo a pesar de condición de exoneración prometida';
    solicitud = 'Aplicación de la exoneración prometida y reversión de los cobros efectuados';
    resumen = 'Reclama por cobro de cuota de manejo pese a exoneración o beneficio ofrecido.';
  } else if (lower.includes('duplicad') || lower.includes('doble cobro') || lower.includes('dos veces') || lower.includes('cobro doble') || lower.includes('dos cuotas') || lower.includes('cobrada dos veces')) {
    sub = 'COBRO DUPLICADO';
    intencion = 'Reclamo por cobro duplicado de cuota de manejo en el mismo periodo';
    problema = 'Cobro duplicado de cuota de manejo';
    solicitud = 'Devolución o reversión de la cuota de manejo duplicada';
    resumen = 'Reclama cobro duplicado de cuota de manejo en su producto.';
  } else if (lower.includes('devol') || lower.includes('reversion') || lower.includes('reintegr') || lower.includes('reembols') || lower.includes('eliminar') || lower.includes('retirar') || lower.includes('ajuste del extracto') || lower.includes('ajuste de extracto') || lower.includes('restitu') || lower.includes('quitar')) {
    sub = 'DEVOLUCIÓN O REVERSIÓN';
    intencion = 'Solicitud de devolución, reintegro o eliminación de valores cobrados por cuota de manejo';
    problema = 'Cobro de cuota de manejo cuya devolución o eliminación se solicita';
    solicitud = 'Reintegro o reversión del valor debitado por concepto de cuota de manejo';
    resumen = 'Solicita devolución o reversión de valores cobrados por cuota de manejo.';
  } else if (lower.includes('no reconoc') || lower.includes('desconoc') || lower.includes('no autoric') || lower.includes('no autorizo') || lower.includes('sin autorizacion') || lower.includes('no me informaron') || lower.includes('no informad') || lower.includes('nunca acepte') || lower.includes('no acepte') || lower.includes('no lo acepte') || lower.includes('nunca solicite') || lower.includes('no solicite') || lower.includes('indebid') || lower.includes('improcedente') || lower.includes('no debian cobrar')) {
    sub = 'COBRO NO RECONOCIDO';
    intencion = 'Inconformidad por cuota de manejo considerada no autorizada, no informada o no reconocida';
    problema = 'Cobro de cuota de manejo no autorizado o no informado';
    solicitud = 'Aclaración y anulación del cobro no reconocido de cuota de manejo';
    resumen = 'Cuestiona cobro de cuota de manejo que considera no autorizada o no pactada.';
  } else if (lower.includes('explicacion') || lower.includes('aclaracion') || lower.includes('diferencia') || lower.includes('no entiendo') || lower.includes('por que me cobran') || lower.includes('por que cobran') || lower.includes('superior a la esperada') || lower.includes('periodicidad') || lower.includes('condiciones') || lower.includes('revisar el valor') || lower.includes('valor facturado')) {
    sub = 'ACLARACIÓN DEL VALOR O LAS CONDICIONES';
    intencion = 'Solicitud de explicación o aclaración sobre el valor, periodicidad o condiciones de la cuota de manejo';
    problema = 'Diferencia o duda sobre el valor y condiciones de la cuota de manejo facturada';
    solicitud = 'Explicación detallada de las condiciones y valor facturado por manejo';
    resumen = 'Solicita aclaración del valor o condiciones de cobro de la cuota de manejo.';
  } else if (lower.includes('reposicion') || lower.includes('tarjeta adicional') || lower.includes('plastico adicional') || lower.includes('producto adicional') || lower.includes('amparada')) {
    sub = 'OTRO MOTIVO DE CUOTA DE MANEJO';
    intencion = 'Reclamación o solicitud sobre cuota de manejo por motivo específico';
    problema = 'Cobro de cuota de manejo por reposición o producto adicional';
    solicitud = 'Ajuste de cuota de manejo según condiciones especiales';
    resumen = 'Reclamo sobre cuota de manejo asociada a condiciones especiales del producto.';
  }

  const prodDesc = detectedProduct !== 'NO ESPECIFICADO' ? ` en ${detectedProduct.toLowerCase()}` : '';

  return {
    matches: true,
    subcategoria: sub,
    intencion,
    problema: `${problema}${prodDesc}`,
    solicitud,
    resumen: generateConciseSummary(text, 'CUOTAS DE MANEJO', sub, detectedProduct, resumen)
  };
}

/**
 * Deep contextual detection and subcategorization for HONORARIOS Y GASTOS DE COBRANZA
 */
export function detectHonorariosCobranza(
  text: string,
  submotivo: string,
  detectedProduct: string
): {
  matches: boolean;
  subcategoria: string;
  intencion: string;
  problema: string;
  solicitud: string;
  resumen: string;
} {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const submotivoLower = (submotivo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const hasHonorariosWord =
    lower.includes('honorarios de cobranza') ||
    lower.includes('honorario de cobranza') ||
    lower.includes('honorarios de cobro') ||
    lower.includes('honorario de cobro') ||
    lower.includes('honorarios cobranza') ||
    lower.includes('honorarios cobro') ||
    lower.includes('honorarios juridicos') ||
    lower.includes('honorarios prejuridicos') ||
    lower.includes('honorarios pre-juridicos') ||
    lower.includes('honorarios de abogado') ||
    lower.includes('honorarios de abogada') ||
    lower.includes('honorarios de recuperacion') ||
    lower.includes('cargo por honorarios') ||
    lower.includes('cargo de honorarios') ||
    lower.includes('servicios de cobranza') ||
    lower.includes('cobro prejuridico') ||
    lower.includes('cobranza prejuridica');

  const hasGastosCobranzaWord =
    lower.includes('gastos de cobranza') ||
    lower.includes('gasto de cobranza') ||
    lower.includes('gastos cobranza') ||
    lower.includes('gasto cobranza') ||
    lower.includes('gastos de cobro') ||
    lower.includes('gasto de cobro') ||
    lower.includes('gastos cobro') ||
    lower.includes('gasto cobro') ||
    lower.includes('gestion de cobranza') ||
    lower.includes('gestion de cobro') ||
    lower.includes('recuperacion de cartera') ||
    lower.includes('cargo por cobranza') ||
    lower.includes('cargos por cobranza') ||
    lower.includes('cargos de cobranza') ||
    lower.includes('gastos de recuperacion') ||
    lower.includes('gasto de recuperacion');

  const hasSubmotivoSignal =
    submotivoLower.includes('cobranza') ||
    submotivoLower.includes('honorarios') ||
    submotivoLower.includes('prejuridico') ||
    submotivoLower.includes('gastos cobro');

  const hasNotOverdueClaim =
    lower.includes('no estaba en mora') ||
    lower.includes('no me encontraba en mora') ||
    lower.includes('estaba al dia') ||
    lower.includes('al dia con mis pagos') ||
    lower.includes('al dia con mis obligaciones') ||
    lower.includes('al dia en mis pagos') ||
    lower.includes('pague antes de la fecha') ||
    lower.includes('pague oportunamente') ||
    lower.includes('a tiempo') ||
    lower.includes('al tiempo') ||
    lower.includes('pagado a tiempo') ||
    lower.includes('pague a tiempo') ||
    lower.includes('pagada a tiempo') ||
    lower.includes('no tenia cuotas vencidas') ||
    lower.includes('no tenia mora') ||
    lower.includes('sin mora') ||
    lower.includes('sin estar en mora') ||
    lower.includes('mora inexistente') ||
    lower.includes('retraso que no existio') ||
    lower.includes('mora fue causada por') ||
    lower.includes('mora causada por') ||
    lower.includes('aplicaron el pago tarde') ||
    lower.includes('aplicaron un pago tarde') ||
    lower.includes('aplicacion tardia del pago');

  const hasPaidDebtClaim =
    lower.includes('despues de pagar') ||
    lower.includes('despues del pago') ||
    lower.includes('despues de haber pagado') ||
    lower.includes('habiendo pagado') ||
    lower.includes('ya estaba pagada') ||
    lower.includes('ya habia pagado') ||
    lower.includes('ya habia realizado el pago') ||
    lower.includes('deuda pagada') ||
    lower.includes('obligacion pagada') ||
    lower.includes('pago total') ||
    lower.includes('ya habia cancelado') ||
    lower.includes('cancelada en su totalidad');

  const hasCollectionChargeContext =
    hasHonorariosWord ||
    hasGastosCobranzaWord ||
    hasSubmotivoSignal ||
    lower.includes('cobranza') ||
    lower.includes('casa de cobro') ||
    lower.includes('agencia de cobro') ||
    lower.includes('abogado') ||
    lower.includes('prejuridic') ||
    (hasNotOverdueClaim && (lower.includes('cobro') || lower.includes('cargo') || lower.includes('facturaron') || lower.includes('gastos')));

  // Disambiguation: interest alone is NOT honorarios/gastos de cobranza
  const isOnlyInterestDispute =
    (lower.includes('intereses de mora') || lower.includes('intereses corrientes') || lower.includes('interes de mora') || lower.includes('tasa de interes')) &&
    !hasHonorariosWord &&
    !hasGastosCobranzaWord &&
    !hasSubmotivoSignal &&
    !lower.includes('cobranza');

  if (isOnlyInterestDispute) {
    return { matches: false, subcategoria: '', intencion: '', problema: '', solicitud: '', resumen: '' };
  }

  // Disambiguation: loan requests without collection claims
  if (!hasHonorariosWord && !hasGastosCobranzaWord && !hasSubmotivoSignal && !lower.includes('cobranza')) {
    if (lower.includes('extracto') || lower.includes('paz y salvo') || lower.includes('certificado') || lower.includes('derecho de peticion')) {
      return { matches: false, subcategoria: '', intencion: '', problema: '', solicitud: '', resumen: '' };
    }
  }

  const isMatch =
    hasHonorariosWord ||
    hasGastosCobranzaWord ||
    hasSubmotivoSignal ||
    ((hasNotOverdueClaim || hasPaidDebtClaim) && hasCollectionChargeContext);

  if (!isMatch) {
    return { matches: false, subcategoria: '', intencion: '', problema: '', solicitud: '', resumen: '' };
  }

  let sub = 'GASTOS DE COBRANZA';
  let intencion = 'Inconformidad con cobro de gastos de cobranza en su obligación';
  let problema = 'Cobro de gastos de cobranza';
  let solicitud = 'Revisión y aclaración de los gastos de cobranza';
  let resumen = 'Inconformidad con cobro de gastos de cobranza en su obligación.';

  if (hasNotOverdueClaim) {
    sub = 'COBRO CUESTIONADO POR NO ESTAR EN MORA';
    intencion = 'Cuestiona cobro de gastos de cobranza u honorarios manifestando no haber incurrido en mora o haber pagado oportunamente';
    problema = 'Cobro de gastos de cobranza u honorarios a pesar de estar al día';
    solicitud = 'Verificación de fechas de pago y eliminación o reintegro del cobro de cobranza';
    resumen = 'Cuestiona gastos de cobranza porque manifiesta estar al día en sus pagos.';
  } else if (hasPaidDebtClaim) {
    sub = 'COBRO DESPUÉS DEL PAGO';
    intencion = 'Reclamo por cobro de honorarios o gastos de cobranza aplicados con posterioridad al pago de la obligación';
    problema = 'Cargo de cobranza aplicado tras el pago o cancelación de la deuda';
    solicitud = 'Eliminación o devolución de gastos de cobranza aplicados tras el pago';
    resumen = 'Reclama por gastos de cobranza aplicados después de haber pagado la obligación.';
  } else if (lower.includes('normaliz') || lower.includes('reestructur') || lower.includes('acuerdo de pago') || lower.includes('alivio')) {
    sub = 'COBRO POSTERIOR A NORMALIZACIÓN';
    intencion = 'Inconformidad por cargos de cobranza u honorarios aplicados tras normalización o acuerdo sobre la obligación';
    problema = 'Cobro de honorarios o gastos de cobro tras acuerdo de normalización';
    solicitud = 'Retiro de los honorarios de cobranza en cumplimiento del acuerdo';
    resumen = 'Reclama cobro de honorarios tras haber normalizado la obligación.';
  } else if (lower.includes('devol') || lower.includes('reversion') || lower.includes('reintegr') || lower.includes('eliminar') || lower.includes('retirar') || lower.includes('ajuste del saldo') || lower.includes('quitar')) {
    sub = 'DEVOLUCIÓN O REVERSIÓN';
    intencion = 'Solicitud de devolución, reintegro o eliminación de valores cobrados por cobranza u honorarios';
    problema = 'Cobro de cobranza u honorarios cuya devolución o eliminación se solicita';
    solicitud = 'Reintegro o anulación de los valores cargados por honorarios o cobranza';
    resumen = 'Solicita devolución o eliminación de honorarios y gastos de cobranza.';
  } else if (lower.includes('duplicad') || lower.includes('doble') || lower.includes('repetid') || lower.includes('dos veces')) {
    sub = 'COBRO DUPLICADO';
    intencion = 'Reclamo por cargos de cobranza u honorarios cobrados de manera repetida o duplicada';
    problema = 'Cobro duplicado de honorarios o gastos de cobranza';
    solicitud = 'Devolución o anulación del cobro duplicado de cobranza';
    resumen = 'Reclama cobro duplicado de gastos de cobranza u honorarios.';
  } else if (lower.includes('excesiv') || lower.includes('desproporcionad') || lower.includes('porcentaje') || lower.includes('calculo') || lower.includes('como calcularon') || lower.includes('no corresponde a la deuda') || lower.includes('mas de lo debido') || lower.includes('muy alto')) {
    sub = 'VALOR O CÁLCULO NO CONFORME';
    intencion = 'Desacuerdo con el porcentaje, cálculo o valor liquidado por honorarios y gastos de cobranza';
    problema = 'Valor o cálculo de honorarios de cobranza considerado excesivo';
    solicitud = 'Revisión y ajuste del porcentaje o valor liquidado por gastos de cobranza';
    resumen = 'Solicita aclaración o reducción del valor cobrado por honorarios de cobranza.';
  } else if (lower.includes('soporte') || lower.includes('sin comunic') || lower.includes('no recibi llamada') || lower.includes('no recibi comunicacion') || lower.includes('que gestion') || lower.includes('factura') || lower.includes('no me informaron') || lower.includes('no reconozco la gestion') || lower.includes('no hubo gestion')) {
    sub = 'FALTA DE INFORMACIÓN O SOPORTES';
    intencion = 'Solicitud de soportes o aclaración de gestiones que originaron el cobro de cobranza u honorarios';
    problema = 'Falta de soportes o comunicación previa sobre gestión de cobranza';
    solicitud = 'Envío de soportes y justificación de la gestión de cobro facturada';
    resumen = 'Solicita soportes de la gestión que originó los honorarios de cobranza.';
  } else if (hasHonorariosWord || lower.includes('abogado') || lower.includes('prejuridic')) {
    sub = 'COBRO DE HONORARIOS';
    intencion = 'Inconformidad o reclamación por cobro de honorarios de cobranza o abogado';
    problema = 'Cobro de honorarios de abogado o cobranza';
    solicitud = 'Aclaración o ajuste de honorarios de cobranza facturados';
    resumen = 'Inconformidad con cobro de honorarios jurídicos o prejurídicos de cobranza.';
  } else {
    sub = 'GASTOS DE COBRANZA';
    intencion = 'Inconformidad o reclamación por cargo de gastos de cobranza o gestión de cobro';
    problema = 'Cargo de gastos de cobranza en estado de cuenta';
    solicitud = 'Revisión y aclaración de los gastos de cobranza cargados a su saldo';
    resumen = 'Inconformidad con cobro de gastos de cobranza en su obligación.';
  }

  if (lower.includes('cuota de manejo') || lower.includes('cuotas de manejo')) {
    problema = `${problema} y cuota de manejo`;
    solicitud = `${solicitud} y revisión de cuota de manejo`;
  }

  const prodDesc = detectedProduct !== 'NO ESPECIFICADO' ? ` en ${detectedProduct.toLowerCase()}` : '';

  return {
    matches: true,
    subcategoria: sub,
    intencion,
    problema: `${problema}${prodDesc}`,
    solicitud,
    resumen: generateConciseSummary(text, 'HONORARIOS Y GASTOS DE COBRANZA', sub, detectedProduct, resumen)
  };
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

  const fullContextText = extractFullContextText(record);
  const fullLower = fullContextText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const detectedProduct = detectProduct(fullContextText, record.submotivo_original || record.resumen_original, record.producto_original);

  // =========================================================================
  // REVISIÓN HUMANA (PRIORIDAD 10 / FILTRO PREVIO)
  // Estrictamente si la descripción está vacía, es ruido, o únicamente menciona
  // el nombre aislado del producto o palabra aislada sin describir el problema.
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
    cleanAlpha === 'informacion' ||
    cleanAlpha === 'cobro' ||
    cleanAlpha === 'cobros' ||
    cleanAlpha === 'comision' ||
    cleanAlpha === 'honorario' ||
    cleanAlpha === 'honorarios' ||
    cleanAlpha === 'gastos';

  if (isEssentiallyEmpty) {
    return {
      expediente,
      categoria_principal: 'REVISIÓN HUMANA',
      subcategoria: 'INFORMACIÓN INSUFICIENTE',
      resumen_requerimiento: 'Descripción ausente o vaga sin temática identificable.',
      intencion_cliente: 'Sin información de solicitud identificable',
      confianza: 35,
      requiere_revision_humana: true,
      motivo_de_revision: 'DESC_DETALLADA carece de información suficiente sobre el producto, transacción o motivo de inconformidad del cliente.',
      producto_detectado: detectedProduct,
      problema_principal: 'Descripción insuficiente para determinar el tema',
      solicitud_cliente: 'Información insuficiente',
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

  // Pre-run deep contextual detectors for Cuotas de Crédito, Condiciones, Cuotas de Manejo, Honorarios/Gastos de Cobranza and CDT
  const creditoRes = detectCreditoCarteraCuotas(fullContextText, record.submotivo_original || '', detectedProduct);
  const condicionesRes = detectCondicionesCredito(fullContextText, record.submotivo_original || '', detectedProduct);
  const cuotaRes = detectCuotasDeManejo(fullContextText, record.submotivo_original || '', detectedProduct);
  const cobranzaRes = detectHonorariosCobranza(fullContextText, record.submotivo_original || '', detectedProduct);
  const cdtRes = detectCDT(rawText, record.submotivo_original || record.resumen_original, record.producto_original);

  // Clean text from conjunction "sin embargo" so it never triggers false positive EMBARGOS
  const textWithoutSinEmbargo = lower.replace(/\bsin embargo\b/gi, ' ');
  // Clean "tarjeta de credito" from matching generic loan "credito"
  const textWithoutTarjetaCredito = lower.replace(/tarjeta(s)?\s+(de\s+)?credito/g, ' ');

  // =========================================================================
  // PRIORIDAD 1: FRAUDES
  // Si el cliente manifiesta que NO reconoce una operación, compra, producto o movimiento.
  // Exception: insurance enrollment disputes, condiciones, cuotas de manejo disputes, cobranza disputes,
  // and CDT operational disputes (such as unauthorized automatic renewal) belong to their specific categories.
  // =========================================================================
  const isInsuranceDispute = lower.includes('seguro') || lower.includes('poliza');
  const isCondicionesDispute = condicionesRes.matches;
  const isCuotaManejoDispute = cuotaRes.matches;
  const isCobranzaDispute = cobranzaRes.matches;
  const isCreditoDispute = creditoRes.matches && (
    creditoRes.subcategoria === 'REVERSIÓN' ||
    creditoRes.subcategoria === 'TITULARES' ||
    creditoRes.subcategoria === 'AUMENTO DE CUOTA' ||
    creditoRes.subcategoria === 'ENDOSO' ||
    creditoRes.subcategoria === 'FRECH' ||
    creditoRes.subcategoria === 'REAPLICACIONES' ||
    creditoRes.subcategoria === 'HÁBITO DE PAGO' ||
    creditoRes.subcategoria === 'HISTÓRICO DE PAGO' ||
    creditoRes.subcategoria === 'CAMBIO DE FECHA' ||
    creditoRes.subcategoria === 'PLAN DE PAGOS'
  );
  const isCDTOperationalDispute = cdtRes.matches && (
    cdtRes.subcategoria === 'RENOVACIÓN' ||
    cdtRes.subcategoria === 'RENDIMIENTOS / INTERESES' ||
    cdtRes.subcategoria === 'CANCELACIÓN' ||
    cdtRes.subcategoria === 'PAGO' ||
    cdtRes.subcategoria === 'CERTIFICADO DE SALDO O DECEVAL' ||
    cdtRes.subcategoria === 'CERTIFICADOS TRIBUTARIOS' ||
    cdtRes.subcategoria === 'VISUALIZACIÓN' ||
    (cdtRes.subcategoria === 'APERTURA' && !lower.includes('suplant') && !lower.includes('robaron'))
  );

  const isFraudManifestation =
    !isInsuranceDispute && !isCondicionesDispute && !isCuotaManejoDispute && !isCobranzaDispute && !isCreditoDispute && !isCDTOperationalDispute && (
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
  // REGLA OBLIGATORIA: PAGO A ITAU (FILTRO OBLIGATORIO TIPO ORIGEN = ITAU)
  // Procesa esta regla exclusivamente para expedientes cuya columna TIPO ORIGEN
  // corresponda a ITAU (normalizando mayúsculas, minúsculas y espacios).
  // No utiliza la descripción ni el resumen para saltarse el filtro.
  // No cambia la clasificación de expedientes cuyo TIPO ORIGEN sea diferente de ITAU.
  // =========================================================================
  const tipoOrigenVal = extractTipoOrigen(record);
  const isItau = isTipoOrigenItau(tipoOrigenVal);

  if (isItau && isPaymentUnappliedIssue(rawText)) {
    let sub = 'PAGO NO REFLEJADO';
    let intencion = 'Acreditación y reflejo de pago realizado en Itaú';
    let problema = 'Pago realizado a Itaú no reflejado en el saldo o tarjeta';
    let solicitud = 'Aplicación y reflejo oportuno del pago en la obligación';

    if (
      lower.includes('transferencia') &&
      (lower.includes('no aparece abonada') || lower.includes('no abonada') || lower.includes('no acreditada') || lower.includes('no se ve reflejada') || lower.includes('no aparece'))
    ) {
      sub = 'TRANSFERENCIA NO ABONADA';
      intencion = 'Acreditación de transferencia realizada a Itaú';
      problema = 'Transferencia enviada que no aparece abonada a la cuenta o tarjeta';
      solicitud = 'Abonar la transferencia realizada en la obligación';
    } else if (
      (lower.includes('no encuentro') || lower.includes('no tengo') || lower.includes('solicito')) &&
      (lower.includes('comprobante') || lower.includes('registro') || lower.includes('soporte'))
    ) {
      sub = 'COMPROBANTE NO ENCONTRADO';
      intencion = 'Ubicación y envío de comprobante o registro del pago realizado';
      problema = 'Inconvenientes para ubicar o visualizar comprobante del pago';
      solicitud = 'Envío de soporte y comprobante del pago realizado';
    } else if (
      lower.includes('pago rechazado') ||
      lower.includes('fue rechazado') ||
      lower.includes('demora en su aplicacion') ||
      lower.includes('demora en la aplicacion') ||
      lower.includes('demora del pago') ||
      lower.includes('retraso en el pago') ||
      lower.includes('tardanza en el pago')
    ) {
      sub = 'PAGO PENDIENTE / DEMORA';
      intencion = 'Solución a pago rechazado o demora en aplicación a Itaú';
      problema = 'Pago rechazado o con demora excesiva en su aplicación';
      solicitud = 'Aclaración de motivo de demora o rechazo y aplicación del pago';
    } else if (
      lower.includes('solo aparece uno') ||
      lower.includes('uno de los dos') ||
      lower.includes('pago duplicado') ||
      lower.includes('doble pago')
    ) {
      sub = 'PAGO DUPLICADO / PARCIAL';
      intencion = 'Revisión de pagos múltiples o aplicación parcial a Itaú';
      problema = 'Solo aparece uno de los pagos o cobro doble registrado';
      solicitud = 'Aplicar todos los pagos realizados o corregir duplicidad';
    } else if (
      lower.includes('no se ha aplicado') ||
      lower.includes('no ha sido aplicado') ||
      lower.includes('no aplicado') ||
      lower.includes('no aplicada') ||
      lower.includes('sin aplicar') ||
      lower.includes('pendiente de aplicacion') ||
      lower.includes('pendiente de aplicar') ||
      lower.includes('a la obligacion')
    ) {
      sub = 'APLICACIÓN DE PAGO';
      intencion = 'Aplicación efectiva de pago pendiente a la obligación Itaú';
      problema = 'Pago realizado debitado o pendiente de aplicar a la obligación';
      solicitud = 'Aplicar el valor pagado a la obligación pendiente';
    }

    const paymentInfo = extractItauPaymentDetails(rawText, tipoOrigenVal, 'PAGO A ITAU');

    return {
      expediente,
      categoria_principal: 'PAGO A ITAU',
      subcategoria: sub,
      resumen_requerimiento: generateConciseSummary(rawText, 'PAGO A ITAU', sub, detectedProduct, `Cliente Itaú reporta inconveniente con pago realizado no aplicado o no reflejado.`),
      intencion_cliente: intencion,
      confianza: 98,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct !== 'NO ESPECIFICADO' ? detectedProduct : 'TARJETA DE CRÉDITO',
      problema_principal: problema,
      solicitud_cliente: solicitud,
      evidencia_textual: rawText.slice(0, 100),
      fecha_pago: paymentInfo.fecha_pago,
      valor_pago: paymentInfo.valor_pago,
      pagos_detectados: paymentInfo.pagos
    };
  }

  // =========================================================================
  // PRIORIDAD 3: CDT
  // Únicamente si hace referencia explícita e inequívoca a un Certificado de Depósito a Término.
  // La palabra "cuenta" NUNCA es CDT.
  // =========================================================================
  if (cdtRes.matches) {
    if (cdtRes.requiere_revision) {
      return {
        expediente,
        categoria_principal: 'REVISIÓN HUMANA',
        subcategoria: 'INFORMACIÓN INSUFICIENTE',
        resumen_requerimiento: generateConciseSummary(rawText, 'REVISIÓN HUMANA', 'INFORMACIÓN INSUFICIENTE', 'CDT', `Requerimiento sobre CDT requiere revisión humana por información insuficiente.`),
        intencion_cliente: cdtRes.intencion,
        confianza: 65,
        requiere_revision_humana: true,
        motivo_de_revision: cdtRes.motivo_revision || 'El expediente menciona CDT pero no proporciona información suficiente para determinar el motivo específico de la reclamación.',
        producto_detectado: 'CDT',
        problema_principal: cdtRes.problema,
        solicitud_cliente: cdtRes.solicitud,
        evidencia_textual: cdtRes.evidencia
      };
    }

    return {
      expediente,
      categoria_principal: 'CDT',
      subcategoria: cdtRes.subcategoria,
      resumen_requerimiento: generateConciseSummary(rawText, 'CDT', cdtRes.subcategoria, 'CDT', cdtRes.resumen),
      intencion_cliente: cdtRes.intencion,
      confianza: 98,
      requiere_revision_humana: false,
      producto_detectado: 'CDT',
      problema_principal: cdtRes.problema,
      solicitud_cliente: cdtRes.solicitud,
      evidencia_textual: cdtRes.evidencia
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
  // PRIORIDAD 6: CONDICIONES / CUOTAS DE CRÉDITO / CUOTAS DE MANEJO / COBRANZA
  // Detección profunda y contextual con desambiguación y soporte concurrente
  // =========================================================================

  // 6.0 Concurrencia entre Cuotas de Crédito / Cartera y Cuotas de Manejo (ej. Caso 8)
  if (creditoRes.matches && cuotaRes.matches) {
    const creditoKeywords = ['credito', 'prestamo', 'vivienda', 'leasing', 'libranza', 'plan de pagos', 'amortizacion', 'cuota del credito', 'cuota de credito', 'aumento la cuota', 'aumento de cuota', 'cuota'];
    const cuotaKeywords = ['cuota de manejo', 'cuotas de manejo', 'cuota manejo', 'administracion de la tarjeta', 'administracion de mi tarjeta'];

    let firstCreditoPos = 999999;
    for (const kw of creditoKeywords) {
      const idx = fullLower.indexOf(kw);
      if (idx !== -1 && idx < firstCreditoPos) firstCreditoPos = idx;
    }
    let firstCuotaPos = 999999;
    for (const kw of cuotaKeywords) {
      const idx = fullLower.indexOf(kw);
      if (idx !== -1 && idx < firstCuotaPos) firstCuotaPos = idx;
    }

    if (firstCreditoPos <= firstCuotaPos) {
      return {
        expediente,
        categoria_principal: 'CRÉDITOS / CARTERA',
        subcategoria: creditoRes.subcategoria,
        resumen_requerimiento: `${creditoRes.resumen} Adicionalmente reclama por cuota de manejo.`,
        intencion_cliente: `${creditoRes.intencion}. Incluye reclamo concurrente sobre cuota de manejo.`,
        confianza: 98,
        requiere_revision_humana: false,
        producto_detectado: creditoRes.producto_detectado || 'CRÉDITO / CARTERA',
        problema_principal: `${creditoRes.problema} y cobro de cuota de manejo`,
        solicitud_cliente: `${creditoRes.solicitud} y revisión de cuota de manejo facturada`,
        evidencia_textual: creditoRes.evidencia || rawText.slice(0, 100)
      };
    } else {
      return {
        expediente,
        categoria_principal: 'CUOTAS DE MANEJO',
        subcategoria: cuotaRes.subcategoria,
        resumen_requerimiento: `${cuotaRes.resumen} Adicionalmente reclama por cuota de crédito.`,
        intencion_cliente: `${cuotaRes.intencion}. Incluye reclamo concurrente sobre cuota de crédito.`,
        confianza: 98,
        requiere_revision_humana: false,
        producto_detectado: detectedProduct !== 'NO ESPECIFICADO' ? detectedProduct : 'TARJETA DE CRÉDITO',
        problema_principal: `${cuotaRes.problema} y cuota de crédito`,
        solicitud_cliente: `${cuotaRes.solicitud} y revisión de cuota de crédito`,
        evidencia_textual: rawText.slice(0, 100)
      };
    }
  }

  // 6.1 CRÉDITOS / CARTERA (Plan de pagos, FRECH, Aumento de cuota, Endoso, Reversión, Reaplicaciones, Hábito de pago, Histórico de pago, Titulares, Cambio de fecha)
  if (creditoRes.matches) {
    return {
      expediente,
      categoria_principal: 'CRÉDITOS / CARTERA',
      subcategoria: creditoRes.subcategoria,
      resumen_requerimiento: creditoRes.resumen,
      intencion_cliente: creditoRes.intencion,
      confianza: 98,
      requiere_revision_humana: false,
      producto_detectado: creditoRes.producto_detectado || (detectedProduct !== 'NO ESPECIFICADO' ? detectedProduct : 'CRÉDITO / CARTERA'),
      problema_principal: creditoRes.problema,
      solicitud_cliente: creditoRes.solicitud,
      evidencia_textual: creditoRes.evidencia || rawText.slice(0, 100)
    };
  }

  // 6.2 Concurrencia entre Condiciones y Cuotas de Manejo
  if (condicionesRes.matches && cuotaRes.matches) {
    const condicionKeywords = ['tasa', 'condicion', 'plazo', 'pactad', 'migrac'];
    const cuotaKeywords = ['cuota de manejo', 'cuotas de manejo', 'cuota manejo', 'administracion de la tarjeta'];

    let firstCondicionPos = 999999;
    for (const kw of condicionKeywords) {
      const idx = fullLower.indexOf(kw);
      if (idx !== -1 && idx < firstCondicionPos) firstCondicionPos = idx;
    }
    let firstCuotaPos = 999999;
    for (const kw of cuotaKeywords) {
      const idx = fullLower.indexOf(kw);
      if (idx !== -1 && idx < firstCuotaPos) firstCuotaPos = idx;
    }

    if (firstCondicionPos <= firstCuotaPos) {
      return {
        expediente,
        categoria_principal: 'CONDICIONES',
        subcategoria: condicionesRes.subcategoria,
        resumen_requerimiento: `${condicionesRes.resumen} Adicionalmente reclama por cuota de manejo.`,
        intencion_cliente: `${condicionesRes.intencion}. Incluye reclamo concurrente sobre cuota de manejo.`,
        confianza: 98,
        requiere_revision_humana: false,
        producto_detectado: condicionesRes.producto_detectado,
        problema_principal: `${condicionesRes.problema} y cobro de cuota de manejo`,
        solicitud_cliente: `${condicionesRes.solicitud} y revisión de cuota de manejo facturada`,
        evidencia_textual: condicionesRes.evidencia
      };
    } else {
      return {
        expediente,
        categoria_principal: 'CUOTAS DE MANEJO',
        subcategoria: cuotaRes.subcategoria,
        resumen_requerimiento: `${cuotaRes.resumen} Adicionalmente reclama por condiciones del crédito.`,
        intencion_cliente: `${cuotaRes.intencion}. Incluye reclamo concurrente sobre condiciones del crédito.`,
        confianza: 98,
        requiere_revision_humana: false,
        producto_detectado: detectedProduct !== 'NO ESPECIFICADO' ? detectedProduct : 'TARJETA DE CRÉDITO',
        problema_principal: `${cuotaRes.problema} y condiciones de crédito`,
        solicitud_cliente: `${cuotaRes.solicitud} y revisión de condiciones`,
        evidencia_textual: rawText.slice(0, 100)
      };
    }
  }

  // 6.3 CONDICIONES (CARTERA / CRÉDITOS)
  if (condicionesRes.matches) {
    return {
      expediente,
      categoria_principal: 'CONDICIONES',
      subcategoria: condicionesRes.subcategoria,
      resumen_requerimiento: condicionesRes.resumen,
      intencion_cliente: condicionesRes.intencion,
      confianza: 98,
      requiere_revision_humana: false,
      producto_detectado: condicionesRes.producto_detectado,
      problema_principal: condicionesRes.problema,
      solicitud_cliente: condicionesRes.solicitud,
      evidencia_textual: condicionesRes.evidencia
    };
  }

  // 6.3 Concurrencia entre Cuotas de Manejo y Gastos de Cobranza
  if (cuotaRes.matches && cobranzaRes.matches) {
    const cuotaKeywords = ['cuota de manejo', 'cuotas de manejo', 'cuota manejo', 'administracion de la tarjeta', 'cargo mensual', 'tarifa de manejo'];
    const cobranzaKeywords = ['honorarios', 'cobranza', 'gastos de cobro', 'gasto de cobro', 'prejuridic', 'casa de cobro'];

    let firstCuotaPos = 999999;
    for (const kw of cuotaKeywords) {
      const idx = fullLower.indexOf(kw);
      if (idx !== -1 && idx < firstCuotaPos) firstCuotaPos = idx;
    }
    let firstCobranzaPos = 999999;
    for (const kw of cobranzaKeywords) {
      const idx = fullLower.indexOf(kw);
      if (idx !== -1 && idx < firstCobranzaPos) firstCobranzaPos = idx;
    }

    if (firstCuotaPos <= firstCobranzaPos) {
      return {
        expediente,
        categoria_principal: 'CUOTAS DE MANEJO',
        subcategoria: cuotaRes.subcategoria,
        resumen_requerimiento: `${cuotaRes.resumen} Adicionalmente reclama por gastos de cobranza u honorarios.`,
        intencion_cliente: `${cuotaRes.intencion}. Incluye reclamo concurrente sobre honorarios o gastos de cobranza.`,
        confianza: 98,
        requiere_revision_humana: false,
        producto_detectado: detectedProduct,
        problema_principal: `${cuotaRes.problema} y gastos de cobranza`,
        solicitud_cliente: `${cuotaRes.solicitud} y revisión de gastos de cobranza facturados`,
        evidencia_textual: rawText.slice(0, 100)
      };
    } else {
      return {
        expediente,
        categoria_principal: 'HONORARIOS Y GASTOS DE COBRANZA',
        subcategoria: cobranzaRes.subcategoria,
        resumen_requerimiento: `${cobranzaRes.resumen} Adicionalmente reclama por cuota de manejo.`,
        intencion_cliente: `${cobranzaRes.intencion}. Incluye reclamo concurrente sobre cuota de manejo.`,
        confianza: 98,
        requiere_revision_humana: false,
        producto_detectado: detectedProduct,
        problema_principal: `${cobranzaRes.problema} y cobro de cuota de manejo`,
        solicitud_cliente: `${cobranzaRes.solicitud} y revisión de cuota de manejo`,
        evidencia_textual: rawText.slice(0, 100)
      };
    }
  }

  // 6.4 Cuotas de Manejo genuinas
  if (cuotaRes.matches) {
    return {
      expediente,
      categoria_principal: 'CUOTAS DE MANEJO',
      subcategoria: cuotaRes.subcategoria,
      resumen_requerimiento: cuotaRes.resumen,
      intencion_cliente: cuotaRes.intencion,
      confianza: 98,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: cuotaRes.problema,
      solicitud_cliente: cuotaRes.solicitud,
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // 6.5 Honorarios y Gastos de Cobranza
  if (cobranzaRes.matches) {
    return {
      expediente,
      categoria_principal: 'HONORARIOS Y GASTOS DE COBRANZA',
      subcategoria: cobranzaRes.subcategoria,
      resumen_requerimiento: cobranzaRes.resumen,
      intencion_cliente: cobranzaRes.intencion,
      confianza: 98,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: cobranzaRes.problema,
      solicitud_cliente: cobranzaRes.solicitud,
      evidencia_textual: rawText.slice(0, 100)
    };
  }

  // 6.6 Caso ambiguo de cuota sin contexto (ej. "Mi cuota mensual aumentó y no entiendo por qué")
  const isAmbiguousQuotaIssue =
    (fullLower.includes('cuota') || fullLower.includes('cuotas')) &&
    (fullLower.includes('aumento') || fullLower.includes('aumentaron') || fullLower.includes('incremento') || fullLower.includes('subio') || fullLower.includes('cambio en el valor') || fullLower.includes('valor de la cuota') || fullLower.includes('cuota mensual')) &&
    !cuotaRes.matches &&
    !creditoRes.matches &&
    detectedProduct === 'NO ESPECIFICADO';

  if (isAmbiguousQuotaIssue) {
    return {
      expediente,
      categoria_principal: 'REVISIÓN HUMANA',
      subcategoria: 'INFORMACIÓN INSUFICIENTE',
      resumen_requerimiento: 'Aumento de cuota mensual sin producto ni concepto especificado.',
      intencion_cliente: 'Aclaración de aumento de cuota (requiere información complementaria)',
      confianza: 40,
      requiere_revision_humana: true,
      motivo_de_revision: 'El expediente menciona un aumento de cuota mensual pero no especifica si corresponde a una cuota de crédito, amortización, compra diferida o cargo de manejo, ni indica el producto asociado.',
      producto_detectado: 'NO ESPECIFICADO',
      problema_principal: 'Aumento de cuota mensual sin producto ni concepto especificado',
      solicitud_cliente: 'Aclaración del motivo de aumento de la cuota',
      evidencia_textual: rawText
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

  // 8.13 INFORMACIÓN Y DOCUMENTOS: Paz y salvo, certificaciones, copias de contrato y consultas informativas
  if (
    lower.includes('paz y salvo') ||
    lower.includes('certificacion') ||
    lower.includes('certificado') ||
    lower.includes('copia de contrato') ||
    lower.includes('copia de mi contrato') ||
    lower.includes('copia del contrato') ||
    lower.includes('copia pagare') ||
    lower.includes('copia de pagare') ||
    lower.includes('derecho de peticion') ||
    lower.includes('solicito informacion sobre mi credito') ||
    lower.includes('solicito informacion de mi credito') ||
    lower.includes('informacion sobre como funciona')
  ) {
    const isDocOrContract = lower.includes('contrato') || lower.includes('extracto') || lower.includes('pagare');
    const sub = isDocOrContract ? 'EXTRACTOS Y DOCUMENTOS' : 'CERTIFICADOS Y PAZ Y SALVO';
    const intencion = isDocOrContract ? 'Solicitud de copia de contrato o documento contractual' : 'Solicitud de emisión o envío de documentos bancarios o certificaciones';
    return {
      expediente,
      categoria_principal: 'INFORMACIÓN Y DOCUMENTOS',
      subcategoria: sub,
      resumen_requerimiento: generateConciseSummary(rawText, 'INFORMACIÓN Y DOCUMENTOS', sub, detectedProduct, `Cliente solicita expedición de ${sub.toLowerCase()} o información documental.`),
      intencion_cliente: intencion,
      confianza: 96,
      requiere_revision_humana: false,
      producto_detectado: detectedProduct,
      problema_principal: isDocOrContract ? 'Solicitud de copia de contrato o documento' : 'Expedición de certificado bancario o paz y salvo',
      solicitud_cliente: isDocOrContract ? 'Envío de copia del contrato o soporte documental' : 'Envío del certificado o documento solicitado',
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
  if (lower.includes('transfer') || lower.includes('ach') || lower.includes('bre-b') || lower.includes('giro')) {
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
  if (lower.includes('pago') || lower.includes('pague') || lower.includes('pagad') || lower.includes('abono') || lower.includes('abone') || lower.includes('consignacion') || lower.includes('recaudo')) {
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
  const submotivoLower = String(record.submotivo_original || record.resumen_original || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const prodLower = String(record.producto_original || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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
      /\bcdts\b/i.test(lower) ||
      /\bc\.d\.t\b/i.test(lower) ||
      lower.includes('certificado de deposito a termino') ||
      lower.includes('certificados de deposito a termino') ||
      lower.includes('certificado de deposito') ||
      lower.includes('certificados de deposito') ||
      lower.includes('certificado a termino') ||
      lower.includes('certificados a termino') ||
      lower.includes('deposito a termino') ||
      lower.includes('depositos a termino') ||
      lower.includes('inversion cdt') ||
      lower.includes('inversion en cdt') ||
      lower.includes('inversiones cdt') ||
      lower.includes('rendimientos de cdt') ||
      lower.includes('rendimiento de cdt') ||
      lower.includes('cdt vencido') ||
      lower.includes('cdt cancelado') ||
      lower.includes('cdt renovado') ||
      lower.includes('cdt fisico') ||
      lower.includes('titulo cdt') ||
      lower.includes('titulos cdt') ||
      lower.includes('macrotitulo') ||
      lower.includes('deceval') ||
      /\bcdt\b/i.test(submotivoLower) ||
      submotivoLower.includes('certificado de deposito') ||
      submotivoLower.includes('certificado a termino') ||
      submotivoLower.includes('deposito a termino') ||
      /\bcdt\b/i.test(prodLower) ||
      prodLower.includes('deposito a termino');

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

  // 3. Contradiction: Fraud manifestation not categorized as FRAUDES (excluding insurance, cuota de manejo, cobranza, credito, and CDT disputes)
  const isInsurance = lower.includes('seguro') || lower.includes('poliza');
  const isCuotaOrCobranza = result.categoria_principal === 'CUOTAS DE MANEJO' || result.categoria_principal === 'HONORARIOS Y GASTOS DE COBRANZA' || result.categoria_principal === 'CUOTA DE MANEJO';
  const isCDTOperational = result.categoria_principal === 'CDT';
  const isCreditoDispute = result.categoria_principal === 'CRÉDITOS / CARTERA' || result.categoria_principal === 'CARTERA / CRÉDITOS' || result.categoria_principal === 'CONDICIONES';
  const hasFraudMention =
    !isInsurance && !isCuotaOrCobranza && !isCDTOperational && !isCreditoDispute && (
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

  // 4. Contradiction: PAGO A ITAU assigned without TIPO ORIGEN = ITAU
  const tipoOrigenVal = extractTipoOrigen(record);
  const isItau = isTipoOrigenItau(tipoOrigenVal);

  if (result.categoria_principal === 'PAGO A ITAU' && !isItau) {
    return {
      ...result,
      categoria_principal: 'PAGOS / ABONOS',
      subcategoria: 'APLICACIÓN DE PAGO',
      existe_inconsistencia: 'SI',
      motivo_inconsistencia: 'La categoría PAGO A ITAU está reservada exclusivamente para expedientes cuya columna TIPO ORIGEN corresponda a ITAU.'
    };
  }

  // 5. Contradiction: Expediente with TIPO ORIGEN = ITAU and payment unapplied issue not assigned PAGO A ITAU
  if (isItau && isPaymentUnappliedIssue(rawText) && result.categoria_principal !== 'PAGO A ITAU' && result.categoria_principal !== 'FRAUDES' && result.categoria_principal !== 'PSE') {
    const fixedItau = classifyPQRDeterministic(record);
    return {
      ...fixedItau,
      existe_inconsistencia: 'SI',
      motivo_inconsistencia: 'Se corrigió categoría: expediente con TIPO ORIGEN = ITAU y reporte de pago no aplicado/reflejado asignado a PAGO A ITAU.'
    };
  }

  // 6. Contradiction: CUOTAS DE MANEJO assigned to loan/credit installments or ambiguous quotas without management fee evidence
  if (result.categoria_principal === 'CUOTAS DE MANEJO' || result.categoria_principal === 'CUOTA DE MANEJO') {
    const hasExplicitManejoOrAdmin =
      lower.includes('manejo') ||
      lower.includes('manjo') ||
      lower.includes('administracion de mi tarjeta') ||
      lower.includes('administracion de la tarjeta') ||
      lower.includes('mantenimiento de mi tarjeta') ||
      lower.includes('mantenimiento de la tarjeta') ||
      lower.includes('cuota de adm') ||
      lower.includes('cobro por administracion') ||
      lower.includes('cargo de administracion');

    if (!hasExplicitManejoOrAdmin) {
      // Check if it's a credit or loan installment
      const isLoanOrCredit =
        lower.includes('credito') ||
        lower.includes('prestamo') ||
        lower.includes('leasing') ||
        lower.includes('vivienda') ||
        lower.includes('libranza') ||
        lower.includes('plan de pago') ||
        lower.includes('amortizac') ||
        lower.includes('plan de amortizacion') ||
        lower.includes('extracto del credito');

      if (isLoanOrCredit) {
        return {
          ...result,
          categoria_principal: 'CRÉDITOS / CARTERA',
          subcategoria: 'VALOR DE LA CUOTA Y PLAN DE PAGOS',
          producto_detectado: 'CRÉDITOS / CARTERA',
          existe_inconsistencia: 'SI',
          motivo_inconsistencia: 'Se corrigió falso positivo: las cuotas de crédito, leasing o vivienda pertenecen a CRÉDITOS / CARTERA y no a CUOTAS DE MANEJO.'
        };
      }

      // Check if it's an ambiguous quota without context (e.g., "Mi cuota mensual aumentó y no entiendo por qué")
      const mentionsQuotaOnly = lower.includes('cuota') || lower.includes('cuotas');
      if (mentionsQuotaOnly) {
        return {
          ...result,
          categoria_principal: 'REVISIÓN HUMANA',
          subcategoria: 'INFORMACIÓN INSUFICIENTE',
          confianza: 40,
          requiere_revision_humana: true,
          existe_inconsistencia: 'SI',
          motivo_inconsistencia: 'Mención de cuota ambigua sin producto ni evidencia contextual de cuota de manejo o crédito; requiere validación manual.',
          problema_principal: 'Consulta o reclamo sobre cuota no especificada',
          solicitud_cliente: 'Aclarar a qué producto u obligación corresponde la cuota'
        };
      }
    }
  }

  // 7. Contradiction: CONDICIONES assigned to pure contract copy or info request without discontent, or pure late interest
  if (result.categoria_principal === 'CONDICIONES') {
    const isContractCopyOnly =
      (lower.includes('copia de mi contrato') || lower.includes('copia del contrato') || lower.includes('copia de contrato')) &&
      !lower.includes('no acepto') && !lower.includes('no estoy de acuerdo') && !lower.includes('inconform') && !lower.includes('reclamo') && !lower.includes('cambiaron') && !lower.includes('modificaron');

    if (isContractCopyOnly) {
      return {
        ...result,
        categoria_principal: 'INFORMACIÓN Y DOCUMENTOS',
        subcategoria: 'EXTRACTOS Y DOCUMENTOS',
        existe_inconsistencia: 'SI',
        motivo_inconsistencia: 'Solicitud de copia de contrato sin manifestación de inconformidad no constituye reclamo de condiciones.'
      };
    }

    const isInfoOnly =
      (lower.includes('solicito informacion sobre mi credito') || lower.includes('solicito informacion de mi credito')) &&
      !lower.includes('no acepto') && !lower.includes('no estoy de acuerdo') && !lower.includes('inconform') && !lower.includes('reclamo');

    if (isInfoOnly) {
      return {
        ...result,
        categoria_principal: 'INFORMACIÓN Y DOCUMENTOS',
        subcategoria: 'CERTIFICADOS Y PAZ Y SALVO',
        existe_inconsistencia: 'SI',
        motivo_inconsistencia: 'Consulta informativa sobre crédito sin inconformidad corresponde a información y documentos.'
      };
    }

    const isLateInterestOnly =
      (lower.includes('intereses de mora') || lower.includes('interes de mora') || lower.includes('intereses moratorios')) &&
      !lower.includes('tasa') && !lower.includes('condicion') && !lower.includes('pactad') && !lower.includes('ofrecid');

    if (isLateInterestOnly) {
      return {
        ...result,
        categoria_principal: 'COMISIONES Y COBROS',
        subcategoria: 'INTERESES',
        existe_inconsistencia: 'SI',
        motivo_inconsistencia: 'Reclamación exclusiva sobre cobro de intereses moratorios corresponde a comisiones y cobros.'
      };
    }
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
    categoria_ia: catPrincipal,
    subcategoria_ia: subcat,
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
    evidencia_clasificacion: validated.evidencia_textual || record.descripcion_original.slice(0, 100),
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
    estado_revision: 'PENDIENTE',
    fecha_pago: validated.fecha_pago || '',
    valor_pago: validated.valor_pago || '',
    pagos_detectados: validated.pagos_detectados || []
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
