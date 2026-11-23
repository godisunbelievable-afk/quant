// Hero wave — ported 1:1 from the original React HeroWave component.
// Same GLSL shader, same Three.js setup. Mounts into #hero-wave.
import * as THREE from "three";

const vert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const frag = `
precision highp float;
varying vec2 vUv;
uniform float uTime; uniform vec2 uRes; uniform vec2 uMouse;

#define SPEED 0.5
#define LAYERS 5

float edgeY(float x, float t, float fi){
  return 0.82 - fi * 0.13
       + 0.10 * sin(x * 0.9 + t * 0.9 + fi * 1.9)
       + 0.05 * sin(x * 1.9 - t * 1.3 + fi * 3.1)
       + 0.02 * sin(x * 3.7 + t * 1.7 + fi * 0.7);
}

void main(){
  float aspect = uRes.x / uRes.y;
  float t = uTime * SPEED;
  float x = (vUv.x - 0.5) * aspect * 1.8 + uMouse.x * 0.3;
  float y = vUv.y;
  float px = 1.5 / uRes.y;

  vec3 pale    = vec3(0.90, 0.92, 1.00);
  vec3 mid     = vec3(0.50, 0.53, 0.95);
  vec3 deep    = vec3(0.23, 0.23, 0.85);
  vec3 darkest = vec3(0.10, 0.09, 0.62);

  vec3 pm = vec3(0.0);   // premultiplied color
  float alpha = 0.0;

  for (int i = 0; i < LAYERS; i++) {
    float fi = float(i);
    float k  = fi / float(LAYERS - 1);
    float e  = edgeY(x, t, fi);

    float m = 1.0 - smoothstep(e - px, e + px, y);

    float below = clamp((e - y) / 0.40, 0.0, 1.0);
    vec3 top = mix(pale, deep, pow(k, 0.8) * 0.95);
    vec3 bot = mix(mid, darkest, k);
    vec3 c = mix(top, bot, smoothstep(0.0, 1.0, below));

    float slope = (edgeY(x + 0.02, t, fi) - e) / 0.02;
    c *= 0.92 + 0.16 * smoothstep(-0.6, 0.6, -slope);

    // "over" compositing, premultiplied, so edges never blend with black
    pm    = pm * (1.0 - m) + c * m;
    alpha = alpha * (1.0 - m) + m;
  }

  vec3 col = pm / max(alpha, 0.0001);   // un-premultiply
  gl_FragColor = vec4(col, alpha);
}`;

const el = document.getElementById("hero-wave");
if (el) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  el.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = "width:100%;height:100%;display:block";

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0, 0) },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, transparent: true });
  const geo = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geo, mat));

  const resize = () => {
    const w = el.clientWidth, h = el.clientHeight;
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w, h);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(el);

  const target = new THREE.Vector2();
  const onMove = (e) => target.set(e.clientX / innerWidth - 0.5, 0.5 - e.clientY / innerHeight);
  window.addEventListener("pointermove", onMove);

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let visible = true;
  const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting));
  io.observe(el);

  const loop = (t) => {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    uniforms.uTime.value = t / 1000;
    uniforms.uMouse.value.lerp(target, 0.04);
    renderer.render(scene, camera);
  };
  if (reduced) {
    uniforms.uTime.value = 3;
    renderer.render(scene, camera);
  } else {
    requestAnimationFrame(loop);
  }
}
