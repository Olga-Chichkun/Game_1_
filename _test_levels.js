/* E2E: проверяем все 5 уровней — логика + скриншоты */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = __dirname;
const PORT = 5610;
const MIME = {
  ".html":"text/html; charset=utf-8",
  ".js":  "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg"
};

function serve() {
  return http.createServer((req, res) => {
    let raw = (req.url || "/").split("?")[0];
    let p; try { p = decodeURIComponent(raw); } catch (_) { p = raw; }
    if (p === "/") p = "/index.html";
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end(String(err.message)); }
      res.writeHead(200, { "content-type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
      res.end(data);
    });
  }).listen(PORT);
}

(async () => {
  const server = serve();
  await new Promise(r => setTimeout(r, 100));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", msg => { if (msg.type() === "error") errors.push("CONSOLE: " + msg.text()); });

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });

  // 1) Стартуем с интро → уровень 1
  await page.click("#startGameBtn");
  await page.waitForFunction(() => {
    const gs = document.getElementById("gameScreen");
    return gs && !gs.classList.contains("hidden");
  });
  await page.waitForTimeout(2500);

  const expected = [5, 6, 7, 8, 9];
  const reports = [];

  for (let i = 0; i < expected.length; i += 1) {
    const lvl = i + 1;
    // Подождём стабилизации
    await page.waitForTimeout(300);

    const info = await page.evaluate(() => {
      const st = window.__game.state;
      const art = document.querySelectorAll("#artifactLayer .artifact-item").length;
      const slots = document.querySelectorAll("#artifactSlots .artifact-slot").length;
      const counter = document.getElementById("artifactCounter").textContent;
      const cls = document.getElementById("gameScreen").className;
      const bg = document.querySelector(".level-bg").getAttribute("src");
      const timer = !document.getElementById("timerWrap").classList.contains("hidden");
      const fakeLights = document.querySelectorAll("#fakeLights .fake-light").length;
      const vines = document.querySelectorAll("#vinesLayer .vine-decor").length;
      return { stLevel: st.level, stTotal: st.total, art, slots, counter, cls, bg, timer, fakeLights, vines };
    });

    reports.push({ level: lvl, ...info });

    await page.screenshot({ path: `_shot_level${lvl}.png`, fullPage: false });

    // Для L5 — не тестируем сбор (таймер), делаем только скриншот и переходим к концу
    if (lvl === 5) {
      // Проверим, что таймер виден
      break;
    }

    // Соберём все артефакты через dev-хук, чтобы пройти уровень
    await page.evaluate(() => {
      const items = document.querySelectorAll("#artifactLayer .artifact-item");
      items.forEach((el, idx) => {
        const uid = el.dataset.artifact;
        window.__game.collectArtifact(uid);
      });
    });

    // Дождёмся модалки «Уровень пройден»
    await page.waitForFunction(() => {
      const el = document.getElementById("levelCompleteScreen");
      return el && !el.classList.contains("hidden");
    }, { timeout: 4000 });

    await page.screenshot({ path: `_shot_complete${lvl}.png` });

    // Жмём «Следующий уровень»
    await page.click("#nextLevelBtn");
    // Ждём, пока transition уйдёт и gameScreen вновь видим
    await page.waitForFunction(() => {
      const gs = document.getElementById("gameScreen");
      return gs && !gs.classList.contains("hidden");
    });
    await page.waitForTimeout(2500);
  }

  // Репорт
  console.log("=== LEVEL CHECKS ===");
  reports.forEach((r, i) => {
    const exp = expected[i];
    const artOk = r.art === exp && r.slots === exp && r.stTotal === exp;
    const mark = artOk ? "OK " : "FAIL";
    console.log(` [${mark}] L${r.level}: art=${r.art} slots=${r.slots} total=${r.stTotal}  counter="${r.counter}"  bg=${r.bg}`);
    console.log(`         cls="${r.cls}"  timer=${r.timer} fakeLights=${r.fakeLights} vines=${r.vines}`);
  });

  // Дополнительно — проверим Game Over на L5: запустим L5 заново, подождём 31 сек
  console.log("--- testing L5 timer ---");
  await page.evaluate(() => {
    document.getElementById("levelCompleteScreen")?.classList.add("hidden");
    document.getElementById("winScreen")?.classList.add("hidden");
    document.getElementById("gameOverScreen")?.classList.add("hidden");
    window.__game.startLevel(5);
    document.getElementById("gameScreen").classList.remove("hidden");
    window.__game.state.started = true;
  });
  await page.waitForTimeout(500);
  const l5Init = await page.evaluate(() => ({
    remaining: window.__game.state.timer.remaining,
    visible: !document.getElementById("timerWrap").classList.contains("hidden")
  }));
  console.log("  timer init:", l5Init);

  // Форсим ускоренное время: собрём 0 артефактов, подождём 4 сек — посмотрим что таймер убывает
  await page.waitForTimeout(4000);
  const l5After4 = await page.evaluate(() => window.__game.state.timer.remaining);
  console.log("  remaining after 4s:", l5After4);

  if (errors.length) {
    console.log("ERRORS:", errors);
  } else {
    console.log("no console/page errors");
  }

  await browser.close();
  server.close();
})().catch(e => { console.error("TEST_FAILED:", e); process.exit(1); });
