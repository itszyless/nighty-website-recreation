(() => {
  // Keep the saved navigation responsive before selective hydration finishes.
  let menuBackdrop;
  function setMenu(open) {
    const nav = document.querySelector('header nav');
    const button = document.querySelector('button[aria-label="Open/Close Menu"]');
    if (!nav || !button) return;
    nav.dataset.opened = String(open);
    nav.style.cssText = `pointer-events:${open ? 'auto' : 'none'};opacity:${open ? 1 : 0};height:${open ? '8.5rem' : '0px'};transform:translateY(${open ? 0 : -30}px);transition:height .35s,opacity .25s,transform .35s;`;
    button.style.transform = `rotate(${open ? -90 : 90}deg)`;
    button.setAttribute('aria-expanded', String(open));
    if (open && !menuBackdrop) {
      menuBackdrop = document.createElement('div');
      menuBackdrop.style.cssText = 'position:fixed;inset:48px 0 0;background:#0009;backdrop-filter:blur(4px);z-index:49';
      menuBackdrop.addEventListener('click', () => setMenu(false));
      document.body.append(menuBackdrop);
    }
    if (!open) { menuBackdrop?.remove(); menuBackdrop = undefined; }
  }
  document.addEventListener('click', event => {
    if (!event.target.closest?.('button[aria-label="Open/Close Menu"]')) return;
    event.preventDefault(); event.stopImmediatePropagation();
    setMenu(document.querySelector('header nav')?.dataset.opened !== 'true');
  }, true);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', () => { if (innerWidth >= 768) { menuBackdrop?.remove(); menuBackdrop = undefined; } });
  // Public pages keep their original client animations. Page changes use the
  // saved HTML, so Next.js server rendering is not required on this machine.
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download') || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;
    if (menuBackdrop && link.closest('header nav')) {
      setMenu(false);
      if (url.pathname === location.pathname && url.hash) {
        event.stopImmediatePropagation();
        return;
      }
    }
    if (url.pathname === location.pathname && url.hash) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.assign(url.pathname + url.search + url.hash);
  }, true);

  if (location.pathname.replace(/\/$/, '') !== '/get-links') return;

  // A local visual stand-in, not a CAPTCHA service. No verification is sent.
  const widgets = new Map();
  window.hcaptcha = {
    render(container, options) {
      const host = typeof container === 'string' ? document.getElementById(container) : container;
      const id = `local-preview-${widgets.size}`;
      const label = document.createElement('label');
      label.style.cssText = 'width:300px;height:76px;border:1px solid #aaa;border-radius:3px;background:#333;display:flex;align-items:center;padding:14px;gap:14px;font:13px Arial,sans-serif;color:#eee;box-sizing:border-box;cursor:pointer';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.setAttribute('aria-label', 'Local preview checkbox');
      checkbox.style.cssText = 'appearance:auto;width:29px;height:29px;accent-color:#378bd7;flex-shrink:0';
      const text = document.createElement('span');
      text.textContent = 'Local preview';
      const mark = document.createElement('span');
      mark.style.cssText = 'margin-left:auto;text-align:center;font-size:9px;line-height:1.3;color:#bfc6d1';
      mark.innerHTML = '<span style="display:block;font-size:23px;color:#6cbadb">✦</span>Offline demo';
      label.append(checkbox, text, mark);
      host.append(label);
      checkbox.addEventListener('change', () => checkbox.checked ? options.callback?.('local-preview-only') : options['expired-callback']?.());
      widgets.set(id, { host, checkbox });
      return id;
    },
    getResponse(id) { return widgets.get(id)?.checkbox.checked ? 'local-preview-only' : ''; },
    reset(id) { const widget = widgets.get(id); if (widget) widget.checkbox.checked = false; },
    remove(id) { widgets.get(id)?.host.replaceChildren(); widgets.delete(id); },
    execute() { return Promise.resolve({ response: 'local-preview-only' }); },
    getRespKey() { return ''; }
  };
  function showLocalMessage(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const form = event.target.closest('form') || document.querySelector('form');
    if (!form) return;
    let message = form.querySelector('[data-local-message]');
    if (!message) {
      message = document.createElement('p');
      message.dataset.localMessage = '';
      message.setAttribute('role', 'status');
      message.style.cssText = 'font-size:13px;color:#b9d4f5;text-align:center;margin-top:16px;line-height:1.5';
      form.append(message);
    }
    message.textContent = 'Local preview only. License verification and customer downloads are not connected. Nothing was sent.';
  }
  document.addEventListener('submit', showLocalMessage, true);
  document.addEventListener('click', event => {
    const button = event.target.closest?.('button[type="submit"]');
    if (button) showLocalMessage(event);
  }, true);
})();
