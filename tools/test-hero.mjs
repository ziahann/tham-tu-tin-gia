// Kiểm tra sprite người chơi tự vẽ (tools/hero.mjs, phong cách chibi tham khảo Ozzbit Games, không dùng điểm ảnh của gói). Chạy ở gốc repo: node tools/test-hero.mjs
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
      if (x === 0 || y === 0 || x === F - 1) edge = true;
    }
    ok(n > 150, `${k} hàng ${row} cột ${col}: có hình (${n})`);
    ok(low >= 60 && low <= 62, `${k} hàng ${row} cột ${col}: chân ở y 60–62 (được ${low})`);
    ok(!edge, `${k} hàng ${row} cột ${col}: không chạm mép khung`);
  }
  // hàng trái = hàng phải lật ngang
  let same = true;
  for (let col = 0; col < 9 && same; col++) for (let y = 0; y < F && same; y++) for (let x = 0; x < F; x++) {
    if (at(img, col * F + x, F + y).join() !== at(img, col * F + (F - 1 - x), 2 * F + y).join()) { same = false; break; }
  }
  ok(same, `${k}: hàng trái là hàng phải lật ngang`);
  // không dùng màu nào của gói tham khảo
  const PACK = new Set(['000000', '7d5556', '4c2641', '9f95ab', '8b108f', 'cd3073', 'ffc5b4', 'b3b9d1', '24523b', 'd77e86', '59c135', 'c0d5dc', '1c548e', '69799e', '5c2c4f', 'a24e57', 'd2947f', '3f1e41', '143464', 'a0acc5', 'e74088', '1a7a3e']);
  let packPx = 0;
  for (let i = 0; i < img.px.length; i += 4) {
    const hex = [img.px[i], img.px[i + 1], img.px[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('');
    if (img.px[i + 3] && PACK.has(hex)) packPx++;
  }
  ok(packPx === 0, `${k}: không có màu của gói tham khảo (${packPx})`);
}
ok(Buffer.compare(Buffer.from(sheets.m.px), Buffer.from(sheets.f.px)) !== 0, 'hero_f khác hero_m');

const code = fs.readFileSync(new URL('./hero.mjs', import.meta.url), 'utf8');
ok(!/art-src|readFileSync|decodePng/.test(code), 'hero.mjs không đọc ảnh ngoài (tự vẽ hoàn toàn)');
const src = JSON.parse(fs.readFileSync(new URL('../game/data/sources.json', import.meta.url), 'utf8'));
ok(!src.art?.ozzbit, 'sources.json không còn mục dùng art Ozzbit');
const lpcUsers = (src.art?.lpc || []).flatMap(a => a.usedBy);
ok(!lpcUsers.includes('hero_m') && !lpcUsers.includes('hero_f'), 'hero không còn trong ghi công LPC');

if (fails) { console.error(`test-hero: ${fails} lỗi`); process.exit(1); }
console.log('test-hero: ok');
