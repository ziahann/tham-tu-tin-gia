// Sinh chân dung hội thoại (bán thân 72x88, 5 biểu cảm mỗi nhân vật) cho khung thoại.
// Chạy: node tools/gen-portraits.mjs   → game/assets/portraits/<id>.png (5 cột: xem EXPRESSIONS)
// Thiết kế gốc, vẽ bằng code từ thông số trong characters.mjs (không dùng asset bên ngoài).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img } from './png.mjs';
import { CHARACTERS, shade } from './characters.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'game');
const W = 72, H = 88, CX = 36;
export const EXPRESSIONS = ['neutral', 'happy', 'thinking', 'surprised', 'serious'];
const OUTLINE = '#10141f';

// Chi tiết chỉ có ở chân dung (mắt, mi, ria, kẹp tóc...). Ghép thêm vào thông số dùng chung.
const EXTRA = {
  hero_m: { iris: '#3a2a20' },
  hero_f: { iris: '#4a2e20', lashes: true },
  npc1: { iris: '#2b1d1a', lashes: true, earrings: '#e8c66a' },
  npc2: { iris: '#3a2a20' },
  npc3: { iris: '#4b3a2a', mustache: '#d8d8d8', wrinkles: true },
  npc4: { iris: '#3a2a20' },
  npc5: { iris: '#6a3a5a', lashes: true, clip: '#f2d36b' },
  npc6: { iris: '#2b1d1a', stubble: true }
};

/** Nửa bề ngang khuôn mặt ở hàng y (đỉnh đầu y=13, cằm y=53). */
function faceHalf(y) {
  if (y < 13 || y > 53) return 0;
  if (y < 32) return Math.round(15 * Math.sqrt(Math.max(0, 1 - ((32 - y) / 19) ** 2)));
  return Math.round(15 - 8.5 * ((y - 32) / 21) ** 2);
}

/** Viền tối quanh các pixel đặc (vẽ sau cùng). */
function outlined(f) {
  const out = new Img(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (f.get(x, y)[3] > 200) continue;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < W && ny < H && f.get(nx, ny)[3] > 200;
    });
    if (near) out.set(x, y, OUTLINE);
  }
  out.blit(f, 0, 0, W, H, 0, 0);
  return out;
}

/** Thân trên: vai, cổ áo, áo trong, phụ kiện trước ngực. */
function drawBody(f, s) {
  const R = (x, y, w, h, c) => f.rect(x, y, w, h, c);
  const top = s.top, dark = shade(top, -0.28), light = shade(top, 0.18);
  // cổ
  R(CX - 6, 48, 12, 12, s.skin);
  R(CX - 6, 48, 12, 4, shade(s.skin, -0.22));
  // vai và thân (hình thang bo tròn)
  for (let y = 58; y < H; y++) {
    const hw = Math.min(34, 17 + Math.round((y - 58) * 1.4));
    R(CX - hw, y, hw * 2, 1, top);
    R(CX + hw - 4, y, 4, 1, dark);          // bóng bên phải
    R(CX - hw, y, 2, 1, light);              // viền sáng bên trái
  }
  R(CX - 17, 58, 34, 2, light);
  // nếp gấp tay áo
  R(CX - 26, 74, 1, 14, dark); R(CX + 25, 74, 1, 14, dark);
  // áo trong cổ chữ V + ve áo khoác
  if (s.inner) {
    for (let y = 58; y < 76; y++) { const hw = Math.max(0, 7 - Math.floor((y - 58) / 2.6)); R(CX - hw, y, hw * 2, 1, s.inner); }
    for (let y = 58; y < 80; y++) { const k = Math.floor((y - 58) / 2.6); R(CX - 9 + k, y, 2, 1, dark); R(CX + 7 - k, y, 2, 1, dark); }
  } else {
    // cổ tròn
    for (let x = -7; x <= 7; x++) R(CX + x, 58 + Math.round(Math.abs(x) < 6 ? 2 - (x * x) / 18 : 0), 1, 2, dark);
  }
  if (s.backpack) {
    const st = shade(s.backpack, -0.3);
    R(CX - 22, 60, 5, 28, st); R(CX + 17, 60, 5, 28, st);
    R(CX - 22, 60, 5, 1, shade(s.backpack, 0.1)); R(CX + 17, 60, 5, 1, shade(s.backpack, 0.1));
    R(CX - 21, 78, 3, 2, '#c9d1dc'); R(CX + 18, 78, 3, 2, '#c9d1dc');
  }
  if (s.press) {
    // dây đỏ + thẻ phóng viên thực tập
    for (let y = 58; y < 72; y++) { R(CX - 8 + Math.floor((y - 58) / 3), y, 1, 1, '#c8323c'); R(CX + 8 - Math.floor((y - 58) / 3), y, 1, 1, '#c8323c'); }
    R(CX - 6, 72, 13, 15, '#ffffff'); R(CX - 6, 72, 13, 3, '#3d7fd1');
    R(CX - 4, 77, 4, 5, '#b4b8c5'); R(CX + 1, 77, 5, 1, '#5b5d6e'); R(CX + 1, 79, 4, 1, '#5b5d6e'); R(CX - 4, 84, 9, 1, '#5b5d6e');
  }
  if (s.lanyard) {
    for (let y = 58; y < 74; y++) { R(CX - 8 + Math.floor((y - 58) / 3), y, 1, 1, '#c8323c'); R(CX + 8 - Math.floor((y - 58) / 3), y, 1, 1, '#c8323c'); }
    R(CX - 5, 74, 11, 12, '#f2d36b'); R(CX - 3, 76, 7, 2, '#3d5a98'); R(CX - 3, 80, 7, 1, '#7a5a20');
  }
  if (s.camera) {
    for (let i = 0; i < 26; i++) R(CX + 14 - i, 58 + i, 2, 1, '#22252e');
    R(CX - 24, 74, 18, 12, '#2b2f3a'); R(CX - 24, 74, 18, 2, '#4a5060');
    f.ellipse(CX - 15, 80, 4, 4, '#14161c'); f.ellipse(CX - 15, 80, 2, 2, '#5fb3d9'); R(CX - 16, 79, 1, 1, '#ffffff');
    R(CX - 21, 72, 4, 2, '#4a5060');
  }
  if (s.phone) {
    // tay cầm điện thoại trước ngực
    R(CX + 6, 70, 12, 16, '#1b1d24'); R(CX + 7, 71, 10, 13, '#7fd6ff'); R(CX + 8, 73, 8, 1, '#ffffff'); R(CX + 8, 76, 6, 1, '#c8e9ff');
    R(CX + 3, 80, 8, 8, s.skin); R(CX + 3, 80, 8, 1, shade(s.skin, 0.1)); R(CX + 15, 78, 4, 6, s.skin);
  }
}

/** Tóc phía sau đầu (vẽ trước mặt). */
function drawHairBack(f, s) {
  const hair = shade(s.hair, -0.18);
  if (s.hairStyle === 'long') {
    for (let y = 18; y < 82; y++) { const hw = y < 30 ? 19 : y > 70 ? 19 - (y - 70) : 20; f.rect(CX - hw, y, hw * 2, 1, hair); }
  }
  if (s.hairStyle === 'bob') {
    for (let y = 18; y < 52; y++) f.rect(CX - 19, y, 38, 1, hair);
    f.rect(CX - 19, 52, 38, 1, shade(hair, -0.25));
  }
}

/** Khuôn mặt (da, tai, bóng). */
function drawFace(f, s) {
  const skin = s.skin, dark = shade(skin, -0.16), light = shade(skin, 0.12);
  for (let y = 13; y <= 53; y++) {
    const hw = faceHalf(y);
    f.rect(CX - hw, y, hw * 2 + 1, 1, skin);
    f.rect(CX + hw - 2, y, 3, 1, dark);   // bóng má phải
    if (y > 20 && y < 44) f.rect(CX - hw + 1, y, 1, 1, light);
  }
  // tai
  for (const side of [-1, 1]) {
    const ex = side < 0 ? CX - 17 : CX + 15;
    f.rect(ex, 30, 3, 9, side < 0 ? skin : dark);
    f.rect(ex + (side < 0 ? 1 : 1), 32, 1, 5, shade(skin, -0.28));
  }
  // bóng dưới cằm
  f.rect(CX - 5, 54, 11, 1, shade(skin, -0.3));
  if (s.wrinkles) { f.rect(CX - 12, 40, 2, 1, dark); f.rect(CX + 11, 40, 2, 1, dark); f.rect(CX - 4, 22, 9, 1, dark); }
  if (s.stubble) for (let y = 44; y <= 53; y++) for (let x = -faceHalf(y) + 2; x <= faceHalf(y) - 2; x++) if ((x + y) % 3 === 0 && (y > 48 || Math.abs(x) > 6)) f.set(CX + x, y, '#00000030');
}

/** Một con mắt ở (x, y) theo biểu cảm. side: -1 trái, 1 phải. */
function drawEye(f, s, x, y, expr, side) {
  const R = (a, b, w, h, c) => f.rect(a, b, w, h, c);
  const ink = '#1a1420', iris = s.iris || '#2b1d1a';
  if (expr === 'happy') {
    // mắt cười: vòng cung úp
    R(x - 3, y, 1, 1, ink); R(x - 2, y - 1, 1, 1, ink); R(x - 1, y - 2, 3, 1, ink); R(x + 2, y - 1, 1, 1, ink); R(x + 3, y, 1, 1, ink);
    if (s.lashes) R(side < 0 ? x - 4 : x + 4, y - 1, 1, 1, ink);
    return;
  }
  const open = expr === 'surprised' ? 6 : expr === 'serious' ? 3 : expr === 'thinking' ? 4 : 5;
  const top = y - Math.ceil(open / 2);
  R(x - 3, top, 7, open, '#fbf8f0');
  R(x - 3, top, 1, 1, s.skin); R(x + 3, top, 1, 1, s.skin);
  const ix = expr === 'thinking' ? x + 1 : x - 1;
  const iy = expr === 'thinking' ? top : expr === 'surprised' ? top + 2 : top + Math.max(0, open - 4);
  const ih = expr === 'surprised' ? 2 : Math.min(4, open);
  const iw = expr === 'surprised' ? 2 : 3;
  R(expr === 'surprised' ? x : ix, iy, iw, ih, iris);
  R((expr === 'surprised' ? x : ix) + 1, iy + 1, 1, Math.max(1, ih - 2), '#0b0a10');
  R(expr === 'surprised' ? x : ix, iy, 1, 1, '#ffffff');
  // mí trên
  R(x - 3, top - 1, 7, 1, ink);
  if (expr === 'serious') R(x - 3, top, 7, 1, shade(s.skin, -0.25));
  if (s.lashes) { R(side < 0 ? x - 4 : x + 4, top - 1, 1, 1, ink); R(side < 0 ? x - 5 : x + 5, top - 2, 1, 1, ink); }
  R(x - 2, top + open, 5, 1, shade(s.skin, -0.2));
}

/** Lông mày theo biểu cảm. */
function drawBrow(f, s, x, y, expr, side) {
  const c = s.hairStyle === 'grey' ? '#9a9a9a' : shade(s.hair, -0.1);
  const inner = side < 0 ? x + 3 : x - 3; // đầu lông mày phía sống mũi
  let dyIn = 0, dyOut = 0;
  if (expr === 'surprised') { dyIn = -3; dyOut = -3; }
  if (expr === 'happy') { dyIn = -1; dyOut = -1; }
  if (expr === 'serious') { dyIn = 2; dyOut = 0; }
  if (expr === 'thinking') { if (side > 0) { dyIn = -2; dyOut = -3; } else { dyIn = 1; dyOut = 0; } }
  for (let i = 0; i < 7; i++) {
    const px = side < 0 ? x - 3 + i : x + 3 - i;
    const t = i / 6; // 0 = phía ngoài, 1 = phía trong
    const py = y + Math.round(dyOut + (dyIn - dyOut) * t) - (i > 1 && i < 5 && expr !== 'serious' ? 1 : 0);
    f.rect(px, py, 1, 2, c);
  }
  void inner;
}

/** Miệng theo biểu cảm. */
function drawMouth(f, s, expr) {
  const R = (x, y, w, h, c) => f.rect(x, y, w, h, c);
  const lip = '#8a3a3a', y = 46;
  if (expr === 'happy') {
    R(CX - 4, y, 9, 3, '#5a1e22'); R(CX - 3, y, 7, 1, '#ffffff'); R(CX - 2, y + 2, 5, 1, '#d86a72');
    R(CX - 5, y - 1, 1, 1, lip); R(CX + 5, y - 1, 1, 1, lip);
  } else if (expr === 'surprised') {
    R(CX - 1, y - 1, 3, 4, '#5a1e22'); R(CX - 2, y, 1, 2, '#5a1e22'); R(CX + 2, y, 1, 2, '#5a1e22');
  } else if (expr === 'thinking') {
    R(CX, y, 4, 1, lip); R(CX - 1, y + 1, 1, 1, lip);
  } else if (expr === 'serious') {
    R(CX - 3, y, 7, 1, lip); R(CX - 4, y + 1, 1, 1, lip); R(CX + 4, y + 1, 1, 1, lip);
  } else {
    R(CX - 3, y, 7, 1, lip); R(CX - 4, y - 1, 1, 1, lip); R(CX + 4, y - 1, 1, 1, lip);
  }
  if (s.mustache) { R(CX - 6, y - 3, 13, 2, s.mustache); R(CX - 7, y - 2, 2, 2, s.mustache); R(CX + 6, y - 2, 2, 2, s.mustache); }
}

/** Tóc phía trước (mái, hai bên). */
function drawHairFront(f, s) {
  const hair = s.hair, dark = shade(hair, -0.25), light = shade(hair, 0.22);
  const hs = s.hairStyle;
  // chỏm đầu: elip phủ phía trên đường chân tóc
  const hairline = x => {
    const d = x - CX;
    if (hs === 'grey') return 22 + (Math.abs(d) > 10 ? 6 : 0);
    if (hs === 'bob') return 26;
    if (hs === 'long') return d < -2 ? 24 + Math.floor((d + 15) / 6) : 22 + Math.floor(d / 4);  // rẽ ngôi lệch
    if (hs === 'spiky') return 22 + ((x >> 2) % 2 ? 2 : 0);
    return 23 + ((x >> 2) % 2 ? 1 : 0) - (d > 6 ? 1 : 0);
  };
  for (let y = 7; y < 34; y++) for (let x = CX - 19; x <= CX + 19; x++) {
    const inHead = ((x - CX) / 18.5) ** 2 + ((y - 26) / 17) ** 2 <= 1;
    if (!inHead || y >= hairline(x)) continue;
    f.set(x, y, (x - CX) > 9 ? dark : hair);
  }
  // hai bên thái dương
  const sideDepth = hs === 'grey' ? 30 : hs === 'long' ? 50 : hs === 'bob' ? 50 : 32;
  for (let y = 20; y < sideDepth; y++) {
    const hw = faceHalf(Math.min(y, 40));
    const w = hs === 'long' || hs === 'bob' ? 4 : 3;
    f.rect(CX - hw - 2, y, w, 1, hair);
    f.rect(CX + hw - w + 3, y, w, 1, dark);
  }
  // sợi sáng
  for (let x = CX - 10; x < CX + 4; x += 3) f.rect(x, 12 + ((x >> 1) % 2), 2, 1, light);
  // tóc dựng: các chỏm tam giác chân rộng, nghiêng nhẹ sang phải
  if (hs === 'spiky') for (const [x, h] of [[CX - 15, 5], [CX - 8, 7], [CX - 1, 7], [CX + 6, 6], [CX + 12, 4]]) {
    for (let i = 0; i < h; i++) { const w = Math.max(1, 7 - Math.round((i * 7) / h)); f.rect(x + Math.floor(i / 2), 11 - i, w, 1, i === 0 ? hair : i > h - 3 ? light : hair); }
  }
  if (hs === 'grey') { f.rect(CX - 10, 9, 20, 1, '#ffffff'); f.rect(CX - 14, 12, 4, 1, '#ffffff'); }
  if (hs === 'bob') for (let x = CX - 13; x <= CX + 13; x += 4) f.rect(x, 25, 2, 2, dark);
  if (s.clip) { f.rect(CX + 9, 17, 5, 3, s.clip); f.rect(CX + 10, 16, 3, 5, s.clip); f.set(CX + 11, 18, '#ffffff'); }
}

/** Phụ kiện trên đầu: kính, bút gài tai, mũ lưỡi trai, hoa tai. */
function drawHeadAccessories(f, s) {
  if (s.glasses) {
    const c = '#232838';
    for (const ex of [CX - 7, CX + 7]) { f.frame(ex - 5, 29, 11, 8, c); f.rect(ex - 4, 30, 9, 1, '#ffffff40'); }
    f.rect(CX - 1, 31, 3, 1, c);
    f.rect(CX - 17, 31, 6, 1, c); f.rect(CX + 12, 31, 6, 1, c);
  }
  if (s.pen) { for (let i = 0; i < 12; i++) f.rect(CX + 15 + Math.floor(i / 6), 20 + i, 2, 1, i < 2 ? '#c8323c' : '#f2d36b'); }
  if (s.earrings) { f.rect(CX - 17, 39, 2, 3, s.earrings); f.rect(CX + 16, 39, 2, 3, s.earrings); }
  if (s.cap) {
    const c = s.cap, d = shade(c, -0.3);
    for (let y = 8; y < 22; y++) { const hw = Math.round(17 * Math.sqrt(Math.max(0, 1 - ((22 - y) / 15) ** 2))); f.rect(CX - hw, y, hw * 2 + 1, 1, c); }
    f.rect(CX - 18, 21, 37, 3, d); f.rect(CX - 20, 23, 41, 2, shade(c, -0.45));
    f.rect(CX - 2, 9, 5, 1, shade(c, 0.25)); f.rect(CX - 4, 13, 9, 4, '#f4eedc'); f.rect(CX - 3, 14, 7, 2, c);
  }
}

/** Một chân dung người theo biểu cảm. */
function drawPerson(spec, expr) {
  const s = spec;
  const f = new Img(W, H);
  drawHairBack(f, s);
  drawBody(f, s);
  drawFace(f, s);
  for (const side of [-1, 1]) {
    drawEye(f, s, CX + side * 7, 33, expr, side);
    drawBrow(f, s, CX + side * 7, 26, expr, side);
  }
  // mũi
  f.rect(CX + 1, 37, 1, 3, shade(s.skin, -0.2)); f.rect(CX - 1, 40, 3, 1, shade(s.skin, -0.25)); f.set(CX, 38, shade(s.skin, 0.2));
  if (expr === 'happy' || expr === 'surprised') { f.rect(CX - 12, 40, 4, 1, '#e8828a90'); f.rect(CX + 9, 40, 4, 1, '#e8828a90'); }
  drawMouth(f, s, expr);
  drawHairFront(f, s);
  drawHeadAccessories(f, s);
  if (expr === 'surprised') { f.rect(CX + 19, 20, 2, 4, '#9fd8ff'); f.rect(CX + 18, 23, 4, 2, '#9fd8ff'); }
  if (expr === 'thinking') { [[CX + 22, 10], [CX + 26, 6], [CX + 30, 3]].forEach(([x, y], i) => f.rect(x, y, 2 + i, 2 + i, '#e6ebf2')); }
  return outlined(f);
}

/** Boss: mũ trùm, áo choàng ghép khung ảnh trống, mặt nạ gương. mood: neutral | smug | cracked | blank | angry. */
function drawBoss(mood) {
  const f = new Img(W, H);
  const R = (x, y, w, h, c) => f.rect(x, y, w, h, c);
  const cloak = '#232044', cloakD = '#16142c', cloakL = '#35315e';
  for (let y = 46; y < H; y++) { const hw = Math.min(35, 16 + Math.round((y - 46) * 0.9)); R(CX - hw, y, hw * 2, 1, cloak); R(CX + hw - 5, y, 5, 1, cloakD); }
  [[CX - 28, 62, 12, 10], [CX + 12, 58, 14, 10], [CX - 10, 70, 13, 11], [CX + 8, 74, 12, 10], [CX - 30, 78, 11, 9]].forEach(([x, y, w, h]) => {
    f.frame(x, y, w, h, '#8f95a8'); R(x + 1, y + 1, w - 2, h - 2, '#2e2a4e'); R(x + 2, y + 2, w - 4, 1, '#ffffff18');
  });
  // mũ trùm
  for (let y = 6; y < 56; y++) {
    const hw = y < 20 ? Math.round(20 * Math.sqrt(Math.max(0, 1 - ((20 - y) / 14) ** 2))) : 20 + Math.floor((y - 20) / 6);
    R(CX - hw, y, hw * 2 + 1, 1, cloak); R(CX - hw, y, 2, 1, cloakL);
  }
  for (let y = 18; y < 54; y++) { const hw = faceHalf(Math.min(y + 1, 52)) - 1; R(CX - hw, y, hw * 2 + 1, 1, '#0a0914'); }
  if (mood === 'blank') {
    f.frame(CX - 11, 24, 23, 26, '#b4b8c5'); f.frame(CX - 10, 25, 21, 24, '#5b5d6e');
    return outlined(f);
  }
  // mặt nạ gương
  for (let y = 22; y < 52; y++) { const hw = faceHalf(y + 1) - 3; R(CX - hw, y, hw * 2 + 1, 1, '#d6dce6'); R(CX + hw - 3, y, 3, 1, '#aab2c2'); R(CX - hw + 1, y, 1, 1, '#ffffff'); }
  const glow = mood === 'angry' ? '#ff5a6a' : '#b28cff';
  if (mood === 'smug') { R(CX - 10, 33, 6, 1, '#14101f'); R(CX - 11, 32, 1, 1, '#14101f'); R(CX + 5, 33, 6, 1, '#14101f'); R(CX + 11, 32, 1, 1, '#14101f'); R(CX - 3, 43, 8, 1, '#14101f'); R(CX + 5, 42, 2, 1, '#14101f'); }
  else if (mood === 'angry') { R(CX - 10, 31, 6, 3, '#14101f'); R(CX + 5, 31, 6, 3, '#14101f'); R(CX - 9, 32, 3, 1, glow); R(CX + 7, 32, 3, 1, glow); R(CX - 4, 44, 9, 1, '#14101f'); R(CX - 5, 45, 1, 1, '#14101f'); R(CX + 5, 45, 1, 1, '#14101f'); }
  else { R(CX - 10, 32, 6, 2, '#14101f'); R(CX + 5, 32, 6, 2, '#14101f'); R(CX - 8, 32, 2, 1, glow); R(CX + 7, 32, 2, 1, glow); R(CX - 3, 43, 7, 1, '#14101f'); }
  // vết nứt
  const crack = [[CX - 4, 22], [CX - 3, 25], [CX - 1, 27], [CX, 30], [CX - 1, 33], [CX + 1, 36], [CX + 3, 38]];
  if (mood === 'cracked') crack.push([CX + 4, 41], [CX + 6, 44], [CX + 5, 47], [CX - 6, 36], [CX - 9, 38], [CX - 11, 41], [CX + 8, 28], [CX + 10, 25]);
  crack.forEach(([x, y]) => R(x, y, 1, 3, '#4a4e60'));
  if (mood === 'cracked') { R(CX + 6, 46, 6, 5, '#0a0914'); R(CX + 7, 45, 3, 1, '#0a0914'); }
  return outlined(f);
}

/** Ghép 5 biểu cảm thành một dải ngang. */
function sheetOf(draw, moods) {
  const sheet = new Img(W * moods.length, H);
  moods.forEach((m, i) => sheet.blit(draw(m), 0, 0, W, H, i * W, 0));
  return sheet;
}

for (const [id, spec] of Object.entries(CHARACTERS)) {
  sheetOf(e => drawPerson({ ...spec, ...EXTRA[id] }, e), EXPRESSIONS).save(path.join(ROOT, `assets/portraits/${id}.png`));
}
// Boss: cột theo thứ tự neutral, smug (≈ happy), cracked (≈ surprised), blank (gỡ mặt nạ), angry (≈ serious)
sheetOf(drawBoss, ['neutral', 'smug', 'cracked', 'blank', 'angry']).save(path.join(ROOT, 'assets/portraits/boss.png'));
console.log('portraits ok');
