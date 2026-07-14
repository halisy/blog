/* ------------------------------------------------------------
   The ever-shifting mood.
   Each entry's accent hue is derived from its date, so the
   palette slowly travels across the spectrum as time passes.
   The whole site takes on the hue of the newest entry.
   ------------------------------------------------------------ */

(function () {
  // days since epoch -> a hue that drifts ~11° per day (a full
  // loop roughly every 33 days, so months feel distinctly different).
  function hueFromDate(iso) {
    var t = Date.parse(iso);
    if (isNaN(t)) return 150;
    var days = Math.floor(t / 86400000);
    return ((days * 11) % 360 + 360) % 360;
  }

  // Gently vary saturation/lightness too, so it's not just a hue wheel.
  function moodFor(iso) {
    var h = hueFromDate(iso);
    var t = Date.parse(iso) || 0;
    var wobble = Math.floor(t / 86400000);
    var s = 38 + ((wobble * 7) % 14);   // 38–52%
    var l = 44 + ((wobble * 5) % 8);    // 44–52%
    return { h: h, s: s, l: l };
  }

  // Tint any element that carries its own date (cards, entries).
  var dated = document.querySelectorAll('[data-date]');
  dated.forEach(function (el) {
    var m = moodFor(el.getAttribute('data-date'));
    el.style.setProperty('--accent-h', m.h);
    el.style.setProperty('--accent-s', m.s + '%');
    el.style.setProperty('--accent-l', m.l + '%');
  });

  // The whole page adopts the newest entry's mood.
  var newest = document.querySelector('[data-date]');
  if (newest) {
    var m = moodFor(newest.getAttribute('data-date'));
    var root = document.documentElement.style;
    root.setProperty('--accent-h', m.h);
    root.setProperty('--accent-s', m.s + '%');
    root.setProperty('--accent-l', m.l + '%');
  }

  // Footer year.
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Reveal-on-scroll (respects reduced-motion via CSS fallback).
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }
})();
