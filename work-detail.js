/* iddot — Work 상세 창
   카드를 누르면 같은 페이지 위에 큰 창을 띄워 영상(왼쪽)과 작업 정보·크레딧(오른쪽)을 보여준다.
   - 작업 정보는 works.js 의 window.IDDOT_WORKS 에서 읽는다 (카드의 data-work 키로 연결).
   - 작업마다 주소가 생긴다: #work/<키>. 이 주소로 바로 들어오면 그 작업 창이 열린다.
   - 뒤로가기·Esc·바깥 클릭으로 닫히고, 닫으면 보던 목록 위치로 돌아온다.
   - 유튜브 플레이어는 창을 열 때만 불러오고 닫으면 제거한다 (첫 로딩 속도 유지).
   - Cmd/Ctrl/Shift 클릭이나 휠 클릭은 기존처럼 유튜브 새 탭으로 연다. */
(function () {
  'use strict';

  var DATA = window.IDDOT_WORKS || {};
  var HASH_PREFIX = '#work/';
  var IS_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var items = Array.prototype.slice.call(document.querySelectorAll('.work-item[data-work]'));
  if (!items.length) return;

  /* ── 창 DOM ─────────────────────────────── */
  var root = document.createElement('div');
  root.className = 'wd';
  root.id = 'workDetail';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'wdTitle');
  root.innerHTML =
    '<div class="wd__panel">' +
      '<div class="wd__top">' +
        '<button type="button" class="wd__back" data-wd-close aria-label="닫고 목록으로">' +
          '<svg viewBox="0 0 40 24" aria-hidden="true"><path d="M39 12H2M12 1.5 1.5 12 12 22.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>' +
        '</button>' +
        '<span class="wd__count" aria-hidden="true"></span>' +
        '<button type="button" class="wd__x" data-wd-close aria-label="닫기">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M21 3 3 21" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="wd__body">' +
        '<div class="wd__player"></div>' +
        '<div class="wd__info">' +
          '<p class="wd__cat"></p>' +
          '<h2 class="wd__title" id="wdTitle"></h2>' +
          '<p class="wd__artist"></p>' +
          '<p class="wd__role"><span class="wd__role-k">Role</span><span class="wd__role-v"></span></p>' +
          '<dl class="wd__credits"></dl>' +
          '<p class="wd__note"></p>' +
          '<a class="wd__yt" target="_blank" rel="noopener noreferrer">YouTube에서 보기<span aria-hidden="true"> ↗</span></a>' +
        '</div>' +
      '</div>' +
      '<div class="wd__nav">' +
        '<button type="button" class="wd__step wd__step--prev" data-wd-step="-1">' +
          '<span class="wd__step-dir">← PREV</span><span class="wd__step-title"></span>' +
        '</button>' +
        '<button type="button" class="wd__step wd__step--next" data-wd-step="1">' +
          '<span class="wd__step-dir">NEXT →</span><span class="wd__step-title"></span>' +
        '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(root);

  var panel    = root.querySelector('.wd__panel');
  panel.setAttribute('tabindex', '-1');
  var player   = root.querySelector('.wd__player');
  var elCount  = root.querySelector('.wd__count');
  var elCat    = root.querySelector('.wd__cat');
  var elTitle  = root.querySelector('.wd__title');
  var elArtist = root.querySelector('.wd__artist');
  var elCred   = root.querySelector('.wd__credits');
  var elRole   = root.querySelector('.wd__role');
  var elNote   = root.querySelector('.wd__note');
  var elYt     = root.querySelector('.wd__yt');
  var btnPrev  = root.querySelector('.wd__step--prev');
  var btnNext  = root.querySelector('.wd__step--next');

  var currentKey = null;
  var openedByUs = false;     // 이 창이 history 항목을 추가했는지 (닫을 때 back 할지 결정)
  var savedScroll = 0;
  var lastFocus = null;
  var closeTimer = 0;

  /* ── 유틸 ──────────────────────────────── */
  function keyFromHash() {
    var h = decodeURIComponent(location.hash || '');
    if (h.indexOf(HASH_PREFIX) !== 0) return null;
    var k = h.slice(HASH_PREFIX.length);
    return DATA[k] ? k : null;
  }
  function visibleKeys() {
    // 현재 필터에서 보이는 카드 순서대로 이전/다음을 고른다.
    return items.filter(function (it) { return !it.hidden; })
                .map(function (it) { return it.getAttribute('data-work'); })
                .filter(function (k) { return !!DATA[k]; });
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ── 스크롤 잠금 (iOS 사파리 포함) ─────── */
  function lockScroll() {
    savedScroll = window.pageYOffset || document.documentElement.scrollTop || 0;
    document.documentElement.classList.add('wd-open');
    document.body.style.top = (-savedScroll) + 'px';
  }
  function unlockScroll() {
    document.documentElement.classList.remove('wd-open');
    document.body.style.top = '';
    var html = document.documentElement;
    var prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';      // 부드러운 스크롤 없이 원래 위치로 즉시 복귀
    window.scrollTo(0, savedScroll);
    html.style.scrollBehavior = prev;
  }

  /* ── 내용 채우기 ───────────────────────── */
  /* 유튜브 IFrame API — 처음 창을 열 때 한 번만 불러온다.
     퍼가기 재생이 막힌 영상(소유자 설정·저작권 차단 등)을 onError 로 감지하려고 쓴다. */
  var ytApi = null;
  function loadYouTubeApi() {
    if (ytApi) return ytApi;
    ytApi = new Promise(function (resolve, reject) {
      if (window.YT && window.YT.Player) { resolve(window.YT); return; }
      var prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof prevReady === 'function') prevReady();
        resolve(window.YT);
      };
      var s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = reject;
      document.head.appendChild(s);
      setTimeout(function () { reject(new Error('YouTube API timeout')); }, 8000);
    });
    return ytApi;
  }

  var ytPlayer = null;
  var playerToken = 0;

  function clearPlayer() {
    playerToken++;
    if (ytPlayer && ytPlayer.destroy) { try { ytPlayer.destroy(); } catch (e) {} }
    ytPlayer = null;
    player.innerHTML = '';
    player.classList.remove('is-ready', 'is-fallback');
  }

  function cardMedia(key) {
    // 카드에 이미 있는 썸네일·미리보기 영상을 대체 화면에 재사용한다.
    var item = document.querySelector('.work-item[data-work="' + key + '"]');
    var poster = item && item.querySelector('.work-media img');
    var preview = item && item.querySelector('.work-preview source');
    return {
      poster: poster ? poster.getAttribute('src') : '',
      preview: preview ? preview.getAttribute('src') : ''
    };
  }

  function playLocal(src, poster, opts) {
    var v = document.createElement('video');
    if (poster) v.poster = poster;
    v.src = src;
    v.playsInline = true;
    v.autoplay = true;
    if (opts && opts.ambient) {
      // 대체 화면용: 소리 없이 반복 재생하는 배경 미리보기
      v.muted = true;
      v.loop = true;
      v.setAttribute('aria-hidden', 'true');
    } else {
      v.controls = true;
    }
    v.addEventListener('loadeddata', function () { player.classList.add('is-ready'); });
    player.appendChild(v);
    var p = v.play();
    if (p && p.catch) p.catch(function () {
      // 소리 있는 자동재생이 막힌 브라우저: 소리 끈 채 재생하고, 컨트롤의 소리 버튼으로 켤 수 있게 둔다
      if (!(opts && opts.ambient)) { v.muted = true; var q = v.play(); if (q && q.catch) q.catch(function () {}); }
    });
  }

  // 사이트 안에서 재생할 수 없는 유튜브 영상: 미리보기(또는 썸네일) + 유튜브로 가는 버튼
  function showFallback(w, key) {
    var token = playerToken;
    if (ytPlayer && ytPlayer.destroy) { try { ytPlayer.destroy(); } catch (e) {} }
    ytPlayer = null;
    if (token !== playerToken) return;
    player.innerHTML = '';
    player.classList.add('is-fallback');
    var m = cardMedia(key);
    var poster = m.poster || (w.youtube ? 'https://i.ytimg.com/vi/' + w.youtube + '/hq720.jpg' : '');
    player.style.backgroundImage = poster ? 'url(' + poster + ')' : '';
    if (m.preview) playLocal(m.preview, poster, { ambient: true });
    else player.classList.add('is-ready');

    var cta = el('div', 'wd__fallback');
    cta.appendChild(el('p', 'wd__fallback-msg', '이 영상은 유튜브에서 감상하실 수 있습니다'));
    var a = el('a', 'wd__fallback-btn');
    a.href = 'https://youtu.be/' + w.youtube;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.innerHTML = '<span>YouTube에서 보기</span><span aria-hidden="true">↗</span>';
    cta.appendChild(a);
    player.appendChild(cta);
  }

  function renderPlayer(w, key) {
    clearPlayer();
    var token = playerToken;

    if (w.youtube && w.embed === false) {
      // 퍼가기 재생이 막힌 것으로 확인된 영상은 유튜브 오류 화면을 거치지 않고 바로 대체 화면
      showFallback(w, key);
      return;
    }

    if (w.youtube) {
      player.style.backgroundImage = 'url(https://i.ytimg.com/vi/' + w.youtube + '/hq720.jpg)';
      var mount = document.createElement('div');
      player.appendChild(mount);
      loadYouTubeApi().then(function (YT) {
        if (token !== playerToken) return;     // 그사이 다른 작업으로 넘어갔으면 무시
        ytPlayer = new YT.Player(mount, {
          host: 'https://www.youtube.com',
          videoId: w.youtube,
          playerVars: { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1, origin: location.origin },
          events: {
            onReady: function (e) {
              if (token !== playerToken) return;
              player.classList.add('is-ready');
              var f = e.target.getIframe && e.target.getIframe();
              if (f) f.title = w.title || 'YouTube video';
              try { e.target.playVideo(); } catch (err) {}
            },
            onError: function () {
              // 101/150: 소유자가 외부 재생 차단, 100: 삭제/비공개, 153: 플레이어 설정 오류 등
              if (token === playerToken) showFallback(w, key);
            }
          }
        });
      }).catch(function () {
        // API 를 못 불러오면(차단·네트워크) 대체 화면으로
        if (token === playerToken) showFallback(w, key);
      });
    } else if (w.video) {
      // 재생 전 검은 화면 대신 카드 썸네일을 깔아둔다.
      var poster = cardMedia(key).poster;
      player.style.backgroundImage = poster ? 'url(' + poster + ')' : '';
      playLocal(w.video, poster);
    }
  }

  // 크레딧 값: 줄바꿈(\n)은 줄을 나누고, 대표 이름(SEUNGMIN YIM / YIM SEUNGMIN)은 굵게.
  var OWNER = /(SEUNG ?MIN YIM|YIM SEUNG ?MIN)/gi;
  function credHtml(text) {
    var esc = String(text).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
    return esc.replace(OWNER, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }
  function addRow(label, value) {
    if (!value) return;
    elCred.appendChild(el('dt', null, label));
    var dd = el('dd'); dd.innerHTML = credHtml(value);
    elCred.appendChild(dd);
  }
  // 한 칸짜리 항목 ['구역 이름'] 은 구역 제목(가로 전체)으로.
  function addSection(label) {
    elCred.appendChild(el('dt', 'wd__sec', label));
  }

  function renderInfo(key) {
    var w = DATA[key];
    elCat.textContent = w.category || '';
    elCat.hidden = !w.category;
    elTitle.textContent = w.title || '';
    elArtist.textContent = w.artist || '';
    elArtist.hidden = !w.artist;

    elCred.innerHTML = '';
    addRow('Client', w.client);
    elRole.querySelector('.wd__role-v').textContent = w.role || '';
    elRole.hidden = !w.role;
    (w.credits || []).forEach(function (c) { if (!c || !c[0]) return; if (c.length === 1) addSection(c[0]); else if (c[1]) addRow(c[0], c[1]); });
    if (false) {
      // 로컬 미리보기에서만 보이는 안내. 실제 사이트에서는 빈 줄을 그냥 숨긴다.
      var hint = el('dd', 'wd__hint', '크레딧 입력 전 (works.js 의 \'' + key + '\')');
      elCred.appendChild(hint);
    }
    elCred.hidden = !elCred.children.length;

    elNote.textContent = w.note || '';
    elNote.hidden = !w.note;

    if (w.youtube) {
      elYt.href = 'https://youtu.be/' + w.youtube;
      elYt.hidden = false;
    } else {
      elYt.hidden = true;
    }

    var keys = visibleKeys();
    if (keys.indexOf(key) === -1) keys = Object.keys(DATA);
    var i = keys.indexOf(key);
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    elCount.textContent = pad(i + 1) + ' / ' + pad(keys.length);
    var prevKey = keys[(i - 1 + keys.length) % keys.length];
    var nextKey = keys[(i + 1) % keys.length];
    btnPrev.setAttribute('data-key', prevKey);
    btnNext.setAttribute('data-key', nextKey);
    btnPrev.querySelector('.wd__step-title').textContent = DATA[prevKey].title;
    btnNext.querySelector('.wd__step-title').textContent = DATA[nextKey].title;
    root.classList.toggle('wd--single', keys.length < 2);
  }

  /* ── 열기 / 닫기 ───────────────────────── */
  function stopCardPreviews() {
    // 카드 호버 미리보기가 창 뒤에서 계속 재생되거나, 닫은 뒤에도 '재생 중'으로 남지 않게 한다.
    // main.js 의 미리보기 정지 로직(pointerleave)을 그대로 태워 재생 토큰까지 정리한다.
    Array.prototype.forEach.call(document.querySelectorAll('.work-link--native'), function (card) {
      card.dispatchEvent(new Event('pointerleave'));
    });
  }

  function show(key) {
    var wasOpen = !root.hidden && root.classList.contains('is-open');
    stopCardPreviews();
    currentKey = key;
    renderInfo(key);
    renderPlayer(DATA[key], key);
    panel.scrollTop = 0;
    if (wasOpen) return;

    clearTimeout(closeTimer);
    lastFocus = document.activeElement;
    lockScroll();
    root.hidden = false;
    // 레이아웃을 한 번 강제로 계산시킨 뒤 클래스를 붙여야 등장 트랜지션이 재생된다.
    // (requestAnimationFrame 은 탭/프레임 상황에 따라 늦게 오거나 안 와서 창이 투명하게 남을 수 있다.)
    void root.offsetWidth;
    root.classList.add('is-open');
    // 창 자체에 포커스를 둔다. 버튼에 바로 주면 열자마자 흰 포커스 테두리가 보인다.
    panel.focus({ preventScroll: true });
  }

  function hide() {
    if (root.hidden) return;
    currentKey = null;
    root.classList.remove('is-open');
    clearPlayer();                          // 재생 중인 영상을 확실히 멈춘다
    closeTimer = setTimeout(function () {
      root.hidden = true;
    }, reduceMotion ? 0 : 320);
    unlockScroll();
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function open(key) {
    if (!DATA[key]) return;
    if (keyFromHash() === key) { show(key); return; }
    // 이미 창이 열린 상태에서 이전/다음으로 넘길 땐 history 를 쌓지 않는다.
    if (!root.hidden && currentKey) {
      history.replaceState(history.state, '', HASH_PREFIX + key);
      show(key);
      return;
    }
    openedByUs = true;
    history.pushState({ wd: key }, '', HASH_PREFIX + key);
    show(key);
  }

  function close() {
    if (openedByUs) {
      openedByUs = false;
      history.back();                       // popstate 에서 hide() 된다
    } else {
      history.replaceState(null, '', location.pathname + location.search + '#work');
      hide();
    }
  }

  /* ── 이벤트 ────────────────────────────── */
  items.forEach(function (it) {
    var key = it.getAttribute('data-work');
    if (!DATA[key]) return;
    var link = it.querySelector('.work-link');
    if (!link) return;
    link.addEventListener('click', function (e) {
      // 새 탭 열기 의도(Cmd/Ctrl/Shift/휠 클릭)는 원래 링크 동작을 그대로 둔다.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      open(key);
    });
    if (link.tagName !== 'A') {
      link.setAttribute('role', 'button');
      link.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(key); }
      });
    }
  });

  root.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-wd-close]')) { close(); return; }
    var step = t.closest('[data-wd-step]');
    if (step) { open(step.getAttribute('data-key')); return; }
    // 내용 바깥(여백)을 누르면 닫는다.
    if (t === root || t === panel) close();
  });

  document.addEventListener('keydown', function (e) {
    if (root.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '');
    if (!typing && e.key === 'ArrowLeft')  { open(btnPrev.getAttribute('data-key')); return; }
    if (!typing && e.key === 'ArrowRight') { open(btnNext.getAttribute('data-key')); return; }
    if (e.key === 'Tab') {
      // 창 안에서만 포커스가 돌도록 한다.
      var f = Array.prototype.filter.call(
        root.querySelectorAll('button, a[href], iframe, video, [tabindex]:not([tabindex="-1"])'),
        function (n) { return !n.hidden && n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  window.addEventListener('popstate', function () {
    var key = keyFromHash();
    if (key) { show(key); }
    else { openedByUs = false; hide(); }
  });

  // 작업 주소(#work/키)로 바로 들어온 경우
  var initial = keyFromHash();
  if (initial) {
    show(initial);
    // 공유 링크로 바로 들어와 창을 닫으면 페이지 맨 위가 아니라 Work 목록으로 돌아가게 한다.
    var workSection = document.getElementById('work');
    if (workSection) savedScroll = Math.max(0, workSection.getBoundingClientRect().top + savedScroll);
  }
})();
