// Reports the visible content box and document height to the parent frame.
// Thumbnail mode (?thumb=1) also hides scrollbars and scrolls to ?scroll=<0..1>.
(() => {
  const params = new URLSearchParams(location.search);
  const thumb = params.get('thumb') === '1';
  if (thumb) document.head.append(Object.assign(document.createElement('style'), { textContent: '* { scrollbar-width: none; } ::-webkit-scrollbar { display: none; }' }));
  const scrollFraction = Math.min(Math.max(Number(params.get('scroll')) || 0, 0), 1);
  const SKIP = new Set(['SCRIPT', 'STYLE', 'LINK', 'TEMPLATE', 'NOSCRIPT']);
  const MEDIA = new Set(['IMG', 'VIDEO', 'CANVAS', 'SVG', 'svg', 'PICTURE', 'IFRAME']);

  const visibleChildren = (el) =>
    [...el.children].filter((c) => {
      if (SKIP.has(c.tagName)) return false;
      const r = c.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(c).visibility !== 'hidden';
    });

  const paints = (el) => {
    if (MEDIA.has(el.tagName)) return true;
    const s = getComputedStyle(el);
    const alpha = (color) => (color.match(/[\d.]+/g)?.[3] ?? (color === 'transparent' ? '0' : '1')) !== '0';
    return (
      alpha(s.backgroundColor) ||
      s.backgroundImage !== 'none' ||
      s.boxShadow !== 'none' ||
      (parseFloat(s.borderTopWidth) > 0 && alpha(s.borderTopColor))
    );
  };

  const hasOwnText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());

  const union = (rects) =>
    rects.reduce((a, r) => ({
      left: Math.min(a.left, r.left), top: Math.min(a.top, r.top),
      right: Math.max(a.right, r.right), bottom: Math.max(a.bottom, r.bottom),
    }));

  function contentBox() {
    let el = document.body;
    for (;;) {
      if (el !== document.body && (paints(el) || hasOwnText(el))) break;
      const kids = visibleChildren(el);
      if (kids.length !== 1) {
        if (!kids.length) return null;
        el = { rects: kids.map((k) => k.getBoundingClientRect()) };
        break;
      }
      el = kids[0];
    }
    const painted = !el.rects && paints(el);
    const r = el.rects ? union(el.rects) : el.getBoundingClientRect();
    const box = {
      x: Math.max(r.left, 0), y: Math.max(r.top, 0),
      right: Math.min(r.right, innerWidth), bottom: Math.min(r.bottom, innerHeight),
    };
    if (box.right <= box.x || box.bottom <= box.y) return null;
    return { x: box.x, y: box.y, w: box.right - box.x, h: box.bottom - box.y, painted };
  }

  function scrollTarget() {
    const doc = document.scrollingElement;
    if (doc.scrollHeight > doc.clientHeight + 1) return doc;
    let best = null;
    for (const el of document.body.querySelectorAll('*')) {
      const extra = el.scrollHeight - el.clientHeight;
      if (extra > 1 && /auto|scroll/.test(getComputedStyle(el).overflowY) && (!best || extra > best.extra)) best = { el, extra };
    }
    return best?.el ?? null;
  }

  const report = () => {
    const target = thumb && scrollFraction && scrollTarget();
    if (target) target.scrollTop = scrollFraction * (target.scrollHeight - target.clientHeight);
    requestAnimationFrame(() =>
      parent.postMessage({ type: 'frame', box: contentBox(), docHeight: document.scrollingElement.scrollHeight }, '*'),
    );
  };

  [500, 1200, 2500].forEach((ms) => setTimeout(report, ms));
  document.fonts?.ready.then(() => setTimeout(report, 100));
  addEventListener('resize', () => setTimeout(report, 100));
})();
