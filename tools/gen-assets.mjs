// Sinh asset TẠM cho giai đoạn 1: tileset văn phòng, sprite nhân vật 4 hướng, bản đồ Tiled.
// Chạy: node tools/gen-assets.mjs   (giai đoạn 2 sẽ thay bằng art thật; bản đồ có thể sửa bằng Tiled)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img, rgba, seeded } from './png.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'game');
const T = 32; // cỡ ô

/** Làm sáng / tối một màu hex theo hệ số (-1..1). */
function shade(hex, k) {
  const [r, g, b] = rgba(hex);
  const f = c => Math.max(0, Math.min(255, Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k))));
  return `#${[f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

// ---------------------------------------------------------------- tileset

const TILES = [
  'floor_wood', 'floor_lobby', 'carpet', 'wall_top', 'wall_face', 'door_closed', 'window', 'pinboard',
  'desk', 'cabinet', 'bookshelf', 'plant', 'chair', 'rug', 'sofa', 'reception',
  'doorway', 'exit_mat'
];
const COLLIDES = new Set(['wall_top', 'wall_face', 'door_closed', 'window', 'pinboard', 'desk', 'cabinet', 'bookshelf', 'plant', 'sofa', 'reception']);
const tid = name => TILES.indexOf(name);

/** Vẽ một ô 32x32 theo tên tại (ox, oy). */
function drawTile(img, name, ox, oy, rnd) {
  const R = (x, y, w, h, c) => img.rect(ox + x, oy + y, w, h, c);
  const noise = (base, amt, n = 40) => {
    for (let i = 0; i < n; i++) R(Math.floor(rnd() * T), Math.floor(rnd() * T), 1, 1, shade(base, (rnd() - 0.5) * amt));
  };
  const wallFace = () => {
    R(0, 0, T, T, '#2c3e66');
    for (let x = 0; x < T; x += 8) R(x, 0, 1, 26, '#26365a');
    R(0, 0, T, 2, '#3a5080');
    R(0, 26, T, 6, '#4a3328');
    R(0, 26, T, 1, '#6b4a3a');
  };
  switch (name) {
    case 'floor_wood':
      R(0, 0, T, T, '#9a6b47');
      for (let y = 0; y < T; y += 8) { R(0, y, T, 1, '#7d5537'); R((y * 3) % T, y + 1, 1, 7, '#7d5537'); }
      noise('#9a6b47', 0.25, 60);
      break;
    case 'floor_lobby':
      R(0, 0, T, T, '#d8d0bf');
      R(0, 0, 16, 16, '#cfc6b3'); R(16, 16, 16, 16, '#cfc6b3');
      R(0, 0, T, 1, '#b9af9a'); R(0, 0, 1, T, '#b9af9a'); R(0, 16, T, 1, '#c2b8a3'); R(16, 0, 1, T, '#c2b8a3');
      noise('#d8d0bf', 0.08, 30);
      break;
    case 'carpet':
      R(0, 0, T, T, '#2f6f6a');
      noise('#2f6f6a', 0.2, 90);
      R(0, 0, T, 2, '#27605b'); R(0, 30, T, 2, '#27605b');
      break;
    case 'wall_top':
      R(0, 0, T, T, '#1a2236');
      R(0, 0, T, 2, '#2a3554');
      noise('#1a2236', 0.2, 20);
      break;
    case 'wall_face':
      wallFace();
      break;
    case 'door_closed':
      wallFace();
      R(4, 2, 24, 30, '#5a3a24'); R(6, 4, 20, 28, '#7a5233');
      R(8, 6, 16, 10, '#8a6040'); R(8, 18, 16, 12, '#8a6040');
      R(22, 18, 2, 3, '#e8c25a');
      break;
    case 'window':
      wallFace();
      R(3, 3, 26, 20, '#b4b8c5');
      R(5, 5, 22, 16, '#162038');
      R(5, 15, 22, 6, '#2a9d8f');
      R(7, 11, 6, 4, '#4a5363'); R(19, 9, 6, 6, '#4a5363');
      R(22, 6, 2, 2, '#f4eedc'); R(9, 7, 1, 1, '#f2d36b');
      R(15, 5, 2, 16, '#b4b8c5');
      for (let x = 6; x < 26; x += 5) R(x, 17, 3, 1, '#3d7fd1');
      break;
    case 'pinboard':
      wallFace();
      R(2, 3, 28, 21, '#5b3b28'); R(3, 4, 26, 19, '#a5774f');
      [[5, 6, '#f4eedc'], [14, 5, '#f2d36b'], [22, 7, '#f4eedc'], [8, 15, '#e79aa0'], [19, 15, '#f4eedc']].forEach(([x, y, c]) => {
        R(x, y, 7, 6, c); R(x + 1, y + 2, 4, 1, '#8a8a8a'); R(x + 3, y, 1, 1, '#c8323c');
      });
      for (let i = 0; i < 9; i++) R(8 + i, 9 + Math.round(i * 0.7), 1, 1, '#c8323c');
      break;
    case 'desk':
      R(0, 0, T, T, '#9a6b47');
      R(1, 6, 30, 14, '#6b4630'); R(1, 6, 30, 3, '#8a5c3d'); R(1, 20, 30, 10, '#4e3324');
      R(4, 7, 10, 6, '#f4eedc'); R(6, 9, 6, 1, '#999'); R(18, 4, 8, 7, '#2b2f3a'); R(19, 5, 6, 5, '#5fb3d9');
      R(3, 28, 3, 4, '#2b1d16'); R(26, 28, 3, 4, '#2b1d16');
      break;
    case 'cabinet':
      R(0, 0, T, T, '#9a6b47');
      R(3, 0, 26, 31, '#2b2f3a'); R(4, 1, 24, 29, '#7d8496');
      for (let i = 0; i < 3; i++) { R(6, 3 + i * 9, 20, 7, '#9aa1b3'); R(13, 6 + i * 9, 6, 2, '#2b2f3a'); R(8, 4 + i * 9, 5, 2, '#f4eedc'); }
      break;
    case 'bookshelf':
      R(0, 0, T, T, '#9a6b47');
      R(2, 0, 28, 31, '#4e3324'); R(3, 1, 26, 29, '#6b4630');
      for (let s = 0; s < 3; s++) {
        R(3, 9 + s * 10, 26, 2, '#4e3324');
        for (let b = 0; b < 8; b++) R(4 + b * 3, 2 + s * 10, 2, 7, ['#c8323c', '#3d7fd1', '#f2d36b', '#4aa35b', '#e8902f', '#8c7bb8'][(b + s) % 6]);
      }
      break;
    case 'plant':
      R(0, 0, T, T, '#00000000');
      img.ellipse(ox + 16, oy + 29, 9, 3, '#00000044');
      R(10, 20, 12, 10, '#a0522d'); R(10, 20, 12, 2, '#c06a3a');
      img.ellipse(ox + 16, oy + 12, 10, 9, '#2f7d3b');
      img.ellipse(ox + 12, oy + 10, 5, 5, '#3f9a4b'); img.ellipse(ox + 20, oy + 14, 5, 4, '#3f9a4b');
      img.ellipse(ox + 16, oy + 6, 4, 3, '#57b864');
      break;
    case 'chair':
      R(0, 0, T, T, '#00000000');
      R(9, 8, 14, 14, '#3a3f4d'); R(10, 9, 12, 8, '#59606f'); R(10, 22, 2, 6, '#22252e'); R(20, 22, 2, 6, '#22252e');
      break;
    case 'rug':
      R(0, 0, T, T, '#8b2f3c');
      R(2, 2, 28, 28, '#a33a48'); R(6, 6, 20, 20, '#8b2f3c'); R(10, 10, 12, 12, '#d9a441');
      noise('#a33a48', 0.15, 30);
      break;
    case 'sofa':
      R(0, 0, T, T, '#d8d0bf');
      R(1, 6, 30, 22, '#2a4f7a'); R(1, 6, 30, 7, '#356396'); R(1, 6, 4, 22, '#203d5f'); R(27, 6, 4, 22, '#203d5f');
      R(5, 15, 22, 9, '#3a6ea6');
      break;
    case 'reception':
      R(0, 0, T, T, '#d8d0bf');
      R(0, 4, T, 26, '#3b2c4a'); R(0, 4, T, 5, '#f4eedc'); R(0, 9, T, 2, '#2a1f35');
      for (let x = 2; x < T; x += 8) R(x, 13, 4, 14, '#4a3a5c');
      break;
    case 'doorway':
      R(0, 0, T, T, '#8a6040');
      R(0, 0, T, 3, '#5a3a24'); noise('#8a6040', 0.2, 30);
      break;
    case 'exit_mat':
      R(0, 0, T, T, '#d8d0bf');
      R(2, 4, 28, 24, '#3a3f4d'); for (let y = 6; y < 26; y += 3) R(4, y, 24, 1, '#4c5262');
      break;
    default:
      R(0, 0, T, T, '#ff00ff');
  }
}

function buildTileset() {
  const cols = 8, rows = Math.ceil(TILES.length / cols);
  const img = new Img(cols * T, rows * T);
  TILES.forEach((name, i) => drawTile(img, name, (i % cols) * T, Math.floor(i / cols) * T, seeded(i + 7)));
  img.save(path.join(ROOT, 'assets/tiles/office.png'));
  return { cols, rows };
}

// ---------------------------------------------------------------- nhân vật

// Thông số từng nhân vật (thiết kế gốc). skirt: váy; hair: short | long | spiky | grey | bob.
const CHARACTERS = {
  hero: { skin: '#f1c7a0', hair: '#2b1d1a', hairStyle: 'short', top: '#d08a3a', bottom: '#2d3a5a', shoes: '#3b2418', hat: '#e9c46a', scarf: '#2a9d8f', badge: true },
  npc1: { skin: '#f0c4a4', hair: '#1b1418', hairStyle: 'long', top: '#3d5a98', inner: '#f4eedc', bottom: '#4a4e5c', skirt: true, shoes: '#1d1d24', glasses: true, lanyard: true },
  npc2: { skin: '#e6b48f', hair: '#3a2a20', hairStyle: 'spiky', top: '#5f8a6b', bottom: '#2f2f38', shoes: '#22222a', glasses: true, camera: true },
  npc3: { skin: '#e9c2a0', hair: '#cfcfcf', hairStyle: 'grey', top: '#8a6b4f', inner: '#e8dcc0', bottom: '#4b4b4b', shoes: '#2b2b2b', glasses: true },
  npc4: { skin: '#e8b994', hair: '#5a3a1a', hairStyle: 'spiky', top: '#c0392b', bottom: '#2c3e50', shoes: '#1f1f1f', phone: true },
  npc5: { skin: '#f3cdb0', hair: '#d98aa8', hairStyle: 'long', top: '#f4f1de', bottom: '#f4f1de', skirt: true, shoes: '#c9a0dc' },
  npc6: { skin: '#d9a67e', hair: '#2a2a2a', hairStyle: 'short', top: '#7a8a99', bottom: '#5a4a3a', shoes: '#2b2118', cap: '#b23a3a' }
};

const OUTLINE = '#1a1420';

/** Vẽ một khung nhân vật 32x48. dir: down | up | right. frame: 0 đứng, 1/2 bước chân. */
function drawCharFrame(spec, dir, frame) {
  const f = new Img(32, 48);
  const R = (x, y, w, h, c) => f.rect(x, y, w, h, c);
  const step = frame === 0 ? 0 : frame === 1 ? 1 : -1;
  const bob = frame === 0 ? 0 : 1;
  const top = shade(spec.top, 0), topDark = shade(spec.top, -0.25), topLight = shade(spec.top, 0.18);
  const hair = spec.hair, hairDark = shade(spec.hair, -0.25), hairLight = shade(spec.hair, 0.2);
  const skin = spec.skin, skinDark = shade(spec.skin, -0.15);
  const y0 = bob; // nhún khi bước

  // Chân
  const legTop = 34;
  if (dir === 'right') {
    R(13 + step * 2, legTop, 4, 10, spec.skirt ? skin : spec.bottom);
    R(16 - step * 2, legTop, 4, 10, spec.skirt ? skinDark : shade(spec.bottom, -0.2));
    R(13 + step * 2, 42, 5, 2, spec.shoes); R(16 - step * 2, 42, 5, 2, spec.shoes);
  } else {
    R(11, legTop + (step > 0 ? -1 : 0), 4, 10 - (step > 0 ? 1 : 0), spec.skirt ? skin : spec.bottom);
    R(17, legTop + (step < 0 ? -1 : 0), 4, 10 - (step < 0 ? 1 : 0), spec.skirt ? skin : shade(spec.bottom, -0.15));
    R(11, 42 + (step > 0 ? -1 : 0), 4, 2, spec.shoes); R(17, 42 + (step < 0 ? -1 : 0), 4, 2, spec.shoes);
  }

  // Thân
  const bx = dir === 'right' ? 11 : 9, bw = dir === 'right' ? 10 : 14;
  R(bx, 20 + y0, bw, 15, top);
  R(bx, 20 + y0, bw, 2, topLight);
  R(bx + bw - 2, 22 + y0, 2, 13, topDark);
  if (spec.skirt) { R(bx - 1, 30 + y0, bw + 2, 6, spec.bottom); R(bx - 1, 35 + y0, bw + 2, 1, shade(spec.bottom, -0.25)); }
  else { R(bx, 32 + y0, bw, 3, spec.bottom); }
  if (spec.inner && dir === 'down') { R(14, 20 + y0, 4, 9, spec.inner); R(15, 21 + y0, 2, 6, shade(spec.inner, -0.08)); }
  if (spec.lanyard && dir === 'down') { R(13, 21 + y0, 1, 7, '#c8323c'); R(18, 21 + y0, 1, 7, '#c8323c'); R(14, 28 + y0, 4, 4, '#f2d36b'); }
  if (spec.badge && dir !== 'up') R(dir === 'right' ? 18 : 19, 25 + y0, 2, 2, '#c9d1dc');
  if (spec.camera && dir === 'down') { R(13, 27 + y0, 6, 4, '#2b2f3a'); R(15, 28 + y0, 2, 2, '#5fb3d9'); }

  // Tay (đung đưa ngược chân)
  if (dir === 'right') {
    R(14 - step * 2, 21 + y0, 4, 10, topDark);
    R(14 - step * 2, 30 + y0, 4, 2, skin);
    if (spec.phone) R(17 - step * 2, 28 + y0, 3, 4, '#222');
  } else {
    R(7, 21 + y0 + (step < 0 ? 1 : 0), 2, 10, topDark); R(7, 31 + y0 + (step < 0 ? 1 : 0), 2, 2, skin);
    R(23, 21 + y0 + (step > 0 ? 1 : 0), 2, 10, topDark); R(23, 31 + y0 + (step > 0 ? 1 : 0), 2, 2, skin);
    if (spec.phone && dir === 'down') R(23, 29 + y0, 3, 4, '#222');
  }

  // Khăn quàng
  if (spec.scarf) {
    const sc = spec.scarf, scD = shade(sc, -0.25);
    if (dir === 'right') { R(12, 18 + y0, 10, 3, sc); R(11, 21 + y0, 2, 5, scD); }
    else { R(10, 18 + y0, 12, 3, sc); if (dir === 'down') { R(18, 21 + y0, 3, 6, scD); } else { R(11, 21 + y0, 3, 5, scD); } }
  }

  // Tóc dài phía sau (vẽ trước đầu)
  if (spec.hairStyle === 'long') {
    if (dir === 'up') R(9, 8 + y0, 14, 18, hairDark);
    else if (dir === 'right') R(10, 8 + y0, 6, 18, hairDark);
    else { R(8, 9 + y0, 3, 16, hairDark); R(21, 9 + y0, 3, 16, hairDark); }
  }

  // Đầu
  const hx = dir === 'right' ? 11 : 10, hw = dir === 'right' ? 11 : 12;
  R(hx, 6 + y0, hw, 13, skin);
  R(hx + 1, 5 + y0, hw - 2, 1, skin);
  R(hx + 1, 19 + y0, hw - 2, 1, skinDark);
  if (dir === 'down') {
    R(13, 12 + y0, 2, 3, '#2b1d1a'); R(18, 12 + y0, 2, 3, '#2b1d1a');
    R(13, 12 + y0, 1, 1, '#ffffff'); R(18, 12 + y0, 1, 1, '#ffffff');
    R(11, 15 + y0, 2, 1, '#e79aa0'); R(20, 15 + y0, 2, 1, '#e79aa0');
    R(15, 16 + y0, 3, 1, '#a0524a');
    if (spec.glasses) { f.frame(12, 11 + y0, 4, 5, '#2b2f3a'); f.frame(17, 11 + y0, 4, 5, '#2b2f3a'); R(16, 12 + y0, 1, 1, '#2b2f3a'); }
  } else if (dir === 'right') {
    R(18, 12 + y0, 2, 3, '#2b1d1a'); R(18, 12 + y0, 1, 1, '#ffffff');
    R(22, 14 + y0, 1, 2, skinDark);
    R(19, 16 + y0, 2, 1, '#a0524a');
    if (spec.glasses) { f.frame(17, 11 + y0, 4, 5, '#2b2f3a'); R(13, 12 + y0, 4, 1, '#2b2f3a'); }
  }

  // Tóc
  const hs = spec.hairStyle;
  if (dir === 'up') {
    R(9, 4 + y0, 14, 15, hair); R(10, 4 + y0, 12, 2, hairLight); R(9, 15 + y0, 14, 4, hairDark);
  } else if (dir === 'right') {
    R(10, 4 + y0, 13, 6, hair); R(10, 4 + y0, 5, 15, hair); R(11, 4 + y0, 10, 1, hairLight);
    if (hs === 'spiky') { R(12, 2 + y0, 2, 2, hair); R(16, 2 + y0, 2, 2, hair); R(20, 3 + y0, 2, 2, hair); }
  } else {
    R(9, 4 + y0, 14, 6, hair); R(10, 3 + y0, 12, 1, hair); R(11, 4 + y0, 10, 1, hairLight);
    R(9, 8 + y0, 2, 7, hair); R(21, 8 + y0, 2, 7, hair);
    R(11, 10 + y0, 4, 1, hairDark); R(17, 10 + y0, 4, 1, hairDark);
    if (hs === 'spiky') { R(10, 1 + y0, 2, 3, hair); R(15, 1 + y0, 2, 3, hair); R(20, 1 + y0, 2, 3, hair); }
    if (hs === 'grey') R(9, 4 + y0, 14, 1, '#ffffff');
  }

  // Mũ cói (thám tử) / mũ lưỡi trai
  if (spec.hat) {
    const h = spec.hat, hD = shade(h, -0.3);
    R(11, 0 + y0, 10, 6, h); R(11, 4 + y0, 10, 2, hD);
    if (dir === 'right') R(7, 6 + y0, 19, 2, h); else R(6, 6 + y0, 20, 2, h);
    R(dir === 'right' ? 7 : 6, 8 + y0, dir === 'right' ? 19 : 20, 1, hD);
    for (let x = 12; x < 20; x += 3) R(x, 1 + y0, 1, 3, shade(h, 0.2));
  }
  if (spec.cap) {
    const c = spec.cap;
    R(9, 2 + y0, 14, 6, c); R(10, 2 + y0, 12, 1, shade(c, 0.2));
    if (dir === 'down') R(9, 8 + y0, 14, 2, shade(c, -0.3));
    if (dir === 'right') R(20, 7 + y0, 6, 2, shade(c, -0.3));
  }

  // Viền ngoài tự động
  const out = new Img(32, 48);
  out.ellipse(16, 45, 9, 2, '#00000050');
  for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) {
    if (f.get(x, y)[3] > 200) continue;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < 32 && ny < 48 && f.get(nx, ny)[3] > 200;
    });
    if (near) out.set(x, y, OUTLINE);
  }
  out.blit(f, 0, 0, 32, 48, 0, 0);
  return out;
}

/** Sprite sheet 3 cột (đứng, bước 1, bước 2) x 4 hàng (xuống, trái, phải, lên). */
function buildCharacter(id, spec) {
  const sheet = new Img(96, 192);
  ['down', 'left', 'right', 'up'].forEach((dir, row) => {
    for (let fr = 0; fr < 3; fr++) {
      const frame = drawCharFrame(spec, dir === 'left' ? 'right' : dir, fr);
      sheet.blit(frame, 0, 0, 32, 48, fr * 32, row * 48, dir === 'left');
    }
  });
  sheet.save(path.join(ROOT, `assets/sprites/${id}.png`));
}

// ---------------------------------------------------------------- bản đồ văn phòng

// Ký hiệu: # tường trên, W mặt tường, w cửa sổ, p bảng ghim, D lối cửa phòng, E cửa ra phố,
// . sàn gỗ, ~ thảm hành lang, , sàn sảnh, d bàn, c tủ hồ sơ, b kệ sách, P cây, h ghế, s sofa, R quầy lễ tân.
const OFFICE = [
  '########################################',
  '#WWWppWWWW#WWWwwWWWW#WWwWWWwWW#WWWwwWWW#',
  '#ccc...ccc#........P#bbb.....b#ccc....P#',
  '#.........#.........#.........#........#',
  '#.........#.ddd.ddd.#.........#........#',
  '#...ddd...#..h...h..#...ddd...#...ddd..#',
  '#....h....#.........#....h....#....h...#',
  '#.........#.........#.........#........#',
  '#P.......P#P.......P#........P#P.......#',
  '####DD##########DD########DD#######DD###',
  '#WWWDDWWWWWWWWWWDDWWWWWWWWWDDWWWWWWWDDW#',
  '#P~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~P#',
  '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
  '#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~#',
  '################,,,,,,,,################',
  '#WWwWWpWWWwWWWWW,,,,,,,,WWWWWwWWWWWwWWW#',
  '#bb.............P,,,,,,P...............#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,RRRRRR,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,sss,,,,,,,,,,,,,,,,,,,,,,,,,,,sss,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
  '#P,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,P#',
  '###################EE###################'
].map(r => r.replace(/,/g, ',').replace(/(.)/g, '$1'));

// Thảm đỏ trong sảnh và trong Phòng Hồ sơ (lớp nền).
const RUGS = [[2, 21, 6, 4], [32, 21, 6, 4], [3, 6, 5, 2]];

const FURNITURE = { '#': 'wall_top', W: 'wall_face', w: 'window', p: 'pinboard', d: 'desk', c: 'cabinet', b: 'bookshelf', P: 'plant', h: 'chair', s: 'sofa', R: 'reception' };

/** Nền của một ô theo khu vực (phòng: gỗ, hành lang: thảm, sảnh: gạch). */
function groundFor(ch, y) {
  if (ch === 'D') return 'doorway';
  if (ch === 'E') return 'exit_mat';
  if (ch === '~') return 'carpet';
  if (y >= 14) return 'floor_lobby';
  if (y >= 11) return 'carpet';
  return 'floor_wood';
}

const px = (tx, ty) => ({ x: tx * T, y: ty * T });
let nextId = 1;
const prop = (name, value) => ({ name, type: typeof value === 'number' ? 'float' : 'string', value });

/** Tạo object Tiled. */
function obj(type, name, x, y, w = 0, h = 0, props = {}, extra = {}) {
  return { id: nextId++, name, type, x, y, width: w, height: h, rotation: 0, visible: true, properties: Object.entries(props).map(([k, v]) => prop(k, v)), ...extra };
}
const rectT = (type, name, tx, ty, tw, th, props) => obj(type, name, tx * T, ty * T, tw * T, th * T, props);
const point = (type, name, tx, ty, props) => obj(type, name, tx * T, ty * T, 0, 0, props, { point: true });
const path_ = (name, pts) => {
  const [sx, sy] = pts[0];
  return obj('path', name, sx * T, sy * T, 0, 0, {}, { polyline: pts.map(([x, y]) => ({ x: (x - sx) * T, y: (y - sy) * T })) });
};

function buildOfficeMap() {
  const W = OFFICE[0].length, H = OFFICE.length;
  OFFICE.forEach((r, i) => { if (r.length !== W) throw new Error(`hàng ${i} dài ${r.length}, cần ${W}`); });
  const ground = [], walls = [], doors = new Array(W * H).fill(0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = OFFICE[y][x];
    let g = groundFor(ch, y);
    if (RUGS.some(([rx, ry, rw, rh]) => x >= rx && x < rx + rw && y >= ry && y < ry + rh) && !FURNITURE[ch]) g = 'rug';
    ground.push(tid(g) + 1);
    walls.push(FURNITURE[ch] ? tid(FURNITURE[ch]) + 1 : 0);
  }
  // Cửa phòng đóng (lớp riêng, gỡ khi phòng mở khóa).
  const doorCols = { S3: 4, S4: 16, S7: 26, S8: 35 };
  for (const cx of Object.values(doorCols)) for (const dx of [0, 1]) {
    doors[9 * W + cx + dx] = tid('wall_top') + 1;
    doors[10 * W + cx + dx] = tid('door_closed') + 1;
  }

  const objects = [
    point('spawn', 'spawn_start', 20, 25.5),
    point('spawn', 'spawn_from_street', 20, 25.5),
    // Khu vực (đổi nhãn vị trí, phát lời giới thiệu phòng)
    rectT('zone', 'zone_S3', 1, 1, 9, 8, { room: 'S3' }),
    rectT('zone', 'zone_S4', 11, 1, 9, 8, { room: 'S4' }),
    rectT('zone', 'zone_S7', 21, 1, 9, 8, { room: 'S7' }),
    rectT('zone', 'zone_S8', 31, 1, 8, 8, { room: 'S8' }),
    rectT('zone', 'zone_corridor', 1, 11, 38, 3, { area: 'corridor' }),
    rectT('zone', 'zone_lobby', 1, 14, 38, 13, { area: 'lobby' }),
    // Cửa phòng
    ...Object.entries(doorCols).map(([room, cx]) => rectT('door', `door_${room}`, cx, 9, 2, 2, { room })),
    rectT('exit', 'exit_street', 19, 26.6, 2, 1.4, { target: 'street', spawn: 'spawn_from_office' }),
    // NPC
    point('npc', 'npc1', 19, 20.5, { patrol: 'patrol_npc1_lobby' }),
    point('npc', 'npc2', 8, 12.5, { patrol: 'patrol_npc2' }),
    // Đường đi
    path_('patrol_npc1_lobby', [[16.5, 20.5], [23.5, 20.5]]),
    path_('patrol_npc2', [[3, 12.5], [36, 12.5]]),
    path_('lead_hoso', [[19, 20.5], [16.5, 20.5], [16.5, 17.5], [19.5, 17.5], [19.5, 12.5], [5, 12.5], [5, 9.8], [5, 7.5]]),
    path_('patrol_npc1_hoso', [[2.5, 7.5], [8.5, 7.5]]),
    point('station', 'npc1_hoso', 5, 7.5),
    path_('patrol_npc2_s4', [[12.5, 7.5], [18.5, 7.5]]),
    point('station', 'npc2_s4', 15.5, 7.5),
    // Đồ vật xem được
    rectT('inspect', 'inspect_notice', 6, 15, 1, 1, { text: 'inspect_notice' }),
    rectT('inspect', 'inspect_window_lobby', 3, 15, 1, 1, { text: 'inspect_window' }),
    rectT('inspect', 'inspect_reception', 17, 18, 6, 1, { text: 'inspect_reception' }),
    rectT('inspect', 'inspect_pinboard_S3', 4, 1, 2, 1, { text: 'inspect_pinboard' }),
    rectT('inspect', 'inspect_cabinet_S3', 1, 2, 3, 1, { text: 'inspect_cabinet' }),
    rectT('inspect', 'inspect_bookshelf_lobby', 1, 16, 2, 1, { text: 'inspect_bookshelf' }),
    rectT('inspect', 'inspect_lab_S4', 12, 4, 7, 1, { text: 'inspect_lab' })
  ];

  const layer = (id, name, data) => ({ id, name, type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data });
  const { cols, rows } = { cols: 8, rows: Math.ceil(TILES.length / 8) };
  const map = {
    compressionlevel: -1, type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down',
    infinite: false, width: W, height: H, tilewidth: T, tileheight: T, nextlayerid: 5, nextobjectid: nextId,
    properties: [prop('label', 'Văn phòng Ban Điều phối Thông tin Du lịch Hải Đăng'), prop('music', 'office')],
    layers: [
      layer(1, 'ground', ground),
      layer(2, 'walls', walls),
      layer(3, 'doors', doors),
      { id: 4, name: 'objects', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects }
    ],
    tilesets: [{
      firstgid: 1, name: 'office', image: '../assets/tiles/office.png', imagewidth: cols * T, imageheight: rows * T,
      tilewidth: T, tileheight: T, tilecount: TILES.length, columns: cols, margin: 0, spacing: 0,
      tiles: TILES.map((n, id) => ({ id, properties: [prop('name', n), { name: 'collides', type: 'bool', value: COLLIDES.has(n) }] }))
    }]
  };
  fs.mkdirSync(path.join(ROOT, 'maps'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'maps/office.json'), JSON.stringify(map));
  return { W, H, objects: objects.length };
}

buildTileset();
for (const [id, spec] of Object.entries(CHARACTERS)) buildCharacter(id, spec);
const m = buildOfficeMap();
console.log(`ok: tileset ${TILES.length} ô, ${Object.keys(CHARACTERS).length} nhân vật, bản đồ ${m.W}x${m.H}, ${m.objects} object`);
