/* 홈 About 왼쪽: 점 → 꽃.
   알루 금속 구(알루 앱 대기 상태 그대로)를 누르면, 그 구의 표면 자체가 액체 금속처럼 흘러
   iddot 로고(꽃잎 10장·가운데 구슬·물방울)로 굳는다. 같은 모델·같은 재질·같은 빛 계산.
   변신은 js/alu-bloom.js(원본 js/alu-sphere.js 를 복사해 변신만 덧붙임, 대기 상태 값은 그대로)가 그린다.
   그림 파일이 커서 About 근처에 왔을 때 불러온다. */
import { mountAluSphere } from './alu-bloom.js?v=p16';

const stage = document.getElementById('stage');
const box = document.getElementById('aluBox');
const openBtn = document.getElementById('stageOpen');
const flowerBtn = document.getElementById('stageFlower');

let alu = null, open = false;

const setOpen = (v) => {
  if (open === v) return;
  open = v;
  openBtn.setAttribute('aria-pressed', String(v));
  openBtn.textContent = v ? 'Back to the dot' : 'Tap the dot';
  stage.classList.toggle('is-bloomed', v);
  if (alu && alu.bloom && !stage.classList.contains('is-fallback')) alu.bloom(v);
  else { stage.classList.toggle('is-open', v); flowerBtn.tabIndex = v ? 0 : -1; }   // 3D가 안 될 때: 그림으로
};
openBtn.addEventListener('click', () => setOpen(!open));
flowerBtn.addEventListener('click', () => setOpen(false));

let mounted = false;
const mount = () => {
  if (mounted) return;
  mounted = true;
  alu = mountAluSphere(box, {
    assets: new URL('../assets/alu/', import.meta.url).href,
    onReady: () => { stage.classList.add('is-ready'); stage._alu = alu; },
    onFail: () => stage.classList.add('is-fallback'),
    // 누르면 앱처럼 쏙 들어갔다가 그 반동으로 흘러 펼쳐진다. 펼친 뒤 다시 누르면 구로 돌아온다.
    onTap: () => setTimeout(() => setOpen(!open), open ? 0 : 120),
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
