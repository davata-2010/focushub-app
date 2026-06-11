/* ============================================================
   RETRO KART GP 3D — carreras estilo Mario Kart con Three.js
   Cámara detrás del kart, circuito 3D, IA, objetos y derrapes.
   ============================================================ */
(() => {
  "use strict";

  // ---------------------------------------------------------- utilidades
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
  const angDiff = (a, b) => {
    let d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  };

  // ---------------------------------------------------------- pista (plano XZ)
  const CONTROL = [
    [480, 520], [300, 515], [150, 450], [105, 310], [140, 165],
    [300, 92], [470, 118], [620, 82], [800, 100], [882, 220],
    [862, 360], [760, 438], [646, 398], [560, 462],
  ];
  const ROAD_HALF = 42;

  function catmull(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return [
      0.5 * (2 * p1[0] + (p2[0] - p0[0]) * t +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
        (3 * p1[0] - p0[0] - 3 * p2[0] + p3[0]) * t3),
      0.5 * (2 * p1[1] + (p2[1] - p0[1]) * t +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
        (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * t3),
    ];
  }

  const SAMPLES = (() => {
    const dense = [];
    const n = CONTROL.length;
    for (let i = 0; i < n; i++) {
      const p0 = CONTROL[(i - 1 + n) % n];
      const p1 = CONTROL[i];
      const p2 = CONTROL[(i + 1) % n];
      const p3 = CONTROL[(i + 2) % n];
      for (let s = 0; s < 24; s++) dense.push(catmull(p0, p1, p2, p3, s / 24));
    }
    const out = [];
    const STEP = 6;
    let acc = 0;
    let prev = dense[0];
    out.push({ x: prev[0], z: prev[1], a: 0 });
    for (let i = 1; i <= dense.length; i++) {
      const cur = dense[i % dense.length];
      let d = dist(prev[0], prev[1], cur[0], cur[1]);
      while (acc + d >= STEP) {
        const t = (STEP - acc) / d;
        const x = lerp(prev[0], cur[0], t);
        const z = lerp(prev[1], cur[1], t);
        out.push({ x, z, a: 0 });
        prev = [x, z];
        d = dist(prev[0], prev[1], cur[0], cur[1]);
        acc = 0;
      }
      acc += d;
      prev = cur;
    }
    for (let i = 0; i < out.length; i++) {
      const nx = out[(i + 1) % out.length];
      out[i].a = Math.atan2(nx.z - out[i].z, nx.x - out[i].x);
    }
    return out;
  })();

  const N = SAMPLES.length;
  const N_CHECK = 8;
  const CP_EVERY = Math.floor(N / N_CHECK);
  const TOTAL_LAPS = 3;
  const CENTER = { x: 495, z: 300 };

  function nearestIdx(x, z, fromIdx, window_) {
    let best = -1, bestD = Infinity;
    if (window_ >= N / 2) {
      for (let i = 0; i < N; i++) {
        const d = dist(x, z, SAMPLES[i].x, SAMPLES[i].z);
        if (d < bestD) { bestD = d; best = i; }
      }
    } else {
      for (let o = -window_; o <= window_; o++) {
        const i = (fromIdx + o + N) % N;
        const d = dist(x, z, SAMPLES[i].x, SAMPLES[i].z);
        if (d < bestD) { bestD = d; best = i; }
      }
    }
    return { idx: best, d: bestD };
  }

  function lateral(i, off) {
    const s = SAMPLES[i % N];
    return {
      x: s.x + Math.cos(s.a + Math.PI / 2) * off,
      z: s.z + Math.sin(s.a + Math.PI / 2) * off,
      a: s.a,
      idx: i % N,
    };
  }

  const BOOST_PADS = [
    lateral(Math.floor(N * 0.22), 0),
    lateral(Math.floor(N * 0.55), 0),
    lateral(Math.floor(N * 0.83), 0),
  ];
  const ITEM_BOX_SPOTS = [
    lateral(Math.floor(N * 0.12), -18), lateral(Math.floor(N * 0.12) + 4, 0), lateral(Math.floor(N * 0.12) + 8, 18),
    lateral(Math.floor(N * 0.62), -18), lateral(Math.floor(N * 0.62) + 4, 0), lateral(Math.floor(N * 0.62) + 8, 18),
  ];

  // ---------------------------------------------------------- audio
  let actx = null;
  let engineOsc = null, engineGain = null;
  function audio() {
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* sin audio */ }
    }
    if (actx && actx.state === "suspended") actx.resume();
    return actx;
  }
  function beep(freq, dur, type = "square", vol = 0.07) {
    const a = audio();
    if (!a) return;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur);
  }
  function engineSound(speed, boosting) {
    const a = audio();
    if (!a) return;
    if (!engineOsc) {
      engineOsc = a.createOscillator();
      engineGain = a.createGain();
      engineOsc.type = "sawtooth";
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain).connect(a.destination);
      engineOsc.start();
    }
    const target = 55 + Math.abs(speed) * 30 + (boosting ? 40 : 0);
    engineOsc.frequency.setTargetAtTime(target, a.currentTime, 0.05);
    engineGain.gain.setTargetAtTime(speed > 0.2 ? 0.035 : 0.012, a.currentTime, 0.1);
  }
  function engineOff() {
    if (engineGain && actx) engineGain.gain.setTargetAtTime(0, actx.currentTime, 0.2);
  }

  // ---------------------------------------------------------- entrada
  const keys = {};
  window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) e.preventDefault();
    if (e.key === "Enter") onEnter();
    audio();
  });
  window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

  const touch = { left: false, right: false, gas: false, brake: false, item: false };
  function bindTouch(id, prop) {
    const el = document.getElementById(id);
    if (!el) return;
    const on = (e) => { e.preventDefault(); touch[prop] = true; audio(); if (state !== "race" && state !== "countdown") onEnter(); };
    const off = (e) => { e.preventDefault(); touch[prop] = false; };
    el.addEventListener("touchstart", on, { passive: false });
    el.addEventListener("touchend", off, { passive: false });
    el.addEventListener("touchcancel", off, { passive: false });
    el.addEventListener("mousedown", on);
    el.addEventListener("mouseup", off);
    el.addEventListener("mouseleave", off);
  }
  bindTouch("tc-left", "left");
  bindTouch("tc-right", "right");
  bindTouch("tc-gas", "gas");
  bindTouch("tc-brake", "brake");
  bindTouch("tc-item", "item");

  const input = () => ({
    up: keys["arrowup"] || keys["w"] || touch.gas,
    down: keys["arrowdown"] || keys["s"] || touch.brake,
    left: keys["arrowleft"] || keys["a"] || touch.left,
    right: keys["arrowright"] || keys["d"] || touch.right,
    item: keys[" "] || touch.item,
    drift: keys["shift"],
  });

  // ---------------------------------------------------------- escena three.js
  const canvas = document.getElementById("game");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7ec8f0);
  scene.fog = new THREE.Fog(0x7ec8f0, 500, 1500);

  const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.5, 3000);
  camera.position.set(CENTER.x, 300, CENTER.z + 500);

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x3a5c2a, 0.9));
  const sun = new THREE.DirectionalLight(0xfff2cc, 1.1);
  sun.position.set(300, 500, 100);
  scene.add(sun);

  // texturas procedurales con canvas
  function canvasTexture(w, h, painter, repeatX = 1, repeatY = 1) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    painter(c.getContext("2d"), w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    return tex;
  }

  // suelo de hierba
  const grassTex = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = "#3f8a35";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1200; i++) {
      c.fillStyle = Math.random() < 0.5 ? "#357a2c" : "#4a9a3e";
      c.fillRect(rand(0, w), rand(0, h), 3, 3);
    }
  }, 30, 30);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 4000),
    new THREE.MeshLambertMaterial({ map: grassTex })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(CENTER.x, 0, CENTER.z);
  scene.add(ground);

  // carretera: cinta de triángulos siguiendo la línea central
  const roadTex = canvasTexture(128, 128, (c, w, h) => {
    c.fillStyle = "#3e3e46";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      c.fillStyle = Math.random() < 0.5 ? "#37373e" : "#46464f";
      c.fillRect(rand(0, w), rand(0, h), 2, 2);
    }
    // líneas de borde blancas
    c.fillStyle = "#e8e8e0";
    c.fillRect(3, 0, 4, h);
    c.fillRect(w - 7, 0, 4, h);
    // línea central amarilla discontinua
    c.fillStyle = "#e8c63a";
    c.fillRect(w / 2 - 2, 8, 4, h / 2 - 16);
  }, 1, 1);

  (function buildRoad() {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const s = SAMPLES[i % N];
      const px = Math.cos(s.a + Math.PI / 2), pz = Math.sin(s.a + Math.PI / 2);
      pos.push(s.x - px * ROAD_HALF, 0.1, s.z - pz * ROAD_HALF);
      pos.push(s.x + px * ROAD_HALF, 0.1, s.z + pz * ROAD_HALF);
      uv.push(0, i * 0.12, 1, i * 0.12);
      if (i < N) {
        const a = i * 2, b = i * 2 + 1, c2 = i * 2 + 2, d = i * 2 + 3;
        idx.push(a, c2, b, b, c2, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: roadTex, side: THREE.DoubleSide })));

    // arcén de tierra un poco más ancho, debajo
    const pos2 = [], idx2 = [];
    for (let i = 0; i <= N; i++) {
      const s = SAMPLES[i % N];
      const px = Math.cos(s.a + Math.PI / 2), pz = Math.sin(s.a + Math.PI / 2);
      const wD = ROAD_HALF + 8;
      pos2.push(s.x - px * wD, 0.05, s.z - pz * wD);
      pos2.push(s.x + px * wD, 0.05, s.z + pz * wD);
      if (i < N) {
        const a = i * 2, b = i * 2 + 1, c2 = i * 2 + 2, d = i * 2 + 3;
        idx2.push(a, c2, b, b, c2, d);
      }
    }
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute("position", new THREE.Float32BufferAttribute(pos2, 3));
    g2.setIndex(idx2);
    g2.computeVertexNormals();
    scene.add(new THREE.Mesh(g2, new THREE.MeshLambertMaterial({ color: 0xb5915f, side: THREE.DoubleSide })));
  })();

  // línea de meta a cuadros
  const checkerTex = canvasTexture(64, 16, (c, w, h) => {
    const sq = 8;
    for (let x = 0; x < w / sq; x++) {
      for (let y = 0; y < h / sq; y++) {
        c.fillStyle = (x + y) % 2 === 0 ? "#fff" : "#111";
        c.fillRect(x * sq, y * sq, sq, sq);
      }
    }
  });
  {
    const s0 = SAMPLES[0];
    const finish = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_HALF * 2, 14),
      new THREE.MeshBasicMaterial({ map: checkerTex })
    );
    finish.rotation.x = -Math.PI / 2;
    finish.rotation.z = -s0.a;
    finish.position.set(s0.x, 0.2, s0.z);
    scene.add(finish);

    // arco de meta
    const archMat = new THREE.MeshLambertMaterial({ color: 0xd94040 });
    const px = Math.cos(s0.a + Math.PI / 2), pz = Math.sin(s0.a + Math.PI / 2);
    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 36, 10), archMat);
      pillar.position.set(s0.x + px * (ROAD_HALF + 6) * side, 18, s0.z + pz * (ROAD_HALF + 6) * side);
      scene.add(pillar);
    }
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry((ROAD_HALF + 6) * 2 + 6, 7, 4),
      new THREE.MeshLambertMaterial({ map: checkerTex })
    );
    beam.position.set(s0.x, 36, s0.z);
    beam.rotation.y = -(s0.a + Math.PI / 2);
    scene.add(beam);
  }

  // turbos (flechas naranjas en el suelo)
  const padTex = canvasTexture(64, 64, (c, w, h) => {
    c.fillStyle = "#c96a14";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#ffb13d";
    for (let i = 0; i < 2; i++) {
      c.beginPath();
      c.moveTo(10, 8 + i * 28);
      c.lineTo(54, 18 + i * 28);
      c.lineTo(10, 28 + i * 28);
      c.lineTo(22, 18 + i * 28);
      c.closePath();
      c.fill();
    }
  });
  for (const p of BOOST_PADS) {
    const pad = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 22),
      new THREE.MeshBasicMaterial({ map: padTex })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.rotation.z = -p.a;
    pad.position.set(p.x, 0.25, p.z);
    scene.add(pad);
  }

  // charca
  const pond = new THREE.Mesh(
    new THREE.CircleGeometry(45, 28),
    new THREE.MeshLambertMaterial({ color: 0x2d6db5 })
  );
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(500, 0.15, 290);
  scene.add(pond);

  // árboles y rocas fuera de la pista
  function tree(x, z, s) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6 * s, 2.2 * s, 10 * s, 6),
      new THREE.MeshLambertMaterial({ color: 0x6b4a2b })
    );
    trunk.position.y = 5 * s;
    g.add(trunk);
    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(8 * s, 20 * s, 8),
      new THREE.MeshLambertMaterial({ color: Math.random() < 0.5 ? 0x2e7d32 : 0x1f6b29 })
    );
    leaves.position.y = 18 * s;
    g.add(leaves);
    g.position.set(x, 0, z);
    scene.add(g);
  }
  let planted = 0;
  while (planted < 60) {
    const x = rand(-250, 1250), z = rand(-250, 900);
    const near = nearestIdx(x, z, 0, N);
    if (near.d > ROAD_HALF + 35 && dist(x, z, 500, 290) > 70) {
      tree(x, z, rand(0.8, 1.7));
      planted++;
    }
  }

  // montañas decorativas en el horizonte
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * TAU;
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(rand(120, 220), rand(160, 300), 7),
      new THREE.MeshLambertMaterial({ color: 0x5d7a8c })
    );
    m.position.set(CENTER.x + Math.cos(ang) * rand(900, 1200), 0, CENTER.z + Math.sin(ang) * rand(900, 1200));
    scene.add(m);
  }

  // nubes
  for (let i = 0; i < 12; i++) {
    const cl = new THREE.Mesh(
      new THREE.SphereGeometry(rand(25, 55), 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xffffff })
    );
    cl.scale.y = 0.35;
    cl.position.set(rand(-400, 1400), rand(180, 300), rand(-400, 1000));
    scene.add(cl);
  }

  // ---------------------------------------------------------- karts 3D
  function buildKartMesh(color, dark) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const darkMat = new THREE.MeshLambertMaterial({ color: dark });
    const blackMat = new THREE.MeshLambertMaterial({ color: 0x16161a });

    const body = new THREE.Mesh(new THREE.BoxGeometry(16, 4, 9), bodyMat);
    body.position.y = 4;
    g.add(body);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 5), bodyMat);
    nose.position.set(10, 4, 0);
    g.add(nose);
    const back = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 9), darkMat);
    back.position.set(-7, 5, 0);
    g.add(back);

    // ruedas
    const wheelGeo = new THREE.CylinderGeometry(2.6, 2.6, 2.2, 10);
    wheelGeo.rotateX(Math.PI / 2);
    for (const [wx, wz] of [[5.5, 5.5], [5.5, -5.5], [-5.5, 5.5], [-5.5, -5.5]]) {
      const w = new THREE.Mesh(wheelGeo, blackMat);
      w.position.set(wx, 2.6, wz);
      g.add(w);
    }

    // piloto: casco + visera
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(3.2, 10, 8), new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }));
    helmet.position.set(-1, 8.5, 0);
    g.add(helmet);
    const visor = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 6), darkMat);
    visor.position.set(0.8, 8.5, 0);
    g.add(visor);

    // sombra falsa (mancha oscura)
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(8.5, 14),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 })
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.18;
    g.add(blob);
    g.rotation.order = "YXZ";
    return g;
  }

  // ---------------------------------------------------------- estado de carrera
  const KART_DEFS = [
    { name: "TÚ", color: 0xe23a3a, dark: 0x8e1f1f, player: true },
    { name: "BOWZ", color: 0x3a66e2, dark: 0x1f3a8e, skill: 0.95 },
    { name: "LUI", color: 0x2eb84e, dark: 0x176e2c, skill: 0.9 },
    { name: "PEACH", color: 0xe8c63a, dark: 0x94791c, skill: 0.85 },
  ];

  const PHYS = {
    accel: 0.115,
    brake: 0.22,
    maxSpeed: 4.3,
    reverseMax: -1.6,
    friction: 0.982,
    offroadMax: 1.7,
    turn: 0.046,
    boostMult: 1.5,
  };

  let karts = [];
  let bananas = [];
  let shells = [];
  let itemBoxes = [];
  let particles = [];
  let state = "menu";
  let countdownT = 0;
  let raceT = 0;
  let frame = 0;
  let finishOrder = [];
  let menuAngle = 0;

  function makeKart(def, gridPos) {
    const row = Math.floor(gridPos / 2);
    const col = gridPos % 2;
    const idx = (N - 8 - row * 7 + N) % N;
    const p = lateral(idx, col === 0 ? -16 : 16);
    const mesh = buildKartMesh(def.color, def.dark);
    scene.add(mesh);
    return {
      ...def,
      x: p.x, z: p.z, angle: p.a, speed: 0,
      prog: idx, cp: 0, lap: 0,
      spin: 0, boost: 0, driftCharge: 0,
      item: null, itemCooldown: 0,
      aiUseItemT: rand(60, 240), aiJitter: rand(-0.25, 0.2),
      finished: false, finishTime: 0, rank: gridPos + 1,
      mesh, lean: 0,
    };
  }

  // pools de objetos visuales
  const boxMeshes = ITEM_BOX_SPOTS.map((s) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(9, 9, 9),
      new THREE.MeshLambertMaterial({ color: 0x46c8ff, transparent: true, opacity: 0.75 })
    );
    m.position.set(s.x, 7, s.z);
    scene.add(m);
    return m;
  });

  function bananaMesh() {
    const g = new THREE.Group();
    const m = new THREE.MeshLambertMaterial({ color: 0xf2d03a });
    for (let i = 0; i < 3; i++) {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6), m);
      const t = (i / 2 - 0.5) * 1.6;
      seg.position.set(t * 2.5, 2 + Math.cos(t) * 2, 0);
      g.add(seg);
    }
    scene.add(g);
    return g;
  }

  function shellMesh() {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.SphereGeometry(4, 10, 8), new THREE.MeshLambertMaterial({ color: 0xd42b2b }));
    top.scale.y = 0.7;
    top.position.y = 3.5;
    g.add(top);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 1.6, 12), new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }));
    rim.position.y = 1.6;
    g.add(rim);
    scene.add(g);
    return g;
  }

  // partículas (pool de esferitas)
  const PARTICLE_POOL = 70;
  const pPool = [];
  for (let i = 0; i < PARTICLE_POOL; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1.4, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    m.visible = false;
    scene.add(m);
    pPool.push(m);
  }
  function spawnParticle(x, y, z, vx, vy, vz, color, life) {
    const m = pPool.find((p) => !p.visible);
    if (!m) return;
    m.visible = true;
    m.position.set(x, y, z);
    m.material.color.setHex(color);
    particles.push({ m, vx, vy, vz, life, max: life });
  }

  function resetRace() {
    for (const k of karts) scene.remove(k.mesh);
    for (const b of bananas) scene.remove(b.mesh);
    for (const s of shells) scene.remove(s.mesh);
    karts = KART_DEFS.map((d, i) => makeKart(d, i));
    bananas = [];
    shells = [];
    itemBoxes = ITEM_BOX_SPOTS.map((s, i) => ({ ...s, respawn: 0, mesh: boxMeshes[i] }));
    finishOrder = [];
    raceT = 0;
    countdownT = 3.6 * 60;
    state = "countdown";
    hud.style.display = "block";
    overlay.classList.add("hidden");
    beep(440, 0.15);
  }

  function onEnter() {
    if (state === "menu" || state === "finished") resetRace();
  }

  const player = () => karts.find((k) => k.player);

  // ---------------------------------------------------------- objetos
  function rollItem(kart) {
    const r = Math.random();
    if (kart.rank >= 3) return r < 0.55 ? "mushroom" : r < 0.8 ? "shell" : "banana";
    return ["mushroom", "banana", "shell"][Math.floor(Math.random() * 3)];
  }

  function useItem(k) {
    if (!k.item || k.itemCooldown > 0) return;
    const item = k.item;
    k.item = null;
    k.itemCooldown = 20;
    if (item === "mushroom") {
      k.boost = 55;
      beep(880, 0.2, "sawtooth");
    } else if (item === "banana") {
      bananas.push({
        x: k.x - Math.cos(k.angle) * 28,
        z: k.z - Math.sin(k.angle) * 28,
        mesh: bananaMesh(),
      });
      beep(300, 0.12);
    } else if (item === "shell") {
      const target = karts.find((t) => t.rank === k.rank - 1 && !t.finished) || null;
      shells.push({
        x: k.x + Math.cos(k.angle) * 26,
        z: k.z + Math.sin(k.angle) * 26,
        a: k.angle, target, life: 300, owner: k,
        mesh: shellMesh(),
      });
      beep(660, 0.18, "triangle");
    }
  }

  function spinOut(k) {
    if (k.spin > 0) return;
    k.spin = 55;
    k.boost = 0;
    k.speed *= 0.3;
    if (k.player) beep(160, 0.4, "sawtooth", 0.12);
    for (let i = 0; i < 8; i++) {
      spawnParticle(k.x, 5, k.z, rand(-1.5, 1.5), rand(0.5, 2), rand(-1.5, 1.5), 0xffd23a, 24);
    }
  }

  // ---------------------------------------------------------- lógica por frame
  function updateKart(k) {
    const onRoad = nearestIdx(k.x, k.z, k.prog, 18);
    const near = onRoad.d > 160 ? nearestIdx(k.x, k.z, k.prog, Math.ceil(N / 2)) : onRoad;
    k.prog = near.idx;
    const offroad = near.d > ROAD_HALF + 8;

    if (!k.finished) {
      const nextCp = ((k.cp % N_CHECK) * CP_EVERY) % N;
      const dIdx = Math.min((nextCp - k.prog + N) % N, (k.prog - nextCp + N) % N);
      if (dIdx <= 10 && near.d < ROAD_HALF + 60) {
        k.cp++;
        if (k.cp > 1 && (k.cp - 1) % N_CHECK === 0) {
          k.lap++;
          if (k.player && k.lap < TOTAL_LAPS) beep(740, 0.2);
          if (k.lap >= TOTAL_LAPS) {
            k.finished = true;
            k.finishTime = raceT;
            finishOrder.push(k);
            if (k.player) {
              beep(523, 0.15);
              setTimeout(() => beep(659, 0.15), 150);
              setTimeout(() => beep(784, 0.3), 300);
            }
          }
        }
      }
    }

    if (k.spin > 0) {
      k.spin--;
      k.angle += 0.28;
      k.speed *= 0.94;
      k.x += Math.cos(SAMPLES[k.prog].a) * k.speed * 0.5;
      k.z += Math.sin(SAMPLES[k.prog].a) * k.speed * 0.5;
      return;
    }

    let steer = 0, gas = false, brake = false;

    if (k.player && state === "race" && !k.finished) {
      const inp = input();
      gas = inp.up;
      brake = inp.down;
      steer = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      if (inp.item) useItem(k);
      if (inp.drift && steer !== 0 && k.speed > 2) {
        steer *= 1.6;
        k.driftCharge++;
        if (frame % 3 === 0) {
          spawnParticle(
            k.x - Math.cos(k.angle) * 10, 1.5, k.z - Math.sin(k.angle) * 10,
            rand(-0.4, 0.4), rand(0.2, 0.8), rand(-0.4, 0.4),
            k.driftCharge > 48 ? 0xffb13d : 0x9ad4ff, 16
          );
        }
      } else {
        if (k.driftCharge > 48) { k.boost = Math.max(k.boost, 28); beep(990, 0.12, "sawtooth"); }
        k.driftCharge = 0;
      }
    } else if (!k.player && (state === "race" || state === "finished") && !k.finished) {
      const look = (k.prog + 22 + Math.floor(k.speed * 3)) % N;
      const t = SAMPLES[look];
      const want = Math.atan2(t.z - k.z, t.x - k.x);
      const diff = angDiff(k.angle, want);
      steer = clamp(diff * 3, -1, 1);
      gas = Math.abs(diff) < 1.1;
      const p = player();
      k.aiMax = PHYS.maxSpeed * (k.skill + k.aiJitter * 0.1) * (p && k.rank > p.rank ? 1.08 : 0.97);
      if (k.item) {
        k.aiUseItemT--;
        if (k.aiUseItemT <= 0) {
          useItem(k);
          k.aiUseItemT = rand(90, 300);
        }
      }
      for (const b of bananas) {
        const d = dist(k.x + Math.cos(k.angle) * 30, k.z + Math.sin(k.angle) * 30, b.x, b.z);
        if (d < 22) steer += steer >= 0 ? 0.8 : -0.8;
      }
    } else if (k.finished && !k.player) {
      const t = SAMPLES[(k.prog + 20) % N];
      steer = clamp(angDiff(k.angle, Math.atan2(t.z - k.z, t.x - k.x)) * 3, -1, 1);
      gas = true;
      k.aiMax = PHYS.maxSpeed * 0.5;
    }

    const maxBase = k.player ? PHYS.maxSpeed : (k.aiMax || PHYS.maxSpeed * 0.9);
    let max = k.boost > 0 ? maxBase * PHYS.boostMult : maxBase;
    if (offroad && k.boost <= 0) max = PHYS.offroadMax;

    if (gas) k.speed += k.boost > 0 ? PHYS.accel * 1.8 : PHYS.accel;
    else if (brake) k.speed -= k.speed > 0 ? PHYS.brake : -PHYS.brake * 0.4;
    k.speed *= PHYS.friction;
    if (offroad) {
      k.speed *= 0.965;
      if (k.speed > 1 && frame % 4 === 0) {
        spawnParticle(k.x, 1, k.z, rand(-0.5, 0.5), rand(0.5, 1.2), rand(-0.5, 0.5), 0x6b4a2b, 14);
      }
    }
    k.speed = clamp(k.speed, PHYS.reverseMax, max);

    const speedFactor = clamp(Math.abs(k.speed) / 2.2, 0, 1);
    k.angle += steer * PHYS.turn * speedFactor * Math.sign(k.speed || 1);
    k.lean = lerp(k.lean, -steer * 0.16 * speedFactor, 0.2);

    k.x += Math.cos(k.angle) * k.speed;
    k.z += Math.sin(k.angle) * k.speed;
    k.x = clamp(k.x, -200, 1160);
    k.z = clamp(k.z, -200, 800);

    if (k.boost > 0) {
      k.boost--;
      if (frame % 2 === 0) {
        spawnParticle(
          k.x - Math.cos(k.angle) * 12, 3, k.z - Math.sin(k.angle) * 12,
          -Math.cos(k.angle) * 1.8 + rand(-0.5, 0.5), rand(0.2, 0.9), -Math.sin(k.angle) * 1.8 + rand(-0.5, 0.5),
          0xff8c2e, 15
        );
      }
    }
    if (k.itemCooldown > 0) k.itemCooldown--;

    for (const p of BOOST_PADS) {
      if (dist(k.x, k.z, p.x, p.z) < 22) k.boost = Math.max(k.boost, 40);
    }
    for (const b of itemBoxes) {
      if (b.respawn <= 0 && dist(k.x, k.z, b.x, b.z) < 16 && !k.item) {
        k.item = rollItem(k);
        b.respawn = 240;
        if (k.player) beep(587, 0.12, "triangle");
      }
    }
    for (let i = bananas.length - 1; i >= 0; i--) {
      if (dist(k.x, k.z, bananas[i].x, bananas[i].z) < 14) {
        scene.remove(bananas[i].mesh);
        bananas.splice(i, 1);
        spinOut(k);
      }
    }
  }

  function updateShells() {
    for (let i = shells.length - 1; i >= 0; i--) {
      const s = shells[i];
      s.life--;
      if (s.target && !s.target.finished) {
        const want = Math.atan2(s.target.z - s.z, s.target.x - s.x);
        s.a += clamp(angDiff(s.a, want), -0.09, 0.09);
      }
      s.x += Math.cos(s.a) * 6.2;
      s.z += Math.sin(s.a) * 6.2;
      s.mesh.position.set(s.x, 0, s.z);
      s.mesh.rotation.y -= 0.3;
      let dead = s.life <= 0 || s.x < -250 || s.x > 1250 || s.z < -250 || s.z > 900;
      for (const k of karts) {
        if (k !== s.owner && dist(k.x, k.z, s.x, s.z) < 16) {
          spinOut(k);
          dead = true;
        }
      }
      if (dead) {
        scene.remove(s.mesh);
        shells.splice(i, 1);
      }
    }
  }

  function collideKarts() {
    for (let i = 0; i < karts.length; i++) {
      for (let j = i + 1; j < karts.length; j++) {
        const a = karts[i], b = karts[j];
        const d = dist(a.x, a.z, b.x, b.z);
        if (d < 22 && d > 0.01) {
          const nx = (b.x - a.x) / d, nz = (b.z - a.z) / d;
          const push = (22 - d) / 2;
          a.x -= nx * push; a.z -= nz * push;
          b.x += nx * push; b.z += nz * push;
          const tmp = a.speed;
          a.speed = lerp(a.speed, b.speed, 0.35);
          b.speed = lerp(b.speed, tmp, 0.35);
        }
      }
    }
  }

  function updateRanks() {
    const scored = karts.map((k) => {
      const lastCp = k.cp > 0 ? (((k.cp - 1) % N_CHECK) * CP_EVERY) % N : Math.floor(N * 0.97);
      const ahead = (k.prog - lastCp + N) % N;
      return { k, score: k.cp * N + Math.min(ahead, CP_EVERY + 30) };
    });
    scored.sort((a, b) => b.score - a.score);
    let pos = finishOrder.length + 1;
    for (const f of finishOrder) f.rank = finishOrder.indexOf(f) + 1;
    for (const s of scored) if (!s.k.finished) s.k.rank = pos++;
  }

  function update() {
    frame++;
    if (state === "countdown") {
      countdownT--;
      const sec = Math.ceil(countdownT / 60);
      countdownEl.textContent = sec > 0 ? String(sec) : "¡YA!";
      if (countdownT % 60 === 0 && sec > 0) beep(440, 0.15);
      if (countdownT <= 0) {
        state = "race";
        beep(880, 0.4);
        setTimeout(() => (countdownEl.textContent = ""), 700);
      }
    }
    if (state === "race" || state === "finished") {
      raceT++;
      for (const k of karts) updateKart(k);
      updateShells();
      collideKarts();
      updateRanks();
      for (const b of itemBoxes) if (b.respawn > 0) b.respawn--;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.m.position.x += p.vx;
        p.m.position.y += p.vy;
        p.m.position.z += p.vz;
        p.vy -= 0.06;
        p.life--;
        const sc = Math.max(p.life / p.max, 0.05);
        p.m.scale.setScalar(sc * 1.6);
        if (p.life <= 0) {
          p.m.visible = false;
          particles.splice(i, 1);
        }
      }
      if (state === "race" && player().finished) {
        state = "finished";
        engineOff();
        showResults();
      }
      const p = player();
      if (state === "race") engineSound(p.speed, p.boost > 0);
    }
  }

  // ---------------------------------------------------------- HUD / overlays
  const hud = document.getElementById("hud");
  const hudLap = document.getElementById("hud-lap");
  const hudRank = document.getElementById("hud-rank");
  const hudTime = document.getElementById("hud-time");
  const hudItem = document.getElementById("hud-item");
  const hudSpeedFill = document.getElementById("hud-speed-fill");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayBody = document.getElementById("overlay-body");
  const overlayHint = document.getElementById("overlay-hint");
  const countdownEl = document.getElementById("countdown");
  const minimap = document.getElementById("minimap");
  const mmCtx = minimap.getContext("2d");

  const ITEM_EMOJI = { mushroom: "🍄", banana: "🍌", shell: "🐢" };
  const ORDINAL = ["1º", "2º", "3º", "4º"];

  function drawHUD() {
    const p = player();
    if (!p) return;
    hudLap.textContent = `VUELTA ${Math.min(p.lap + 1, TOTAL_LAPS)}/${TOTAL_LAPS}`;
    hudRank.textContent = ORDINAL[p.rank - 1] || `${p.rank}º`;
    const t = raceT / 60;
    const mm = String(Math.floor(t / 60)).padStart(2, "0");
    const ss = String(Math.floor(t % 60)).padStart(2, "0");
    const cc = String(Math.floor((t % 1) * 100)).padStart(2, "0");
    hudTime.textContent = `${mm}:${ss}.${cc}`;
    hudItem.textContent = p.item ? ITEM_EMOJI[p.item] : "";
    hudSpeedFill.style.width = `${clamp(Math.abs(p.speed) / (PHYS.maxSpeed * PHYS.boostMult), 0, 1) * 100}%`;

    // minimapa
    const sc = 0.16, ox = 8, oy = 8;
    mmCtx.clearRect(0, 0, minimap.width, minimap.height);
    mmCtx.strokeStyle = "rgba(255,255,255,0.8)";
    mmCtx.lineWidth = 5;
    mmCtx.beginPath();
    for (let i = 0; i <= N; i += 4) {
      const s = SAMPLES[i % N];
      if (i === 0) mmCtx.moveTo(ox + s.x * sc, oy + s.z * sc);
      else mmCtx.lineTo(ox + s.x * sc, oy + s.z * sc);
    }
    mmCtx.stroke();
    for (const k of [...karts].sort((a, b) => b.rank - a.rank)) {
      mmCtx.fillStyle = "#" + k.color.toString(16).padStart(6, "0");
      mmCtx.beginPath();
      mmCtx.arc(ox + k.x * sc, oy + k.z * sc, k.player ? 5 : 3.6, 0, TAU);
      mmCtx.fill();
      if (k.player) {
        mmCtx.strokeStyle = "#fff";
        mmCtx.lineWidth = 1.5;
        mmCtx.stroke();
      }
    }
  }

  function showResults() {
    const order = [...karts].sort((a, b) => a.rank - b.rank);
    const medals = ["🏆", "🥈", "🥉", "4º"];
    overlayTitle.innerHTML = "¡CARRERA TERMINADA!";
    overlayBody.textContent = order
      .map((k, i) => {
        const t = k.finished ? `${(k.finishTime / 60).toFixed(2)}s` : "—";
        return `${medals[i]} ${k.name}  ·  ${t}`;
      })
      .join("\n");
    overlayHint.textContent = "ENTER o toca para volver a correr";
    overlay.classList.remove("hidden");
  }

  // ---------------------------------------------------------- cámara
  const camPos = new THREE.Vector3(CENTER.x, 280, CENTER.z + 480);
  const camLook = new THREE.Vector3(CENTER.x, 0, CENTER.z);

  function updateCamera() {
    if (state === "menu") {
      menuAngle += 0.0035;
      camPos.set(
        CENTER.x + Math.cos(menuAngle) * 450,
        170 + Math.sin(menuAngle * 0.7) * 40,
        CENTER.z + Math.sin(menuAngle) * 450
      );
      camera.position.lerp(camPos, 0.03);
      camLook.lerp(new THREE.Vector3(CENTER.x, 0, CENTER.z), 0.05);
      camera.lookAt(camLook);
      return;
    }
    const p = player();
    if (!p) return;
    const dx = Math.cos(p.angle), dz = Math.sin(p.angle);
    camPos.set(p.x - dx * 52, 27, p.z - dz * 52);
    camera.position.lerp(camPos, 0.14);
    camLook.lerp(new THREE.Vector3(p.x + dx * 26, 7, p.z + dz * 26), 0.25);
    camera.lookAt(camLook);
    const wantFov = p.boost > 0 ? 84 : 72;
    if (Math.abs(camera.fov - wantFov) > 0.3) {
      camera.fov = lerp(camera.fov, wantFov, 0.1);
      camera.updateProjectionMatrix();
    }
  }

  // ---------------------------------------------------------- sincronizar 3D
  function syncMeshes() {
    for (const k of karts) {
      k.mesh.position.set(k.x, 0, k.z);
      k.mesh.rotation.y = -k.angle;
      k.mesh.rotation.x = k.lean;
      const bob = Math.abs(k.speed) > 0.3 ? Math.sin(frame * 0.6 + k.rank) * 0.25 : 0;
      k.mesh.position.y = bob;
    }
    for (const b of bananas) b.mesh.position.set(b.x, 0, b.z);
    for (let i = 0; i < itemBoxes.length; i++) {
      const b = itemBoxes[i];
      b.mesh.visible = b.respawn <= 0;
      b.mesh.rotation.y += 0.025;
      b.mesh.rotation.x += 0.012;
      b.mesh.position.y = 7 + Math.sin(frame * 0.07 + i) * 1.2;
    }
  }

  // ---------------------------------------------------------- bucle principal
  resetRace();
  state = "menu";
  hud.style.display = "none";
  overlay.classList.remove("hidden");

  let last = null;
  let acc = 0;
  const DT = 1000 / 60;
  function loop(now) {
    if (last === null) last = now;
    acc += clamp(now - last, 0, 100);
    last = now;
    while (acc >= DT) {
      update();
      acc -= DT;
    }
    syncMeshes();
    updateCamera();
    if (state !== "menu") drawHUD();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  canvas.addEventListener("pointerdown", () => {
    audio();
    onEnter();
  });
})();
