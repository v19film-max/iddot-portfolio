/* 홈 About 왼쪽: 점 → 꽃.
   - 구는 처음부터 끝까지 알루 앱의 금속 구 그대로다(js/alu-sphere.js, ogl 1.0.11, 손대지 않음).
     누르면 그 구가 돌고 숨쉬는 채로 가운데로 줄어들어 크롬 구슬 크기가 되고, 마지막에 구슬로 녹아든다.
   - 크롬 꽃잎·구슬·물방울은 블렌더에서 만든 assets/iddot-bloom.glb (three.js)로 그 위에 그린다.
     블렌더의 '한 장씩 차례로' 간격은 지우고, 꽃잎마다 작은 불규칙 차이만 남겨 한 번에 펼쳐 나오게 한다.
   - 다시 누르면 거꾸로 접혀 알루 구로 돌아온다. 그림 파일이 커서 About 근처에 왔을 때 불러온다. */
import { mountAluSphere } from './alu-sphere.js';

const stage = document.getElementById('stage');
const box = document.getElementById('aluBox');
const openBtn = document.getElementById('stageOpen');
const flowerBtn = document.getElementById('stageFlower');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const ALU_DIAM = 0.75;     // 알루 구가 상자 너비에서 차지하는 비율(실측)
const FLOWER_DIAM = 0.86;  // 펼친 꽃이 상자에서 차지할 비율
const STAGGER = 0.075;     // 블렌더 애니메이션의 꽃잎 간 간격(초) → 지운다
const DELAY = 0.1;         // 꽃잎은 구가 조금 줄어든 다음 피어난다

let bloom = null, open = false;

const label = () => {
  openBtn.setAttribute('aria-pressed', String(open));
  openBtn.textContent = open ? 'Back to the dot' : 'Tap the dot';
};
const setOpen = (v) => {
  if (open === v) return;
  open = v; label();
  if (bloom) bloom.play(v);
  else { stage.classList.toggle('is-open', v); flowerBtn.tabIndex = v ? 0 : -1; } // 3D를 못 불렀을 때: 그림으로
};
openBtn.addEventListener('click', () => setOpen(!open));
flowerBtn.addEventListener('click', () => setOpen(false));

// 늘 같은 결과가 나오는 작은 난수(새로고침해도 꽃잎 리듬이 같게)
const seeded = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

async function loadBloom() {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');

  const canvas = document.createElement('canvas');
  canvas.className = 'stage__bloom';
  canvas.setAttribute('aria-hidden', 'true');
  stage.insertBefore(canvas, openBtn);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  // 크롬용 환경: 밝은 방 속에 검은 띠 몇 줄 → 원래 로고처럼 하얀 크롬 위로 검은 반사 줄이 지나간다
  const env = new THREE.Scene();
  env.background = new THREE.Color(0.74, 0.74, 0.75);
  const band = (w, h, x, y, z, ry, rx, rz, v) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz); env.add(m);
  };
  band(14, 0.8, 0, 0.9, 5, 0, 0, 0.16, 0.0);    // 앞쪽 가로 검은 띠 (꽃잎 가운데 검은 줄)
  band(1.4, 14, -4.2, 0, 4, 0.5, 0, 0.25, 0.02);  // 옆쪽 비스듬한 검은 띠
  band(14, 2.5, 0, -3.2, 4, 0, 0.9, 0, 0.05);  // 아래 어두운 바닥
  band(3, 0.4, 2.2, 2.4, 5, 0, 0, -0.3, 4.0);  // 강한 하이라이트 한 줄
  scene.environment = pmrem.fromScene(env, 0.015).texture;
  void RoomEnvironment;
  const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(-2, 3, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe6ff, 0.5); rim.position.set(3, -1, 2); scene.add(rim);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000); // 상자 1px = 1단위
  camera.position.z = 100;
  const pivot = new THREE.Group(); scene.add(pivot);

  const gltf = await new Promise((res, rej) => new GLTFLoader().load('assets/iddot-bloom.glb?v=p8', res, undefined, rej));
  const root = gltf.scene; pivot.add(root);
  const clip = gltf.animations[0];

  // 블렌더 금속 구는 쓰지 않는다(구는 알루 구가 맡는다)
  const gSphere = root.getObjectByName('PS_ALU_Sphere');
  if (gSphere) gSphere.visible = false;
  const bead = root.getObjectByName('PS_CenterBead');

  // 오브젝트마다 따로 재생할 수 있게 클립을 나누고, 꽃잎 차례 간격을 지운 시간 차를 정한다
  const mixer = new THREE.AnimationMixer(root);
  const groups = {};
  clip.tracks.forEach((t) => {
    const node = THREE.PropertyBinding.parseTrackName(t.name).nodeName;
    (groups[node] = groups[node] || []).push(t);
  });
  const parts = Object.keys(groups).filter((n) => n !== 'PS_ALU_Sphere').map((node, i) => {
    const act = mixer.clipAction(new THREE.AnimationClip(node, clip.duration, groups[node]));
    act.setLoop(THREE.LoopRepeat, Infinity); act.play();
    const m = node.match(/PS_Petal_(\d+)/);
    let shift = 0;
    if (m) shift = (parseInt(m[1], 10) - 1) * STAGGER - DELAY - 0.035 + seeded(i + 1) * 0.085;   // 한 번에 + 작은 엇박
    else if (/PS_Drop/.test(node)) shift = -DELAY - 0.05 + seeded(i + 7) * 0.1;
    return { act, shift };
  });
  const DUR = clip.duration;
  const LEN = DUR - 9 * STAGGER + 0.08 + DELAY;   // 간격을 지운 만큼 짧아진 실제 길이
  const setT = (T) => {
    parts.forEach((p) => { p.act.time = T <= 0 ? 0 : Math.min(DUR - 1e-4, Math.max(0, T + p.shift)); });
    mixer.update(0);
  };

  // 펼친 꽃의 크기와 구슬 지름(블렌더 단위)
  setT(LEN); root.updateMatrixWorld(true);
  const fBox = new THREE.Box3().setFromObject(root, true);
  const rFlower = Math.max(fBox.max.x - fBox.min.x, fBox.max.y - fBox.min.y) / 2 || 1;
  const fCenter = fBox.getCenter(new THREE.Vector3());
  const bBox = bead ? new THREE.Box3().setFromObject(bead) : null;
  const beadDiam = bBox ? Math.max(bBox.max.x - bBox.min.x, bBox.max.y - bBox.min.y) : 0.284;
  setT(0);

  let W = 1, scale = 1, prog = 0, target = 0, running = false, visible = true;
  const resize = () => {
    W = stage.clientWidth;
    renderer.setSize(W, W, false);
    camera.left = -W / 2; camera.right = W / 2; camera.top = W / 2; camera.bottom = -W / 2;
    camera.updateProjectionMatrix();
    scale = (FLOWER_DIAM * W / 2) / rFlower;
    pivot.scale.setScalar(scale);
    pivot.position.set(-fCenter.x * scale, -fCenter.y * scale, 0);
  };
  resize();

  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = stage.getBoundingClientRect();
    ptr.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    ptr.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
  }, { passive: true });

  const easeIn = (t) => t * t * t;
  function draw() {
    const T = prog * LEN;
    setT(T);
    // 알루 구: 같은 구가 돌고 숨쉬는 채로 가운데로 줄어들어 구슬 크기가 되고, 끝에서 구슬로 녹아든다
    const beadPx = beadDiam * scale, sphereEnd = beadPx / (ALU_DIAM * W);
    const k = smooth(0, 0.82, T);
    const sc = 1 + (sphereEnd - 1) * (1 - Math.pow(1 - k, 2.4));
    box.style.transform = `scale(${sc.toFixed(4)})`;
    box.style.opacity = String(1 - smooth(0.62, 0.86, T));
    if (bead) bead.visible = T > 0.55;
    // 꽃이 다 피면 커서를 따라 살짝 기운다
    const o = smooth(0.8, LEN, T);
    ptr.sx += (ptr.x - ptr.sx) * .08; ptr.sy += (ptr.y - ptr.sy) * .08;
    pivot.rotation.y = ptr.sx * .28 * o; pivot.rotation.x = ptr.sy * .2 * o;
    renderer.render(scene, camera);
  }

  let last = 0;
  function loop(now) {
    const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now;
    if (reduce) prog = target;
    else if (prog < target) prog = Math.min(target, prog + dt / (LEN * 1.05));
    else if (prog > target) prog = Math.max(target, prog - dt / (LEN * 0.8));
    if (visible || prog !== target) draw();
    if (prog === 0 && target === 0) {
      box.style.transform = ''; box.style.opacity = '';
      stage.classList.remove('is-bloom'); renderer.clear();
      running = false; last = 0; return;
    }
    requestAnimationFrame(loop);
  }

  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(stage);
  addEventListener('resize', () => { resize(); if (running) draw(); });
  canvas.addEventListener('click', () => setOpen(false));

  return {
    // 검증용: 특정 진행 지점(0~1)의 장면을 그린다
    seek(v) { prog = target = v; stage.classList.toggle('is-bloom', v > 0); draw(); },
    play(v) {
      target = v ? 1 : 0;
      if (v) stage.classList.add('is-bloom');
      if (!running) { running = true; last = 0; requestAnimationFrame(loop); }
    },
  };
}

let mounted = false;
const mount = () => {
  if (mounted) return;
  mounted = true;
  mountAluSphere(box, {
    assets: new URL('../assets/alu/', import.meta.url).href,
    onReady: () => {
      stage.classList.add('is-ready');
      loadBloom().then((b) => { bloom = b; stage._bloom = b; stage.classList.add('has-bloom'); if (open) b.play(true); })
        .catch((e) => console.warn('3D 꽃 불러오기 실패, 그림으로 대체', e));
    },
    onFail: () => stage.classList.add('is-fallback'),
    onTap: () => { if (!open) setTimeout(() => setOpen(true), 140); },
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
