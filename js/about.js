/* Sobre mí: al entrar (botón "Entrar") la primera foto ocupa toda la pantalla y,
   al hacer scroll, se recoloca en su sitio; entonces aparecen el menú y la página. */
(function () {
  'use strict';
  var DB = window.DB, html = document.documentElement;
  var hero = document.getElementById('aboutHero'), slot = document.getElementById('slot'), big = document.getElementById('big');
  if (!hero || !slot || !big) return;
  var img = big.querySelector('img');
  var seen = null;
  try { seen = sessionStorage.getItem('db-intro'); } catch (e) {}
  var play = /(^|[?&])entrar/.test(location.search) || !seen;
  if (DB.reduced() || location.hash || !play) { try { sessionStorage.setItem('db-intro', '1'); } catch (e) {} return; }

  html.classList.add('intro');
  var p = 0, t = 0, done = false, vw = 0, vh = 0, sr = null, rad = 0, stop = null, touchY = null;
  function remPx() { return parseFloat(getComputedStyle(html).fontSize) || 100; }

  function geom() {
    window.scrollTo(0, 0);
    vw = html.clientWidth; vh = window.innerHeight;
    var r = slot.getBoundingClientRect();
    sr = { l: r.left, t: r.top, w: r.width, h: r.height };
    rad = remPx() * 0.05;
  }
  function render() {
    var e = DB.ease.inOutCubic(DB.clamp(p, 0, 1));
    var l = DB.lerp(-sr.l, 0, e), tp = DB.lerp(-sr.t, 0, e), w = DB.lerp(vw, sr.w, e), h = DB.lerp(vh, sr.h, e);
    big.style.left = l.toFixed(2) + 'px'; big.style.top = tp.toFixed(2) + 'px';
    big.style.width = w.toFixed(2) + 'px'; big.style.height = h.toFixed(2) + 'px';
    big.style.borderRadius = (rad * e).toFixed(2) + 'px';
    img.style.transform = 'scale(' + DB.lerp(1.16, 1, e).toFixed(4) + ')';
    var cue = document.getElementById('cue');
    if (cue) cue.style.opacity = (0.9 * (1 - DB.clamp(p * 4, 0, 1))).toFixed(2);
  }
  function lock() { html.style.overflow = 'hidden'; }
  function unlock() { html.style.overflow = ''; }
  function finish() {
    if (done) return; done = true;
    p = t = 1; render();
    big.style.cssText = ''; img.style.transform = '';
    html.classList.remove('intro');
    unlock();
    try { sessionStorage.setItem('db-intro', '1'); } catch (e) {}
    if (stop) { stop(); stop = null; }
    window.removeEventListener('wheel', onWheel, { passive: false });
    window.removeEventListener('touchstart', onTs, { passive: true });
    window.removeEventListener('touchmove', onTm, { passive: false });
    window.removeEventListener('keydown', onKey);
    var c = document.getElementById('cue'); if (c) c.remove();
  }
  function onWheel(e) {
    if (done) return; e.preventDefault();
    var d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
    t = DB.clamp(t + d / (vh * 0.85), 0, 1);
  }
  function onTs(e) { touchY = e.touches[0].clientY; }
  function onTm(e) {
    if (done) return; e.preventDefault();
    var y = e.touches[0].clientY; t = DB.clamp(t + (touchY - y) / (vh * 0.6), 0, 1); touchY = y;
  }
  function onKey(e) {
    if (done) return;
    var k = e.key;
    if (k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'Enter') { e.preventDefault(); t = DB.clamp(t + 0.34, 0, 1); }
    else if (k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); t = DB.clamp(t - 0.34, 0, 1); }
  }
  function begin() {
    geom(); lock(); render();
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTs, { passive: true });
    window.addEventListener('touchmove', onTm, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', function () { if (!done) { geom(); render(); } });
    stop = DB.tick(function (dt) {
      p = DB.damp(p, t, 7.5, dt);
      render();
      if (t >= 1 && p > 0.996) finish();
    });
  }
  // la foto ya está a pantalla completa antes de que se levante la cortina
  geom(); render();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin); else begin();
})();
