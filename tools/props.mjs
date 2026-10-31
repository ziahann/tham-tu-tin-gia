// Đạo cụ (props): đồ vật và tòa nhà kích thước tự do, vẽ bằng code theo thước tỉ lệ người 32x48 ≈ 1,7 m
// (1 ô 32 px ≈ 1,1 m). Mỗi prop: kích thước ảnh, chân đế va chạm (tính từ đáy), đèn ban đêm, chỗ gắn biển chữ.
// gen-assets ghép tất cả vào atlas assets/props/props.png (+ props.json cho Phaser, props_meta.json cho game).
import { Img } from './png.mjs';
import { shade } from './characters.mjs';

const OUT = '#0b0f18';

/** Bộ cọ vẽ trên một ảnh: hình chữ nhật, elip, chuyển màu dọc, nhiễu, viền ngoài. */
function brush(img) {
  const R = (x, y, w, h, c) => img.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), c);
  const E = (cx, cy, rx, ry, c) => img.ellipse(Math.round(cx), Math.round(cy), Math.round(rx), Math.round(ry), c);
  const G = (x, y, w, h, c1, c2) => { for (let j = 0; j < h; j++) R(x, y + j, w, 1, mix(c1, c2, h > 1 ? j / (h - 1) : 0)); };
  const F = (x, y, w, h, c) => img.frame(Math.round(x), Math.round(y), Math.round(w), Math.round(h), c);
  return { R, E, G, F };
}

/** Trộn hai màu hex theo t (0..1). */
function mix(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** Thêm viền tối 1px quanh phần đặc (đồ vật trong nhà, xe, cây). */
function outline(img) {
  const out = new Img(img.w, img.h);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    if (img.get(x, y)[3] > 200) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < img.w && ny < img.h && img.get(nx, ny)[3] > 200; })) out.set(x, y, OUT);
  }
  out.blit(img, 0, 0, img.w, img.h, 0, 0);
  return out;
}

/**
 * Đẩy khối giả 3D cho một đồ vật vẽ chính diện: mỗi điểm đặc được kéo lùi theo hướng (+1, -1) thêm s px.
 * Điểm ở mép trên thành mặt trên (sáng hơn), điểm ở mép phải thành mặt hông (tối hơn); phần giữa bị mặt trước che.
 * Bỏ qua điểm bán trong suốt (bóng đổ). Trả về ảnh mới rộng / cao thêm s, mặt trước nằm ở đáy trái.
 */
function extrude(src, s, fromY = 0) {
  const out = new Img(src.w + s, src.h + s);
  // chỉ đẩy khối phần thân từ hàng fromY trở xuống (đồ đặt trên mặt bàn giữ nguyên)
  const solid = (x, y) => x >= 0 && y >= fromY && x < src.w && y < src.h && src.get(x, y)[3] > 200;
  const isOut = c => c[0] === 11 && c[1] === 15 && c[2] === 24; // màu viền OUT
  const hex = c => `#${c.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('')}`;
  for (let k = s; k >= 1; k--) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      if (!solid(x, y)) continue;
      const top = !solid(x, y - 1), right = !solid(x + 1, y);
      if (!top && !right) continue;
      // màu lấy từ điểm bên trong nếu đang là viền
      let c = src.get(x, y);
      if (isOut(c)) c = top && solid(x, y + 1) ? src.get(x, y + 1) : solid(x - 1, y) ? src.get(x - 1, y) : c;
      if (isOut(c)) continue;
      const col = top ? shade(hex(c), k === s ? 0.18 : 0.06) : shade(hex(c), -0.42);
      out.set(x + k, y + s - k, col);
    }
  }
  out.blit(src, 0, 0, src.w, src.h, 0, s);
  return outline(out);
}

/** Cắt xiên ảnh cho nằm trên mặt tường isometric: cột u hạ xuống u/2 px. Ảnh cao thêm w/2. */
export function shearIso(src) {
  const out = new Img(src.w, src.h + Math.ceil(src.w / 2));
  for (let u = 0; u < src.w; u++) for (let v = 0; v < src.h; v++) {
    const c = src.get(u, v);
    if (c[3]) out.set(u, v + Math.floor(u / 2), c);
  }
  return out;
}

/** Đồ phẳng (thảm) nhìn từ trên → hình bình hành trên sàn isometric. Điểm (h, 0) của ảnh ứng với góc tây bắc. */
export function flatIso(src) {
  const W = src.w + src.h, H = Math.ceil(W / 2) + 1;
  const out = new Img(W, H);
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const a = Y + (X - src.h) / 2, b = Y - (X - src.h) / 2;
    if (a < 0 || b < 0 || a >= src.w || b >= src.h) continue;
    const c = src.get(Math.floor(a), Math.floor(b));
    if (c[3]) out.set(X, Y, c);
  }
  return out;
}

/** Bóng đổ mềm dưới chân đồ vật. */
const shadow = (img, cx, cy, rx, ry = 3) => img.ellipse(cx, cy, rx, ry, '#00000048');

let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ---------------------------------------------------------------- nội thất

/** Bàn làm việc 2 ô: màn hình, bàn phím, chồng giấy, đèn bàn, cốc. variant: 'pc' | 'papers' | 'lab'. */
function desk(variant) {
  const w = 72, h = 56, img = new Img(w, h), { R, E, G } = brush(img);
  shadow(img, 36, 53, 34);
  G(2, 22, 68, 8, '#5d6878', '#4a5363');      // mặt bàn (gỗ xám lạnh)
  R(2, 22, 68, 1, '#7a8698');
  R(2, 30, 68, 16, '#2e3440'); R(4, 32, 30, 12, '#363d4b'); R(17, 37, 4, 1, '#8e97a8');
  R(4, 46, 3, 8, '#1c2028'); R(65, 46, 3, 8, '#1c2028'); R(38, 46, 3, 8, '#1c2028');
  if (variant !== 'papers') {
    const n = variant === 'lab' ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const x = 8 + i * 24;
      R(x, 2, 22, 16, '#14171d'); G(x + 1, 3, 20, 13, '#3b6f9e', '#24476b');
      R(x + 2, 4, 9, 6, variant === 'lab' ? '#9fb3c8' : '#c9d9e8'); R(x + 12, 5, 7, 1, '#e6ebf2'); R(x + 12, 8, 5, 1, '#9fb3c8');
      R(x + 9, 18, 4, 4, '#14171d'); R(x + 6, 21, 10, 2, '#22262e');
    }
    R(10, 25, 18, 4, '#c9d1dc'); for (let k = 11; k < 27; k += 2) R(k, 26, 1, 2, '#8e97a8');
    R(31, 26, 4, 3, '#c9d1dc');
  }
  if (variant !== 'lab') {
    // chồng hồ sơ, đèn bàn, cốc
    R(40, 12, 14, 11, '#e9e4d6'); R(41, 10, 14, 11, '#f4f1e8'); R(42, 8, 13, 11, '#e0dccd'); R(44, 11, 8, 1, '#7a8698'); R(44, 13, 6, 1, '#7a8698'); R(43, 8, 3, 3, '#c8323c');
    R(62, 4, 2, 18, '#22262e'); R(56, 2, 10, 4, '#22262e'); R(57, 5, 8, 1, '#ffd28a');
    R(58, 24, 6, 5, '#e6ebf2'); R(59, 25, 4, 1, '#5a3e2c'); R(64, 25, 2, 2, '#e6ebf2');
  } else {
    R(54, 8, 12, 14, '#1c2028'); R(56, 10, 8, 4, '#2a3a4a'); R(57, 16, 2, 2, '#4aa35b'); R(61, 16, 2, 2, '#c8323c'); // máy quét
  }
  return outline(img);
}

/** Ghế văn phòng (nhìn từ phía trước bàn). */
function officeChair() {
  const img = new Img(28, 36), { R, E } = brush(img);
  shadow(img, 14, 33, 11);
  R(5, 2, 18, 16, '#2b303b'); R(7, 4, 14, 12, '#3a4150'); R(6, 18, 16, 6, '#2b303b');
  R(13, 24, 2, 6, '#1c2028'); R(5, 29, 18, 2, '#1c2028'); E(6, 32, 2, 1, '#1c2028'); E(22, 32, 2, 1, '#1c2028');
  return outline(img);
}

/** Tủ hồ sơ kim loại cao (1 ô x 2 ô). */
function cabinet() {
  const img = new Img(34, 68), { R, G } = brush(img);
  shadow(img, 17, 66, 15);
  G(2, 2, 30, 62, '#8e97a8', '#6b7486'); R(2, 2, 30, 2, '#b4bccb');
  for (let i = 0; i < 4; i++) { R(4, 6 + i * 15, 26, 13, '#7a8394'); R(4, 6 + i * 15, 26, 1, '#9aa3b4'); R(13, 11 + i * 15, 8, 2, '#2b2f3a'); R(6, 8 + i * 15, 7, 3, '#e9e4d6'); }
  return outline(img);
}

/** Kệ sách lớn 2 ô x 2,5 ô. */
function bookshelf() {
  const img = new Img(68, 84), { R } = brush(img);
  shadow(img, 34, 82, 32);
  R(2, 2, 64, 78, '#2a2f3a'); R(4, 4, 60, 74, '#3a4150');
  const cols = ['#7a2f38', '#2c4a6b', '#8a7a4a', '#3f5a4a', '#5b4a6b', '#9aa1b3', '#6b3a2a'];
  for (let s = 0; s < 4; s++) {
    const y = 6 + s * 18;
    R(4, y + 15, 60, 3, '#2a2f3a');
    for (let x = 6; x < 60;) { const bw = 3 + Math.floor(rnd() * 3), bh = 9 + Math.floor(rnd() * 5); R(x, y + 15 - bh, bw, bh, cols[Math.floor(rnd() * cols.length)]); R(x, y + 15 - bh, bw, 1, '#ffffff30'); x += bw + (rnd() < 0.15 ? 3 : 0); }
  }
  return outline(img);
}

/** Sofa 3 ô. */
function sofa() {
  const img = new Img(100, 52), { R, G } = brush(img);
  shadow(img, 50, 49, 48);
  G(2, 6, 96, 18, '#3b4a66', '#2c3850'); R(2, 6, 96, 2, '#5b6c8a');
  R(2, 24, 96, 20, '#33415c'); for (const x of [6, 36, 66]) { R(x, 22, 28, 14, '#3e4e6c'); R(x, 22, 28, 2, '#56688a'); }
  R(0, 10, 7, 36, '#2a354b'); R(93, 10, 7, 36, '#2a354b'); R(4, 44, 4, 6, '#1c2028'); R(92, 44, 4, 6, '#1c2028');
  return outline(img);
}

/** Bàn nước thấp 2 ô, có báo và cốc. */
function coffeeTable() {
  const img = new Img(68, 36), { R } = brush(img);
  shadow(img, 34, 33, 30);
  R(2, 8, 64, 14, '#3e4654'); R(2, 8, 64, 2, '#5d6878'); R(4, 22, 3, 10, '#1c2028'); R(61, 22, 3, 10, '#1c2028');
  R(10, 9, 18, 11, '#e9e4d6'); R(12, 11, 14, 1, '#2b2f3a'); R(12, 14, 10, 1, '#7a8698'); R(42, 11, 6, 6, '#e6ebf2'); R(43, 12, 4, 2, '#5a3e2c');
  return outline(img);
}

/** Giường đơn nhìn từ chân giường: đầu giường gỗ, nệm, chăn kẻ, gối (đẩy khối thành giường dài 2,5 ô). */
function bed() {
  const img = new Img(68, 40), { R, G } = brush(img);
  shadow(img, 34, 37, 32);
  R(2, 2, 64, 14, '#5a3e2c'); R(2, 2, 64, 2, '#7a5a40'); // đầu giường (nhô sau)
  G(4, 14, 60, 10, '#c9d1dc', '#a3adbf'); // gối + nệm
  R(10, 14, 20, 6, '#e8ecf2'); R(38, 14, 20, 6, '#e8ecf2');
  G(4, 22, 60, 10, '#3d6a98', '#2c4f74'); for (let x = 8; x < 64; x += 10) R(x, 22, 2, 10, '#5a88b8'); // chăn
  R(2, 30, 64, 6, '#5a3e2c'); R(4, 36, 4, 3, '#2b1d14'); R(60, 36, 4, 3, '#2b1d14');
  return outline(img);
}

/** Quầy lễ tân dài 5 ô, có biển nhỏ và màn hình. */
function reception() {
  const img = new Img(164, 60), { R, G } = brush(img);
  shadow(img, 82, 57, 80);
  G(2, 14, 160, 10, '#5d6878', '#4a5363'); R(2, 14, 160, 2, '#8e97a8');
  G(2, 24, 160, 30, '#2e3440', '#252a34'); for (let x = 10; x < 160; x += 20) R(x, 28, 1, 22, '#3a4150');
  R(60, 30, 44, 10, '#14171d'); R(62, 32, 40, 6, '#1d4a6b'); // dải đèn biển quầy
  R(20, 2, 22, 14, '#14171d'); R(21, 3, 20, 11, '#2c5a80'); R(120, 4, 18, 11, '#e9e4d6'); R(122, 6, 14, 1, '#7a8698');
  R(84, 8, 8, 6, '#e6ebf2');
  return outline(img);
}

/** Cây trong chậu: 'big' cao 1,9 ô, 'small' 1,2 ô. Thân và cuống lá mọc liền từ chậu, tán lá dày. */
function plant(big) {
  const w = big ? 40 : 28, h = big ? 62 : 40, img = new Img(w, h), { R, E } = brush(img);
  const cx = w / 2, potH = big ? 16 : 12, potW = big ? 18 : 14, potTop = h - 3 - potH;
  shadow(img, cx, h - 3, potW / 2 + 4);
  // cuống lá: từ miệng chậu toả lên
  const stems = big ? [[-12, 18], [-6, 30], [0, 38], [7, 30], [13, 20]] : [[-8, 12], [0, 20], [8, 13]];
  for (const [dx, up] of stems) for (let i = 0; i <= up; i++) R(cx + Math.round(dx * i / up), potTop - i, 2, 1, '#2a4a3a');
  // lá: các phiến dài nghiêng theo cuống, sẫm ở dưới, sáng ở trên
  const leaf = (x, y, rx, ry, c) => E(x, y, rx, ry, c);
  for (const [dx, up] of stems) {
    const x = cx + dx, y = potTop - up;
    leaf(x, y + 3, big ? 8 : 6, big ? 5 : 4, '#24443a');
    leaf(x - 1, y + 1, big ? 7 : 5, big ? 4 : 3, '#2f5a48');
    leaf(x - 2, y, big ? 3 : 2, 2, '#3f7058');
  }
  if (big) { leaf(cx - 7, potTop - 8, 7, 4, '#2f5a48'); leaf(cx + 8, potTop - 6, 7, 4, '#2a5040'); leaf(cx, potTop - 20, 6, 4, '#2f5a48'); }
  leaf(cx, potTop - 2, potW / 2 + 1, 3, '#24443a');
  // chậu gốm xám, có vành
  R(cx - potW / 2, potTop, potW, potH, '#3a3f4d'); R(cx - potW / 2 - 1, potTop, potW + 2, 3, '#4a5060');
  R(cx - potW / 2 + 2, potTop + 4, 2, potH - 6, '#4a5060'); R(cx - potW / 2 + 1, h - 5, potW - 2, 2, '#2b2f3a');
  return outline(img);
}

/** Bình nước, máy in, đèn cây, thùng rác. */
function waterCooler() {
  const img = new Img(26, 58), { R, G } = brush(img);
  shadow(img, 13, 55, 10);
  R(4, 24, 18, 30, '#c9d1dc'); R(5, 26, 16, 6, '#e6ebf2'); R(8, 34, 3, 3, '#3d7fd1'); R(15, 34, 3, 3, '#c8323c');
  G(5, 4, 16, 20, '#9ccbe6', '#6aa0c4'); R(7, 6, 4, 16, '#c4e2f4'); R(9, 1, 8, 4, '#3d6ea6');
  return outline(img);
}
function printer() {
  const img = new Img(52, 52), { R } = brush(img);
  shadow(img, 26, 49, 24);
  R(4, 18, 44, 30, '#3a4150'); R(6, 20, 40, 12, '#c9d1dc'); R(10, 10, 32, 9, '#e9e4d6'); R(12, 6, 28, 5, '#f4f1e8');
  R(10, 36, 32, 3, '#14171d'); R(38, 24, 5, 3, '#4aa35b'); R(6, 42, 40, 4, '#2b303b');
  return outline(img);
}
function floorLamp() {
  const img = new Img(24, 70), { R, E } = brush(img);
  shadow(img, 12, 67, 8);
  R(11, 18, 2, 48, '#22262e'); R(5, 64, 14, 3, '#22262e');
  R(3, 2, 18, 16, '#d9c08a'); R(4, 3, 16, 14, '#f2dc9e'); R(5, 17, 14, 1, '#b08a3a');
  return outline(img);
}
function trashBin() {
  const img = new Img(20, 26), { R } = brush(img);
  shadow(img, 10, 24, 7);
  R(3, 6, 14, 17, '#4a5060'); R(2, 4, 16, 3, '#5b6170'); R(6, 8, 1, 13, '#3a3f4d'); R(13, 8, 1, 13, '#3a3f4d'); R(7, 1, 6, 4, '#e9e4d6');
  return outline(img);
}
function filingBoxes() {
  const img = new Img(50, 44), { R } = brush(img);
  shadow(img, 25, 41, 23);
  const box = (x, y, w, h) => { R(x, y, w, h, '#8a7458'); R(x, y, w, 3, '#a68d6c'); R(x + w / 2 - 5, y + 6, 10, 5, '#e9e4d6'); R(x + 2, y + h - 2, w - 4, 1, '#6b5a44'); };
  box(2, 22, 22, 18); box(25, 24, 22, 16); box(10, 5, 24, 18);
  return outline(img);
}

/** Bàn họp dài với ghế hai bên (4 ô x 2 ô). */
function meetingTable() {
  const img = new Img(136, 76), { R, E } = brush(img);
  shadow(img, 68, 72, 64, 4);
  for (const x of [18, 50, 82, 112]) { R(x - 7, 2, 14, 14, '#2b303b'); R(x - 5, 4, 10, 8, '#3a4150'); }
  R(4, 16, 128, 34, '#3e4654'); R(4, 16, 128, 3, '#5d6878'); R(6, 50, 124, 6, '#2e3440');
  for (const x of [16, 48, 80, 110]) { R(x, 22, 14, 10, '#e9e4d6'); R(x + 2, 24, 10, 1, '#7a8698'); }
  E(68, 33, 6, 4, '#14171d');
  for (const x of [18, 50, 82, 112]) { R(x - 7, 56, 14, 14, '#2b303b'); R(x - 5, 58, 10, 8, '#3a4150'); }
  return outline(img);
}

/** Bảng ghim (tường bằng chứng) 2 ô: standing = có chân đứng; mặc định treo tường (không lấn ra lối đi). */
function corkBoard(standing = false) {
  const img = new Img(72, standing ? 76 : 62), { R } = brush(img);
  if (standing) { shadow(img, 36, 73, 30); R(8, 60, 3, 14, '#22262e'); R(61, 60, 3, 14, '#22262e'); }
  R(2, 2, 68, 60, '#3a3026'); R(5, 5, 62, 54, '#8a6a48');
  const notes = [[9, 9, '#e9e4d6'], [28, 8, '#9fb3c8'], [48, 11, '#e9e4d6'], [12, 32, '#f2d36b'], [34, 34, '#e9e4d6'], [52, 36, '#c9d1dc']];
  notes.forEach(([x, y, c]) => { R(x, y, 13, 11, c); R(x + 2, y + 4, 9, 1, '#5b5d6e'); R(x + 2, y + 7, 6, 1, '#5b5d6e'); R(x + 6, y, 2, 2, '#c8323c'); });
  for (let i = 0; i < 26; i++) { R(15 + i, 15 + Math.round(i * 0.75), 1, 1, '#c8323c'); R(36 + i * 0.6, 14 + i, 1, 1, '#c8323c'); }
  return outline(img);
}

/** Kệ lưu trữ cao 3 ô x 2,6 ô với hộp hồ sơ, cuộn báo. */
function archiveShelf() {
  const img = new Img(100, 88), { R } = brush(img);
  shadow(img, 50, 86, 48);
  R(2, 2, 96, 82, '#2a2f3a'); R(4, 4, 92, 78, '#353b48');
  for (let s = 0; s < 4; s++) {
    const y = 6 + s * 19;
    R(4, y + 16, 92, 3, '#22262e');
    for (let x = 6; x < 92; x += 12) { if (rnd() < 0.15) continue; R(x, y + 3, 10, 13, rnd() < 0.5 ? '#8a7458' : '#6b6a5a'); R(x + 2, y + 6, 6, 3, '#e9e4d6'); }
  }
  return outline(img);
}

/** Màn hình TV lớn treo tường (prop phẳng trên tường). */
function tvWall() {
  const img = new Img(76, 46), { R, G } = brush(img);
  R(2, 2, 72, 42, '#0e1015'); G(4, 4, 68, 34, '#2c3a55', '#1d2a40');
  R(4, 30, 68, 8, '#9b2630'); R(8, 32, 30, 2, '#f4eedc'); R(8, 35, 20, 1, '#e6c0c0');
  R(8, 8, 26, 18, '#7a8ea6'); R(38, 9, 28, 2, '#e6ebf2'); R(38, 14, 22, 1, '#9fb3c8'); R(38, 18, 25, 1, '#9fb3c8');
  return img;
}

/** Cửa sổ có rèm lá sách, cao 1,7 ô (prop phẳng trên tường). lit: có ánh đèn đường hắt vào. */
function blindsWindow() {
  const img = new Img(52, 56), { R, G } = brush(img);
  R(0, 0, 52, 56, '#8e97a8'); G(3, 3, 46, 50, '#16233a', '#0f1828');
  for (let y = 5; y < 52; y += 4) R(3, y, 46, 2, '#aab3c2');
  R(25, 3, 2, 50, '#8e97a8'); R(0, 52, 52, 4, '#b4bccb');
  return img;
}

/** Bảng trắng treo tường. */
function whiteboard() {
  const img = new Img(76, 44), { R, F } = brush(img);
  R(0, 0, 76, 40, '#8e97a8'); R(2, 2, 72, 36, '#eef1f5');
  R(6, 7, 26, 2, '#3d5a98'); R(6, 13, 34, 2, '#3d5a98'); R(6, 19, 18, 2, '#4aa35b'); F(46, 8, 22, 16, '#c8323c'); R(50, 14, 14, 2, '#c8323c');
  R(6, 26, 30, 1, '#5b5d6e'); R(6, 30, 22, 1, '#5b5d6e'); R(8, 40, 60, 3, '#5b6170');
  return img;
}

/** Đồng hồ, áp phích treo tường. */
function wallClock() {
  const img = new Img(22, 22), { R, E } = brush(img);
  E(11, 11, 10, 10, '#22262e'); E(11, 11, 8, 8, '#eef1f5'); R(11, 4, 1, 8, '#22262e'); R(11, 11, 5, 1, '#c8323c');
  return img;
}
function poster(color) {
  const img = new Img(30, 40), { R } = brush(img);
  R(0, 0, 30, 40, '#22262e'); R(2, 2, 26, 36, '#e9e4d6'); R(4, 4, 22, 14, color); R(5, 22, 20, 2, '#2b2f3a'); R(5, 27, 16, 1, '#5b5d6e'); R(5, 30, 18, 1, '#5b5d6e'); R(5, 34, 10, 2, '#c8323c');
  return img;
}

/** Cửa thang máy (2 cánh thép) cao 2,4 ô, có bảng số tầng phía trên. */
function elevator() {
  const img = new Img(76, 84), { R, G } = brush(img);
  R(0, 0, 76, 84, '#5b6170'); R(2, 2, 72, 80, '#3a4150');
  R(22, 4, 32, 10, '#0e1015'); R(25, 6, 8, 6, '#ff9a3a'); R(36, 7, 4, 4, '#ff9a3a'); R(44, 6, 7, 6, '#7a8698');
  G(8, 16, 29, 66, '#b4bccb', '#7a8394'); G(39, 16, 29, 66, '#aab3c2', '#6f7889');
  R(37, 16, 2, 66, '#22262e'); R(12, 20, 2, 58, '#d8dee8'); R(43, 20, 2, 58, '#d0d6e0');
  R(66, 44, 6, 12, '#22262e'); R(68, 46, 2, 2, '#ffd28a'); R(68, 51, 2, 2, '#7a8698');
  return img;
}

/** Thảm lớn (phẳng, dưới chân nhân vật). */
function rug(w, h, c1, c2) {
  const img = new Img(w, h), { R, F } = brush(img);
  R(0, 0, w, h, c1); F(3, 3, w - 6, h - 6, c2); F(6, 6, w - 12, h - 12, shade(c1, 0.15));
  for (let i = 0; i < w * h / 40; i++) img.set(Math.floor(rnd() * w), Math.floor(rnd() * h), shade(c1, (rnd() - 0.5) * 0.2));
  return img;
}

/** Bàn tròn quán cà phê + 2 ghế. */
function cafeTable() {
  const img = new Img(60, 44), { R, E } = brush(img);
  shadow(img, 30, 41, 26);
  for (const x of [6, 48]) { R(x, 12, 8, 18, '#3a3026'); R(x - 1, 26, 10, 4, '#4a3c2e'); R(x + 1, 30, 2, 10, '#22262e'); R(x + 5, 30, 2, 10, '#22262e'); }
  E(30, 18, 15, 8, '#4a3c2e'); E(30, 16, 14, 7, '#6b5642'); R(28, 24, 4, 14, '#22262e'); R(22, 37, 16, 2, '#22262e');
  R(23, 12, 5, 4, '#e6ebf2'); R(24, 13, 3, 1, '#5a3e2c'); R(33, 14, 5, 4, '#e6ebf2');
  return outline(img);
}

/** Quầy pha chế dài 4 ô: máy pha, cốc, tủ bánh có đèn. */
function cafeCounter() {
  const img = new Img(132, 64), { R, G } = brush(img);
  shadow(img, 66, 61, 64);
  R(2, 22, 128, 6, '#6b5642'); R(2, 22, 128, 1, '#8a7056'); G(2, 28, 128, 30, '#3a3026', '#2b241d');
  for (let x = 8; x < 128; x += 16) R(x, 32, 10, 22, '#43372b');
  R(10, 2, 26, 20, '#2b303b'); R(13, 5, 20, 7, '#c9d1dc'); R(16, 14, 3, 6, '#14171d'); R(26, 14, 3, 6, '#14171d');
  R(48, 6, 40, 16, '#1c2028'); G(50, 8, 36, 12, '#f2c46b', '#d89a3a'); for (const x of [53, 63, 73]) { R(x, 13, 7, 5, '#8a5a3a'); R(x, 13, 7, 1, '#f4e0c0'); }
  R(98, 14, 6, 8, '#e6ebf2'); R(106, 15, 6, 7, '#e6ebf2'); R(116, 10, 10, 12, '#4a5060');
  return outline(img);
}

// ---------------------------------------------------------------- thiết bị Phòng xác minh (đúng tỉ lệ)

function device(kind) {
  const W = { computer: 72, magnifier: 72, detector: 40, archive: 56, monitor: 100, timeline: 136, evidence: 72 }[kind];
  const H = { computer: 60, magnifier: 60, detector: 72, archive: 64, monitor: 70, timeline: 62, evidence: 62 }[kind];
  if (kind === 'evidence') return corkBoard();
  const img = new Img(W, H), { R, E, G } = brush(img);
  if (kind !== 'timeline') shadow(img, W / 2, H - 3, W / 2 - 3);
  if (kind === 'computer') {
    return desk('lab');
  } else if (kind === 'magnifier') {
    R(2, 28, 68, 18, '#3a4150'); G(4, 30, 64, 12, '#fff6d6', '#e8d9a8'); R(8, 32, 22, 8, '#c9d9e8'); R(36, 31, 26, 9, '#c9d9e8');
    R(6, 46, 4, 12, '#22262e'); R(62, 46, 4, 12, '#22262e');
    R(54, 2, 3, 28, '#22262e'); R(40, 2, 16, 3, '#22262e'); E(38, 12, 10, 10, '#22262e'); E(38, 12, 8, 8, '#bfe6ff'); R(35, 8, 3, 2, '#ffffff');
  } else if (kind === 'detector') {
    G(2, 2, 36, 66, '#5b6170', '#3a4150'); R(4, 4, 32, 2, '#7a8698');
    R(6, 8, 28, 20, '#0e1015'); E(20, 22, 11, 11, '#e6ebf2'); R(8, 22, 24, 7, '#0e1015');
    for (let i = 0; i < 8; i++) R(20 + Math.round(i * 0.8), 21 - i, 1, 1, '#c8323c');
    R(6, 32, 8, 5, '#4aa35b'); R(16, 32, 8, 5, '#f2d36b'); R(26, 32, 8, 5, '#c8323c');
    R(6, 42, 28, 18, '#0e1015'); for (let x = 8; x < 32; x += 4) { const hh = 4 + Math.floor(rnd() * 12); R(x, 58 - hh, 2, hh, '#7fe3ff'); }
  } else if (kind === 'archive') {
    R(4, 30, 48, 30, '#4a3c2e'); R(6, 32, 44, 26, '#5b4a3a'); R(8, 38, 40, 3, '#3a3026'); R(8, 48, 40, 3, '#3a3026');
    R(6, 2, 40, 28, '#22262e'); R(8, 4, 36, 22, '#e9e4d6'); for (let y = 7; y < 24; y += 3) R(11, y, 30, 1, '#8a7a62');
    E(50, 14, 4, 9, '#0e1015'); R(48, 10, 3, 8, '#5b5d6e');
  } else if (kind === 'monitor') {
    R(2, 2, 96, 50, '#0e1015');
    [[4, 4, '#2c4a6b'], [36, 4, '#24585a'], [68, 4, '#2c4a6b'], [4, 28, '#4a3f6b'], [36, 28, '#2c4a6b'], [68, 28, '#6b2a30']].forEach(([x, y, c]) => {
      R(x, y, 28, 22, c); R(x + 2, y + 2, 24, 3, '#e6ebf2'); R(x + 2, y + 7, 18, 7, '#9fb3c8'); R(x + 2, y + 16, 12, 1, '#e6ebf2'); R(x + 20, y + 18, 5, 2, '#f2d36b');
    });
    R(44, 52, 12, 10, '#22262e'); R(30, 62, 40, 4, '#3a4150');
  } else if (kind === 'timeline') {
    R(2, 2, 132, 58, '#5b6170'); R(4, 4, 128, 54, '#eef1f5'); R(4, 30, 128, 2, '#22262e');
    [[8, 8], [36, 36], [64, 8], [92, 36], [116, 8]].forEach(([x, y], i) => { R(x, y, 18, 18, ['#f2d36b', '#9fd8ff', '#f2d36b', '#f4b6c2', '#c9d1dc'][i]); R(x + 2, y + 5, 14, 1, '#5b5d6e'); R(x + 2, y + 9, 10, 1, '#5b5d6e'); R(x + 8, 30, 2, 2, '#c8323c'); });
  }
  return outline(img);
}

// ---------------------------------------------------------------- ngoài trời

/** Cây xanh (tán tối, lạnh). big: 3 ô x 4 ô. Thân mọc liền lên tán, có nhánh và gốc loe. */
function tree(big) {
  const w = big ? 96 : 64, h = big ? 128 : 92, img = new Img(w, h), { R, E } = brush(img);
  // bóng đổ chéo sang phải (nắng từ trên trái)
  img.ellipse(w / 2 + 8, h - 4, w / 2 - 8, 5, '#00000040'); img.ellipse(w / 2 + 2, h - 4, w / 4, 3, '#00000030');
  const cx = w / 2, cy = big ? 46 : 34, rx = big ? 40 : 26, ry = big ? 36 : 27, tw = big ? 10 : 7;
  // thân: từ giữa tán xuống đất, gốc loe, vài nhánh chĩa vào tán
  R(cx - tw / 2, cy, tw, h - 6 - cy, '#3a3026'); R(cx - tw / 2, cy, 3, h - 6 - cy, '#4a3c2e'); R(cx + tw / 2 - 2, cy, 2, h - 6 - cy, '#2b241d');
  R(cx - tw / 2 - 3, h - 10, tw + 6, 4, '#3a3026'); R(cx - tw / 2 - 5, h - 7, tw + 10, 2, '#2b241d');
  for (let i = 0; i < (big ? 14 : 9); i++) { R(cx - 2 - i, cy + 6 - i, 3, 2, '#3a3026'); R(cx + i, cy + 2 - i, 3, 2, '#3a3026'); }
  // tán: các khối tròn chồng lên nhau, sáng ở trên trái
  const blobs = big
    ? [[0, 6, 30, 22], [-22, 0, 22, 18], [22, 2, 22, 18], [-12, -16, 22, 17], [14, -14, 22, 17], [0, -24, 18, 13], [-28, 12, 14, 11], [28, 12, 14, 11]]
    : [[0, 4, 20, 15], [-14, 0, 14, 12], [14, 1, 14, 12], [-6, -12, 15, 12], [8, -11, 14, 11]];
  for (const [dx, dy, bx, by] of blobs) E(cx + dx, cy + dy, bx, by, '#1f3a33');
  for (const [dx, dy, bx, by] of blobs) E(cx + dx - 2, cy + dy - 3, bx - 4, by - 4, '#26463c');
  for (const [dx, dy, bx, by] of blobs.slice(3)) E(cx + dx - 4, cy + dy - 5, bx * 0.5, by * 0.45, '#2f5446');
  for (let i = 0; i < (big ? 10 : 6); i++) E(cx - rx * 0.5 + rnd() * rx * 0.7, cy - ry * 0.6 + rnd() * ry * 0.5, 4, 3, '#3a6455');
  return outline(img);
}

/** Đèn đường cao 3,5 ô. */
function streetLamp() {
  const img = new Img(40, 116), { R, E } = brush(img);
  img.ellipse(18, 113, 14, 3, '#00000040'); // bóng đổ chéo
  R(10, 14, 4, 98, '#2b303b'); R(11, 14, 1, 98, '#4a5060'); R(6, 108, 12, 6, '#22262e');
  R(12, 12, 22, 3, '#2b303b'); R(26, 10, 12, 7, '#22262e'); R(27, 16, 10, 3, '#ffe2a0');
  return outline(img);
}

/** Ghế đá công viên 2 ô. */
function bench() {
  const img = new Img(68, 40), { R } = brush(img);
  shadow(img, 34, 37, 30);
  R(4, 6, 60, 5, '#4a3c2e'); R(4, 12, 60, 5, '#5b4a3a'); R(4, 20, 60, 6, '#5b4a3a'); R(4, 20, 60, 1, '#6b5a48');
  R(8, 6, 4, 28, '#22262e'); R(56, 6, 4, 28, '#22262e');
  return outline(img);
}

/** Sạp báo 2 ô x 2,6 ô. */
function kiosk() {
  const img = new Img(72, 88), { R, G } = brush(img);
  shadow(img, 36, 85, 34);
  R(2, 4, 68, 12, '#24585a'); for (let x = 2; x < 70; x += 8) R(x, 16, 4, 3, '#24585a'); R(2, 4, 68, 2, '#3a7a7c');
  R(6, 20, 60, 62, '#3a3026'); R(8, 22, 56, 26, '#22201c');
  [[10, 24, '#e9e4d6'], [22, 24, '#d8d2c2'], [34, 24, '#9b2630'], [46, 24, '#c9a24a'], [10, 36, '#e9e4d6'], [24, 36, '#9fb3c8'], [40, 36, '#e9e4d6']].forEach(([x, y, c]) => { R(x, y, 10, 10, c); R(x + 1, y + 2, 8, 1, '#2b2f3a'); R(x + 1, y + 5, 6, 1, '#7a8698'); });
  R(8, 50, 56, 4, '#5b4a3a'); for (let x = 10; x < 62; x += 9) { R(x, 55, 7, 22, '#e9e4d6'); R(x + 1, 58, 5, 1, '#2b2f3a'); }
  return outline(img);
}

/** Trạm xe buýt 3 ô x 2,5 ô. */
function busStop() {
  const img = new Img(100, 80), { R } = brush(img);
  shadow(img, 50, 77, 46);
  R(2, 4, 96, 6, '#2b303b'); R(6, 10, 3, 66, '#2b303b'); R(91, 10, 3, 66, '#2b303b');
  R(10, 10, 80, 40, '#9fb3c840'); R(12, 14, 26, 32, '#2c4a6b'); R(14, 16, 22, 4, '#e9e4d6'); R(14, 24, 18, 1, '#9fb3c8');
  R(14, 58, 72, 5, '#5b4a3a'); R(16, 63, 3, 12, '#22262e'); R(81, 63, 3, 12, '#22262e');
  R(88, 0, 10, 10, '#24585a'); R(90, 3, 6, 2, '#e9e4d6');
  return outline(img);
}

/** Đồ nhỏ ngoài phố: thùng rác, trụ nước, cọc chắn, bồn hoa. */
function streetBin() { const img = new Img(24, 36), { R } = brush(img); shadow(img, 12, 33, 9); R(4, 10, 16, 22, '#2a4a40'); R(3, 7, 18, 4, '#355a4e'); R(7, 14, 10, 2, '#4a7a6a'); R(9, 4, 6, 3, '#355a4e'); return outline(img); }
function hydrant() { const img = new Img(22, 30), { R } = brush(img); shadow(img, 11, 27, 7); R(6, 8, 10, 18, '#8a2a30'); R(5, 6, 12, 3, '#6e2026'); R(2, 13, 4, 5, '#6e2026'); R(16, 13, 4, 5, '#6e2026'); R(8, 3, 6, 3, '#6e2026'); return outline(img); }
/** Rào chắn thi công: thanh sọc đỏ trắng trên hai chân, đèn vàng nhấp nháy. */
function barrier() {
  const img = new Img(32, 36), { R } = brush(img);
  shadow(img, 16, 33, 13);
  R(4, 14, 3, 19, '#3a4150'); R(25, 14, 3, 19, '#3a4150'); R(2, 30, 7, 3, '#2b303b'); R(23, 30, 7, 3, '#2b303b');
  for (let x = 1; x < 31; x++) for (let y = 10; y < 19; y++) img.set(x, y, Math.floor((x + y) / 4) % 2 ? '#e8ecf2' : '#c8323c');
  R(1, 22, 30, 3, '#c9a24a');
  R(14, 5, 4, 5, '#f2a83a'); R(15, 4, 2, 1, '#ffd28a');
  return outline(img);
}
/** Rào thi công chạy dọc trục bắc–nam (chặn ngang vỉa hè): ảnh mặt cắt hẹp, isoExtrude kéo dài thành tấm rào sọc. */
function barrierNS() {
  const img = new Img(6, 30), { R } = brush(img);
  for (let y = 0; y < 18; y++) R(0, y, 6, 1, Math.floor(y / 3) % 2 ? '#e8ecf2' : '#c8323c');
  R(0, 18, 6, 3, '#c9a24a'); R(0, 21, 6, 9, '#3a4150');
  return img;
}
/** Phao cứu sinh treo trên cột (bến tàu). */
function lifeRing() {
  const img = new Img(20, 40), { R, E } = brush(img);
  shadow(img, 10, 37, 7);
  R(9, 8, 3, 30, '#3a4150'); R(5, 36, 11, 2, '#2b303b');
  for (let y = 5; y <= 23; y++) for (let x = 1; x <= 19; x++) { const d = Math.hypot(x - 10, y - 14); if (d >= 4.5 && d <= 8.5) img.set(x, y, d < 6 ? '#b84c1c' : '#e0662a'); }
  R(2, 13, 3, 2, '#e8ecf2'); R(16, 13, 3, 2, '#e8ecf2'); R(9, 6, 3, 2, '#e8ecf2'); R(9, 21, 3, 2, '#e8ecf2');
  R(9, 8, 3, 2, '#3a4150');
  return outline(img);
}
/** Tờ giấy rơi trên đất (manh mối đánh lừa): hình nhìn từ trên, nằm phẳng. */
function flyer() {
  const img = new Img(22, 16), { R } = brush(img);
  R(0, 0, 22, 16, '#d8d2c0'); R(2, 2, 12, 2, '#8a2a30'); R(2, 6, 18, 1, '#6b7280'); R(2, 9, 16, 1, '#6b7280'); R(2, 12, 10, 1, '#6b7280'); R(16, 2, 4, 3, '#3a4150');
  return img;
}
function bollard() { const img = new Img(14, 28), { R } = brush(img); shadow(img, 7, 25, 5); R(3, 6, 8, 18, '#2b303b'); R(3, 9, 8, 2, '#c9a24a'); R(2, 3, 10, 4, '#3a4150'); return outline(img); }
function planter() {
  const img = new Img(68, 40), { R, E } = brush(img);
  shadow(img, 34, 37, 30);
  R(2, 16, 64, 20, '#4a5060'); R(2, 16, 64, 2, '#6b7686');
  for (let i = 0; i < 9; i++) E(8 + i * 6.5, 14 - (i % 2) * 3, 6, 5, i % 2 ? '#26463c' : '#2d5246');
  [[14, 9], [30, 7], [48, 10]].forEach(([x, y]) => R(x, y, 3, 3, '#9b5a7a'));
  return outline(img);
}

/** Sạp chợ có dù 2,5 ô x 2,4 ô. */
function marketStall() {
  const img = new Img(84, 80), { R } = brush(img);
  shadow(img, 42, 77, 38);
  for (let x = 2; x < 82; x += 10) { R(x, 4, 5, 16, '#7a4a2a'); R(x + 5, 4, 5, 16, '#c9c2b4'); }
  R(2, 20, 80, 3, '#5b3a22'); R(40, 23, 3, 26, '#22262e');
  R(4, 48, 76, 8, '#4a3c2e'); R(6, 56, 3, 20, '#2b241d'); R(75, 56, 3, 20, '#2b241d');
  [[8, 42, '#b08a2a'], [20, 41, '#8a2a30'], [32, 42, '#3f6a3a'], [48, 41, '#b06a2a'], [62, 42, '#b08a2a']].forEach(([x, y, c]) => { R(x, y, 10, 7, c); R(x + 1, y, 8, 1, shade(c, 0.3)); });
  return outline(img);
}

/** Tàu tham quan neo ở bến (cảnh bình thường) 10 ô x 3,6 ô, mũi hướng phải. */
function tourBoat() {
  const img = new Img(320, 116), { R, E, G } = brush(img);
  E(160, 104, 150, 8, '#0b1a2a80');
  // thân tàu
  for (let y = 70; y < 104; y++) {
    const inset = Math.max(0, Math.round((y - 70) * 0.6));
    R(10 + inset, y, 290 - inset * 2 + (y < 88 ? 14 : 0), 1, y < 78 ? '#e6ebf2' : y < 96 ? '#c9d1dc' : '#7a8394');
  }
  R(10, 78, 300, 3, '#3a5a80'); R(300, 70, 12, 14, '#e6ebf2');
  // hai tầng cabin
  G(40, 34, 230, 36, '#eef1f5', '#c9d1dc'); R(40, 34, 230, 3, '#ffffff');
  for (let x = 50; x < 260; x += 22) { R(x, 42, 16, 14, '#1d2a40'); R(x + 2, 44, 5, 3, '#4a6080'); }
  G(80, 10, 160, 24, '#e6ebf2', '#c9d1dc'); R(76, 8, 168, 4, '#9aa3b4');
  for (let x = 90; x < 230; x += 20) R(x, 16, 14, 11, '#1d2a40');
  R(160, 0, 3, 10, '#5b6170'); R(150, 62, 60, 4, '#9b2630');
  // lan can, phao
  for (let x = 44; x < 268; x += 6) R(x, 30, 1, 4, '#7a8394');
  E(28, 84, 6, 6, '#c8323c'); E(28, 84, 3, 3, '#e6ebf2');
  return outline(img);
}

/** Đảo đá vôi giữa vịnh: vách đá xám có vệt dọc, cây bụi chỉ mọc trên đỉnh và gờ đá. */
function karstIsland(big) {
  const w = big ? 180 : 110, h = big ? 200 : 130, img = new Img(w, h), { R, E } = brush(img);
  E(w / 2, h - 8, w / 2 - 6, 8, '#0b1a2a90');
  const half = y => { const t = (y - 8) / (h - 16); return Math.round((w / 2 - 8) * Math.min(1, 0.38 + t * 0.85) * (0.9 + Math.sin(y * 0.17) * 0.06)); };
  for (let y = 8; y < h - 8; y++) {
    const t = (y - 8) / (h - 16), hw = half(y);
    R(w / 2 - hw, y, hw * 2, 1, mix('#6b7280', '#3a4048', t));
    R(w / 2 - hw, y, Math.max(2, Math.round(hw / 3)), 1, mix('#848c98', '#4a515b', t)); // mặt sáng bên trái
    R(w / 2 + hw - Math.max(2, Math.round(hw / 4)), y, Math.max(2, Math.round(hw / 4)), 1, mix('#4a515b', '#2b3038', t));
  }
  for (let i = 0; i < (big ? 16 : 9); i++) { const x = w / 2 - w / 3 + rnd() * w * 0.66, y = 20 + rnd() * h * 0.6; R(x, y, 1, 10 + rnd() * 24, '#2b303880'); }
  // thảm cây trên đỉnh và vài gờ đá
  for (let i = 0; i < (big ? 12 : 7); i++) E(w / 2 - half(14) * 0.8 + rnd() * half(14) * 1.6, 10 + rnd() * 10, 8, 5, i % 2 ? '#2f4a3a' : '#3a5a44');
  for (let i = 0; i < (big ? 6 : 3); i++) { const y = 40 + rnd() * h * 0.4; E(w / 2 + (rnd() - 0.5) * half(y), y, 6, 3, '#2f4a3a'); }
  R(w / 2 - half(h - 12), h - 12, half(h - 12) * 2, 3, '#2a4a5a'); // ngấn nước chân đảo
  return img;
}

// ---------------------------------------------------------------- tòa nhà (u tối, lạnh)

const STYLE = {
  concrete: { wall: '#5a616e', wall2: '#4c535f', trim: '#6f7786', win: '#1a2433', lit: '#e8c46a', frame: '#3a404b' },
  glass: { wall: '#1f2c3d', wall2: '#1a2534', trim: '#3a4b63', win: '#2a4466', lit: '#9ec8ff', frame: '#2a3546' },
  brick: { wall: '#4e3330', wall2: '#432c2a', trim: '#5e4440', win: '#141c28', lit: '#e8b45a', frame: '#2e2220' },
  stone: { wall: '#3c424e', wall2: '#343a45', trim: '#525a68', win: '#121a26', lit: '#7fe3ff', frame: '#262b33' },
  shop: { wall: '#454c58', wall2: '#3c434e', trim: '#5b6372', win: '#1a2433', lit: '#f2c46b', frame: '#2b303b' },
  warehouse: { wall: '#3e4652', wall2: '#363d48', trim: '#55606e', win: '#141c28', lit: '#c9a24a', frame: '#2b303b' },
  hotel: { wall: '#4a5260', wall2: '#414856', trim: '#636c7c', win: '#1a2433', lit: '#e8c46a', frame: '#353b47' },
  clinic: { wall: '#9aa4b2', wall2: '#8a94a3', trim: '#3aa7a3', win: '#1e3044', lit: '#d8eef6', frame: '#5b6370' },
  office: { wall: '#2c3644', wall2: '#26303c', trim: '#4a5a70', win: '#344a66', lit: '#c9e0f4', frame: '#3a4558' },
  // kiến trúc Pháp: tường vàng, phào trắng, cửa chớp xanh lá
  colonial: { wall: '#b8954a', wall2: '#a38240', trim: '#e6dcc0', win: '#1c2430', lit: '#f2d48a', frame: '#7a6232', shutter: '#3f6b4a' },
  // nhà ống: mỗi căn một màu (o.colors.wall), ban công sắt, cửa cuốn tầng trệt
  tube: { wall: '#7a8a9a', wall2: '#6a7a8a', trim: '#c9ced6', win: '#1a2433', lit: '#f2c46b', frame: '#2b303b' },
  // kính hiện đại: dải kính ngang + lam chắn nắng
  modern: { wall: '#c9ced6', wall2: '#b4bac4', trim: '#e6ebf2', win: '#2a4466', lit: '#bfe0ff', frame: '#8e97a8' }
};

/**
 * Tòa nhà nhiều tầng nhìn chính diện. o: { cols (số ô ngang), floors, style, door ('center' | số ô từ trái | null),
 * shop (mặt tiền tầng trệt kính / cửa cuốn), awning (màu), fireEscape, balcony, roof: ['tank','antenna','ac','vent'], sign: true }.
 * Tầng trệt cao 2,5 ô, mỗi tầng trên cao 2 ô, mái 0,8 ô. Trả về { img, meta }.
 */
function buildingFront(o) {
  const s = { ...STYLE[o.style], ...(o.colors || {}) };
  const W = o.cols * 32, GF = 80, FL = 64, ROOF = 26;
  const H = ROOF + o.floors * FL + GF;
  const img = new Img(W, H), { R, E, G } = brush(img);
  const lights = [];
  // mái
  R(0, 6, W, ROOF - 6, '#22262e'); R(0, ROOF - 4, W, 4, s.trim); R(0, 6, W, 2, '#3a4150');
  for (const it of o.frontRoof || []) {
    const x = Math.floor(rnd() * (W - 40)) + 8;
    if (it === 'tank') { R(x, -2 + 0, 22, 4, '#3a3026'); R(x + 2, 0, 18, 18, '#4a3c2e'); R(x + 2, 0, 18, 2, '#5b4a3a'); R(x + 4, 18, 2, 8, '#22262e'); R(x + 16, 18, 2, 8, '#22262e'); }
    if (it === 'antenna') { R(x + 10, 0, 2, 22, '#2b303b'); R(x + 4, 4, 14, 1, '#2b303b'); R(x + 6, 9, 10, 1, '#2b303b'); E(x + 11, 1, 2, 2, '#c8323c'); lights.push([x + 11, 1, 0xff5a5a, 40, 0.8]); }
    if (it === 'ac') { R(x, 10, 20, 12, '#8e97a8'); R(x + 2, 12, 16, 8, '#6b7486'); }
    if (it === 'vent') { R(x, 12, 10, 10, '#4a5060'); R(x - 1, 10, 12, 3, '#5b6170'); }
  }
  // tường các tầng
  const top = ROOF;
  G(0, top, W, o.floors * FL + GF, s.wall, s.wall2);
  if (o.style === 'brick') for (let y = top; y < H; y += 6) { R(0, y, W, 1, '#3a2624'); for (let x = (y / 6) % 2 ? 4 : 0; x < W; x += 10) R(x, y + 1, 1, 5, '#3a2624'); }
  if (o.style === 'concrete' || o.style === 'hotel') for (let y = top + FL; y < H - GF + 1; y += FL) R(0, y - 3, W, 3, s.trim);
  if (o.style === 'stone') for (let y = top; y < H; y += 12) { R(0, y, W, 1, '#2b3038'); for (let x = (y / 12) % 2 ? 12 : 0; x < W; x += 24) R(x, y, 1, 12, '#2b3038'); }
  if (o.style === 'warehouse') for (let x = 0; x < W; x += 6) R(x, top, 2, H - top, '#353c47');
  // vệt ẩm / ố mưa từ mái xuống
  for (let i = 0; i < o.cols; i++) if (rnd() < 0.35) { const x = Math.floor(rnd() * W); R(x, top, 2, 20 + Math.floor(rnd() * 60), '#00000022'); }
  // cửa sổ các tầng trên
  for (let f = 0; f < o.floors; f++) {
    const y0 = top + f * FL;
    if (o.style === 'colonial') {
      // cửa sổ cao đầu vòm, hai cánh chớp; phào ngang giữa các tầng; ban công sắt xen kẽ
      R(0, y0 + FL - 5, W, 5, s.trim); R(0, y0 + FL - 1, W, 1, shade(s.trim, -0.3));
      for (let c = 0; c < o.cols; c++) {
        const x = c * 32 + 10, y = y0 + 12, ww = 12, wh = 38;
        const lit = rnd() < 0.2;
        R(x - 3, y - 3, ww + 6, wh + 5, s.trim);
        img.ellipse(x + ww / 2, y + 1, ww / 2 + 3, 6, s.trim);
        img.ellipse(x + ww / 2, y + 2, ww / 2, 5, lit ? s.lit : s.win);
        G(x, y + 2, ww, wh - 2, lit ? s.lit : s.win, lit ? shade(s.lit, -0.35) : shade(s.win, -0.3));
        R(x + ww / 2, y, 1, wh, s.frame);
        for (const sx of [x - 9, x + ww + 3]) { R(sx, y + 2, 6, wh - 2, s.shutter); for (let k = y + 4; k < y + wh; k += 3) R(sx, k, 6, 1, shade(s.shutter, -0.35)); }
        if (lit) lights.push([x + ww / 2, y + wh / 2, parseInt(s.lit.slice(1), 16), 46, 0.6]);
        if (f > 0 && c % 2 === 0) { R(x - 9, y + wh - 2, ww + 18, 2, '#22262e'); for (let k = x - 9; k < x + ww + 9; k += 3) R(k, y + wh - 8, 1, 7, '#22262e'); R(x - 9, y + wh - 9, ww + 18, 1, '#22262e'); }
      }
      for (let x = 0; x < W; x += 32) R(x, y0, 3, FL - 5, shade(s.wall, 0.12)); // trụ áp tường
      continue;
    }
    if (o.style === 'modern') {
      // dải tường sáng + dải kính, lam đứng chắn nắng
      R(0, y0, W, 16, s.wall); R(0, y0 + 15, W, 1, shade(s.wall, -0.2));
      const lit = rnd() < 0.3;
      G(0, y0 + 16, W, FL - 16, lit ? '#5a7aa8' : s.win, lit ? '#34507a' : shade(s.win, -0.35));
      for (let x = 4; x < W; x += 8) R(x, y0 + 16, 2, FL - 16, shade(s.frame, -0.1));
      R(0, y0 + 16, W, 2, '#ffffff22');
      if (lit) lights.push([W / 2, y0 + FL / 2 + 8, 0xbfe0ff, 70, 0.5]);
      continue;
    }
    if (o.style === 'tube') {
      // nhà ống: một cửa lớn + cửa sổ mỗi tầng, ban công sắt có chậu cây, mái che nhỏ
      const x = 8, ww = W - 16, y = y0 + 10, wh = 40;
      const lit = rnd() < 0.3;
      R(x - 2, y - 2, ww + 4, wh + 4, s.frame);
      G(x, y, ww, wh, lit ? s.lit : s.win, lit ? shade(s.lit, -0.35) : shade(s.win, -0.3));
      for (let k = x + 6; k < x + ww; k += 6) R(k, y, 1, wh, shade(s.frame, 0.2)); // song sắt
      if (lit) lights.push([x + ww / 2, y + wh / 2, parseInt(s.lit.slice(1), 16), 50, 0.6]);
      R(x - 6, y - 8, ww + 12, 4, shade(s.wall, -0.35)); // ô văng
      if (f > 0 || o.floors === 1) {
        R(2, y + wh - 2, W - 4, 3, '#22262e'); R(2, y + wh - 12, W - 4, 1, '#22262e');
        for (let k = 2; k < W - 2; k += 4) R(k, y + wh - 12, 1, 11, '#22262e');
        for (let k = 6; k < W - 8; k += 14 + Math.floor(rnd() * 8)) { R(k, y + wh - 18, 6, 6, '#7a4a32'); img.ellipse(k + 3, y + wh - 20, 5, 4, rnd() < 0.5 ? '#3f7a4a' : '#5a8a3a'); }
      }
      if (rnd() < 0.4) { R(W - 14, y + 4, 10, 8, '#8e97a8'); R(W - 13, y + 5, 8, 6, '#6b7486'); } // cục nóng máy lạnh
      continue;
    }
    if (o.style === 'glass') {
      for (let x = 0; x < W; x += 16) {
        const lit = rnd() < 0.18;
        G(x + 1, y0 + 4, 14, FL - 8, lit ? '#6a8ab8' : '#2a4466', lit ? '#3a5a88' : '#1a2a44'); R(x + 1, y0 + 4, 3, FL - 8, '#ffffff12');
        if (lit) lights.push([x + 8, y0 + FL / 2, 0x9ec8ff, 50, 0.5]);
      }
      for (let x = 0; x <= W; x += 16) R(x, y0, 1, FL, s.frame);
      R(0, y0 + FL - 2, W, 2, s.frame);
      continue;
    }
    for (let c = 0; c < o.cols; c++) {
      if (o.style === 'warehouse' && c % 3 !== 1) continue;
      const x = c * 32 + 6, y = y0 + 12, ww = 20, wh = 36;
      const lit = rnd() < 0.2;
      R(x - 2, y - 2, ww + 4, wh + 4, s.frame);
      G(x, y, ww, wh, lit ? s.lit : s.win, lit ? shade(s.lit, -0.35) : shade(s.win, -0.3));
      R(x + ww / 2 - 1, y, 2, wh, s.frame); R(x, y + wh / 2 - 1, ww, 2, s.frame);
      if (!lit) R(x + 2, y + 2, 4, 6, '#ffffff14');
      if (lit) lights.push([x + ww / 2, y + wh / 2, parseInt(s.lit.slice(1), 16), 46, 0.6]);
      R(x - 3, y + wh + 2, ww + 6, 3, s.trim); // bậu cửa
      if (o.balcony && f > 0) { R(x - 4, y + wh - 6, ww + 8, 2, '#2b303b'); for (let k = x - 4; k < x + ww + 4; k += 3) R(k, y + wh - 4, 1, 8, '#2b303b'); R(x - 4, y + wh + 4, ww + 8, 2, '#2b303b'); }
      if (rnd() < 0.15 && o.style !== 'stone') { R(x + ww + 2, y + wh - 12, 10, 8, '#8e97a8'); R(x + ww + 3, y + wh - 11, 8, 6, '#6b7486'); }
    }
  }
  // thang thoát hiểm (gạch)
  if (o.fireEscape) {
    const fx = W - 58;
    for (let f = 0; f < o.floors; f++) {
      const y = top + f * FL + FL - 10;
      R(fx, y, 50, 3, '#22262e'); for (let k = fx; k < fx + 50; k += 4) R(k, y - 10, 1, 10, '#22262e'); R(fx, y - 10, 50, 1, '#22262e');
      for (let k = 0; k < 14; k++) R(fx + 8 + k * 2.4, y + 3 + k * 3.5, 4, 1, '#22262e');
    }
  }
  // tầng trệt
  const gy = H - GF;
  R(0, gy, W, 4, s.trim);
  const doorCol = o.door === 'center' ? Math.floor(o.cols / 2) - 1 : o.door;
  const doorX = doorCol != null ? doorCol * 32 + 16 : null; // cửa rộng 2 ô? không: 1,5 ô ở giữa 2 ô
  if (o.shop) {
    for (let x = 6; x < W - 6; x += 40) {
      if (doorX != null && x + 34 > doorX - 4 && x < doorX + 36) continue;
      if (o.shop === 'shutter' && rnd() < 0.5) { R(x, gy + 22, 34, 54, '#4a5060'); for (let y = gy + 24; y < gy + 76; y += 3) R(x, y, 34, 1, '#3a4150'); continue; }
      R(x - 1, gy + 21, 36, 56, s.frame); G(x, gy + 22, 34, 54, s.lit, shade(s.lit, -0.45));
      R(x + 4, gy + 50, 10, 10, '#3a3026'); R(x + 18, gy + 46, 12, 14, '#3a3026');
      lights.push([x + 17, gy + 50, parseInt(s.lit.slice(1), 16), 60, 0.7]);
    }
  } else {
    for (let c = 0; c < o.cols; c++) {
      const x = c * 32 + 6;
      if (doorX != null && x + 24 > doorX - 4 && x < doorX + 68) continue;
      R(x - 2, gy + 16, 24, 40, s.frame); G(x, gy + 18, 20, 36, s.win, shade(s.win, -0.3)); R(x + 9, gy + 18, 2, 36, s.frame);
    }
  }
  if (o.awning) {
    for (let x = 0; x < W; x += 12) { R(x, gy + 6, 6, 14, o.awning); R(x + 6, gy + 6, 6, 14, shade(o.awning, -0.3)); }
    for (let x = 0; x < W; x += 12) R(x, gy + 20, 6, 3, shade(o.awning, -0.45));
  }
  // cửa ra vào (rộng 2 ô, cao 2 ô)
  if (doorX != null) {
    R(doorX - 4, gy + 10, 72, 70, s.frame);
    G(doorX, gy + 14, 64, 66, o.style === 'glass' ? '#4a6a90' : '#2a3546', '#141c28');
    R(doorX + 31, gy + 14, 2, 66, s.frame); R(doorX + 26, gy + 46, 2, 8, '#c9d1dc'); R(doorX + 36, gy + 46, 2, 8, '#c9d1dc');
    R(doorX - 8, gy + 78, 80, 2, '#2b303b');
    lights.push([doorX + 32, gy + 30, 0xffd28a, 80, 0.9]);
  }
  // bảng hiệu (chữ do game vẽ bằng Phaser): dải tối có viền đèn
  let sign = null;
  if (o.sign) {
    const sw = Math.min(W - 16, Math.max(132, o.cols * 22)), sh = 32, sx = Math.round((W - sw) / 2), sy = gy - sh - 8;
    R(sx - 2, sy - 2, sw + 4, sh + 4, o.signGlow || '#7fe3ff'); R(sx, sy, sw, sh, '#0e1015');
    sign = { x: sx, y: sy, w: sw, h: sh };
    lights.push([sx + sw / 2, sy + sh / 2, parseInt((o.signGlow || '#7fe3ff').slice(1), 16), 90, 0.9]);
  }
  // bậc thềm
  R(0, H - 2, W, 2, '#2b303b');
  // chân đế phủ gần hết ảnh: không ai đi "vào trong" mặt tiền; lớp nhà phía sau vẫn nhô lên sau mái
  return { img, meta: { base: [W - 4, H - 10], lights, sign, door: doorX != null ? doorX + 32 : null } };
}

/** Mái và mặt hông theo phong cách: màu mái, chi tiết đặc trưng. */
const ROOF = {
  concrete: { roof: '#3a3f4a', edge: '#5b6372' }, glass: { roof: '#26303f', edge: '#3a4b63' }, brick: { roof: '#37302e', edge: '#5e4440' },
  stone: { roof: '#2f343d', edge: '#525a68' }, shop: { roof: '#353b46', edge: '#5b6372' }, warehouse: { roof: '#3c434e', edge: '#55606e' },
  hotel: { roof: '#3b424f', edge: '#636c7c' },
  clinic: { roof: '#4a5260', edge: '#8a94a3' }, office: { roof: '#2f3846', edge: '#4a5a70' }
};

/**
 * Tòa nhà giả 3D (góc nhìn 3/4 xiên): mặt tiền + mái nhìn từ trên (lệch lên phải theo chiều sâu) + mặt hông bên phải
 * tối hơn, có cửa sổ xiên. Đồ trên mái (máy lạnh, bồn nước, ống thông gió, giếng trời, vườn mái, pin mặt trời) là khối nhỏ.
 * meta.ox: vị trí tâm mặt tiền trong ảnh (để chân đế và cửa khớp ô bản đồ).
 */
function building(o) {
  const { img: front, meta } = buildingFront(o);
  const W = front.w, H = front.h, s = o.depth || 44;
  const img = new Img(W + s, H + s), { R } = brush(img);
  const st = STYLE[o.style], rf = ROOF[o.style];
  // điểm trên mái: u dọc mặt tiền (0..W), v vào sâu (0..s) → toạ độ ảnh
  const P = (u, v) => [u + v, s - v];
  // mái
  for (let y = 0; y < s; y++) {
    const v = s - y, t = v / s;
    R(v, y, W, 1, mix(rf.roof, shade(rf.roof, -0.25), t));
  }
  if (o.style === 'warehouse') for (let u = 4; u < W; u += 8) for (let v = 0; v < s; v++) { const [x, y] = P(u, v); img.set(x, y, '#2e343d'); }
  // gờ tường mái (lan can) quanh mép
  for (let v = 0; v < s; v++) { const [x, y] = P(0, v); R(x, y - 3, 3, 3, rf.edge); const [x2, y2] = P(W - 3, v); R(x2, y2 - 3, 3, 3, rf.edge); }
  for (let u = 0; u < W; u++) { const [x, y] = P(u, s - 1); R(x, y - 2, 1, 3, rf.edge); }
  // khối nhỏ trên mái
  const cube = (u, v, w, d, h, top, side, frontC) => {
    for (let j = 0; j < d; j++) { const [x, y] = P(u, v + j); R(x + w, y - h, 1, h, side); }
    for (let j = 0; j < d; j++) { const [x, y] = P(u, v + j); R(x, y - h, w, 1, top); }
    const [x0, y0] = P(u, v); R(x0, y0 - h, w, h, frontC);
  };
  const items = o.roof || [];
  let u = 10;
  for (const it of items) {
    const v = 8 + Math.floor(rnd() * Math.max(1, s - 26));
    if (it === 'ac') cube(u, v, 18, 10, 10, '#b4bccb', '#6b7486', '#8e97a8');
    if (it === 'tank') { cube(u, v, 18, 14, 20, '#5b4a3a', '#3a3026', '#4a3c2e'); }
    if (it === 'vent') cube(u, v, 10, 8, 8, '#6b7686', '#3a4150', '#4a5060');
    if (it === 'antenna') { const [x, y] = P(u + 4, v); R(x, y - 30, 2, 30, '#2b303b'); R(x - 6, y - 26, 14, 1, '#2b303b'); R(x - 4, y - 20, 10, 1, '#2b303b'); img.set(x, y - 31, '#ff5a5a'); meta.lights.push([x, y - 31, 0xff5a5a, 40, 0.8]); }
    if (it === 'skylight') cube(u, v, 22, 12, 4, '#7fa8c8', '#2a3a4a', '#3a5068');
    if (it === 'solar') for (let k = 0; k < 3; k++) cube(u + k * 12, v, 10, 12, 3, '#2c4a6b', '#1a2a3a', '#22384f');
    if (it === 'garden') { for (let k = 0; k < 4; k++) cube(u + k * 11, v, 9, 10, 8, '#3a6455', '#1f3a33', '#2a4a40'); }
    u += it === 'solar' || it === 'garden' ? 46 : 28;
    if (u > W - 30) u = 14;
  }
  // mặt hông bên phải: tối hơn mặt tiền, cửa sổ xiên theo tầng
  const side = shade(st.wall2, -0.32), sideWin = shade(st.win, -0.2);
  for (let i = 0; i < s; i++) {
    const x = W + i, top = s - i;
    R(x, top, 1, H, mix(side, shade(side, -0.25), i / s));
  }
  const GF = 80, FL = 64, ROOFH = 26, floors = o.floors;
  for (let f = 0; f < floors; f++) {
    const wy = s + ROOFH + f * FL + 12;
    for (let i = 0; i < s; i++) {
      const k = i % 22;
      if (k < 6 || k > 16) continue;
      const lit = ((f * 7 + Math.floor(i / 22) * 3) % 5) === 0;
      R(W + i, wy - i, 1, 34, lit ? shade(st.lit, -0.3) : sideWin);
    }
  }
  for (let i = 0; i < s; i++) R(W + i, H + s - GF - i, 1, 3, shade(st.trim, -0.3)); // gờ tầng trệt
  // mép đứng nối mặt tiền và mặt hông
  R(W - 1, s, 2, H, shade(st.wall2, -0.45));
  // mặt tiền
  img.blit(front, 0, 0, W, H, 0, s);
  // chân đế và ánh sáng / biển hiệu dịch xuống theo chiều sâu mái
  meta.lights = meta.lights.map(([x, y, c, r, k]) => [x, y + s, c, r, k]);
  if (meta.sign) meta.sign = { ...meta.sign, y: meta.sign.y + s };
  meta.ox = (W / 2) / (W + s);
  // bóng đổ chéo xuống mặt đất bên phải tòa nhà (ảnh riêng, nằm dưới chân nhân vật)
  const L = Math.round(s * 1.3), shadowImg = new Img(W + s + L, s);
  for (let r = 0; r < s; r++) {
    const x0 = W + (s - r);
    for (let k = 0; k < L; k++) shadowImg.set(x0 + k, r, `#000000${Math.round(0x50 * (1 - k / L)).toString(16).padStart(2, '0')}`);
  }
  for (let x = 0; x < W; x++) shadowImg.set(x, s - 1, '#00000030');
  return { img, meta, shadowImg };
}


/** Lật ngang một ảnh. */
function mirror(src) {
  const out = new Img(src.w, src.h);
  out.blit(src, 0, 0, src.w, src.h, 0, 0, true);
  return out;
}

/**
 * Khối isometric từ ảnh chính diện: mặt trước cắt xiên theo trục x (cột u hạ u/2 px) thành mặt nam; mép trên / mép phải
 * đẩy lùi d px theo hướng (+1, −1/2) (lùi về phía bắc trên lưới) thành mặt trên (sáng) / mặt đông (tối).
 * Chỉ phần từ hàng fromY trở xuống được đẩy khối (đồ đặt trên mặt bàn giữ nguyên).
 * Trả về { img, ay, fw, d }: điểm neo (0, ay) = chân mép trái mặt nam; fw = bề rộng mặt nam (px logic); d = chiều sâu.
 */
export function isoExtrude(src, d, fromY = 0) {
  const sh = shearIso(src);
  const yo = Math.ceil(d / 2);
  const out = new Img(src.w + d, sh.h + yo);
  const solid = (x, y) => x >= 0 && y >= fromY && x < src.w && y < src.h && src.get(x, y)[3] > 200;
  const isOut = c => c[0] === 11 && c[1] === 15 && c[2] === 24;
  const hex = c => `#${c.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('')}`;
  for (let k = d; k >= 1; k--) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      if (!solid(x, y)) continue;
      const top = !solid(x, y - 1), right = !solid(x + 1, y);
      if (!top && !right) continue;
      let c = src.get(x, y);
      if (isOut(c)) c = top && solid(x, y + 1) ? src.get(x, y + 1) : solid(x - 1, y) ? src.get(x - 1, y) : c;
      if (isOut(c)) continue;
      // mặt trên sáng (mép xa sáng nhất), mặt đông tối dần về phía sau
      const col = top ? shade(hex(c), 0.1 + 0.1 * (k / d)) : shade(hex(c), -0.36 - 0.14 * (k / d));
      const yy = yo + y + Math.floor(x / 2);
      out.set(x + k, yy - Math.floor(k / 2), col);
      out.set(x + k, yy - Math.ceil(k / 2), col);
    }
  }
  out.blit(sh, 0, 0, sh.w, sh.h, 0, yo);
  return { img: outline(out), ay: yo + src.h, fw: src.w, d };
}

/**
 * Khối isometric có đồ đặt trên mặt (bàn có màn hình, chồng giấy, đèn, cốc...): phần ảnh từ hàng fromY trở xuống là
 * thân đồ vật (đẩy khối sâu d); phần phía trên được tách thành từng món theo các cột liền nhau, mỗi món đẩy thành khối nhỏ
 * riêng và đặt lên mặt trên, lùi về phía sau — thay cho ảnh phẳng dán ở mặt trước.
 */
export function isoWithItems(src, d, fromY) {
  const body = new Img(src.w, src.h);
  body.blit(src, 0, fromY, src.w, src.h - fromY, 0, fromY);
  const base = isoExtrude(body, d, 0);
  const out = base.img;
  const z = src.h - fromY; // độ cao mặt trên
  const colSolid = x => { for (let y = 0; y < fromY; y++) if (src.get(x, y)[3] > 200) return true; return false; };
  // các món: dải cột liền nhau có điểm đặc phía trên mặt
  const items = [];
  for (let x = 0; x < src.w; x++) {
    if (!colSolid(x)) continue;
    let x1 = x;
    while (x1 + 1 < src.w && colSolid(x1 + 1)) x1++;
    items.push([x, x1]);
    x = x1;
  }
  for (const [x0, x1] of items) {
    const w = x1 - x0 + 1;
    let top = fromY;
    for (let y = 0; y < fromY && top === fromY; y++) for (let x = x0; x <= x1; x++) if (src.get(x, y)[3] > 200) { top = y; break; }
    const crop = new Img(w, fromY - top);
    crop.blit(src, x0, top, w, fromY - top, 0, 0);
    // món cao và rộng (màn hình, bảng) thì mỏng; món nhỏ (cốc, giấy) thì dày gần bằng bề ngang
    const dk = crop.h > 12 && w > 14 ? 4 : Math.max(3, Math.min(12, Math.round(w * 0.6)));
    const k = Math.max(2, Math.min(d - dk - 2, Math.round(d * 0.55)));
    const it = isoExtrude(crop, dk, 0);
    const px = x0 + k, py = base.ay + Math.floor(x0 / 2) - Math.floor(k / 2) - z - it.ay;
    out.blit(it.img, 0, 0, it.img.w, it.img.h, px, py);
  }
  return base;
}

/**
 * Tòa nhà isometric: mặt nam = mặt tiền (cắt xiên), mặt đông = tường hông có cửa sổ theo tầng (tối hơn), mái phẳng có gờ
 * và đồ trên mái (khối nhỏ). D: chiều sâu chân đế (px logic). Neo (0, ay) = chân mép trái mặt tiền.
 */
function buildingIso(o) {
  const { img: front, meta } = buildingFront(o);
  const W = front.w, H = front.h, D = (o.deep || 6) * 32;
  const st = { ...STYLE[o.style], ...(o.colors || {}) }, rf = { ...(ROOF[o.style] || ROOF.concrete), ...(o.roofColors || {}) };
  // khoảng trống phía trên ảnh cho mái dốc / vòm / khối tầng lùi
  const tower = o.tower ? buildingIso({ ...o, ...o.tower, tower: null, roofType: o.tower.roofType || 'flat', sign: false, door: null, shop: null, awning: null, deep: o.tower.deep }) : null;
  const roofH = o.roofType === 'gable' ? Math.round((o.pitch ?? 0.6) * D / 2) : o.roofType === 'hip' ? Math.round((o.pitch ?? 0.55) * Math.min(W, D) / 2) : o.roofType === 'dome' ? 46 : 0;
  const extra = Math.max(roofH + 6, tower ? tower.img.h - Math.ceil(D / 2) : 0);
  const y0 = Math.ceil(D / 2) + extra;
  const out = new Img(W + D, H + Math.ceil(W / 2) + y0 + 2);
  const set = (x, y, c) => out.set(Math.round(x), Math.round(y), c);
  // mặt đông: cột j lùi về sau, mỗi cột cao H
  const side = shade(st.wall2, -0.34), sideWin = shade(st.win, -0.25);
  const GF = 80, FL = 64, ROOFH = 26;
  for (let j = 0; j <= D; j++) {
    const x = W + j, yTop = y0 + W / 2 - j / 2;
    const base = mix(side, shade(side, -0.25), j / D);
    for (let v = 0; v < H; v++) set(x, yTop + v, base);
    const k = j % 32;
    if (k >= 6 && k <= 26) {
      for (let f = 0; f < o.floors; f++) {
        const wy = ROOFH + f * FL + 12;
        const lit = ((f * 5 + Math.floor(j / 32) * 3) % 7) === 0;
        for (let v = wy; v < wy + 36; v++) set(x, yTop + v, lit ? shade(st.lit, -0.3) : sideWin);
      }
      if (o.shop && k > 8 && k < 24) for (let v = H - GF + 22; v < H - 4; v++) set(x, yTop + v, shade(st.lit, -0.5));
    }
    set(x, yTop + H - GF, shade(st.trim, -0.3)); set(x, yTop + H - GF + 1, shade(st.trim, -0.3));
    if (j === 0 || j === D) for (let v = 0; v < H; v++) set(x, yTop + v, shade(st.wall2, -0.5));
  }
  // mặt nam: mặt tiền cắt xiên
  const sh = shearIso(front);
  out.blit(sh, 0, 0, sh.w, sh.h, 0, y0);
  // mái: điểm (a dọc x, b lùi sau, z cao) → ảnh
  const roofPt = (a, b, z = 0) => [a + b, y0 + a / 2 - b / 2 - z];
  const fillTop = (a0, b0, w, d, z, colorAt) => {
    const [xa] = roofPt(a0, b0), [xb] = roofPt(a0 + w, b0 + d);
    for (let x = Math.floor(xa); x <= Math.ceil(xb); x++) for (let y = Math.floor(y0 - (b0 + d) / 2 - z - 2 + a0 / 2); y <= Math.ceil(y0 + (a0 + w) / 2 - b0 / 2 - z + 2); y++) {
      const yy = y + z - y0;
      const a = x / 2 + yy, b = x / 2 - yy;
      if (a < a0 || a >= a0 + w || b < b0 || b >= b0 + d) continue;
      out.set(x, y, colorAt(a - a0, b - b0));
    }
  };
  fillTop(0, 0, W, D, 0, (a, b) => {
    const edge = a < 3 || b < 3 || a > W - 4 || b > D - 4;
    if (edge) return rf.edge;
    if (o.style === 'warehouse' && Math.floor(a) % 8 < 2) return '#2e343d';
    return mix(rf.roof, shade(rf.roof, -0.22), b / D);
  });
  /**
   * Mái theo trường độ cao z(a, b) (-1 = không có): vẽ từ sau ra trước, tô theo độ dốc (nắng chiếu từ trước trái).
   * tile: kẻ hàng ngói / sóng tôn.
   */
  const heightRoof = (zf, base, tile) => {
    for (let b = D; b >= 0; b -= 0.5) for (let a = 0; a <= W; a += 0.5) {
      const z = zf(a, b);
      if (z < 0) continue;
      const dzb = zf(a, Math.max(0, b - 1)), dza = zf(Math.min(W, a + 1), b);
      const front = dzb >= 0 && dzb < z - 0.05, east = dza >= 0 && dza < z - 0.05;
      let c = shade(base, front ? 0.08 : east ? -0.32 : -0.12);
      if (tile === 'tile' && Math.floor(b) % 5 === 0) c = shade(c, -0.25);
      if (tile === 'tile' && Math.floor(a + (Math.floor(b / 5) % 2) * 3) % 6 === 0) c = shade(c, -0.12);
      if (tile === 'tin' && Math.floor(a) % 4 === 0) c = shade(c, 0.12);
      const [x, y] = roofPt(a, b, z);
      set(x, y, c); set(x, y + 1, c);
    }
  };
  if (o.roofType === 'gable') {
    // mái hai dốc, nóc chạy dọc mặt tiền; đầu hồi phía đông là tam giác tường
    const half = D / 2, k = roofH / half;
    for (let b = 0; b <= D; b += 0.5) {
      const zt = roofH - Math.abs(b - half) * k;
      const [x, y] = roofPt(W, b, 0);
      for (let z = 0; z <= zt; z++) set(x, y - z, shade(st.wall2, -0.38 - 0.1 * (b / D)));
    }
    heightRoof((a, b) => roofH - Math.abs(b - half) * k + (a < 2 || a > W - 2 ? 0 : 0), rf.tile || '#7a3a2c', o.roofTile || 'tile');
    for (let a = -2; a <= W + 2; a += 0.5) { const [x, y] = roofPt(a, half, roofH + 1); set(x, y, shade(rf.tile || '#7a3a2c', -0.45)); }
  } else if (o.roofType === 'hip') {
    const k = roofH / (Math.min(W, D) / 2);
    heightRoof((a, b) => Math.min(roofH, Math.min(a, W - a, b, D - b) * k), rf.tile || '#4a5260', o.roofTile || 'tile');
  } else if (o.roofType === 'dome') {
    // vòm nhỏ giữa mái + chóp
    const ac = W / 2, bc = D / 2, r = Math.min(W, D) * 0.28;
    heightRoof((a, b) => { const d = Math.hypot(a - ac, b - bc); return d > r ? -1 : 8 + Math.sqrt(r * r - d * d) * (38 / r); }, rf.dome || '#5b7a6a', null);
    const [x, y] = roofPt(ac, bc, 8 + 38);
    for (let z = 0; z < 10; z++) set(x, y - z, '#c9a24a');
  }
  if (tower) {
    // khối tầng lùi: góc tây nam chân khối đặt trên mái tại (ins, back)
    const ins = o.tower.inset ?? 32, back = o.tower.back ?? 24;
    const [x, y] = roofPt(ins, back);
    out.blit(tower.img, 0, 0, tower.img.w, tower.img.h, x, y - tower.meta.iso.ay);
    tower.meta.lights.forEach(([lx, ly, c, rr, i]) => meta.lights.push([x + lx, y - tower.meta.iso.ay + ly - y0 - (x + lx) / 2, c, rr, i]));
  }
  // đồ trên mái: hộp nhỏ isometric
  const cube = (a0, b0, w, d, h, top, south, east) => {
    for (let a = a0; a < a0 + w; a++) { const [x, y] = roofPt(a, b0); for (let z = 0; z < h; z++) set(x, y - z, south); }
    for (let b = b0; b < b0 + d; b++) { const [x, y] = roofPt(a0 + w, b); for (let z = 0; z < h; z++) set(x, y - z, east); }
    fillTop(a0, b0, w, d, h, () => top);
  };
  let a = 14;
  for (const it of (o.roofType && o.roofType !== 'flat') || tower ? [] : o.roof || []) {
    const b = 14 + Math.floor(rnd() * Math.max(1, D - 50));
    if (it === 'ac') cube(a, b, 20, 14, 12, '#b4bccb', '#8e97a8', '#6b7486');
    if (it === 'tank') cube(a, b, 20, 20, 24, '#5b4a3a', '#4a3c2e', '#3a3026');
    if (it === 'vent') cube(a, b, 12, 12, 10, '#6b7686', '#4a5060', '#3a4150');
    if (it === 'skylight') cube(a, b, 26, 18, 5, '#7fa8c8', '#3a5068', '#2a3a4a');
    if (it === 'solar') for (let k = 0; k < 3; k++) cube(a + k * 14, b, 12, 18, 4, '#2c4a6b', '#22384f', '#1a2a3a');
    if (it === 'garden') for (let k = 0; k < 4; k++) cube(a + k * 12, b, 10, 12, 10, '#3a6455', '#2a4a40', '#1f3a33');
    if (it === 'antenna') { const [x, y] = roofPt(a + 6, b); for (let z = 0; z < 34; z++) set(x, y - z, '#2b303b'); for (let k = -6; k < 8; k++) set(x + k, y - 28, '#2b303b'); set(x, y - 35, '#ff5a5a'); meta.lights.push([x, y - 35 - y0, 0xff5a5a, 40, 0.8]); }
    a += it === 'solar' || it === 'garden' ? 52 : 34;
    if (a > W - 40) a = 18;
  }
  // ánh sáng / biển hiệu: toạ độ mặt tiền → ảnh cắt xiên
  const lights = meta.lights.map(([x, y, c, r, i]) => [x, y0 + y + x / 2, c, r, i]);
  const sign = meta.sign ? { ...meta.sign, x: meta.sign.x, y: y0 + meta.sign.y + meta.sign.x / 2 } : null;
  return { img: out, meta: { base: [W - 4, D - 8], lights, sign, building: true, iso: { ay: y0 + H, fw: W, d: D } } };
}


/**
 * Khối "voxel" isometric: chân đế w x d (px logic) chia ô cell x cell, mỗi ô là một cột cao height(i, j) px.
 * Vẽ từ sau ra trước (i + j tăng dần). Tô khối theo ánh sáng từ trên trái: mặt trên sáng, mặt nam vừa, mặt đông tối,
 * chân cột tối dần (bóng tiếp đất), thêm nhiễu nhẹ cho bề mặt. color(i, j, h) → màu gốc của cột.
 * Neo: góc tây nam chân đế ở (0, ay) — cùng quy ước với isoExtrude (fw = w, d = d).
 */
export function voxel({ w, d, cell = 4, maxH, height, color, seed: sd = 3 }) {
  let s0 = sd;
  const r = () => ((s0 = (s0 * 16807) % 2147483647) / 2147483647);
  const W = w + d + 2, H = Math.ceil((w + d) / 2) + maxH + 3;
  const img = new Img(W, H);
  const P = (a, b, z) => [a - b + d, (a + b) / 2 + maxH - z];
  const ni = Math.ceil(w / cell), nj = Math.ceil(d / cell);
  const cells = [];
  for (let i = 0; i < ni; i++) for (let j = 0; j < nj; j++) cells.push([i, j]);
  cells.sort((p, q) => (p[0] + p[1]) - (q[0] + q[1]) || p[0] - q[0]);
  const set = (x, y, c) => img.set(Math.round(x), Math.round(y), c);
  for (const [i, j] of cells) {
    const h = Math.round(height(i, j));
    if (h <= 0) continue;
    const base = color(i, j, h);
    const a0 = i * cell, b0 = j * cell;
    const n = (r() - 0.5) * 0.08;
    // mặt nam (b = b0 + cell) và mặt đông (a = a0 + cell): tối dần về chân cột
    for (let a = a0; a < a0 + cell; a += 0.5) for (let z = 0; z < h; z++) {
      const [x, y] = P(a, b0 + cell, z);
      set(x, y, shade(base, -0.12 - 0.22 * (1 - z / h) * (z < 6 ? 1.4 : 1) + n));
    }
    for (let b = b0; b < b0 + cell; b += 0.5) for (let z = 0; z < h; z++) {
      const [x, y] = P(a0 + cell, b, z);
      set(x, y, shade(base, -0.38 - 0.16 * (1 - z / h) + n));
    }
    // mặt trên
    const top = shade(base, 0.12 + n);
    for (let a = a0; a < a0 + cell; a += 0.5) for (let b = b0; b < b0 + cell; b += 0.5) {
      const [x, y] = P(a, b, h);
      set(x, y, (a - a0 < 0.6 || b - b0 < 0.6) ? shade(base, 0.2 + n) : top);
    }
  }
  return { img: outline(img), ay: Math.round(d / 2 + maxH), fw: w, d };
}

/** Các đồ ngoài trời dựng bằng voxel (đá vôi, ghế, bồn hoa, đài phun nước, hàng rào cây). */
function voxelProps() {
  const out = {};
  const ell = (i, j, ni, nj) => { const x = (i + 0.5) / ni * 2 - 1, y = (j + 0.5) / nj * 2 - 1; return x * x + y * y; };
  // đảo đá vôi: núi dựng đứng, đỉnh phủ cây, chân có ngấn nước
  const karst = (w, d, maxH, sd) => {
    let s1 = sd; const rr = () => ((s1 = (s1 * 48271) % 2147483647) / 2147483647);
    const ni = Math.ceil(w / 6), nj = Math.ceil(d / 6);
    const bumps = Array.from({ length: 5 }, () => [rr() * ni, rr() * nj, 0.3 + rr() * 0.5]);
    return voxel({ w, d, cell: 6, maxH, seed: sd,
      height: (i, j) => {
        const e = ell(i, j, ni, nj);
        if (e > 1) return 0;
        let h = Math.pow(1 - e, 0.45);
        for (const [bx, by, bh] of bumps) h = Math.max(h, bh * Math.pow(Math.max(0, 1 - ((i - bx) ** 2 + (j - by) ** 2) / 10), 0.6));
        return maxH * h * (0.86 + rr() * 0.14);
      },
      color: (i, j, h) => h > maxH * 0.72 ? (rr() < 0.7 ? '#3a5a44' : '#2f4a3a') : h < 10 ? '#2a4a5a' : rr() < 0.2 ? '#5b6370' : '#6b7280'
    });
  };
  out.karst_big = karst(150, 120, 210, 11);
  out.karst = karst(96, 80, 130, 29);
  // ghế công viên: lưng ghế cao ở hàng sau, mặt ngồi thấp
  out.bench = voxel({ w: 64, d: 20, cell: 4, maxH: 26,
    height: (i, j) => j === 0 ? 24 : (i === 0 || i === 15) ? 12 : 11,
    color: (i, j) => (i === 0 || i === 15) ? '#2b303b' : j === 0 ? '#4a3c2e' : '#5b4a3a' });
  // bồn hoa bên đường: thành bê tông, đất, hoa nhiều màu
  const flowers = ['#9b5a7a', '#c8a24a', '#c9d1dc', '#8a2a30', '#6a8ab8'];
  const planter = (w, d, wallH, sd) => {
    let s1 = sd; const rr = () => ((s1 = (s1 * 48271) % 2147483647) / 2147483647);
    const ni = w / 4, nj = d / 4;
    return voxel({ w, d, cell: 4, maxH: wallH + 12, seed: sd,
      height: (i, j) => {
        const edge = i === 0 || j === 0 || i === ni - 1 || j === nj - 1;
        if (edge) return wallH;
        const f = rr();
        return f < 0.35 ? wallH + 4 + rr() * 6 : f < 0.7 ? wallH + 2 : wallH - 2;
      },
      color: (i, j, h) => {
        const edge = i === 0 || j === 0 || i === ni - 1 || j === nj - 1;
        if (edge) return '#6b7280';
        if (h >= wallH + 4) return flowers[Math.floor(rr() * flowers.length)];
        if (h >= wallH + 2) return '#2f5446';
        return '#3a3026';
      }
    });
  };
  out.planter = planter(64, 24, 12, 5);
  out.flowerbed = planter(64, 64, 6, 17);
  // hàng rào cây xén
  out.hedge = voxel({ w: 96, d: 20, cell: 4, maxH: 22, seed: 23,
    height: () => 16 + Math.floor(Math.random() * 3), color: (i, j, h) => h > 17 ? '#2f5446' : '#26463c' });
  // đài phun nước: thành đá tròn, mặt nước, bệ giữa hai tầng, vòi
  out.fountain = voxel({ w: 112, d: 112, cell: 4, maxH: 60, seed: 41,
    height: (i, j) => {
      const e = Math.sqrt(ell(i, j, 28, 28));
      if (e > 1) return 0;
      if (e > 0.86) return 14;          // thành bể
      if (e > 0.34) return 5;           // mặt nước
      if (e > 0.12) return 30;          // bệ tầng
      return 52;                        // vòi
    },
    color: (i, j, h) => h === 14 ? '#8e97a8' : h === 5 ? ((i * 7 + j * 3) % 11 === 0 ? '#9fd8ff' : '#3f7899') : h === 30 ? '#7a8394' : '#9aa3b4' });
  return out;
}

// ---------------------------------------------------------------- danh mục

/** Tất cả props: khóa → { img, meta }. meta.base: [rộng, sâu] chân đế va chạm (0 = không va chạm); flat: nằm dưới chân; wall: dán tường. */
export function allProps() {
  seed = 7;
  const P = {};
  const add = (key, img, meta = {}) => { P[key] = { img, meta: { base: [img.w - 8, Math.min(20, img.h / 3)], ...meta } }; };
  add('desk_pc', desk('pc'), { base: [68, 26], lights: [[19, 9, 0x7fb0ff, 60, 0.8], [60, 4, 0xffd28a, 50, 0.6]] });
  add('desk_papers', desk('papers'), { base: [68, 26], lights: [[60, 4, 0xffd28a, 70, 0.9]] });
  add('desk_lab', desk('lab'), { base: [68, 26], lights: [[20, 10, 0x7fb0ff, 50, 0.7]] });
  add('chair', officeChair(), { base: [0, 0] });
  add('cabinet', cabinet(), { base: [30, 16] });
  add('bookshelf', bookshelf(), { base: [64, 18] });
  add('sofa', sofa(), { base: [96, 22] });
  add('coffee_table', coffeeTable(), { base: [64, 14] });
  add('reception', reception(), { base: [160, 30], lights: [[80, 10, 0xffe2a0, 110, 0.8]] });
  add('plant_big', plant(true), { base: [20, 10] });
  add('plant_small', plant(false), { base: [16, 8] });
  add('water_cooler', waterCooler(), { base: [20, 10] });
  add('printer', printer(), { base: [46, 16] });
  add('floor_lamp', floorLamp(), { base: [10, 6], lights: [[12, 10, 0xffd28a, 90, 1.0]] });
  add('trash', trashBin(), { base: [14, 8] });
  add('filing_boxes', filingBoxes(), { base: [46, 16] });
  add('meeting_table', meetingTable(), { base: [128, 48] });
  add('cork_board', corkBoard(), { base: [0, 0], wall: true });
  add('archive_shelf', archiveShelf(), { base: [96, 18] });
  add('tv_wall', tvWall(), { base: [0, 0], wall: true, lights: [[38, 20, 0x7fa8ff, 70, 0.9]] });
  add('blinds_window', blindsWindow(), { base: [0, 0], wall: true, lights: [[26, 28, 0x9ec8ff, 60, 0.6]] });
  add('whiteboard', whiteboard(), { base: [0, 0], wall: true });
  add('wall_clock', wallClock(), { base: [0, 0], wall: true });
  add('poster_a', poster('#2c4a6b'), { base: [0, 0], wall: true });
  add('poster_b', poster('#6b2a30'), { base: [0, 0], wall: true });
  add('elevator', elevator(), { base: [0, 0], wall: true, lights: [[30, 9, 0xff9a3a, 40, 0.8]] });
  add('rug_lobby', rug(192, 96, '#2c3546', '#4a5a74'), { base: [0, 0], flat: true });
  add('rug_room', rug(128, 80, '#3a2f3a', '#5a4a5a'), { base: [0, 0], flat: true });
  add('cafe_table', cafeTable(), { base: [50, 14] });
  add('bed', bed(), { base: [62, 70] });
  add('cafe_counter', cafeCounter(), { base: [128, 30], lights: [[68, 14, 0xffc27a, 90, 1.0]] });
  for (const k of ['computer', 'magnifier', 'detector', 'archive', 'monitor', 'timeline', 'evidence']) {
    const img = device(k);
    const onWall = k === 'evidence' || k === 'timeline';
    add(`dev_${k}`, img, { base: onWall ? [0, 0] : [img.w - 8, 18], wall: onWall, lights: k === 'magnifier' ? [[36, 34, 0xfff2c0, 70, 0.9]] : [[img.w / 2, 16, 0x7fe3ff, 70, 1.0]] });
  }
  add('tree_big', tree(true), { base: [16, 10] });
  add('tree', tree(false), { base: [12, 8] });
  add('street_lamp', streetLamp(), { base: [8, 6], lights: [[32, 18, 0xffd28a, 190, 1.7]] });
  add('bench', bench(), { base: [60, 10] });
  add('kiosk', kiosk(), { base: [68, 26], lights: [[36, 34, 0xffe2a0, 70, 0.8]] });
  add('bus_stop', busStop(), { base: [92, 12] });
  add('street_bin', streetBin(), { base: [16, 8] });
  add('hydrant', hydrant(), { base: [14, 8] });
  add('bollard', bollard(), { base: [8, 6] });
  add('barrier', barrier(), { base: [30, 32], lights: [[16, 6, 0xffa040, 40, 0.9]] });
  add('barrier_ns', barrierNS(), { base: [8, 96] });
  add('life_ring', lifeRing(), { base: [8, 6] });
  add('flyer', flyer(), { base: [0, 0], flat: true });
  add('planter', planter(), { base: [64, 16] });
  add('market_stall', marketStall(), { base: [76, 20] });
  add('tour_boat', tourBoat(), { base: [290, 34], lights: [[160, 48, 0xffe2a0, 120, 0.8]] });
  // đảo đá giả 3D: đỉnh phủ cây nhìn từ trên, vách hông tối
  add('karst_big', karstIsland(true), { base: [150, 30] });
  add('karst', karstIsland(false), { base: [90, 20] });
  // tòa nhà: tương tác (có biển, cửa) và trang trí
  const B = {
    bld_thanhnien: { deep: 7, cols: 12, floors: 5, style: 'glass', door: 'center', sign: true, signGlow: '#c8323c', depth: 52, roof: ['antenna', 'solar', 'ac', 'ac', 'skylight'] },
    bld_tinvinh: { deep: 6, cols: 9, floors: 3, style: 'brick', door: 2, sign: true, signGlow: '#ff9a3a', fireEscape: true, roof: ['tank', 'vent', 'ac', 'antenna'] },
    bld_xacminh: { deep: 6, cols: 8, floors: 2, style: 'stone', door: 'center', sign: true, signGlow: '#7fe3ff', roof: ['antenna', 'skylight', 'vent'] },
    bld_cafe: { deep: 5, cols: 8, floors: 1, style: 'shop', door: 'center', shop: 'glass', awning: '#5a3a3a', sign: true, signGlow: '#f2c46b', roof: ['garden', 'vent'] },
    bld_apartment: { deep: 6, cols: 9, floors: 5, style: 'concrete', door: 3, balcony: true, sign: false, signGlow: '#9fb3c8', roof: ['tank', 'ac', 'antenna', 'ac'] },
    bld_apartment2: { deep: 5, cols: 7, floors: 4, style: 'concrete', door: 2, sign: false, roof: ['ac', 'tank', 'vent'] },
    bld_hotel: { deep: 6, cols: 10, floors: 6, style: 'hotel', door: 'center', balcony: true, sign: false, signGlow: '#ff9fd0', roof: ['garden', 'tank', 'antenna'] },
    bld_pharmacy: { deep: 5, cols: 5, floors: 2, style: 'shop', door: 1, shop: 'glass', sign: false, signGlow: '#4aa35b', roof: ['ac', 'skylight'] },
    bld_store: { deep: 5, cols: 6, floors: 2, style: 'shop', door: 2, shop: 'glass', awning: '#2c4a6b', sign: false, signGlow: '#9fd8ff', roof: ['tank', 'ac'] },
    bld_books: { deep: 5, cols: 5, floors: 2, style: 'brick', door: 1, shop: 'glass', sign: false, signGlow: '#f2c46b', roof: ['solar'] },
    bld_closed: { deep: 5, cols: 6, floors: 2, style: 'concrete', door: null, shop: 'shutter', sign: false, signGlow: '#5b6170', roof: ['vent', 'ac'] },
    bld_warehouse: { deep: 6, cols: 12, floors: 1, style: 'warehouse', door: 4, shop: 'shutter', sign: false, signGlow: '#c9a24a', roof: ['vent', 'vent', 'skylight'] },
    bld_office: { deep: 5, cols: 7, floors: 6, style: 'glass', door: 2, sign: true, signGlow: '#9fb3c8', roof: ['antenna', 'ac', 'vent'] },
    bld_clinic: { deep: 5, cols: 6, floors: 2, style: 'clinic', door: 2, shop: 'glass', sign: true, signGlow: '#4aa35b', roof: ['ac', 'skylight'] },
    bld_cafe2: { deep: 5, cols: 6, floors: 2, style: 'shop', door: 2, shop: 'glass', awning: '#2f5446', sign: true, signGlow: '#f2c46b', roof: ['garden'] },
    bld_media: { deep: 5, cols: 6, floors: 3, style: 'glass', door: 2, shop: 'glass', sign: true, signGlow: '#ff6b8a', roof: ['antenna', 'antenna', 'ac'] },
    bld_tenement: { deep: 5, cols: 6, floors: 4, style: 'brick', door: 1, fireEscape: true, sign: false, roof: ['tank', 'ac', 'antenna'] },
    // ---- kiến trúc đa dạng (đợt 19)
    bld_hotel_gable: { deep: 6, cols: 10, floors: 4, style: 'hotel', door: 'center', balcony: true, sign: false, roofType: 'gable', roofColors: { tile: '#7a3a2c' }, colors: { wall: '#6a6460', wall2: '#5c5652' } },
    bld_villa: { deep: 6, cols: 8, floors: 2, style: 'colonial', door: 'center', sign: false, roofType: 'hip', roofColors: { tile: '#8a4030' } },
    bld_colonial: { deep: 7, cols: 12, floors: 3, style: 'colonial', door: 'center', sign: true, signGlow: '#f2d48a', roofType: 'dome', roofColors: { dome: '#4f7466' } },
    bld_tower: { deep: 7, cols: 10, floors: 4, style: 'modern', door: 'center', sign: false, tower: { cols: 7, floors: 5, deep: 5, inset: 48, back: 30, style: 'glass' } },
    bld_tower2: { deep: 6, cols: 8, floors: 3, style: 'glass', door: 2, sign: false, tower: { cols: 5, floors: 4, deep: 4, inset: 48, back: 30, style: 'modern' } },
    bld_btn_hcm: { deep: 7, cols: 12, floors: 4, style: 'modern', door: 'center', sign: true, signGlow: '#c8323c', tower: { cols: 8, floors: 4, deep: 5, inset: 64, back: 32, style: 'modern' } },
    bld_tube1: { deep: 6, cols: 3, floors: 3, style: 'tube', door: 0, shop: 'shutter', sign: false, colors: { wall: '#c98a5a', wall2: '#b07a4e' }, roofType: 'gable', pitch: 0.35, roofColors: { tile: '#5f6a76' }, roofTile: 'tin' },
    bld_tube2: { deep: 6, cols: 3, floors: 4, style: 'tube', door: 0, shop: 'glass', sign: false, colors: { wall: '#6a9a9a', wall2: '#5a8686' }, roof: ['tank'] },
    bld_tube3: { deep: 6, cols: 4, floors: 2, style: 'tube', door: 1, shop: 'glass', awning: '#9a3a3a', sign: false, colors: { wall: '#d6c49a', wall2: '#c2b088' }, roofType: 'gable', pitch: 0.4, roofColors: { tile: '#8a4030' } },
    bld_tube4: { deep: 6, cols: 3, floors: 5, style: 'tube', door: 0, shop: 'shutter', sign: false, colors: { wall: '#8a7aa8', wall2: '#786a94' }, roof: ['tank', 'ac'] },
    bld_tube5: { deep: 6, cols: 4, floors: 3, style: 'tube', door: 1, shop: 'glass', awning: '#2f5446', sign: false, colors: { wall: '#9ab06a', wall2: '#889c5c' }, roof: ['garden'] },
    bld_home: { deep: 6, cols: 4, floors: 4, style: 'tube', door: 1, sign: true, signGlow: '#f2c46b', colors: { wall: '#c98a8a', wall2: '#b07676' }, roof: ['tank', 'garden'] },
    bld_market: { deep: 6, cols: 10, floors: 1, style: 'colonial', door: 'center', shop: 'glass', awning: '#8a5a2a', sign: true, signGlow: '#f2c46b', roofType: 'hip', pitch: 0.35, roofColors: { tile: '#7a3a2c' } },
    bld_coach: { deep: 6, cols: 10, floors: 1, style: 'modern', door: 'center', shop: 'glass', sign: true, signGlow: '#3aa7a3', roofType: 'gable', pitch: 0.25, roofColors: { tile: '#5f6a76' }, roofTile: 'tin' }
  };
  // bản isometric của đồ phẳng (thảm)
  for (const [k, p] of Object.entries(P)) if (p.meta.flat && !p.meta.shadow) P[`${k}@flat`] = { img: flatIso(p.img), meta: { base: [0, 0], flat: true, fw: p.img.w, fh: p.img.h } };
  // bản isometric của đồ dán tường (cắt xiên theo mặt tường)
  for (const [k, p] of Object.entries(P)) if (p.meta.wall) P[`${k}@iso`] = { img: shearIso(p.img), meta: { base: [0, 0], wall: true, isoOf: k, h0: p.img.h } };
  for (const [k, o] of Object.entries(B)) { const { img, meta } = buildingIso(o); P[k] = { img, meta }; }
  // đồ vật thành khối isometric: [chiều sâu chân đế (px logic), hàng bắt đầu đẩy khối]
  const ISO = {
    desk_pc: [28, 22], desk_papers: [28, 22], desk_lab: [28, 22], cabinet: [20, 0], bookshelf: [22, 0], reception: [34, 16], printer: [26, 0],
    filing_boxes: [22, 0], meeting_table: [56, 16], archive_shelf: [24, 0], cafe_counter: [30, 22], coffee_table: [26, 8], sofa: [30, 0],
    water_cooler: [18, 24], trash: [14, 0], dev_computer: [28, 22], dev_detector: [26, 0], dev_archive: [28, 30], dev_magnifier: [30, 28],
    dev_monitor: [16, 0], kiosk: [44, 0], bus_stop: [32, 0], market_stall: [40, 0], street_bin: [16, 0], planter: [24, 0], bench: [18, 0], barrier: [8, 0], barrier_ns: [96, 0],
    tour_boat: [96, 0], bed: [76, 14]
  };
  // đồ có món đặt trên mặt (tách thành khối riêng); đồ có bản quay về đông
  const ON_TOP = new Set(['desk_pc', 'desk_papers', 'desk_lab', 'dev_computer', 'dev_magnifier', 'dev_archive', 'reception', 'cafe_counter']);
  const FACE_EAST = new Set(['bookshelf', 'cabinet', 'archive_shelf', 'filing_boxes', 'sofa', 'printer', 'water_cooler']);
  for (const [k, [d, fromY]] of Object.entries(ISO)) {
    const p = P[k];
    if (!p) continue;
    const mk = (src, name) => {
      const r = isoExtrude(src, d, fromY);
      const lights = (p.meta.lights || []).map(([x, y, c, rr, i]) => [x, Math.ceil(d / 2) + y + x / 2, c, rr, i]);
      P[name] = { img: r.img, meta: { ...p.meta, lights, iso: { ay: r.ay, fw: r.fw, d: r.d } } };
    };
    if (ON_TOP.has(k)) {
      const r = isoWithItems(p.img, d, fromY);
      const lights = (p.meta.lights || []).map(([x, y, c, rr, i]) => [x, Math.ceil(d / 2) + y + x / 2, c, rr, i]);
      P[`${k}@iso`] = { img: r.img, meta: { ...p.meta, lights, iso: { ay: r.ay, fw: r.fw, d: r.d } } };
    } else mk(p.img, `${k}@iso`);
    if (k === 'tour_boat') mk(mirror(p.img), `${k}@isoW`);
    // đồ áp tường tây: mặt trước quay về phía đông (vào trong phòng)
    if (FACE_EAST.has(k)) {
      const r = isoExtrude(mirror(p.img), d, fromY);
      P[`${k}@isoE`] = { img: mirror(r.img), meta: { ...p.meta, lights: [], iso: { ay: r.ay, fw: r.fw, d: r.d, east: true } } };
    }
  }
  // đồ ngoài trời dựng bằng voxel thay bản cắt xiên (đá vôi, ghế, bồn hoa...) + đồ mới (đài phun nước, luống hoa, hàng rào)
  for (const [k, v] of Object.entries(voxelProps())) {
    const base = { karst_big: [140, 100], karst: [86, 66], bench: [60, 16], planter: [60, 20], flowerbed: [60, 60], hedge: [92, 16], fountain: [104, 104] }[k];
    P[k] = { img: v.img, meta: { base, iso: { ay: v.ay, fw: v.fw, d: v.d } } };
    delete P[`${k}@iso`];
  }
  return P;
}

// ---------------------------------------------------------------- xe cộ (đúng tỉ lệ người 32x48)

/** Ô tô con 3 ô x 1,5 ô (nhìn ngang, mũi xe bên phải). */
function car(body) {
  const img = new Img(96, 50), { R, E, G } = brush(img);
  E(48, 46, 44, 3, '#00000055');
  const dark = shade(body, -0.35), light = shade(body, 0.25);
  // thân dưới
  G(4, 22, 88, 16, body, shade(body, -0.2)); R(4, 22, 88, 2, light); R(4, 36, 88, 3, dark);
  R(88, 24, 6, 10, body); R(2, 25, 4, 10, body);
  // cabin kính
  for (let y = 6; y < 22; y++) { const k = (22 - y) * 0.9; R(24 + k * 0.5, y, 48 - k * 1.2, 1, body); }
  G(28, 9, 18, 12, '#9cc4dc', '#5a88a8'); G(49, 9, 18, 12, '#9cc4dc', '#5a88a8'); R(46, 8, 3, 14, dark); R(30, 10, 5, 3, '#e6f4fb');
  // tay nắm, gương, đèn
  R(40, 26, 6, 1, dark); R(62, 26, 6, 1, dark); R(68, 14, 4, 3, dark);
  R(89, 26, 5, 4, '#ffe9a0'); R(2, 26, 3, 4, '#ff5a5a'); R(4, 34, 88, 1, '#ffffff22');
  // bánh xe
  for (const cx of [22, 74]) { E(cx, 39, 9, 9, '#14161c'); E(cx, 39, 5, 5, '#5b6170'); E(cx, 39, 2, 2, '#9aa1b3'); }
  return outline(img);
}

/** Xe buýt 7,5 ô x 2,5 ô. */
function bus() {
  const img = new Img(240, 84), { R, E, G } = brush(img);
  E(120, 80, 114, 4, '#00000055');
  G(4, 8, 232, 60, '#2e6e6c', '#24585a'); R(4, 8, 232, 4, '#4a9a96'); R(4, 62, 232, 6, '#1c4442');
  for (let x = 14; x < 200; x += 30) { G(x, 16, 26, 22, '#9cc4dc', '#5a88a8'); R(x + 2, 18, 6, 3, '#e6f4fb'); }
  G(208, 14, 24, 30, '#9cc4dc', '#5a88a8'); R(176, 40, 22, 28, '#1c4442'); R(178, 42, 8, 24, '#7aa8c4'); R(188, 42, 8, 24, '#7aa8c4');
  R(10, 46, 150, 6, '#e9e4d6'); R(10, 48, 150, 1, '#c9c2b4'); R(228, 52, 6, 6, '#ffe9a0'); R(4, 52, 4, 6, '#ff5a5a');
  R(212, 4, 20, 6, '#14161c'); R(214, 5, 16, 4, '#ff9a3a');
  for (const cx of [44, 192]) { E(cx, 68, 12, 12, '#14161c'); E(cx, 68, 7, 7, '#5b6170'); E(cx, 68, 3, 3, '#9aa1b3'); }
  return outline(img);
}

/** Xe máy có người lái đội mũ bảo hiểm, 1,5 ô x 1,5 ô. */
function scooter(body, shirt, helmet) {
  const img = new Img(50, 50), { R, E } = brush(img);
  E(25, 46, 20, 3, '#00000055');
  R(8, 30, 30, 7, body); R(30, 22, 8, 10, body); R(36, 18, 6, 3, '#3a4150'); R(12, 26, 16, 5, '#22262e'); R(40, 26, 4, 3, '#ffe9a0');
  R(18, 12, 11, 15, shirt); R(26, 16, 12, 4, shirt); R(20, 26, 9, 6, '#2d3a5a'); R(24, 31, 4, 7, '#2d3a5a'); R(23, 37, 6, 2, '#14161c');
  E(23, 7, 7, 6, helmet); R(25, 5, 6, 4, '#9cc4dc'); R(18, 11, 4, 2, '#e8c0a0');
  for (const cx of [12, 38]) { E(cx, 40, 6, 6, '#14161c'); E(cx, 40, 2, 2, '#9aa1b3'); }
  return outline(img);
}

/** Ảnh các xe (khóa → Img), lưu thành sprite riêng cho traffic.js. */
export function vehicles() {
  // ảnh nhìn ngang (cho thân va chạm) + bản isometric theo hướng chạy: _e (xuôi trục x, đông nam), _w (ngược, tây bắc)
  const base = {
    car1: car('#8a2a30'), car2: car('#2c4a6b'), car3: car('#c9ced6'), car4: car('#3a3f4d'), bus: bus(),
    bike1: scooter('#8a2a30', '#2c4a6b', '#c9a24a'), bike2: scooter('#2b303b', '#9b5a3a', '#e6ebf2')
  };
  const out = {};
  for (const [id, img] of Object.entries(base)) {
    const [d, fromY] = id === 'bus' ? [56, 0] : id.startsWith('bike') ? [16, 30] : [40, 0];
    out[id] = img;
    out[`${id}_e`] = isoExtrude(img, d, fromY).img;
    out[`${id}_w`] = isoExtrude(mirror(img), d, fromY).img;
  }
  return out;
}
