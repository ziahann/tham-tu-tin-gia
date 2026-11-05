// Kiểm tra sprite người chơi ghép từ bộ thiết kế Thám Tử VLU (tools/hero.mjs, art-src/vlu-hero). Chạy ở gốc repo: node tools/test-hero.mjs
import fs from 'node:fs';
import { buildHero } from './hero.mjs';

let fails = 0;
const ok = (cond, label) => { if (!cond) { fails++; console.error('✗ ' + label); } };
const F = 64;
const at = (img, x, y) => { const i = (y * img.w + x) * 4; return [img.px[i], img.px[i + 1], img.px[i + 2], img.px[i + 3]]; };

const sheets = { m: buildHero('hero_m'), f: buildHero('hero_f') };
for (const [k, img] of Object.entries(sheets)) {
  ok(img.w === 576 && img.h === 384, `${k}: sheet 576x384`);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 9; col++) {
    let n = 0, low = -1, edge = false;
    for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
      if (!at(img, col * F + x, row * F + y)[3]) continue;
      n++; low = Math.max(low, y);
      if (x === 0 || x === F - 1) edge = true;
    }
    ok(n > 150, `${k} hàng ${row} cột ${col}: có hình (${n})`);
    ok(low === 62, `${k} hàng ${row} cột ${col}: chân ở y 62 (được ${low})`);
    ok(!edge, `${k} hàng ${row} cột ${col}: không chạm mép khung`);
  }
  // hàng trái = hàng phải lật ngang
  let same = true;
  for (let col = 0; col < 9 && same; col++) for (let y = 0; y < F && same; y++) for (let x = 0; x < F; x++) {
    if (at(img, col * F + x, F + y).join() !== at(img, col * F + (F - 1 - x), 2 * F + y).join()) { same = false; break; }
  }
  ok(same, `${k}: hàng trái là hàng phải lật ngang`);
}
ok(Buffer.compare(Buffer.from(sheets.m.px), Buffer.from(sheets.f.px)) !== 0, 'hero_f khác hero_m');

for (const f of ['player-male-sheet.png', 'player-female-sheet.png']) ok(fs.existsSync(new URL('../art-src/vlu-hero/' + f, import.meta.url)), `art-src/vlu-hero/${f} có trong repo`);
const src = JSON.parse(fs.readFileSync(new URL('../game/data/sources.json', import.meta.url), 'utf8'));
ok(!src.art?.ozzbit, 'sources.json không còn mục dùng art Ozzbit');
const lpcUsers = (src.art?.lpc || []).flatMap(a => a.usedBy);
ok(!lpcUsers.includes('hero_m') && !lpcUsers.includes('hero_f'), 'hero không còn trong ghi công LPC');

if (fails) { console.error(`test-hero: ${fails} lỗi`); process.exit(1); }
console.log('test-hero: ok');
