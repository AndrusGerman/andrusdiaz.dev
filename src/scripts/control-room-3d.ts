import * as THREE from 'three';

type Disposable = { dispose: () => void };

function material(color: number, opacity = 1, wireframe = false) {
  return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, wireframe, depthWrite: opacity > .5 });
}

export function createControlRoomScene(canvas: HTMLCanvasElement): () => void {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
  camera.position.set(0, .2, 8.8);

  const rig = new THREE.Group();
  rig.rotation.set(.12, -.2, .05);
  scene.add(rig);

  const coreMaterial = material(0xd6f36a, .2);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.02, 2), coreMaterial);
  rig.add(core);
  const coreWire = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 2), material(0xd6f36a, .68, true));
  rig.add(coreWire);

  const torus = new THREE.Mesh(new THREE.TorusGeometry(1.82, .012, 10, 96), material(0x70e3dc, .6, true));
  torus.rotation.x = Math.PI / 2.4;
  rig.add(torus);
  const torusTwo = new THREE.Mesh(new THREE.TorusGeometry(2.25, .008, 8, 96), material(0xbca7ff, .35, true));
  torusTwo.rotation.set(Math.PI / 3.5, .5, .3);
  rig.add(torusTwo);

  const bars = new THREE.Group();
  const barMaterial = material(0x9bb3a3, .35, true);
  for (let i = 0; i < 16; i += 1) {
    const angle = (i / 16) * Math.PI * 2;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(.025, .025, 4.5), barMaterial);
    bar.position.set(Math.cos(angle) * 2.7, Math.sin(angle) * 2.7, 0);
    bar.rotation.z = angle;
    bars.add(bar);
  }
  rig.add(bars);

  const points = new THREE.Group();
  const nodeColors = [0xd6f36a, 0x70e3dc, 0xffba6b, 0xff8b76, 0xbca7ff];
  nodeColors.forEach((color, index) => {
    const angle = (index / nodeColors.length) * Math.PI * 2 + .3;
    const node = new THREE.Mesh(new THREE.SphereGeometry(.065, 12, 12), material(color, .95));
    node.position.set(Math.cos(angle) * (2.35 + index * .1), Math.sin(angle) * (2.35 + index * .1), Math.sin(angle * 2) * .55);
    points.add(node);
  });
  rig.add(points);

  const linePositions = new Float32Array([
    -2.5, .3, .1, -.7, .1, 0, -.7, .1, 0, .1, 1.5, .2, .1, 1.5, .2, 2.45, .1, -.2,
    -1.5, -1.55, -.2, -.1, -.4, 0, -.1, -.4, 0, 1.6, -1.1, .1,
  ]);
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  const network = new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({ color: 0x70e3dc, transparent: true, opacity: .42 }));
  rig.add(network);

  const dustCount = 260;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i += 1) {
    const radius = 3.2 + Math.random() * 2.1;
    const angle = Math.random() * Math.PI * 2;
    dustPositions[i * 3] = Math.cos(angle) * radius;
    dustPositions[i * 3 + 1] = (Math.random() - .5) * 5;
    dustPositions[i * 3 + 2] = Math.sin(angle) * radius * .55;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0xa9c5b3, size: .022, transparent: true, opacity: .55 }));
  scene.add(dust);

  let targetX = 0;
  let targetY = 0;
  const onPointerMove = (event: PointerEvent) => {
    targetX = (event.clientX / window.innerWidth - .5) * .7;
    targetY = (event.clientY / window.innerHeight - .5) * .45;
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  const resize = () => {
    const parent = canvas.parentElement;
    const width = parent?.clientWidth ?? 1;
    const height = parent?.clientHeight ?? 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

  let visible = true;
  const intersection = new IntersectionObserver(([entry]) => { visible = Boolean(entry?.isIntersecting); });
  intersection.observe(canvas);

  const clock = new THREE.Clock();
  let raf = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (!visible || document.hidden) return;
    const time = clock.getElapsedTime();
    rig.rotation.y += (targetX - rig.rotation.y) * .01;
    rig.rotation.x += (targetY + .12 - rig.rotation.x) * .01;
    core.rotation.y = time * .18;
    coreWire.rotation.y = -time * .12;
    coreWire.rotation.z = time * .09;
    torus.rotation.z = time * .22;
    torusTwo.rotation.y = -time * .16;
    bars.rotation.y = time * .06;
    points.rotation.y = -time * .18;
    dust.rotation.y = time * .012;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  };
  tick();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('pointermove', onPointerMove);
    resizeObserver.disconnect();
    intersection.disconnect();
    const disposables: Disposable[] = [
      core.geometry, core.material as Disposable,
      coreWire.geometry, coreWire.material as Disposable,
      torus.geometry, torus.material as Disposable,
      torusTwo.geometry, torusTwo.material as Disposable,
      barMaterial, lineGeometry, network.material as Disposable, dustGeometry, dust.material as Disposable,
    ];
    disposables.forEach((item) => item.dispose());
    renderer.dispose();
  };
}
