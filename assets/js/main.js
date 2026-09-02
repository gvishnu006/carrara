/* ============================================================
   CARRARA — Studio & Journal
   Interaction layer: nav, reveals, parallax, transitions.
   ============================================================ */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- helpers ---------- */
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  var updateCallbacks = [];

  /* ============================================================
     1. HEADER — transforms subtly on scroll
     ============================================================ */
  (function initHeader() {
    var header = qs(".site-header");
    if (!header) return;

    function onScroll() {
      header.classList.toggle("is-scrolled", window.scrollY > 28);
    }
    onScroll();
    updateCallbacks.push(onScroll);
  })();

  /* ============================================================
     2. REVEAL OBSERVERS
     ============================================================ */
  (function initReveals() {
    var mediaEls = qsa(".media");
    mediaEls.forEach(function (m) {
      if (m.querySelector("img")) m.classList.add("is-media");
    });

    var revealables = qsa("[data-reveal]");
    var linesBlocks = qsa(".lines");

    if (!("IntersectionObserver" in window) || prefersReduced) {
      revealables.forEach(function (el) { el.classList.add("is-in"); });
      linesBlocks.forEach(function (el) { el.classList.add("is-in"); });
      mediaEls.forEach(function (m) { m.classList.add("is-in"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    revealables.forEach(function (el) { io.observe(el); });
    linesBlocks.forEach(function (el) { io.observe(el); });
    mediaEls.forEach(function (el) { io.observe(el); });
  })();

  /* ============================================================
     3. FULL-SCREEN MENU
     ============================================================ */
  (function initMenu() {
    var menu = qs(".menu");
    var closeBtn = menu && qs(".menu__close", menu);
    var toggle = qs(".menu-toggle");
    if (!menu || !toggle) return;

    function open() {
      menu.classList.add("is-open");
      document.body.classList.add("open-menu");
      toggle.setAttribute("aria-expanded", "true");
    }
    function close() {
      menu.classList.remove("is-open");
      document.body.classList.remove("open-menu");
      toggle.setAttribute("aria-expanded", "false");
    }

    toggle.addEventListener("click", function () {
      menu.classList.contains("is-open") ? close() : open();
    });
    if (closeBtn) closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
    qsa(".menu__link").forEach(function (l) { l.addEventListener("click", close); });
  })();

  /* ============================================================
     4. HORIZONTAL MARK — images move while scrolling
     ============================================================ */
  (function initMarquee() {
    var section = qs(".marquee");
    if (!section) return;
    var track = qs(".marquee__track", section);
    var cloneEls = [];

    // dupe images once for a seamless band
    var items = qsa(".marquee__item", section);
    var totalWidth = 0;
    items.forEach(function (i) { totalWidth += i.offsetWidth; });

    if (!prefersReduced) {
      qsa(".marquee__item", section).forEach(function (it) {
        var c = it.cloneNode(true);
        c.setAttribute("aria-hidden", "true");
        track.appendChild(c);
        cloneEls.push(c);
      });
    }

    var natural = totalWidth; // scroll distance = one set width
    var offset = 0;

    function onScroll() {
      var rect = section.getBoundingClientRect();
      var vh = window.innerHeight;
      // progress: section fully below viewport -> fully above
      var progress = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
      offset = progress * natural;
      track.style.transform = "translate3d(" + -offset + "px, 0, 0)";
    }

    if (prefersReduced) {
      track.style.transform = "translate3d(0,0,0)";
      return;
    }

    onScroll();
    updateCallbacks.push(onScroll);
    window.addEventListener("resize", onScroll);
  })();

  /* ============================================================
     5. FOLLOWING IMAGE — cursor thumbnails on rows
     ============================================================ */
  (function initCursorMedia() {
    var rows = qsa("[data-thumb]");
    if (!rows.length || window.matchMedia("(pointer: coarse)").matches) return;

    var media = qs(".cursor-media");
    if (!media) return;
    var imgs = qsa("img", media);

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var x = mx, y = my;
    var hidden = true;
    var targetRow = null;
    var cueId = null;

    document.addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; });

    function loop() {
      x = lerp(x, mx, 0.16);
      y = lerp(y, my, 0.16);
      media.style.left = x + "px";
      media.style.top = y + "px";
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    rows.forEach(function (row) {
      var id = row.getAttribute("data-thumb");
      row.addEventListener("mouseenter", function () {
        media.classList.add("is-visible");
        hidden = false;
        setCue(id);
      });
      row.addEventListener("mouseleave", function () {
        media.classList.remove("is-visible");
        hidden = true;
      });
    });

    function setCue(id) {
      if (id === cueId) return;
      cueId = id;
      imgs.forEach(function (img) {
        var match = img.getAttribute("data-cue") === id;
        img.classList.toggle("is-cue", match);
      });
    }
  })();

  /* ============================================================
     6. SUBTLE PARALLAX on full images
     ============================================================ */
  (function initParallax() {
    var targets = qsa("[data-parallax]");
    if (!targets.length || prefersReduced) return;

    function onScroll() {
      targets.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        var vh = window.innerHeight;
        if (rect.bottom < -140 || rect.top > vh + 140) return;
        var mid = rect.top + rect.height / 2 - vh / 2;
        var ty = (mid * -0.09).toFixed(1);
        el.style.transform = "translate3d(0, " + ty + "px, 0) scale(1.16)";
      });
    }

    onScroll();
    updateCallbacks.push(onScroll);
  })();

  /* ============================================================
     7. SMOOTH PAGE TRANSITIONS
     ============================================================ */
  (function initTransitions() {
    var body = document.body;
    var transitionEl = document.createElement("div");
    transitionEl.className = "page-transition";
    transitionEl.innerHTML =
      '<span class="page-transition__edge"></span>' +
      '<span class="page-transition__panel"></span>';
    document.body.appendChild(transitionEl);

    var hasEntered = false;

    function enter() {
      body.classList.add("page-in");
      requestAnimationFrame(function () {
        setTimeout(function () {
          body.classList.add("is-entered");
          setTimeout(function () {
            body.classList.remove("page-in", "is-entered");
            body.classList.remove("open-menu");
          }, 900);
        }, 60);
      });
    }

    function exit(url) {
      if (body.classList.contains("is-leaving")) return;
      body.classList.add("is-leaving");
      setTimeout(function () {
        window.location.href = url;
      }, 720);
    }

    // first entry
    if (prefersReduced) {
      enter();
      hasEntered = true;
    } else if (document.readyState === "complete") {
      setTimeout(enter, 120);
    } else {
      var timer = setTimeout(enter, 2200);
      window.addEventListener("load", function () {
        clearTimeout(timer);
        setTimeout(enter, 120);
      });
    }

    // intercept internal links
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute("href");
      if (href.indexOf("http") === 0 || href.indexOf("#") === 0 || href.indexOf("mailto") === 0 || href.indexOf("tel") === 0) return;
      e.preventDefault();
      exit(href);
    });
  })();

  /* ============================================================
     8. UPDATE RAF LOOP
     ============================================================ */
  function tick() {
    updateCallbacks.forEach(function (fn) { fn(); });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();