/* Rejilla de fotos: recolocado 3→2 columnas en móvil y hover "vivo" (muelles 3D). */
(function () {
  'use strict';
  var DB = window.DB;
  var photos = Array.prototype.slice.call(document.querySelectorAll('.ph'));
  if (!photos.length) return;

  /* ---------------------------------------------------------------- */
  /* Reparto en columnas                                                */
  /* ---------------------------------------------------------------- */
  var gals = Array.prototype.slice.call(document.querySelectorAll('.gal'));
  gals.forEach(function (g) { g._cols = Array.prototype.slice.call(g.querySelectorAll(':scope > .col')); g._items = Array.prototype.slice.call(g.querySelectorAll('.col .ph')); });
  var mode = null;
  function layout() {
    var m = DB.isMobile() ? 2 : 3;
    if (m === mode) return; mode = m;
    gals.forEach(function (g) {
      var items = g._items.slice();
      var cols = g._cols;
      if (m === 3) {
        items.sort(function (a, b) { return (+a.dataset.c - +b.dataset.c) || (+a.dataset.y - +b.dataset.y); });
        items.forEach(function (it) { cols[+it.dataset.c].appendChild(it); });
      } else {
        items.sort(function (a, b) { return (+a.dataset.y - +b.dataset.y) || (+a.dataset.c - +b.dataset.c); });
        var hs = [0, 0];
        items.forEach(function (it) {
          var h = +it.dataset.h / +it.dataset.w;
          var k = hs[0] <= hs[1] ? 0 : 1;
          cols[k].appendChild(it); hs[k] += h + 0.04;
        });
      }
    });
  }
  layout();
  window.matchMedia('(max-width: 899px)').addEventListener
    ? window.matchMedia('(max-width: 899px)').addEventListener('change', layout)
    : window.addEventListener('resize', layout);

  /* ---------------------------------------------------------------- */
  /* Hover vivo: la foto crece, se inclina hacia el cursor y se retuerce */
  /* con un muelle subamortiguado al entrar, moverse y salir.            */
  /* ---------------------------------------------------------------- */
  if (!DB.fine()) { bindClicks(); return; }

  var live = new Set();
  var stopLoop = null;

  function Card(el) {
    this.el = el;
    this.pf = el.querySelector('.pf');
    this.img = el.querySelector('img');
    this.hero = el.classList.contains('hero');
    var K = 190, D = 13;
    this.s = new DB.Spring(1, K, D);       // escala
    this.rx = new DB.Spring(0, 170, 11);   // giro X
    this.ry = new DB.Spring(0, 170, 11);   // giro Y
    this.rz = new DB.Spring(0, 130, 8.5);  // retorcido (giro Z) — el más "vivo"
    this.sk = new DB.Spring(0, 150, 9);    // sesgo horizontal
    this.tx = new DB.Spring(0, 160, 13);
    this.ty = new DB.Spring(0, 160, 13);
    this.is = new DB.Spring(1, 140, 14);   // zoom interior
    this.ix = new DB.Spring(0, 140, 15);
    this.iy = new DB.Spring(0, 140, 15);
    this.sh = new DB.Spring(0, 120, 16);   // sombra
    this.hover = false;
    this.px = 0; this.py = 0; this.lx = 0; this.ly = 0; this.vx = 0; this.vy = 0; this.w = 1; this.h = 1;
  }
  var cards = new Map();
  function card(el) { var c = cards.get(el); if (!c) { c = new Card(el); cards.set(el, c); } return c; }

  function setTargets(c, nx, ny) {
    var k = c.hero ? 0.35 : 1;
    c.s.t = c.hero ? 1.018 : 1.085;
    c.rx.t = -ny * 11 * k;
    c.ry.t = nx * 14 * k;
    // retorcido: depende del cuadrante del cursor y de la velocidad del puntero
    c.rz.t = (nx * ny * 5.5 + DB.clamp(c.vx * 0.05, -4, 4)) * k;
    c.sk.t = DB.clamp(c.vx * -0.04, -4, 4) * k;
    c.tx.t = nx * 0.022 * c.w * k;
    c.ty.t = ny * 0.022 * c.h * k;
    c.is.t = c.hero ? 1.05 : 1.16;
    c.ix.t = -nx * 0.035 * c.w * k;
    c.iy.t = -ny * 0.035 * c.h * k;
    c.sh.t = 0.55;
  }
  function release(c) {
    c.s.t = 1; c.rx.t = c.ry.t = c.rz.t = c.sk.t = c.tx.t = c.ty.t = 0; c.is.t = 1; c.ix.t = c.iy.t = 0; c.sh.t = 0;
  }

  function frame(dt) {
    live.forEach(function (c) {
      c.s.step(dt); c.rx.step(dt); c.ry.step(dt); c.rz.step(dt); c.sk.step(dt); c.tx.step(dt); c.ty.step(dt);
      c.is.step(dt); c.ix.step(dt); c.iy.step(dt); c.sh.step(dt);
      // la velocidad del puntero decae para que el retorcido vuelva solo
      if (c.hover) { c.vx *= 0.9; c.vy *= 0.9; setTargetsFromPointer(c); }
      c.el.style.transform = 'perspective(1100px) translate3d(' + c.tx.v.toFixed(2) + 'px,' + c.ty.v.toFixed(2) + 'px,0) rotateX(' + c.rx.v.toFixed(3) + 'deg) rotateY(' + c.ry.v.toFixed(3) +
        'deg) rotateZ(' + c.rz.v.toFixed(3) + 'deg) skewX(' + c.sk.v.toFixed(3) + 'deg) scale(' + c.s.v.toFixed(4) + ')';
      c.el.style.setProperty('--sh', Math.max(0, c.sh.v).toFixed(3));
      if (c.pf.classList.contains('done') && c.img) c.img.style.transform = 'translate3d(' + c.ix.v.toFixed(2) + 'px,' + c.iy.v.toFixed(2) + 'px,0) scale(' + c.is.v.toFixed(4) + ')';
      if (!c.hover && c.s.rest() && c.rx.rest() && c.ry.rest() && c.rz.rest() && c.sk.rest() && c.tx.rest() && c.ty.rest() && c.is.rest() && c.ix.rest() && c.iy.rest() && c.sh.rest()) {
        c.el.style.transform = ''; c.el.style.removeProperty('--sh'); c.el.classList.remove('is-lift');
        if (c.img) c.img.style.transform = '';
        live.delete(c);
      }
    });
    if (!live.size && stopLoop) { stopLoop(); stopLoop = null; }
  }
  function wake(c) {
    live.add(c);
    if (!stopLoop) stopLoop = DB.tick(frame);
  }
  function setTargetsFromPointer(c) {
    setTargets(c, c.px, c.py);
  }

  photos.forEach(function (el) {
    el.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      var c = card(el), r = el.getBoundingClientRect();
      c.w = r.width; c.h = r.height; c.hover = true;
      c.lx = e.clientX; c.ly = e.clientY; c.vx = c.vy = 0;
      var nx = DB.clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1), ny = DB.clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      c.px = nx; c.py = ny;
      // impulso de entrada: pequeño retorcido inicial según por dónde entra el cursor
      c.rz.x += nx * -60 * (c.hero ? 0.3 : 1); c.rx.x += ny * 34 * (c.hero ? 0.3 : 1); c.s.x += c.hero ? 0.18 : 0.9;
      el.classList.add('is-lift');
      setTargets(c, nx, ny);
      wake(c);
    });
    el.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var c = card(el), r = el.getBoundingClientRect();
      c.w = r.width; c.h = r.height;
      c.vx = DB.clamp(c.vx * 0.6 + (e.clientX - c.lx) * 0.4, -80, 80); c.vy = DB.clamp(c.vy * 0.6 + (e.clientY - c.ly) * 0.4, -80, 80);
      c.lx = e.clientX; c.ly = e.clientY;
      c.px = DB.clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      c.py = DB.clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      if (!live.has(c)) wake(c);
    });
    el.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse') return;
      var c = card(el);
      c.hover = false;
      // al salir, impulso contrario → rebote subamortiguado
      c.rz.x += DB.clamp(c.vx * -1.4, -50, 50) + (c.px >= 0 ? -22 : 22); c.s.x -= 0.4;
      release(c); wake(c);
    });
  });

  bindClicks();

  /* ---------------------------------------------------------------- */
  /* Clic / toque → pila infinita                                        */
  /* ---------------------------------------------------------------- */
  function bindClicks() {
    photos.forEach(function (el) {
      var sx = 0, sy = 0, moved = false;
      el.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; moved = false; });
      el.addEventListener('pointermove', function (e) { if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 8) moved = true; });
      el.addEventListener('click', function (e) {
        e.preventDefault();
        if (moved) return;
        if (DB.openStack) DB.openStack(el);
      });
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (DB.openStack) DB.openStack(el); } });
    });
  }
})();
