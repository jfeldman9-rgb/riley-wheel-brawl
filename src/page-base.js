// GitHub Pages serves this game from /riley-wheel-brawl/, not the domain root.
// A project URL without a trailing slash resolves "assets/..." against the
// parent directory, and that host is case-sensitive. Queued loader paths stay
// repo-relative; this only fixes the document base they resolve against.

/** Directory URL relative asset paths should resolve against. */
export function directoryBaseHref(href) {
  const url = new URL(href, 'http://localhost/');
  if (url.pathname.endsWith('/')) return url.href;
  const last = url.pathname.split('/').pop() || '';
  if (last.includes('.')) return url.href;
  url.pathname += '/';
  return url.href;
}

/** Resolve one repo-relative loader URL against a page, never against the domain root. */
export function resolvePageAsset(pageHref, relative) {
  if (typeof relative !== 'string' || !relative || relative.startsWith('/')) return null;
  return new URL(relative, directoryBaseHref(pageHref)).href;
}

export function installDirectoryBase(doc, loc) {
  if (!doc?.head || !loc?.href || typeof doc.createElement !== 'function') return null;
  const href = directoryBaseHref(loc.href);
  if (href === loc.href) return null;
  let base = doc.querySelector?.('base');
  if (!base) {
    base = doc.createElement('base');
    doc.head.prepend?.(base);
  }
  if (!base.getAttribute?.('href')) base.setAttribute?.('href', href);
  base.href = href;
  return href;
}
