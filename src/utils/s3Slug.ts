/**
 * Segmento seguro para keys S3 (username, álbum, nombre de track).
 * Minúsculas, sin espacios ni caracteres problemáticos.
 */
export function s3SlugSegment(raw: string, maxLen = 80): string {
  const s = raw
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
    .replace(/-+$/g, '');
  return s.length > 0 ? s : 'unnamed';
}
