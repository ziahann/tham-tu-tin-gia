// Đồ họa isometric (góc chéo 45°) dựng từ ô vuông đã vẽ: ô nền hình thoi 64x32, khối tường, lan can.
// Phép chiếu: P(x, y) = (x − y, (x + y) / 2) với x, y tính bằng pixel logic (ô vuông 32 px → ô thoi 64x32).
// Chạy qua gen-assets (sau khi vẽ tileset): ghi game/assets/iso/ground.png, walls.png.
import { Img } from './png.mjs';
import { shade } from './characters.mjs';

const T = 32;
export const WALL_H = 56;  // chiều cao tường (≈ 2,5 m so với người 48 px)
export const LOW_H = 8;    // tường phía trước được cắt thấp để nhìn vào trong phòng

/** Lấy màu một điểm của ô vuông thứ i trong tileset (8 cột), u, v trong 0..31. */
function sampler(tileset, cols = 8) {
  return (i, u, v) => {
    const x = (i % cols) * T + Math.max(0, Math.min(T - 1, Math.floor(u)));
    const y = Math.floor(i / cols) * T + Math.max(0, Math.min(T - 1, Math.floor(v)));
    return tileset.get(x, y);
  };
}

/**
 * Ô nền hình thoi 64x32 cho mọi ô của tileset (cùng thứ tự, 8 cột): mỗi điểm trong hình thoi ánh xạ ngược về ô vuông.
 * Điểm (px, py) so với đỉnh trên (32, 0): u = py + (px − 32) / 2, v = py − (px − 32) / 2.
 */
export function isoGround(tileset, count) {
  const S = sampler(tileset);
  const cols = 8, rows = Math.ceil(count / cols);
  const out = new Img(cols * 64, rows * 32);
  for (let i = 0; i < count; i++) {
    const ox = (i % cols) * 64, oy = Math.floor(i / cols) * 32;
    for (let py = 0; py < 32; py++) for (let px = 0; px < 64; px++) {
      const sx = px - 32 + 0.5, sy = py + 0.5;
      const u = sy + sx / 2, v = sy - sx / 2;
      if (u < 0 || v < 0 || u >= T || v >= T) continue;
      const c = S(i, u, v);
      if (c[3]) out.set(ox + px, oy + py, c);
    }
  }
  return out;
}

/**
 * Một khối isometric chiếm 1 ô: mặt trên (ô thoi lấy từ ô `top`), mặt nam (trái dưới) và mặt đông (phải dưới)
 * lấy theo hàm màu face(u, h01) (u: 0..31 dọc cạnh, h01: 0 = đỉnh .. 1 = chân). Ảnh 64 x (32 + h), đỉnh trên ở (32, 0).
 */
function isoBlock(S, topIdx, h, face) {
  const img = new Img(64, 32 + h);
  // mặt nam: từ đỉnh trái (0,16) xuống đỉnh dưới (32,32), kéo xuống h
  for (let u = 0; u < 32; u++) {
    const x = u, y0 = 16 + u / 2;
    for (let k = 0; k < h + 1; k++) img.set(x, Math.round(y0 + k), face(u, k / h, 'south'));
  }
  // mặt đông: từ đỉnh dưới (32,32) lên đỉnh phải (64,16), tối hơn
  for (let u = 0; u < 32; u++) {
    const x = 32 + u, y0 = 32 - u / 2;
    for (let k = 0; k < h + 1; k++) img.set(x, Math.round(y0 + k), face(u, k / h, 'east'));
  }
  // mặt trên
  for (let py = 0; py < 32; py++) for (let px = 0; px < 64; px++) {
    const sx = px - 32 + 0.5, sy = py + 0.5, u = sy + sx / 2, v = sy - sx / 2;
    if (u < 0 || v < 0 || u >= T || v >= T) continue;
    img.set(px, py, S(topIdx, u, v));
  }
  return img;
}

/**
 * Khối tường: cao (WALL_H) và thấp (LOW_H), mặt tường = vữa xám xanh phía trên + ốp chân tường sẫm phía dưới,
 * mặt đông tối hơn; lan can (đường ven vịnh). Trả về ảnh 3 khung xếp ngang, mỗi khung 64 x (32 + WALL_H).
 */
export function isoWalls(tileset, idx) {
  const S = sampler(tileset);
  const wall = (u, h01, side) => {
    // lấy màu từ ô tường cao 2 ô (nửa trên + nửa dưới) theo độ cao
    const v = h01 * 64;
    const c = v < 32 ? S(idx.wall_upper, u, v) : S(idx.wall_lower, u, v - 32);
    const hex = `#${c.slice(0, 3).map(n => n.toString(16).padStart(2, '0')).join('')}`;
    return side === 'east' ? shade(hex, -0.35) : hex;
  };
  const tall = isoBlock(S, idx.wall_top, WALL_H, wall);
  const low = isoBlock(S, idx.wall_top, LOW_H, (u, h01, side) => wall(u, 0.85 + h01 * 0.15, side));
  const rail = new Img(64, 32 + WALL_H);
  // lan can: hai thanh ngang chạy theo cạnh nam của ô + cột
  for (let u = 0; u < 32; u++) {
    const x = u, y = WALL_H + 16 + u / 2;
    for (const dy of [-22, -12]) rail.set(x, Math.round(y + dy), '#c9d1dc');
    if (u % 10 === 0) for (let k = -24; k <= 0; k++) rail.set(x, Math.round(y + k), '#8e97a8');
  }
  const out = new Img(64 * 3, 32 + WALL_H);
  [tall, low].forEach((im, i) => out.blit(im, 0, 0, im.w, im.h, i * 64, 32 + WALL_H - im.h));
  out.blit(rail, 0, 0, 64, rail.h, 128, 0);
  return out;
}
