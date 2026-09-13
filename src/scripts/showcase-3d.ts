import * as THREE from 'three';
import gsap from 'gsap';

/**
 * Escena 3D del showcase de productos.
 * Un objeto por producto con transiciones de escala/opacidad al cambiar:
 *   0 Linko Store    → cubo (inventario)
 *   1 Relay          → torus knot (flujo de mensajes)
 *   2 Pabilo         → octaedro (seguridad cristalina)
 *   3 Linko Marketing→ red de partículas (nodos de IA)
 * Los colores se leen de las variables CSS del tema global.
 */

function readColor(varName: string, fallback: [number, number, number]): THREE.Color {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  const [r, g, b] = raw ? raw.split(/\s+/).map(Number) : fallback;
  return new THREE.Color(r / 255, g / 255, b / 255);
}

function trackMaterial(mat: THREE.Material, baseOpacity: number) {
  mat.transparent = true;
  mat.opacity = 0;
  mat.userData.base = baseOpacity;
  return mat;
}

export function createShowcaseScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 9;

  const root = new THREE.Group();
  scene.add(root);

  /* ---- Constructores de objetos por producto ---- */
  const buildObjects = (): THREE.Group[] => {
    const items: THREE.Group[] = [];

    // 0 · Linko Store — cubo
    {
      const g = new THREE.Group();
      const color = readColor('--accent-300', [196, 181, 253]);
      g.add(new THREE.Mesh(
        new THREE.BoxGeometry(2.7, 2.7, 2.7),
        trackMaterial(new THREE.MeshBasicMaterial({ color, wireframe: true }), 0.28),
      ));
      g.add(new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.5, 1.5),
        trackMaterial(new THREE.MeshBasicMaterial({ color }), 0.08),
      ));
      items.push(g);
    }

    // 1 · Relay — torus knot
    {
      const g = new THREE.Group();
      const color = readColor('--accent-400', [167, 139, 250]);
      g.add(new THREE.Mesh(
        new THREE.TorusKnotGeometry(1.7, 0.45, 140, 18),
        trackMaterial(new THREE.MeshBasicMaterial({ color, wireframe: true }), 0.22),
      ));
      g.add(new THREE.Mesh(
        new THREE.TorusKnotGeometry(1.7, 0.45, 60, 8),
        trackMaterial(new THREE.MeshBasicMaterial({ color }), 0.05),
      ));
      items.push(g);
    }

    // 2 · Pabilo — octaedro
    {
      const g = new THREE.Group();
      const color = readColor('--accent-500', [139, 92, 246]);
      g.add(new THREE.Mesh(
        new THREE.OctahedronGeometry(2.5, 0),
        trackMaterial(new THREE.MeshBasicMaterial({ color, wireframe: true }), 0.3),
      ));
      g.add(new THREE.Mesh(
        new THREE.OctahedronGeometry(1.3, 0),
        trackMaterial(new THREE.MeshBasicMaterial({ color }), 0.1),
      ));
      items.push(g);
    }

    // 3 · Linko Marketing — red de partículas
    {
      const g = new THREE.Group();
      const color = readColor('--accent-200', [221, 214, 253]);
      const COUNT = 450;
      const positions = new Float32Array(COUNT * 3);
      for (let i = 0; i < COUNT; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const radius = 2.2 + Math.random() * 0.6;
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      g.add(new THREE.Points(
        geometry,
        trackMaterial(new THREE.PointsMaterial({ color, size: 0.05, sizeAttenuation: true }), 0.9),
      ));
      g.add(new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.6, 1),
        trackMaterial(new THREE.MeshBasicMaterial({ color, wireframe: true }), 0.12),
      ));
      items.push(g);
    }

    return items;
  };

  const objects = buildObjects();
  objects.forEach((obj) => {
    obj.scale.setScalar(0.5);
    obj.visible = false;
    root.add(obj);
  });

  /* ---- Estado / transiciones ---- */
  let current = 0;

  const setObjectVisibility = (obj: THREE.Group, target: number, scale: number, duration = 0.9) => {
    obj.visible = true;
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
        const mat = child.material as THREE.Material;
        gsap.to(mat, {
          opacity: target * (mat.userData.base ?? 0.2),
          duration,
          ease: 'power2.inOut',
          overwrite: 'auto',
          onComplete: () => {
            if (target === 0) obj.visible = false;
          },
        });
      }
    });
    gsap.to(obj.scale, {
      x: scale, y: scale, z: scale,
      duration,
      ease: 'power3.out',
      overwrite: 'auto',
    });
  };

  const setActive = (index: number) => {
    if (index === current && objects[index].visible) return;
    objects.forEach((obj, i) => {
      if (i === index) setObjectVisibility(obj, 1, 1);
      else if (obj.visible) setObjectVisibility(obj, 0, 0.5, 0.6);
    });
    current = index;
  };

  // Estado inicial: primer producto visible
  setActive(0);

  /* ---- Layout responsivo: objeto a la derecha en desktop ---- */
  const resize = () => {
    const parent = canvas.parentElement ?? canvas;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const desktop = w >= 1024;
    root.position.x = desktop ? 2.6 : 0;
    root.position.y = desktop ? 0 : 1.4;
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

  /* ---- Pausar fuera de pantalla ---- */
  let visible = true;
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  });
  intersection.observe(canvas);

  /* ---- Parallax sutil con el mouse ---- */
  let targetX = 0;
  let targetY = 0;
  const onMouseMove = (e: MouseEvent) => {
    targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('mousemove', onMouseMove, { passive: true });

  /* ---- Loop ---- */
  const clock = new THREE.Clock();
  let rafId = 0;

  const tick = () => {
    rafId = requestAnimationFrame(tick);
    if (!visible || document.hidden) return;

    const t = clock.getElapsedTime();
    objects.forEach((obj, i) => {
      if (!obj.visible) return;
      const speed = i === current ? 1 : 0.3;
      obj.rotation.y = t * 0.35 * speed;
      obj.rotation.x = Math.sin(t * 0.4) * 0.15 * speed;
    });

    root.rotation.y += (targetX * 0.12 - root.rotation.y) * 0.05;
    root.rotation.x += (targetY * 0.08 - root.rotation.x) * 0.05;

    renderer.render(scene, camera);
  };
  tick();

  return {
    setActive,
    dispose: () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
      intersection.disconnect();
      resizeObserver.disconnect();
      objects.forEach((obj) => {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
          }
        });
      });
      renderer.dispose();
    },
  };
}
