/* 홈 About 왼쪽: 점 → 꽃.
   평소엔 알루 금속 구(알루 앱 대기 상태 그대로, 실시간)가 돈다. 누르면 원래 렌더 자세로 제자리에 선 뒤,
   같은 자세에서 시작하는 블렌더 통렌더 영상(assets/alu/bloom-*.mp4)으로 이음매 없이 넘어간다:
   거친 알루 표면이 녹아 매끈한 액체 구가 되고, 닦이며 앞면부터 펼쳐져 iddot 크롬 꽃이 된다.
   다시 누르면 거꾸로 접혀(fold-*.mp4) 알루로 돌아오고, 그 자리에서 다시 돈다.
   그림 파일이 커서 About 근처에 왔을 때 불러온다. */
import { mountAluSphere } from './alu-bloom.js?v=p19';

const stage = document.getElementById('stage');
const box = document.getElementById('aluBox');
const openBtn = document.getElementById('stageOpen');
const flowerBtn = document.getElementById('stageFlower');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const small = matchMedia('(max-width: 700px)');

let alu = null, open = false, busy = false, want = false;

// 영상 두 개(펼침·접힘). 같은 자리·같은 크기로 알루 위에 겹친다.
const vid = (name) => {
  const v = document.createElement('video');
  v.className = 'stage__vid';
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.disablePictureInPicture = true;
  v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
  v.src = `assets/alu/${name}-${small.matches ? 720 : 1080}.mp4?v=6`;
  v.addEventListener('click', () => toggle());
  stage.insertBefore(v, openBtn);
  return v;
};
let bloomV = null, foldV = null;

const show = (v, on) => v && v.classList.toggle('is-on', on);
const playFrom0 = (v) => new Promise((res) => {
  v.currentTime = 0;
  const go = () => { v.removeEventListener('playing', go); res(); };
  v.addEventListener('playing', go);
  const p = v.play(); if (p && p.catch) p.catch(() => { v.removeEventListener('playing', go); res(); });
});
const ended = (v) => new Promise((res) => {
  if (v.ended) return res();
  const f = () => { v.removeEventListener('ended', f); res(); };
  v.addEventListener('ended', f);
});
const toEnd = (v) => new Promise((res) => {
  const f = () => { v.removeEventListener('seeked', f); res(); };
  v.addEventListener('seeked', f); v.pause(); v.currentTime = Math.max(0, (v.duration || 2) - .01);
});
const nearEnd = (v, sec) => new Promise((res) => {
  const f = () => { if (v.ended || (v.duration && v.currentTime >= v.duration - sec)) { v.removeEventListener('timeupdate', f); res(); } };
  v.addEventListener('timeupdate', f); f();
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const label = (v) => {
  openBtn.setAttribute('aria-pressed', String(v));
  openBtn.textContent = v ? 'Back to the dot' : 'Tap the dot';
  stage.classList.toggle('is-bloomed', v);
};

async function run() {
  if (busy) return; busy = true;
  while (want !== open) {
    const v = want;
    if (v) {
      // 펼치기: 알루가 원래 렌더 자세로 모인 뒤(최대 0.7초) 영상 첫 장면 위로 살며시 넘어간다.
      await Promise.race([alu.rest(true), wait(520)]);
      if (reduced.matches) { await toEnd(bloomV); show(bloomV, true); }
      else {
        await playFrom0(bloomV); show(bloomV, true);
        await wait(300); if (bloomV.classList.contains('is-on')) alu.pause?.(true);   // 영상이 덮는 동안 알루는 쉰다(끊김 방지)
        await ended(bloomV);
      }
      show(foldV, false);
      open = true;
    } else {
      // 접기: 꽃(펼침 영상 마지막 장면 = 접힘 영상 첫 장면)에서 거꾸로 접혀 알루로, 그다음 실시간 알루로 넘어간다.
      if (reduced.matches) { alu.pause?.(false); show(bloomV, false); }
      else {
        await playFrom0(foldV);
        // 같은 장면끼리 바꿔 끼우기: 겹쳐 흐려지지 않게 전환 없이 한 번에
        foldV.style.transition = bloomV.style.transition = 'none';
        show(foldV, true); show(bloomV, false); void foldV.offsetWidth;
        foldV.style.transition = bloomV.style.transition = '';
        await nearEnd(foldV, .7); alu.pause?.(false);            // 끝나기 직전에 알루를 다시 깨워 둔다
        await ended(foldV); show(foldV, false);
        await wait(220);
      }
      alu.rest(false);
      open = false;
    }
  }
  busy = false;
}

const setOpen = (v) => {
  if (want === v && (busy || open === v)) return;
  want = v; label(v);
  if (alu && bloomV && !stage.classList.contains('is-fallback')) run();
  else { stage.classList.toggle('is-open', v); flowerBtn.tabIndex = v ? 0 : -1; }   // 3D가 안 될 때: 그림으로
};
const toggle = () => setOpen(!want);
openBtn.addEventListener('click', toggle);
flowerBtn.addEventListener('click', () => setOpen(false));

let mounted = false;
const mount = () => {
  if (mounted) return;
  mounted = true;
  alu = mountAluSphere(box, {
    assets: new URL('../assets/alu/', import.meta.url).href,
    onReady: () => { bloomV = vid('bloom'); foldV = vid('fold'); stage.classList.add('is-ready'); stage._alu = alu; },
    onFail: () => stage.classList.add('is-fallback'),
    // 누르면 앱처럼 쏙 들어갔다가 그 반동으로 펼쳐진다.
    onTap: () => setTimeout(toggle, 90),
  });
};

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { io.disconnect(); mount(); }
  }, { rootMargin: '900px 0px' });
  io.observe(stage);
} else {
  mount();
}
