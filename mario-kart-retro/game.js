/* ============================================================
   RETRO KART GP — juego de carreras 2D estilo retro (canvas)
   Inspirado en los clásicos de karts de 16 bits.
   ============================================================ */
(() => {
  "use strict";

  // ---------------------------------------------------------- setup
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width; // 960
  const H = canvas.height; // 600

  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const angDiff = (a, b) => {
    let d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  };

  // ---------------------------------------------------------- pista
  // Puntos de control del circuito (sentido de carrera = orden del array)
  const CONTROL = [
    [480, 520], [300, 515], [150, 450], [105, 310], [140, 165],
    [300, 92], [470, 118], [620, 82], [800, 100], [882, 220],
    [862, 360], [760, 438], [646, 398], [560, 462],
  ];

  const ROAD_HALF = 40; // medio ancho de la carretera

  // Catmull-Rom para suavizar la línea central
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

  // Densificar y re-muestrear a puntos equidistantes (~6 px)
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
    // longitud acumulada
    const out = [];
    const STEP = 6;
    let acc = 0;
    let prev = dense[0];
    out.push({ x: prev[0], y: prev[1], a: 0 });
    for (let i = 1; i <= dense.length; i++) {
      const cur = dense[i % dense.length];
      let d = dist(prev[0], prev[1], cur[0], cur[1]);
      while (acc + d >= STEP) {
        const t = (STEP - acc) / d;
        const x = lerp(prev[0], cur[0], t);
        const y = lerp(prev[1], cur[1], t);
        out.push({ x, y, a: 0 });
        prev = [x, y];
        d = dist(prev[0], prev[1], cur[0], cur[1]);
        acc = 0;
      }
      acc += d;
      prev = cur;
    }
    // ángulo (dirección de carrera) de cada muestra
    for (let i = 0; i < out.length; i++) {
      const nx = out[(i + 1) % out.length];
      out[i].a = Math.atan2(nx.y - out[i].y, nx.x - out[i].x);
    }
    return out;
  })();

  const N = SAMPLES.length;
  const N_CHECK = 8;
  const CP_EVERY = Math.floor(N / N_CHECK);
  const TOTAL_LAPS = 3;

  // búsqueda local del punto de pista más cercano (evita saltos entre tramos)
  function nearestIdx(x, y, fromIdx, window_) {
    let best = -1, bestD = Infinity;
    if (window_ >= N / 2) {
      for (let i = 0; i < N; i++) {
        const d = dist(x, y, SAMPLES[i].x, SAMPLES[i].y);
        if (d < bestD) { bestD = d; best = i; }
      }
    } else {
      for (let o = -window_; o <= window_; o++) {
        const i = (fromIdx + o + N) % N;
        const d = dist(x, y, SAMPLES[i].x, SAMPLES[i].y);
        if (d < bestD) { bestD = d; best = i; }
      }
    }
    return { idx: best, d: bestD };
  }

  // turbos en pista y cajas de objetos (índices de muestra + desfase lateral)
  function lateral(i, off) {
    const s = SAMPLES[i % N];
    return { x: s.x + Math.cos(s.a + Math.PI / 2) * off, y: s.y + Math.sin(s.a + Math.PI / 2) * off, a: s.a, idx: i % N };
  }
  const BOOST_PADS = [
    lateral(Math.floor(N * 0.22), 0),
    lateral(Math.floor(N * 0.55), 0),
    lateral(Math.floor(N * 0.83), 0),
  ];
  const ITEM_BOX_SPOTS = [
    lateral(Math.floor(N * 0.12), -16), lateral(Math.floor(N * 0.12) + 4, 0), lateral(Math.floor(N * 0.12) + 8, 16),
    lateral(Math.floor(N * 0.62), -16), lateral(Math.floor(N * 0.62) + 4, 0), lateral(Math.floor(N * 0.62) + 8, 16),
  ];

  // ---------------------------------------------------------- audio
  let actx = null;
  function audio() {
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* sin audio */ }
    }
    return actx;
  }
  function beep(freq, dur, type = "square", vol = 0.08) {
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
    const on = (e) => { e.preventDefault(); touch[prop] = true; audio(); if (state !== "race") onEnter(); };
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

  // ---------------------------------------------------------- karts
  const KART_DEFS = [
    { name: "TÚ", color: "#e23a3a", dark: "#8e1f1f", player: true },
    { name: "BOWZ", color: "#3a66e2", dark: "#1f3a8e", skill: 0.95 },
    { name: "LUI", color: "#2eb84e", dark: "#176e2c", skill: 0.9 },
    { name: "PEACH", color: "#e8c63a", dark: "#94791c", skill: 0.85 },
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
  let particles = [];
  let itemBoxes = [];
  let state = "menu"; // menu | countdown | race | finished
  let countdownT = 0;
  let raceT = 0;
  let frame = 0;
  let finishOrder = [];

  function makeKart(def, gridPos) {
    // parrilla de salida: detrás de la línea de meta, en 2 columnas
    const row = Math.floor(gridPos / 2);
    const col = gridPos % 2;
    const idx = (N - 8 - row * 7 + N) % N;
    const p = lateral(idx, col === 0 ? -15 : 15);
    return {
      ...def,
      x: p.x,
      y: p.y,
      angle: p.a,
      speed: 0,
      prog: idx,
      cp: 0,
      lap: 0,
      spin: 0,
      boost: 0,
      driftCharge: 0,
      item: null,
      itemAnim: 0,
      aiUseItemT: rand(60, 240),
      aiJitter: rand(-0.25, 0.2),
      itemCooldown: 0,
      finished: false,
      finishTime: 0,
      rank: gridPos + 1,
    };
  }

  function resetRace() {
    karts = KART_DEFS.map((d, i) => makeKart(d, i));
    bananas = [];
    shells = [];
    particles = [];
    itemBoxes = ITEM_BOX_SPOTS.map((s) => ({ ...s, respawn: 0 }));
    finishOrder = [];
    raceT = 0;
    countdownT = 3.6 * 60;
    state = "countdown";
    beep(440, 0.15);
  }

  function onEnter() {
    if (state === "menu" || state === "finished") resetRace();
  }

  const player = () => karts.find((k) => k.player);

  // ---------------------------------------------------------- objetos
  const ITEMS = ["mushroom", "banana", "shell"];
  function rollItem(kart) {
    // los rezagados reciben mejores objetos
    const r = Math.random();
    if (kart.rank >= 3) return r < 0.55 ? "mushroom" : r < 0.8 ? "shell" : "banana";
    return ITEMS[Math.floor(Math.random() * ITEMS.length)];
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
        x: k.x - Math.cos(k.angle) * 26,
        y: k.y - Math.sin(k.angle) * 26,
      });
      beep(300, 0.12);
    } else if (item === "shell") {
      // caparazón teledirigido al kart que va justo delante
      const target = karts.find((t) => t.rank === k.rank - 1 && !t.finished) || null;
      shells.push({
        x: k.x + Math.cos(k.angle) * 24,
        y: k.y + Math.sin(k.angle) * 24,
        a: k.angle,
        target,
        life: 300,
        owner: k,
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
  }

  // ---------------------------------------------------------- actualización
  function updateKart(k) {
    const onRoad = nearestIdx(k.x, k.y, k.prog, 18);
    // si se ha salido mucho, ampliar búsqueda
    const near = onRoad.d > 160 ? nearestIdx(k.x, k.y, k.prog, Math.ceil(N / 2)) : onRoad;
    k.prog = near.idx;
    const offroad = near.d > ROAD_HALF + 6;

    // checkpoints / vueltas
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
              beep(523, 0.15); setTimeout(() => beep(659, 0.15), 150); setTimeout(() => beep(784, 0.3), 300);
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
      k.y += Math.sin(SAMPLES[k.prog].a) * k.speed * 0.5;
      return;
    }

    let steer = 0, gas = false, brake = false;

    if (k.player && state === "race" && !k.finished) {
      const inp = input();
      gas = inp.up;
      brake = inp.down;
      steer = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      if (inp.item) useItem(k);
      // derrape: giro más cerrado, carga mini-turbo
      if (inp.drift && steer !== 0 && k.speed > 2) {
        steer *= 1.6;
        k.driftCharge++;
        if (frame % 3 === 0) {
          particles.push({
            x: k.x - Math.cos(k.angle) * 12, y: k.y - Math.sin(k.angle) * 12,
            vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5),
            life: 18, color: k.driftCharge > 48 ? "#ffb13d" : "#9ad4ff", size: 3,
          });
        }
      } else {
        if (k.driftCharge > 48) { k.boost = Math.max(k.boost, 28); beep(990, 0.12, "sawtooth"); }
        k.driftCharge = 0;
      }
    } else if (!k.player && (state === "race" || state === "finished") && !k.finished) {
      // ---- IA: perseguir un punto por delante en la línea central
      const look = (k.prog + 22 + Math.floor(k.speed * 3)) % N;
      const t = SAMPLES[look];
      const want = Math.atan2(t.y - k.y, t.x - k.x);
      const diff = angDiff(k.angle, want);
      steer = clamp(diff * 3, -1, 1);
      gas = Math.abs(diff) < 1.1;
      // goma elástica: acelera si va por detrás del jugador
      const p = player();
      k.aiMax = PHYS.maxSpeed * (k.skill + k.aiJitter * 0.1) * (p && k.rank > p.rank ? 1.08 : 0.97);
      // uso de objetos
      if (k.item) {
        k.aiUseItemT--;
        if (k.aiUseItemT <= 0) {
          useItem(k);
          k.aiUseItemT = rand(90, 300);
        }
      }
      // esquivar plátanos (mirada simple hacia delante)
      for (const b of bananas) {
        const d = dist(k.x + Math.cos(k.angle) * 30, k.y + Math.sin(k.angle) * 30, b.x, b.y);
        if (d < 22) steer += steer >= 0 ? 0.8 : -0.8;
      }
    } else if (k.finished && !k.player) {
      // los que terminan siguen rodando despacio
      const t = SAMPLES[(k.prog + 20) % N];
      steer = clamp(angDiff(k.angle, Math.atan2(t.y - k.y, t.x - k.x)) * 3, -1, 1);
      gas = true;
      k.aiMax = PHYS.maxSpeed * 0.5;
    }

    // física
    const maxBase = k.player ? PHYS.maxSpeed : (k.aiMax || PHYS.maxSpeed * 0.9);
    let max = k.boost > 0 ? maxBase * PHYS.boostMult : maxBase;
    if (offroad && k.boost <= 0) max = PHYS.offroadMax;

    if (gas) k.speed += k.boost > 0 ? PHYS.accel * 1.8 : PHYS.accel;
    else if (brake) k.speed -= k.speed > 0 ? PHYS.brake : -PHYS.brake * 0.4;
    k.speed *= PHYS.friction;
    if (offroad) k.speed *= 0.965;
    k.speed = clamp(k.speed, PHYS.reverseMax, max);

    const speedFactor = clamp(Math.abs(k.speed) / 2.2, 0, 1);
    k.angle += steer * PHYS.turn * speedFactor * Math.sign(k.speed || 1);

    k.x += Math.cos(k.angle) * k.speed;
    k.y += Math.sin(k.angle) * k.speed;
    k.x = clamp(k.x, 8, W - 8);
    k.y = clamp(k.y, 8, H - 8);

    if (k.boost > 0) {
      k.boost--;
      if (frame % 2 === 0) {
        particles.push({
          x: k.x - Math.cos(k.angle) * 14, y: k.y - Math.sin(k.angle) * 14,
          vx: -Math.cos(k.angle) * 2 + rand(-0.6, 0.6), vy: -Math.sin(k.angle) * 2 + rand(-0.6, 0.6),
          life: 16, color: "#ff8c2e", size: 4,
        });
      }
    }
    if (k.itemCooldown > 0) k.itemCooldown--;

    // turbos en el suelo
    for (const p of BOOST_PADS) {
      if (dist(k.x, k.y, p.x, p.y) < 22) k.boost = Math.max(k.boost, 40);
    }
    // cajas de objetos
    for (const b of itemBoxes) {
      if (b.respawn <= 0 && dist(k.x, k.y, b.x, b.y) < 16 && !k.item) {
        k.item = rollItem(k);
        k.itemAnim = 30;
        b.respawn = 240;
        if (k.player) beep(587, 0.12, "triangle");
      }
    }
    // plátanos
    for (let i = bananas.length - 1; i >= 0; i--) {
      if (dist(k.x, k.y, bananas[i].x, bananas[i].y) < 14) {
        bananas.splice(i, 1);
        spinOut(k);
      }
    }
    if (k.itemAnim > 0) k.itemAnim--;
  }

  function updateShells() {
    for (let i = shells.length - 1; i >= 0; i--) {
      const s = shells[i];
      s.life--;
      if (s.target && !s.target.finished) {
        const want = Math.atan2(s.target.y - s.y, s.target.x - s.x);
        s.a += clamp(angDiff(s.a, want), -0.09, 0.09);
      }
      s.x += Math.cos(s.a) * 6.2;
      s.y += Math.sin(s.a) * 6.2;
      let dead = s.life <= 0 || s.x < 0 || s.x > W || s.y < 0 || s.y > H;
      for (const k of karts) {
        if (k !== s.owner && dist(k.x, k.y, s.x, s.y) < 16) {
          spinOut(k);
          dead = true;
        }
      }
      if (dead) shells.splice(i, 1);
    }
  }

  function collideKarts() {
    for (let i = 0; i < karts.length; i++) {
      for (let j = i + 1; j < karts.length; j++) {
        const a = karts[i], b = karts[j];
        const d = dist(a.x, a.y, b.x, b.y);
        if (d < 22 && d > 0.01) {
          const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
          const push = (22 - d) / 2;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
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
    // los ya clasificados conservan su puesto de llegada
    let pos = finishOrder.length + 1;
    for (const f of finishOrder) f.rank = finishOrder.indexOf(f) + 1;
    for (const s of scored) if (!s.k.finished) s.k.rank = pos++;
  }

  function update() {
    frame++;
    if (state === "countdown") {
      countdownT--;
      const sec = Math.ceil(countdownT / 60);
      if (countdownT % 60 === 0 && sec > 0) beep(440, 0.15);
      if (countdownT <= 0) {
        state = "race";
        beep(880, 0.4);
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
        p.x += p.vx; p.y += p.vy; p.life--;
        if (p.life <= 0) particles.splice(i, 1);
      }
      if (state === "race" && player().finished) state = "finished";
    }
  }

  // ---------------------------------------------------------- dibujo
  // fondo + carretera pre-renderizados
  const trackLayer = document.createElement("canvas");
  trackLayer.width = W;
  trackLayer.height = H;
  (function renderTrack() {
    const c = trackLayer.getContext("2d");
    // hierba
    c.fillStyle = "#0e5e22";
    c.fillRect(0, 0, W, H);
    for (let i = 0; i < 1400; i++) {
      c.fillStyle = Math.random() < 0.5 ? "#0c5520" : "#127028";
      c.fillRect(Math.floor(rand(0, W)), Math.floor(rand(0, H)), 3, 3);
    }
    // charca decorativa
    c.fillStyle = "#1d4f8a";
    c.beginPath();
    c.ellipse(500, 290, 46, 30, 0.3, 0, TAU);
    c.fill();

    const path = new Path2D();
    path.moveTo(SAMPLES[0].x, SAMPLES[0].y);
    for (let i = 1; i < N; i++) path.lineTo(SAMPLES[i].x, SAMPLES[i].y);
    path.closePath();

    // borde
    c.lineJoin = "round";
    c.lineCap = "round";
    c.strokeStyle = "#caa86a";
    c.lineWidth = ROAD_HALF * 2 + 10;
    c.stroke(path);
    // asfalto
    c.strokeStyle = "#4c4c55";
    c.lineWidth = ROAD_HALF * 2;
    c.stroke(path);
    // línea central discontinua
    c.strokeStyle = "#d8d8d0";
    c.lineWidth = 3;
    c.setLineDash([14, 18]);
    c.stroke(path);
    c.setLineDash([]);

    // línea de meta (cuadros)
    const s0 = SAMPLES[0];
    c.save();
    c.translate(s0.x, s0.y);
    c.rotate(s0.a);
    const sq = 8;
    for (let r = 0; r < 2; r++) {
      for (let i = -Math.floor(ROAD_HALF / sq); i < Math.floor(ROAD_HALF / sq); i++) {
        c.fillStyle = (i + r) % 2 === 0 ? "#fff" : "#111";
        c.fillRect(r * sq - sq, i * sq, sq, sq);
      }
    }
    c.restore();

    // turbos (flechas naranjas)
    for (const p of BOOST_PADS) {
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.a);
      c.fillStyle = "#ff8c2e";
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(-14 + i * 10, -12);
        c.lineTo(-4 + i * 10, 0);
        c.lineTo(-14 + i * 10, 12);
        c.lineTo(-10 + i * 10, 0);
        c.closePath();
        c.fill();
      }
      c.restore();
    }
  })();

  function drawKart(k) {
    ctx.save();
    ctx.translate(k.x, k.y);
    ctx.rotate(k.angle);
    // sombra
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(-10, -7 + 3, 20, 14);
    // ruedas
    ctx.fillStyle = "#222";
    ctx.fillRect(-9, -9, 6, 4);
    ctx.fillRect(3, -9, 6, 4);
    ctx.fillRect(-9, 5, 6, 4);
    ctx.fillRect(3, 5, 6, 4);
    // carrocería
    ctx.fillStyle = k.color;
    ctx.fillRect(-10, -6, 20, 12);
    ctx.fillStyle = k.dark;
    ctx.fillRect(-10, -6, 6, 12);
    // morro
    ctx.fillStyle = k.color;
    ctx.fillRect(10, -3, 4, 6);
    // casco del piloto
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-1, 0, 4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = k.dark;
    ctx.beginPath();
    ctx.arc(0.5, 0, 2.2, 0, TAU);
    ctx.fill();
    ctx.restore();

    // nombre encima (solo IA)
    if (!k.player) {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "9px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText(k.name, k.x, k.y - 16);
    }
  }

  function drawItemIcon(item, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    if (item === "mushroom") {
      ctx.fillStyle = "#e23a3a";
      ctx.beginPath();
      ctx.arc(0, -size * 0.1, size * 0.5, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(-size * 0.22, -size * 0.1, size * 0.44, size * 0.4);
      ctx.beginPath();
      ctx.arc(-size * 0.2, -size * 0.28, size * 0.1, 0, TAU);
      ctx.arc(size * 0.2, -size * 0.28, size * 0.1, 0, TAU);
      ctx.fill();
    } else if (item === "banana") {
      ctx.strokeStyle = "#f2d03a";
      ctx.lineWidth = size * 0.28;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, -size * 0.15, size * 0.4, 0.3, Math.PI - 0.3);
      ctx.stroke();
    } else if (item === "shell") {
      ctx.fillStyle = "#e23a3a";
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.45, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(-size * 0.5, 0, size, size * 0.18);
    }
    ctx.restore();
  }

  function drawHUD() {
    const p = player();
    ctx.textAlign = "left";
    ctx.font = "bold 20px 'Courier New', monospace";
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(8, 8, 250, 34);
    ctx.fillStyle = "#fff";
    const lapShown = Math.min(p.lap + 1, TOTAL_LAPS);
    ctx.fillText(`VUELTA ${lapShown}/${TOTAL_LAPS}`, 16, 32);
    const ordinal = ["1º", "2º", "3º", "4º"][p.rank - 1] || `${p.rank}º`;
    ctx.fillStyle = "#ffd23a";
    ctx.fillText(ordinal, 190, 32);

    // tiempo
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(W - 130, 8, 122, 34);
    ctx.fillStyle = "#fff";
    const t = raceT / 60;
    const mm = String(Math.floor(t / 60)).padStart(2, "0");
    const ss = String(Math.floor(t % 60)).padStart(2, "0");
    const cc = String(Math.floor((t % 1) * 100)).padStart(2, "0");
    ctx.fillText(`${mm}:${ss}.${cc}`, W - 122, 32);

    // ranura de objeto
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(W / 2 - 24, 8, 48, 48);
    ctx.strokeStyle = "#ffd23a";
    ctx.lineWidth = 2;
    ctx.strokeRect(W / 2 - 24, 8, 48, 48);
    if (p.item) drawItemIcon(p.item, W / 2, 34, 30);

    // velocímetro simple
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(8, H - 30, 160, 22);
    ctx.fillStyle = p.boost > 0 ? "#ff8c2e" : "#6fe26f";
    const sw = clamp(Math.abs(p.speed) / (PHYS.maxSpeed * PHYS.boostMult), 0, 1) * 152;
    ctx.fillRect(12, H - 26, sw, 14);
  }

  function drawCenteredText(lines) {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(10,5,25,0.72)";
    ctx.fillRect(W / 2 - 270, H / 2 - 30 - lines.length * 22, 540, lines.length * 44 + 60);
    let y = H / 2 - lines.length * 22 + 14;
    for (const [text, size, color] of lines) {
      ctx.font = `bold ${size}px 'Courier New', monospace`;
      ctx.fillStyle = color;
      ctx.fillText(text, W / 2, y);
      y += size + 14;
    }
  }

  function draw() {
    ctx.drawImage(trackLayer, 0, 0);

    // cajas de objetos
    for (const b of itemBoxes) {
      if (b.respawn > 0) continue;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(frame * 0.03);
      const g = 7 + Math.sin(frame * 0.1) * 1.5;
      ctx.fillStyle = "rgba(80,200,255,0.85)";
      ctx.fillRect(-g, -g, g * 2, g * 2);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.strokeRect(-g, -g, g * 2, g * 2);
      ctx.restore();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText("?", b.x, b.y + 4);
    }

    // plátanos
    for (const b of bananas) drawItemIcon("banana", b.x, b.y, 16);
    // caparazones
    for (const s of shells) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(frame * 0.3);
      ctx.fillStyle = "#d42b2b";
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(-7, -2, 14, 4);
      ctx.restore();
    }

    // partículas
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / 18, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // karts ordenados por posición (el líder encima)
    if (karts.length) {
      [...karts].sort((a, b) => b.rank - a.rank).forEach(drawKart);
      drawHUD();
    }

    if (state === "menu") {
      drawCenteredText([
        ["RETRO KART GP", 44, "#ffd23a"],
        ["3 vueltas · 4 pilotos · objetos locos", 18, "#fff"],
        ["Pulsa ENTER (o toca la pantalla) para correr", 16, "#9ad4ff"],
      ]);
    } else if (state === "countdown") {
      const sec = Math.ceil(countdownT / 60);
      drawCenteredText([[sec > 0 ? String(sec) : "¡YA!", 80, sec > 0 ? "#ffd23a" : "#6fe26f"]]);
    } else if (state === "finished") {
      const order = [...karts].sort((a, b) => a.rank - b.rank);
      const lines = [["¡CARRERA TERMINADA!", 34, "#ffd23a"]];
      const medals = ["🏆", "🥈", "🥉", "  "];
      order.forEach((k, i) => {
        const t = k.finished ? `${(k.finishTime / 60).toFixed(2)}s` : "—";
        lines.push([`${medals[i]} ${i + 1}º  ${k.name.padEnd(6, " ")} ${t}`, 20, k.player ? "#6fe26f" : "#fff"]);
      });
      lines.push(["ENTER para volver a correr", 15, "#9ad4ff"]);
      drawCenteredText(lines);
    }
  }

  // ---------------------------------------------------------- bucle principal
  // pantalla de menú con karts de exhibición
  resetRace();
  state = "menu";

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
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // empezar también con un toque/clic en el canvas
  canvas.addEventListener("pointerdown", () => {
    audio();
    onEnter();
  });
})();
