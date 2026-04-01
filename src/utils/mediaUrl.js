/**
 * mediaUrl — resolves any media path to the best available URL.
 *
 * Priority:
 *   1. GCS URLs (storage.googleapis.com) — returned as-is, already on CDN
 *   2. www.qala.studio/media/...  (Vercel Edge CDN — cached globally)
 *   3. api.qala.studio/media/...  (GCP VM — fallback for files > 25MB)
 *
 * The <img> onError handler in each component falls back to the GCP URL
 * if Vercel returns an error (e.g. file exceeds Hobby plan 25MB proxy limit).
 */

const CDN_BASE      = 'https://www.qala.studio';
const ORIGIN_BASE   = 'https://api.qala.studio';
const GCS_BASE      = 'https://storage.googleapis.com';

/**
 * Returns the correct URL for a given media path.
 * GCS URLs are returned as-is (already public + fast).
 * Legacy /media/ paths go through the CDN.
 */
export function mediaUrl(url) {
  if (!url) return null;

  // GCS URL — return directly, do not rewrite
  if (url.startsWith(GCS_BASE)) return url;

  let pathname;
  if (url.startsWith('http')) {
    try { pathname = new URL(url).pathname; } catch { return url; }
  } else {
    pathname = url.startsWith('/') ? url : '/' + url;
  }

  return CDN_BASE + pathname;
}

/**
 * The fallback URL — used in onError handlers.
 * GCS URLs are returned as-is (they don't need a fallback).
 * Legacy paths fall back to origin directly.
 */
export function mediaFallbackUrl(url) {
  if (!url) return null;

  // GCS URL — already the best source, return as-is
  if (url.startsWith(GCS_BASE)) return url;

  let pathname;
  if (url.startsWith('http')) {
    try { pathname = new URL(url).pathname; } catch { return url; }
  } else {
    pathname = url.startsWith('/') ? url : '/' + url;
  }

  return ORIGIN_BASE + pathname;
}

/**
 * onError handler for <img> tags.
 * If CDN fails, switches src to the origin URL automatically.
 * Usage: <img src={mediaUrl(url)} onError={mediaOnError(url)} />
 */
export function mediaOnError(originalUrl) {
  return (e) => {
    const fallback = mediaFallbackUrl(originalUrl);
    if (fallback && e.target.src !== fallback) {
      e.target.src = fallback;
    } else {
      e.target.style.display = 'none';
    }
  };
}