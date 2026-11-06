/* iddot — GradualBlur (React Bits) 를 의존성 없는 바닐라로 이식.
   네비게이션 아래, 페이지 상단에 점진적 블러 스트립을 깔아
   스크롤되는 콘텐츠가 네비 뒤로 부드럽게 흐려지며 지나가게 한다. */
(function () {
  'use strict';

  var CURVES = {
    linear: function (p) { return p; },
    bezier: function (p) { return p * p * (3 - 2 * p); },
    'ease-in': function (p) { return p * p; },
    'ease-out': function (p) { return 1 - Math.pow(1 - p, 2); }
  };

  function buildGradualBlur(opts) {
    var cfg = Object.assign({
      position: 'top',
      height: '8rem',
      strength: 2,
      divCount: 10,
      curve: 'bezier',
      exponential: false,
      opacity: 1,
      zIndex: 49
    }, opts || {});

    var root = document.createElement('div');
    root.className = 'gradual-blur gradual-blur-' + cfg.position;
    root.setAttribute('aria-hidden', 'true');
    root.style.cssText = [
      'position:fixed', 'left:0', 'right:0',
      cfg.position + ':0',
      'height:' + cfg.height,
      'pointer-events:none',
      'z-index:' + cfg.zIndex
    ].join(';');

    var dir = cfg.position === 'bottom' ? 'to bottom' : 'to top';
    var curveFn = CURVES[cfg.curve] || CURVES.linear;
    var inc = 100 / cfg.divCount;

    for (var i = 1; i <= cfg.divCount; i++) {
      var progress = curveFn(i / cfg.divCount);
      var blurRem = cfg.exponential
        ? Math.pow(2, progress * 4) * 0.0625 * cfg.strength
        : 0.0625 * (progress * cfg.divCount + 1) * cfg.strength;

      var p1 = Math.round((inc * i - inc) * 10) / 10;
      var p2 = Math.round(inc * i * 10) / 10;
      var p3 = Math.round((inc * i + inc) * 10) / 10;
      var p4 = Math.round((inc * i + inc * 2) * 10) / 10;

      var gradient = 'transparent ' + p1 + '%, black ' + p2 + '%';
      if (p3 <= 100) gradient += ', black ' + p3 + '%';
      if (p4 <= 100) gradient += ', transparent ' + p4 + '%';

      var layer = document.createElement('div');
      var mask = 'linear-gradient(' + dir + ', ' + gradient + ')';
      layer.style.cssText = [
        'position:absolute', 'inset:0',
        '-webkit-mask-image:' + mask,
        'mask-image:' + mask,
        '-webkit-backdrop-filter:blur(' + blurRem.toFixed(3) + 'rem)',
        'backdrop-filter:blur(' + blurRem.toFixed(3) + 'rem)',
        'opacity:' + cfg.opacity,
        'background:rgba(8,8,9,.12)'
      ].join(';');
      root.appendChild(layer);
    }
    return root;
  }

  // backdrop-filter 미지원 브라우저에서는 아예 생략 (장식 요소이므로 안전하게 skip)
  if (!CSS || !CSS.supports || !CSS.supports('backdrop-filter', 'blur(1px)')) return;
  // iOS Safari에서는 고정 블러 레이어가 본문 전체를 흐리게 합성하는 경우가 있어 모바일에서는 끈다.
  if (window.matchMedia && window.matchMedia('(max-width: 640px)').matches) return;

  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(buildGradualBlur({
      position: 'top', height: '10rem', strength: 2.2,
      divCount: 6, curve: 'bezier', exponential: false, opacity: 0.78, zIndex: 49
    }));
  });
})();
