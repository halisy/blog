/* ------------------------------------------------------------
   Photo reactions. Five quick favorites plus a "＋" that opens a
   palette to react with any emoji. Everyone's taps add up (stored
   in a Cloudflare Worker); your own taps are remembered per device.
   Dormant until window.REACTIONS.api is set in _config.yml.
   ------------------------------------------------------------ */
(function () {
  "use strict";
  var API = (window.REACTIONS && window.REACTIONS.api || "").replace(/\/$/, "");
  if (!API) return;

  var DEFAULTS = ["❤️", "🔥", "✨", "😍", "🙌"];
  var PALETTE = [
    "❤️","🔥","✨","😍","🙌","🥹","😂","🥰","😭","😅","😌","🤩","😎","🤯",
    "😮","🥳","😆","🫠","🙃","🧡","💛","💚","💙","💜","🤍","🖤","💖","💗",
    "👏","🙏","👍","💪","🤝","✌️","🫶","🤞","👀","🌟","⭐","🌈","💫","🌊",
    "🌱","🌸","🍀","☀️","🌙","🎉","🥂","☕","🍕","📸","🎶","🎨","🏆","💯","🤌","🥲"
  ];

  var mine = {};
  try { mine = JSON.parse(localStorage.getItem("field-reactions") || "{}"); } catch (e) {}
  function save() { try { localStorage.setItem("field-reactions", JSON.stringify(mine)); } catch (e) {} }

  function setCount(btn, c) {
    var n = btn.querySelector(".rx-n");
    n.textContent = c > 0 ? c : "";
    btn.classList.toggle("has", c > 0);
  }

  function floatEmoji(btn, emoji) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var r = btn.getBoundingClientRect();
    var s = document.createElement("span");
    s.className = "rx-float"; s.textContent = emoji;
    s.style.left = (r.left + r.width / 2) + "px";
    s.style.top = r.top + "px";
    document.body.appendChild(s);
    setTimeout(function () { s.remove(); }, 1200);
  }

  function reactCall(key, emoji, delta) {
    return fetch(API + "/react", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: key, emoji: emoji, delta: delta }),
    }).then(function (r) { return r.json(); });
  }

  function makeChip(bar, key, emoji) {
    if (bar._btns[emoji]) return bar._btns[emoji];
    var b = document.createElement("button");
    b.type = "button"; b.className = "react";
    b.dataset.key = key; b.dataset.emoji = emoji;
    b.setAttribute("aria-label", "react " + emoji);
    b.innerHTML = '<span class="rx-e"></span><span class="rx-n"></span>';
    b.querySelector(".rx-e").textContent = emoji;
    if (mine[key] && mine[key][emoji]) b.classList.add("on");
    b.addEventListener("click", function () { toggle(b); });
    bar._btns[emoji] = b;
    return b;
  }
  function ensureChip(bar, key, emoji) {
    if (bar._btns[emoji]) return bar._btns[emoji];
    var b = makeChip(bar, key, emoji);
    bar.insertBefore(b, bar._add);
    return b;
  }

  function toggle(btn) {
    var key = btn.dataset.key, emoji = btn.dataset.emoji;
    mine[key] = mine[key] || {};
    var was = !!mine[key][emoji];
    var delta = was ? -1 : 1;
    if (was) delete mine[key][emoji]; else mine[key][emoji] = 1;
    save();
    btn.classList.toggle("on", !was);
    var n = btn.querySelector(".rx-n");
    setCount(btn, Math.max(0, (parseInt(n.textContent || "0", 10) || 0) + delta));
    if (!was) floatEmoji(btn, emoji);
    reactCall(key, emoji, delta)
      .then(function (res) { if (res && res.counts) setCount(btn, res.counts[emoji] || 0); })
      .catch(function () {});
  }

  function loadCounts(keys, container) {
    fetch(API + "/counts?keys=" + encodeURIComponent(keys.join(",")))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        container.querySelectorAll(".reactions").forEach(function (bar) {
          var counts = data[bar._key] || {};
          Object.keys(counts).forEach(function (e) { ensureChip(bar, bar._key, e); });
          Object.keys(bar._btns).forEach(function (e) { setCount(bar._btns[e], counts[e] || 0); });
        });
      }).catch(function () {});
  }

  // ---- palette ("＋") ----
  var paletteEl = null, reader = null;
  function closePalette() {
    if (!paletteEl) return;
    paletteEl.remove(); paletteEl = null;
    document.removeEventListener("click", onDocClick, true);
    document.removeEventListener("keydown", onEsc, true);
    if (reader) reader.removeEventListener("scroll", closePalette);
  }
  function onDocClick(e) { if (paletteEl && !paletteEl.contains(e.target)) closePalette(); }
  function onEsc(e) { if (e.key === "Escape") closePalette(); }

  function openPalette(anchor, bar, key) {
    closePalette();
    var p = document.createElement("div");
    p.className = "rx-palette";
    PALETTE.forEach(function (e) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "rx-pick"; b.textContent = e;
      b.addEventListener("click", function (ev) {
        ev.stopPropagation();
        var chip = ensureChip(bar, key, e);
        if (!(mine[key] && mine[key][e])) toggle(chip); else floatEmoji(chip, e);
        closePalette();
      });
      p.appendChild(b);
    });
    document.body.appendChild(p);
    var r = anchor.getBoundingClientRect();
    var pw = Math.min(324, window.innerWidth - 24);
    p.style.width = pw + "px";
    p.style.left = Math.min(Math.max(12, r.left), window.innerWidth - pw - 12) + "px";
    p.style.top = (r.bottom + 8) + "px";
    requestAnimationFrame(function () {
      var pr = p.getBoundingClientRect();
      if (pr.bottom > window.innerHeight - 12) p.style.top = Math.max(12, r.top - pr.height - 8) + "px";
    });
    paletteEl = p;
    reader = document.getElementById("reader");
    setTimeout(function () {
      document.addEventListener("click", onDocClick, true);
      document.addEventListener("keydown", onEsc, true);
      if (reader) reader.addEventListener("scroll", closePalette);
    }, 0);
  }

  window.initReactions = function (container) {
    var keys = [];
    container.querySelectorAll(".ph").forEach(function (f) {
      if (f.querySelector(".reactions")) return;
      var img = f.querySelector("img"); if (!img) return;
      var key = img.getAttribute("src"); keys.push(key);
      var bar = document.createElement("div");
      bar.className = "reactions"; bar._key = key; bar._btns = {};
      DEFAULTS.forEach(function (e) { bar.appendChild(makeChip(bar, key, e)); });
      Object.keys(mine[key] || {}).forEach(function (e) { if (!bar._btns[e]) bar.appendChild(makeChip(bar, key, e)); });
      var add = document.createElement("button");
      add.type = "button"; add.className = "react react-add"; add.textContent = "＋";
      add.setAttribute("aria-label", "add a reaction");
      add.addEventListener("click", function (ev) { ev.stopPropagation(); openPalette(add, bar, key); });
      bar._add = add; bar.appendChild(add);
      f.appendChild(bar);
    });
    if (keys.length) loadCounts(keys, container);
  };
})();
