// Bộ vẽ nhân vật của game (thay LPC): phong cách "Thám Tử VLU" của nhóm — viền tím than đồng nhất quanh từng bộ phận,
// màu phẳng 3 sắc độ (sáng trên trái, bóng nửa phải), đầu to ~1/3 thân, mắt có điểm sáng, bóng bầu dục dưới chân.
// Chỉnh cho đồ họa game: cao ~48px (chân ở y = 61, bóng y = 62), tông hơi trầm, đủ 4 hướng + ngồi. Art tự vẽ bằng code (CC0).
// Sheet 576x384: 9 cột x 6 hàng khung 64x64; hàng 0 xuống, 1 trái, 2 phải, 3 lên (cột 0 đứng, 1–8 bước);
// ngồi: hàng 4 cột 0 xuống, 1 phải, 2 trái; hàng 5 cột 0 lên.
import { Img } from './png.mjs';
import { shade } from './characters.mjs';

const F = 64;
const OUT = '#1c1224';
const LX = -0.55, LY = -0.83; // hướng tới nguồn sáng
const SHADOW = [20, 12, 28, 95];

/** Bảng màu một chất liệu: [viền, bóng, chính, sáng]; tông hơi trầm cho hợp game. */
function ramp(hex) { const c = shade(hex, -0.06); return [OUT, shade(c, -0.3), c, shade(c, 0.2)]; }

class Frame {
  constructor(pal) { this.pal = pal; this.mat = new Array(F * F).fill(null); this.tone = new Int8Array(F * F); this.layer = new Int16Array(F * F); this.n = 0; this.over = new Map(); this.free = new Set(['skin']); }
  shape(mat, x0, y0, x1, y1, inside, clip) {
    if (!this.pal[mat]) return this;
    this.n++;
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      if (x < 0 || y < 0 || x >= F || y >= F || (clip && !clip(x, y))) continue;
      const n = inside(x + 0.5, y + 0.5); if (!n) continue;
      const t = n[0] * LX + n[1] * LY, i = y * F + x;
      this.mat[i] = mat; this.layer[i] = this.n; this.tone[i] = t > 0.55 ? 3 : t > -0.3 ? 2 : 1;
    }
    return this;
  }
  ellipse(cx, cy, rx, ry, mat, clip) { return this.shape(mat, cx - rx, cy - ry, cx + rx, cy + ry, (x, y) => { const nx = (x - cx) / rx, ny = (y - cy) / ry; return nx * nx + ny * ny <= 1 ? [nx, ny] : null; }, clip); }
  box(x0, y0, x1, y1, mat, clip, round = 4) {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hx = (x1 - x0) / 2, hy = (y1 - y0) / 2;
    return this.shape(mat, x0, y0, x1, y1, (x, y) => {
      const nx = (x - cx) / hx, ny = (y - cy) / hy;
      if (Math.abs(nx) > 1 || Math.abs(ny) > 1 || Math.abs(nx) ** round + Math.abs(ny) ** round > 1) return null;
      return [nx * Math.abs(nx), ny * Math.abs(ny) * 0.6];
    }, clip);
  }
  capsule(x1, y1, x2, y2, r, mat, clip) {
    const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1;
    return this.shape(mat, Math.min(x1, x2) - r, Math.min(y1, y2) - r, Math.max(x1, x2) + r, Math.max(y1, y2) + r, (x, y) => {
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L2)), px = x - (x1 + t * dx), py = y - (y1 + t * dy);
      const d = Math.hypot(px, py); return d <= r ? [px / r, py / r] : null;
    }, clip);
  }
  tri(pts, mat) {
    const ys = pts.map(p => p[1]), xs = pts.map(p => p[0]), top = Math.min(...ys), h = Math.max(...ys) - top || 1, cx = xs.reduce((a, b) => a + b) / 3;
    const sg = (p, a, b) => (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1]);
    return this.shape(mat, Math.min(...xs), top, Math.max(...xs), Math.max(...ys), (x, y) => {
      const p = [x, y], d1 = sg(p, pts[0], pts[1]), d2 = sg(p, pts[1], pts[2]), d3 = sg(p, pts[2], pts[0]);
      if ((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)) return null;
      return [(x - cx) / 4, ((y - top) / h) * 1.4 - 0.8];
    });
  }
  dot(x, y, color) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < F && y < F) this.over.set(y * F + x, color); return this; }
  rect(x, y, w, h, color) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.dot(x + i, y + j, color); return this; }
  /** Ra Img: bóng chân, sắc độ, viền ngoài + nét viền nơi khối trên chồng khối dưới. */
  render(img, fx, fy, shadow = true) {
    if (shadow) for (let y = 60; y <= 63; y++) for (let x = 22; x <= 42; x++) { const nx = (x + 0.5 - 32) / 10, ny = (y + 0.5 - 61.8) / 1.8; if (nx * nx + ny * ny <= 1) img.set(fx + x, fy + y, SHADOW); }
    const at = (x, y) => (x < 0 || y < 0 || x >= F || y >= F ? -1 : y * F + x);
    for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
      const i = y * F + x, m = this.mat[i];
      let color = null;
      if (m) {
        color = this.pal[m][this.tone[i]];
        for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
          const j = at(x + dx, y + dy), o = j >= 0 ? this.mat[j] : null;
          if (o && o !== m && this.layer[j] > this.layer[i] && !(this.free.has(m) && this.free.has(o))) { color = OUT; break; }
        }
      } else {
        for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) { const j = at(x + dx, y + dy); if (j >= 0 && this.mat[j]) { color = OUT; break; } }
      }
      const o = this.over.get(i); if (o) color = o;
      if (color) img.set(fx + x, fy + y, color);
    }
  }
}

// ---- tư thế
// bước đi trước / lưng: [nhấc chân trái, nhấc chân phải, nhún, vung tay]
const STEPS = [[1, 0, 0, 1], [2, 0, -1, 1], [1, 0, 0, 1], [0, 0, 0, 0], [0, 1, 0, -1], [0, 2, -1, -1], [0, 1, 0, -1], [0, 0, 0, 0]];
// bước đi ngang: [vung chân gần, nhấc gần, nhấc xa, nhún]
const SIDE = [[3, 0, 0, 0], [2, 0, 1, -1], [0, 0, 2, -1], [-2, 0, 1, 0], [-3, 0, 0, 0], [-2, 1, 0, -1], [0, 2, 0, -1], [2, 1, 0, 0]];

const mx = x => 64 - x;

function palette(s) {
  const p = {
    skin: ramp(s.skin), hair: ramp(s.hair), top: ramp(s.top), inner: ramp(s.inner || s.top), bottom: ramp(s.bottom), shoe: ramp(s.shoes),
    far: ramp(shade(s.bottom, -0.25)), pack: ramp(s.backpack || '#b8223a'), cap: ramp(s.cap || '#b23a3a'), hat: ramp(s.hat || '#e3cf9a'),
    sock: ramp(s.socks || '#eeeeee'), cam: ramp('#2a2e38'), phone: ramp('#22252e'), lens: ramp('#c8e6f0')
  };
  return p;
}

// ---- tóc
function hairFront(f, s, b, back) {
  const st = s.old ? 'grey' : s.hairStyle;
  if (back) {
    if (st === 'long' || st === 'pony') f.box(21.5, 22 + b, 42.5, (st === 'pony' ? 33 : 41) + b, 'hair', null, 3);
    if (st === 'bob') f.box(21.5, 22 + b, 42.5, 34 + b, 'hair', null, 3);
  }
  if (!back) {
    f.box(23, 17 + b, 41, 35 + b, 'skin', null, 3.2); // mặt
    f.box(21.6, 26 + b, 24, 30 + b, 'skin'); f.box(40, 26 + b, 42.4, 30 + b, 'skin'); // tai
  } else f.box(29, 31 + b, 35, 37 + b, 'skin');
  if (st === 'grey') { // hói: tóc bạc hai bên + sau
    f.box(21.8, 20 + b, 26, 30 + b, 'hair', null, 3); f.box(38, 20 + b, 42.2, 30 + b, 'hair', null, 3);
    if (back) f.box(22, 21 + b, 42, 33 + b, 'hair', null, 3);
    return;
  }
  const clip = back ? null : (x, y) => y <= 22 + b || ((x < 25 || x > 38) && y <= 27 + b);
  f.ellipse(32, 22 + b, 10.4, 8.6, 'hair', clip);
  if (back) { f.box(22, 18 + b, 42, (st === 'long' ? 41 : st === 'bob' ? 34 : st === 'pony' ? 32 : 31) + b, 'hair', null, 3); if (st === 'pony') f.capsule(32, 26 + b, 32, 38 + b, 2.6, 'hair'); }
  else for (const t of [[[24, 20], [29, 20], [24.5, 26.5]], [[28, 20], [33, 20], [30, 25.5]], [[32, 20], [37, 20], [35.5, 25]], [[36, 20], [40.5, 21], [40, 26.5]]]) f.tri(t.map(([x, y]) => [x, y + b]), 'hair');
  if (st === 'spiky') for (const t of [[[25, 18], [30, 16], [25, 11.5]], [[29, 16], [34, 16], [32.5, 10.5]], [[33, 16.5], [38, 18], [39.5, 12]], [[22, 22], [25.5, 18], [19.5, 16.5]], [[38.5, 18], [42, 22], [44, 16.5]]]) f.tri(t.map(([x, y]) => [x, y + b]), 'hair');
  if (st === 'short' || st === 'pony' || st === 'long' || st === 'bob') f.tri([[30, 15 + b], [34, 15 + b], [33, 12 + b]], 'hair'); // chỏm
}
function hairSide(f, s, b) {
  const st = s.old ? 'grey' : s.hairStyle;
  if (st === 'long') f.box(22.5, 20 + b, 31, 41 + b, 'hair', null, 3);
  if (st === 'bob') f.box(22.5, 20 + b, 31, 34 + b, 'hair', null, 3);
  if (st === 'pony') f.capsule(24, 22 + b, 20.5, 35 + b, 2.3, 'hair');
  f.box(24, 17 + b, 40, 35 + b, 'skin', null, 3.2);
  f.box(28.5, 26 + b, 31.5, 30.5 + b, 'skin');
  if (st === 'grey') { f.box(23.5, 20 + b, 30, 31 + b, 'hair', null, 3); return; }
  f.ellipse(31, 22 + b, 9.4, 8.6, 'hair', (x, y) => y <= 21.5 + b || x <= 28 - (y - 22 - b) * 0.3);
  for (const t of [[[31, 20], [37, 19.5], [38.5, 25.5]], [[35, 20], [41, 21.5], [40.5, 25]]]) f.tri(t.map(([x, y]) => [x, y + b]), 'hair');
  if (st === 'spiky') for (const t of [[[24, 22], [28, 18.5], [19.5, 17]], [[27, 18], [32, 16.5], [26.5, 11]], [[31.5, 16.5], [36.5, 17], [35, 10.5]], [[35.5, 18], [40, 20], [41.5, 13.5]]]) f.tri(t.map(([x, y]) => [x, y + b]), 'hair');
  else f.tri([[29, 15 + b], [33, 15 + b], [32, 12 + b]], 'hair');
}

// ---- mặt (chính diện / ngang)
function faceFront(f, s, b) {
  const iris = s.eyes || '#3b2a22';
  for (const ex of [27, 35]) {
    f.rect(ex - (ex < 32 ? 1 : 0), 26 + b, 3, 1, OUT);
    f.dot(ex, 27 + b, '#ffffff'); f.dot(ex + 1, 27 + b, iris); f.dot(ex, 28 + b, iris); f.dot(ex + 1, 28 + b, shade(iris, -0.4));
  }
  f.dot(31.5, 31 + b, '#a0302c'); f.dot(32.5, 31 + b, '#a0302c');
  if (s.sex === 'f' || s.blush) { f.dot(26, 30 + b, '#e9877c'); f.dot(38, 30 + b, '#e9877c'); }
  if (s.glasses) { f.rect(25, 25 + b, 5, 1, OUT); f.rect(34, 25 + b, 5, 1, OUT); f.rect(25, 29 + b, 5, 1, OUT); f.rect(34, 29 + b, 5, 1, OUT); f.rect(30, 26 + b, 4, 1, OUT); f.dot(25, 26 + b, OUT); f.dot(25, 27 + b, OUT); f.dot(25, 28 + b, OUT); f.dot(38, 26 + b, OUT); f.dot(38, 27 + b, OUT); f.dot(38, 28 + b, OUT); }
}
function faceSide(f, s, b) {
  const iris = s.eyes || '#3b2a22';
  f.rect(35, 26 + b, 3, 1, OUT); f.dot(35, 27 + b, '#ffffff'); f.dot(36, 27 + b, iris); f.dot(35, 28 + b, iris); f.dot(36, 28 + b, shade(iris, -0.4));
  f.dot(39, 31 + b, '#a0302c');
  if (s.sex === 'f' || s.blush) f.dot(34, 30 + b, '#e9877c');
  if (s.glasses) { f.rect(34, 25 + b, 5, 1, OUT); f.rect(34, 29 + b, 5, 1, OUT); f.dot(38, 26 + b, OUT); f.dot(38, 27 + b, OUT); f.dot(38, 28 + b, OUT); f.rect(30, 26 + b, 4, 1, OUT); }
}

// ---- mũ
function headwear(f, s, b, view) {
  if (s.conical) { f.tri([[16, 21 + b], [48, 21 + b], [32, 6 + b]], 'hat'); return; }
  if (!s.cap) return;
  if (view === 'side') { f.ellipse(31, 19 + b, 9, 5.5, 'cap', (x, y) => y <= 20 + b); f.box(36, 19 + b, 44, 21.5 + b, 'cap'); return; }
  f.ellipse(32, 19.5 + b, 10.2, 6, 'cap', (x, y) => y <= 21 + b);
  if (view === 'front') f.box(24, 20 + b, 40, 23 + b, 'cap');
}

// ---- thân
const longSleeve = s => s.sleeve === 'long';
function legsFront(f, s, la, ra, sit) {
  const knee = sit ? 55 : 50;
  for (const [x, lift, flip] of [[27, la, false], [33, ra, true]]) {
    const top = knee, bottom = 58.5 - lift;
    if (s.skirt || s.shorts) { f.box(x + 0.5, top, x + 4.5, bottom, s.socks ? 'sock' : 'skin'); }
    else f.box(x, top, x + 5, bottom, flip ? 'far' : 'bottom');
    f.box(x - 0.6, 57.2 - lift, x + 5.6, 61 - lift, 'shoe');
    if (s.toe) f.rect(Math.round(x), 60 - lift, 5, 1, s.toe);
  }
}
function torsoFront(f, s, b, sit) {
  const d = sit ? 5 : 0;
  if (s.skirt) f.shape('bottom', 24, 45 + b + d, 40, 54 + b + d, (x, y) => { const w = 6.5 + (y - 45 - b - d) * 0.5; return Math.abs(x - 32) <= w && y >= 45 + b + d && y <= 54 + b + d ? [(x - 32) / w, 0] : null; });
  else f.box(25, 45 + b + d, 39, (s.shorts ? 54 : 51) + b + d, 'bottom');
  f.box(24.5, 34 + b + d, 39.5, 48 + b + d, 'top');
  if (s.inner && s.inner !== s.top) f.shape('inner', 29, 34 + b + d, 35, 38 + b + d, (x, y) => (Math.abs(x - 32) <= 3 - (y - 34 - b - d) * 0.7 ? [0, 0] : null));
}
function armsFront(f, s, b, sw, sit) {
  const d = sit ? 5 : 0;
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? 21.5 : 39.5, dy = side * sw;
    f.box(x0, 35 + b + d, x0 + 3, (longSleeve(s) ? 45 : 40) + b + d + dy, 'top');
    if (!longSleeve(s)) f.box(x0 + 0.2, 39 + b + d + dy, x0 + 2.8, 45 + b + d + dy, 'skin');
    f.box(x0 - 0.2, 44 + b + d + dy, x0 + 3.2, 47.5 + b + d + dy, 'skin');
  }
}
function itemsFront(f, s, b, sit, back) {
  const d = sit ? 5 : 0, y = 34 + b + d;
  if (back) {
    if (s.backpack) { f.box(24.5, 34.5 + b + d, 39.5, 48 + b + d, 'pack'); f.rect(25, 44 + b + d, 15, 1, OUT); if (s.vlu) { f.rect(31, 37 + b + d, 3, 3, '#f2efe8'); f.dot(32, 40 + b + d, '#f2efe8'); } }
    return;
  }
  if (s.backpack) { const strap = shade(s.backpack, -0.2); f.rect(26, y + 1, 2, 9, strap); f.rect(37, y + 1, 2, 9, strap); if (s.vlu) { f.rect(28, y + 6, 9, 1, strap); f.rect(31, y + 6, 3, 1, '#e0b040'); } }
  const lan = s.lanyardColor || (s.lanyard || s.vlu ? '#2a9d8f' : null);
  if (lan) { for (let i = 0; i < 4; i++) { f.dot(29 + i * 0.6, y + i, lan); f.dot(35 - i * 0.6, y + i, lan); } f.rect(30, y + 4, 5, 5, '#ecebe6'); f.rect(31, y + 5, 3, 2, lan); f.rect(30, y + 8, 5, 1, OUT); }
  if (s.press || s.badge) { f.rect(26, y + 3, 4, 3, '#ecebe6'); f.rect(26, y + 3, 4, 1, '#c8323c'); }
  if (s.camera) { f.rect(33, y + 8, 6, 4, OUT); f.rect(34, y + 9, 4, 2, '#3a4250'); f.dot(36, y + 9, '#c9d1dc'); }
  if (s.phone) { f.rect(40, y + 9, 3, 5, OUT); f.rect(40, y + 10, 3, 3, '#4a6a8a'); }
  if (s.magnifier) { const mx0 = 43, my = 41 + b + d; f.rect(mx0, my - 3, 5, 5, '#b8862e'); f.rect(mx0 + 1, my - 2, 3, 3, '#bfe0ea'); f.dot(mx0 + 1, my - 2, '#f4fbfd'); f.rect(mx0 + 2, my + 2, 1, 3, '#6a4a1a'); }
}

/** Phần tóc sau gáy nhìn từ trước: vẽ trước thân để không đè lên ngực. */
function hairBehind(f, s, b) {
  const st = s.old ? 'grey' : s.hairStyle;
  if (st === 'long') f.box(21.5, 22 + b, 42.5, 41 + b, 'hair', null, 3);
  if (st === 'bob') f.box(21.5, 22 + b, 42.5, 34 + b, 'hair', null, 3);
  if (st === 'pony') { f.box(21.5, 22 + b, 42.5, 32 + b, 'hair', null, 3); f.capsule(43, 21 + b, 45.5, 34 + b, 2.2, 'hair'); }
}

function front(s, step, back, sit) {
  const f = new Frame(palette(s)), [la, ra, b, sw] = step == null || sit ? [0, 0, 0, 0] : STEPS[step];
  if (!back) hairBehind(f, s, b + (sit ? 5 : 0));
  if (back && s.hairStyle === 'long' && !s.old) f.free.add('hair');
  legsFront(f, s, la, ra, sit);
  torsoFront(f, s, b, sit);
  armsFront(f, s, b, sw, sit);
  itemsFront(f, s, b, sit, back);
  const hb = b + (sit ? 5 : 0);
  hairFront(f, s, hb, back);
  if (!back) faceFront(f, s, hb);
  headwear(f, s, hb, back ? 'back' : 'front');
  if (!back && s.ribbon && s.hairStyle === 'pony') { f.rect(42, 21 + hb, 3, 2, s.ribbon); }
  if (back && s.ribbon && s.hairStyle === 'pony') f.rect(31, 25 + hb, 3, 2, s.ribbon);
  return f;
}

function side(s, step, sit) {
  const f = new Frame(palette(s)), [sw, nl, fl, b] = step == null || sit ? [0, 0, 0, 0] : SIDE[step], d = sit ? 5 : 0;
  const bare = s.skirt || s.shorts, legMat = near => (bare ? (s.socks ? 'sock' : 'skin') : near ? 'bottom' : 'far');
  if (sit) {
    f.box(31, 51, 40, 55, s.skirt ? 'bottom' : legMat(true)); // đùi ngang
    f.box(37, 53, 41, 58.5, legMat(true)); f.box(36.4, 57.2, 44, 61, 'shoe');
  } else {
    // chân xa rồi chân gần
    f.capsule(32, 50, 32 - sw, 57.5 - fl, 2.3, legMat(false)); f.box(32 - sw - 2.6, 57.2 - fl, 32 - sw + 4.6, 61 - fl, 'shoe');
  }
  if (s.backpack) f.box(21, 34.5 + b + d, 27.5, 47.5 + b + d, 'pack');
  if (s.skirt) f.shape('bottom', 26, 45 + b + d, 39, 54 + b + d, (x, y) => { const w = 5 + (y - 45 - b - d) * 0.45; return Math.abs(x - 32.5) <= w && y >= 45 + b + d && y <= 54 + b + d ? [(x - 32.5) / w, 0] : null; });
  else f.box(27, 45 + b + d, 38, (s.shorts ? 53 : 51) + b + d, 'bottom');
  f.box(26.5, 34 + b + d, 38.5, 48 + b + d, 'top');
  if (!sit) { f.capsule(32, 50, 32 + sw, 57.5 - nl, 2.4, legMat(true)); f.box(32 + sw - 2.6, 57.2 - nl, 32 + sw + 4.6, 61 - nl, 'shoe'); if (s.toe) f.rect(Math.round(32 + sw), 60 - nl, 5, 1, s.toe); }
  // tay gần
  const aw = sit ? 2 : -Math.round(sw * 0.6);
  f.capsule(32, 36 + b + d, 32 + aw, (longSleeve(s) ? 43 : 39.5) + b + d, 1.9, 'top');
  if (!longSleeve(s)) f.capsule(32 + aw * 0.6, 39.5 + b + d, 32 + aw, 44 + b + d, 1.6, 'skin');
  f.ellipse(32 + aw, 45 + b + d, 1.9, 1.9, 'skin');
  const y = 34 + b + d, lan = s.lanyardColor || (s.lanyard || s.vlu ? '#2a9d8f' : null);
  if (lan) { f.dot(36, y + 1, lan); f.dot(36, y + 2, lan); f.rect(36, y + 3, 2, 4, '#ecebe6'); }
  if (s.camera) { f.rect(35, y + 7, 4, 4, OUT); f.rect(36, y + 8, 2, 2, '#3a4250'); }
  if (s.magnifier) { const x = 33 + aw, my = 44 + b + d; f.rect(x, my - 6, 5, 5, '#b8862e'); f.rect(x + 1, my - 5, 3, 3, '#bfe0ea'); f.dot(x + 1, my - 5, '#f4fbfd'); }
  hairSide(f, s, b + d);
  faceSide(f, s, b + d);
  headwear(f, s, b + d, 'side');
  if (s.ribbon && s.hairStyle === 'pony') f.rect(23, 21 + b + d, 2, 3, s.ribbon);
  return f;
}

/** Sheet 576x384 cho một nhân vật (thông số CHARACTERS[id]). */
export function buildChibi(s) {
  const img = new Img(9 * F, 6 * F);
  for (let col = 0; col < 9; col++) {
    const step = col === 0 ? null : col - 1;
    front(s, step, false).render(img, col * F, 0);
    side(s, step).render(img, col * F, 2 * F);
    front(s, step, true).render(img, col * F, 3 * F);
  }
  front(s, null, false, true).render(img, 0, 4 * F);
  side(s, null, true).render(img, F, 4 * F);
  front(s, null, true, true).render(img, 0, 5 * F);
  // trái = lật ngang của phải (đi + ngồi); chép nguyên byte (bóng chân bán trong suốt không bị pha lại)
  const copy = (sx, sy, dx, dy) => { const a = (sy * img.w + sx) * 4, b = (dy * img.w + dx) * 4; for (let k = 0; k < 4; k++) img.px[b + k] = img.px[a + k]; };
  for (let col = 0; col < 9; col++) for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) copy(col * F + x, 2 * F + y, col * F + F - 1 - x, F + y);
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) copy(F + x, 4 * F + y, 2 * F + F - 1 - x, 4 * F + y);
  return img;
}
