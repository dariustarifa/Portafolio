/* Inicio: el logo escala y se coloca en su sitio, y aparece un carrusel 3D (estilo etienne.studio)
   con las 5 secciones en movimiento. Cada diapositiva enlaza a la página/sección que muestra. */
(function () {
  'use strict';
  var DB = window.DB, html = document.documentElement;
  var home = document.getElementById('home'); if (!home) return;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  var ring = $('#ring'), wrap = $('#ringwrap'), slides = $$('.slide', ring), N = slides.length;
  var labels = $$('#label span'), countEl = $('#count'), intro = $('#logoIntro'), P = labels.length;
  var vw = 0, vh = 0, mob = false, sw = 0, sh = 0, R = 0;
  var rot = 0, rotT = 0, idx = -1, ready = false, lastInput = 0, snapT = null;
  var STEP = 360 / N;

  function layout() {
    vw = home.clientWidth; vh = home.clientHeight; mob = vw < 900;
    sw = mob ? Math.min(vw * 0.66, vh * 0.3 * 1.38) : Math.min(vw * 0.3, vh * 0.42 * 1.38);
    sh = sw / 1.38;
    R = (sw / 2) / Math.tan(Math.PI / N) + (mob ? 8 : 24);
    slides.forEach(function (s, i) {
      s.style.width = sw + 'px'; s.style.height = sh + 'px';
      s.style.transform = 'translate(' + (-sw / 2) + 'px,' + (-sh / 2) + 'px) rotateY(' + (i * STEP) + 'deg) translateZ(' + R + 'px)';
    });
    ring.style.top = (mob ? 40 : 45) + '%';
    wrap.style.perspective = Math.round(Math.max(900, Math.min(vw, vh * 1.7) * 1.25)) + 'px';
    draw();
  }

  function draw() {
    ring.style.transform = 'translateZ(' + (-R) + 'px) rotateY(' + (-rot).toFixed(3) + 'deg)';
    var f = rot / STEP, k = ((Math.round(f) % N) + N) % N;
    if (k !== idx) setIndex(k);
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

  /* ---- secuencia de entrada: logo grande → escala y posición → carrusel ---- */
  function startIntro() {
    layout();
    function finish() { ready = true; home.classList.add('is-ready'); html.classList.add('home-ready'); intro.style.display = 'none'; lastInput = performance.now(); }
    if (DB.reduced()) { finish(); return; }
    var w0 = intro.offsetWidth, h0 = w0 * 406 / 643;
    var tgt = $('.hdr-home .logo').getBoundingClientRect();
    var x0 = (vw - w0) / 2, y0 = (vh - h0) / 2, x1 = tgt.left, y1 = tgt.top, s1 = tgt.width / w0;
    function put(x, y, s, op, blur) {
      intro.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) scale(' + s.toFixed(4) + ')';
      intro.style.opacity = op.toFixed(3);
      intro.style.filter = blur > 0.05 ? 'blur(' + blur.toFixed(2) + 'px)' : 'none';
    }
    put(x0, y0, 0.82, 0, 14);
    rot = rotT = -2 * STEP;   // el carrusel entra girando hasta su posición
    draw();
    DB.anim(1200, DB.ease.outExpo, function (e) { put(x0, y0, DB.lerp(0.82, 1, e), e, 14 * (1 - e)); }, function () {
      setTimeout(function () {
        home.classList.add('is-ready');
        setTimeout(function () { rotT = 0; }, 250);
        DB.anim(1500, DB.ease.inOutExpo, function (e) {
          put(DB.lerp(x0, x1, e), DB.lerp(y0, y1, e), DB.lerp(1, s1, e), 1, 0);
        }, function () { finish(); });
      }, 550);
    });
  }
  document.addEventListener('dbready', startIntro);
  layout();
})();
