/* =========================================================
   Квест Наблюдателя — 5 уровней
   Vanilla JS: работает и из file://, и из HTTP-сервера.
   ========================================================= */

const introScreen = document.getElementById("introScreen");
const startGameBtn = document.getElementById("startGameBtn");

const transitionOverlay = document.getElementById("transitionOverlay");
const transitionSprites = document.getElementById("transitionSprites");
const transitionTitleMain = document.querySelector(".transition-title span");
const transitionTitleSub = document.querySelector(".transition-title small");

const gameScreen = document.getElementById("gameScreen");
const levelBg = document.querySelector(".level-bg");
const ambientSprites = document.getElementById("ambientSprites");
const fakeLightsLayer = document.getElementById("fakeLights");
const vinesLayer = document.getElementById("vinesLayer");
const fogLayer = document.querySelector(".fog-layer");
const artifactLayer = document.getElementById("artifactLayer");
const slotsContainer = document.getElementById("artifactSlots");
const counterEl = document.getElementById("artifactCounter");
const levelNumberEl = document.getElementById("levelNumber");
const hintBtn = document.getElementById("hintBtn");
const toastEl = document.getElementById("toast");
const particlesCanvas = document.getElementById("particlesCanvas");

const timerWrap = document.getElementById("timerWrap");
const timerValue = document.getElementById("timerValue");

const levelCompleteScreen = document.getElementById("levelCompleteScreen");
const nextLevelBtn = document.getElementById("nextLevelBtn");
const winScreen = document.getElementById("winScreen");
const restartWinBtn = document.getElementById("restartWinBtn");
const gameOverScreen = document.getElementById("gameOverScreen");
const retryLevelBtn = document.getElementById("retryLevelBtn");

/* ---------- Шаблоны артефактов ---------- */
const ARTIFACT_TYPES = {
  crystal:  { label: "Кристалл",    image: "./crystal.fx.png",  glow: "#7bdcff" },
  vase:     { label: "Ваза",        image: "./vase.fx.png",     glow: "#7dc8ff" },
  ring:     { label: "Кольцо",      image: "./ring.fx.png",     glow: "#9ad5ff" },
  totem:    { label: "Тотем",       image: "./totem.fx.png",    glow: "#6ad6ff" },
  triangle: { label: "Треугольник", image: "./triangle.fx.png", glow: "#6ad6ff" }
};

/* ---------- Конфиг уровней ---------- */
const LEVELS = [
  {
    id: 1,
    name: "Древний лес",
    subtitle: "Открытая поляна — всё на виду",
    background: "./background_1.jpg",
    ambient: 6,
    effects: {},
    artifacts: [
      { type: "triangle", left: 10, top: 35, size: 120, depth: 0.9 },
      { type: "vase",     left: 39, top: 22, size: 108, depth: 0.55 },
      { type: "crystal",  left: 41, top: 56, size: 132, depth: 1.0 },
      { type: "ring",     left: 65, top: 36, size: 100, depth: 0.7 },
      { type: "totem",    left: 82, top: 48, size: 122, depth: 0.85 }
    ]
  },
  {
    id: 2,
    name: "Руины с лианами",
    subtitle: "Свисающие лозы и тени маскируют находки",
    background: "./background_2.jpg",
    ambient: 14,
    effects: { vines: true, extraGlow: true },
    artifacts: [
      { type: "crystal",  left: 13, top: 34, size: 108, depth: 0.9 },
      { type: "vase",     left: 42, top: 22, size: 102, depth: 0.55 },
      { type: "ring",     left: 73, top: 27, size: 92,  depth: 0.7 },
      { type: "triangle", left: 18, top: 70, size: 102, depth: 1.0 },
      { type: "totem",    left: 56, top: 57, size: 116, depth: 0.85 },
      { type: "crystal",  left: 85, top: 72, size: 100, depth: 0.9 }
    ]
  },
  {
    id: 3,
    name: "Туманные низины",
    subtitle: "Густая дымка скрывает детали",
    background: "./background_1.jpg",
    ambient: 5,
    effects: { fog: "heavy" },
    artifacts: [
      { type: "crystal",  left: 12, top: 40, size: 108, depth: 0.9 },
      { type: "vase",     left: 28, top: 24, size: 98,  depth: 0.55 },
      { type: "ring",     left: 45, top: 55, size: 90,  depth: 0.7 },
      { type: "totem",    left: 60, top: 30, size: 112, depth: 0.85 },
      { type: "triangle", left: 72, top: 68, size: 98,  depth: 1.0 },
      { type: "crystal",  left: 85, top: 38, size: 96,  depth: 0.9 },
      { type: "vase",     left: 38, top: 72, size: 92,  depth: 0.6 }
    ]
  },
  {
    id: 4,
    name: "Ночные руины",
    subtitle: "Ложные огни путают взгляд",
    background: "./background_1.jpg",
    ambient: 8,
    effects: { dark: true, fakeLights: 14, fog: "light" },
    artifacts: [
      { type: "crystal",  left: 8,  top: 32, size: 98,  depth: 0.9 },
      { type: "vase",     left: 22, top: 58, size: 90,  depth: 0.55 },
      { type: "ring",     left: 35, top: 22, size: 82,  depth: 0.7 },
      { type: "totem",    left: 48, top: 64, size: 106, depth: 0.85 },
      { type: "triangle", left: 60, top: 32, size: 92,  depth: 1.0 },
      { type: "crystal",  left: 73, top: 55, size: 90,  depth: 0.9 },
      { type: "ring",     left: 86, top: 25, size: 80,  depth: 0.7 },
      { type: "totem",    left: 92, top: 68, size: 98,  depth: 0.85 }
    ]
  },
  {
    id: 5,
    name: "Час расплаты",
    subtitle: "30 секунд на 9 артефактов",
    background: "./background_1.jpg",
    ambient: 4,
    effects: { timer: 30, dark: false },
    artifacts: [
      { type: "crystal",  left: 10, top: 30, size: 82, depth: 0.9 },
      { type: "vase",     left: 26, top: 22, size: 74, depth: 0.55 },
      { type: "ring",     left: 42, top: 18, size: 68, depth: 0.7 },
      { type: "totem",    left: 58, top: 14, size: 86, depth: 0.85 },
      { type: "triangle", left: 72, top: 25, size: 76, depth: 1.0 },
      { type: "crystal",  left: 86, top: 32, size: 78, depth: 0.9 },
      { type: "vase",     left: 16, top: 68, size: 74, depth: 0.55 },
      { type: "ring",     left: 42, top: 72, size: 68, depth: 0.7 },
      { type: "totem",    left: 72, top: 70, size: 86, depth: 0.85 }
    ]
  }
];

/* ---------- Состояние ---------- */
const state = {
  started: false,
  level: 1,
  maxLevels: LEVELS.length,
  collected: new Set(),
  total: 0,
  hintLocked: false,
  mouseX: 0,
  mouseY: 0,
  timer: {
    running: false,
    remaining: 0,
    interval: null
  }
};

/* =========================================================
   Текущая конфигурация уровня
   ========================================================= */
function currentLevel() {
  return LEVELS[state.level - 1];
}

/* =========================================================
   Уникальный id экземпляра артефакта на уровне
   ========================================================= */
function artifactUid(idx) {
  return `a${idx}`;
}

/* =========================================================
   Построение артефактов
   ========================================================= */
function buildArtifacts() {
  const level = currentLevel();
  artifactLayer.innerHTML = "";
  level.artifacts.forEach((a, idx) => {
    const def = ARTIFACT_TYPES[a.type];
    if (!def) return;
    const uid = artifactUid(idx);

    const el = document.createElement("button");
    el.type = "button";
    el.className = "artifact-item";
    el.dataset.artifact = uid;
    el.dataset.type = a.type;
    el.dataset.depth = String(a.depth);
    el.setAttribute("aria-label", def.label);
    el.style.left = a.left + "%";
    el.style.top = a.top + "%";
    el.style.width = a.size + "px";
    el.style.height = a.size + "px";
    el.style.setProperty("--glow", def.glow);
    el.style.setProperty("--float-delay", (idx * 0.3).toFixed(2) + "s");
    el.style.setProperty("--float-dur", (2.4 + Math.random() * 1.6).toFixed(2) + "s");

    el.innerHTML = `
      <span class="artifact-inner">
        <img class="artifact-img" src="${def.image}" alt="${def.label}" draggable="false" />
      </span>
    `;

    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleArtifactClick(uid, el);
    });

    artifactLayer.appendChild(el);
  });
}

/* =========================================================
   Построение слотов нижней панели по текущему уровню
   ========================================================= */
function buildSlots() {
  const level = currentLevel();
  slotsContainer.innerHTML = "";
  const count = level.artifacts.length;
  slotsContainer.style.gridTemplateColumns = `repeat(${count}, minmax(0, 1fr))`;
  level.artifacts.forEach((a, idx) => {
    const def = ARTIFACT_TYPES[a.type];
    if (!def) return;
    const uid = artifactUid(idx);
    const slot = document.createElement("div");
    slot.className = "artifact-slot";
    slot.dataset.artifact = uid;
    slot.setAttribute("aria-label", def.label);
    slot.innerHTML = `
      <img class="slot-img" src="${def.image}" alt="" draggable="false">
      <span class="slot-name">${def.label}</span>
    `;
    slotsContainer.appendChild(slot);
  });
}

/* =========================================================
   Клик по артефакту
   ========================================================= */
function handleArtifactClick(uid, el) {
  if (state.collected.has(uid)) {
    el.classList.remove("shake-red");
    void el.offsetWidth;
    el.classList.add("shake-red");
    setTimeout(() => el.classList.remove("shake-red"), 420);
    return;
  }
  collectArtifact(uid);
}

function collectArtifact(uid) {
  if (state.collected.has(uid)) return;
  state.collected.add(uid);

  const item = artifactLayer.querySelector(`.artifact-item[data-artifact="${uid}"]`);
  const slot = slotsContainer.querySelector(`.artifact-slot[data-artifact="${uid}"]`);
  const typeId = item?.dataset.type;
  const def = typeId ? ARTIFACT_TYPES[typeId] : null;

  if (item) {
    item.classList.add("pulse-in");
    setTimeout(() => item.classList.remove("pulse-in"), 500);
    spawnFlash(item, def?.glow);
    spawnBurstParticles(item, def?.glow);
    setTimeout(() => item.classList.add("collected"), 240);
  }

  if (slot) {
    slot.classList.remove("pop");
    void slot.offsetWidth;
    slot.classList.add("active", "pop");
  }

  playCollectSound();
  showToast(`+1 артефакт • ${def ? def.label : ""}`);
  updateCounter();

  if (state.collected.size >= state.total) {
    setTimeout(finishLevel, 900);
  }
}

function updateCounter() {
  counterEl.textContent = `${state.collected.size} / ${state.total}`;
  counterEl.classList.remove("bump");
  void counterEl.offsetWidth;
  counterEl.classList.add("bump");
}

/* =========================================================
   Вспышка + burst частиц при сборе
   ========================================================= */
function spawnFlash(fromEl, color) {
  const rect = fromEl.getBoundingClientRect();
  const flash = document.createElement("div");
  flash.className = "flash";
  flash.style.left = rect.left + rect.width / 2 + "px";
  flash.style.top = rect.top + rect.height / 2 + "px";
  if (color) flash.style.setProperty("--flash-color", color);
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 900);
}

function spawnBurstParticles(fromEl, color) {
  const rect = fromEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const host = document.createElement("div");
  host.className = "burst";
  host.style.left = cx + "px";
  host.style.top = cy + "px";
  if (color) host.style.setProperty("--burst-color", color);
  document.body.appendChild(host);

  const count = 14;
  for (let i = 0; i < count; i += 1) {
    const p = document.createElement("span");
    p.className = "burst-particle";
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.35;
    const dist = 70 + Math.random() * 80;
    p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
    p.style.setProperty("--dy", Math.sin(angle) * dist + "px");
    p.style.setProperty("--size", (3 + Math.random() * 4).toFixed(1) + "px");
    p.style.animationDelay = (Math.random() * 0.08).toFixed(2) + "s";
    p.style.animationDuration = (0.7 + Math.random() * 0.5).toFixed(2) + "s";
    host.appendChild(p);
  }
  setTimeout(() => host.remove(), 1300);
}

/* =========================================================
   Звук сбора (Web Audio)
   ========================================================= */
let audioCtx = null;
function playCollectSound() {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
    }
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(720, t0);
    osc.frequency.exponentialRampToValueAtTime(1200, t0 + 0.22);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.5);
  } catch (_) { /* noop */ }
}

/* Короткий «тик» таймера */
function playTickSound(pitch = 500) {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
    }
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(pitch, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.06, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.1);
  } catch (_) { /* noop */ }
}

/* =========================================================
   Toast
   ========================================================= */
let toastTimer = null;
function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.remove("hidden", "show");
  void toastEl.offsetWidth;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
    setTimeout(() => toastEl.classList.add("hidden"), 350);
  }, 1400);
}

/* =========================================================
   Подсказка
   ========================================================= */
function useHint() {
  if (state.hintLocked) return;
  const items = [...artifactLayer.querySelectorAll(".artifact-item")]
    .filter((el) => !state.collected.has(el.dataset.artifact));
  if (items.length === 0) return;

  const item = items[Math.floor(Math.random() * items.length)];
  item.classList.add("hint-blink");
  state.hintLocked = true;
  hintBtn.classList.add("cooldown");

  setTimeout(() => item.classList.remove("hint-blink"), 2000);
  setTimeout(() => {
    state.hintLocked = false;
    hintBtn.classList.remove("cooldown");
  }, 3200);
}

/* =========================================================
   Parallax
   ========================================================= */
let parallaxScheduled = false;
function onMouseMove(e) {
  const w = window.innerWidth || 1;
  const h = window.innerHeight || 1;
  state.mouseX = e.clientX / w - 0.5;
  state.mouseY = e.clientY / h - 0.5;
  if (!parallaxScheduled) {
    parallaxScheduled = true;
    requestAnimationFrame(() => {
      parallaxScheduled = false;
      applyParallax();
    });
  }
}

function applyParallax() {
  if (levelBg) {
    levelBg.style.transform = `translate(${(-state.mouseX * 14).toFixed(1)}px, ${(-state.mouseY * 10).toFixed(1)}px) scale(1.04)`;
  }
  const items = artifactLayer.querySelectorAll(".artifact-item");
  items.forEach((el) => {
    const depth = parseFloat(el.dataset.depth || "0.6");
    const shift = 6 + depth * 10;
    el.style.setProperty("--px", (-state.mouseX * shift).toFixed(1) + "px");
    el.style.setProperty("--py", (-state.mouseY * shift).toFixed(1) + "px");
  });
}

/* =========================================================
   Canvas-частицы
   ========================================================= */
const PARTICLE_COLORS = ["106, 214, 255", "125, 188, 255", "180, 123, 255"];
const particlesState = {
  ctx: null,
  items: [],
  raf: null,
  w: 0, h: 0,
  running: false
};

function resizeParticles() {
  if (!particlesCanvas) return;
  particlesState.w = window.innerWidth;
  particlesState.h = window.innerHeight;
  particlesCanvas.width = particlesState.w;
  particlesCanvas.height = particlesState.h;
  particlesCanvas.style.width = particlesState.w + "px";
  particlesCanvas.style.height = particlesState.h + "px";
  particlesState.ctx = particlesCanvas.getContext("2d", { alpha: true });
}

function initParticles() {
  if (!particlesCanvas) return;
  resizeParticles();
  const total = 55;
  particlesState.items = [];
  for (let i = 0; i < total; i += 1) {
    const layer = Math.random() < 0.4 ? 0 : Math.random() < 0.75 ? 1 : 2;
    const speed = 0.1 + layer * 0.25 + Math.random() * 0.25;
    particlesState.items.push({
      x: Math.random() * particlesState.w,
      y: Math.random() * particlesState.h,
      r: 0.6 + Math.random() * 1.8,
      vx: (Math.random() - 0.5) * speed,
      vy: -speed - Math.random() * 0.35,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      layer,
      alpha: 0.25 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2
    });
  }
  startParticles();
}

function startParticles() {
  if (particlesState.raf) cancelAnimationFrame(particlesState.raf);
  particlesState.running = true;
  const tick = () => {
    if (!particlesState.running) return;
    const ctx = particlesState.ctx;
    if (!ctx) return;
    const W = particlesState.w, H = particlesState.h;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    const mx = state.mouseX;
    const my = state.mouseY;
    for (const p of particlesState.items) {
      p.phase += 0.02;
      p.x += p.vx + Math.sin(p.phase) * 0.18;
      p.y += p.vy;
      if (p.y < -10) {
        p.y = H + 10;
        p.x = Math.random() * W;
      }
      if (p.x < -20) p.x = W + 20;
      if (p.x > W + 20) p.x = -20;

      const layerShift = p.layer === 0 ? 4 : p.layer === 1 ? 10 : 20;
      const x = p.x + mx * layerShift;
      const y = p.y + my * (layerShift * 0.7);

      const r = p.r;
      ctx.fillStyle = `rgba(${p.color}, ${(p.alpha * 0.35).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, r * 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(${p.color}, ${p.alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    particlesState.raf = requestAnimationFrame(tick);
  };
  particlesState.raf = requestAnimationFrame(tick);
}

function stopParticles() {
  particlesState.running = false;
  if (particlesState.raf) cancelAnimationFrame(particlesState.raf);
}

/* =========================================================
   Переход intro → level
   ========================================================= */
function spawnTransitionSprites(count) {
  transitionSprites.innerHTML = "";
  for (let i = 0; i < count; i += 1) {
    const s = document.createElement("div");
    s.className = "woodsprite";
    s.style.left = Math.random() * 100 + "%";
    s.style.top = 60 + Math.random() * 40 + "%";
    s.style.setProperty("--dx", (Math.random() - 0.5) * 280 + "px");
    s.style.setProperty("--dy", -(120 + Math.random() * 260) + "px");
    s.style.animationDuration = 2.0 + Math.random() * 1.4 + "s";
    s.style.animationDelay = Math.random() * 0.6 + "s";
    transitionSprites.appendChild(s);
  }
}

function spawnAmbientSprites(count) {
  if (!ambientSprites) return;
  ambientSprites.innerHTML = "";
  for (let i = 0; i < count; i += 1) {
    const s = document.createElement("div");
    s.className = "ambient-sprite";
    s.style.left = Math.random() * 100 + "%";
    s.style.top = 10 + Math.random() * 80 + "%";
    s.style.animationDuration = 8 + Math.random() * 10 + "s";
    s.style.animationDelay = -Math.random() * 8 + "s";
    s.style.setProperty("--drift", (Math.random() - 0.5) * 80 + "px");
    s.style.setProperty("--rise", -(40 + Math.random() * 120) + "px");
    s.style.setProperty("--scale", (0.5 + Math.random() * 1.1).toFixed(2));
    ambientSprites.appendChild(s);
  }
}

/* =========================================================
   Уровневые спецэффекты (включаем по флагам уровня)
   ========================================================= */
function spawnFakeLights(count) {
  if (!fakeLightsLayer) return;
  fakeLightsLayer.innerHTML = "";
  for (let i = 0; i < count; i += 1) {
    const f = document.createElement("div");
    f.className = "fake-light";
    f.style.left = (4 + Math.random() * 92).toFixed(1) + "%";
    f.style.top = (10 + Math.random() * 80).toFixed(1) + "%";
    f.style.animationDelay = (-Math.random() * 4).toFixed(2) + "s";
    f.style.animationDuration = (2.6 + Math.random() * 2.4).toFixed(2) + "s";
    f.style.setProperty("--lsz", (4 + Math.random() * 5).toFixed(1) + "px");
    fakeLightsLayer.appendChild(f);
  }
}

function spawnVines() {
  if (!vinesLayer) return;
  vinesLayer.innerHTML = "";
  // Левая и правая сторона + свисающие ленты сверху
  const mounts = [
    { side: "left",  count: 3 },
    { side: "right", count: 3 },
    { side: "top",   count: 4 }
  ];
  mounts.forEach(m => {
    for (let i = 0; i < m.count; i += 1) {
      const v = document.createElement("div");
      v.className = `vine-decor vine-${m.side}`;
      if (m.side === "left")       v.style.top  = (10 + i * 18 + Math.random() * 6) + "%";
      else if (m.side === "right") v.style.top  = (5 + i * 19 + Math.random() * 6) + "%";
      else                         v.style.left = (5 + i * 22 + Math.random() * 6) + "%";
      v.style.animationDuration = (4 + Math.random() * 3).toFixed(2) + "s";
      v.style.animationDelay = (-Math.random() * 3).toFixed(2) + "s";
      v.style.setProperty("--vine-len", (120 + Math.random() * 220).toFixed(0) + "px");
      vinesLayer.appendChild(v);
    }
  });
}

/* =========================================================
   Таймер для 5-го уровня
   ========================================================= */
function startTimer(sec) {
  stopTimer();
  state.timer.running = true;
  state.timer.remaining = sec;
  timerWrap.classList.remove("hidden");
  timerWrap.classList.remove("warn", "critical");
  timerValue.textContent = String(sec);
  state.timer.interval = setInterval(() => {
    state.timer.remaining -= 1;
    timerValue.textContent = String(state.timer.remaining);
    timerValue.classList.remove("tick");
    void timerValue.offsetWidth;
    timerValue.classList.add("tick");
    if (state.timer.remaining <= 10 && state.timer.remaining > 5) {
      timerWrap.classList.add("warn");
      playTickSound(500);
    } else if (state.timer.remaining <= 5 && state.timer.remaining > 0) {
      timerWrap.classList.add("warn", "critical");
      gameScreen.classList.add("camera-shake");
      playTickSound(680);
    }
    if (state.timer.remaining <= 0) {
      stopTimer();
      gameOver();
    }
  }, 1000);
}

function stopTimer() {
  state.timer.running = false;
  if (state.timer.interval) {
    clearInterval(state.timer.interval);
    state.timer.interval = null;
  }
  gameScreen.classList.remove("camera-shake");
}

function hideTimer() {
  timerWrap.classList.add("hidden");
  timerWrap.classList.remove("warn", "critical");
}

/* =========================================================
   Применение визуальной конфигурации уровня
   ========================================================= */
function applyLevelTheme(level) {
  // Чистим ранее применённые классы
  const cls = gameScreen.className.split(" ").filter(c =>
    !/^level-\d+$/.test(c) && !/^fx-/.test(c)
  );
  gameScreen.className = cls.join(" ");
  gameScreen.classList.add(`level-${level.id}`);

  // Фон
  if (levelBg) levelBg.src = level.background;

  // Эффекты уровня
  const fx = level.effects || {};
  if (fx.fog === "heavy") gameScreen.classList.add("fx-fog-heavy");
  else if (fx.fog === "light") gameScreen.classList.add("fx-fog-light");
  if (fx.dark) gameScreen.classList.add("fx-dark");
  if (fx.vines) gameScreen.classList.add("fx-vines");
  if (fx.extraGlow) gameScreen.classList.add("fx-extraglow");

  // Лианы
  if (fx.vines) spawnVines(); else if (vinesLayer) vinesLayer.innerHTML = "";
  // Ложные огоньки
  if (fx.fakeLights) spawnFakeLights(fx.fakeLights); else if (fakeLightsLayer) fakeLightsLayer.innerHTML = "";

  // Таймер
  if (fx.timer) startTimer(fx.timer); else { stopTimer(); hideTimer(); }
}

/* =========================================================
   Переход между уровнями (пер-уровень заголовок)
   ========================================================= */
function startTransitionToLevel(levelNum) {
  transitionOverlay.classList.remove("hidden");
  transitionOverlay.classList.remove("open");
  spawnTransitionSprites(28);
  if (transitionTitleMain && transitionTitleSub) {
    const lvl = LEVELS[levelNum - 1];
    transitionTitleMain.textContent = `Уровень ${levelNum}`;
    transitionTitleSub.textContent = lvl ? lvl.subtitle : "";
  }
  requestAnimationFrame(() => {
    setTimeout(() => transitionOverlay.classList.add("open"), 60);
  });
  setTimeout(() => {
    startLevel(levelNum);
  }, 900);
  setTimeout(() => {
    transitionOverlay.classList.add("hidden");
    transitionOverlay.classList.remove("open");
    gameScreen.classList.remove("hidden");
    state.started = true;
    if (!particlesState.running) initParticles();
  }, 2400);
}

/* Первый заход после интро */
function startFromIntro() {
  introScreen.classList.add("hidden");
  document.body.classList.remove("intro-active");
  startTransitionToLevel(1);
}

/* =========================================================
   Уровни
   ========================================================= */
function startLevel(level) {
  state.level = level;
  state.collected = new Set();
  const lvl = currentLevel();
  state.total = lvl.artifacts.length;
  levelNumberEl.textContent = String(level);

  applyLevelTheme(lvl);
  buildSlots();
  buildArtifacts();
  spawnAmbientSprites(lvl.ambient || 6);
  updateCounter();
  applyParallax();
}

function finishLevel() {
  stopTimer();
  stopParticles();
  if (state.level < state.maxLevels) {
    gameScreen.classList.add("hidden");
    levelCompleteScreen.classList.remove("hidden");
    state.started = false;
  } else {
    gameScreen.classList.add("hidden");
    winScreen.classList.remove("hidden");
    state.started = false;
  }
}

function gameOver() {
  stopTimer();
  stopParticles();
  state.started = false;
  gameScreen.classList.add("hidden");
  if (gameOverScreen) gameOverScreen.classList.remove("hidden");
}

/* =========================================================
   Обработчики
   ========================================================= */
if (startGameBtn) {
  startGameBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    startFromIntro();
  });
}

if (hintBtn) {
  hintBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    useHint();
  });
}

if (nextLevelBtn) {
  nextLevelBtn.addEventListener("click", () => {
    levelCompleteScreen.classList.add("hidden");
    const nextLevel = state.level + 1 <= state.maxLevels ? state.level + 1 : 1;
    startTransitionToLevel(nextLevel);
  });
}

if (restartWinBtn) {
  restartWinBtn.addEventListener("click", () => {
    winScreen.classList.add("hidden");
    startTransitionToLevel(1);
  });
}

if (retryLevelBtn) {
  retryLevelBtn.addEventListener("click", () => {
    gameOverScreen.classList.add("hidden");
    startTransitionToLevel(state.level);
  });
}

/* Пауза анимаций при скрытой вкладке */
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopParticles();
  } else if (state.started) {
    if (!particlesState.running) startParticles();
  }
});

window.addEventListener("mousemove", onMouseMove, { passive: true });
window.addEventListener("resize", () => {
  if (particlesCanvas) resizeParticles();
});

/* Dev-хук для E2E */
window.__game = {
  collectArtifact,
  useHint,
  startFromIntro,
  startTransitionToLevel,
  startLevel,
  state,
  LEVELS
};
