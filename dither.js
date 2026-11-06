/* Footer Dither — React Bits Dither의 저해상도 웨이브·Bayer 디더링을 바닐라 캔버스로 구현 */
(function () {
  'use strict';

  var canvas = document.getElementById('footerDither');
  var footer = document.querySelector('.site-footer');
  if (!canvas || !footer || !canvas.getContext) return;

  var ctx = canvas.getContext('2d', { alpha:true });
  var bayer = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  var size = { w:0, h:0 };
  var visible = false;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var frame = 0;
  var last = 0;

  function resize() {
    var r = footer.getBoundingClientRect();
    size.w = Math.max(96, Math.min(420, Math.round(r.width / 3)));
    size.h = Math.max(80, Math.min(260, Math.round(r.height / 3)));
    canvas.width = size.w;
    canvas.height = size.h;
  }

  function draw(now) {
    var data = ctx.createImageData(size.w, size.h);
    var px = data.data;
    var time = now * 0.00008;
    for (var y = 0; y < size.h; y++) {
      var ny = y / size.h;
      for (var x = 0; x < size.w; x++) {
        var nx = x / size.w;
        var wave = Math.sin(nx * 9 + time * 6 + ny * 2.2) * .5 +
          Math.sin(ny * 11 - time * 4 + nx * 3.5) * .32 +
          Math.sin((nx + ny) * 17 + time * 2) * .18;
        var falloff = Math.max(0, 1 - Math.abs(nx - .5) * 1.25) * Math.sin(ny * Math.PI);
        var value = Math.max(0, Math.min(1, (.43 + wave * .24) * falloff));
        var threshold = (bayer[(y % 4) * 4 + (x % 4)] - 7.5) / 16;
        var level = Math.floor(Math.max(0, Math.min(1, value + threshold * .22)) * 4) / 4;
        var i = (y * size.w + x) * 4;
        px[i] = 88 + Math.round(level * 42);
        px[i + 1] = 94 + Math.round(level * 46);
        px[i + 2] = 108 + Math.round(level * 54);
        px[i + 3] = Math.round(level * 52);
      }
    }
    ctx.putImageData(data, 0, 0);
  }

  function loop(now) {
    frame = requestAnimationFrame(loop);
    if (!visible || (now - last < 84 && !reduced)) return;
    last = now;
    draw(now);
    if (reduced) cancelAnimationFrame(frame);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !frame) frame = requestAnimationFrame(loop);
    }, { threshold:.01 }).observe(footer);
  } else {
    visible = true;
    frame = requestAnimationFrame(loop);
  }
  window.addEventListener('resize', function () { resize(); if (visible) draw(performance.now()); }, { passive:true });
  resize();
  draw(performance.now());
})();
