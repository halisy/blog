/* ============================================================
   THE FIELD
   Moments scattered in a foggy space. You drag to wander.
   - Pull a moment toward the center and it comes into focus,
     its words surfacing (the "glimpse").
   - Click the centered moment to open it fully (the "meaning").
   - Newest moment sits at the center when you arrive.
   - Wander outward and you travel back through time.
   ============================================================ */

(function () {
  "use strict";

  var BASE = (window.SITE && window.SITE.baseurl) || "";
  var world = document.getElementById("world");
  var field = document.getElementById("field");
  var hintEl = document.getElementById("hint");

  var GOLDEN = Math.PI * (3 - Math.sqrt(5)); // ~2.39996 — phyllotaxis angle
  var SPREAD = 250;      // how far apart moments sit
  var FOCUS_R = 430;     // within this radius of center, a moment starts waking
  var HERE_R = 130;      // within this, it's THE one — click opens it

  var moments = [];      // { data, el, home:{x,y} }
  var off = { x: 0, y: 0 };     // current pan offset
  var target = { x: 0, y: 0 };  // where we're gliding to
  var vel = { x: 0, y: 0 };
  var gliding = false, dragging = false, dirty = true;
  var hereIndex = -1;

  // ---- tiny deterministic hash so a moment's spot never jumps between visits
  function hash(str, salt) {
    var h = 2166136261 ^ (salt || 0);
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 100000) / 100000; // 0..1
  }

  function hueFromISO(iso) {
    var t = Date.parse(iso);
    if (isNaN(t)) return 210;
    var days = Math.floor(t / 86400000);
    return ((days * 11) % 360 + 360) % 360;
  }

  // ---- boot
  fetch(BASE + "/data.json", { cache: "no-cache" })
    .then(function (r) { return r.json(); })
    .then(build)
    .catch(function () { showEmpty("Couldn't load the field."); });

  function build(data) {
    var entries = (data && data.entries) || [];
    if (!entries.length) { showEmpty("Nothing here yet 🌱  — your first moment will appear at the center."); return; }

    // the whole space takes on the newest moment's mood
    document.documentElement.style.setProperty("--hue", hueFromISO(entries[0].dateISO));

    entries.forEach(function (d, i) {
      var seed = d.dateISO + d.title;
      var r = SPREAD * Math.sqrt(i);
      var a = i * GOLDEN + (hash(seed, 1) - 0.5) * 0.6;
      var jx = (hash(seed, 2) - 0.5) * 90;
      var jy = (hash(seed, 3) - 0.5) * 90;
      var home = { x: Math.cos(a) * r + jx, y: Math.sin(a) * r + jy };

      var w = 150 + Math.round(hash(seed, 4) * 130);        // 150–280px, collage variety
      var bob = -(4 + hash(seed, 5) * 7).toFixed(2);        // gentle float
      var bd = (6 + hash(seed, 6) * 6).toFixed(2);
      var bdl = (-hash(seed, 7) * 8).toFixed(2);

      var el = document.createElement("button");
      el.className = "moment";
      el.style.setProperty("--w", w + "px");
      el.style.setProperty("--bob", bob + "px");
      el.style.setProperty("--bd", bd + "s");
      el.style.setProperty("--bdl", bdl + "s");
      el.style.transform = "translate(-50%,-50%) translate(" + home.x.toFixed(1) + "px," + home.y.toFixed(1) + "px)";
      el.setAttribute("aria-label", d.title + " — " + d.dateLabel);

      var cover = d.cover
        ? '<img src="' + d.cover + '" alt="" loading="lazy" draggable="false">'
        : '<span class="blank"></span>';
      el.innerHTML =
        '<span class="moment-frame">' + cover + '</span>' +
        '<span class="moment-words">' +
          '<span class="moment-date">' + d.dateLabel + '</span>' +
          '<span class="moment-title">' + escapeHTML(d.title) + '</span>' +
          '<span class="moment-cue">open →</span>' +
        '</span>';

      var idx = i;
      el.addEventListener("click", function (e) {
        if (moved) return;                 // it was a drag, not a tap
        if (idx === hereIndex) openReader(idx);
        else glideTo(idx);                 // not centered yet → approach it first
      });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openReader(idx); }
      });

      moments.push({ data: d, el: el, frame: el.querySelector(".moment-frame"), home: home });
      world.appendChild(el);
    });

    setupChrome(entries);
    setupPan();
    // Paint a correct, focused state immediately — don't wait on the first
    // animation frame (some embedded/background views throttle rAF).
    world.style.transform = "translate(0px,0px)";
    updateFocus();
    requestAnimationFrame(loop);
  }

  // ---- the animation loop
  var moved = false;
  function loop() {
    if (gliding) {
      off.x += (target.x - off.x) * 0.12;
      off.y += (target.y - off.y) * 0.12;
      if (Math.abs(target.x - off.x) < 0.4 && Math.abs(target.y - off.y) < 0.4) { off.x = target.x; off.y = target.y; gliding = false; }
    } else if (!dragging && (Math.abs(vel.x) > 0.04 || Math.abs(vel.y) > 0.04)) {
      off.x += vel.x; off.y += vel.y; vel.x *= 0.93; vel.y *= 0.93;
    }
    // Recompute every frame — cheap for a notebook's worth of moments, and it means
    // the field can never get stuck in a stale/dark state after a late image decode.
    world.style.transform = "translate(" + off.x.toFixed(1) + "px," + off.y.toFixed(1) + "px)";
    updateFocus();
    requestAnimationFrame(loop);
  }

  function updateFocus() {
    var best = -1, bestD = Infinity;
    for (var i = 0; i < moments.length; i++) {
      var m = moments[i];
      var dx = m.home.x + off.x, dy = m.home.y + off.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      var f = Math.max(0, Math.min(1, 1 - d / FOCUS_R));
      var fe = f * f * (3 - 2 * f); // smoothstep
      m.el.style.setProperty("--focus", fe.toFixed(3));
      m.el.style.opacity = (0.34 + 0.66 * fe).toFixed(3);
      // depth treatment on the image only — keeps surfaced words crisp
      m.frame.style.filter =
        "blur(" + ((1 - fe) * 2.6).toFixed(2) + "px) " +
        "saturate(" + (0.5 + 0.5 * fe).toFixed(2) + ") " +
        "brightness(" + (0.38 + 0.62 * fe).toFixed(2) + ")";
      m.el.style.zIndex = Math.round(fe * 100);
      if (fe > 0.5) m.el.classList.add("awake"); else m.el.classList.remove("awake");
      if (d < bestD) { bestD = d; best = i; }
    }
    var newHere = bestD < HERE_R ? best : -1;
    if (newHere !== hereIndex) {
      if (hereIndex >= 0 && moments[hereIndex]) moments[hereIndex].el.classList.remove("here");
      if (newHere >= 0) moments[newHere].el.classList.add("here");
      hereIndex = newHere;
    }
  }

  // ---- panning (pointer + wheel)
  // Note: we listen on window (not pointer-capture) so a click on a tile still
  // reaches the tile — pointer capture would steal the click event.
  function setupPan() {
    var startX = 0, startY = 0, lastX = 0, lastY = 0, downOff = null;

    field.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      dragging = true; moved = false; gliding = false; vel.x = vel.y = 0;
      startX = lastX = e.clientX; startY = lastY = e.clientY;
      downOff = { x: off.x, y: off.y };
      field.classList.add("dragging");
    });
    window.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      vel.x = dx; vel.y = dy;
      lastX = e.clientX; lastY = e.clientY;
      off.x = downOff.x + (e.clientX - startX);
      off.y = downOff.y + (e.clientY - startY);
      if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 6) { moved = true; dismissHint(); }
      dirty = true;
    });
    function end() {
      if (!dragging) return;
      dragging = false; field.classList.remove("dragging");
    }
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);

    field.addEventListener("wheel", function (e) {
      e.preventDefault();
      gliding = false;
      off.x -= e.deltaX; off.y -= e.deltaY;
      vel.x = -e.deltaX * 0.3; vel.y = -e.deltaY * 0.3;
      dismissHint(); dirty = true;
    }, { passive: false });
  }

  function glideTo(i) {
    var m = moments[i]; if (!m) return;
    target.x = -m.home.x; target.y = -m.home.y; gliding = true; dismissHint();
  }

  function dismissHint() { if (hintEl && !hintEl.classList.contains("gone")) hintEl.classList.add("gone"); }

  // ---- the reader (meaning layer)
  var reader = document.getElementById("reader");
  var readerInner = document.getElementById("readerInner");
  var allEntries = [];

  function openReader(i) {
    var d = allEntries[i]; if (!d) return;
    var older = allEntries[i + 1], newer = allEntries[i - 1];

    // Pull every picture out of the note and show them together as one organic,
    // floating gallery — so a handful of photos "give an impression".
    var tmp = document.createElement("div");
    tmp.innerHTML = d.html || "";
    var pics = [];
    if (d.cover) pics.push({ src: withBase(d.cover), cap: d.cover_caption || "" });
    [].slice.call(tmp.querySelectorAll("img")).forEach(function (img) {
      pics.push({ src: withBase(img.getAttribute("src")), cap: img.getAttribute("alt") || "" });
      img.remove();
    });
    // drop paragraphs left empty after their image was removed
    [].slice.call(tmp.querySelectorAll("p")).forEach(function (p) { if (!p.textContent.trim()) p.remove(); });
    var textHTML = tmp.innerHTML;

    var gallery = "";
    if (pics.length) {
      var fig = function (p, cls) {
        return '<figure class="ph' + (cls ? " " + cls : "") + '">' +
          '<img src="' + p.src + '" alt="' + escapeHTML(p.cap) + '" loading="lazy" draggable="false">' +
          (p.cap ? '<figcaption>' + escapeHTML(p.cap) + '</figcaption>' : '') +
          '</figure>';
      };
      if (pics.length <= 2) {
        // one or two photos: show them large, full width, stacked
        gallery = '<div class="reader-gallery">' + pics.map(function (p) { return fig(p, "full"); }).join("") + '</div>';
      } else {
        // three or more: a full-width lead, then the rest in a tidy grid
        gallery = '<div class="reader-gallery">' + fig(pics[0], "full lead") +
          '<div class="ph-grid">' + pics.slice(1).map(function (p) { return fig(p, ""); }).join("") + '</div></div>';
      }
    }

    readerInner.innerHTML =
      '<div class="reader-date">' + escapeHTML(d.dateLabel) + (d.place ? ' · <span class="reader-place">' + escapeHTML(d.place) + '</span>' : '') + '</div>' +
      '<h1 class="reader-title">' + escapeHTML(d.title) + '</h1>' +
      (textHTML.trim() ? '<div class="reader-body">' + textHTML + '</div>' : '') +
      gallery +
      '<div class="reader-nav">' +
        (older ? '<button data-go="' + (i + 1) + '"><span class="rn-dir">← earlier</span>' + escapeHTML(older.title) + '</button>' : '<span></span>') +
        (newer ? '<button class="next" data-go="' + (i - 1) + '"><span class="rn-dir">later →</span>' + escapeHTML(newer.title) + '</button>' : '<span></span>') +
      '</div>';
    readerInner.querySelectorAll("[data-go]").forEach(function (b) {
      b.addEventListener("click", function () { openReader(parseInt(b.getAttribute("data-go"), 10)); reader.scrollTop = 0; });
    });
    reader.hidden = false;
    requestAnimationFrame(function () { reader.classList.add("open"); });
    document.body.style.overflow = "hidden";
  }
  function closeReader() {
    reader.classList.remove("open");
    setTimeout(function () { reader.hidden = true; readerInner.innerHTML = ""; }, 480);
  }
  document.getElementById("readerClose").addEventListener("click", closeReader);
  reader.addEventListener("click", function (e) { if (e.target === reader) closeReader(); });

  // ---- index panel + chrome
  function setupChrome(entries) {
    allEntries = entries;
    var panel = document.getElementById("indexPanel");
    var openBtn = document.getElementById("indexBtn");
    var closeBtn = document.getElementById("indexClose");

    function openPanel() { panel.hidden = false; requestAnimationFrame(function () { panel.classList.add("open"); }); }
    function closePanel() { panel.classList.remove("open"); setTimeout(function () { panel.hidden = true; }, 380); }
    openBtn.addEventListener("click", openPanel);
    closeBtn.addEventListener("click", closePanel);

    panel.querySelectorAll(".index-item").forEach(function (btn, i) {
      btn.addEventListener("click", function () { closePanel(); openReader(i); });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (!reader.hidden) closeReader();
        else if (!panel.hidden) closePanel();
      }
    });
  }

  // ---- helpers
  // Prefix a root-absolute path with the site's baseurl (e.g. "/assets/x.jpg" -> "/blog/assets/x.jpg"),
  // so images written inside posts resolve when the site is served from a subpath.
  function withBase(src) {
    if (!src) return src;
    if (BASE && src.charAt(0) === "/" && src.indexOf(BASE + "/") !== 0) return BASE + src;
    return src;
  }
  function escapeHTML(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function showEmpty(msg) {
    var d = document.createElement("div");
    d.className = "field-empty";
    d.innerHTML = "<div><h1>" + escapeHTML(msg) + "</h1></div>";
    document.body.appendChild(d);
    if (hintEl) hintEl.style.display = "none";
  }
})();
