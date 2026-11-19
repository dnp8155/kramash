/* Kramasha inquiry form loader. A business pastes:
     <div data-kramasha-inquiry="your-slug"></div>
     <script async src="https://<app>/embed.js"></script>
   The form appears in place, grows to fit, and only shows on the business's own website. */
(function () {
  // Async scripts still have currentScript; website builders that inject the script later may not, so look it up.
  var script = document.currentScript;
  if (!script || !script.src) {
    var all = document.querySelectorAll("script[src]");
    for (var s = all.length - 1; s >= 0; s--) {
      if (/\/embed\.js(\?|#|$)/.test(all[s].src)) { script = all[s]; break; }
    }
  }
  if (!script || !script.src) return;
  if (window.__kramashaEmbedLoaded) return; // pasted twice: one loader is enough
  window.__kramashaEmbedLoaded = true;
  var origin = new URL(script.src).origin;
  var frames = [];

  function mount() {
    var boxes = document.querySelectorAll("[data-kramasha-inquiry]");
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      var slug = (box.getAttribute("data-kramasha-inquiry") || "").trim();
      // Skip boxes that already have their form (the website may rebuild a box, so look for the frame itself).
      if (!slug || box.querySelector("iframe[data-kramasha-frame]")) continue;
      var f = document.createElement("iframe");
      var q = [];
      if (box.getAttribute("data-bg") === "transparent") q.push("bg=transparent");
      ["text", "accent", "fields"].forEach(function (k) {
        var v = box.getAttribute("data-" + k);
        if (v && /^#?[0-9a-f]{6}$/i.test(v.trim())) q.push(k + "=" + encodeURIComponent("#" + v.trim().replace("#", "")));
      });
      f.src = origin + "/embed/inquiry/" + encodeURIComponent(slug) + (q.length ? "?" + q.join("&") : "");
      f.title = "Send an inquiry";
      // Not lazy: some website builders never scroll the real page, so a lazy frame could stay empty.
      // Send the page's address even if the site normally hides it, so the form can tell it is on the right website.
      f.referrerPolicy = "origin";
      f.setAttribute("allowtransparency", "true");
      f.setAttribute("data-kramasha-frame", "1");
      // Hidden until the form reports its real height, so it never shows at a wrong size and then jumps (the flicker).
      // Centred in its space; max-width keeps the form readable on wide pages.
      f.style.cssText = "width:100%;max-width:760px;height:0;margin:0 auto;border:0;display:block;background:transparent;color-scheme:normal;opacity:0;transition:opacity .2s";
      // If the form never reports (e.g. blocked), still show whatever it displays at a normal size.
      setTimeout(function () { if (f.style.opacity === "0") { f.style.height = "720px"; f.style.opacity = "1"; } }, 8000);
      box.appendChild(f);
      frames.push(f);
    }
  }

  window.addEventListener("message", function (e) {
    if (e.origin !== origin || !e.data || e.data.type !== "kramasha-embed-height") return;
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow !== e.source) continue;
      var h = Math.max(0, Number(e.data.height) || 0);
      if (h) { frames[i].style.height = h + "px"; frames[i].style.opacity = "1"; }
    }
  });

  // Builders and single-page sites can add the placeholder after this script ran: keep looking for a while.
  function watch() {
    if (!window.MutationObserver) return;
    var pending = false;
    // One check per frame, however many changes the website makes at once.
    var mo = new MutationObserver(function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; mount(); });
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () { mo.disconnect(); }, 60000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { mount(); watch(); });
  else { mount(); watch(); }
})();
