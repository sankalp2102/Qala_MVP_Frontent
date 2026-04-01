/**
 * mediaUrl — resolves any media path to the correct public URL.
 *
 * - GCS URLs (storage.googleapis.com) — returned as-is
 * - Relative paths — prepended with api.qala.studio
 */

const ORIGIN_BASE = 'https://api.qala.studio';
const GCS_BASE    = 'https://storage.googleapis.com';

export function mediaUrl(url) {
  if (!url) return null;

  // Already a full GCS or any absolute URL — return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  // Relative path — prepend API origin
  const pathname = url.startsWith('/') ? url : '/' + url;
  return ORIGIN_BASE + pathname;
}

export function mediaFallbackUrl(url) {
  return mediaUrl(url);
}

export function mediaOnError(originalUrl) {
  return (e) => {
    e.target.style.display = 'none';
  };
}