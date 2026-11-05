// Kiểm tra sprite nhân vật vẽ bởi tools/chibi.mjs (phong cách Thám Tử VLU). Chạy ở gốc repo: node tools/test-chars.mjs
import { CHARACTERS } from './characters.mjs';
import { buildChibi } from './chibi.mjs';

let fails = 0;
const ok = (cond, label) => { if (!cond) { fails++; console.error('✗ ' + label); } };
const F = 64;

for (const [id, spec] of Object.entries(CHARACTERS)) {
  const img = buildChibi(spec);
  ok(img.w === 576 && img.h === 384, `${id}: sheet 576x384`);
  const cell = (c, r) => {
    let n = 0, low = -1, top = F;
    for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
      const a = img.get(c * F + x, r * F + y)[3];
      if (a === 255) { n++; low = Math.max(low, y); top = Math.min(top, y); }
    }
    return { n, low, top };
  };
  for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) {
    const { n, low, top } = cell(c, r);
    ok(n > 400, `${id} hàng ${r} cột ${c}: có hình (${n})`);
    ok(low >= 59 && low <= 61, `${id} hàng ${r} cột ${c}: chân ở y 59–61 (được ${low})`);
    ok(top >= 4, `${id} hàng ${r} cột ${c}: không chạm đỉnh khung (${top})`);
  }
  for (const [c, r] of [[0, 4], [1, 4], [2, 4], [0, 5]]) ok(cell(c, r).n > 300, `${id}: khung ngồi ${c},${r}`);
  let mirror = true;
  for (let c = 0; c < 9 && mirror; c++) for (let y = 0; y < F && mirror; y++) for (let x = 0; x < F; x++)
    if (img.get(c * F + x, F + y).join() !== img.get(c * F + F - 1 - x, 2 * F + y).join()) { mirror = false; break; }
  ok(mirror, `${id}: hàng trái là hàng phải lật ngang`);
}
// hai mẫu người chơi theo bộ thiết kế: ba lô, kính lúp; nữ đuôi ngựa + short
ok(CHARACTERS.hero_m.backpack && CHARACTERS.hero_m.magnifier && CHARACTERS.hero_f.magnifier, 'người chơi có ba lô + kính lúp');
ok(CHARACTERS.hero_f.hairStyle === 'pony' && CHARACTERS.hero_f.shorts, 'người chơi nữ: đuôi ngựa + quần short');

if (fails) { console.error(`test-chars: ${fails} lỗi`); process.exit(1); }
console.log(`test-chars: ok (${Object.keys(CHARACTERS).length} nhân vật)`);
