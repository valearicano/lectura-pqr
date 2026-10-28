/**
 * Payment Extractor for Itaú PQRS
 * Extracts FECHA DEL PAGO and VALOR DEL PAGO specifically from detailed descriptions
 * for records with TIPO ORIGEN = ITAU and categorized as PAGO A ITAU.
 */

export interface ExtractedPayment {
  fecha: string;
  valor: string;
  descripcion?: string;
  confianza: 'ALTA' | 'MEDIA' | 'BAJA';
}

export interface PaymentExtractionResult {
  fecha_pago: string;
  valor_pago: string;
  pagos: ExtractedPayment[];
  tiene_multiples_pagos: boolean;
}

const MONTHS_MAP: Record<string, string> = {
  enero: 'enero',
  febrero: 'febrero',
  marzo: 'marzo',
  abril: 'abril',
  mayo: 'mayo',
  junio: 'junio',
  julio: 'julio',
  agosto: 'agosto',
  septiembre: 'septiembre',
  setiembre: 'septiembre',
  octubre: 'octubre',
  noviembre: 'noviembre',
  diciembre: 'diciembre'
};

const MONTH_NAMES_REGEX = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre';

/**
 * Standardizes a currency value string into a clean, human-readable format like $450.000.
 */
export function formatCurrencyValue(raw: string): string {
  if (!raw) return '';
  let clean = raw.trim();
  
  // Remove trailing "pesos", "cop", "m/cte" etc.
  clean = clean.replace(/\s*(pesos|cop|m\/cte|mcte|moneda corriente)\b/gi, '').trim();
  
  // If e.g. "450 mil", convert to "450.000"
  const milMatch = clean.match(/^(\d+)\s*mil$/i);
  if (milMatch) {
    clean = `${milMatch[1]}.000`;
  }

  // Remove space after $
  clean = clean.replace(/^\$\s*/, '$');

  // Ensure starts with $
  if (!clean.startsWith('$') && !clean.toUpperCase().startsWith('USD')) {
    clean = `$${clean}`;
  }
  return clean;
}

/**
 * Normalizes text for accent-insensitive analysis while preserving original formatting.
 */
function cleanForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Checks if the text preceding or surrounding a date candidate indicates
 * a complaint filing, bank response, or observation context rather than a payment.
 */
function isComplaintOrObservationContext(prefix: string): boolean {
  const p = prefix.toLowerCase();
  return (
    p.includes('radicacion') ||
    p.includes('radicado') ||
    p.includes('compromiso') ||
    p.includes('respuesta') ||
    p.includes('oficio') ||
    p.includes('todavia no aparece') ||
    p.includes('aun no aparece') ||
    p.includes('no aparece') ||
    p.includes('no se refleja') ||
    p.includes('no se ve') ||
    p.includes('no ha llegado') ||
    p.includes('no abonado') ||
    p.includes('no aplicado') ||
    p.includes('sigo esperando') ||
    p.includes('estamos a') ||
    p.includes('al dia de hoy') ||
    p.includes('fecha de hoy') ||
    p.includes('hoy es') ||
    p.includes('corte de') ||
    p.includes('extracto de')
  );
}

/**
 * Extracts all payment amounts explicitly mentioned in the context of payments/debits/transfers.
 */
export function extractPaymentAmounts(text: string): { valor: string; index: number; raw: string }[] {
  if (!text) return [];
  const results: { valor: string; index: number; raw: string }[] = [];

  // Standalone currency pattern with $ (e.g. $450.000, $ 450.000, $1'250.000)
  const standaloneCurrency = /\$\s*(\d{1,3}(?:[.,']\d{3})*(?:[.,]\d{2})?|\d+)/g;
  let match: RegExpExecArray | null;

  while ((match = standaloneCurrency.exec(text)) !== null) {
    const rawVal = match[0].trim();
    const numPart = match[1].replace(/[^0-9]/g, '');
    
    // Ignore small numbers like $4 or $2 (likely a count or typo, unless context specifies)
    // Ignore card last-4 digits or account numbers immediately preceding:
    const prefixImmediate = text.substring(Math.max(0, match.index - 20), match.index).toLowerCase();
    if (
      prefixImmediate.includes('terminada en') ||
      prefixImmediate.includes('terminado en') ||
      prefixImmediate.includes('cuenta no') ||
      prefixImmediate.includes('tarjeta no') ||
      prefixImmediate.includes('radicado no') ||
      prefixImmediate.includes('expediente no') ||
      prefixImmediate.includes('cuotas de')
    ) {
      continue;
    }

    if (numPart.length >= 3 || rawVal.includes('.') || rawVal.includes(',')) {
      results.push({
        valor: formatCurrencyValue(rawVal),
        index: match.index,
        raw: rawVal
      });
    }
  }

  // Also match amounts with pesos / mil: e.g. "450 mil pesos", "500.000 pesos", "por valor de 450.000" without $
  const wordsPattern = /(\b(?:por valor de|por monto de|por|abono de|pago de|debitaron|descontaron|suma de)\s+(\d{1,3}(?:[.,']\d{3})+|\d+\s+mil|\d{4,9})\s*(?:pesos|cop)?)/gi;
  while ((match = wordsPattern.exec(text)) !== null) {
    const captured = match[2].trim();
    const exists = results.some(r => Math.abs(r.index - match!.index) < 15);
    if (!exists) {
      results.push({
        valor: formatCurrencyValue(captured),
        index: match.index,
        raw: match[0]
      });
    }
  }

  // Standalone "X mil pesos" or "X.000 pesos" without leading prefix
  const pesosPattern = /\b(\d{1,3}(?:[.,']\d{3})+|\d{1,4}\s+mil)\s+pesos\b/gi;
  while ((match = pesosPattern.exec(text)) !== null) {
    const captured = match[1].trim();
    const exists = results.some(r => Math.abs(r.index - match!.index) < 15);
    if (!exists) {
      results.push({
        valor: formatCurrencyValue(captured),
        index: match.index,
        raw: match[0]
      });
    }
  }

  return results;
}

/**
 * Extracts payment dates explicitly tied to when the payment or debit occurred,
 * while discarding complaint filing dates, commitment dates, or observation months in "pagué en septiembre y todavía no aparece en octubre".
 */
export function extractPaymentDates(text: string): { fecha: string; index: number; raw: string }[] {
  if (!text) return [];
  const results: { fecha: string; index: number; raw: string }[] = [];
  const clean = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Numeric date patterns: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY-MM-DD, DD/MM/YY
  const numericDateRegex = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/g;
  let match: RegExpExecArray | null;

  while ((match = numericDateRegex.exec(text)) !== null) {
    const rawDate = match[0];
    const prefix = text.substring(Math.max(0, match.index - 35), match.index).toLowerCase();

    if (!isComplaintOrObservationContext(prefix)) {
      results.push({
        fecha: rawDate,
        index: match.index,
        raw: rawDate
      });
    }
  }

  // 2. Full textual date with day and month: e.g. "15 de septiembre de 2026", "el 5 de octubre", "el día 28 de agosto"
  const textualDateRegex = new RegExp(`\\b(?:el\\s+(?:dia\\s+)?)?(\\d{1,2}|primero|1ro|1°)\\s+de\\s+(${MONTH_NAMES_REGEX})(?:\\s+de(?:l)?\\s+(\\d{4}))?\\b`, 'gi');
  while ((match = textualDateRegex.exec(clean)) !== null) {
    const rawDay = match[1];
    const rawMonth = match[2].toLowerCase();
    const rawYear = match[3] || '';
    const dayStr = rawDay === 'primero' || rawDay === '1ro' || rawDay === '1°' ? '1' : rawDay;
    const formatted = rawYear ? `${dayStr} de ${rawMonth} de ${rawYear}` : `${dayStr} de ${rawMonth}`;

    const prefix = text.substring(Math.max(0, match.index - 35), match.index).toLowerCase();

    if (!isComplaintOrObservationContext(prefix)) {
      results.push({
        fecha: formatted,
        index: match.index,
        raw: match[0]
      });
    }
  }

  // 3. Month names attached to payment action: e.g.
  // "pagué en septiembre", "pagos de septiembre y octubre", "pago de septiembre", "abono de agosto"
  // "el mes de septiembre", "en el mes de octubre"
  // In "pagué en septiembre y todavía no aparece en octubre",
  // "septiembre" is the payment date, while "octubre" is the observation/claim month!
  const monthAttachedRegex = new RegExp(`(?:pague(?:\\s+mi\\s+tarjeta[\\w\\s]*)?\\s+en|pago(?:s)?\\s+de(?:l)?|pago(?:s)?\\s+en|abono(?:s)?\\s+en|abono(?:s)?\\s+de|mes\\s+de|en)\\s+(${MONTH_NAMES_REGEX})(?:\\s+(?:y|e)\\s+(${MONTH_NAMES_REGEX}))?`, 'gi');
  while ((match = monthAttachedRegex.exec(clean)) !== null) {
    const month1 = match[1]?.toLowerCase();
    const month2 = match[2]?.toLowerCase();
    const prefix = text.substring(Math.max(0, match.index - 35), match.index).toLowerCase();

    // If preceded by observation / complaint phrases ("no aparece en", "no se refleja en", etc.), skip!
    if (isComplaintOrObservationContext(prefix)) {
      continue;
    }

    // Check if month2 is just the complaint month (e.g. "todavía no aparece en octubre")
    const following = text.substring(match.index, Math.min(text.length, match.index + 80)).toLowerCase();
    const isContrastMonth = following.includes('todavia no aparece en') || following.includes('aun no aparece en') || following.includes('y en');

    // Avoid duplicating if we already matched a day+month on this index
    const exists = results.some(r => Math.abs(r.index - match!.index) < 15);
    if (!exists && month1) {
      if (month2 && !isContrastMonth) {
        // "pagos de septiembre y octubre" -> two distinct payment months
        results.push({
          fecha: month1,
          index: match.index,
          raw: month1
        });
        results.push({
          fecha: month2,
          index: match.index + month1.length + 3,
          raw: month2
        });
      } else {
        results.push({
          fecha: month1,
          index: match.index,
          raw: match[0]
        });
      }
    }
  }

  // 4. Relative dates explicitly tied to payment: "el día de ayer", "ayer"
  const relativeRegex = /\b(?:el\s+dia\s+de\s+)?(ayer|el\s+dia\s+de\s+ayer|anteayer)\b/gi;
  while ((match = relativeRegex.exec(clean)) !== null) {
    const prefix = clean.substring(Math.max(0, match.index - 25), match.index).toLowerCase();
    const following = clean.substring(match.index, Math.min(clean.length, match.index + 50)).toLowerCase();
    const isPaymentRelative =
      prefix.includes('pague') ||
      prefix.includes('pago') ||
      prefix.includes('abono') ||
      prefix.includes('abone') ||
      prefix.includes('realice') ||
      prefix.includes('hice') ||
      prefix.includes('transferi') ||
      following.includes('pague') ||
      following.includes('pago') ||
      following.includes('abono') ||
      following.includes('abone') ||
      following.includes('realice') ||
      following.includes('hice') ||
      following.includes('transferi') ||
      following.includes('cancele');

    if (isPaymentRelative) {
      results.push({
        fecha: 'ayer',
        index: match.index,
        raw: match[0]
      });
    }
  }

  return results;
}

/**
 * Extracts and pairs payment date and amount for ITAU payment complaints.
 * Supports single and multiple payments per case, preserving the ticket relationship.
 */
export function extractItauPaymentDetails(
  descripcion: string,
  tipoOrigen?: string,
  categoria?: string
): PaymentExtractionResult {
  // 1. Strict filtering: ONLY for ITAU origin and PAGO A ITAU category (or when explicitly requested)
  const isItau = tipoOrigen && String(tipoOrigen).trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() === 'ITAU';
  const isPagoItau = categoria && String(categoria).trim().toUpperCase().includes('PAGO A ITAU');

  if (tipoOrigen !== undefined && (!isItau || !isPagoItau)) {
    return {
      fecha_pago: '',
      valor_pago: '',
      pagos: [],
      tiene_multiples_pagos: false
    };
  }

  if (!descripcion || descripcion.trim().length === 0) {
    return {
      fecha_pago: '',
      valor_pago: '',
      pagos: [],
      tiene_multiples_pagos: false
    };
  }

  const rawText = descripcion.trim();
  const lower = rawText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const extractedDates = extractPaymentDates(rawText);
  const extractedAmounts = extractPaymentAmounts(rawText);

  // Check if multiple distinct payments are described:
  // e.g. "dos pagos", "uno de los dos pagos", "un pago de $X el Y y otro de $Z el W", "pagos de septiembre y octubre"
  const mentionsMultiple =
    lower.includes('dos pagos') ||
    lower.includes('2 pagos') ||
    lower.includes('ambos pagos') ||
    lower.includes('pagos de septiembre y octubre') ||
    lower.includes('solo aparece uno de los dos') ||
    lower.includes('uno de los dos pagos') ||
    (extractedAmounts.length > 1 && extractedDates.length > 1);

  const pagos: ExtractedPayment[] = [];

  if (mentionsMultiple && (extractedAmounts.length > 1 || extractedDates.length > 1)) {
    // Pair each date with corresponding amount in chronological/textual order
    const maxCount = Math.max(extractedDates.length, extractedAmounts.length);
    for (let i = 0; i < maxCount; i++) {
      const f = extractedDates[i]?.fecha || '';
      const v = extractedAmounts[i]?.valor || '';
      if (f || v) {
        pagos.push({
          fecha: f,
          valor: v,
          descripcion: `Pago ${i + 1}`,
          confianza: 'ALTA'
        });
      }
    }
  } else if (extractedDates.length > 0 || extractedAmounts.length > 0) {
    // Single payment case
    const primaryFecha = extractedDates[0]?.fecha || '';
    const primaryValor = extractedAmounts[0]?.valor || '';
    pagos.push({
      fecha: primaryFecha,
      valor: primaryValor,
      descripcion: 'Pago reportado',
      confianza: 'ALTA'
    });
  }

  const primaryFecha = pagos[0]?.fecha || (extractedDates[0]?.fecha || '');
  const primaryValor = pagos[0]?.valor || (extractedAmounts[0]?.valor || '');

  return {
    fecha_pago: primaryFecha,
    valor_pago: primaryValor,
    pagos,
    tiene_multiples_pagos: pagos.length > 1 || mentionsMultiple
  };
}
