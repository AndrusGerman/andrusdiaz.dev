import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export function initSculpture() {
  const canvas = document.querySelector<HTMLCanvasElement>('#kaido-sculpture');
  const container = canvas?.parentElement;
  const toggle = document.querySelector<HTMLButtonElement>('.motion-toggle');
  if (!canvas || !container) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;
  let visible = true;
  let frame = 0;
  let time = 0;
  let previous = 0;
  const pointer = new THREE.Vector2();
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 50);
  camera.position.set(0, .35, 7.5);
  camera.lookAt(0, 0, 0);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, .025);
  scene.environment = env.texture;
  room.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffeb, 0x7c816c, 2));
  const key = new THREE.DirectionalLight(0xfff5df, 4);
  key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 3);
  rim.position.set(4, 1, -2); scene.add(rim);
  const group = new THREE.Group();
  scene.add(group);
  const orange = new THREE.MeshPhysicalMaterial({ color: 0xf05b28, metalness: .38, roughness: .24, clearcoat: .65, clearcoatRoughness: .15 });
  const graphite = new THREE.MeshPhysicalMaterial({ color: 0x46503a, metalness: .7, roughness: .22, clearcoat: .4 });
  const silver = new THREE.MeshPhysicalMaterial({ color: 0xc6c6ad, metalness: .95, roughness: .21, clearcoat: .3 });
  const geometry = new THREE.TorusGeometry(1.13, .28, 32, 120);
  const ring1 = new THREE.Mesh(geometry, orange);
  ring1.rotation.set(.55, -.35, .18);
  ring1.position.set(-.28, .17, .05);
  group.add(ring1);
  const ring2 = new THREE.Mesh(geometry, graphite);
  ring2.rotation.set(1.1, .85, -.65);
  ring2.position.set(.22, -.12, -.08);
  group.add(ring2);
  const ring3 = new THREE.Mesh(new THREE.TorusGeometry(1.37, .12, 24, 140), silver);
  ring3.rotation.set(.3, 1.15, -.55);
  ring3.position.set(.05, .07, .03);
  group.add(ring3);
  const core = new THREE.Mesh(new THREE.SphereGeometry(.25, 32, 24), silver);
  core.position.set(.08, .15, .15); group.add(core);
  const satellite = new THREE.Mesh(new THREE.SphereGeometry(.1, 20, 16), orange);
  satellite.position.set(1.6, .9, .15); group.add(satellite);
  let product = container.dataset.product || 'relay';
  const colorTarget = new THREE.Color();
  const positionTarget = new THREE.Vector3();
  const orbitGroup = new THREE.Group();
  const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xbfc9a2, transparent: true, opacity: .2 });
  for (let i = 0; i < 3; i++) {
    const points = new THREE.EllipseCurve(0, 0, 1.95 + i * .11, 1.4, 0, Math.PI * 2, false, 0).getPoints(100);
    const orbit = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), orbitMaterial);
    orbit.rotation.set(.4 + i * .65, i * .4, i * .7);
    orbitGroup.add(orbit);
  }
  group.add(orbitGroup);
  const particlePositions = new Float32Array(100 * 3);
  for (let i = 0; i < 100; i++) {
    const angle = i * 2.399;
    const radius = 1.9 + (i % 9) * .07;
    particlePositions[i * 3] = Math.cos(angle) * radius;
    particlePositions[i * 3 + 1] = Math.sin(angle) * radius;
    particlePositions[i * 3 + 2] = Math.sin(i * .8) * .8;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: 0xe6eacb, size: .018, transparent: true, opacity: .55 }));
  group.add(particles);
  // Analytic soft shadow, no external textures or images.
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(5, 2), new THREE.ShaderMaterial({
    transparent:true, depthWrite:false,
    vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'varying vec2 vUv; void main(){ vec2 p=(vUv-.5)*2.; float a=exp(-dot(p,p)*5.)*.18; gl_FragColor=vec4(.20,.24,.13,a); }',
  }));
  shadow.position.set(0, -1.78, -.3); shadow.rotation.x = -1.25; scene.add(shadow);
  function resize() {
    if (!container) return;
    const width = canvas!.clientWidth;
    const height = canvas!.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = width < 450 ? 7.1 : 6.6;
    camera.updateProjectionMatrix();
    render(0);
  }
  function render(delta: number) {
    time += delta;
    colorTarget.set(product === 'pabilo' ? 0xf05b28 : product === 'linko' ? 0xa5c456 : 0xa183dc);
    orange.color.lerp(colorTarget, paused ? 1 : .05);
    const spread = product === 'pabilo' ? .55 : product === 'linko' ? -.15 : 0;
    positionTarget.set(-.28 - spread, .17 + spread * .3, .05);
    ring1.position.lerp(positionTarget, paused ? 1 : .045);
    positionTarget.set(.22 + spread, -.12, -.08);
    ring2.position.lerp(positionTarget, paused ? 1 : .045);
    orbitGroup.rotation.z = paused ? 0 : time * .025;
    particles.rotation.z = paused ? 0 : -time * .012;
    const targetX = -.12 + pointer.y * .15;
    const targetY = (product === 'linko' ? .75 : product === 'pabilo' ? -.65 : -.25) + pointer.x * .35 + (paused ? 0 : Math.sin(time * .23) * .2);
    group.rotation.x += (targetX - group.rotation.x) * .05;
    group.rotation.y += (targetY - group.rotation.y) * .05;
    group.rotation.z = -.23 + (paused ? 0 : Math.sin(time * .17) * .08);
    group.position.y = paused ? 0 : Math.sin(time * .65) * .045;
    renderer.render(scene, camera);
  }
  function tick(stamp: number) {
    frame = 0;
    if (paused || !visible || document.hidden) return;
    if (stamp - previous > 30) { render(Math.min((stamp - previous) / 1000, .06)); previous = stamp; }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (toggle) { toggle.setAttribute('aria-pressed', String(paused)); toggle.setAttribute('aria-label', paused ? 'Activar animación 3D' : 'Pausar animación 3D'); toggle.textContent = paused ? 'Activar movimiento ▷' : 'Pausar movimiento Ⅱ'; }
    cancelAnimationFrame(frame); frame = 0; previous = performance.now();
    if (!paused && visible && !document.hidden) frame = requestAnimationFrame(tick);
    else render(0);
  }
  toggle?.addEventListener('click', () => { paused = !paused; sync(); });
  document.addEventListener('kaido:product', event => {
    product = (event as CustomEvent<string>).detail;
    if (paused) render(0);
  });
  reduced.addEventListener('change', e => { paused = e.matches; sync(); });
  container.addEventListener('pointermove', e => {
    if (paused || e.pointerType === 'touch') return;
    const r = container.getBoundingClientRect();
    pointer.set((e.clientX - r.left) / r.width * 2 - 1, (e.clientY - r.top) / r.height * 2 - 1);
  });
  container.addEventListener('pointerleave', () => pointer.set(0, 0));
  const visibilityObserver = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
  visibilityObserver.observe(container);
  document.addEventListener('visibilitychange', sync);
  new ResizeObserver(resize).observe(container);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); paused = true; sync(); container.classList.remove('has-webgl'); if (toggle) toggle.hidden = true; });
  resize(); group.rotation.set(-.12, -.25, -.23); render(0);
  container.classList.add('has-webgl'); sync();
}

