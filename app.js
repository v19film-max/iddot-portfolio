/* iddot 리뉴얼 시안 — 공통 동작
   1. 페이지 이동 전환 (나갈 때 어두워지고, 들어올 때 밝아진다)
   2. 헤더: 맨 위에선 투명, 스크롤하면 배경이 깔린다
   3. 첫 화면 쇼릴: 지금 나오는 작업 제목·진행 막대, 누르면 그 작업 상세 창
   4. 작업 목록: works.js 로 카드를 만들고, 필터를 바꿀 때 카드가 자리를 옮기며 바뀐다
   5. 카드 미리보기: 마우스를 올릴 때만 영상을 받아 재생
   6. 문의 폼 (contact.html)
   원칙: 스크립트가 실패해도 내용이 영구히 숨겨지지 않는다. 모든 전환에 애니메이션. */
(function () {
  'use strict';

  var DATA = window.IDDOT_WORKS || {};
  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IS_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var EASE = 'cubic-bezier(.2,.7,.2,1)';
  var EASE_EXIT = 'cubic-bezier(.4,0,1,1)';
  var T = { micro: 200, pop: 320, window: 440, exit: 260 };
  if (reduceMotion) { T = { micro: 0, pop: 120, window: 160, exit: 120 }; }

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function ytThumb(id) { return 'https://i.ytimg.com/vi/' + id + '/hq720.jpg'; }

  /* ── 1. 페이지 이동 전환 ───────────────────── */
  function revealPage() { root.classList.remove('pt-enter'); }
  // 첫 프레임 뒤에 밝아지게 한다. 혹시 프레임이 안 와도 안전망 타이머가 연다.
  requestAnimationFrame(function () { requestAnimationFrame(revealPage); });
  setTimeout(revealPage, 600);
  window.addEventListener('pageshow', function (e) {
    // 뒤로가기로 돌아온 페이지가 어두운 채로 남지 않게
    if (e.persisted) { root.classList.remove('pt-leave'); revealPage(); }
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || a.target === '_blank') return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
    if (url.pathname === location.pathname) return;     // 같은 페이지 안 이동(#work 등)은 그대로
    e.preventDefault();
    root.classList.add('pt-leave');
    setTimeout(function () { location.href = url.href; }, T.exit);
  });

  /* ── 2. 헤더 ──────────────────────────────── */
  var header = $('.hd');
  if (header) {
    var onScroll = function () {
      var top = window.pageYOffset < 40;
      if (header.getAttribute('data-top') !== String(top)) header.setAttribute('data-top', String(top));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── 3. 첫 화면 쇼릴 ───────────────────────── */
  // 임시 쇼릴(hero-reel.mp4) 구간표.
  // 진짜 쇼릴로 바꾸면 이 표만 실제 구간에 맞게 고친다.
  var REEL = {
    duration: 31.458, // 24fps 기준 컷 경계(튀는 컷 없이 잘라 붙임)
    segments: [
      { key: 'keyvitup-best-one',     start: 0 },
      { key: 'limhyunsik-the-answer', start: 4.792 },
      { key: 'sdf-bky-teaser',        start: 9.667 },
      { key: 'hui-fan-concert-vcr',   start: 14.667 },
      { key: 'victor',                start: 19.75 },
      { key: 'borderless',            start: 26.458 }
    ]
  };
  var heroVideo = $('#heroVideo');
  if (heroVideo) initHero();

  function initHero() {
    var nowBtn = $('#heroNow');
    var nowTitle = $('#heroNowTitle');
    var stepsEl = $('#heroSteps');
    var segs = REEL.segments.filter(function (s) { return DATA[s.key]; });
    var current = -1;

    segs.forEach(function () {
      var s = document.createElement('span');
      s.appendChild(document.createElement('i'));
      stepsEl.appendChild(s);
    });
    var steps = $$('span', stepsEl);
    // 진행 막대를 누르면 그 장면으로 넘어간다(막대가 가늘어 가장 가까운 칸으로)
    stepsEl.addEventListener('click', function (e) {
      var best = 0, bd = 1e9;
      steps.forEach(function (s, k) { var r = s.getBoundingClientRect(), d = Math.abs(e.clientX - (r.left + r.width / 2)); if (d < bd) { bd = d; best = k; } });
      heroVideo.currentTime = segs[best].start + .02;
      var p = heroVideo.play(); if (p && p.catch) p.catch(function () {});
      paint();
    });

    function segIndexAt(t) {
      var idx = 0;
      for (var i = 0; i < segs.length; i++) if (t >= segs[i].start) idx = i;
      return idx;
    }
    function segEnd(i) { return i + 1 < segs.length ? segs[i + 1].start : REEL.duration; }

    function setTitle(i) {
      if (i === current) return;
      current = i;
      var w = DATA[segs[i].key];
      var text = w.artist ? w.artist + ' ' + w.title : w.title;
      nowBtn.setAttribute('aria-label', '지금 나오는 작업: ' + text + '. 누르면 상세 보기');
      // 줄표 없이: 아티스트는 회색으로 앞에, 제목은 흰색으로
      var fill = function () {
        nowTitle.textContent = '';
        if (w.artist) { var a = document.createElement('span'); a.className = 'hero__now-artist'; a.textContent = w.artist; nowTitle.appendChild(a); }
        nowTitle.appendChild(document.createTextNode(w.title));
      };
      if (!nowTitle.textContent) { fill(); return; }
      // 제목 교체: 위로 빠지고 아래에서 올라온다
      nowTitle.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-8px)' }],
        { duration: T.micro, easing: EASE_EXIT, fill: 'forwards' }).onfinish = function () {
        fill();
        nowTitle.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
          { duration: T.pop, easing: EASE, fill: 'forwards' });
      };
    }

    function paint() {
      var t = heroVideo.currentTime || 0;
      var i = segIndexAt(t);
      setTitle(i);
      steps.forEach(function (s, k) {
        var p = k < i ? 1 : k > i ? 0 : (t - segs[i].start) / (segEnd(i) - segs[i].start);
        s.firstChild.style.transform = 'scaleX(' + Math.max(0, Math.min(1, p)).toFixed(3) + ')';
        s.classList.toggle('is-on', k === i);
      });
    }

    var raf = 0;
    function loop() { paint(); raf = requestAnimationFrame(loop); }
    function startLoop() { if (!raf) raf = requestAnimationFrame(loop); }
    function stopLoop() { cancelAnimationFrame(raf); raf = 0; }

    // 화면 폭에 맞는 파일을 고른다 (모바일 1.4MB / PC 3.3MB)
    var small = window.matchMedia('(max-width: 760px)').matches;
    heroVideo.src = heroVideo.getAttribute(small ? 'data-src-mobile' : 'data-src-desktop');

    heroVideo.addEventListener('playing', function () { root.classList.add('hero-live'); startLoop(); });
    heroVideo.addEventListener('pause', stopLoop);
    heroVideo.addEventListener('timeupdate', paint);

    setTitle(0);
    paint();

    if (!reduceMotion) {
      var tryPlay = function () { var p = heroVideo.play(); if (p && p.catch) p.catch(function () {}); };
      tryPlay();
      // 화면 밖이거나 탭이 가려지면 멈춰서 배터리·데이터를 아낀다
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (en) { if (en.isIntersecting && !document.hidden) tryPlay(); else heroVideo.pause(); });
        }, { threshold: 0.15 }).observe(heroVideo);
      }
      document.addEventListener('visibilitychange', function () { if (document.hidden) heroVideo.pause(); else tryPlay(); });
    }

    nowBtn.addEventListener('click', function () {
      var key = segs[Math.max(0, current)].key;
      var link = $('.work-item[data-work="' + key + '"] .work-link');
      if (link) link.click();
    });
  }

  /* ── 4. 작업 목록 ──────────────────────────── */
  var grid = $('#workGrid');
  if (grid) initWork();

  function cardSub(w) {
    var kind = (w.category || '').split('·').pop().trim();
    if (w.artist && kind) return w.artist + ' · ' + kind;
    if (!w.artist && kind && w.role) return kind + ' · ' + w.role;   // 아티스트가 없으면 맡은 역할을 붙인다
    return w.artist || kind;
  }

  function buildCard(key, w) {
    var art = document.createElement('article');
    art.className = 'work-item';
    art.setAttribute('data-work', key);
    var a = document.createElement('a');
    a.className = 'work-link work-link--native';
    a.href = w.youtube ? 'https://youtu.be/' + w.youtube : '#work/' + key;
    if (w.youtube) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    a.setAttribute('aria-label', (w.artist ? w.artist + ' ' : '') + w.title + ' 상세 보기');

    var media = document.createElement('div');
    media.className = 'work-media';
    var img = document.createElement('img');
    img.className = 'work-poster';
    img.src = w.poster || (w.youtube ? ytThumb(w.youtube) : '');
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('load', function () { media.classList.add('is-loaded'); });
    media.appendChild(img);
    if (w.preview) {
      var v = document.createElement('video');
      v.className = 'work-preview';
      v.muted = true; v.loop = true; v.playsInline = true;
      v.preload = 'none';
      v.setAttribute('aria-hidden', 'true');
      var src = document.createElement('source');
      src.src = w.preview; src.type = 'video/mp4';
      v.appendChild(src);
      media.appendChild(v);
    }
    var play = document.createElement('span');
    play.className = 'work-cue';
    play.setAttribute('aria-hidden', 'true');
    play.textContent = 'View';
    media.appendChild(play);

    var meta = document.createElement('div');
    meta.className = 'work-meta';
    var h = document.createElement('h3');
    h.textContent = w.title;
    var p = document.createElement('p');
    p.className = 'work-sub';
    p.textContent = cardSub(w);
    meta.appendChild(h); meta.appendChild(p);
    if (w.role) {
      // 대표가 맡은 직책을 제목 아래에 굵게
      var r = document.createElement('p');
      r.className = 'work-role';
      r.textContent = w.role;
      meta.appendChild(r);
    }

    a.appendChild(media); a.appendChild(meta);
    art.appendChild(a);
    return art;
  }

  function initWork() {
    var keys = Object.keys(DATA);
    var items = keys.map(function (k) { var el = buildCard(k, DATA[k]); grid.appendChild(el); return el; });
    var tabs = $$('.tab', $('#workTabs'));
    var bar = $('.tabs__bar');
    var countEl = $('#workCount');
    var empty = $('#workEmpty');
    var running = [];
    var currentFilter = null;

    function matches(key, f) {
      var w = DATA[key];
      if (f === 'selected') return !!w.selected;
      if (f === 'all') return !w.hideInAll;
      return (w.cats || []).indexOf(f) !== -1;
    }

    function moveBar(tab, animate) {
      if (!bar || !tab) return;
      var tr = tab.getBoundingClientRect(), pr = tab.parentNode.getBoundingClientRect();
      bar.style.transition = animate ? 'transform ' + T.pop + 'ms ' + EASE + ', width ' + T.pop + 'ms ' + EASE : 'none';
      bar.style.width = tr.width + 'px';
      bar.style.transform = 'translateX(' + (tr.left - pr.left) + 'px)';
    }

    // 개수 표시: 연타해도 항상 마지막 값이 남도록, 이전 전환을 취소하고 최신 값만 쓴다
    var countTarget = null;
    function setCount(n, animate) {
      countTarget = pad2(n);
      countEl.getAnimations().forEach(function (a) { a.cancel(); });
      if (!animate || !countEl.animate || countEl.textContent === countTarget) { countEl.textContent = countTarget; return; }
      var out = countEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T.micro / 2, fill: 'forwards' });
      out.onfinish = function () {
        countEl.textContent = countTarget;
        out.cancel();
        countEl.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: T.pop, easing: EASE });
      };
    }

    // 진행 중인 전환을 '취소'한다. 끝내기(finish)로 하면 사라지기 효과의 마지막 상태(투명)가
    // 카드에 그대로 붙어 남아, 필터를 빠르게 연타했을 때 카드가 안 보이게 된다(실제 발생한 버그).
    function stopRunning() { running.forEach(function (an) { try { an.cancel(); } catch (e) {} }); running = []; }

    function applyFilter(f, animate) {
      if (f === currentFilter) return;
      currentFilter = f;
      stopRunning();
      var target = items.filter(function (el) { return matches(el.getAttribute('data-work'), f); });
      var leaving = items.filter(function (el) { return !el.hidden && target.indexOf(el) === -1; });
      var staying = items.filter(function (el) { return !el.hidden && target.indexOf(el) !== -1; });
      var entering = target.filter(function (el) { return el.hidden; });

      setCount(target.length, animate);

      if (!animate || !Element.prototype.animate) {
        items.forEach(function (el) { el.hidden = target.indexOf(el) === -1; });
        empty.hidden = target.length !== 0;
        return;
      }

      // 1) 빠지는 카드: 살짝 작아지며 사라짐
      var exits = leaving.map(function (el) {
        var an = el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.97)' }],
          { duration: T.exit, easing: EASE_EXIT, fill: 'forwards' });
        running.push(an);
        // 취소되면 finished 가 거부되므로 조용히 넘긴다
        return an.finished.catch(function () {});
      });

      Promise.all(exits).then(function () {
        if (currentFilter !== f) return;        // 그사이 다른 필터를 눌렀으면 중단
        // 2) 남는 카드의 현재 위치 기록 → 배치 변경 → 새 위치로 미끄러지기 (FLIP)
        var first = staying.map(function (el) { return el.getBoundingClientRect(); });
        leaving.forEach(function (el) { el.hidden = true; el.getAnimations().forEach(function (a) { a.cancel(); }); });
        entering.forEach(function (el) { el.hidden = false; });
        empty.hidden = target.length !== 0;
        if (!target.length) {
          running.push(empty.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T.pop }));
        }
        staying.forEach(function (el, i) {
          var last = el.getBoundingClientRect();
          var dx = first[i].left - last.left, dy = first[i].top - last.top;
          if (!dx && !dy) return;
          running.push(el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }],
            { duration: T.window, easing: EASE }));
        });
        // 3) 새로 들어오는 카드: 아래에서 올라오며 차례로 등장
        entering.forEach(function (el, i) {
          var media = el.querySelector('.work-link');
          if (media) media.classList.add('in');   // 스크롤 등장 효과와 겹치지 않게 바로 보이는 상태로
          running.push(el.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }],
            { duration: T.window, easing: EASE, delay: Math.min(i, 8) * 45, fill: 'backwards' }));
        });
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('is-on', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        moveBar(tab, true);
        applyFilter(tab.getAttribute('data-filter'), true);
      });
      // 화살표 키로 탭 이동
      tab.addEventListener('keydown', function (e) {
        var i = tabs.indexOf(tab);
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
          next.focus(); next.click();
        }
      });
    });

    applyFilter('selected', false);
    var onTab = $('.tab.is-on');
    moveBar(onTab, false);
    window.addEventListener('resize', function () { moveBar($('.tab.is-on'), false); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { moveBar($('.tab.is-on'), false); });

    // 스크롤 등장: 카드 안쪽(.work-link)만 움직여 필터 애니메이션과 겹치지 않게 한다
    var links = $$('.work-link', grid);
    if ('IntersectionObserver' in window && !reduceMotion) {
      links.forEach(function (l, i) { l.classList.add('reveal'); l.style.transitionDelay = (i % 3) * 70 + 'ms'; });
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
      links.forEach(function (l) { io.observe(l); });
      // 안전망: 2초 뒤에도 안 보인 카드 중 화면 안에 있는 건 바로 보이게
      setTimeout(function () {
        links.forEach(function (l) { var r = l.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) l.classList.add('in'); });
      }, 2000);
    }

    initPreviews();
  }

  /* ── 5. 카드 미리보기 ──────────────────────── */
  function initPreviews() {
    $$('.work-link--native').forEach(function (card) {
      var video = card.querySelector('.work-preview');
      if (!video) return;
      var token = 0;
      function play(e) {
        if (e && e.pointerType === 'touch') return;     // 터치는 바로 상세 창이 열리므로 미리보기 생략
        var t = ++token;
        if (video.preload === 'none') { video.preload = 'auto'; video.load(); }
        var p = video.play();
        if (p && p.then) p.then(function () { if (t === token) card.classList.add('is-playing'); }).catch(function () {});
        else card.classList.add('is-playing');
      }
      function stop() {
        token++;
        video.pause();
        try { video.currentTime = 0; } catch (err) {}
        card.classList.remove('is-playing');
      }
      card.addEventListener('pointerenter', play);
      card.addEventListener('pointerleave', stop);
      card.addEventListener('focusin', play);
      card.addEventListener('focusout', stop);
    });
  }

  /* ── 5b. 일반 페이지 등장 효과 (About · Contact) ── */
  var pageReveals = $$('.page .reveal, .home-sec .reveal');
  if (pageReveals.length) {
    if ('IntersectionObserver' in window && !reduceMotion) {
      pageReveals.forEach(function (el, i) { if (i < 4) el.style.transitionDelay = i * 80 + 'ms'; });
      var pio = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); pio.unobserve(en.target); } });
      }, { threshold: 0.08 });
      pageReveals.forEach(function (el) { pio.observe(el); });
      setTimeout(function () { pageReveals.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < innerHeight) el.classList.add('in'); }); }, 1500);
    } else {
      pageReveals.forEach(function (el) { el.classList.add('in'); });
    }
  }

  /* ── 5c. 팀 카드: 커서를 따라 기울고 테두리 빛이 따라온다 (기존 사이트와 같은 효과) ── */
  $$('.pc-wrap[data-tilt]').forEach(function (wrap) {
    var card = wrap.querySelector('.pc-card');
    if (!card) return;
    var rect = null, pending = null, frame = 0;
    card.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    card.addEventListener('dragstart', function (e) { e.preventDefault(); });
    function render() {
      frame = 0;
      if (!pending) return;
      var e = pending; pending = null;
      if (!rect) rect = card.getBoundingClientRect();
      var px = e.clientX - rect.left, py = e.clientY - rect.top;
      var x = px / rect.width, y = py / rect.height, cx = rect.width / 2, cy = rect.height / 2;
      var edge = Math.min(1, Math.max(Math.abs(px - cx) / cx, Math.abs(py - cy) / cy)) * 100;
      var angle = Math.atan2(py - cy, px - cx) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;
      wrap.style.setProperty('--rx', ((0.5 - y) * 10).toFixed(2) + 'deg');
      wrap.style.setProperty('--ry', ((x - 0.5) * 14).toFixed(2) + 'deg');
      card.style.setProperty('--edge-proximity', edge.toFixed(3));
      card.style.setProperty('--cursor-angle', angle.toFixed(2) + 'deg');
    }
    wrap.addEventListener('pointerenter', function () { rect = card.getBoundingClientRect(); });
    wrap.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      pending = e;
      if (!frame) frame = requestAnimationFrame(render);
    }, { passive: true });
    wrap.addEventListener('pointerleave', function () {
      pending = null;
      wrap.style.setProperty('--rx', '0deg'); wrap.style.setProperty('--ry', '0deg');
      card.style.setProperty('--edge-proximity', '0'); card.style.setProperty('--cursor-angle', '45deg');
    });
    window.addEventListener('scroll', function () { rect = null; }, { passive: true });
  });

  /* ── 5d. 유리 패널·유리 버튼: 커서를 따라 테두리 빛과 반사가 움직인다 ── */
  var glassEls = $$('.glass');
  var glassBtns = $$('.btn--glass');
  if (glassEls.length || glassBtns.length) {
    var gPending = null, gFrame = 0;
    var gRender = function () {
      gFrame = 0; var e = gPending; if (!e) return;
      glassEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var near = e.clientX > r.left - 120 && e.clientX < r.right + 120 && e.clientY > r.top - 120 && e.clientY < r.bottom + 120;
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
        el.style.setProperty('--glow', near ? '1' : '0');
      });
      glassBtns.forEach(function (b) {
        var r = b.getBoundingClientRect();
        var dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right), dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
        var t = Math.max(0, 1 - Math.hypot(dx, dy) / 180);
        b.style.setProperty('--bx', (e.clientX - r.left) + 'px');
        b.style.setProperty('--by', (e.clientY - r.top) + 'px');
        b.style.setProperty('--bglow', (t * t * (3 - 2 * t)).toFixed(3));
      });
    };
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      gPending = e; if (!gFrame) gFrame = requestAnimationFrame(gRender);
    }, { passive: true });
  }

  /* ── 5e. About 손글씨: 필름 입자처럼 알갱이로 번지며 떠오르고, 영사기처럼 두어 번 깜빡인다 ── */
  var sigMark = $('.sig__mark');
  if (sigMark && !reduceMotion && 'IntersectionObserver' in window) {
    var sigBox = sigMark.closest('.sig');
    sigBox.classList.add('sig--anim');
    var playSig = function () {
      var w = sigMark.naturalWidth, h = sigMark.naturalHeight;
      if (!w) { sigBox.classList.remove('sig--anim'); return; }
      var cv = document.createElement('canvas');
      cv.className = 'sig__mark sig__mark--cv';
      cv.setAttribute('aria-hidden', 'true');
      cv.width = w; cv.height = h;
      sigMark.parentNode.insertBefore(cv, sigMark);
      var ctx = cv.getContext('2d');
      var B = 3, cols = Math.ceil(w / B), rows = Math.ceil(h / B);
      var mask = document.createElement('canvas'); mask.width = cols; mask.height = rows;
      var mctx = mask.getContext('2d'), md = mctx.createImageData(cols, rows);
      var th = new Float32Array(cols * rows);
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
        th[y * cols + x] = 0.5 * (x / cols) + 0.5 * Math.random();
      }
      var DUR = 2600, t0 = performance.now();
      var frame = function (now) {
        var k = Math.min(1, (now - t0) / DUR);
        var e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        var p = -0.2 + 1.4 * e;
        for (var i = 0; i < th.length; i++) {
          var a = (p - th[i]) / 0.2;
          md.data[i * 4 + 3] = a <= 0 ? 0 : a >= 1 ? 255 : (a * 255 * (0.6 + 0.4 * Math.random())) | 0;
        }
        mctx.putImageData(md, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(mask, 0, 0, cols * B, rows * B);
        ctx.globalCompositeOperation = 'source-in';
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(sigMark, 0, 0, w, h);
        if (k < 1) { requestAnimationFrame(frame); return; }
        var done = function () { sigBox.classList.remove('sig--anim'); cv.remove(); };
        if (cv.animate) {
          cv.animate([{ opacity: .32 }, { opacity: .12 }, { opacity: .36 }, { opacity: .2 }, { opacity: .32 }],
            { duration: 520, easing: 'steps(5, end)' }).onfinish = done;
        } else done();
      };
      requestAnimationFrame(frame);
    };
    var sigIO = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      sigIO.disconnect();
      var go = function () { setTimeout(playSig, 350); };
      if (sigMark.complete && sigMark.naturalWidth) go();
      else sigMark.addEventListener('load', go, { once: true });
    }, { threshold: 0.25 });
    sigIO.observe(sigBox);
  }

  /* ── 6. 문의 폼 ────────────────────────────── */
  var form = $('#inquiryForm');
  if (form) {
    var submit = $('#inquirySubmit');
    var status = $('#inquiryStatus');
    var label = submit && submit.querySelector('.btn__label');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      submit.disabled = true;
      if (label) label.textContent = '보내는 중…';
      status.textContent = '';
      status.classList.remove('is-error', 'is-ok');

      var payload = new FormData(form);
      var contact = (payload.get('contact') || '').toString().trim();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) payload.append('_replyto', contact);

      var send = IS_LOCAL
        // 시안(내 컴퓨터)에서는 실제 메일이 가지 않게 막는다
        ? new Promise(function (res) { setTimeout(function () { res({ ok: true, local: true }); }, 700); })
        : fetch('https://formspree.io/f/mvkklygw', { method: 'POST', body: payload, headers: { Accept: 'application/json' } });

      send.then(function (r) {
        if (!r.ok) throw new Error('send failed');
        form.reset();
        status.textContent = r.local ? '시안이라 실제로 보내지 않았습니다. 배포 후에는 그대로 접수됩니다.' : '문의가 접수되었습니다. 빠르게 답 드리겠습니다.';
        status.classList.add('is-ok');
        if (label) label.textContent = '보냈습니다';
        setTimeout(function () { submit.disabled = false; if (label) label.textContent = '보내기'; }, 4000);
      }).catch(function () {
        submit.disabled = false;
        if (label) label.textContent = '다시 보내기';
        var body = ['이름 / 회사: ' + (payload.get('name') || ''), '연락처: ' + contact, '분류: ' + (payload.get('type') || ''),
          '예상 일정: ' + (payload.get('schedule') || ''), '', (payload.get('message') || '')].join('\n');
        var mail = 'mailto:ceo@iddot.space?subject=' + encodeURIComponent('[iddot 문의] 새 프로젝트') + '&body=' + encodeURIComponent(body);
        status.innerHTML = '전송에 실패했습니다. <a href="' + mail + '">작성한 내용 그대로 메일로 보내기</a>';
        status.classList.add('is-error');
      });
    });
  }
})();
