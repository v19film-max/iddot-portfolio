/* iddot — scroll reveal · split text · work filter
   원칙: 어떤 이유로든 콘텐츠가 영구히 숨겨지면 안 된다.
   관찰자가 발화하지 않는 환경(구형 브라우저, 프린트, 헤드리스 등)에서도
   안전망 타이머가 전부 드러내도록 한다. */
(function () {
  'use strict';

  // 새로고침은 항상 첫 화면에서 시작하도록 브라우저의 스크롤 복원을 끈다.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  var navigationEntry = window.performance && performance.getEntriesByType
    ? performance.getEntriesByType('navigation')[0] : null;
  var isReload = navigationEntry && navigationEntry.type === 'reload';
  if (isReload) window.scrollTo(0, 0);

  /* ────────────────────────────────────────────
     1. SPLIT TEXT — 글자/단어 단위로 쪼개 스태거 등장
        (React Bits 의 SplitText / ScrollFloat 를 바닐라로)
     ──────────────────────────────────────────── */
  var splitEls = Array.prototype.slice.call(document.querySelectorAll('[data-split]'));

  function splitInto(el) {
    var mode = el.getAttribute('data-split') === 'words' ? 'words' : 'chars';
    var text = el.textContent.trim();
    if (!text) return [];

    el.setAttribute('aria-label', text);   // 스크린리더용 원문 보존
    el.textContent = '';

    var units = mode === 'words' ? text.split(/(\s+)/) : text.split('');
    var pieces = [];

    units.forEach(function (u) {
      if (/^\s+$/.test(u)) {
        var gap = document.createElement('span');
        gap.className = 'sp-sp';
        gap.setAttribute('aria-hidden', 'true');
        el.appendChild(gap);
        return;
      }
      var s = document.createElement('span');
      s.className = 'sp' + (mode === 'words' ? ' sp-w' : '');
      s.setAttribute('aria-hidden', 'true');
      s.textContent = u;
      el.appendChild(s);
      pieces.push(s);
    });

    // 스태거
    pieces.forEach(function (p, i) {
      p.style.transitionDelay = (i * (mode === 'words' ? 60 : 26)) + 'ms';
    });
    return pieces;
  }

  splitEls.forEach(splitInto);

  /* ────────────────────────────────────────────
     2. REVEAL — 블록 단위 페이드업
     ──────────────────────────────────────────── */
  // 설명문·Contact·Team도 기존처럼 블록 등장 효과를 유지한다.
  var BLOCK_SEL = '.statement .display, .statement .wordplay, .statement-body p, .work-filter, .work-item, ' +
                  '.team-grid, .section-idx';
  var blocks = Array.prototype.slice.call(document.querySelectorAll(BLOCK_SEL));

  // statement-closing 은 split 으로 따로 다루므로 블록 리스트에서 제외
  blocks = blocks.filter(function (el) { return !el.hasAttribute('data-split'); });

  var watched = blocks.concat(splitEls);

  function show(el) { el.classList.add('in'); }
  function showAll() { watched.forEach(show); }

  if (window.matchMedia && window.matchMedia('print').matches) { showAll(); return; }
  window.addEventListener('beforeprint', showAll);

  if (!('IntersectionObserver' in window)) { showAll(); return; }

  blocks.forEach(function (el, i) {
    el.classList.add('reveal');
    el.style.transitionDelay = (i % 4) * 70 + 'ms';
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        show(e.target);
      } else if (!e.target.closest('.work') && !e.target.closest('.hero')) {
        // 포트폴리오만 재진입 시 이미 보이는 상태를 유지하고,
        // 나머지 섹션은 다시 들어올 때 기존 등장 효과를 재생한다.
        e.target.classList.remove('in');
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  watched.forEach(function (el) { io.observe(el); });

  // 히어로 카피는 첫 페인트부터 존재해야 스크롤 복귀 때 한 글자씩 깜빡이지 않는다.
  document.querySelectorAll('.hero [data-split]').forEach(show);

  // 브라우저가 bfcache에서 페이지를 복원할 때도 분할 문자가 다시 숨지 않게 한다.
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) showAll();
  });
  window.addEventListener('load', function () {
    if (isReload) window.scrollTo(0, 0);
  });

  /* 안전망 1: 뷰포트 안인데 아직 안 드러난 요소는 즉시 표시 */
  function sweep() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    watched.forEach(function (el) {
      if (el.classList.contains('in')) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) show(el);
    });
  }
  window.addEventListener('load', sweep);
  setTimeout(sweep, 600);

  /* 안전망 2: 지연 로딩이나 느린 기기에서도 현재 화면만 보정한다. */
  setTimeout(sweep, 1800);

  /* ────────────────────────────────────────────
     2b. PAGE EDGE BLUR — 하단에서 자연스럽게 사라짐
     ──────────────────────────────────────────── */
  var pageBlur = document.querySelector('.page-blur');
  var siteFooter = document.querySelector('.site-footer');
  function updatePageBlur() {
    if (!pageBlur) return;
    var fade = 1;
    var footerTop = Infinity;
    if (siteFooter) {
      footerTop = siteFooter.getBoundingClientRect().top;
      // 실제 푸터 로고가 화면 아래에서 올라오는 순간부터 서서히 풀린다.
      var fadeStart = window.innerHeight * 0.92;
      var fadeEnd = window.innerHeight * 0.15;
      fade = Math.max(0, Math.min(1, (footerTop - fadeEnd) / (fadeStart - fadeEnd)));
    }
    pageBlur.style.setProperty('--page-blur-opacity', fade.toFixed(3));
  }
  window.addEventListener('scroll', updatePageBlur, { passive: true });
  window.addEventListener('resize', updatePageBlur);
  window.addEventListener('load', updatePageBlur);
  updatePageBlur();

  /* ────────────────────────────────────────────
     3. WORK FILTER
     ──────────────────────────────────────────── */
  var btns  = Array.prototype.slice.call(document.querySelectorAll('.filter-btn'));
  var items = Array.prototype.slice.call(document.querySelectorAll('.work-item'));
  var empty = document.querySelector('.work-empty');

  function applyFilter(cat) {
    var shown = 0;
    items.forEach(function (it) {
      var cats = (it.getAttribute('data-cat') || '').split(/\s+/);
      var match = (cat === 'all')
        ? !it.classList.contains('digital-only')
        : cats.indexOf(cat) !== -1;
      it.hidden = !match;
      if (match) { shown++; show(it); }   // 필터로 다시 나타날 때 숨은 채 남지 않도록
    });
    if (empty) empty.hidden = shown !== 0;
  }

  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      btns.forEach(function (o) {
        o.classList.toggle('is-on', o === b);
        o.setAttribute('aria-selected', o === b ? 'true' : 'false');
      });
      applyFilter(b.getAttribute('data-filter') || 'all');
    });
  });
  applyFilter('all');

  /* 필터 버튼의 가벼운 스페큘러 림. WebGL 없이 포인터 주변에서만 동작한다. */
  var filterFrame = 0;
  var filterPointer = null;
  function renderFilterSpecular() {
    filterFrame = 0;
    if (!filterPointer) return;
    btns.forEach(function (btn) {
      var r = btn.getBoundingClientRect();
      if (!r.width) return;
      var dx = Math.max(r.left - filterPointer.clientX, 0, filterPointer.clientX - r.right);
      var dy = Math.max(r.top - filterPointer.clientY, 0, filterPointer.clientY - r.bottom);
      var distance = Math.hypot(dx, dy);
      var t = Math.max(0, 1 - distance / 170);
      var glow = t * t * (3 - 2 * t);
      btn.style.setProperty('--filter-glow', glow.toFixed(3));
      btn.style.setProperty('--filter-x', (filterPointer.clientX - r.left) + 'px');
      btn.style.setProperty('--filter-y', (filterPointer.clientY - r.top) + 'px');
    });
  }
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    filterPointer = e;
    if (!filterFrame) filterFrame = requestAnimationFrame(renderFilterSpecular);
  }, { passive:true });

  /* ────────────────────────────────────────────
     4. WORK PREVIEW — 호버 시 무음 자동재생
     ──────────────────────────────────────────── */
  Array.prototype.slice.call(document.querySelectorAll('.work-link--native')).forEach(function (card) {
    var video = card.querySelector('.work-preview');
    if (!video) return;
    var previewToken = 0;
    video.muted = true;
    video.playsInline = true;

    function playPreview() {
      var token = ++previewToken;
      var playback = video.play();
      if (playback && typeof playback.then === 'function') {
        playback.then(function () {
          if (token === previewToken) card.classList.add('is-playing');
        }).catch(function () {
          if (token === previewToken) card.classList.remove('is-playing');
        });
      } else {
        card.classList.add('is-playing');
      }
    }

    function stopPreview() {
      previewToken++;
      video.pause();
      try { video.currentTime = 0; } catch (e) { /* metadata 로드 전에는 건너뜀 */ }
      card.classList.remove('is-playing');
    }

    card.addEventListener('pointerenter', playPreview);
    card.addEventListener('pointerleave', stopPreview);
    card.addEventListener('focusin', playPreview);
    card.addEventListener('focusout', stopPreview);
  });

  /* ────────────────────────────────────────────
     4b. TEAM PROFILE CARD — 커서 틸트 + 글로우
     ──────────────────────────────────────────── */
  var pcWraps = Array.prototype.slice.call(document.querySelectorAll('.pc-wrap[data-tilt]'));
  Array.prototype.slice.call(document.querySelectorAll('.pc-card')).forEach(function (card) {
    // 일반적인 우클릭/드래그 저장을 막는다. 화면 캡처나 개발자 도구까지 막을 수는 없다.
    card.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    card.addEventListener('dragstart', function (e) { e.preventDefault(); });
  });
  Array.prototype.slice.call(document.querySelectorAll('.site-footer__logo')).forEach(function (logo) {
    logo.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    logo.addEventListener('dragstart', function (e) { e.preventDefault(); });
  });
  pcWraps.forEach(function (wrap) {
    var card = wrap.querySelector('.pc-card');
    var rect = null;
    var pendingEvent = null;
    var frame = 0;
    function refreshRect() { rect = card.getBoundingClientRect(); }
    function renderPointer() {
      frame = 0;
      if (!pendingEvent) return;
      var e = pendingEvent;
      pendingEvent = null;
      if (!rect || !rect.width || !rect.height) refreshRect();
      var px = e.clientX - rect.left;
      var py = e.clientY - rect.top;
      var x = px / rect.width;
      var y = py / rect.height;
      var cx = rect.width / 2;
      var cy = rect.height / 2;
      var edge = Math.min(1, Math.max(Math.abs(px - cx) / cx, Math.abs(py - cy) / cy)) * 100;
      var angle = Math.atan2(py - cy, px - cx) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;
      wrap.style.setProperty('--rx', ((0.5 - y) * 10).toFixed(2) + 'deg');
      wrap.style.setProperty('--ry', ((x - 0.5) * 14).toFixed(2) + 'deg');
      card.style.setProperty('--edge-proximity', edge.toFixed(3));
      card.style.setProperty('--cursor-angle', angle.toFixed(2) + 'deg');
    }
    function onMove(e) {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      pendingEvent = e;
      if (!frame) frame = requestAnimationFrame(renderPointer);
    }
    function onLeave() {
      pendingEvent = null;
      wrap.style.setProperty('--rx', '0deg');
      wrap.style.setProperty('--ry', '0deg');
      card.style.setProperty('--edge-proximity', '0');
      card.style.setProperty('--cursor-angle', '45deg');
    }
    wrap.addEventListener('pointerenter', refreshRect);
    wrap.addEventListener('pointermove', onMove, { passive:true });
    wrap.addEventListener('pointerleave', onLeave);
    window.addEventListener('resize', refreshRect, { passive:true });
    window.addEventListener('scroll', refreshRect, { passive:true });
  });

  /* ────────────────────────────────────────────
     4. SPECULAR BUTTON — 커서를 따라 테두리가 빛남
     ──────────────────────────────────────────── */
  var specBtns = Array.prototype.slice.call(document.querySelectorAll('.spec-btn'));
  var PROXIMITY = 260;

  window.addEventListener('pointermove', function (e) {
    specBtns.forEach(function (btn) {
      var r = btn.getBoundingClientRect();
      if (!r.width) return;
      // 버튼 바깥에서의 최단 거리
      var dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
      var dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
      var dist = Math.hypot(dx, dy);
      var t = Math.max(0, 1 - dist / PROXIMITY);
      btn.style.setProperty('--glow', (t * t * (3 - 2 * t)).toFixed(3));
      btn.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      btn.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  }, { passive: true });

  /* ────────────────────────────────────────────
     5. MAIN CONTACT — Formspree 제출
     ──────────────────────────────────────────── */
  var inquiry = document.getElementById('mainInquiryForm');
  var inquirySubmit = document.getElementById('mainInquirySubmit');
  var inquiryStatus = document.getElementById('mainInquiryStatus');
  if (inquiry && inquirySubmit) {
    inquiry.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!inquiry.checkValidity()) {
        inquiry.reportValidity();
        return;
      }

      var label = inquirySubmit.querySelector('.spec-btn__label');
      inquirySubmit.disabled = true;
      if (label) label.textContent = '보내는 중...';
      if (inquiryStatus) {
        inquiryStatus.textContent = '';
        inquiryStatus.classList.remove('is-error');
      }

      var payload = new FormData(inquiry);
      // 연락처가 이메일이면 받은 메일에서 '답장'이 문의자에게 바로 가도록 한다.
      var contactValue = (payload.get('contact') || '').toString().trim();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue)) payload.append('_replyto', contactValue);

      fetch('https://formspree.io/f/xlgqpjez', {
        method: 'POST',
        body: payload,
        headers: { Accept: 'application/json' }
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Formspree submission failed');
          inquiry.reset();
          if (inquiryStatus) inquiryStatus.textContent = '문의가 정상적으로 접수되었습니다. 빠르게 답 드리겠습니다.';
          if (label) label.textContent = '보냈습니다';
          // 추가 문의를 보낼 수 있도록 잠시 뒤 버튼을 원래대로 돌린다.
          setTimeout(function () {
            inquirySubmit.disabled = false;
            if (label) label.textContent = '보내기';
          }, 4000);
        })
        .catch(function () {
          inquirySubmit.disabled = false;
          if (label) label.textContent = '다시 보내기';
          if (inquiryStatus) {
            inquiryStatus.textContent = '전송에 실패했습니다. 잠시 후 다시 시도해주세요.';
            inquiryStatus.classList.add('is-error');
          }
        });
    });
  }

})();
