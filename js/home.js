/* Inicio: el logo se arma pieza a pieza (D · B) con muelles suaves, se desplaza hasta la cabecera mientras
   el carrusel 3D (estilo etienne.studio) se abre y gira hasta su sitio. Cada diapositiva enlaza a la
   página/sección que muestra. */
(function () {
  'use strict';
  var DB = window.DB, html = document.documentElement;
  var home = document.getElementById('home'); if (!home) return;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  var ring = $('#ring'), wrap = $('#ringwrap'), slides = $$('.slide', ring), N = slides.length;
  var labels = $$('#label span'), countEl = $('#count'), intro = $('#logoIntro'), P = labels.length;
  var vw = 0, vh = 0, mob = false, sw = 0, sh = 0, R = 0;
  var rot = 0, rotT = 0, idx = -1, ready = false, lastInput = 0, snapT = null, bloom = 1, introLock = true;
  var STEP = 360 / N;

  function layout() {
    vw = home.clientWidth; vh = home.clientHeight; mob = vw < 900;
    sw = mob ? Math.min(vw * 0.66, vh * 0.3 * 1.38) : Math.min(vw * 0.3, vh * 0.42 * 1.38);
    sh = sw / 1.38;
    R = (sw / 2) / Math.tan(Math.PI / N) + (mob ? 8 : 24);
    slides.forEach(function (s) { s.style.width = sw + 'px'; s.style.height = sh + 'px'; });
    place();
    ring.style.top = (mob ? 40 : 45) + '%';
    wrap.style.perspective = Math.round(Math.max(900, Math.min(vw, vh * 1.7) * 1.25)) + 'px';
    draw();
  }

  /* cada diapositiva a su radio (bloom 0 → todas juntas en el centro, 1 → anillo completo) */
  function place() {
    var r = (R * bloom).toFixed(2);
    slides.forEach(function (s, i) {
      s.style.transform = 'translate(' + (-sw / 2) + 'px,' + (-sh / 2) + 'px) rotateY(' + (i * STEP) + 'deg) translateZ(' + r + 'px)';
    });
  }

  function draw() {
    ring.style.transform = 'translateZ(' + (-R * bloom).toFixed(2) + 'px) rotateY(' + (-rot).toFixed(3) + 'deg)';
    var f = rot / STEP, k = ((Math.round(f) % N) + N) % N;
    if (k !== idx && !introLock) setIndex(k);
    mediaNear();
  }

  var page = -1;
  function setIndex(k) {
    idx = k;
    var pk = k % P;
    if (pk !== page) {
      var prev = page; page = pk;
      labels.forEach(function (l, i) {
        l.classList.remove('on', 'off');
        if (i === pk) l.classList.add('on'); else if (i === prev) l.classList.add('off');
      });
      if (countEl) countEl.textContent = ('0' + (pk + 1)) + ' / ' + ('0' + P);
    }
  }
  function mediaNear() {
    if (!ready) return;   // los vídeos no se decodifican hasta que acabe la intro (animación más fluida)
    var f = rot / STEP;
    slides.forEach(function (s, i) {
      var near = Math.abs(DB.wrap(i - f, N)) < 1.4;
      (s._v || (s._v = $$('video', s))).forEach(function (v) {
        if (near && v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else if (!near && !v.paused) v.pause();
      });
    });
  }

  /* diapositivas con varias imágenes: fundido cruzado, y el enlace sigue a la imagen visible */
  slides.forEach(function (s, i) {
    var sl = $$('.sl', s); if (sl.length < 2) { s.href = (sl[0] && sl[0].dataset.href) || s.getAttribute('href'); return; }
    var j = 0;
    setInterval(function () {
      if (document.hidden || !ready) return;
      sl[j].classList.remove('on'); j = (j + 1) % sl.length; sl[j].classList.add('on');
    }, 3300 + i * 450);
    s._cur = function () { return sl.filter(function (e) { return e.classList.contains('on'); })[0]; };
  });

  /* ---- entrada: rueda, arrastre, teclas, clic ---- */
  function input() { lastInput = performance.now(); clearTimeout(snapT); }
  function snap() { rotT = Math.round(rotT / STEP) * STEP; }
  function onWheel(e) {
    if (!ready) return;
    e.preventDefault(); input();
    var d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (e.deltaMode === 1) d *= 32;
    rotT += DB.clamp(d, -140, 140) * 0.2;
    snapT = setTimeout(snap, 160);
  }
  var drag = null;
  function onDown(e) {
    if (!ready || (e.target.closest && e.target.closest('.enter'))) return;
    drag = { x: e.clientX, t: rotT, moved: false, id: e.pointerId, tm: performance.now() }; input();
  }
  function onMove(e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    if (Math.abs(dx) > 6) {
      if (!drag.moved) { drag.moved = true; try { wrap.setPointerCapture(drag.id); } catch (er) {} }
    }
    if (drag.moved) { input(); rotT = drag.t - dx * (mob ? 0.34 : 0.2); }
  }
  function onUp(e) {
    if (!drag) return;
    if (drag.moved) {
      var v = (e.clientX - drag.x) / Math.max(1, performance.now() - drag.tm);
      rotT -= DB.clamp(v * 40, -90, 90) * (Math.abs(v) > 0.35 ? 1 : 0);
      snap();
    }
    setTimeout(function () { drag = null; }, 0);
    wrap._moved = drag && drag.moved;
  }
  wrap.addEventListener('wheel', onWheel, { passive: false });
  wrap.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('keydown', function (e) {
    if (!ready) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { input(); rotT = (Math.round(rotT / STEP) + 1) * STEP; }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { input(); rotT = (Math.round(rotT / STEP) - 1) * STEP; }
  });
  slides.forEach(function (s, i) {
    s.addEventListener('click', function (e) {
      if (drag && drag.moved || wrap._moved) { e.preventDefault(); e.stopPropagation(); wrap._moved = false; return; }
      var d = DB.wrap(i - rot / STEP, N);
      if (Math.abs(d) > 0.45) { e.preventDefault(); e.stopPropagation(); input(); rotT = rot + d * STEP; rotT = Math.round(rotT / STEP) * STEP; return; }
      if (s._cur) { var c = s._cur(); if (c && c.dataset.href) s.setAttribute('href', c.dataset.href); }
    });
  });
  // el rastreo del puntero inclina ligeramente la perspectiva
  var px = 0.5, py = 0.46, tpx = 0.5, tpy = 0.46;
  window.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') { tpx = e.clientX / vw; tpy = e.clientY / vh; } }, { passive: true });

  DB.tick(function (dt) {
    rot = DB.damp(rot, rotT, 5.2, dt);
    if (Math.abs(rot - rotT) < 0.004) rot = rotT;
    px = DB.damp(px, tpx, 3, dt); py = DB.damp(py, tpy, 3, dt);
    wrap.style.perspectiveOrigin = (50 + (px - 0.5) * 14).toFixed(2) + '% ' + (46 + (py - 0.5) * 12).toFixed(2) + '%';
    draw();
    if (ready && !drag && performance.now() - lastInput > 5200 && !document.hidden) { lastInput = performance.now() - 1000; rotT = (Math.round(rotT / STEP) + 1) * STEP; }
  });
  window.addEventListener('resize', layout);

  /* ---- secuencia de entrada (sobria) ----
     0,10 s  la D se desliza desde la izquierda y la B desde la derecha, con fundido y sin rebote
     0,55 s  el punto aparece con un pequeño descenso suave
     1,35 s  el logo asienta con un leve "respiro" de escala
     1,55 s  se desplaza con suavidad hasta la cabecera mientras el anillo se abre y gira hasta su sitio  */
  function startIntro() {
    layout();
    function finish() {
      if (ready) return;
      if (stopI) { stopI(); stopI = null; }
      ['pointerdown', 'keydown', 'wheel'].forEach(function (ev) { window.removeEventListener(ev, skip, true); });
      bloom = 1; rot = rotT = 0; introLock = false; place(); draw();
      ready = true; home.classList.add('is-ready', 'ui-on'); html.classList.add('home-ready', 'home-ui'); intro.style.display = 'none';
      lastInput = performance.now(); mediaNear();
    }
    var stopI = null;
    function skip() { finish(); }
    if (DB.reduced()) { finish(); return; }

    var pD = $('.lp-d', intro), pO = $('.lp-o', intro), pB = $('.lp-b', intro), inner = $('.li-in', intro);
    var w0 = intro.offsetWidth, h0 = w0 * 406 / 643;
    var tgt = $('.hdr-home .logo').getBoundingClientRect();
    var x0 = (vw - w0) / 2, y0 = (vh - h0) / 2 - (mob ? 0 : vh * 0.03), x1 = tgt.left, y1 = tgt.top, s1 = tgt.width / w0;
    var arc = Math.min(vh * 0.035, 34), SPIN = 260;
    function S(k, d) { return new DB.Spring(0, k, d); }
    // muelles críticos (sin rebote): la entrada es limpia y se frena con suavidad
    var posD = S(64, 16), posB = S(64, 16), posO = S(90, 19), gs = S(130, 14.5), fl = S(46, 13.5);
    var dx = Math.min(w0 * 0.9, vw * 0.3);
    var T = 0, started = {}, landT = -1, bloomT0 = -1, BLOOM = 1750;
    var eo = DB.ease.outExpo, cl = DB.clamp, lerp = DB.lerp;

    // estado inicial: nada a la vista; el anillo recogido en el centro y girado
    bloom = 0.06; rot = rotT = -SPIN; place(); draw();
    intro.style.opacity = '1';
    intro.style.transform = 'translate3d(' + x0.toFixed(2) + 'px,' + y0.toFixed(2) + 'px,0)';
    ['pointerdown', 'keydown', 'wheel'].forEach(function (ev) { window.addEventListener(ev, skip, { capture: true, passive: true }); });

    stopI = DB.tick(function (dt) {
      T += dt;
      if (T > 0.10 && !started.d) { started.d = 1; posD.t = 1; }
      if (T > 0.24 && !started.b) { started.b = 1; posB.t = 1; }
      if (T > 0.62 && !started.o) { started.o = 1; posO.t = 1; }
      var pd = posD.step(dt), pb = posB.step(dt), po = posO.step(dt);
      gs.step(dt);

      // D y B: deslizamiento con fundido y un leve crecimiento, sin giros
      pD.style.opacity = cl(pd * 2.2, 0, 1).toFixed(3);
      pD.style.transform = 'translate3d(' + ((1 - pd) * -dx).toFixed(1) + 'px,0,0) scale(' + lerp(0.94, 1, cl(pd, 0, 1)).toFixed(4) + ')';
      pB.style.opacity = cl(pb * 2.2, 0, 1).toFixed(3);
      pB.style.transform = 'translate3d(' + ((1 - pb) * dx).toFixed(1) + 'px,0,0) scale(' + lerp(0.94, 1, cl(pb, 0, 1)).toFixed(4) + ')';

      // punto: aparece creciendo con un descenso corto
      if (started.o && landT < 0 && po > 0.985) { landT = T; }
      pO.style.opacity = cl(po * 3, 0, 1).toFixed(3);
      pO.style.transform = 'translate3d(0,' + ((1 - po) * -h0 * 0.42).toFixed(1) + 'px,0) scale(' + lerp(0.5, 1, cl(po, 0, 1)).toFixed(4) + ')';

      // al completarse el logo, un pequeño "respiro" de escala
      if (landT > 0 && !started.hop && T > landT + 0.12) { started.hop = 1; gs.x = 0.3; }

      // desplazamiento a la cabecera (arco mínimo) + apertura del anillo
      if (T > 1.55 && !started.fly) { started.fly = 1; fl.t = 1; bloomT0 = T; home.classList.add('is-ready'); }
      var p = fl.step(dt), pc = cl(p, 0, 1);
      var x = lerp(x0, x1, p), y = lerp(y0, y1, p) - arc * Math.sin(Math.PI * pc), sc = lerp(1, s1, p);
      intro.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) scale(' + sc.toFixed(4) + ')';
      inner.style.transform = 'scale(' + (1 + gs.v).toFixed(4) + ')';

      var bq = 0;
      if (bloomT0 > 0) {
        bq = cl((T - bloomT0) * 1000 / BLOOM, 0, 1);
        var e = eo(bq);
        bloom = lerp(0.06, 1, e); rot = rotT = -(1 - e) * SPIN;
        place(); draw();
        if (bq > 0.35 && !started.ui) { started.ui = 1; home.classList.add('ui-on'); html.classList.add('home-ui'); setIndex(0); }
      }
      if (bq >= 1 && started.fly && Math.abs(fl.v - 1) < 0.003 && Math.abs(fl.x) < 0.05 && Math.abs(gs.v) < 0.004) finish();
    });
  }
  document.addEventListener('dbready', startIntro);
  layout();
})();
