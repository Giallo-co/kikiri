import config from '../config/config';

export function objectPublicUrl(key: string | null | undefined): string | undefined {
  if (!key || !config.s3PublicBaseUrl) return undefined;
  const base = config.s3PublicBaseUrl.replace(/\/$/, '');
  const k = key.replace(/^\//, '');
  return `${base}/${k}`;
}
