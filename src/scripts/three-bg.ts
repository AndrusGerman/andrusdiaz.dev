import * as THREE from 'three';

/**
 * Escena 3D del hero: campo de partículas + icosaedro wireframe.
 * El color se lee de la variable CSS --accent-500 para seguir el tema global.
 * Se pausa automáticamente cuando sale del viewport o la pestaña pierde foco.
 */
export function createHeroScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 12;

  /* Color de acento desde el tema global */
  const readAccent = (): THREE.Color => {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-500')
      .trim();
    const [r = 139, g = 92, b = 246] = raw.split(/\s+/).map(Number);
    return new THREE.Color(r / 255, g / 255, b / 255);
  };
  const accent = readAccent();

  /* ---- Campo de partículas en esfera ---- */
  const COUNT = 900;
  const positions = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const radius = 7 + Math.random() * 3.5;
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      color: accent,
      size: 0.055,
      transparent: true,
      opacity: 0.75,
      sizeAttenuation: true,
    }),
  );
  scene.add(particles);

  /* ---- Icosaedro wireframe central ---- */
  const wireframe = new THREE.Mesh(
    new THREE.IcosahedronGeometry(3.6, 1),
    new THREE.MeshBasicMaterial({
      color: accent,
      wireframe: true,
      transparent: true,
      opacity: 0.14,
    }),
  );
  scene.add(wireframe);

  /* ---- Núcleo interior brillante ---- */
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.4, 0),
    new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.08,
    }),
  );
  scene.add(core);

  /* ---- Letras flotantes 3D (sprites de texto) ---- */
  const makeTextSprite = (text: string): THREE.Sprite => {
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 256;
    labelCanvas.height = 128;
    const ctx = labelCanvas.getContext('2d')!;
    ctx.font = '800 64px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 128, 64);
    const texture = new THREE.CanvasTexture(labelCanvas);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.4, depthWrite: false }),
    );
    sprite.scale.set(1.5, 0.75, 1);
    return sprite;
  };

  const floatingLabels: { sprite: THREE.Sprite; baseY: number; phase: number }[] = [];
  const labelTexts = ['IA', '{ }', 'API', '01', 'SaaS', 'ML'];
  labelTexts.forEach((text, i) => {
    const sprite = makeTextSprite(text);
    const angle = (i / labelTexts.length) * Math.PI * 2;
    const radius = 5.2 + (i % 3);
    sprite.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle * 1.3) * 2.4,
      Math.sin(angle) * radius * 0.6,
    );
    scene.add(sprite);
    floatingLabels.push({ sprite, baseY: sprite.position.y, phase: i * 1.1 });
  });

  /* ---- Parallax con el mouse ---- */
  let targetX = 0;
  let targetY = 0;
  const onMouseMove = (e: MouseEvent) => {
    targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('mousemove', onMouseMove, { passive: true });

  /* ---- Redimensionar ---- */
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas.parentElement ?? canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

  /* ---- Pausar fuera de pantalla / pestaña oculta ---- */
  let visible = true;
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  });
  intersection.observe(canvas);

  /* ---- Loop ---- */
  const clock = new THREE.Clock();
  let rafId = 0;

  const tick = () => {
    rafId = requestAnimationFrame(tick);
    if (!visible || document.hidden) return;

    const t = clock.getElapsedTime();
    particles.rotation.y = t * 0.045;
    particles.rotation.x = Math.sin(t * 0.1) * 0.08;
    wireframe.rotation.y = t * 0.12;
    wireframe.rotation.x = t * 0.07;
    core.rotation.y = -t * 0.2;

    // Letras flotando suavemente
    floatingLabels.forEach(({ sprite, baseY, phase }) => {
      sprite.position.y = baseY + Math.sin(t * 0.7 + phase) * 0.35;
    });

    camera.position.x += (targetX * 0.8 - camera.position.x) * 0.04;
    camera.position.y += (-targetY * 0.6 - camera.position.y) * 0.04;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  };
  tick();

  /* Limpieza (útil en HMR) */
  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('mousemove', onMouseMove);
    intersection.disconnect();
    resizeObserver.disconnect();
    particleGeometry.dispose();
    wireframe.geometry.dispose();
    core.geometry.dispose();
    renderer.dispose();
  };
}
