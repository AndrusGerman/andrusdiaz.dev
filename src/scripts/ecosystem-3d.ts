import * as THREE from 'three';
import gsap from 'gsap';

/**
 * Ecosistema 3D: núcleo KAIDO + 4 nodos de producto con etiquetas de texto
 * (sprites) y líneas de conexión que se dibujan al entrar en viewport.
 * Animación de apertura: núcleo → nodos (escala) → líneas (drawRange).
 * Colores leídos de las variables CSS del tema global.
 */

function readRgb(varName: string, fallback: [number, number, number]): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return fallback;
  const [r, g, b] = raw.split(/\s+/).map(Number);
  return [r, g, b];
}

function toColor([r, g, b]: [number, number, number]) {
  return new THREE.Color(r / 255, g / 255, b / 255);
}

function toCss([r, g, b]: [number, number, number]) {
  return `rgb(${r}, ${g}, ${b})`;
}

/** Etiqueta de texto como sprite (siempre mira a la cámara) */
function makeLabel(lines: string[], colorCss: string, scale = 1): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  lines.forEach((line, i) => {
    const isFirst = i === 0;
    ctx.font = isFirst ? '800 72px "Plus Jakarta Sans", sans-serif' : '700 56px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = isFirst ? '#ffffff' : colorCss;
    const y = 128 + (i - (lines.length - 1) / 2) * 78;
    ctx.fillText(line, 256, y);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  sprite.scale.set(2.6 * scale, 1.3 * scale, 1);
  return sprite;
}

interface NetworkNode {
  group: THREE.Group;
  baseY: number;
  phase: number;
}

export function createEcosystemScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1.5, 0.1, 100);
  camera.position.set(0, 0, 11);

  const root = new THREE.Group();
  scene.add(root);

  /* ---- Núcleo KAIDO ---- */
  const coreColor = toColor(readRgb('--accent-500', [139, 92, 246]));
  const core = new THREE.Group();
  const coreSolid = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.05, 1),
    new THREE.MeshBasicMaterial({ color: coreColor, transparent: true, opacity: 0.22 }),
  );
  const coreWire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.25, 1),
    new THREE.MeshBasicMaterial({ color: coreColor, wireframe: true, transparent: true, opacity: 0.45 }),
  );
  const coreLabel = makeLabel(['KAIDO', 'CORE'], toCss(readRgb('--accent-400', [167, 139, 250])), 1.15);
  coreLabel.position.y = -2.1;
  core.add(coreSolid, coreWire, coreLabel);
  root.add(core);

  /* ---- Nodos de producto ---- */
  const productDefs = [
    { name: ['Linko', 'Store'], varName: '--accent-300', fb: [196, 181, 253] as [number, number, number], pos: new THREE.Vector3(-3.6, 2.1, 0) },
    { name: ['Relay'], varName: '--accent-400', fb: [167, 139, 250] as [number, number, number], pos: new THREE.Vector3(3.6, 2.1, 0) },
    { name: ['Pabilo'], varName: '--accent-500', fb: [139, 92, 246] as [number, number, number], pos: new THREE.Vector3(-3.6, -2.1, 0) },
    { name: ['Linko', 'Marketing'], varName: '--accent-200', fb: [221, 214, 253] as [number, number, number], pos: new THREE.Vector3(3.6, -2.1, 0) },
  ];

  const nodes: NetworkNode[] = productDefs.map((def, i) => {
    const rgb = readRgb(def.varName, def.fb);
    const color = toColor(rgb);
    const group = new THREE.Group();
    group.position.copy(def.pos);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 24, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25 }),
    );
    const wire = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 16, 16),
      new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.5 }),
    );
    const label = makeLabel(def.name, toCss(rgb), 0.85);
    label.position.y = -1.35;

    group.add(sphere, wire, label);
    root.add(group);
    return { group, baseY: def.pos.y, phase: i * 1.7 };
  });

  /* ---- Líneas de conexión (núcleo → nodos) ---- */
  const lines: THREE.Line[] = nodes.map(({ group }, i) => {
    const rgb = readRgb(productDefs[i].varName, productDefs[i].fb);
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      group.position.clone(),
    ]);
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: toColor(rgb), transparent: true, opacity: 0.55 }),
    );
    geometry.setDrawRange(0, 0); // oculta hasta la animación de apertura
    root.add(line);
    return line;
  });

  /* ---- Estado inicial: todo oculto (animación de apertura) ---- */
  core.scale.setScalar(0);
  nodes.forEach(({ group }) => group.scale.setScalar(0));

  /* ---- Animación de apertura al entrar en viewport ---- */
  let revealed = false;
  const reveal = () => {
    if (revealed) return;
    revealed = true;

    const tl = gsap.timeline({ defaults: { ease: 'back.out(1.8)' } });
    tl.to(core.scale, { x: 1, y: 1, z: 1, duration: 0.7 })
      .to(
        nodes.map(({ group }) => group.scale),
        { x: 1, y: 1, z: 1, duration: 0.6, stagger: 0.15 },
        '-=0.3',
      );

    // Las líneas se "dibujan" del núcleo hacia los nodos
    lines.forEach((line, i) => {
      const state = { count: 0 };
      gsap.to(state, {
        count: 2,
        duration: 0.8,
        delay: 0.9 + i * 0.15,
        ease: 'power2.inOut',
        onUpdate: () => line.geometry.setDrawRange(0, Math.round(state.count)),
      });
    });
  };

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        reveal();
        observer.disconnect();
      }
    },
    { threshold: 0.35 },
  );
  observer.observe(canvas);

  /* ---- Pausar fuera de pantalla ---- */
  let visible = true;
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  });
  visibility.observe(canvas);

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
    const parent = canvas.parentElement ?? canvas;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

  /* ---- Loop ---- */
  const clock = new THREE.Clock();
  let rafId = 0;

  const tick = () => {
    rafId = requestAnimationFrame(tick);
    if (!visible || document.hidden) return;

    const t = clock.getElapsedTime();

    // Núcleo pulsante
    coreWire.rotation.y = t * 0.4;
    coreWire.rotation.x = t * 0.2;
    const pulse = 1 + Math.sin(t * 2) * 0.04;
    coreSolid.scale.setScalar(pulse);

    // Nodos flotando (bob) + rotación de malla
    nodes.forEach(({ group, baseY, phase }) => {
      group.position.y = baseY + Math.sin(t * 0.9 + phase) * 0.18;
      const wire = group.children[1];
      wire.rotation.y = t * 0.5 + phase;
    });

    // Pulso en las líneas
    lines.forEach((line, i) => {
      (line.material as THREE.LineBasicMaterial).opacity = 0.4 + Math.sin(t * 1.6 + i) * 0.2;
    });

    // Rotación global suave + parallax
    root.rotation.y = Math.sin(t * 0.15) * 0.18 + targetX * 0.15;
    root.rotation.x = targetY * 0.08;

    renderer.render(scene, camera);
  };
  tick();

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('mousemove', onMouseMove);
    observer.disconnect();
    visibility.disconnect();
    resizeObserver.disconnect();
    renderer.dispose();
  };
}
