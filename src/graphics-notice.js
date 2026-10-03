// Accessible DOM notice independent of the unavailable WebGL canvas.
export function installGraphicsNotice(root = globalThis) {
  const doc = root.document, notice = doc?.getElementById('graphics-notice');
  const button = doc?.getElementById('graphics-retry');
  const reload = () => root.location?.reload();
  button?.addEventListener('click', reload);
  return {
    lost() { if (notice) notice.hidden = false; doc?.body?.classList.add('graphics-lost'); },
    restored() {
      if (notice) notice.hidden = true;
      doc?.body?.classList.remove('graphics-lost');
      if (button && doc?.activeElement === button) {
        const canvas = doc.querySelector('#game canvas');
        canvas?.setAttribute('tabindex', '-1'); canvas?.focus({ preventScroll: true });
      }
    },
    destroy() { this.restored(); button?.removeEventListener('click', reload); },
  };
}
