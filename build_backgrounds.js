/* Сжатие больших фонов: ресайз + JPEG 85-90%.
   Фонам прозрачность не нужна, поэтому JPEG в разы легче PNG. */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = __dirname;
const PORT = 5602;

const JOBS = [
  { src: "./background_1.png",  dst: "background_1.jpg", maxSize: 1600, quality: 0.85 },
  { src: "./Window.png",        dst: "Window.jpg",       maxSize: 1400, quality: 0.9  },
  { src: "./уровень 2.png",     dst: "background_2.jpg", maxSize: 1600, quality: 0.85,
    // Замазываем верхнюю/нижнюю полосы макета (там был UI), плюс лёгкий размыл по центру,
    // чтобы белые контуры артефактов на макете не конкурировали с настоящими PNG.
    mask: { topFade: 0.13, bottomFade: 0.32, centerDesaturate: true } }
];

function serve() {
  return http.createServer((req, res) => {
    let raw = (req.url || "/").split("?")[0];
    let p;
    try { p = decodeURIComponent(raw); } catch (_) { p = raw; }
    if (p === "/") p = "/_bg.html";
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end(String(err.message)); }
      const ext = path.extname(file).toLowerCase();
      const mime = ext === ".png" ? "image/png" : ext === ".html" ? "text/html" : "application/octet-stream";
      res.writeHead(200, { "content-type": mime });
      res.end(data);
    });
  }).listen(PORT);
}

const HTML = `<!doctype html><meta charset="utf-8"><title>bg</title><script>
  window.processBG = function (url, maxSize, quality, mask) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const srcW = img.naturalWidth;
          const srcH = img.naturalHeight;
          const scale = Math.min(1, maxSize / Math.max(srcW, srcH));
          const w = Math.round(srcW * scale);
          const h = Math.round(srcH * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, w, h);

          if (mask) {
            // Затемняющие полосы сверху/снизу
            if (mask.topFade) {
              const topH = Math.round(h * mask.topFade);
              const g = ctx.createLinearGradient(0, 0, 0, topH);
              g.addColorStop(0, "rgba(2,6,14,1)");
              g.addColorStop(1, "rgba(2,6,14,0)");
              ctx.fillStyle = g;
              ctx.fillRect(0, 0, w, topH);
            }
            if (mask.bottomFade) {
              const botH = Math.round(h * mask.bottomFade);
              const g = ctx.createLinearGradient(0, h - botH, 0, h);
              g.addColorStop(0, "rgba(2,6,14,0)");
              g.addColorStop(0.4, "rgba(2,6,14,0.65)");
              g.addColorStop(1, "rgba(2,6,14,1)");
              ctx.fillStyle = g;
              ctx.fillRect(0, h - botH, w, botH);
            }
          }

          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch (e) { reject(e); }
      };
      img.onerror = () => reject(new Error("load failed: " + url));
      img.src = url;
    });
  };
</script><body>bg</body>`;

(async () => {
  fs.writeFileSync(path.join(ROOT, "_bg.html"), HTML);
  const server = serve();
  await new Promise(r => setTimeout(r, 150));
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  await page.goto(`http://localhost:${PORT}/_bg.html`);

  for (const j of JOBS) {
    const srcStat = fs.statSync(path.join(ROOT, j.src));
    // В HTTP-запросе нужен URL-encoded путь (для кириллицы и пробелов)
    const urlSrc = "./" + encodeURIComponent(j.src.replace(/^\.\//, ""));
    const dataUrl = await page.evaluate(
      (args) => window.processBG(args.src, args.maxSize, args.quality, args.mask),
      { src: urlSrc, maxSize: j.maxSize, quality: j.quality, mask: j.mask || null }
    );
    const b64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
    const outFile = path.join(ROOT, j.dst);
    fs.writeFileSync(outFile, Buffer.from(b64, "base64"));
    const outStat = fs.statSync(outFile);
    const kb = (n) => (n / 1024).toFixed(0) + " KB";
    console.log(`  ✓ ${j.dst}  ${kb(srcStat.size)} → ${kb(outStat.size)}`);
  }

  await browser.close();
  server.close();
  fs.unlinkSync(path.join(ROOT, "_bg.html"));
  console.log("done.");
})().catch(e => { console.error("BG_FAILED:", e); process.exit(1); });
