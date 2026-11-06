/* iddot 첫 화면: 점(검은 금속 구)을 누르면 꽃처럼 펼쳐져 iddot 로고가 된다.
   블렌더에서 만든 assets/iddot-bloom.glb 의 애니메이션 한 클립(0 = 닫힘, 끝 = 펼침)을
   누를 때마다 앞으로/뒤로 재생한다. WebGL 이 안 되면 펼쳐진 로고 이미지를 보여준다. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const stage = document.getElementById('stage');
const canvas = document.getElementById('stageCanvas');
const hit = document.getElementById('stageHit');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fail = () => stage.classList.add('is-fallback');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) { fail(); }

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  // 위·왼쪽에서 비치는 가는 빛 하나: 크롬 꽃잎에 긴 하이라이트가 생기게
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-2, 3, 4); scene.add(key);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
  const pivot = new THREE.Group(); scene.add(pivot);

  let mixer = null, dur = 1, prog = 0, target = 0, fitR = 1, ready = false, visible = true;
  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };

  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // 펼친 로고가 화면 짧은 쪽의 약 84%를 차지하도록 거리 조정
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const fit = Math.min(1, camera.aspect);
    camera.position.set(0, 0, fitR / (Math.tan(fov / 2) * fit * 0.84));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  };

  new GLTFLoader().load('assets/iddot-bloom.glb?v=p1', (gltf) => {
    const root = gltf.scene;
    pivot.add(root);
    if (gltf.animations.length) {
      mixer = new THREE.AnimationMixer(root);
      gltf.animations.forEach((clip) => {
        const a = mixer.clipAction(clip);
        a.clampWhenFinished = true; a.setLoop(THREE.LoopOnce, 1); a.play();
        dur = Math.max(dur, clip.duration);
      });
      dur = Math.max(...gltf.animations.map((c) => c.duration));
    }
    // 펼친 상태 기준으로 크기를 재고 가운데로 맞춘 뒤 닫힌 상태로 되돌린다
    if (mixer) mixer.setTime(dur);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const c = box.getCenter(new THREE.Vector3());
    root.position.sub(c);
    fitR = Math.max(box.max.x - box.min.x, box.max.y - box.min.y) / 2 || 1;
    if (mixer) mixer.setTime(0);
    resize();
    ready = true;
    stage.classList.add('is-ready');
    if (reduce) { target = prog = 1; mixer && mixer.setTime(dur); setOpen(true); }
  }, undefined, fail);

  // 누를 때마다 펼침/닫힘. 펼침은 조금 느리게, 닫힘은 조금 빠르게.
  const setOpen = (open) => {
    stage.classList.toggle('is-open', open);
    hit.setAttribute('aria-pressed', String(open));
    hit.setAttribute('aria-label', open ? '로고 접기' : '로고 펼치기');
  };
  hit.addEventListener('click', () => {
    if (!ready) return;
    target = target ? 0 : 1;
    setOpen(!!target);
    if (reduce) { prog = target; mixer && mixer.setTime(prog * dur); }
  });

  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    ptr.x = (e.clientX / innerWidth) * 2 - 1;
    ptr.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(stage);
  addEventListener('resize', resize);

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (!visible || !ready) return;
    if (!reduce) {
      const speed = target > prog ? 1 / 1.9 : 1 / 1.3;
      prog = target > prog ? Math.min(target, prog + dt * speed) : Math.max(target, prog - dt * speed);
    }
    // 시간 진행은 일정하게, 클립 안의 키프레임 곡선이 가속·감속을 맡는다
    if (mixer) mixer.setTime(prog * dur);
    // 커서를 따라 살짝 기울고, 닫혀 있을 땐 천천히 돌며 숨쉬듯 떠 있다
    ptr.sx += (ptr.x - ptr.sx) * 0.06; ptr.sy += (ptr.y - ptr.sy) * 0.06;
    const idle = reduce ? 0 : 1 - prog;
    pivot.rotation.y = ptr.sx * 0.35 + Math.sin(t * 0.35) * 0.25 * idle;
    pivot.rotation.x = ptr.sy * 0.22 + Math.sin(t * 0.5) * 0.06 * idle;
    pivot.position.y = Math.sin(t * 0.9) * 0.015 * fitR * idle;
    renderer.render(scene, camera);
  });
}
