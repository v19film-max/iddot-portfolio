/* iddot — interactive chrome symbol
   점(sphere) → 클릭 → 꿈틀거리며 심볼 완성 → 이후 커서 주변이 꿈틀거림 */
(function () {
  'use strict';

  var canvas = document.getElementById('symbol');
  var fallback = document.getElementById('symbolFallback');
  var video  = document.getElementById('bloom');   // 점 → 꽃
  var rvideo = document.getElementById('fold');    // 꽃 → 점
  var hint   = document.getElementById('symbolHint');
  if (!canvas || !video) return;

  var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true })
        || canvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false });

  /* ── WebGL 미지원 시 폴백: 정지 이미지 유지 ── */
  if (!gl) {
    canvas.style.display = 'none';
    if (fallback) fallback.style.display = 'block';
    return;
  }

  // 매 프레임 캔버스를 완전 투명하게 지워야 모바일에서 검은 사각형이 생기지 않는다.
  gl.clearColor(0, 0, 0, 0);

  var VERT = [
    'attribute vec2 aPos;',
    'varying vec2 vUv;',
    'void main(){',
    '  vUv = aPos * 0.5 + 0.5;',
    '  vUv.y = 1.0 - vUv.y;',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'uniform sampler2D uTex;',
    'uniform vec2  uMouse;',
    'uniform float uTime;',
    'uniform float uLive;',   // 인터랙션 활성도 0..1
    'uniform float uHover;',  // 커서 존재 0..1
    'varying vec2 vUv;',

    'void main(){',
    '  vec2 uv = vUv;',

    /* 상시 미세한 숨쉬기 왜곡 */
    '  float w = 0.0016 * uLive;',
    '  uv.x += sin(uv.y * 13.0 + uTime * 1.15) * w;',
    '  uv.y += cos(uv.x * 15.0 + uTime * 0.95) * w;',

    /* 커서 주변 꿈틀거림 */
    '  vec2  d    = uv - uMouse;',
    '  float dist = length(d);',
    '  float fall = exp(-dist * 8.5);',
    '  float rip  = sin(dist * 34.0 - uTime * 4.6) * 0.017;',
    '  uv += normalize(d + 1e-5) * rip * fall * uHover * uLive;',

    '  vec4 c = texture2D(uTex, uv);',

    /* 검은 배경 → 투명 (어떤 배경에도 자연스럽게 합성) */
    '  float lum = max(max(c.r, c.g), c.b);',
    '  float a   = smoothstep(0.015, 0.14, lum);',
    '  gl_FragColor = vec4(c.rgb, a);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('[symbol] shader:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('[symbol] link:', gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  var uTex   = gl.getUniformLocation(prog, 'uTex');
  var uMouse = gl.getUniformLocation(prog, 'uMouse');
  var uTime  = gl.getUniformLocation(prog, 'uTime');
  var uLive  = gl.getUniformLocation(prog, 'uLive');
  var uHover = gl.getUniformLocation(prog, 'uHover');

  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,0]));

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  gl.uniform1i(uTex, 0);

  /* ── 상태 ──
     dot ⇄ flower 를 클릭으로 토글. playing 중에는 클릭 무시. */
  var state = 'dot';             // dot | playing | flower
  var startImg = null, finalImg = null;
  var live = 0, liveTarget = 0;
  var hover = 0, hoverTarget = 0;
  var mouse = { x: 0.5, y: 0.5 };
  var smooth = { x: 0.5, y: 0.5 };
  var t0 = performance.now();

  function upload(src) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  }

  function loadImage(url, cb) {
    var im = new Image();
    im.onload = function () { cb(im); };
    im.onerror = function () { console.error('[symbol] image failed:', url); };
    im.src = url;
  }

  loadImage('assets/symbol_start.png', function (im) {
    startImg = im;
    if (state === 'dot') {
      upload(im);
      draw();
      // WebGL 텍스처가 준비된 뒤에만 폴백을 숨겨 초기 점이 사라지지 않게 한다.
      if (fallback) fallback.style.display = 'none';
    }
  });
  loadImage('assets/symbol_final.png', function (im) { finalImg = im; });

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width  * dpr));
    var h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  window.addEventListener('resize', resize);
  resize();

  /* ── 클릭 → 개화 / 다시 클릭 → 접힘 ──
     영상은 오프스크린에서 재생하고 캔버스 텍스처로만 출력한다.
     iOS가 video 태그의 검은 배경을 사각형으로 합성하는 문제를 막는다. */
  var guard = null;
  var playingEl = null;   // 지금 재생 중인 video 엘리먼트
  var nextState = null;   // 재생이 끝난 뒤 도달할 상태

  function toggle() {
    if (state === 'playing') return;
    if (state === 'dot')      run(video,  'flower');
    else if (state === 'flower') run(rvideo || video, 'dot');
  }

  function run(el, to) {
    if (!el) { settle(to); return; }
    state = 'playing';
    nextState = to;
    playingEl = el;
    if (hint) hint.classList.add('gone');

    el.classList.add('on');
    canvas.classList.remove('off');

    var p = el.play();
    if (p && p.catch) p.catch(function (e) {
      // 자동재생 정책 등으로 정말 재생이 불가한 경우에만 즉시 마무리.
      // (시크/버퍼링으로 인한 AbortError 는 재생이 이어지므로 무시)
      console.warn('[symbol] play rejected:', e && e.name);
      if (e && e.name === 'NotAllowedError') settle(to);
    });

    // 최후의 보루. ended / timeupdate 가 모두 실패해도 반드시 빠져나온다.
    clearTimeout(guard);
    guard = setTimeout(function () { settle(to); }, ((el.duration || 8) + 1.2) * 1000);
  }

  /* 'ended' 는 브라우저에 따라 누락되는 경우가 있어 timeupdate 로도 종료를 감지한다.
     (누락 시 가드 타임아웃까지 클릭이 먹통이 되는 문제를 막기 위함) */
  function watchEnd(el, to) {
    if (!el) return;
    el.addEventListener('ended', function () { settle(to); });
    el.addEventListener('timeupdate', function () {
      if (state !== 'playing' || playingEl !== el) return;
      var d = el.duration;
      if (d && isFinite(d) && el.currentTime >= d - 0.06) settle(to);
    });
  }

  /* 영상 → 캔버스 인계.
     깜빡임의 원인은 (1) 영상이 페이드아웃하는 동안 currentTime 을 0 으로 되돌려
     마지막 프레임 대신 첫 프레임이 잠깐 비치는 것, (2) 영상과 캔버스가 겹쳐
     크로스페이드되며 밝기가 튀는 것.
     그래서 텍스처를 올린 뒤 '동기적으로 한 번 그리고' 곧바로 맞바꾼다.
     (렌더 루프를 기다리면 프레임 타이밍에 따라 교체가 누락될 수 있다.) */
  function settle(to) {
    if (state === to) return;          // 이미 도달한 상태면 무시
    clearTimeout(guard);
    state = to;
    liveTarget = (to === 'flower') ? 1 : 0.35;   // 점 상태에서는 왜곡을 약하게

    var img = (to === 'flower') ? finalImg : startImg;
    if (img) {
      upload(img);
      draw();                          // 캔버스에 최종 프레임을 즉시 그려둔다
    }

    canvas.classList.remove('off');    // 같은 그림이므로 즉시 교체해도 티가 안 남
    if (playingEl) {
      var el = playingEl;
      el.pause();
      el.classList.remove('on');
      // 완전히 사라진 뒤에 되감는다 (되감는 순간이 보이면 그게 깜빡임이 된다)
      setTimeout(function () { try { el.currentTime = 0; } catch (e) {} }, 260);
      playingEl = null;
    }
  }

  canvas.addEventListener('click', toggle);
  canvas.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });
  watchEnd(video,  'flower');
  watchEnd(rvideo, 'dot');

  /* ── 커서 ── */
  function pointer(e) {
    var r = canvas.getBoundingClientRect();
    var cx = (e.touches ? e.touches[0].clientX : e.clientX);
    var cy = (e.touches ? e.touches[0].clientY : e.clientY);
    mouse.x = (cx - r.left) / r.width;
    mouse.y = (cy - r.top) / r.height;
    hoverTarget = 1;
  }
  canvas.addEventListener('mousemove', pointer);
  canvas.addEventListener('touchmove', pointer, { passive: true });
  canvas.addEventListener('mouseleave', function () { hoverTarget = 0; });
  canvas.addEventListener('touchend',  function () { hoverTarget = 0; });

  /* ── 그리기 ── */
  function draw() {
    gl.uniform1f(uTime,  (performance.now() - t0) * 0.001);
    gl.uniform1f(uLive,  live);
    gl.uniform1f(uHover, hover);
    gl.uniform2f(uMouse, smooth.x, smooth.y);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* ── 렌더 루프 ── */
  var lastFrame = 0;
  var symbolVisible = true;
  var frameId = null;
  function frame(now) {
    if (!symbolVisible) { frameId = null; return; }
    frameId = requestAnimationFrame(frame);
    if (now - lastFrame < 32) return;
    lastFrame = now;

    if (state === 'playing' && playingEl && playingEl.readyState >= 2) upload(playingEl);

    live  += (liveTarget  - live)  * 0.04;
    hover += (hoverTarget - hover) * 0.08;
    smooth.x += (mouse.x - smooth.x) * 0.12;
    smooth.y += (mouse.y - smooth.y) * 0.12;

    draw();
  }
  if ('IntersectionObserver' in window) {
    var symbolObserver = new IntersectionObserver(function (entries) {
      symbolVisible = entries[0].isIntersecting;
      if (symbolVisible && !frameId) frameId = requestAnimationFrame(frame);
    }, { threshold: 0.01 });
    symbolObserver.observe(canvas);
  }
  frameId = requestAnimationFrame(frame);
})();
