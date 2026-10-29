/* Vídeos: previsualización local muda en bucle + reproducción en YouTube al pulsar. */
(function () {
  'use strict';
  var DB = window.DB;
  var tiles = Array.prototype.slice.call(document.querySelectorAll('.yt'));
  if (!tiles.length) return;

  function playPreview(t, on) {
    var v = t.querySelector('video.pv'); if (!v || t.classList.contains('is-playing')) return;
    if (on) {
      if (v.preload !== 'auto') v.preload = 'auto';
      var p = v.play();
      if (p && p.then) p.then(function () { t.classList.add('is-live'); }).catch(function () {});
    } else v.pause();
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { playPreview(e.target, e.isIntersecting); });
    }, { threshold: 0.35 });
    tiles.forEach(function (t) { io.observe(t); });
  } else tiles.forEach(function (t) { playPreview(t, true); });

  tiles.forEach(function (t) {
    t.addEventListener('click', function () {
      var id = t.dataset.yt; if (!id) return;
      // desde file:// YouTube rechaza el reproductor incrustado (error 153): se abre en una pestaña nueva
      if (DB.isFile) { window.open('https://www.youtube.com/watch?v=' + id, '_blank', 'noopener'); return; }
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
      f.title = t.getAttribute('aria-label') || 'Vídeo';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      t.classList.add('is-playing');
      var v = t.querySelector('video.pv'); if (v) v.pause();
      t.appendChild(f);
    });
  });
})();
