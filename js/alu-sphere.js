// 알루 금속 구 (대기 상태) — 알루 앱 alu-v2/MetalCrystal.tsx 에서 그대로 떼어 낸 독립 모듈. 필요한 것: ogl@1.0.11, 웹지엘2.
import { Renderer, Camera, Transform, Program, Mesh, Geometry, RenderTarget, Texture, Triangle } from 'ogl';

const noise = `
float hash(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
float vnoise(vec3 x){
  vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}`;

const bodyVertex = `#version 300 es
in vec4 position;in vec3 normal;in vec2 uv;
uniform mat4 modelMatrix;uniform mat4 viewMatrix;uniform mat4 projectionMatrix;
uniform vec3 uFlowAt;uniform vec3 uFlowAt0;uniform float uFlow;uniform float uFlowScale;
uniform float uSquash;uniform float uPivot;uniform vec3 uOffset;uniform vec4 uBulgeA;uniform vec4 uBulgeB;
uniform float uDroop;uniform vec4 uDent;uniform float uRipple;uniform float uRippleT;
uniform float uWander;uniform float uWanderT;uniform float uBloom;
uniform vec4 uShape;uniform vec2 uEars;uniform float uEarTilt;uniform float uWobble;uniform float uWobbleT;
out vec3 vView;out vec3 vNormal;out vec2 vUv;out vec3 vObj;out float vAo;
${noise}
float lobe(vec3 d,vec4 b,float width){return b.w*smoothstep(width,1.,dot(d,b.xyz));}
// Shapes it can turn into, as a radius for each direction (world frame, facing the viewer). Corners are rounded by a
// soft maximum, so the body stays a soft lump of metal even as a triangle.
float softPlanes(vec3 d,vec3 a,vec3 b,vec3 c,vec3 e,float k){return log(exp(k*dot(d,a))+exp(k*dot(d,b))+exp(k*dot(d,c))+exp(k*dot(d,e)))/k;}
float tetraR(vec3 d){return .56/max(softPlanes(d,vec3(0.,-1.,0.),vec3(0.,.333,.943),vec3(-.816,.333,-.471),vec3(.816,.333,-.471),9.),.05);}
float cubeR(vec3 d){vec3 a=abs(d);float k=8.;return .66/max(log(exp(k*a.x)+exp(k*a.y)+exp(k*a.z))/k,.05);}
// A flat-ish shape drawn in the screen plane (outline r2 by angle), given depth t.
float slab(vec3 d,float r2,float t){return 1./sqrt(dot(d.xy,d.xy)/(r2*r2)+d.z*d.z/(t*t));}
float heartR(vec3 d){
  d.y-=.08;
  float th=atan(d.y,d.x),s=sin(th),c=cos(th);
  float r2=(2.-2.*s+s*sqrt(abs(c))/(s+1.4))/2.9;
  return slab(d,max(r2,.12),.55);
}
float starR(vec3 d){
  float th=atan(d.y,d.x)-1.5708,k=.5+.5*cos(5.*th);
  return slab(d,.55+.62*k*k*k,.5);
}
// Ears: a long soft lobe pulled out of the head along a direction, flat front to back.
float ear(vec3 d,vec3 E,float wide,float thin){
  vec3 side=normalize(cross(E,vec3(0.,0.,1.))),fwd=normalize(cross(side,E));
  float u=dot(d,side),v=dot(d,fwd);
  return dot(d,E)>0.?exp(-u*u/wide-v*v/thin):0.;
}
void main(){
  vUv=uv;vObj=position.xyz;vAo=position.w;
  // The render's flow: a cloud texture (scale 0.55, three octaves) read relative to a point circling the body,
  // pushing the surface along its normal. The body already carries the render's own swell at its first frame
  // (baked from Blender), so only the change since then is added: at rest it is exactly the render.
  vec3 q=(position.xyz-uFlowAt)/uFlowScale,q0=(position.xyz-uFlowAt0)/uFlowScale;
  float c=vnoise(q)*.5+vnoise(q*2.)*.25+vnoise(q*4.)*.125,c0=vnoise(q0)*.5+vnoise(q0*2.)*.25+vnoise(q0*4.)*.125;
  // (Pushed straight out from the centre, so the model's inner sheets flow with the outer skin.)
  vec3 p=position.xyz+normalize(position.xyz)*(c-c0)/.875*uFlow;
  // Blooming (glad to see you): the body's own folds open outward a little, like petals, and close again.
  vec3 od=normalize(p);
  p+=od*uBloom*(smoothstep(.45,.85,vnoise(od*3.2))*.8+.2*vnoise(od*7.));
  // Everything else happens in the world, so "forward", "down" and "where you touched" stay put while it turns.
  // Pushes go straight out from the centre (not along each face), so the inner sheets of the model move with the
  // outer skin and never poke through it.
  vec3 w=(modelMatrix*vec4(p,1.)).xyz,nW=normalize(mat3(modelMatrix)*normal),d=normalize(w);float R=length(w);
  // Turning into a shape: each point moves along its direction to that shape's radius, keeping its own relief.
  float sh=uShape.x+uShape.y+uShape.z+uShape.w;
  if(sh>.001){
    float target=(uShape.x*tetraR(d)+uShape.y*cubeR(d)+uShape.z*heartR(d)+uShape.w*starR(d))/sh;
    w*=mix(1.,target/.9,min(sh,1.3));R=length(w);
  }
  // Ears sprout from the top: rabbit (long, narrow) and cat (short, wide), wiggling.
  if(uEars.x+uEars.y>.001){
    float t=uEarTilt,e=0.;
    for(int i=0;i<2;i++){
      float s=i==0?-1.:1.;
      e+=uEars.x*.42*ear(d,normalize(vec3(s*(.33+t*s),.94,.05)),.035,.016);
      e+=uEars.y*.24*ear(d,normalize(vec3(s*(.55+t*s*.5),.83,.08)),.06,.025);
    }
    w+=d*R*e;R=length(w);
  }
  // Speaking: the whole body undulates in every direction like jelly — slow broad swells plus a quicker finer
  // ripple, both drifting — as strong as the voice.
  if(uWobble>.0005){
    float jw=(vnoise(d*1.9+vec3(uWobbleT*.9,uWobbleT*.6,-uWobbleT*.7))-.5)*1.4+(vnoise(d*3.7+vec3(-uWobbleT*1.4,uWobbleT,uWobbleT*1.2)+5.)-.5)*.6;
    w+=d*R*uWobble*jw;
  }
  // Bulges toward a direction: leaning in to listen (front), a puffed cheek when sulking (side).
  w+=d*(lobe(d,uBulgeA,.55)+lobe(d,uBulgeB,.6))*R;
  // Thinking: three soft bumps wander over the surface.
  for(int i=0;i<3;i++){
    float fi=float(i);
    vec3 cc=normalize(vec3(sin(uWanderT*.7+fi*2.1),cos(uWanderT*.53+fi*1.7)*.8,sin(uWanderT*.41+fi*2.9)+.7));
    w+=d*uWander*R*exp(-(1.-dot(d,cc))*14.);
  }
  // A touch: a dent where the finger landed, then jelly ripples running out from it and dying away.
  float a=acos(clamp(dot(d,uDent.xyz),-1.,1.));
  w-=d*R*(uDent.w*exp(-a*a*9.)+uRipple*sin(a*9.-uRippleT*14.)*exp(-a*1.2)*smoothstep(0.,.25,uRippleT)*exp(-uRippleT*1.6));
  // Drooping (gloomy): the top settles and the bottom spreads.
  w.y-=uDroop*.07*(w.y+R);w.xz*=1.+uDroop*.035*(1.-w.y/R);
  // Squash and stretch about the pivot, keeping the volume.
  w.y=uPivot+(w.y-uPivot)*uSquash;w.xz/=sqrt(uSquash);
  w+=uOffset;
  vec4 mv=viewMatrix*vec4(w,1.);
  vView=mv.xyz;vNormal=mat3(viewMatrix)*nW;
  gl_Position=projectionMatrix*mv;
}`;

const bodyFragment = `#version 300 es
precision highp float;
uniform sampler2D tNormal;uniform sampler2D tLight;uniform float uExposure;uniform vec3 uGlowColor;uniform float uGlow;uniform float uGlowT;uniform vec2 uCenter;uniform float uLight;uniform float uFocus;uniform float uFocusRange;
in vec3 vView;in vec3 vNormal;in vec2 vUv;in vec3 vObj;in float vAo;
out vec4 color;
// Tangent frame from screen-space derivatives, so the mesh needs no stored tangents.
mat3 frame(vec3 N,vec3 p,vec2 uv){
  vec3 dp1=dFdx(p),dp2=dFdy(p);vec2 du1=dFdx(uv),du2=dFdy(uv);
  vec3 a=cross(dp2,N),b=cross(N,dp1);
  vec3 T=a*du1.x+b*du2.x,B=a*du1.y+b*du2.y;
  float s=inversesqrt(max(max(dot(T,T),dot(B,B)),1e-12));
  return mat3(T*s,B*s,N);
}
void main(){
  vec3 N=normalize(vNormal);if(!gl_FrontFacing)N=-N;
  #ifdef SHOW_BACK
  if(!gl_FrontFacing){color=vec4(1.,0.,0.,0.);return;}
  #endif
  // Blender's own final surface direction (normal map, fibre bump and fine facets, baked), and the light exactly as
  // Blender rendered it: its render of a sphere in this material under these lights, read at the point of the
  // sphere that faces the same way (the camera is a long lens, so facing is enough). Like Blender, light is worked
  // out several times inside each pixel — four spots of the fine relief, each lit on its own — and averaged, so the
  // tiny glints survive instead of being smoothed away before lighting.
  mat3 F=frame(N,vView,vUv);
  vec2 dx=dFdx(vUv),dy=dFdy(vUv);
  vec3 lin=vec3(0.);
  // TAPS: 4 on a computer; 2 on a phone (half the work per pixel; the 2× screen keeps the glints fine).
  for(int i=0;i<TAPS;i++){
    vec2 o=TAPS==2?(i==0?vec2(-.25,-.25):vec2(.25,.25)):i==0?vec2(.125,-.375):i==1?vec2(-.375,-.125):i==2?vec2(.375,.125):vec2(-.125,.375);
    vec3 n=normalize(F*(textureGrad(tNormal,vUv+dx*o.x+dy*o.y,dx*.3,dy*.3).xyz*2.-1.));
    lin+=pow(texture(tLight,vec2(.5+.495*n.x,.5-.495*n.y)).rgb,vec3(2.2));
  }
  // Crevices darken as in the render (Blender's ambient occlusion, baked per vertex), in linear light.
  // Inner sheets of the generated model show through gaps in places; Blender shows them in shadow, so here too:
  // a face seen from behind is an inside, lit like the bottom of a deep crevice.
  float inside=gl_FrontFacing?1.:.08;
  // Glow, only at very special moments: a soft light that wraps the body's outline and travels once around it.
  // uGlowT runs 0..1 over the moment: where along the outline the light is.
  vec3 glow=vec3(0.);
  if(uGlow>.001){
    vec3 Ng=normalize(vNormal),V=normalize(-vView);if(!gl_FrontFacing)Ng=-Ng;
    float rim=pow(1.-clamp(dot(Ng,V),0.,1.),2.5);
    float ang=atan(vView.y-uCenter.y,vView.x-uCenter.x)/6.2832+.5;
    float dist=abs(fract(ang-uGlowT+.5)-.5);
    glow=uGlowColor*uGlow*rim*(.25+smoothstep(.22,0.,dist));
  }
  vec3 col=pow(lin/float(TAPS)*mix(.06,1.,vAo*vAo)*inside*uExposure*(1.+uLight*.3)+glow,vec3(1./2.2));
  color=vec4(col,clamp(abs(-vView.z-uFocus)/uFocusRange,0.,1.));
}`;

const postVertex = `#version 300 es
in vec2 position;in vec2 uv;out vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position,0.,1.);}`;

const lensFragment = `#version 300 es
precision highp float;
uniform sampler2D tScene;uniform sampler2D tPrev;uniform vec2 uRes;uniform float uMaxR;uniform float uBloomR;uniform float uBloom;uniform float uSmear;
in vec2 vUv;out vec4 color;
void main(){
  vec4 c=texture(tScene,vUv);
  float R=c.a*uMaxR;
  vec3 acc=c.rgb;float wsum=1.;vec3 glow=vec3(0.);
  for(int i=0;i<16;i++){
    float fi=float(i)+.5,rr=sqrt(fi/16.),a=fi*2.39996;
    vec2 o=vec2(cos(a),sin(a));
    vec4 s=texture(tScene,vUv+o*rr*R/uRes);
    float w=clamp(s.a*uMaxR-rr*R+1.,0.,1.);
    acc+=s.rgb*w;wsum+=w;
    glow+=max(texture(tScene,vUv+o*(.15+rr)*uBloomR/uRes).rgb-.78,0.);
  }
  vec3 col=acc/wsum+glow/16.*uBloom;
  col=mix(col,texture(tPrev,vUv).rgb,uSmear);
  color=vec4(col,1.);
}`;

const grainFragment = `#version 300 es
precision highp float;
uniform sampler2D tImage;uniform float uGrainT;uniform float uGrainSize;uniform float uGrain;
in vec2 vUv;out vec4 color;
float h(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
float vn(vec3 x){
  vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);
}
void main(){
  vec3 col=texture(tImage,vUv).rgb;
  vec2 q=gl_FragCoord.xy/uGrainSize;
  float g=(vn(vec3(q,uGrainT))-.5)*.7+(vn(vec3(q*.45+17.,uGrainT*.7))-.5)*.3;
  float l=dot(col,vec3(.299,.587,.114));
  col+=g*uGrain*smoothstep(.0,.12,l)*(1.-l*.6);
  color=vec4(max(col,0.),1.);
}`;

// ---------------------------------------------------------------------------------------------------------------
// 알루 앱(MetalCrystal.tsx)의 "대기 상태" 그대로: 등장, 숨쉬기, 천천히 떠 있기, 구름결 흐름, 들쭉날쭉한 회전,
// 25초 조용하면 꾸벅꾸벅, (선택) 손으로 돌리기·톡 누르기. 말하기·듣기·기분 반응은 뺐다.
// 값은 앱과 한 글자도 다르지 않게 옮겼다 — 숫자를 바꾸면 앱과 달라진다.
// ---------------------------------------------------------------------------------------------------------------
const BU = .896, SIZE = 1.898;
const FLOW = .08 * SIZE / BU, FLOW_SCALE = .55 / BU, VIEW_HALF = 1.2 * SIZE / 2 / BU;
const SPIN_IDLE = .18;
const DOZE_AFTER = 25;

class Spring {
  constructor(k, c, x = 0) { this.k = k; this.c = c; this.x = x; this.v = 0; }
  step(target, dt) {
    for (let t = 0; t < dt; t += 1 / 120) { const h = Math.min(1 / 120, dt - t); this.v += (this.k * (target - this.x) - this.c * this.v) * h; this.x += this.v * h; }
    return this.x;
  }
  kick(dv) { this.v += dv; }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async'; img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
}

/**
 * 금속 구를 el 안에 띄운다. 돌려주는 함수를 부르면 깨끗이 치운다.
 * @param {HTMLElement} el 구가 들어갈 상자(크기는 이 상자를 따른다)
 * @param {{ assets?: string, interactive?: boolean, doze?: boolean, maxFps?: number,
 *           onReady?: () => void, onFail?: (e: unknown) => void, onTap?: () => void }} [opts]
 *   assets: 그림 파일 3개가 있는 폴더 주소(기본: 이 파일 옆 assets/)
 *   interactive: 끌어서 돌리기·톡 누르면 쏙 들어감(앱과 같음, 기본 true)
 *   doze: 25초 지나면 꾸벅꾸벅 조는 동작(앱과 같음, 기본 true)
 *   maxFps: 초당 장수 제한(0 = 제한 없음, 앱 대기 상태와 같음)
 */
export function mountAluSphere(el, opts = {}) {
  const base = (opts.assets ?? new URL('./assets/', import.meta.url).href).replace(/\/?$/, '/');
  const interactive = opts.interactive ?? true, doze = opts.doze ?? true, maxFps = opts.maxFps ?? 0;
  const fail = (e) => { console.warn('알루 금속 구 불러오기 실패', e); opts.onFail?.(e); };
  let renderer;
  try { renderer = new Renderer({ alpha: false, antialias: false, dpr: Math.min(devicePixelRatio || 1, 2), webgl: 2 }); }
  catch (e) { fail(e); return () => {}; }
  const gl = renderer.gl, g2 = gl;
  if (!renderer.isWebgl2) { fail(new Error('webgl2')); return () => {}; }
  gl.clearColor(0, 0, 0, 1);
  const canvas = gl.canvas;
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  el.appendChild(canvas);
  const camera = new Camera(gl, { fov: 18, near: .1, far: 50 });
  const scene = new Transform(), turn = new Transform(), tilt = new Transform();
  turn.setParent(scene); tilt.setParent(turn);
  let alive = true, raf = 0, last = 0, time = 0, grainT = 0, spin = 0, spinVel = SPIN_IDLE, flowPhase = 0, introAt = -1;
  let grab = null, body = null, bodyProgram = null, dragged = false;
  const sp = {
    squash: new Spring(70, 12, 1), lean: new Spring(22, 7), droop: new Spring(8, 5), wobble: new Spring(30, 7),
    dent: new Spring(150, 5), shake: new Spring(260, 9), pitch: new Spring(5, 3.4), born: new Spring(12, 4.2),
  };
  let wobbleT = 0, lastActive = 0, nodAt = 0, nodPhase = 0, rippleT = 9, dentDir = [0, 0, 1];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const samples = Math.min(2, g2.getParameter(g2.MAX_SAMPLES));
  const msaaBuffer = g2.createFramebuffer(), msaaColor = g2.createRenderbuffer(), msaaDepth = g2.createRenderbuffer();
  const msaa = { buffer: msaaBuffer, target: gl.FRAMEBUFFER, width: 2, height: 2, depth: true, stencil: false };
  const sceneTarget = new RenderTarget(gl, { width: 2, height: 2, depth: false });
  let lensA = new RenderTarget(gl, { width: 2, height: 2, depth: false }), lensB = new RenderTarget(gl, { width: 2, height: 2, depth: false });
  const quad = new Triangle(gl);
  const lensProgram = new Program(gl, {
    vertex: postVertex, fragment: lensFragment, depthTest: false, depthWrite: false,
    uniforms: { tScene: { value: sceneTarget.texture }, tPrev: { value: lensB.texture }, uRes: { value: [2, 2] }, uMaxR: { value: 2 }, uBloomR: { value: 20 }, uBloom: { value: .15 }, uSmear: { value: 0 } },
  });
  const grainProgram = new Program(gl, {
    vertex: postVertex, fragment: grainFragment, depthTest: false, depthWrite: false,
    uniforms: { tImage: { value: lensA.texture }, uGrainT: { value: 0 }, uGrainSize: { value: 2 }, uGrain: { value: 0 } },
  });
  const lensMesh = new Mesh(gl, { geometry: quad, program: lensProgram }), grainMesh = new Mesh(gl, { geometry: quad, program: grainProgram });

  Promise.all([fetch(base + 'alu-metal.bin').then(r => { if (!r.ok) throw Error('mesh'); return r.arrayBuffer(); }),
    loadImage(base + 'alu-metal-normal.png'), loadImage(base + 'alu-metal-light.png')])
    .then(([buf, normalImg, lightImg]) => {
      if (!alive) return;
      const head = new DataView(buf), vc = head.getUint32(0, true), ic = head.getUint32(4, true);
      if (head.getUint32(12, true) !== 1) throw Error('mesh version');
      const pos = new Int16Array(buf, 16, vc * 4), nor = new Int16Array(buf, 16 + vc * 8, vc * 4);
      const uv = new Uint16Array(buf, 16 + vc * 16, vc * 2);
      const index = new Uint32Array(buf.slice(16 + vc * 20, 16 + vc * 20 + ic * 4));
      const lightTex = new Texture(gl, { image: lightImg, flipY: false, generateMipmaps: false, minFilter: gl.LINEAR, magFilter: gl.LINEAR });
      bodyProgram = new Program(gl, {
        vertex: bodyVertex, fragment: bodyFragment.replace('precision highp float;', `precision highp float;\n#define TAPS 2`), cullFace: null, depthTest: true,
        uniforms: {
          tNormal: { value: new Texture(gl, { image: normalImg, flipY: false, generateMipmaps: true, minFilter: gl.LINEAR_MIPMAP_LINEAR, magFilter: gl.LINEAR, anisotropy: 8 }) },
          tLight: { value: lightTex },
          uExposure: { value: 1.9 }, uLight: { value: 0 }, uFocus: { value: 7 }, uFocusRange: { value: 1.5 },
          uFlowAt: { value: [.35 / BU, 0, 0] }, uFlowAt0: { value: [.35 / BU, 0, 0] }, uFlow: { value: FLOW }, uFlowScale: { value: FLOW_SCALE },
          uSquash: { value: 1 }, uPivot: { value: 0 }, uOffset: { value: [0, 0, 0] }, uBulgeA: { value: [0, .15, .99, 0] }, uBulgeB: { value: [-.75, -.1, .65, 0] },
          uDroop: { value: 0 }, uDent: { value: [0, 0, 1, 0] }, uRipple: { value: 0 }, uRippleT: { value: 9 }, uWander: { value: 0 }, uWanderT: { value: 0 }, uBloom: { value: 0 },
          uShape: { value: [0, 0, 0, 0] }, uEars: { value: [0, 0] }, uEarTilt: { value: 0 }, uGlowColor: { value: [1, 1, 1] }, uGlow: { value: 0 }, uGlowT: { value: 0 }, uCenter: { value: [0, 0] }, uWobble: { value: 0 }, uWobbleT: { value: 0 },
        },
      });
      body = new Mesh(gl, {
        geometry: new Geometry(gl, {
          position: { size: 4, data: pos, normalized: true, type: gl.SHORT }, normal: { size: 4, data: nor, normalized: true, type: gl.SHORT },
          uv: { size: 2, data: uv, normalized: true, type: gl.UNSIGNED_SHORT }, index: { data: index, type: gl.UNSIGNED_INT },
        }), program: bodyProgram, frustumCulled: false,
      });
      body.setParent(tilt);
      resize(); wake(); opts.onReady?.();
    })
    .catch(e => { if (alive) fail(e); });

  const resize = () => {
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    renderer.dpr = Math.max(1, Math.min(devicePixelRatio || 1, 2, Math.sqrt(1e6 / (w * h))));
    renderer.setSize(w, h);
    const pw = gl.drawingBufferWidth, ph = gl.drawingBufferHeight;
    msaa.width = pw; msaa.height = ph;
    g2.bindRenderbuffer(gl.RENDERBUFFER, msaaColor);
    g2.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, g2.RGBA8, pw, ph);
    g2.bindRenderbuffer(gl.RENDERBUFFER, msaaDepth);
    g2.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, g2.DEPTH_COMPONENT24, pw, ph);
    renderer.bindFramebuffer(msaa);
    g2.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msaaColor);
    g2.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, msaaDepth);
    sceneTarget.setSize(pw, ph); lensA.setSize(pw, ph); lensB.setSize(pw, ph);
    lensProgram.uniforms.uRes.value = [pw, ph];
    const unit = Math.min(pw, ph) / 390;
    lensProgram.uniforms.uMaxR.value = 0; lensProgram.uniforms.uBloomR.value = 10 * unit;
    grainProgram.uniforms.uGrainSize.value = Math.max(1, unit);
    camera.perspective({ aspect: w / h });
    camera.position.z = VIEW_HALF / Math.tan(9 * Math.PI / 180) / Math.min(1, (w / h) / (644 / 806));
    if (bodyProgram) bodyProgram.uniforms.uFocus.value = camera.position.z - .4;
    wake();
  };
  const ro = new ResizeObserver(resize); ro.observe(el);

  const frame = (now) => {
    raf = 0; if (!alive || document.hidden || !body || !bodyProgram) return;
    if (maxFps && last && now - last < 1000 / maxFps - 2) { raf = requestAnimationFrame(frame); return; }
    const gap = last ? now - last : 0;
    const dt = last ? Math.min(gap / 1000, .05) : 0; last = now;
    const still = reduced.matches;
    if (!still) { time += dt; grainT = time * 9; flowPhase += dt * .3; }
    const fa = bodyProgram.uniforms.uFlowAt.value; fa[0] = .35 / BU * Math.cos(flowPhase); fa[1] = .2 / BU * Math.sin(2 * flowPhase); fa[2] = .35 / BU * Math.sin(flowPhase);
    const dozing = doze && time - lastActive > DOZE_AFTER;
    // 숨쉬기: 들숨이 조금 길게.
    const bp = (time % 4.6) / 4.6, breath = bp < .55 ? .5 - .5 * Math.cos(Math.PI * bp / .55) : .5 + .5 * Math.cos(Math.PI * (bp - .55) / .45);
    const squashTarget = 1 + (breath - .5) * .035 * (dozing ? 1.6 : 1);
    // 등장: 아무것도 없는 데서 솟아올라 살짝 넘쳤다 자리 잡으며, 2.6초 동안 온몸이 꿈틀대고 반 바퀴 풀린다.
    if (introAt < 0) introAt = time;
    const ip = still ? 1 : Math.min(1, (time - introAt) / 2.6), iw = (1 - ip) * (1 - ip);
    sp.born.step(1, dt); if (still) sp.born.x = 1;
    sp.wobble.step(iw * .17, dt); wobbleT += dt * (1.1 + iw * 3.2);
    sp.squash.step(squashTarget, dt);
    sp.shake.step(0, dt);
    // 꾸벅꾸벅: 25초 조용하면 천천히 앞으로 기울다 퍼뜩.
    let leanTarget = 0;
    if (dozing) {
      if (time > nodAt) { nodAt = time + 6.5; nodPhase = time; }
      const t = time - nodPhase;
      leanTarget += t < 3.2 ? .5 * (t / 3.2) ** 2 : 0;
      if (t >= 3.2 && t < 3.2 + dt * 1.5) { sp.lean.kick(-2.4); sp.shake.kick(3); }
    } else nodAt = 0;
    sp.lean.step(leanTarget, dt);
    sp.droop.step(dozing ? .6 : 0, dt);
    sp.dent.step(0, dt); rippleT += dt;
    // 회전: 조금 빨라졌다 느려졌다 하며 계속 돈다.
    const drift = 1 + .3 * Math.sin(time * .13) + .15 * Math.sin(time * .37 + 1);
    const spinTarget = SPIN_IDLE * drift;
    const held = grab?.moved;
    if (!held) spinVel += (spinTarget - spinVel) * Math.min(1, dt * (Math.abs(spinTarget) > Math.abs(spinVel) ? 1.6 : .6));
    if (!still && !held) spin += dt * spinVel;
    turn.rotation.y = spin - iw * 2.4;
    if (!grab?.moved) sp.pitch.step(Math.round(sp.pitch.x / (Math.PI * 2)) * Math.PI * 2, dt);
    scene.rotation.x = sp.pitch.x;
    tilt.rotation.x = (still ? 0 : Math.sin(time * .16 + 1) * .04) + sp.lean.x;
    tilt.rotation.z = sp.shake.x * .02;
    scene.scale.set(Math.max(.001, sp.born.x));
    const u = bodyProgram.uniforms, off = u.uOffset.value;
    if (still) { u.uSquash.value = 1; off[1] = 0; }
    else { u.uSquash.value = sp.squash.x; off[1] = .012 * Math.sin(time * .7) + .006 * Math.sin(time * 1.3 + 2); }
    u.uPivot.value = -.95;
    u.uDroop.value = sp.droop.x; u.uWanderT.value = time;
    const dn = u.uDent.value; dn[0] = dentDir[0]; dn[1] = dentDir[1]; dn[2] = dentDir[2]; dn[3] = sp.dent.x; u.uRipple.value = Math.min(.06, Math.abs(sp.dent.v) * .012 + .04 * Math.exp(-rippleT)); u.uRippleT.value = rippleT;
    u.uWobble.value = still ? 0 : sp.wobble.x; u.uWobbleT.value = wobbleT;
    renderer.render({ scene, camera, target: msaa });
    g2.bindFramebuffer(g2.READ_FRAMEBUFFER, msaaBuffer);
    g2.bindFramebuffer(g2.DRAW_FRAMEBUFFER, sceneTarget.buffer);
    g2.blitFramebuffer(0, 0, msaa.width, msaa.height, 0, 0, msaa.width, msaa.height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); renderer.state.framebuffer = null;
    lensProgram.uniforms.tPrev.value = lensB.texture;
    renderer.render({ scene: lensMesh, target: lensA });
    grainProgram.uniforms.tImage.value = lensA.texture; grainProgram.uniforms.uGrainT.value = grainT;
    renderer.render({ scene: grainMesh });
    [lensA, lensB] = [lensB, lensA];
    if (!still) raf = requestAnimationFrame(frame);
  };
  const wake = () => { if (!raf && alive && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };
  const onVisibility = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else wake(); };
  // 톡 누르면 누른 자리가 쏙 들어갔다 말랑하게 돌아온다.
  const onPoint = (e) => {
    const r = el.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * 2 - 1, y = 1 - ((e.clientY - r.top) / r.height) * 2;
    const z = Math.sqrt(Math.max(.15, 1 - x * x - y * y)), n = Math.hypot(x, y, z);
    dentDir = [x / n, y / n, z / n]; sp.dent.x = .16; sp.dent.v = 0; rippleT = 0; lastActive = time; wake();
  };
  // 끌어서 돌리기: 옆으로 끌면 돌고(튕기면 계속 돌다 원래 속도로), 위아래로 끌면 넘어가고 놓으면 똑바로 선다.
  const onGrabMove = (e) => {
    if (!grab || e.pointerId !== grab.id) return;
    if (!grab.moved && Math.hypot(e.clientX - grab.x, e.clientY - grab.y) < 6) return;
    if (!grab.moved) { grab.moved = true; dragged = true; try { el.setPointerCapture(e.pointerId); } catch { /* 이미 놓음 */ } }
    const w = el.clientWidth || 300, now = performance.now(), dx = e.clientX - grab.lx;
    const da = dx / w * Math.PI * 1.3;
    spin += da;
    const v = da / Math.max(.008, (now - grab.lt) / 1000);
    spinVel = spinVel * .6 + Math.max(-9, Math.min(9, v)) * .4;
    const dp = (e.clientY - grab.ly) / w * Math.PI * 1.3;
    sp.pitch.x += dp; sp.pitch.v = sp.pitch.v * .6 + Math.max(-9, Math.min(9, dp / Math.max(.008, (now - grab.lt) / 1000))) * .4;
    grab.lx = e.clientX; grab.ly = e.clientY; grab.lt = now; lastActive = time; wake();
  };
  const onGrabEnd = (e) => {
    if (!grab || e.pointerId !== grab.id) return;
    if (grab.moved && performance.now() - grab.lt > 90) { spinVel *= .3; sp.pitch.v = 0; }
    grab = null; wake();
  };
  const onGrab = (e) => { dragged = false; grab = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, lt: performance.now(), moved: false }; };
  const onClick = () => { if (dragged) { dragged = false; return; } opts.onTap?.(); };
  if (interactive) {
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', onGrab); el.addEventListener('pointermove', onGrabMove);
    el.addEventListener('pointerup', onGrabEnd); el.addEventListener('pointercancel', onGrabEnd);
    el.addEventListener('pointerdown', onPoint); el.addEventListener('click', onClick);
  }
  document.addEventListener('visibilitychange', onVisibility);
  reduced.addEventListener('change', wake);
  return () => {
    alive = false; cancelAnimationFrame(raf); ro.disconnect();
    el.removeEventListener('pointerdown', onPoint); el.removeEventListener('pointerdown', onGrab); el.removeEventListener('pointermove', onGrabMove);
    el.removeEventListener('pointerup', onGrabEnd); el.removeEventListener('pointercancel', onGrabEnd); el.removeEventListener('click', onClick);
    document.removeEventListener('visibilitychange', onVisibility); reduced.removeEventListener('change', wake);
    body?.geometry.remove(); bodyProgram?.remove(); quad.remove(); lensProgram.remove(); grainProgram.remove();
    g2.deleteFramebuffer(msaaBuffer); g2.deleteRenderbuffer(msaaColor); g2.deleteRenderbuffer(msaaDepth);
    gl.getExtension('WEBGL_lose_context')?.loseContext(); canvas.remove();
  };
}
