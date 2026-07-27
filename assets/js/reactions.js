/* ------------------------------------------------------------
   Photo reactions, Telegram/WhatsApp style.
   A photo shows only the reactions it actually has (as compact
   chips), plus a small "add" button. Tapping it springs open a
   quick-reactions pill (5 favorites + ＋ for the full palette).
   Everyone's taps add up (Cloudflare Worker); your own are
   remembered per device. Dormant until window.REACTIONS.api set.
   ------------------------------------------------------------ */
(function () {
  "use strict";
  var API = (window.REACTIONS && window.REACTIONS.api || "").replace(/\/$/, "");
  if (!API) return;

  var QUICK = ["❤️", "🔥", "✨", "😍", "🙌"];
  var PALETTE = [
    "❤️","🔥","✨","😍","🙌","🥹","😂","🥰","😭","😅","😌","🤩","😎","🤯",
    "😮","🥳","😆","🫠","🙃","🧡","💛","💚","💙","💜","🤍","🖤","💖","💗",
    "👏","🙏","👍","💪","🤝","✌️","🫶","🤞","👀","🌟","⭐","🌈","💫","🌊",
    "🌱","🌸","🍀","☀️","🌙","🎉","🥂","☕","🍕","📸","🎶","🎨","🏆","💯","🤌","🥲"
  ];
  var ADD_ICON =
    '<svg viewBox="0 0 26 26" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="11" cy="13" r="8.3"/><path d="M8 11.6v.01M14 11.6v.01"/>' +
    '<path d="M8 15.4c.9 1 1.9 1.5 3 1.5s2.1-.5 3-1.5"/><path d="M20 3.5v5M17.5 6h5"/></svg>';

  var mine = {};
  try { mine = JSON.parse(localStorage.getItem("field-reactions") || "{}"); } catch (e) {}
  function save() { try { localStorage.setItem("field-reactions", JSON.stringify(mine)); } catch (e) {} }

  function setCount(btn, c) { btn.querySelector(".rx-n").textContent = c > 0 ? c : ""; }
  function reactCall(key, emoji, delta) {
    return fetch(API + "/react", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: key, emoji: emoji, delta: delta }),
    }).then(function (r) { return r.json(); });
  }
  function floatEmoji(ref, emoji) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var r = ref.getBoundingClientRect();
    var s = document.createElement("span");
    s.className = "rx-float"; s.textContent = emoji;
    s.style.left = (r.left + r.width / 2) + "px"; s.style.top = r.top + "px";
    document.body.appendChild(s);
    setTimeout(function () { s.remove(); }, 1100);
  }

  function makeChip(bar, key, emoji) {
    if (bar._btns[emoji]) return bar._btns[emoji];
    var b = document.createElement("button");
    b.type = "button"; b.className = "rx-chip"; b.dataset.key = key; b.dataset.emoji = emoji;
    b.setAttribute("aria-label", "react " + emoji);
    b.innerHTML = '<span class="rx-e">' + emoji + '</span><span class="rx-n"></span>';
    if (mine[key] && mine[key][emoji]) b.classList.add("on");
    b.addEventListener("click", function () { toggle(b); });
    bar._btns[emoji] = b;
    bar.insertBefore(b, bar._add);
    return b;
  }
  function removeChip(btn) {
    var bar = btn.parentNode; if (!bar) return;
    delete bar._btns[btn.dataset.emoji];
    btn.remove();
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
    var next = Math.max(0, (parseInt(n.textContent || "0", 10) || 0) + delta);
    setCount(btn, next);
    btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop");
    if (!was) floatEmoji(btn, emoji);
    reactCall(key, emoji, delta).then(function (res) {
      if (!res || !res.counts) return;
      var c = res.counts[emoji] || 0;
      setCount(btn, c);
      if (c <= 0 && !(mine[key] && mine[key][emoji])) removeChip(btn);
    }).catch(function () {});
  }

  function addReaction(bar, key, emoji) {
    var chip = makeChip(bar, key, emoji);
    if (mine[key] && mine[key][emoji]) { floatEmoji(chip, emoji); return; } // already reacted
    toggle(chip);
  }

  // ---- pop-ups (quick pill + full palette) ----
  var quickEl = null, palEl = null, reader = null;
  function closeAll() { closeEl("quick"); closeEl("pal"); }
  function closeEl(which) {
    var el = which === "quick" ? quickEl : palEl;
    if (!el) return;
    el.classList.remove("in");
    setTimeout(function () { el.remove(); }, 180);
    if (which === "quick") quickEl = null; else palEl = null;
    if (!quickEl && !palEl) detachClose();
  }
  function position(el, anchor) {
    var r = anchor.getBoundingClientRect();
    var w = el.offsetWidth, h = el.offsetHeight; // reading these also forces the reflow that arms the transition
    el.style.left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12) + "px";
    var top = r.top - h - 10;
    if (top < 12) top = r.bottom + 10;
    el.style.top = Math.min(Math.max(12, top), window.innerHeight - h - 12) + "px";
  }
  function attachClose() {
    setTimeout(function () {
      document.addEventListener("click", onDoc, true);
      document.addEventListener("keydown", onEsc, true);
      reader = document.getElementById("reader");
      if (reader) reader.addEventListener("scroll", closeAll);
    }, 0);
  }
  function detachClose() {
    document.removeEventListener("click", onDoc, true);
    document.removeEventListener("keydown", onEsc, true);
    if (reader) { reader.removeEventListener("scroll", closeAll); reader = null; }
  }
  function onDoc(e) {
    if (quickEl && !quickEl.contains(e.target)) closeEl("quick");
    if (palEl && !palEl.contains(e.target)) closeEl("pal");
  }
  function onEsc(e) { if (e.key === "Escape") closeAll(); }

  function openQuick(anchor, bar, key) {
    closeAll();
    var q = document.createElement("div"); q.className = "rx-quick";
    QUICK.forEach(function (e, i) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "rx-q"; b.textContent = e; b.style.setProperty("--i", i);
      b.addEventListener("click", function (ev) { ev.stopPropagation(); addReaction(bar, key, e); closeEl("quick"); });
      q.appendChild(b);
    });
    var more = document.createElement("button");
    more.type = "button"; more.className = "rx-q rx-more"; more.textContent = "＋";
    more.style.setProperty("--i", QUICK.length); more.setAttribute("aria-label", "more emojis");
    more.addEventListener("click", function (ev) { ev.stopPropagation(); closeEl("quick"); openPalette(anchor, bar, key); });
    q.appendChild(more);
    document.body.appendChild(q);
    position(q, anchor);          // forces reflow (commits the pre-animation state)
    q.classList.add("in");        // now the transition to "in" fires (no rAF needed)
    quickEl = q; attachClose();
  }

  function openPalette(anchor, bar, key) {
    closeAll();
    var p = document.createElement("div"); p.className = "rx-palette";
    p.style.width = Math.min(324, window.innerWidth - 24) + "px";
    PALETTE.forEach(function (e) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "rx-pick"; b.textContent = e;
      b.addEventListener("click", function (ev) { ev.stopPropagation(); addReaction(bar, key, e); closeEl("pal"); });
      p.appendChild(b);
    });
    document.body.appendChild(p);
    position(p, anchor);
    p.classList.add("in");
    palEl = p; attachClose();
  }

  function loadCounts(keys, container) {
    fetch(API + "/counts?keys=" + encodeURIComponent(keys.join(",")))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        container.querySelectorAll(".reactions").forEach(function (bar) {
          var counts = data[bar._key] || {};
          Object.keys(counts).forEach(function (e) { if (counts[e] > 0) setCount(makeChip(bar, bar._key, e), counts[e]); });
          Object.keys(bar._btns).forEach(function (e) { setCount(bar._btns[e], counts[e] || 0); });
        });
      }).catch(function () {});
  }

  window.initReactions = function (container) {
    var keys = [];
    container.querySelectorAll(".ph").forEach(function (f) {
      if (f.querySelector(".reactions")) return;
      var img = f.querySelector("img"); if (!img) return;
      var key = img.getAttribute("src"); keys.push(key);
      var bar = document.createElement("div");
      bar.className = "reactions"; bar._key = key; bar._btns = {};
      var add = document.createElement("button");
      add.type = "button"; add.className = "rx-add"; add.innerHTML = ADD_ICON;
      add.setAttribute("aria-label", "add a reaction");
      add.addEventListener("click", function (ev) { ev.stopPropagation(); openQuick(add, bar, key); });
      bar._add = add; bar.appendChild(add);
      Object.keys(mine[key] || {}).forEach(function (e) { makeChip(bar, key, e); });
      f.appendChild(bar);
    });
    if (keys.length) loadCounts(keys, container);
  };
})();
