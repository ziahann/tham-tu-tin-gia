// Đồ họa pixel vẽ bằng code: bảng màu, sprite nhân vật, cảnh nền 320x180.
// Toàn bộ là thiết kế gốc của dự án (không dùng asset ngoài).

export const W = 320;
export const H = 180;

// Bảng 16 màu gốc, trùng với biến --c0..--c15 trong styles.css.
export const PAL = [
  '#0f0e17', '#1d2b45', '#3b2c4a', '#2a9d8f', '#8a5a3c', '#5b5d6e', '#b4b8c5', '#f4eedc',
  '#c8323c', '#e8902f', '#f2d36b', '#4aa35b', '#3d7fd1', '#8c7bb8', '#e79aa0', '#e3c49a'
];

// Ký tự trong sprite → chỉ số màu. '.' là trong suốt.
const KEY = { k: 0, p: 1, h: 2, t: 3, b: 4, x: 5, g: 6, w: 7, r: 8, c: 9, y: 10, n: 12, l: 13, m: 14, s: 15 };

// Thám tử (ORIGINAL): mũ cói, khăn xanh ngọc, áo khoác vàng đất, huy hiệu kính lúp.
const HERO = [
  '................',
  '.....kkkkkk.....',
  '....kyyyyyyk....',
  '....kyyyyyyk....',
  '..kkbbbbbbbbkk..',
  '.kyyyyyyyyyyyyk.',
  '..kkhhhhhhhhkk..',
  '...khsssssshk...',
  '...kskssssksk...',
  '...kssssssssk...',
  '....ksssmssk....',
  '...kttttttttk...',
  '..kccttttttcck..',
  '..kcccctccccck..',
  '.kccccctcccgcck.',
  '.ksccccccccccsk.',
  '.ksccccccccccsk.',
  '..kcccccccccck..',
  '..kbbbbbbbbbbk..',
  '...kppppppppk...',
  '...kpppkkpppk...',
  '...kppk..kppk...',
  '...kkkk..kkkk...',
  '................'
];

// NPC1 Chị Tuệ Lâm (GIẢ LẬP): tóc dài, kính, áo vest xanh, thẻ nhân viên.
const NPC1 = [
  '................',
  '......kkkk......',
  '....kkhhhhkk....',
  '...khhhhhhhhk...',
  '..khhhhhhhhhhk..',
  '..khhsssssshhk..',
  '..khskksskkshk..',
  '..khsssssssshk..',
  '..khhssmssshhk..',
  '..khhhssssshhk..',
  '..khhhsssshhhk..',
  '..knnnwwwwnnnk..',
  '.knnnnwllwnnnnk.',
  '.knnnnnlwnnnnnk.',
  '.knnnnnyynnnnnk.',
  '.ksnnnnnnnnnnsk.',
  '.ksnnnnnnnnnnsk.',
  '..knnnnnnnnnnk..',
  '..kxxxxxxxxxxk..',
  '..kxxxxxxxxxxk..',
  '....ksk..ksk....',
  '....ksk..ksk....',
  '...kkkk..kkkk...',
  '................'
];

export const SPRITES = { hero: HERO, npc1: NPC1 };

/** Kiểm tra mọi hàng sprite đủ 16 ô (báo lỗi trong console khi sửa sai). */
export function validateSprites() {
  for (const [name, rows] of Object.entries(SPRITES)) {
    rows.forEach((r, i) => { if (r.length !== 16) console.warn(`sprite ${name} hàng ${i}: ${r.length} ô`); });
  }
}

/** Vẽ sprite tại (x, y) với hệ số phóng to nguyên. */
export function drawSprite(ctx, name, x, y, scale = 1, flip = false) {
  const rows = SPRITES[name];
  if (!rows) return;
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[flip ? row.length - 1 - i : i];
      if (ch === '.') continue;
      ctx.fillStyle = PAL[KEY[ch]];
      ctx.fillRect(x + i * scale, y + j * scale, scale, scale);
    }
  });
}

/** Tô hình chữ nhật bằng màu trong bảng. */
function rect(ctx, c, x, y, w, h) {
  ctx.fillStyle = PAL[c];
  ctx.fillRect(x, y, w, h);
}

/** Vẽ đường thẳng pixel (Bresenham). */
function line(ctx, c, x0, y0, x1, y1) {
  ctx.fillStyle = PAL[c];
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

/** Tường, chân tường và sàn gỗ ô 16x16. */
function roomBase(ctx, wall = 1) {
  rect(ctx, wall, 0, 0, W, 112);
  for (let x = 0; x < W; x += 16) rect(ctx, 0, x, 0, 1, 112); // vạch giấy dán tường mờ
  ctx.globalAlpha = 1;
  rect(ctx, 2, 0, 106, W, 8);
  rect(ctx, 4, 0, 114, W, H - 114);
  for (let y = 114; y < H; y += 16) rect(ctx, 2, 0, y, W, 1);
  for (let y = 114, row = 0; y < H; y += 16, row++) {
    for (let x = (row % 2) * 8; x < W; x += 16) rect(ctx, 2, x, y, 1, 16);
  }
}

/** Cửa sổ nhìn ra vịnh lúc đêm (không có tàu). */
function windowView(ctx, x, y, w, h) {
  rect(ctx, 6, x - 3, y - 3, w + 6, h + 6);
  rect(ctx, 0, x, y, w, h);
  rect(ctx, 3, x, y + Math.floor(h * 0.68), w, h - Math.floor(h * 0.68));
  for (let i = 0; i < w; i += 7) rect(ctx, 12, x + i, y + Math.floor(h * 0.68) + ((i / 7) % 3) * 3 + 2, 4, 1);
  rect(ctx, 5, x + 6, y + Math.floor(h * 0.68) - 6, 18, 6);   // núi đá xa
  rect(ctx, 5, x + w - 30, y + Math.floor(h * 0.68) - 9, 22, 9);
  rect(ctx, 7, x + w - 18, y + 6, 6, 6);                         // trăng
  [[8, 8], [22, 14], [40, 6], [54, 18], [70, 10]].forEach(([sx, sy]) => { if (sx < w - 22) rect(ctx, 10, x + sx, y + sy, 1, 1); });
  rect(ctx, 6, x + Math.floor(w / 2) - 1, y, 2, h);              // song cửa
}

/** Bảng ghim có giấy note và dây đỏ. */
function pinboard(ctx, x, y) {
  rect(ctx, 2, x - 2, y - 2, 84, 54);
  rect(ctx, 4, x, y, 80, 50);
  const notes = [[6, 6, 7], [30, 4, 10], [56, 8, 7], [12, 28, 14], [44, 30, 7], [64, 30, 10]];
  notes.forEach(([nx, ny, c]) => {
    rect(ctx, c, x + nx, y + ny, 14, 12);
    rect(ctx, 5, x + nx + 2, y + ny + 4, 9, 1);
    rect(ctx, 5, x + nx + 2, y + ny + 7, 6, 1);
  });
  line(ctx, 8, x + 13, y + 7, x + 37, y + 5);
  line(ctx, 8, x + 37, y + 5, x + 51, y + 31);
  line(ctx, 8, x + 19, y + 29, x + 51, y + 31);
  line(ctx, 8, x + 51, y + 31, x + 71, y + 31);
  notes.forEach(([nx, ny]) => rect(ctx, 8, x + nx + 6, y + ny, 2, 2));
}

/** Bàn làm việc với giấy tờ và đèn bàn. */
function desk(ctx, x, y, w) {
  rect(ctx, 0, x, y, w, 6);
  rect(ctx, 4, x + 1, y + 1, w - 2, 4);
  rect(ctx, 2, x + 2, y + 6, w - 4, 22);
  rect(ctx, 0, x + 2, y + 28, 4, 8);
  rect(ctx, 0, x + w - 6, y + 28, 4, 8);
  rect(ctx, 7, x + 10, y - 3, 16, 3);
  rect(ctx, 7, x + 14, y - 5, 14, 2);
  rect(ctx, 0, x + w - 18, y - 16, 2, 16);   // đèn bàn
  rect(ctx, 10, x + w - 24, y - 20, 12, 5);
}

/** Tủ hồ sơ nhiều ngăn. */
function cabinet(ctx, x, y) {
  rect(ctx, 0, x, y, 30, 60);
  rect(ctx, 5, x + 1, y + 1, 28, 58);
  for (let i = 0; i < 4; i++) {
    rect(ctx, 6, x + 3, y + 3 + i * 14, 24, 12);
    rect(ctx, 0, x + 12, y + 8 + i * 14, 6, 2);
    rect(ctx, 7, x + 6, y + 5 + i * 14, 6, 3);
  }
}

/** Cửa phòng; màu cho biết trạng thái (luôn kèm chữ ở danh sách phòng). */
function door(ctx, x, y, c) {
  rect(ctx, 0, x, y, 30, 58);
  rect(ctx, c, x + 2, y + 2, 26, 56);
  rect(ctx, 0, x + 4, y + 6, 22, 1);
  rect(ctx, 7, x + 8, y + 10, 14, 7);
  rect(ctx, 10, x + 22, y + 32, 3, 3);
}

const DOOR_COLOR = { done: 11, open: 3, locked: 5, building: 2 };

/** Vẽ cảnh nền cho từng màn. opts.doors = ['done'|'open'|'locked'|'building', ...] cho S2. */
export function drawScene(canvas, sceneId, opts = {}) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);
  const feet = 162; // đáy chân nhân vật

  switch (sceneId) {
    case 'S0':
      roomBase(ctx, 1);
      windowView(ctx, 104, 14, 112, 72);
      pinboard(ctx, 10, 30);
      cabinet(ctx, 280, 50);
      desk(ctx, 200, 118, 70);
      drawSprite(ctx, 'hero', 144, feet - 48, 2);
      break;
    case 'S1':
      roomBase(ctx, 2);
      windowView(ctx, 210, 16, 90, 64);
      pinboard(ctx, 20, 26);
      drawSprite(ctx, 'npc1', 150, feet - 66, 2);
      desk(ctx, 124, 116, 96);
      drawSprite(ctx, 'hero', 56, feet - 48, 2);
      break;
    case 'S2': {
      roomBase(ctx, 1);
      const doors = opts.doors || [];
      doors.forEach((st, i) => door(ctx, 8 + i * 44, 52, DOOR_COLOR[st] ?? 5));
      drawSprite(ctx, 'hero', 144, feet - 48, 2);
      break;
    }
    case 'S3':
      roomBase(ctx, 1);
      cabinet(ctx, 8, 50);
      cabinet(ctx, 40, 50);
      pinboard(ctx, 120, 20);
      cabinet(ctx, 282, 50);
      desk(ctx, 186, 118, 80);
      drawSprite(ctx, 'npc1', 226, feet - 70, 2, true);
      drawSprite(ctx, 'hero', 96, feet - 48, 2);
      break;
    default:
      roomBase(ctx, 1);
      pinboard(ctx, 120, 20);
      drawSprite(ctx, 'hero', 144, feet - 48, 2);
  }
}

/** Vẽ avatar 16x24 vào một canvas nhỏ (khung chat). */
export function drawAvatar(canvas, name) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSprite(ctx, SPRITES[name] ? name : 'hero', 0, 0, 1);
}

/** Phóng canvas theo bội số nguyên của 320 khi đủ chỗ, để pixel đều nhau. */
export function fitCanvas(canvas) {
  const parent = canvas.parentElement;
  if (!parent) return;
  const avail = Math.min(parent.clientWidth, 960);
  const scale = Math.floor(avail / W);
  canvas.style.width = scale >= 1 ? `${W * scale}px` : '100%';
}
