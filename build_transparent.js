/* Одноразовый билд: превращает PNG с чёрным/белым фоном
   в настоящие прозрачные PNG, используя chroma-key в Chromium.
   Результат сохраняется рядом: crystal.fx.png, vase.fx.png и т.д. */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = __dirname;
const PORT = 5601;

const SOURCES = [
  { name: "crystal",  src: "./crystal.png" },
  { name: "vase",     src: "./vase.png" },
  { name: "ring",     src: "./ring.png" },
  { name: "totem",    src: "./totem.png" },
  { name: "triangle", src: "./triangle.png" }
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".png":  "image/png",
  ".js":   "application/javascript; charset=utf-8"
};

function serve() {
  return http.createServer((req, res) => {
    let p = decodeURIComponent((req.url || "/").split("?")[0]);
    if (p === "/") p = "/_build.html";
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end(String(err.message)); }
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" });
      res.end(data);
    });
  }).listen(PORT);
}

/* Простая страница для выполнения chroma-key в Chromium.
   Дополнительно ресайзим исходный PNG до MAX_SIZE (по длинной стороне),
   чтобы финальные .fx.png были лёгкими. */
const MAX_SIZE = 512;
const HTML = `<!doctype html><meta charset="utf-8"><title>build</title><script>
  window.MAX_SIZE = ${MAX_SIZE};
  window.chromaKeyImage = function (url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          // Ресайз по длинной стороне до MAX_SIZE (с сохранением пропорций)
          const srcW = img.naturalWidth;
          const srcH = img.naturalHeight;
          const scale = Math.min(1, window.MAX_SIZE / Math.max(srcW, srcH));
          const w = Math.round(srcW * scale);
          const h = Math.round(srcH * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, w, h);
          const data = ctx.getImageData(0, 0, w, h);
          const px = data.data;

          // среднее по 4 углам (квадрат 10x10)
          const s = 10;
          const corners = [[0, 0], [w - s, 0], [0, h - s], [w - s, h - s]];
          let rSum = 0, gSum = 0, bSum = 0, n = 0;
          for (const [cx, cy] of corners) {
            for (let y = cy; y < cy + s; y++) {
              for (let x = cx; x < cx + s; x++) {
                const i = (y * w + x) * 4;
                rSum += px[i]; gSum += px[i+1]; bSum += px[i+2]; n++;
              }
            }
          }
          const avg = [rSum/n, gSum/n, bSum/n];
          const lum = (avg[0] + avg[1] + avg[2]) / 3;
          // Белый и чёрный фон: более агрессивный порог
          const threshold = (lum < 40 || lum > 215) ? 90 : 70;
          const softness = 34;

          for (let i = 0; i < px.length; i += 4) {
            const dr = px[i]     - avg[0];
            const dg = px[i + 1] - avg[1];
            const db = px[i + 2] - avg[2];
            const dist = Math.sqrt(dr*dr + dg*dg + db*db);
            if (dist < threshold) {
              px[i + 3] = 0;
            } else if (dist < threshold + softness) {
              px[i + 3] = Math.round(px[i + 3] * ((dist - threshold) / softness));
            }
          }
          ctx.putImageData(data, 0, 0);

          // Autocrop: обрезаем прозрачные поля по bbox непрозрачных пикселей
          let minX = w, minY = h, maxX = -1, maxY = -1;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const a = px[(y * w + x) * 4 + 3];
              if (a > 10) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
              }
            }
          }
          let finalCanvas = canvas;
          if (maxX >= 0 && (minX > 0 || minY > 0 || maxX < w - 1 || maxY < h - 1)) {
            const pad = 2;
            const cx = Math.max(0, minX - pad);
            const cy = Math.max(0, minY - pad);
            const cw = Math.min(w, maxX + pad) - cx + 1;
            const ch = Math.min(h, maxY + pad) - cy + 1;
            const out = document.createElement("canvas");
            out.width = cw; out.height = ch;
            out.getContext("2d").drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
            finalCanvas = out;
          }
          resolve(finalCanvas.toDataURL("image/png"));
        } catch (e) { reject(e); }
      };
      img.onerror = () => reject(new Error("load failed: " + url));
      img.src = url;
    });
  };
</script><body>build page</body>`;

(async () => {
  fs.writeFileSync(path.join(ROOT, "_build.html"), HTML);
  const server = serve();
  await new Promise(r => setTimeout(r, 150));

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`http://localhost:${PORT}/_build.html`);

  for (const s of SOURCES) {
    const dataUrl = await page.evaluate((url) => window.chromaKeyImage(url), s.src);
    const b64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    const outFile = path.join(ROOT, `${s.name}.fx.png`);
    fs.writeFileSync(outFile, Buffer.from(b64, "base64"));
    console.log("  ✓", outFile, fs.statSync(outFile).size, "bytes");
  }

  await browser.close();
  server.close();
  fs.unlinkSync(path.join(ROOT, "_build.html"));
  console.log("done.");
})().catch(e => { console.error("BUILD_FAILED:", e); process.exit(1); });
