// Cek tampilan mobile dengan Playwright (Chromium): screenshot + pemeriksaan otomatis NFR-012.
//
//   node scripts/ui-check.mjs --url http://localhost:3000/dev/ui --out <folder> [--width 360] [--height 740]
//                             [--click "Buka keranjang"] [--fill "Cari menu=teh"] [--key Escape] ...
//
// Langkah --click (nama tombol/link), --fill (label field=nilai), dan --key (tombol keyboard) dijalankan berurutan; setiap langkah
// menghasilkan screenshot bernomor. Butuh server web yang sudah berjalan (pnpm --filter web dev).
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const MIN_TARGET_PX = 44;

function parseArgs(argv) {
  const opts = { width: 360, height: 740, steps: [] };
  for (let i = 0; i < argv.length; i += 2) {
    const [flag, value] = [argv[i], argv[i + 1]];
    if (flag === '--url') opts.url = value;
    else if (flag === '--out') opts.out = value;
    else if (flag === '--width') opts.width = Number(value);
    else if (flag === '--height') opts.height = Number(value);
    else if (flag === '--click') opts.steps.push({ click: value });
    else if (flag === '--key') opts.steps.push({ key: value });
    else if (flag === '--fill') opts.steps.push({ fill: value });
    else throw new Error(`Argumen tidak dikenal: ${flag}`);
  }
  if (!opts.url || !opts.out) throw new Error('Wajib: --url dan --out');
  return opts;
}

/** Overflow horizontal & target sentuh < 44 px pada elemen interaktif yang terlihat. */
function inspect(minTarget) {
  const doc = document.documentElement;
  const small = [...document.querySelectorAll('button, a[href], input, textarea, select, [role="button"]')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (r.height < minTarget || r.width < minTarget);
    })
    .map((el) => {
      const r = el.getBoundingClientRect();
      const name = el.getAttribute('aria-label') || el.textContent?.trim() || el.getAttribute('name') || el.tagName;
      return `${el.tagName.toLowerCase()} "${name.slice(0, 40)}" ${Math.round(r.width)}×${Math.round(r.height)}`;
    });
  return {
    horizontalOverflowPx: Math.max(0, doc.scrollWidth - doc.clientWidth),
    smallTargets: small,
    dialogOpen: Boolean(document.querySelector('[role="dialog"]')),
    bodyOverflow: document.body.style.overflow || '',
  };
}

const opts = parseArgs(process.argv.slice(2));
mkdirSync(opts.out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: opts.width, height: opts.height },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const consoleErrors = [];
page.on('console', (msg) => msg.type() === 'error' && consoleErrors.push(msg.text()));
page.on('pageerror', (err) => consoleErrors.push(err.message));
const failedRequests = [];
page.on('response', (res) => res.status() >= 400 && failedRequests.push(`${res.status()} ${res.url()}`));

const report = { url: opts.url, viewport: `${opts.width}×${opts.height}`, steps: [] };
await page.goto(opts.url, { waitUntil: 'networkidle' });
const shot = async (name) => {
  const file = path.join(opts.out, `${String(report.steps.length).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  report.steps.push({ step: name, screenshot: file, ...(await page.evaluate(inspect, MIN_TARGET_PX)) });
};

await shot('awal');
for (const step of opts.steps) {
  if (step.click) {
    await page.getByRole('button', { name: step.click }).or(page.getByRole('link', { name: step.click })).first().click();
    await page.waitForTimeout(400);
    await shot(`klik-${step.click.replace(/\W+/g, '-').toLowerCase()}`);
  } else if (step.fill) {
    const [label, ...rest] = step.fill.split('=');
    await page.getByLabel(label).fill(rest.join('='));
    await page.waitForTimeout(300);
    await shot(`isi-${label.replace(/\W+/g, '-').toLowerCase()}`);
  } else {
    await page.keyboard.press(step.key);
    await page.waitForTimeout(300);
    await shot(`tombol-${step.key.toLowerCase()}`);
  }
}

report.consoleErrors = consoleErrors;
report.failedRequests = failedRequests;
writeFileSync(path.join(opts.out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
