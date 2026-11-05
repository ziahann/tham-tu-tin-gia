// Kiểm tra bộ dựng nhân vật LPC (tools/lpc.mjs, tools/png.mjs) bằng node, không cần mạng.
// Chạy ở thư mục gốc repo: node tools/test-lpc.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { Img, decodePng } from './png.mjs';

let fails = 0;
const eq = (got, want, label) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) { fails++; console.error(`✗ ${label}: được ${g}, cần ${w}`); }
};
const tmp = name => path.join(os.tmpdir(), `test-lpc-${process.pid}-${name}`);

// --- decodePng: đọc lại đúng ảnh RGBA do Img.save ghi
{
  const img = new Img(3, 2);
  img.set(0, 0, '#ff0000');
  img.set(2, 0, '#00ff8080');
  img.set(1, 1, '#123456');
  const f = tmp('rgba.png');
  img.save(f);
  const back = decodePng(fs.readFileSync(f));
  eq([back.w, back.h], [3, 2], 'decodePng kích thước');
  eq([...back.px], [...img.px], 'decodePng pixel RGBA');
}

// --- decodePng: ảnh bảng màu (color type 3) có tRNS, bộ lọc Sub và Up
{
  const crc = buf => { let c = ~0; for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(2, 0); ihdr.writeUInt32BE(2, 4); ihdr[8] = 8; ihdr[9] = 3;
  // dòng 0: lọc Sub, chỉ số 0,1 → byte 0, 1; dòng 1: lọc Up, chỉ số 1,0 → 1, 255 (0 - 1)
  const raw = Buffer.from([1, 0, 1, 2, 1, 255]);
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('PLTE', Buffer.from([10, 20, 30, 200, 100, 50])),
    chunk('tRNS', Buffer.from([0])),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
  // bảng màu 4-bit (LPC có dùng): 3x1, chỉ số 1,0,1 → byte 0x10, 0x10
  const ihdr4 = Buffer.from(ihdr); ihdr4.writeUInt32BE(3, 0); ihdr4.writeUInt32BE(1, 4); ihdr4[8] = 4;
  const png4 = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr4),
    chunk('PLTE', Buffer.from([10, 20, 30, 200, 100, 50])),
    chunk('IDAT', zlib.deflateSync(Buffer.from([0, 0x10, 0x10]))),
    chunk('IEND', Buffer.alloc(0))
  ]);
  const img4 = decodePng(png4);
  eq([img4.get(0, 0), img4.get(1, 0), img4.get(2, 0)], [[200, 100, 50, 255], [10, 20, 30, 255], [200, 100, 50, 255]], 'indexed 4-bit');

  const img = decodePng(png);
  eq(img.get(0, 0), [10, 20, 30, 0], 'indexed (0,0) trong suốt theo tRNS');
  eq(img.get(1, 0), [200, 100, 50, 255], 'indexed (1,0)');
  eq(img.get(0, 1), [200, 100, 50, 255], 'indexed lọc Up (0,1)');
  eq(img.get(1, 1), [10, 20, 30, 0], 'indexed lọc Up (1,1)');
}

// --- decodePng trên file LPC thật (khi đã có cache)
{
  const f = new URL('./.lpc-cache/spritesheets/body/bodies/male/sit.png', import.meta.url);
  if (fs.existsSync(f)) { const img = decodePng(fs.readFileSync(f)); eq([img.w, img.h], [192, 256], 'LPC sit.png kích thước'); }
}

const lpc = await import('./lpc.mjs');
const hex = c => '#' + c.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('');

// --- recolor: thay màu trong dải gốc, giữ màu ngoài dải
{
  const img = new Img(2, 1);
  img.set(0, 0, '#FFFFFF'); img.set(1, 0, '#123456');
  const from = ['#281820', '#4D4A5D', '#958080', '#C4B59F', '#E5E6C7', '#ffffff'];
  const to = ['#000001', '#000002', '#000003', '#000004', '#000005', '#000006'];
  const out = lpc.recolor(img, from, to);
  eq(hex(out.get(0, 0)), '#000006', 'recolor màu trong dải');
  eq(hex(out.get(1, 0)), '#123456', 'recolor giữ màu ngoài dải');
}

// --- pickRamp: chọn dải gốc khớp nhiều pixel nhất; recolorByLuma: đổi theo thứ tự độ sáng khi không dải nào khớp
{
  const img = new Img(3, 1);
  img.set(0, 0, '#182611'); img.set(1, 0, '#203416'); img.set(2, 0, '#314f22');
  const ramps = { white: ['#281820', '#4d4a5d', '#958080', '#c4b59f', '#e5e6c7', '#ffffff'], green: ['#000000', '#182611', '#203416', '#314f22', '#5a8a3a', '#9ad06a'] };
  eq(lpc.pickRamp(img, ramps).name, 'green', 'pickRamp chọn dải khớp nhiều nhất');
  eq(lpc.pickRamp(img, ramps).share, 1, 'pickRamp tỉ lệ khớp');
  const to = ['#000001', '#000002', '#000003', '#000004', '#000005', '#000006'];
  const out = lpc.recolorByLuma(img, to);
  const got = [0, 1, 2].map(x => hex(out.get(x, 0)));
  eq(got[0] < got[1] && got[1] < got[2], true, 'recolorByLuma giữ thứ tự sáng tối');
  eq(got.every(c => to.includes(c)), true, 'recolorByLuma chỉ dùng màu của dải đích');
}

// --- recolorParts: nhiều lượt đổi màu trên một lớp (da + mắt), chỉ thay màu khớp dải, phần còn lại giữ
{
  const img = new Img(3, 1);
  img.set(0, 0, '#cc8665'); img.set(1, 0, '#3355aa'); img.set(2, 0, '#ffffff');
  const ramps = { body: { light: ['#271920', '#99423c', '#cc8665', '#e4a47c', '#f9d5ba', '#faece7'] }, eye: { blue: ['#112244', '#3355aa', '#6688dd'] } };
  const out = lpc.recolorParts(img, [
    { material: 'body', to: ['#000001', '#000002', '#000003', '#000004', '#000005', '#000006'] },
    { material: 'eye', to: ['#100000', '#200000', '#300000'] }
  ], ramps);
  eq([0, 1, 2].map(x => hex(out.get(x, 0))), ['#000003', '#200000', '#ffffff'], 'recolorParts da + mắt, giữ màu khác');
}

// --- rampsFor(material, ownOnly): lượt đổi màu từng phần chỉ dùng bảng riêng của vật liệu (không lẫn dải da của all_lpcr)
if (fs.existsSync(new URL('./.lpc-cache/palette_definitions/eye/eye_ulpc.json', import.meta.url))) {
  const own = await lpc.rampsFor('eye', true);
  eq(Object.keys(own).includes('blue') && !Object.keys(own).includes('ivory'), true, 'rampsFor eye ownOnly');
}

// --- rampFor: 6 màu, màu thứ 4 là màu đích
{
  const r = lpc.rampFor('cloth', '#3d7fd1');
  eq(r.length, 6, 'rampFor độ dài');
  eq(r[3], '#3d7fd1', 'rampFor màu giữa');
}

// --- toGameSheet: hàng LPC (lên, trái, xuống, phải) → game (xuống, trái, phải, lên) + ngồi
{
  const C = { up: '#0000aa', left: '#00aa00', down: '#aa0000', right: '#aaaa00' };
  const lpcRows = ['up', 'left', 'down', 'right'];
  const walk = new Img(576, 256), sit = new Img(192, 256);
  lpcRows.forEach((d, r) => { walk.rect(0, r * 64, 576, 64, C[d]); sit.rect(0, r * 64, 192, 64, C[d]); });
  const g = lpc.toGameSheet(walk, sit);
  eq([g.w, g.h], [576, 384], 'toGameSheet kích thước');
  eq(['down', 'left', 'right', 'up'].map((d, r) => hex(g.get(5 * 64 + 10, r * 64 + 10))), [C.down, C.left, C.right, C.up], 'toGameSheet hàng đi');
  eq([hex(g.get(10, 4 * 64 + 10)), hex(g.get(64 + 10, 4 * 64 + 10)), hex(g.get(128 + 10, 4 * 64 + 10)), hex(g.get(10, 5 * 64 + 10))],
    [C.down, C.right, C.left, C.up], 'toGameSheet ngồi');
}

// --- checkSheet: báo ô trống
{
  const g = new Img(576, 384);
  g.rect(0, 0, 576, 4 * 64, '#808080');
  g.rect(0, 4 * 64, 192, 64, '#808080'); g.rect(0, 5 * 64, 64, 64, '#808080');
  eq(lpc.checkSheet('x', g), [], 'checkSheet sheet đủ');
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) g.px[((2 * 64 + y) * 576 + 3 * 64 + x) * 4 + 3] = 0;
  eq(lpc.checkSheet('x', g).some(e => e.includes('walk right 3')), true, 'checkSheet báo ô trống walk right 3');
  eq(lpc.checkSheet('x', new Img(96, 288)).length > 0, true, 'checkSheet báo sai kích thước');
}

// --- drawOwn: đồ tự vẽ bám theo đỉnh đầu từng ô
{
  const own = await import('./lpc-own.mjs');
  const sheet = new Img(576, 384);
  const cells = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) cells.push([c, r]);
  cells.push([0, 4], [1, 4], [2, 4], [0, 5]);
  // "người" giả: khối cao 44 px, đỉnh đầu lệch theo cột để đồ phải bám từng ô
  for (const [c, r] of cells) sheet.rect(c * 64 + 24, r * 64 + 16 + (c % 2), 16, 44, '#808080');
  own.drawOwn(sheet, ['conical_hat', 'vlu_backpack'], { hat: '#e3cf9a', backpack: '#b8223a' });
  const has = (c, r, color, y0, y1) => {
    for (let y = r * 64 + y0; y < r * 64 + y1; y++) for (let x = c * 64; x < c * 64 + 64; x++) if (hex(sheet.get(x, y)) === color) return true;
    return false;
  };
  eq(cells.every(([c, r]) => has(c, r, '#e3cf9a', 16 + (c % 2) - 6, 16 + (c % 2) + 6)), true, 'nón lá nằm quanh đỉnh đầu mọi ô');
  eq([0, 1, 2, 3, 4, 5, 6, 7, 8].every(c => has(c, 3, '#b8223a', 20, 60)), true, 'balo Văn Lang đỏ thấy được khi quay lưng');
  eq(Object.keys(own.OWN_ITEMS).sort(), ['camera', 'cap', 'conical_hat', 'lanyard', 'press_card', 'vlu_backpack'], 'đủ 6 món tự vẽ');
}

// --- creditsFor: chỉ ghi công mục ứng với thư mục thật sự dùng; không mục nào khớp thì giữ cả
{
  const def = { credits: [{ file: 'body/bodies/male', authors: ['a'] }, { file: 'body/bodies/child', authors: ['b'] }, { file: 'body/bodies/female', authors: ['c'] }] };
  eq(lpc.creditsFor(def, ['body/bodies/male/']).map(c => c.file), ['body/bodies/male'], 'creditsFor lọc theo thư mục dùng');
  eq(lpc.creditsFor({ credits: [{ file: 'x/y' }] }, ['a/b/']).map(c => c.file), ['x/y'], 'creditsFor không khớp thì giữ cả');
}

// --- công thức nhân vật: mọi mục có lpc hợp lệ, đồ tự vẽ có thật
{
  const { CHARACTERS } = await import('./characters.mjs');
  const { OWN_ITEMS } = await import('./lpc-own.mjs');
  const bad = Object.entries(CHARACTERS).filter(([, s]) => !s.lpc || !['male', 'female', 'teen'].includes(s.lpc.body) || !s.lpc.layers?.length
    || (s.lpc.own || []).some(i => !OWN_ITEMS[i]) || s.lpc.layers.some(l => !l.def));
  eq(bad.map(([k]) => k), [], 'mọi nhân vật có công thức lpc hợp lệ');
}

// --- ghi công trong sources.json (sau khi chạy gen-assets)
{
  const src = JSON.parse(fs.readFileSync(new URL('../game/data/sources.json', import.meta.url), 'utf8'));
  const { CHARACTERS } = await import('./characters.mjs');
  const art = src.art?.lpc || [];
  eq(art.length > 0, true, 'sources.json có art.lpc');
  eq(art.filter(a => !a.authors?.length || !a.licenses?.length).map(a => a.file), [], 'mỗi lớp LPC có tác giả + giấy phép');
  eq(art.flatMap(a => a.usedBy).filter(id => !CHARACTERS[id]).length, 0, 'usedBy là nhân vật có thật');
  eq(new Set(art.map(a => a.file)).size, art.length, 'mỗi file ghi công một lần');
  eq(src.art?.own?.license, 'CC0 1.0', 'đồ tự vẽ ghi CC0');
}

// --- cacheDir: đường dẫn thật (không còn %20 của URL)
eq(lpc.cacheDir().includes('%'), false, 'cacheDir không chứa %');
eq(fs.existsSync(path.dirname(lpc.cacheDir())), true, 'cacheDir nằm trong thư mục tools có thật');

// --- resolveDir: chọn thư mục theo thân, thay biến ${head}
eq(lpc.resolveDir({ male: 'head/faces/${head}/neutral/' }, 'male', {}), 'head/faces/male/neutral/', 'resolveDir ${head} mặc định = thân');
eq(lpc.resolveDir({ male: 'head/faces/${head}/neutral/' }, 'male', { head: 'elderly' }), 'head/faces/elderly/neutral/', 'resolveDir ${head} tự đặt');
eq(lpc.resolveDir({ male: 'a/' }, 'teen', {}), 'a/', 'resolveDir thiếu thân → male');

// --- fetchLpc: cache trống + không tải được → lỗi nêu file thiếu
{
  process.env.LPC_CACHE = tmp('cache');
  process.env.LPC_BASE = 'http://127.0.0.1:9/';
  let msg = '';
  try { await lpc.fetchLpc('spritesheets/none.png'); } catch (e) { msg = e.message; }
  eq(msg.includes('Thiếu spritesheets/none.png'), true, 'fetchLpc lỗi khi thiếu cache');
  delete process.env.LPC_CACHE; delete process.env.LPC_BASE;
}

if (fails) { console.error(`test-lpc: ${fails} lỗi`); process.exit(1); }
console.log('test-lpc: ok');
