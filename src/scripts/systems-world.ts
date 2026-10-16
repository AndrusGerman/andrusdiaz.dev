import * as THREE from 'three';

export interface SystemsWorld {
  setProgress(progress: number): void;
  dispose(): void;
}

/** A small, real-time hardware diorama. Scroll is the only director of the camera. */
export function createSystemsWorld(canvas: HTMLCanvasElement): SystemsWorld {
  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: true, powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x090f18, 0.025);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 85);
  const world = new THREE.Group();
  scene.add(world);
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const keepGeometry = <T extends THREE.BufferGeometry>(geometry: T): T => {
    geometries.add(geometry);
    return geometry;
  };
  const keepMaterial = <T extends THREE.Material>(material: T): T => {
    materials.add(material);
    return material;
  };
  const box = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
  const cylinder = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 16));
  const torus = keepGeometry(new THREE.TorusGeometry(1, 0.055, 6, 36));
  const packetGeometry = keepGeometry(new THREE.IcosahedronGeometry(0.045, 0));
  const material = (color: number, metalness: number, roughness: number) =>
    keepMaterial(new THREE.MeshStandardMaterial({ color, metalness, roughness }));
  const pcb = material(0x122f31, 0.5, 0.38);
  const pcbDark = material(0x101e27, 0.5, 0.4);
  const aluminium = material(0x9aadb7, 0.86, 0.27);
  const blackMetal = material(0x26333b, 0.78, 0.32);
  const ceramic = material(0x10171e, 0.25, 0.45);
  const copper = material(0xc3874d, 0.76, 0.3);
  const gold = material(0xdfb879, 0.72, 0.3);
  const cyan = keepMaterial(new THREE.MeshStandardMaterial({
    color: 0x74e5e2, emissive: 0x2cbac3, emissiveIntensity: 2.1, roughness: 0.3,
  }));
  const amber = keepMaterial(new THREE.MeshStandardMaterial({
    color: 0xffc587, emissive: 0xff9a3f, emissiveIntensity: 1.8, roughness: 0.35,
  }));
  const glass = keepMaterial(new THREE.MeshPhysicalMaterial({
    color: 0x84bfc8, metalness: 0.3, roughness: 0.16,
    transparent: true, opacity: 0.17, depthWrite: false, side: THREE.DoubleSide,
    clearcoat: 1,
  }));
  const traceMaterial = keepMaterial(new THREE.LineBasicMaterial({
    color: 0xd69b61, transparent: true, opacity: 0.56,
  }));
  const fiberMaterial = keepMaterial(new THREE.LineBasicMaterial({
    color: 0x70cfd0, transparent: true, opacity: 0.65,
  }));

  const mesh = (
    parent: THREE.Object3D, geometry: THREE.BufferGeometry, mat: THREE.Material,
    position: [number, number, number], size: [number, number, number],
  ) => {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(...position);
    object.scale.set(...size);
    parent.add(object);
    return object;
  };
  const block = (
    parent: THREE.Object3D, mat: THREE.Material,
    position: [number, number, number], size: [number, number, number],
  ) => mesh(parent, box, mat, position, size);
  const dummy = new THREE.Object3D();
  const instances = (
    parent: THREE.Object3D, geometry: THREE.BufferGeometry, mat: THREE.Material,
    count: number, arrange: (index: number, object: THREE.Object3D) => void,
  ) => {
    const objects = new THREE.InstancedMesh(geometry, mat, count);
    for (let i = 0; i < count; i++) {
      dummy.position.set(0, 0, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      arrange(i, dummy);
      dummy.updateMatrix();
      objects.setMatrixAt(i, dummy.matrix);
    }
    objects.instanceMatrix.needsUpdate = true;
    objects.computeBoundingSphere();
    parent.add(objects);
    return objects;
  };
  const lineSegments = (parent: THREE.Object3D, coordinates: number[], mat: THREE.Material) => {
    const geometry = keepGeometry(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(coordinates, 3));
    const lines = new THREE.LineSegments(geometry, mat);
    parent.add(lines);
    return lines;
  };

  scene.add(new THREE.HemisphereLight(0xb8dce5, 0x262018, 2.2));
  const key = new THREE.DirectionalLight(0xffd2a0, 4.6);
  key.position.set(-4, 7, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x71c6ed, 3.7);
  rim.position.set(5, 3, -5);
  scene.add(rim);
  const coreLight = new THREE.PointLight(0x4bd8de, 10, 8, 2);
  coreLight.position.set(0, 1.8, 0);
  world.add(coreLight);

  // Machined foundation, floating PCB, standoffs and exposed signal paths.
  const core = new THREE.Group();
  world.add(core);
  block(core, blackMetal, [0, -0.36, 0], [5.15, 0.22, 3.65]);
  block(core, aluminium, [0, -0.23, 0], [4.98, 0.045, 3.48]);
  block(core, pcb, [0, 0, 0], [4.9, 0.13, 3.4]);
  block(core, copper, [0, 0.072, -1.58], [4.65, 0.016, 0.025]);
  block(core, copper, [2.32, 0.072, 0], [0.025, 0.016, 3.15]);
  instances(core, cylinder, aluminium, 4, (i, o) => {
    o.position.set(i % 2 ? 2.2 : -2.2, -0.12, i < 2 ? -1.4 : 1.4);
    o.scale.set(0.075, 0.3, 0.075);
  });
  instances(core, cylinder, gold, 4, (i, o) => {
    o.position.set(i % 2 ? 2.2 : -2.2, 0.09, i < 2 ? -1.4 : 1.4);
    o.scale.set(0.07, 0.035, 0.07);
  });
  const traces: number[] = [];
  for (let i = 0; i < 15; i++) {
    const z = -1.25 + i * 0.17;
    const bend = 1.13 + (i % 4) * 0.18;
    traces.push(0.67, 0.077, z * 0.48, bend, 0.077, z * 0.48);
    traces.push(bend, 0.077, z * 0.48, bend + 0.24, 0.077, z);
    traces.push(bend + 0.24, 0.077, z, 2.19, 0.077, z);
    traces.push(-0.67, 0.077, z * 0.48, -bend, 0.077, z * 0.48);
    traces.push(-bend, 0.077, z * 0.48, -bend - 0.26, 0.077, z);
    traces.push(-bend - 0.26, 0.077, z, -2.2, 0.077, z);
  }
  lineSegments(core, traces, traceMaterial);
  instances(core, box, ceramic, 12, (i, o) => {
    o.position.set(i < 6 ? -1.72 : 1.72, 0.14, -1.1 + (i % 6) * 0.43);
    o.scale.set(0.32, 0.12, 0.23);
  });
  instances(core, box, copper, 48, (i, o) => {
    const row = Math.floor(i / 12);
    o.position.set(-1.9 + (i % 12) * 0.345, 0.09, row < 2 ? -1.39 + row * 0.11 : 1.15 + (row - 2) * 0.11);
    o.scale.set(0.11, 0.025, 0.045);
  });
  instances(core, cylinder, aluminium, 12, (i, o) => {
    o.position.set(-2.06 + (i % 6) * 0.34, 0.25, i < 6 ? 0.88 : -1.02);
    o.scale.set(0.068, 0.3, 0.068);
  });
  // Front I/O: ports, copper edge connector and status bar.
  block(core, blackMetal, [-1.5, 0.22, 1.59], [1.35, 0.31, 0.25]);
  instances(core, box, aluminium, 4, (i, o) => {
    o.position.set(-1.96 + i * 0.3, 0.24, 1.735);
    o.scale.set(0.21, 0.16, 0.02);
  });
  instances(core, box, gold, 22, (i, o) => {
    o.position.set(-0.42 + i * 0.1, 0.069, 1.64);
    o.scale.set(0.058, 0.025, 0.18);
  });
  instances(core, box, cyan, 8, (i, o) => {
    o.position.set(2.34, 0.14, -1.12 + i * 0.28);
    o.scale.set(0.045, 0.035, 0.085);
  });

  const socket = new THREE.Group();
  core.add(socket);
  block(socket, ceramic, [0, 0.15, 0], [1.62, 0.18, 1.62]);
  block(socket, copper, [0, 0.255, 0], [1.42, 0.035, 1.42]);
  block(socket, aluminium, [0, 0.33, 0], [1.24, 0.12, 1.24]);
  block(socket, cyan, [0, 0.399, 0], [0.72, 0.014, 0.72]);
  instances(socket, box, gold, 44, (i, o) => {
    const side = Math.floor(i / 11);
    const offset = -0.65 + (i % 11) * 0.13;
    o.position.set(side < 2 ? offset : (side === 2 ? -0.83 : 0.83), 0.18, side < 2 ? (side ? 0.83 : -0.83) : offset);
    o.scale.set(side < 2 ? 0.045 : 0.15, 0.025, side < 2 ? 0.15 : 0.045);
  });

  const cooler = new THREE.Group();
  core.add(cooler);
  block(cooler, copper, [0, 0, 0], [1.54, 0.09, 1.54]);
  instances(cooler, box, aluminium, 17, (i, o) => {
    o.position.set(-0.72 + i * 0.09, 0.26, 0);
    o.scale.set(0.033, 0.48, 1.45);
  });
  // Two exposed heat pipes terminate in amber collars.
  instances(cooler, cylinder, copper, 4, (i, o) => {
    o.position.set(i < 2 ? -0.9 : 0.9, 0.17, i % 2 ? 0.45 : -0.45);
    o.rotation.x = Math.PI / 2;
    o.scale.set(0.055, 1.25, 0.055);
  });
  const canopy = new THREE.Group();
  core.add(canopy);
  block(canopy, glass, [0, 0, 0], [2.08, 0.055, 1.96]);
  instances(canopy, box, aluminium, 2, (i, o) => {
    o.position.set(i ? 1.04 : -1.04, 0, 0);
    o.scale.set(0.045, 0.065, 1.96);
  });
  block(canopy, amber, [0, 0.035, 0.95], [0.65, 0.025, 0.025]);

  // Product cartridges: a storage module, a relay/radio and a compute radiator.
  const fans: THREE.Group[] = [];
  function fan(parent: THREE.Object3D, x: number, y: number, z: number, radius: number) {
    const housing = mesh(parent, torus, blackMetal, [x, y, z], [radius, radius, radius]);
    housing.rotation.x = -Math.PI / 2;
    mesh(parent, cylinder, aluminium, [x, y, z], [radius * 0.21, 0.1, radius * 0.21]);
    const blades = new THREE.Group();
    blades.position.set(x, y, z);
    parent.add(blades);
    instances(blades, box, blackMetal, 7, (i, o) => {
      const angle = i * Math.PI * 2 / 7;
      o.position.set(Math.cos(angle) * radius * 0.48, 0, Math.sin(angle) * radius * 0.48);
      o.rotation.y = -angle + 0.55;
      o.scale.set(radius * 0.7, 0.035, radius * 0.22);
    });
    fans.push(blades);
  }
  const modules: THREE.Group[] = [];
  const moduleDestinations = [
    new THREE.Vector3(-3.7, 0.55, 0.3),
    new THREE.Vector3(3.45, 0.85, -1.3),
    new THREE.Vector3(1.35, -0.05, 3.5),
  ];
  for (let i = 0; i < 3; i++) {
    const module = new THREE.Group();
    world.add(module);
    modules.push(module);
    block(module, aluminium, [0, -0.05, 0], [1.75, 0.13, 1.9]);
    block(module, pcbDark, [0, 0.055, 0], [1.65, 0.09, 1.8]);
    block(module, blackMetal, [0, -0.17, 0.87], [1.73, 0.23, 0.1]);
    block(module, i === 0 ? amber : cyan, [0, 0.13, 0.86], [1.18, 0.025, 0.035]);
    instances(module, box, gold, 10, (j, o) => {
      o.position.set(-0.65 + j * 0.145, 0.115, -0.86);
      o.scale.set(0.075, 0.02, 0.19);
    });
    if (i === 0) {
      instances(module, box, ceramic, 6, (j, o) => {
        o.position.set(j % 2 ? 0.4 : -0.4, 0.21, -0.5 + Math.floor(j / 2) * 0.52);
        o.scale.set(0.54, 0.2, 0.34);
      });
      block(module, copper, [0, 0.34, 0], [0.1, 0.04, 1.4]);
    } else if (i === 1) {
      block(module, aluminium, [0, 0.3, -0.1], [1.15, 0.32, 0.9]);
      block(module, glass, [0, 0.5, -0.1], [1.05, 0.04, 0.8]);
      instances(module, cylinder, copper, 2, (j, o) => {
        o.position.set(j ? 0.66 : -0.66, 0.6, -0.58);
        o.scale.set(0.035, 0.95, 0.035);
      });
      instances(module, box, cyan, 5, (j, o) => {
        o.position.set(-0.4 + j * 0.2, 0.3, 0.37);
        o.scale.set(0.07, 0.09, 0.02);
      });
    } else {
      instances(module, box, aluminium, 11, (j, o) => {
        o.position.set(-0.7 + j * 0.14, 0.28, 0);
        o.scale.set(0.035, 0.32, 1.5);
      });
      fan(module, 0, 0.5, 0, 0.62);
    }
  }

  // Remote racks are complete miniature machines, with sleds, rails and I/O.
  const racks: THREE.Group[] = [];
  const rackDestinations = [
    new THREE.Vector3(-5.4, 0.8, -3.8),
    new THREE.Vector3(0.15, 1.25, -5),
    new THREE.Vector3(5, 0.1, 2.8),
  ];
  for (let i = 0; i < 3; i++) {
    const rack = new THREE.Group();
    world.add(rack);
    racks.push(rack);
    block(rack, blackMetal, [0, 0.6, 0], [1.55, 1.65, 1.18]);
    block(rack, aluminium, [0, 1.45, 0], [1.63, 0.06, 1.26]);
    instances(rack, box, aluminium, 2, (j, o) => {
      o.position.set(j ? 0.77 : -0.77, 0.6, 0.62);
      o.scale.set(0.075, 1.65, 0.06);
    });
    instances(rack, box, pcbDark, 5, (j, o) => {
      o.position.set(0, -0.05 + j * 0.31, 0.63);
      o.scale.set(1.38, 0.25, 0.07);
    });
    instances(rack, box, aluminium, 30, (j, o) => {
      o.position.set(-0.51 + (j % 6) * 0.145, -0.05 + Math.floor(j / 6) * 0.31, 0.678);
      o.scale.set(0.065, 0.13, 0.018);
    });
    instances(rack, box, cyan, 10, (j, o) => {
      o.position.set(j % 2 ? 0.59 : 0.44, -0.05 + Math.floor(j / 2) * 0.31, 0.682);
      o.scale.set(0.048, 0.035, 0.024);
    });
    block(rack, glass, [0, 0.65, 0.73], [1.4, 1.54, 0.025]);
    fan(rack, 0, 1.5, 0, 0.43);
    rack.rotation.y = [-0.18, 0.18, -0.35][i];
  }

  const localLinks = new THREE.Group();
  const network = new THREE.Group();
  world.add(localLinks, network);
  const paths: THREE.CatmullRomCurve3[] = [];
  function cable(parent: THREE.Object3D, end: THREE.Vector3, start: THREE.Vector3, height: number) {
    const path = new THREE.CatmullRomCurve3([
      start,
      new THREE.Vector3(start.x * 0.75 + end.x * 0.25, height, start.z),
      new THREE.Vector3(start.x * 0.25 + end.x * 0.75, height, end.z),
      end,
    ]);
    const tube = keepGeometry(new THREE.TubeGeometry(path, 36, 0.016, 4, false));
    parent.add(new THREE.Mesh(tube, copper));
    const glowGeometry = keepGeometry(new THREE.BufferGeometry().setFromPoints(path.getPoints(70)));
    parent.add(new THREE.Line(glowGeometry, fiberMaterial));
    paths.push(path);
  }
  moduleDestinations.forEach((end, i) => cable(
    localLinks, end.clone().add(new THREE.Vector3(0, 0.1, -0.85)),
    new THREE.Vector3(i === 0 ? -1 : 1, 0.11, i === 2 ? 1.4 : -1), -0.5 - i * 0.17,
  ));
  rackDestinations.forEach((end, i) => cable(
    network, end.clone().add(new THREE.Vector3(0, 0.1, 0.55)),
    moduleDestinations[i].clone().add(new THREE.Vector3(0.5, 0.1, 0)), -0.9 - i * 0.2,
  ));
  cable(network, rackDestinations[1].clone(), rackDestinations[0].clone(), 0.15);
  cable(network, rackDestinations[2].clone(), rackDestinations[1].clone(), -0.4);
  const packets = new THREE.InstancedMesh(packetGeometry, cyan, paths.length * 2);
  packets.frustumCulled = false;
  world.add(packets);

  // Sparse construction grid under the assembly anchors its scale without a backdrop.
  const gridCoordinates: number[] = [];
  for (let i = -6; i <= 6; i++) {
    gridCoordinates.push(i, -0.82, -6, i, -0.82, 5);
    gridCoordinates.push(-6, -0.82, i, 6, -0.82, i);
  }
  const gridMat = keepMaterial(new THREE.LineBasicMaterial({
    color: 0x63878d, transparent: true, opacity: 0.1, depthWrite: false,
  }));
  const grid = lineSegments(world, gridCoordinates, gridMat);

  let progress = 0;
  let mobile = false;
  let disposed = false;
  let contextLost = false;
  let inViewport = true;
  let frame = 0;
  let lastTime = 0;
  let elapsed = 0;
  let ready = false;
  const lookAt = new THREE.Vector3();
  const smooth = (a: number, b: number, value: number) => {
    const t = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  function compose() {
    const assembly = smooth(0, 0.24, progress);
    const deploy = smooth(0.26, 0.62, progress);
    const operate = smooth(0.64, 0.97, progress);
    cooler.position.y = THREE.MathUtils.lerp(1.1, 0.46, assembly) + deploy * 0.92;
    canopy.position.y = THREE.MathUtils.lerp(1.88, 1.06, assembly) + deploy * 1.05;
    socket.position.y = (1 - assembly) * 0.12;
    modules.forEach((module, i) => {
      module.position.copy(moduleDestinations[i]).multiplyScalar(deploy);
      module.position.y += (1 - deploy) * (-0.52 - i * 0.06);
      module.scale.setScalar(0.15 + 0.85 * deploy);
      module.visible = deploy > 0.005;
    });
    racks.forEach((rack, i) => {
      const reveal = smooth(0.62 + i * 0.045, 0.86 + i * 0.045, progress);
      rack.position.copy(rackDestinations[i]);
      rack.position.y -= (1 - reveal) * 1.4;
      rack.scale.setScalar(Math.max(0.001, reveal));
      rack.visible = reveal > 0.005;
    });
    localLinks.visible = deploy > 0.8;
    localLinks.scale.setScalar(Math.max(0.001, smooth(0.8, 1, deploy)));
    network.visible = operate > 0.08;
    network.scale.setScalar(Math.max(0.001, smooth(0.08, 0.9, operate)));
    gridMat.opacity = 0.07 + operate * 0.045;
    grid.scale.setScalar(0.56 + 0.44 * deploy);
    // The lens pulls back to reveal the larger system, then makes a small lateral arc.
    const dolly = deploy * 0.26 + operate * 0.3;
    if (mobile) {
      const portrait = Math.max(1, 0.62 / camera.aspect);
      camera.position.set((7.8 - operate * 2.6) * portrait * (1 + dolly), (7 + operate) * portrait * (1 + dolly), (11.5 + operate * 1.2) * portrait * (1 + dolly));
      lookAt.set(0, 0.1 + deploy * 0.2, -operate * 0.4);
      world.position.set(0, 0, 0);
    } else {
      camera.position.set((8.3 - operate * 3.2) * (1 + dolly), (6.6 + operate * 0.9) * (1 + dolly), (10.2 + operate * 1.3) * (1 + dolly));
      lookAt.set(-2.9 - deploy * 1.15 - operate * 0.45, 0.05, -operate * 0.45);
      world.position.set(0.55, 0, 0);
    }
    camera.lookAt(lookAt);
  }

  function animateDetails(delta: number) {
    elapsed += delta;
    fans.forEach((blades, i) => { blades.rotation.y = elapsed * (i === 0 ? 2.8 : 2.1); });
    cyan.emissiveIntensity = 1.85 + Math.sin(elapsed * 1.4) * 0.18;
    const localActive = smooth(0.53, 0.62, progress);
    const remoteActive = smooth(0.78, 0.95, progress);
    paths.forEach((path, i) => {
      for (let j = 0; j < 2; j++) {
        dummy.position.copy(path.getPointAt((elapsed * 0.12 + i * 0.137 + j * 0.5) % 1));
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(i < 3 ? localActive : remoteActive);
        dummy.updateMatrix();
        packets.setMatrixAt(i * 2 + j, dummy.matrix);
      }
    });
    packets.instanceMatrix.needsUpdate = true;
  }

  function render() {
    if (renderer.getContext().isContextLost()) {
      throw new Error('The systems world WebGL context is unavailable.');
    }
    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      canvas.dataset.systemsReady = 'true';
      canvas.dispatchEvent(new CustomEvent('systems-world-ready'));
    }
  }
  function canRun() {
    return !disposed && !contextLost && inViewport && !document.hidden;
  }
  function tick(time: number) {
    frame = 0;
    if (!canRun()) return;
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    animateDetails(delta);
    render();
    frame = requestAnimationFrame(tick);
  }
  function syncLoop() {
    if (canRun()) {
      if (!frame) {
        lastTime = 0;
        frame = requestAnimationFrame(tick);
      }
    } else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
    }
  }
  function resize() {
    if (disposed || contextLost) return;
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width || canvas.parentElement?.clientWidth || window.innerWidth));
    const height = Math.max(1, Math.round(bounds.height || canvas.parentElement?.clientHeight || window.innerHeight));
    mobile = width < 760;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = mobile ? 43 : 36;
    camera.updateProjectionMatrix();
    compose();
  }
  const onVisibility = () => syncLoop();
  const onContextLost = (event: Event) => {
    event.preventDefault();
    contextLost = true;
    ready = false;
    delete canvas.dataset.systemsReady;
    syncLoop();
    canvas.dispatchEvent(new CustomEvent('systems-world-context-lost'));
  };
  const onContextRestored = () => {
    if (disposed) return;
    contextLost = false;
    resize();
    syncLoop();
  };
  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver((entries) => {
    inViewport = entries.some((entry) => entry.isIntersecting);
    syncLoop();
  }, { threshold: 0 });

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    canvas.removeEventListener('webglcontextrestored', onContextRestored);
    world.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((mat) => mat.dispose());
    scene.clear();
    renderer.renderLists.dispose();
    renderer.dispose();
    // Keep the canvas context reusable when the visitor toggles reduced motion.
    delete canvas.dataset.systemsReady;
  }

  try {
    resize();
    animateDetails(0);
    // Synchronous first frame: callers can safely replace their SVG fallback on return.
    render();
    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', resize, { passive: true });
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);
    syncLoop();
  } catch (error) {
    dispose();
    throw error;
  }

  return {
    setProgress(value: number) {
      if (disposed || !Number.isFinite(value)) return;
      progress = THREE.MathUtils.clamp(value, 0, 1);
      compose();
    },
    dispose,
  };
}
