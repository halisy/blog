/* ------------------------------------------------------------
   Photo reactions. Everyone's taps add up (stored in a tiny
   Cloudflare Worker); your own taps are remembered on this device.
   Dormant until window.REACTIONS.api is set in _config.yml.
   ------------------------------------------------------------ */
(function () {
  "use strict";
  var API = (window.REACTIONS && window.REACTIONS.api || "").replace(/\/$/, "");
  var EMOJI = ["❤️", "🔥", "✨", "😍", "🙌"];
  if (!API) return; // not configured yet — reactions stay off, site works normally

  var mine = {};
  try { mine = JSON.parse(localStorage.getItem("field-reactions") || "{}"); } catch (e) {}
  function saveMine() { try { localStorage.setItem("field-reactions", JSON.stringify(mine)); } catch (e) {} }

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
    s.style.top = (r.top) + "px";
    document.body.appendChild(s);
    setTimeout(function () { s.remove(); }, 1200);
  }

  function onReact(e) {
    var btn = e.currentTarget;
    var key = btn.dataset.key, emoji = btn.dataset.emoji;
    mine[key] = mine[key] || {};
    var was = !!mine[key][emoji];
    var delta = was ? -1 : 1;
    if (was) delete mine[key][emoji]; else mine[key][emoji] = 1;
    saveMine();
    btn.classList.toggle("on", !was);
    var n = btn.querySelector(".rx-n");
    var cur = parseInt(n.textContent || "0", 10) || 0;
    setCount(btn, Math.max(0, cur + delta));
    if (!was) floatEmoji(btn, emoji);
    fetch(API + "/react", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: key, emoji: emoji, delta: delta }),
    }).then(function (r) { return r.json(); })
      .then(function (res) { if (res && res.counts) setCount(btn, res.counts[emoji] || 0); })
      .catch(function () {});
  }

  function loadCounts(keys, container) {
    fetch(API + "/counts?keys=" + encodeURIComponent(keys.join(",")))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        container.querySelectorAll(".react").forEach(function (b) {
          setCount(b, ((data[b.dataset.key] || {})[b.dataset.emoji]) || 0);
        });
      }).catch(function () {});
  }

  // called by field.js after an entry's photos are rendered
  window.initReactions = function (container) {
    var figs = container.querySelectorAll(".ph");
    var keys = [];
    figs.forEach(function (f) {
      if (f.querySelector(".reactions")) return;
      var img = f.querySelector("img"); if (!img) return;
      var key = img.getAttribute("src");
      keys.push(key);
      var bar = document.createElement("div");
      bar.className = "reactions";
      EMOJI.forEach(function (emoji) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "react";
        b.dataset.key = key; b.dataset.emoji = emoji;
        b.setAttribute("aria-label", "react " + emoji);
        b.innerHTML = '<span class="rx-e">' + emoji + '</span><span class="rx-n"></span>';
        if (mine[key] && mine[key][emoji]) b.classList.add("on");
        b.addEventListener("click", onReact);
        bar.appendChild(b);
      });
      f.appendChild(bar);
    });
    if (keys.length) loadCounts(keys, container);
  };
})();
