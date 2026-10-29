/* Motor mínimo de animación: bucle rAF único, muelles y utilidades. */
(function () {
  'use strict';
  var DB = (window.DB = window.DB || {});

  DB.clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  DB.lerp = function (a, b, t) { return a + (b - a) * t; };
  DB.map = function (v, a, b, c, d) { return c + ((v - a) / (b - a)) * (d - c); };
  DB.damp = function (cur, target, lambda, dt) { return cur + (target - cur) * (1 - Math.exp(-lambda * dt)); };
  DB.ease = {
    outExpo: function (t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); },
    inOutExpo: function (t) { return t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2; },
    inOutCubic: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    outCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    inOutQuart: function (t) { return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; }
  };

  DB.isMobile = function () { return window.matchMedia('(max-width: 899px)').matches; };
  DB.fine = function () { return window.matchMedia('(hover: hover) and (pointer: fine)').matches; };
  DB.reduced = function () { return document.documentElement.classList.contains('reduce'); };
  DB.isFile = location.protocol === 'file:';

  /* bucle rAF compartido */
  var tickers = [];
  var last = 0, running = false;
  function loop(now) {
    var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    for (var i = 0; i < tickers.length; i++) {
      try { tickers[i](dt, now); } catch (e) { console.error(e); }
    }
    if (tickers.length) requestAnimationFrame(loop); else running = false;
  }
  DB.tick = function (fn) {
    tickers.push(fn);
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
    return function () { var i = tickers.indexOf(fn); if (i > -1) tickers.splice(i, 1); };
  };

  /* muelle amortiguado (integración semi-implícita con subpasos) */
  DB.Spring = function (v, k, d) {
    this.v = v; this.t = v; this.x = 0; this.k = k || 200; this.d = d || 18;
  };
  DB.Spring.prototype.step = function (dt) {
    var n = Math.ceil(dt / 0.008), h = dt / n;
    for (var i = 0; i < n; i++) {
      var a = this.k * (this.t - this.v) - this.d * this.x;
      this.x += a * h;
      this.v += this.x * h;
    }
    return this.v;
  };
  DB.Spring.prototype.rest = function () { return Math.abs(this.t - this.v) < 0.0006 && Math.abs(this.x) < 0.0006; };
  DB.Spring.prototype.snap = function (v) { this.v = this.t = v; this.x = 0; };

  /* animación por tiempo */
  DB.anim = function (ms, ease, fn, done) {
    var t0 = performance.now(), stop;
    ease = ease || DB.ease.inOutCubic;
    stop = DB.tick(function (dt, now) {
      var p = DB.clamp((now - t0) / ms, 0, 1);
      fn(ease(p), p);
      if (p >= 1) { stop(); if (done) done(); }
    });
    return stop;
  };

  /* wrap en (-n/2, n/2] */
  DB.wrap = function (x, n) { return ((((x + n / 2) % n) + n) % n) - n / 2; };
})();
