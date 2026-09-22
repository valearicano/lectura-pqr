export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  let str = String(text);

  // Normalize Unicode representation (NFC keeps combined accents nicely)
  str = str.normalize('NFC');

  // Replace carriage returns and multiple newlines
  str = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  str = str.replace(/\n{2,}/g, '\n');

  // Remove zero-width spaces, non-breaking spaces, control characters except standard punctuation & newlines
  str = str.replace(/[\u200B-\u200D\uFEFF]/g, '');
  str = str.replace(/\u00A0/g, ' ');

  // Condense multiple spaces into a single space
  str = str.replace(/[ \t]{2,}/g, ' ');

  // Trim lines
  str = str.split('\n').map(line => line.trim()).join(' ');

  // Final trim
  return str.trim();
}

/**
 * Generates a fast SHA-like hash or simple consistent hash code for caching and deduplication
 */
export function hashText(text: string): string {
  const norm = normalizeText(text).toLowerCase();
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    const char = norm.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'h_' + Math.abs(hash).toString(16) + '_' + norm.length;
}
