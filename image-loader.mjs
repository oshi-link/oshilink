// Prepared for the future image API; current sample pages do not call this module.
// Returns false on failure so the caller keeps its existing placeholder visible.
const pending = new WeakMap();
export async function loadImage(img, resolve, { allowedOrigin, signal } = {}) {
  const token = {};
  pending.set(img,token);
  const current = () => pending.get(img) === token;
  img.hidden = true;
  img.removeAttribute('src');
  try {
    const result = await resolve({signal});
    if (!current() || signal?.aborted || !result?.url) return false;
    const url = new URL(result.url);
    if (url.protocol !== 'https:' || url.origin !== allowedOrigin || url.username || url.password)
      return false;
    img.referrerPolicy = 'no-referrer';
    img.src = url.href;
    await img.decode();
    if (!current()) return false;
    if (signal?.aborted) { img.removeAttribute('src'); return false; }
    img.hidden = false;
    return true;
  } catch {
    if (current()) img.removeAttribute('src');
    return false;
  }
}
