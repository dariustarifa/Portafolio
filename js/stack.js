/* Visor apilado e infinito al pulsar una foto (mecánica tipo fundacion33.com).
   Rueda / arrastre / flechas desplazan la pila; es cíclica (infinita). */
(function () {
  'use strict';
  var DB = window.DB;
  var root = document.getElementById('stack');
  if (!root) return;
  var stage = document.getElementById('stage'), countEl = document.getElementById('stackCount'), veil = root.querySelector('.veil'), closeBtn = root.querySelector('.close');
  var html = document.documentElement;

  var items = [], cards = [], N = 0, pos = 0, target = 0, open = false, o = 0, oTarget = 0, fromEl = null, stop = null;
  var vw = 0, vh = 0, mob = false, snapT = null, lastWheel = 0, drag = null, startIdx = 0;

  function measure() {
    vw = window.innerWidth; vh = window.innerHeight; mob = vw < 900;
    cards.forEach(function (c, i) {
      var ar = items[i].ar;
      var maxW = mob ? vw * 0.8 : vw * 0.46, maxH = mob ? vh * 0.58 : vh * 0.64;
      var w = Math.min(maxW, maxH * ar), h = w / ar;
      c.w = w; c.h = h;
      c.el.style.width = w + 'px'; c.el.style.height = h + 'px';
    });
  }

  function build(set, idx) {
    stage.innerHTML = '';
    items = set.map(function (el) {
      var img = el.querySelector('img');
      return { el: el, src: img.currentSrc || img.src, ar: (+el.dataset.w || 1) / (+el.dataset.h || 1), rad: getComputedStyle(el).borderTopLeftRadius };
    });
    N = items.length;
    cards = items.map(function (it) {
      var d = document.createElement('div'); d.className = 'card';
      var im = document.createElement('img'); im.src = it.src; im.alt = ''; im.decoding = 'async'; im.draggable = false;
      d.appendChild(im); stage.appendChild(d);
      return { el: d, w: 1, h: 1 };
    });
    measure();
  }

  /* estado visual de cada tarjeta según su distancia d a la posición actual */
  var A = 1.12, SIDE_S = 0.8, BACK_S = 0.74;
  function place() {
    var cx = vw / 2, cy = vh / 2;
    var side = mob ? vw * 0.58 : vw * 0.31;
    for (var i = 0; i < N; i++) {
      var c = cards[i], d = DB.wrap(i - pos, N), ad = Math.abs(d), sg = d < 0 ? -1 : 1;
      var x, s, z, op, rot = 0, y = 0;
      if (ad <= 1) {
        var t = DB.ease.inOutCubic(ad);
        x = sg * side * t; s = DB.lerp(A, SIDE_S, t); z = 100 - ad * 40; op = 1; rot = sg * t * (mob ? 0 : -3);
      } else if (ad <= 2) {
        var t2 = ad - 1;
        x = sg * side * (1 - DB.ease.inOutCubic(t2)); s = DB.lerp(SIDE_S, BACK_S, t2); z = 60 - t2 * 40; op = 1 - DB.clamp((t2 - 0.35) / 0.65, 0, 1); rot = 0;
      } else { x = 0; s = BACK_S; z = 1; op = 0; }
      // apertura / cierre
      var cs = s, cxp = cx + x, cyp = cy + y, cop = op;
      if (o < 1) {
        if (i === startIdx && fromEl) {
          var r = fromEl.getBoundingClientRect();
          var e = o;
          var s0 = r.width / c.w;
          cs = DB.lerp(s0, s, e); cxp = DB.lerp(r.left + r.width / 2, cxp, e); cyp = DB.lerp(r.top + r.height / 2, cyp, e); cop = 1; z = 120;
        } else { cop = op * DB.clamp((o - 0.3) / 0.7, 0, 1); cxp = DB.lerp(cx, cxp, o); }
      }
      c.el.style.opacity = cop.toFixed(3);
      c.el.style.visibility = cop < 0.01 ? 'hidden' : 'visible';
      c.el.style.zIndex = Math.round(z);
      c.el.style.transform = 'translate3d(' + (cxp - c.w / 2).toFixed(2) + 'px,' + (cyp - c.h / 2).toFixed(2) + 'px,0) rotate(' + rot.toFixed(2) + 'deg) scale(' + cs.toFixed(4) + ')';
      c.el.style.borderRadius = items[i].rad;
    }
    var cur = ((Math.round(pos) % N) + N) % N;
    countEl.textContent = ('0' + (cur + 1)).slice(-2) + ' / ' + ('0' + N).slice(-2);
  }

  function frame(dt) {
    pos = DB.damp(pos, target, 8.5, dt);
    o = DB.damp(o, oTarget, oTarget > o ? 7 : 9, dt);
    if (Math.abs(o - oTarget) < 0.002) o = oTarget;
    if (Math.abs(pos - target) < 0.0008) pos = target;
    place();
    if (!open && o <= 0.002) finishClose();
  }

  function snap() { target = Math.round(target); }
  function nudge(dv) {
    target += dv;
    clearTimeout(snapT); snapT = setTimeout(snap, 150);
  }

  function onWheel(e) {
    if (!open) return;
    e.preventDefault();
    var d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (e.deltaMode === 1) d *= 32;
    nudge(DB.clamp(d, -160, 160) * 0.0042);
  }
  function onKey(e) {
    if (!open) return;
    if (e.key === 'Escape') { close(); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); target = Math.round(target) + 1; }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); target = Math.round(target) - 1; }
  }
  function onDown(e) {
    if (!open || e.target.closest('.ctl')) return;
    drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, id: e.pointerId, last: pos };
    try { root.setPointerCapture(e.pointerId); } catch (er) {}
  }
  function onMove(e) {
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
    if (!drag.moved) return;
    var ph = mob ? vw * 0.55 : vw * 0.3;
    var dd = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
    target = drag.last - dd / ph;
    clearTimeout(snapT);
  }
  function onUp(e) {
    if (!drag) return;
    var dt = performance.now() - drag.t, dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    var dd = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
    if (drag.moved) {
      var v = dd / Math.max(dt, 1);
      target = target - DB.clamp(v * 0.9, -2, 2) * (Math.abs(v) > 0.5 ? 1 : 0);
      snap();
    } else {
      // clic: tarjeta lateral → traerla al centro; fondo → cerrar
      var hit = e.target.closest && e.target.closest('.card');
      if (hit) {
        var i = cards.map(function (c) { return c.el; }).indexOf(hit);
        var d = DB.wrap(i - pos, N);
        if (Math.abs(d) > 0.4) target = Math.round(pos + d);
      } else close();
    }
    drag = null;
  }

  function openStack(el) {
    if (open) return;
    var setId = el.dataset.set;
    var set = Array.prototype.slice.call(document.querySelectorAll('.ph[data-set="' + setId + '"]')).sort(function (a, b) { return +a.dataset.i - +b.dataset.i; });
    if (set.length < 2) set = [el];
    build(set, 0);
    startIdx = set.indexOf(el); if (startIdx < 0) startIdx = 0;
    fromEl = el; pos = target = startIdx; o = 0; oTarget = 1; open = true;
    root.classList.add('is-open'); root.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () { root.classList.add('is-in'); });
    html.style.overflow = 'hidden';
    el.classList.add('is-gone');
    if (!stop) stop = DB.tick(frame);
    place();
  }
  function close() {
    if (!open) return;
    open = false; oTarget = 0;
    var i = ((Math.round(target) % N) + N) % N;
    startIdx = i;
    var el = items[i].el;
    // volver hacia la miniatura de la foto que está al frente
    var r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) { window.scrollTo(0, window.pageYOffset + r.top + r.height / 2 - vh / 2); }
    items.forEach(function (it) { it.el.classList.remove('is-gone'); });
    el.classList.add('is-gone'); fromEl = el;
    pos = target = i;
    root.classList.remove('is-in');
  }
  function finishClose() {
    items.forEach(function (it) { it.el.classList.remove('is-gone'); });
    root.classList.remove('is-open'); root.setAttribute('aria-hidden', 'true');
    html.style.overflow = '';
    if (stop) { stop(); stop = null; }
    stage.innerHTML = ''; cards = []; items = []; fromEl = null;
  }

  DB.openStack = openStack;
  root.addEventListener('wheel', onWheel, { passive: false });
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', onUp);
  closeBtn.addEventListener('click', close);
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', function () { if (open) measure(); });
})();
