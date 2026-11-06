/* 홈 About 왼쪽: 알루 금속 구(알루 앱 대기 상태 그대로, js/alu-sphere.js 는 손대지 않음).
   그림 파일이 약 35MB라 About 근처에 왔을 때 불러온다.
   구를 톡 누르면 꽃 로고로 펼쳐지고, 꽃을 누르면 다시 점으로 돌아온다. */
import { mountAluSphere } from './alu-sphere.js';

const stage = document.getElementById('stage');
const box = document.getElementById('aluBox');
const openBtn = document.getElementById('stageOpen');
const flowerBtn = document.getElementById('stageFlower');
let mounted = false;

const setOpen = (open) => {
  stage.classList.toggle('is-open', open);
  openBtn.setAttribute('aria-pressed', String(open));
  openBtn.textContent = open ? 'Back to the dot' : 'Tap the dot';
  flowerBtn.tabIndex = open ? 0 : -1;
};
const toggle = () => setOpen(!stage.classList.contains('is-open'));

const mount = () => {
  if (mounted) return;
  mounted = true;
  mountAluSphere(box, {
    assets: new URL('../assets/alu/', import.meta.url).href,
    onReady: () => stage.classList.add('is-ready'),
    onFail: () => stage.classList.add('is-fallback'),
    // 구를 누르면 앱처럼 쏙 들어갔다가, 그 반동에 맞춰 꽃이 핀다
    onTap: () => { if (!stage.classList.contains('is-open')) setTimeout(() => setOpen(true), 160); },
  });
};

openBtn.addEventListener('click', toggle);
flowerBtn.addEventListener('click', () => setOpen(false));

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { io.disconnect(); mount(); }
  }, { rootMargin: '900px 0px' });
  io.observe(stage);
} else {
  mount();
}
