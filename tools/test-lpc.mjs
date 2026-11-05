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
