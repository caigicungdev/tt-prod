/* Trấn Thành Archive — interactions
   0. Hero intro + parallax   1. Mobile menu   2. Hero slideshow
   3. Scroll reveal */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIntro = root.classList.contains('intro');
  var fullIntro = hasIntro && !root.classList.contains('intro-fast');
  // when the hero has finished animating in (ms) — the slideshow waits for this
  var introDone = hasIntro ? (fullIntro ? 3900 : 1900) : 0;

  /* ---------- 0a. Split TRẤN / THÀNH into letters ---------- */
  document.querySelectorAll('.hero__word').forEach(function (word) {
    var text = word.textContent.trim().normalize('NFC');
    var frag = document.createDocumentFragment();
    var sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    frag.appendChild(sr);
    Array.from(text).forEach(function (c, i) {
      var outer = document.createElement('span');
      outer.className = 'ch';
      outer.setAttribute('aria-hidden', 'true');
      var inner = document.createElement('span');
      inner.className = 'ch__in';
      inner.style.setProperty('--i', i);
      inner.textContent = c;
      outer.appendChild(inner);
      frag.appendChild(outer);
    });
    word.textContent = '';
    word.appendChild(frag);
    word.classList.add('is-split');
  });

  /* ---------- 0b. Play the intro once fonts + portrait are ready (max 1.5 s wait) ---------- */
  if (hasIntro) {
    var played = false;
    var play = function () {
      if (played) return;
      played = true;
      // two frames so the split letters get their start position before animating
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { root.classList.add('intro-play'); });
      });
      try { sessionStorage.setItem('tt-intro', '1'); } catch (e) {}
      var curtain = document.querySelector('.intro-curtain');
      if (curtain) setTimeout(function () { curtain.remove(); }, 3300);
    };
    var portrait = document.querySelector('.hero__img');
    var waits = [];
    if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
    if (portrait && portrait.decode) waits.push(portrait.decode().catch(function () {}));
    Promise.race([
      Promise.all(waits),
      new Promise(function (r) { setTimeout(r, 1500); })
    ]).then(play, play);
  }

  /* ---------- 0c. Parallax: mouse depth (desktop) + scroll split ---------- */
  var hero = document.querySelector('.hero');
  if (hero && !reduceMotion) {
    var wSolid = hero.querySelector('.hero__word--solid');
    var wOutline = hero.querySelector('.hero__word--outline');
    var img = hero.querySelector('.hero__img');
    var slideImgs = hero.querySelectorAll('.slide img');
    var target = { mx: 0, my: 0, p: 0 };
    var cur = { mx: 0, my: 0, p: 0 };
    var raf = null;
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    var apply = function () {
      var mx = cur.mx, my = cur.my, p = cur.p;
      var spread = p * Math.min(window.innerWidth * 0.18, 220); // words drift apart as you scroll
      wSolid.style.translate = (-mx * 14 - spread).toFixed(1) + 'px ' + (-my * 8).toFixed(1) + 'px';
      wOutline.style.translate = (mx * 22 + spread).toFixed(1) + 'px ' + (my * 10).toFixed(1) + 'px';
      img.style.translate = (mx * 8).toFixed(1) + 'px ' + (my * 5 + p * 110).toFixed(1) + 'px';
      slideImgs.forEach(function (el) {
        el.style.translate = (-mx * 10).toFixed(1) + 'px ' + (-my * 6).toFixed(1) + 'px';
      });
    };
    var tick = function () {
      var moving = false;
      ['mx', 'my', 'p'].forEach(function (k) {
        var d = target[k] - cur[k];
        if (Math.abs(d) > 0.0005) { cur[k] += d * 0.09; moving = true; } else { cur[k] = target[k]; }
      });
      apply();
      raf = moving ? requestAnimationFrame(tick) : null;
    };
    var kick = function () { if (!raf) raf = requestAnimationFrame(tick); };

    if (finePointer) {
      hero.addEventListener('mousemove', function (e) {
        var r = hero.getBoundingClientRect();
        target.mx = ((e.clientX - r.left) / r.width) * 2 - 1;
        target.my = ((e.clientY - r.top) / r.height) * 2 - 1;
        kick();
      });
      hero.addEventListener('mouseleave', function () { target.mx = 0; target.my = 0; kick(); });
    }
    window.addEventListener('scroll', function () {
      var h = hero.offsetHeight || 1;
      var p = Math.min(Math.max(window.scrollY / h, 0), 1);
      if (p !== target.p) { target.p = p; kick(); }
    }, { passive: true });
  }

  /* ---------- 0d. Sticky header: glass style once the page is scrolled ---------- */
  var headerEl = document.querySelector('.site-header');
  if (headerEl) {
    var onScrollHeader = function () { headerEl.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScrollHeader, { passive: true });
    onScrollHeader();
  }

  /* ---------- 1. Mobile menu ---------- */
  var body = document.body;
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('main-nav');

  function setMenu(open) {
    body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setMenu(!body.classList.contains('menu-open'));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && body.classList.contains('menu-open')) {
        setMenu(false);
        toggle.focus();
      }
    });
    window.matchMedia('(min-width: 961px)').addEventListener('change', function (mq) {
      if (mq.matches) setMenu(false);
    });
  }

  /* ---------- 2. Hero slideshow ---------- */
  var show = document.querySelector('[data-slideshow]');
  if (show) {
    var slides = show.querySelectorAll('[data-slide]');
    var bars = show.querySelectorAll('[data-slide-to]');
    var captions = show.querySelectorAll('[data-caption]');
    var whys = show.querySelectorAll('[data-why]');
    var interval = parseInt(show.getAttribute('data-interval'), 10) || 5000;
    var current = 0;
    var timer = null;

    function go(index) {
      current = (index + slides.length) % slides.length;
      [slides, bars, captions, whys].forEach(function (list) {
        list.forEach(function (el, i) {
          el.classList.toggle('is-active', i === current);
        });
      });
      bars.forEach(function (b, i) {
        if (i === current) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      });
    }

    function start() {
      stop();
      if (slides.length > 1) timer = setInterval(function () { go(current + 1); }, interval);
    }
    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    bars.forEach(function (bar) {
      bar.addEventListener('click', function () {
        go(parseInt(bar.getAttribute('data-slide-to'), 10));
        start();
      });
    });

    // pause while hovering / focused inside, and when the tab is hidden
    show.addEventListener('mouseenter', stop);
    show.addEventListener('mouseleave', start);
    show.addEventListener('focusin', stop);
    show.addEventListener('focusout', start);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });

    go(0);
    setTimeout(start, introDone);   // let the intro finish before the first change
  }

  /* ---------- 3. Scroll reveal ---------- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

})();
