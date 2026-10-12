// Captura mapa.html a PNG 2400x2160 (1600x1440 @1.5x) con el Chromium de Playwright.
// Uso: node captura.js   (requiere haber corrido: python mapa.py && python armar.py)
const path = require("path");
const fs = require("fs");
const { chromium } = require("C:/Users/nicol/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core");
const EXE = "C:/Users/nicol/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe";
const OUT = path.resolve(__dirname, "../../public/envios/mapa-zonas-envio.png");
(async () => {
  const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ["--force-device-scale-factor=1.5"] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1440 }, deviceScaleFactor: 1.5 });
  await page.goto("file:///" + path.resolve(__dirname, "mapa.html").replace(/\\/g, "/"), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: 1600, height: 1440 } });
  await browser.close();
  console.log("PNG:", OUT);
})();
