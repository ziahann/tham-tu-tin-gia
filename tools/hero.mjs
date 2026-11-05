// Sprite người chơi hero_m / hero_f: nhóm tự thiết kế và vẽ bằng code (CC0). Phong cách chibi pixel (đầu to, đổ bóng nhiều sắc độ,
// viền màu chọn lọc, khăn bay) — nhân vật riêng: sinh viên Văn Lang, khăn đỏ, balo đỏ, thẻ dây xanh ngọc.
// Mỗi khung dựng từ khối (elip, khối bo, ống) có đổ bóng theo ánh sáng góc trên trái, rồi tự viền theo chất liệu.
// Sheet giữ bố cục game: 9 cột x 6 hàng khung 64x64 (hàng 0 xuống, 1 trái, 2 phải, 3 lên, 4–5 ngồi), chân ở y = 62.
import { Img } from './png.mjs';

const F = 64;
// chất liệu: [viền, tối, vừa, sáng, rất sáng]
const MAT = {
  hair: ['#1e1214', '#3b2420', '#5a3828', '#7b4f36', '#a06c48'],
  skin: ['#5e2f2a', '#c27b62', '#e8a888', '#f7c9a6', '#fde2cb'],
  shirt: ['#3a3e52', '#7f859c', '#b4b9c8', '#e1e4ec', '#fafbfd'],
  pink: ['#4a2a36', '#a8667c', '#d495a8', '#f0c2cf', '#fbe2e9'],
  pants: ['#0d1022', '#1b2340', '#27325a', '#384878', '#4d5f96'],
  pantsFar: ['#0a0c1a', '#141a32', '#1b2340', '#27325a', '#33416c'],
  scarf: ['#24060c', '#4a0c18', '#701426', '#9a1e30', '#bd3a44'],
  shoe: ['#160e0c', '#33221a', '#4f3426', '#6f4a36', '#8c6248'],
  pack: ['#1a0a10', '#6a1222', '#9a1a2e', '#c0263a', '#da4a56'],
  trim: ['#0e1422', '#1f2a44', '#2c3a5c', '#3c4c74', '#4e608c']
};
const EYE = '#1a1020', IRIS = '#6a4430', IRIS_D = '#3a2418', SHINE = '#ffffff', BLUSH = '#e88c86', MOUTH = '#8a3f38', TEAL = '#2ec4b6', CARD = '#f4f2ec';
const LX = -0.55, LY = -0.83; // hướng tới nguồn sáng

/** Lớp vẽ một khung: lưu chất liệu, sắc độ, thứ tự lớp; render ra Img có tự viền. */
class Frame {
  constructor() { this.mat = new Array(F * F).fill(null); this.tone = new Int8Array(F * F); this.layer = new Int16Array(F * F); this.n = 0; this.over = new Map(); }
  put(x, y, mat, t) {
    if (x < 0 || y < 0 || x >= F || y >= F) return;
    const i = y * F + x; this.mat[i] = mat; this.layer[i] = this.n;
    this.tone[i] = t > 0.5 ? 4 : t > 0.05 ? 3 : t > -0.45 ? 2 : 1;
  }
  shape(mat, x0, y0, x1, y1, inside, clip) {
    this.n++;
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      if (clip && !clip(x, y)) continue;
      const n = inside(x + 0.5, y + 0.5); if (n) this.put(x, y, mat, n[0] * LX + n[1] * LY);
    }
    return this;
  }
  ellipse(cx, cy, rx, ry, mat, clip) {
    return this.shape(mat, cx - rx, cy - ry, cx + rx, cy + ry, (x, y) => { const nx = (x - cx) / rx, ny = (y - cy) / ry; return nx * nx + ny * ny <= 1 ? [nx, ny] : null; }, clip);
  }
  box(x0, y0, x1, y1, mat, clip) { // khối bo tròn góc
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hx = (x1 - x0) / 2, hy = (y1 - y0) / 2;
    return this.shape(mat, x0, y0, x1, y1, (x, y) => {
      const nx = (x - cx) / hx, ny = (y - cy) / hy;
      if (Math.abs(nx) > 1 || Math.abs(ny) > 1 || nx ** 4 + ny ** 4 > 1) return null;
      return [nx * Math.abs(nx), ny * Math.abs(ny)];
    }, clip);
  }
  capsule(x1, y1, x2, y2, r, mat, clip) {
    const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1;
    return this.shape(mat, Math.min(x1, x2) - r, Math.min(y1, y2) - r, Math.max(x1, x2) + r, Math.max(y1, y2) + r, (x, y) => {
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L2)), px = x - (x1 + t * dx), py = y - (y1 + t * dy);
      const d = Math.hypot(px, py); return d <= r ? [px / r, py / r] : null;
    }, clip);
  }
  tri(pts, mat) { // tam giác (lọn tóc), bóng theo độ cao
    const ys = pts.map(p => p[1]), xs = pts.map(p => p[0]), top = Math.min(...ys), h = Math.max(...ys) - top || 1, cx = xs.reduce((a, b) => a + b) / 3;
    const sign = (p, a, b) => (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1]);
    return this.shape(mat, Math.min(...xs), top, Math.max(...xs), Math.max(...ys), (x, y) => {
      const p = [x, y], d1 = sign(p, pts[0], pts[1]), d2 = sign(p, pts[1], pts[2]), d3 = sign(p, pts[2], pts[0]);
      if ((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)) return null;
      return [(x - cx) / 4, ((y - top) / h) * 1.6 - 0.9];
    });
  }
  dot(x, y, color) { this.over.set(y * F + x, color); return this; }
  /** Ra Img: tô sắc độ, viền ngoài theo chất liệu, nét bóng nơi khối trên chồng khối dưới. */
  render(img, fx, fy) {
    const at = (x, y) => (x < 0 || y < 0 || x >= F || y >= F ? -1 : y * F + x);
    for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
      const i = y * F + x, m = this.mat[i];
      let color = null;
      if (m) {
        color = MAT[m][this.tone[i]];
        for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
          const j = at(x + dx, y + dy);
          if (j >= 0 && this.mat[j] && this.mat[j] !== m && this.layer[j] > this.layer[i] && !(m === 'skin' && this.mat[j] === 'skin')) { color = MAT[m][Math.max(0, Math.min(1, this.tone[i] - 2))]; break; }
        }
      } else {
        let best = -1;
        for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) { const j = at(x + dx, y + dy); if (j >= 0 && this.mat[j] && this.layer[j] > best) { best = this.layer[j]; color = MAT[this.mat[j]][0]; } }
      }
      const o = this.over.get(i); if (o) color = o;
      if (color) img.set(fx + x, fy + y, color);
    }
  }
}

const mx = x => 64 - x; // lật quanh trục giữa khung
// bước đi trước / lưng: [nhấc chân trái, nhấc chân phải, nhún, vung tay]
const STEPS = [[1, 0, 0, 1], [2, 0, -1, 1], [1, 0, 0, 1], [0, 0, 0, 0], [0, 1, 0, -1], [0, 2, -1, -1], [0, 1, 0, -1], [0, 0, 0, 0]];
// bước đi ngang: [vung chân gần, nhấc gần, nhấc xa, nhún]
const SIDE_STEPS = [[4, 0, 0, 0], [2, 0, 1, -1], [0, 0, 2, -1], [-2, 0, 1, 0], [-4, 0, 0, 0], [-2, 1, 0, -1], [0, 2, 0, -1], [2, 1, 0, 0]];

function legs(f, la, ra) {
  for (const [x, lift] of [[29.5, la], [34.5, ra]]) {
    f.capsule(x, 50, x, 57.5 - lift, 2.3, 'pants');
    f.ellipse(x + (x < 32 ? -0.4 : 0.4), 60.4 - lift, 2.9, 1.7, 'shoe');
  }
}
function arm(f, sx, sy, hx, hy, shirt, sleeve = 0.4) {
  const ex = sx + (hx - sx) * sleeve, ey = sy + (hy - sy) * sleeve;
  f.capsule(sx, sy, ex, ey, 1.9, shirt);
  f.capsule(ex, ey, hx, hy, 1.5, 'skin');
  f.ellipse(hx, hy + 0.5, 1.7, 1.7, 'skin');
}
function hairCap(f, cx, clip) { f.ellipse(cx, 26.5, 9.6, 7.2, 'hair', clip); }

/** Mặt trước / lưng. */
function front(back, step, female) {
  const f = new Frame(), [la, ra, bob, sw] = step == null ? [0, 0, 0, 0] : STEPS[step], b = bob, shirt = female ? 'pink' : 'shirt';
  const sway = step == null ? 0 : step < 4 ? 1 : -1;
  if (!back) f.capsule(39, 39 + b, 42 + sway, 45 + b, 1.4, 'scarf'); // đuôi khăn ló sau vai
  legs(f, la, ra);
  f.box(26, 38 + b, 38, 50 + b, shirt);
  f.box(26.5, 47.5 + b, 37.5, 52 + b, 'pants');
  arm(f, 25.6, 40 + b, 24.6 - sw * 0.5, 47.6 + b - Math.abs(sw) * 0.5, shirt);
  arm(f, mx(25.6), 40 + b, mx(24.6) - sw * 0.5, 47.6 + b - Math.abs(sw) * 0.5, shirt);
  if (!back) {
    for (let y = 40; y <= 46; y++) { f.dot(27, y + b, MAT.pack[3]); f.dot(37, y + b, MAT.pack[2]); }
    [[29, 40], [30, 41], [31, 42], [35, 40], [34, 41], [33, 42]].forEach(([x, y]) => f.dot(x, y + b, TEAL));
    for (let y = 43; y <= 45; y++) for (let x = 31; x <= 33; x++) f.dot(x, y + b, y === 45 ? MAT.shirt[1] : CARD);
  } else {
    f.box(25, 38.5 + b, 39, 50 + b, 'pack');
    f.box(25, 46.5 + b, 39, 50 + b, 'trim');
    [[31, 41], [32, 41], [33, 41], [31, 42], [32, 42], [33, 42], [32, 43], [32, 40]].forEach(([x, y]) => f.dot(x, y + b, CARD));
  }
  f.ellipse(32, 37.6 + b, 6.6, 2, 'scarf');
  if (!back) f.capsule(35.5, 38.5 + b, 36.5 + sway * 0.5, 42.5 + b, 1.3, 'scarf');
  else f.capsule(33, 38 + b, 34 + sway, 46 + b, 1.4, 'scarf');
  // đầu
  if (female) { f.capsule(24, 28 + b, 23.6, 37 + b, 2, 'hair'); f.capsule(mx(24), 28 + b, mx(23.6), 37 + b, 2, 'hair'); }
  if (!back) {
    f.ellipse(32, 30.5 + b, 7.6, 6.6, 'skin');
    f.ellipse(24.3, 31 + b, 1.3, 1.8, 'skin'); f.ellipse(mx(24.3), 31 + b, 1.3, 1.8, 'skin');
    hairCap(f, 32, (x, y) => y <= 26 + b || (Math.abs(x + 0.5 - 32) >= 7 && y <= 30 + b));
    for (const t of [[[25, 23], [29, 23], [25.5, 30.5]], [[28, 23], [33, 23], [30, 29.5]], [[31, 23], [36, 23], [34.5, 29]], [[35, 23], [39.5, 24], [39, 30.5]]]) f.tri(t.map(([x, y]) => [x, y + b]), 'hair');
    // mắt, miệng, má
    for (const ex of [28, 35]) {
      for (let x = ex - (ex < 32 ? 1 : 0); x <= ex + 1 + (ex < 32 ? 0 : 1); x++) f.dot(x, 29 + b, EYE);
      f.dot(ex, 30 + b, IRIS); f.dot(ex + 1, 30 + b, SHINE); f.dot(ex, 31 + b, IRIS); f.dot(ex + 1, 31 + b, IRIS); f.dot(ex, 32 + b, IRIS_D); f.dot(ex + 1, 32 + b, IRIS_D);
    }
    f.dot(31, 35 + b, MOUTH); f.dot(32, 35 + b, MOUTH);
    f.dot(27, 34 + b, BLUSH); f.dot(37, 34 + b, BLUSH);
  } else {
    f.box(29.5, 35 + b, 34.5, 38 + b, 'skin');
    f.ellipse(32, 28 + b, 9.6, 8.6, 'hair');
    if (female) { f.capsule(32, 31 + b, 32 + sway * 0.5, 42 + b, 2.3, 'hair'); [31, 32, 33].forEach(x => f.dot(x, 30 + b, MAT.scarf[3])); }
  }
  for (const t of female ? [[[30, 21], [34, 21], [33, 17]]] : [[[26, 22], [31, 21], [27.5, 16]], [[30, 21], [35, 21], [33.5, 15]], [[34, 22], [39, 23], [40, 17.5]], [[23, 25], [27, 22], [21.5, 19.5]], [[37, 22], [41, 25], [42.5, 21]]]) f.tri(t.map(([x, y]) => [x, y + b]), 'hair');
  return f;
}

/** Nhìn ngang quay phải. */
function side(step, female) {
  const f = new Frame(), [sw, nl, fl, b] = step == null ? [0, 0, 0, 0] : SIDE_STEPS[step], shirt = female ? 'pink' : 'shirt';
  // khăn bay sau gáy
  const ph = step == null ? 0 : step * 0.8, hang = step == null ? 0.75 : -0.22;
  let px = 29, py = 38.5 + b;
  for (let j = 1; j <= 5; j++) {
    const nx = 29 - j * 2.2, ny = 38.5 + b + hang * j * 2.2 + Math.sin(j * 0.9 - ph) * (j / 5) * 1.6;
    f.capsule(px, py, nx, ny, j < 5 ? 1.5 : 1.1, 'scarf'); px = nx; py = ny;
  }
  f.capsule(32, 50, 32 - sw, 57.5 - fl, 2.2, 'pantsFar');
  f.ellipse(32 - sw + 1, 60.4 - fl, 3.2, 1.7, 'shoe');
  f.box(21.5, 39 + b, 28.5, 50 + b, 'pack');
  f.box(21.5, 47 + b, 28.5, 50 + b, 'trim');
  [[24, 42], [25, 42], [24, 43], [25, 43]].forEach(([x, y]) => f.dot(x, y + b, CARD));
  f.box(27.5, 38 + b, 36.5, 50 + b, shirt);
  f.box(27.5, 47.5 + b, 36.5, 52 + b, 'pants');
  f.capsule(32, 50, 32 + sw, 57.5 - nl, 2.3, 'pants');
  f.ellipse(32 + sw + 1, 60.4 - nl, 3.2, 1.7, 'shoe');
  f.ellipse(32, 37.8 + b, 5, 1.9, 'scarf');
  f.dot(35, 40 + b, TEAL); f.dot(35, 41 + b, TEAL); for (let y = 42; y <= 44; y++) { f.dot(35, y + b, CARD); f.dot(36, y + b, y === 44 ? MAT.shirt[1] : CARD); }
  const aw = step == null ? 0 : -sw * 0.6;
  arm(f, 32.5, 40 + b, 32.5 + aw, 46.8 + b, shirt, 0.92);
  // đầu
  if (female) { f.capsule(25, 27 + b, 20.5, 37 + b, 2.1, 'hair'); [[25, 26], [26, 26], [25, 27]].forEach(([x, y]) => f.dot(x, y + b, MAT.scarf[3])); }
  f.ellipse(33, 30.5 + b, 7.2, 6.6, 'skin');
  hairCap(f, 31, (x, y) => y <= 26 + b || x <= 29.5 - (y - 26 - b) * 0.45);
  f.ellipse(30.2, 31.2 + b, 1.2, 1.7, 'skin');
  for (const t of [[[31, 23], [37, 22.5], [38.5, 29]], [[35, 23], [41, 24.5], [40.5, 28.5]], ...(female ? [[[30.5, 21], [34.5, 21], [33, 17]]] : [[[24, 25], [28, 21.5], [19.5, 21]], [[26.5, 22], [31, 20.5], [25.5, 15.5]], [[30.5, 21], [35.5, 21], [33, 15]], [[34.5, 22], [39, 23], [40.5, 18]]])]) f.tri(t.map(([x, y]) => [x, y + b]), 'hair');
  for (let x = 36; x <= 38; x++) f.dot(x, 29 + b, EYE);
  f.dot(36, 30 + b, IRIS); f.dot(37, 30 + b, SHINE); f.dot(36, 31 + b, IRIS); f.dot(37, 31 + b, IRIS); f.dot(36, 32 + b, IRIS_D); f.dot(37, 32 + b, IRIS_D);
  f.dot(39, 35 + b, MOUTH); f.dot(35, 34 + b, BLUSH);
  return f;
}

/** Sheet 576x384 cho 'hero_m' | 'hero_f'. */
export function buildHero(id) {
  const female = id === 'hero_f';
  const img = new Img(9 * F, 6 * F);
  for (let col = 0; col < 9; col++) {
    const step = col === 0 ? null : col - 1;
    front(false, step, female).render(img, col * F, 0);
    front(true, step, female).render(img, col * F, 3 * F);
    side(step, female).render(img, col * F, 2 * F);
    for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) img.set(col * F + F - 1 - x, F + y, img.get(col * F + x, 2 * F + y));
  }
  // khung ngồi (người chơi không ngồi): chép khung đứng
  [[0, 0, 0, 4], [0, 2, 1, 4], [0, 1, 2, 4], [0, 3, 0, 5]].forEach(([sc, sr, dc, dr]) => img.blit(img, sc * F, sr * F, F, F, dc * F, dr * F));
  return img;
}
