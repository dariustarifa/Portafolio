/* Comportamiento común: tema, navegación con cristal, transiciones, cursor, revelados. */
(function () {
  'use strict';
  var DB = window.DB, html = document.documentElement;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) {} return null; }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function remPx() { return parseFloat(getComputedStyle(html).fontSize) || 100; }

  /* ------------------------------------------------------------------ */
  /* Resaltado de cristal que se desliza entre elementos                  */
  /* ------------------------------------------------------------------ */
  function HL(container, sel, key) {
    if (!container) return null;
    var hl = container.querySelector(':scope > .hl');
    if (!hl) return null;
    var api = { hl: hl, container: container, links: $$(sel, container), active: null };
    api.active = api.links.filter(function (a) { return a.getAttribute('aria-current'); })[0] || null;
    api.put = function (el, instant) {
      if (!el) { hl.classList.remove('on'); return; }
      if (instant) hl.style.transition = 'none';
      hl.style.left = el.offsetLeft + 'px';
      hl.style.width = el.offsetWidth + 'px';
      hl.classList.add('on');
      if (instant) { void hl.offsetWidth; hl.style.transition = ''; }
    };
    api.rest = function (instant) { api.put(api.active, instant); };
    api.links.forEach(function (a) {
      a.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') api.put(a); });
      a.addEventListener('focus', function () { api.put(a); });
      a.addEventListener('blur', function () { api.rest(); });
    });
    container.addEventListener('pointerleave', function () { api.rest(); });
    // continuidad entre páginas: arranca donde estaba el resaltado en la página anterior
    var idx = api.active ? api.links.indexOf(api.active) : -1;
    var prev = key ? ss('db-hl-' + key) : null;
    if (key) ss('db-hl-' + key, String(idx));
    function init() {
      if (prev !== null && prev !== '' && +prev > -1 && +prev !== idx && api.links[+prev]) {
        api.put(api.links[+prev], true);
        requestAnimationFrame(function () { requestAnimationFrame(function () { api.rest(); }); });
      } else api.rest(true);
    }
    init();
    return api;
  }

  var hls = [];
  function initHighlights() {
    var n = HL($('#nav'), 'a', 'nav'); if (n) hls.push(n);
    var f = HL($('#filters'), 'a', 'filters'); if (f) hls.push(f);
    var m = HL($('#mnav'), 'a', 'mnav'); if (m) hls.push(m);
    // píldoras sueltas (contacto, iconos, cta, píldoras de contacto): el cristal se enciende con CSS
  }
  function refreshHighlights() { hls.forEach(function (h) { h.rest(true); }); placeTheme(true); }

  /* ------------------------------------------------------------------ */
  /* Tema: Oscuro / Claro / POP                                           */
  /* ------------------------------------------------------------------ */
  var tsw = $('#tsw'), tHl = {};
  function placeTheme(instant) {
    if (!tsw) return;
    var t = html.dataset.theme;
    $$('.pill', tsw).forEach(function (p) {
      var hl = $('.hl', p), btn = $$('button', p).filter(function (b) { return b.dataset.t === t; })[0];
      if (!hl) return;
      if (!btn) { hl.classList.remove('on'); return; }
      if (instant) hl.style.transition = 'none';
      hl.style.left = btn.offsetLeft + 'px';
      hl.style.width = btn.offsetWidth + 'px';
      hl.classList.add('on');
      if (instant) { void hl.offsetWidth; hl.style.transition = ''; }
    });
    $$('button', tsw).forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.t === t ? 'true' : 'false'); });
  }
  function setTheme(t, fromUser) {
    if (['oscuro', 'claro', 'pop'].indexOf(t) < 0) return;
    if (fromUser) { html.classList.add('theming'); clearTimeout(setTheme._t); setTheme._t = setTimeout(function () { html.classList.remove('theming'); }, 1100); }
    html.dataset.theme = t;
    ls('db-theme', t);
    placeTheme(!fromUser);
    var m = $('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'claro' ? '#d7d1c9' : t === 'pop' ? (getComputedStyle(html).getPropertyValue('--popc').trim() || '#2717b3') : '#262221');
    document.dispatchEvent(new CustomEvent('themechange', { detail: t }));
  }
  if (tsw) {
    tsw.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-t]'); if (!b) return;
      var t = b.dataset.t;
      // POP es un interruptor: si ya está activo vuelve al tema claro/oscuro anterior
      if (t === 'pop' && html.dataset.theme === 'pop') t = ls('db-base') || 'oscuro';
      else if (t !== 'pop') ls('db-base', t);
      else ls('db-base', html.dataset.theme === 'claro' ? 'claro' : 'oscuro');
      setTheme(t, true);
    });
  }
  if (html.dataset.theme !== 'pop') ls('db-base', html.dataset.theme);

  /* ------------------------------------------------------------------ */
  /* Transiciones entre páginas                                           */
  /* ------------------------------------------------------------------ */
  var curtain = $('.curtain');
  function go(url) {
    if (go.busy) return; go.busy = true;
    if (curtain) curtain.classList.add('on');
    setTimeout(function () { location.href = url; }, DB.reduced() ? 0 : 520);
  }
  DB.go = go;
  window.addEventListener('pageshow', function (e) {
    go.busy = false;
    if (curtain) curtain.classList.remove('on');
    if (e.persisted) html.classList.remove('is-loading');
  });
  function scrollToHash(hash, smooth) {
    var el = hash && document.getElementById(decodeURIComponent(hash.replace('#', '')));
    if (!el) return false;
    var y = el.getBoundingClientRect().top + window.pageYOffset - remPx() * (DB.isMobile() ? 1.6 : 2.2);
    window.scrollTo({ top: Math.max(0, y), behavior: smooth && !DB.reduced() ? 'smooth' : 'auto' });
    return true;
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download') || a.classList.contains('ph')) return;
    var href = a.getAttribute('href');
    if (!href || /^(mailto:|tel:|javascript:)/i.test(href)) return;
    var u;
    try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (/^https?:$/.test(u.protocol) && location.protocol !== 'file:' && u.origin !== location.origin) return;
    if (location.protocol === 'file:' && u.protocol !== 'file:') return;
    if (u.pathname === location.pathname && u.hash) { e.preventDefault(); scrollToHash(u.hash, true); history.replaceState(null, '', u.hash); return; }
    if (u.pathname === location.pathname && !u.search) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    e.preventDefault();
    go(a.href);
  });

  /* ------------------------------------------------------------------ */
  /* Cabecera: se esconde al bajar y reaparece al subir (escritorio)      */
  /* ------------------------------------------------------------------ */
  var hdr = $('#hdr'), lastY = window.pageYOffset;
  window.addEventListener('scroll', function () {
    if (!hdr || DB.isMobile() || html.classList.contains('intro') || hdr.classList.contains('hdr-home')) return;
    var y = window.pageYOffset, dy = y - lastY;
    if (y > 200 && dy > 8) hdr.classList.add('is-hidden');
    else if (dy < -8 || y < 120) hdr.classList.remove('is-hidden');
    lastY = y;
  }, { passive: true });

  /* ------------------------------------------------------------------ */
  /* Cursor: flecha triangular clásica y grande (sigue al ratón sin retardo)  */
  /* ------------------------------------------------------------------ */
  (function cursor() {
    var cur = $('.cur');
    if (!cur || !DB.fine()) return;
    html.classList.add('has-cursor');
    cur.classList.add('is-hidden');
    var tx = 0, ty = 0, px = -1, py = -1, shown = false;
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY;
      if (!shown) { shown = true; cur.classList.remove('is-hidden'); }
      var t = e.target;
      var photo = t.closest && t.closest('.ph, .slide, .yt, .stack .card');
      var link = t.closest && t.closest('a, button, .yt');
      cur.classList.toggle('is-photo', !!photo);
      cur.classList.toggle('is-link', !!link && !photo);
    }, { passive: true });
    window.addEventListener('pointerdown', function () { cur.classList.add('is-down'); });
    window.addEventListener('pointerup', function () { cur.classList.remove('is-down'); });
    document.addEventListener('mouseleave', function () { cur.classList.add('is-hidden'); shown = false; });
    DB.tick(function () {
      if (tx === px && ty === py) return;
      px = tx; py = ty;
      cur.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0)';
    });
  })();

  /* ------------------------------------------------------------------ */
  /* Revelados suaves al entrar en pantalla                                */
  /* ------------------------------------------------------------------ */
  var io = null;
  function startReveals() {
    var els = $$('.rv, .rvp');
    if (!('IntersectionObserver' in window) || DB.reduced()) { els.forEach(function (e) { e.classList.add('in', 'done'); }); return; }
    io = new IntersectionObserver(function (entries) {
      var vis = entries.filter(function (e) { return e.isIntersecting; }).sort(function (a, b) {
        return (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left);
      });
      vis.forEach(function (e, i) {
        var el = e.target;
        el.style.setProperty('--d', (Math.min(i, 9) * 0.075).toFixed(3) + 's');
        el.classList.add('in');
        io.unobserve(el);
        setTimeout(function () { el.classList.add('done'); }, 2600 + i * 75);
      });
    }, { rootMargin: '0px 0px -5% 0px', threshold: 0.04 });
    els.forEach(function (el) { io.observe(el); });
  }
  DB.reveal = function (root) { if (io) $$('.rv:not(.in), .rvp:not(.in)', root).forEach(function (el) { io.observe(el); }); };

  /* ------------------------------------------------------------------ */
  /* Arranque                                                             */
  /* ------------------------------------------------------------------ */
  var started = false;
  function start() {
    if (started) return; started = true;
    html.classList.remove('is-loading');
    html.classList.add('is-ready');
    refreshHighlights();
    startReveals();
    document.dispatchEvent(new CustomEvent('dbready'));
  }
  function boot() {
    initHighlights();
    placeTheme(true);
    var fontsP = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var imgP = new Promise(function (res) {
      var imgs = $$('img').filter(function (i) { return i.loading !== 'lazy' && !i.complete; }).slice(0, 4);
      if (!imgs.length) return res();
      var n = imgs.length;
      imgs.forEach(function (i) { i.addEventListener('load', one); i.addEventListener('error', one); });
      function one() { if (--n <= 0) res(); }
    });
    Promise.all([fontsP, imgP]).then(function () { setTimeout(start, 60); });
    setTimeout(start, 1600);
    if (location.hash) setTimeout(function () { scrollToHash(location.hash, false); }, 80);
  }
  window.addEventListener('resize', function () { clearTimeout(boot._r); boot._r = setTimeout(refreshHighlights, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(refreshHighlights, 30); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
