// Sinh asset TẠM cho giai đoạn 1: tileset văn phòng, sprite nhân vật 4 hướng, bản đồ Tiled.
// Chạy: node tools/gen-assets.mjs   (giai đoạn 2 sẽ thay bằng art thật; bản đồ có thể sửa bằng Tiled)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img, rgba, seeded } from './png.mjs';
import { CHARACTERS, shade } from './characters.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'game');
const T = 32; // cỡ ô

// ---------------------------------------------------------------- tileset

const TILES = [
  'floor_wood', 'floor_lobby', 'carpet', 'wall_top', 'wall_face', 'door_closed', 'window', 'pinboard',
  'desk', 'cabinet', 'bookshelf', 'plant', 'chair', 'rug', 'sofa', 'reception',
  'doorway', 'exit_mat',
  // ngoài trời
  'grass', 'sidewalk', 'promenade', 'road', 'road_line', 'water', 'karst', 'railing',
  'dock', 'roof', 'facade', 'facade_window', 'shop_door', 'awning', 'signboard', 'tree',
  'bench', 'lamp', 'flowerbed',
  // phòng boss
  'void', 'frame_wall', 'frame', 'shard',
  // phòng thám tử: thiết bị (mỗi thiết bị là một object 'device' trên bản đồ)
  'floor_dark', 'dev_pc', 'dev_lighttable', 'dev_detector', 'dev_reader', 'dev_monitors', 'dev_timeline', 'dev_evidence',
  // nội thất chi tiết
  'blinds', 'clock', 'poster', 'whiteboard', 'tv_wall', 'paper_desk', 'printer', 'water_cooler', 'filing_boxes', 'floor_lamp',
  'coffee_table', 'trash', 'counter', 'cafe_table', 'floor_check',
  // mặt tiền và phố
  'glass', 'brick', 'brick_window', 'stone', 'stone_window', 'roof_edge', 'ac_unit', 'balcony', 'cafe_window', 'neon',
  'curb', 'curb_low', 'crosswalk', 'kiosk', 'bus_stop', 'bin', 'bollard', 'stall', 'boat_l', 'boat_r', 'gravel', 'hydrant', 'post'
];
const COLLIDES = new Set(['wall_top', 'wall_face', 'door_closed', 'window', 'pinboard', 'desk', 'cabinet', 'bookshelf', 'plant', 'sofa', 'reception',
  'water', 'karst', 'railing', 'roof', 'facade', 'facade_window', 'awning', 'signboard', 'tree', 'bench', 'lamp', 'flowerbed', 'frame_wall', 'frame',
  'dev_pc', 'dev_lighttable', 'dev_detector', 'dev_reader', 'dev_monitors', 'dev_timeline', 'dev_evidence',
  'blinds', 'clock', 'poster', 'whiteboard', 'tv_wall', 'paper_desk', 'printer', 'water_cooler', 'filing_boxes', 'floor_lamp',
  'coffee_table', 'counter', 'cafe_table',
  'glass', 'brick', 'brick_window', 'stone', 'stone_window', 'roof_edge', 'ac_unit', 'balcony', 'cafe_window', 'neon',
  'kiosk', 'bus_stop', 'bin', 'bollard', 'stall', 'boat_l', 'boat_r', 'hydrant', 'post']);
const tid = name => TILES.indexOf(name);

/** Vẽ một ô 32x32 theo tên tại (ox, oy). */
function drawTile(img, name, ox, oy, rnd) {
  const R = (x, y, w, h, c) => img.rect(ox + x, oy + y, w, h, c);
  const noise = (base, amt, n = 40) => {
    for (let i = 0; i < n; i++) R(Math.floor(rnd() * T), Math.floor(rnd() * T), 1, 1, shade(base, (rnd() - 0.5) * amt));
  };
  const wallFace = () => {
    R(0, 0, T, T, '#e9dcc0');
    for (let x = 0; x < T; x += 8) R(x, 2, 1, 18, '#e0d1b2');
    R(0, 0, T, 2, '#f3e9d4');
    R(0, 20, T, 12, '#8a5c3d'); R(0, 20, T, 2, '#a77b52'); R(0, 30, T, 2, '#6b4630');
    for (let x = 4; x < T; x += 8) R(x, 23, 1, 6, '#7a5035');
  };
  // bóng đổ mềm dưới đồ đạc (nền trong suốt để thấy sàn bên dưới)
  const shadow = (w = 12, y = 29) => img.ellipse(ox + 16, oy + y, w, 3, '#00000038');
  switch (name) {
    case 'floor_wood':
      R(0, 0, T, T, '#c08a56');
      for (let y = 0; y < T; y += 8) { R(0, y, T, 1, '#a0703f'); R((y * 3) % T, y + 1, 1, 7, '#a0703f'); }
      noise('#c08a56', 0.18, 60);
      break;
    case 'floor_lobby':
      R(0, 0, T, T, '#d8d0bf');
      R(0, 0, 16, 16, '#cfc6b3'); R(16, 16, 16, 16, '#cfc6b3');
      R(0, 0, T, 1, '#b9af9a'); R(0, 0, 1, T, '#b9af9a'); R(0, 16, T, 1, '#c2b8a3'); R(16, 0, 1, T, '#c2b8a3');
      noise('#d8d0bf', 0.08, 30);
      break;
    case 'carpet':
      R(0, 0, T, T, '#7f9e62');
      noise('#7f9e62', 0.15, 90);
      R(0, 0, T, 2, '#6d8a52'); R(0, 30, T, 2, '#6d8a52');
      break;
    case 'wall_top':
      R(0, 0, T, T, '#5a4030');
      R(0, 0, T, 2, '#6e5040');
      noise('#5a4030', 0.15, 20);
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
      shadow(14, 29);
      R(1, 6, 30, 14, '#6b4630'); R(1, 6, 30, 3, '#8a5c3d'); R(1, 20, 30, 10, '#4e3324');
      R(4, 7, 10, 6, '#f4eedc'); R(6, 9, 6, 1, '#999'); R(18, 4, 8, 7, '#2b2f3a'); R(19, 5, 6, 5, '#5fb3d9');
      R(3, 28, 3, 4, '#2b1d16'); R(26, 28, 3, 4, '#2b1d16');
      break;
    case 'cabinet':
      shadow(14, 30);
      R(3, 0, 26, 31, '#2b2f3a'); R(4, 1, 24, 29, '#8e97a8');
      for (let i = 0; i < 3; i++) { R(6, 3 + i * 9, 20, 7, '#9aa1b3'); R(13, 6 + i * 9, 6, 2, '#2b2f3a'); R(8, 4 + i * 9, 5, 2, '#f4eedc'); }
      break;
    case 'bookshelf':
      shadow(14, 30);
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
    case 'floor_dark':
      R(0, 0, T, T, '#3a4152');
      for (let y = 0; y < T; y += 16) for (let x = (y / 16) * 8; x < T; x += 16) R(x, y, 15, 15, '#353b4b');
      noise('#3a4152', 0.12, 40);
      break;
    case 'dev_pc':
      // bàn + màn hình tìm ngược ảnh (khung ảnh, kính lúp trên màn)
      shadow(14, 29);
      R(1, 14, 30, 10, '#4e3324'); R(1, 14, 30, 2, '#6b4630'); R(3, 24, 3, 7, '#2b1d16'); R(26, 24, 3, 7, '#2b1d16');
      R(6, 1, 20, 14, '#1b1f2a'); R(7, 2, 18, 11, '#2c6a8f'); R(8, 3, 8, 6, '#a9c4dc'); R(9, 6, 6, 3, '#3f7899');
      img.ellipse(ox + 20, oy + 7, 3, 3, '#f2d36b'); R(21, 9, 2, 2, '#f2d36b'); R(18, 11, 6, 1, '#7fd6ff');
      R(14, 15, 4, 2, '#1b1f2a'); R(8, 18, 14, 3, '#c9d1dc'); R(24, 18, 4, 3, '#c9d1dc');
      break;
    case 'dev_lighttable':
      // bàn soi đèn + kính lúp có tay đỡ
      shadow(14, 29);
      R(1, 10, 30, 14, '#5b6170'); R(2, 11, 28, 10, '#fff6d6'); R(4, 13, 10, 7, '#c9d9e8'); R(16, 12, 10, 8, '#c9d9e8');
      R(3, 24, 3, 7, '#2b2f3a'); R(26, 24, 3, 7, '#2b2f3a');
      R(22, 1, 2, 12, '#2b2f3a'); img.ellipse(ox + 18, oy + 6, 5, 5, '#2b2f3a'); img.ellipse(ox + 18, oy + 6, 3, 3, '#bfe6ff'); R(17, 5, 1, 1, '#ffffff');
      break;
    case 'dev_detector':
      // máy dò ảnh AI: tủ máy, đồng hồ kim, đèn trạng thái
      shadow(13, 30);
      R(4, 0, 24, 31, '#2b2f3a'); R(5, 1, 22, 29, '#4a5363'); R(7, 3, 18, 10, '#14161c');
      img.ellipse(ox + 16, oy + 12, 7, 7, '#e6ebf2'); R(9, 12, 15, 2, '#4a5363');
      for (let i = 0; i < 6; i++) R(16 - Math.round(i * 0.9), 11 - i, 1, 1, '#c8323c');
      R(8, 17, 4, 3, '#4aa35b'); R(14, 17, 4, 3, '#f2d36b'); R(20, 17, 4, 3, '#c8323c');
      R(8, 23, 16, 5, '#14161c'); for (let x = 9; x < 23; x += 3) R(x, 24, 2, 3, '#7fe3ff');
      break;
    case 'dev_reader':
      // đầu đọc kho báo (vi phim): màn hình nghiêng trên tủ, cuộn phim bên hông
      shadow(14, 30);
      R(3, 14, 26, 17, '#5b4a3a'); R(4, 15, 24, 15, '#7a634d'); R(6, 18, 20, 3, '#5b4a3a'); R(6, 24, 20, 3, '#5b4a3a');
      R(5, 0, 22, 14, '#2b2f3a'); R(7, 2, 18, 10, '#e9dcc0'); for (let y = 4; y < 11; y += 2) R(9, y, 14, 1, '#8a7a62');
      img.ellipse(ox + 28, oy + 8, 3, 5, '#14161c'); R(27, 6, 2, 4, '#5b5d6e');
      break;
    case 'dev_monitors':
      // bức tường màn hình theo dõi mạng xã hội
      wallFace();
      R(1, 2, 30, 18, '#14161c');
      [[2, 3, '#3d5a98'], [12, 3, '#2a9d8f'], [22, 3, '#3d5a98'], [2, 11, '#8c7bb8'], [12, 11, '#3d5a98'], [22, 11, '#c8323c']].forEach(([x, y, c]) => {
        R(x, y, 8, 7, c); R(x + 1, y + 1, 6, 1, '#ffffff'); R(x + 1, y + 3, 4, 1, '#c9d1dc'); R(x + 5, y + 5, 2, 1, '#f2d36b');
      });
      break;
    case 'dev_timeline':
      // bảng dòng thời gian: dây ngang, các mốc giấy ghim
      wallFace();
      R(1, 3, 30, 18, '#f4f1e6'); R(1, 3, 30, 1, '#b4b8c5');
      R(1, 12, 30, 1, '#2b2f3a');
      [[3, 5], [10, 14], [17, 5], [24, 14]].forEach(([x, y]) => { R(x, y, 6, 5, '#f2d36b'); R(x + 1, y + 1, 4, 1, '#7a5a20'); R(x + 2, 12, 2, 1, '#c8323c'); });
      break;
    case 'dev_evidence':
      // tường bằng chứng: bảng bần, ảnh, dây đỏ nối các thẻ
      wallFace();
      R(1, 2, 30, 19, '#5b3b28'); R(2, 3, 28, 17, '#b0844f');
      [[4, 5, '#f4eedc'], [13, 4, '#9fb3c8'], [22, 6, '#f4eedc'], [7, 13, '#f2d36b'], [18, 13, '#f4eedc']].forEach(([x, y, c]) => { R(x, y, 6, 5, c); R(x + 2, y, 1, 1, '#c8323c'); });
      for (let i = 0; i < 10; i++) { R(7 + i, 7 + Math.round(i * 0.6), 1, 1, '#c8323c'); R(16 + i, 8 + Math.round(i * 0.5), 1, 1, '#c8323c'); }
      break;
    // ---------- nội thất chi tiết
    case 'blinds':
      // cửa sổ có rèm lá sách: vệt sáng ngang kiểu phim trinh thám
      wallFace();
      R(3, 2, 26, 20, '#b4b8c5'); R(5, 4, 22, 16, '#1c2a44');
      for (let y = 5; y < 20; y += 3) R(5, y, 22, 2, '#c9d1dc');
      R(15, 4, 2, 16, '#b4b8c5'); R(26, 4, 1, 16, '#8e97a8');
      break;
    case 'clock':
      wallFace();
      img.ellipse(ox + 16, oy + 10, 8, 8, '#2b2f3a'); img.ellipse(ox + 16, oy + 10, 6, 6, '#f4eedc');
      R(16, 5, 1, 6, '#2b2f3a'); R(16, 10, 4, 1, '#c8323c');
      break;
    case 'poster':
      wallFace();
      R(8, 2, 16, 18, '#2b2f3a'); R(9, 3, 14, 16, '#e9e4d6'); R(10, 4, 12, 6, '#3d5a98'); R(11, 12, 10, 1, '#5b5d6e'); R(11, 14, 8, 1, '#5b5d6e'); R(11, 16, 9, 1, '#c8323c');
      break;
    case 'whiteboard':
      wallFace();
      R(1, 2, 30, 18, '#8e97a8'); R(2, 3, 28, 16, '#f4f6f8');
      R(4, 6, 10, 1, '#3d5a98'); R(4, 9, 14, 1, '#3d5a98'); img.frame(ox + 19, oy + 5, 8, 7, '#c8323c'); R(4, 13, 6, 1, '#4aa35b');
      R(4, 20, 24, 2, '#5b5d6e');
      break;
    case 'tv_wall':
      wallFace();
      R(1, 1, 30, 19, '#14161c'); R(2, 2, 28, 15, '#2c3a55'); R(2, 13, 28, 4, '#c8323c'); R(4, 14, 12, 1, '#f4eedc'); R(4, 4, 10, 7, '#9fb3c8'); R(16, 5, 11, 1, '#e6ebf2'); R(16, 8, 9, 1, '#9fb3c8');
      break;
    case 'paper_desk':
      // bàn làm việc: màn hình, chồng hồ sơ, đèn bàn, cốc
      shadow(14, 29);
      R(1, 8, 30, 12, '#5a3e2c'); R(1, 8, 30, 3, '#76533a'); R(1, 20, 30, 9, '#45301f');
      R(3, 2, 9, 8, '#2b2f3a'); R(4, 3, 7, 5, '#5fb3d9'); R(6, 10, 3, 1, '#2b2f3a');
      R(14, 6, 7, 5, '#f4eedc'); R(15, 5, 7, 5, '#e9e4d6'); R(16, 4, 6, 5, '#f4eedc'); R(17, 6, 4, 1, '#999999');
      R(25, 2, 1, 8, '#2b2f3a'); R(23, 1, 5, 3, '#2b2f3a'); R(24, 3, 3, 1, '#f2d36b');
      R(22, 10, 3, 3, '#e8e8e8'); R(23, 11, 1, 1, '#6b4630');
      R(3, 28, 3, 4, '#2b1d16'); R(26, 28, 3, 4, '#2b1d16');
      break;
    case 'printer':
      shadow(12, 30);
      R(4, 10, 24, 20, '#3a3f4d'); R(5, 11, 22, 8, '#c9d1dc'); R(7, 6, 18, 5, '#e9e4d6'); R(8, 4, 16, 3, '#f4eedc');
      R(8, 21, 16, 2, '#14161c'); R(22, 13, 3, 2, '#4aa35b');
      break;
    case 'water_cooler':
      shadow(8, 30);
      R(10, 14, 12, 16, '#c9d1dc'); R(11, 15, 10, 4, '#e6ebf2'); R(13, 20, 2, 2, '#3d7fd1'); R(17, 20, 2, 2, '#c8323c');
      R(11, 1, 10, 13, '#7fb0d0'); R(12, 2, 3, 10, '#a9d0ea'); R(13, 0, 6, 2, '#3d7fd1');
      break;
    case 'filing_boxes':
      shadow(13, 30);
      R(3, 14, 13, 15, '#a77b52'); R(3, 14, 13, 2, '#c49a6c'); R(6, 19, 7, 3, '#f4eedc');
      R(16, 16, 13, 13, '#8a6040'); R(16, 16, 13, 2, '#a77b52'); R(19, 20, 7, 3, '#f4eedc');
      R(7, 5, 13, 10, '#a77b52'); R(7, 5, 13, 2, '#c49a6c'); R(10, 9, 7, 3, '#f4eedc');
      break;
    case 'floor_lamp':
      img.ellipse(ox + 16, oy + 30, 6, 2, '#00000044');
      R(15, 8, 2, 21, '#2b2f3a'); R(11, 28, 10, 2, '#2b2f3a');
      R(10, 1, 12, 8, '#e8c66a'); R(11, 2, 10, 6, '#f4dc96'); R(12, 9, 8, 1, '#c99a3a');
      break;
    case 'coffee_table':
      shadow(13, 26);
      R(3, 12, 26, 10, '#5a3e2c'); R(3, 12, 26, 2, '#76533a'); R(5, 22, 2, 5, '#2b1d16'); R(25, 22, 2, 5, '#2b1d16');
      R(7, 14, 8, 5, '#e9e4d6'); R(19, 14, 3, 3, '#f4eedc'); R(20, 15, 1, 1, '#6b4630');
      break;
    case 'trash':
      img.ellipse(ox + 16, oy + 29, 6, 2, '#00000044');
      R(11, 16, 10, 13, '#5b6170'); R(10, 14, 12, 3, '#3a3f4d'); R(13, 18, 1, 9, '#4a5060'); R(18, 18, 1, 9, '#4a5060'); R(14, 12, 4, 3, '#f4eedc');
      break;
    case 'counter':
      // quầy pha chế: mặt gỗ, máy pha cà phê, cốc
      shadow(16, 30);
      R(0, 8, T, 22, '#4e3324'); R(0, 8, T, 4, '#8a5c3d'); for (let x = 3; x < T; x += 8) R(x, 15, 4, 12, '#5a3e2c');
      R(4, 0, 12, 10, '#3a3f4d'); R(6, 2, 8, 4, '#c9d1dc'); R(8, 7, 2, 2, '#14161c'); R(20, 4, 4, 5, '#f4eedc'); R(25, 5, 4, 4, '#e8e8e8');
      break;
    case 'cafe_table':
      img.ellipse(ox + 16, oy + 27, 11, 3, '#00000040');
      img.ellipse(ox + 16, oy + 13, 12, 7, '#6b4630'); img.ellipse(ox + 16, oy + 12, 11, 6, '#8a5c3d');
      R(15, 18, 3, 8, '#2b2f3a'); R(10, 9, 4, 3, '#f4eedc'); R(11, 10, 2, 1, '#6b4630'); R(19, 12, 4, 3, '#f4eedc');
      break;
    case 'floor_check':
      R(0, 0, T, T, '#3a3f4d'); R(0, 0, 16, 16, '#d8d0bf'); R(16, 16, 16, 16, '#d8d0bf');
      break;
    // ---------- mặt tiền
    case 'glass':
      R(0, 0, T, T, '#5b6f8a'); R(1, 1, 14, 30, '#86a6c4'); R(17, 1, 14, 30, '#86a6c4');
      R(2, 2, 4, 28, '#a9c4dc'); R(18, 2, 4, 28, '#a9c4dc'); R(0, 15, T, 2, '#4a5363');
      break;
    case 'brick':
      R(0, 0, T, T, '#8a4a3a');
      for (let y = 0; y < T; y += 6) { R(0, y, T, 1, '#6e3a2e'); for (let x = (y / 6) % 2 ? 4 : 0; x < T; x += 8) R(x, y + 1, 1, 5, '#6e3a2e'); }
      noise('#8a4a3a', 0.15, 40);
      break;
    case 'brick_window':
      R(0, 0, T, T, '#8a4a3a');
      for (let y = 0; y < T; y += 6) R(0, y, T, 1, '#6e3a2e');
      R(5, 3, 22, 24, '#d8d0bf'); R(7, 5, 18, 20, '#2c3a55'); R(15, 5, 2, 20, '#d8d0bf'); R(7, 13, 18, 2, '#d8d0bf'); R(8, 6, 5, 2, '#9fb3c8');
      R(4, 27, 24, 3, '#b4b8c5');
      break;
    case 'stone':
      R(0, 0, T, T, '#4a5060');
      for (let y = 0; y < T; y += 10) { R(0, y, T, 1, '#3a3f4d'); R((y / 10) % 2 ? 10 : 22, y, 1, 10, '#3a3f4d'); }
      noise('#4a5060', 0.12, 30);
      break;
    case 'stone_window':
      R(0, 0, T, T, '#4a5060');
      R(5, 3, 22, 24, '#2b2f3a'); R(7, 5, 18, 20, '#f2c46b'); R(7, 5, 18, 8, '#e0a84e'); R(15, 5, 2, 20, '#2b2f3a'); R(4, 27, 24, 2, '#6b7686');
      break;
    case 'roof_edge':
      R(0, 0, T, T, '#3a3f4d'); R(0, 0, T, 6, '#5b6170'); R(0, 6, T, 3, '#2b2f3a');
      for (let x = 2; x < T; x += 8) R(x, 9, 4, 20, '#4a5060');
      R(0, 28, T, 4, '#2b2f3a');
      break;
    case 'ac_unit':
      R(0, 0, T, T, '#efe2c4'); R(4, 6, 24, 16, '#c9d1dc'); R(5, 7, 22, 14, '#e6ebf2');
      for (let x = 7; x < 25; x += 3) R(x, 9, 1, 10, '#9aa1b3'); R(4, 22, 24, 2, '#8e97a8');
      break;
    case 'balcony':
      R(0, 0, T, T, '#efe2c4'); R(6, 2, 20, 18, '#2c3a55'); R(15, 2, 2, 18, '#efe2c4');
      R(2, 18, 28, 2, '#3a3f4d'); for (let x = 3; x < 30; x += 4) R(x, 20, 1, 8, '#3a3f4d'); R(2, 27, 28, 2, '#3a3f4d');
      R(5, 22, 4, 5, '#4f7a4a'); R(23, 22, 4, 5, '#c8323c');
      break;
    case 'cafe_window':
      R(0, 0, T, T, '#6b4630'); R(2, 2, 28, 26, '#3a2a20'); R(3, 3, 26, 24, '#f2c46b'); R(3, 3, 26, 10, '#e8a94e');
      R(8, 16, 6, 4, '#6b4630'); R(18, 15, 8, 5, '#6b4630'); R(15, 3, 1, 24, '#3a2a20');
      break;
    case 'neon':
      // biển hiệu neon của Phòng thám tử (kính lúp phát sáng)
      R(0, 0, T, T, '#4a5060'); R(1, 6, 30, 18, '#14161c');
      img.ellipse(ox + 12, oy + 14, 6, 6, '#7fe3ff'); img.ellipse(ox + 12, oy + 14, 4, 4, '#14161c');
      for (let i = 0; i < 6; i++) R(16 + i, 18 + i, 2, 2, '#7fe3ff');
      R(22, 10, 6, 1, '#ff9fd0'); R(22, 13, 4, 1, '#ff9fd0');
      break;
    // ---------- phố
    case 'curb':
      R(0, 0, T, T, '#c9c2b4'); for (let y = 0; y < 24; y += 8) R(0, y, T, 1, '#b2aa9a');
      R(0, 24, T, 4, '#e6e1d6'); R(0, 28, T, 4, '#4a4d57');
      break;
    case 'curb_low':
      R(0, 0, T, T, '#c9c2b4'); for (let y = 8; y < T; y += 8) R(0, y, T, 1, '#b2aa9a');
      R(0, 0, T, 4, '#4a4d57'); R(0, 4, T, 4, '#e6e1d6');
      break;
    case 'crosswalk':
      R(0, 0, T, T, '#4a4d57'); noise('#4a4d57', 0.18, 40);
      for (let x = 2; x < T; x += 10) R(x, 0, 6, T, '#e6e1d6');
      break;
    case 'kiosk':
      // sạp báo: mái, kệ báo, tạp chí
      img.ellipse(ox + 16, oy + 30, 13, 2, '#00000044');
      R(2, 2, 28, 5, '#2a9d8f'); for (let x = 2; x < 30; x += 6) R(x, 7, 3, 2, '#2a9d8f');
      R(4, 9, 24, 20, '#6b4630'); R(5, 10, 22, 8, '#3a2a20');
      [[6, 11, '#f4eedc'], [11, 11, '#e9e4d6'], [16, 11, '#c8323c'], [21, 11, '#f2d36b']].forEach(([x, y, c]) => { R(x, y, 4, 6, c); R(x + 1, y + 2, 2, 1, '#5b5d6e'); });
      R(5, 20, 22, 2, '#8a5c3d'); R(7, 22, 6, 6, '#f4eedc'); R(15, 22, 10, 6, '#e9e4d6');
      break;
    case 'bus_stop':
      img.ellipse(ox + 16, oy + 30, 13, 2, '#00000044');
      R(2, 2, 28, 4, '#3a3f4d'); R(3, 6, 2, 22, '#3a3f4d'); R(27, 6, 2, 22, '#3a3f4d');
      R(5, 6, 22, 14, '#9fb3c855'); R(6, 8, 8, 10, '#3d5a98'); R(7, 9, 6, 2, '#f4eedc'); R(5, 22, 22, 3, '#8a5c3d');
      R(25, 0, 6, 6, '#2a9d8f'); R(26, 1, 4, 1, '#f4eedc');
      break;
    case 'bin':
      img.ellipse(ox + 16, oy + 29, 7, 2, '#00000044');
      R(10, 12, 12, 17, '#2f5a4a'); R(9, 10, 14, 3, '#3f7a64'); R(12, 15, 8, 2, '#4f8a74'); R(14, 8, 4, 2, '#3f7a64');
      break;
    case 'bollard':
      img.ellipse(ox + 16, oy + 29, 4, 2, '#00000044');
      R(13, 14, 6, 15, '#3a3f4d'); R(13, 16, 6, 2, '#f2d36b'); R(12, 12, 8, 3, '#4a5060');
      break;
    case 'stall':
      // sạp chợ: dù sọc, bàn hàng trái cây
      img.ellipse(ox + 16, oy + 30, 14, 2, '#00000044');
      for (let x = 0; x < T; x += 8) { R(x, 1, 4, 8, '#e8902f'); R(x + 4, 1, 4, 8, '#f4eedc'); }
      R(15, 9, 2, 8, '#3a3f4d'); R(2, 17, 28, 4, '#8a5c3d'); R(4, 21, 2, 8, '#5a3e2c'); R(26, 21, 2, 8, '#5a3e2c');
      [[4, 14, '#f2d36b'], [9, 13, '#c8323c'], [14, 14, '#4aa35b'], [19, 13, '#e8902f'], [24, 14, '#f2d36b']].forEach(([x, y, c]) => R(x, y, 4, 3, c));
      break;
    case 'boat_l':
    case 'boat_r': {
      // tàu tham quan neo ở bến (cảnh bình thường), hai ô ghép
      R(0, 0, T, T, '#2f7f9f');
      for (let i = 0; i < 3; i++) R(Math.floor(rnd() * 24), Math.floor(rnd() * 30), 6, 1, '#5aa8c4');
      const left = name === 'boat_l';
      R(left ? 4 : 0, 14, left ? 28 : 26, 10, '#f4f4f4'); R(left ? 4 : 0, 22, left ? 28 : 26, 3, '#9aa3b0');
      if (left) { R(2, 16, 3, 7, '#f4f4f4'); R(8, 6, 24, 8, '#e6e6e6'); R(10, 8, 4, 3, '#2c3a55'); R(16, 8, 4, 3, '#2c3a55'); R(22, 8, 4, 3, '#2c3a55'); }
      else { R(0, 6, 18, 8, '#e6e6e6'); R(2, 8, 4, 3, '#2c3a55'); R(8, 8, 4, 3, '#2c3a55'); R(26, 16, 3, 6, '#f4f4f4'); R(14, 2, 2, 5, '#5b5d6e'); }
      break;
    }
    case 'gravel':
      R(0, 0, T, T, '#b9b09c'); noise('#b9b09c', 0.25, 90);
      break;
    case 'post':
      // bảng thông tin trên cột gỗ (bến tàu)
      img.ellipse(ox + 16, oy + 30, 6, 2, '#00000044');
      R(14, 14, 4, 16, '#6b4630'); R(3, 2, 26, 14, '#5a3e2c'); R(5, 4, 22, 10, '#e9e4d6');
      R(7, 6, 12, 1, '#3d5a98'); R(7, 9, 16, 1, '#5b5d6e'); R(7, 11, 10, 1, '#c8323c');
      break;
    case 'hydrant':
      img.ellipse(ox + 16, oy + 29, 5, 2, '#00000044');
      R(12, 12, 8, 17, '#c8323c'); R(11, 10, 10, 3, '#a82a32'); R(9, 17, 3, 4, '#a82a32'); R(20, 17, 3, 4, '#a82a32'); R(14, 8, 4, 2, '#a82a32');
      break;
    case 'chair':
      shadow(8, 28);
      R(9, 8, 14, 14, '#3a3f4d'); R(10, 9, 12, 8, '#59606f'); R(10, 22, 2, 6, '#22252e'); R(20, 22, 2, 6, '#22252e');
      break;
    case 'rug':
      R(0, 0, T, T, '#8b2f3c');
      R(2, 2, 28, 28, '#a33a48'); R(6, 6, 20, 20, '#8b2f3c'); R(10, 10, 12, 12, '#d9a441');
      noise('#a33a48', 0.15, 30);
      break;
    case 'sofa':
      shadow(15, 29);
      R(1, 6, 30, 22, '#2a4f7a'); R(1, 6, 30, 7, '#356396'); R(1, 6, 4, 22, '#203d5f'); R(27, 6, 4, 22, '#203d5f');
      R(5, 15, 22, 9, '#3a6ea6');
      break;
    case 'reception':
      shadow(16, 30);
      R(0, 4, T, 26, '#7a4f33'); R(0, 4, T, 5, '#f4eedc'); R(0, 9, T, 2, '#5a3a24');
      for (let x = 2; x < T; x += 8) R(x, 13, 4, 14, '#8a5c3d');
      break;
    case 'doorway':
      R(0, 0, T, T, '#8a6040');
      R(0, 0, T, 3, '#5a3a24'); noise('#8a6040', 0.2, 30);
      break;
    case 'exit_mat':
      R(0, 0, T, T, '#d8d0bf');
      R(2, 4, 28, 24, '#3a3f4d'); for (let y = 6; y < 26; y += 3) R(4, y, 24, 1, '#4c5262');
      break;
    case 'grass':
      R(0, 0, T, T, '#6aa84f'); noise('#6aa84f', 0.25, 70);
      for (let i = 0; i < 6; i++) R(Math.floor(rnd() * 30), Math.floor(rnd() * 30), 1, 2, '#8cc56a');
      break;
    case 'sidewalk':
      R(0, 0, T, T, '#c9c2b4');
      for (let y = 0; y < T; y += 8) R(0, y, T, 1, '#b2aa9a');
      for (let y = 0; y < T; y += 8) R((y / 8) % 2 ? 0 : 16, y, 1, 8, '#b2aa9a');
      noise('#c9c2b4', 0.08, 20);
      break;
    case 'promenade':
      R(0, 0, T, T, '#e3cfa6');
      R(0, 0, 16, 16, '#d9c294'); R(16, 16, 16, 16, '#d9c294');
      noise('#e3cfa6', 0.1, 30);
      break;
    case 'road':
      R(0, 0, T, T, '#4a4d57'); noise('#4a4d57', 0.18, 60);
      break;
    case 'road_line':
      R(0, 0, T, T, '#4a4d57'); noise('#4a4d57', 0.18, 60); R(4, 14, 16, 3, '#f2d36b');
      break;
    case 'water':
      R(0, 0, T, T, '#2f7f9f');
      for (let i = 0; i < 5; i++) { const x = Math.floor(rnd() * 24), y = Math.floor(rnd() * 30); R(x, y, 6, 1, '#5aa8c4'); }
      noise('#2f7f9f', 0.12, 30);
      break;
    case 'karst':
      R(0, 0, T, T, '#2f7f9f');
      img.ellipse(ox + 16, oy + 28, 14, 4, '#25657f');
      R(6, 6, 20, 22, '#5d6b5a'); R(9, 2, 14, 6, '#5d6b5a'); R(6, 6, 5, 22, '#77866f');
      R(9, 2, 14, 2, '#4f7a4a'); R(13, 0, 6, 2, '#4f7a4a'); R(23, 10, 3, 18, '#4a5648');
      break;
    case 'railing':
      R(0, 0, T, T, '#e3cfa6');
      R(0, 14, T, 3, '#f4eedc'); R(0, 22, T, 2, '#f4eedc'); R(2, 12, 3, 16, '#d0d4dc'); R(26, 12, 3, 16, '#d0d4dc'); R(0, 28, T, 4, '#2f7f9f');
      break;
    case 'dock':
      R(0, 0, T, T, '#a77b52');
      for (let x = 0; x < T; x += 8) R(x, 0, 1, T, '#7d5537');
      R(0, 0, 2, T, '#5a3a24'); R(30, 0, 2, T, '#5a3a24');
      break;
    case 'roof':
      R(0, 0, T, T, '#b5533c');
      for (let y = 0; y < T; y += 6) R(0, y, T, 2, '#9a432f');
      for (let y = 3; y < T; y += 6) for (let x = (y % 12 ? 0 : 4); x < T; x += 8) R(x, y, 1, 3, '#9a432f');
      break;
    case 'facade':
      R(0, 0, T, T, '#efe2c4'); R(0, 0, T, 2, '#d8c8a4'); noise('#efe2c4', 0.06, 20);
      break;
    case 'facade_window':
      R(0, 0, T, T, '#efe2c4'); R(5, 5, 22, 20, '#7d5537'); R(7, 7, 18, 16, '#9fd0e6'); R(15, 7, 2, 16, '#7d5537'); R(7, 9, 6, 2, '#ffffff'); R(4, 25, 24, 3, '#6aa84f');
      break;
    case 'shop_door':
      R(0, 0, T, T, '#efe2c4'); R(3, 0, 26, T, '#5a3a24'); R(5, 2, 22, 30, '#9fd0e6'); R(15, 2, 2, 30, '#5a3a24'); R(11, 16, 2, 3, '#f2d36b'); R(19, 16, 2, 3, '#f2d36b');
      break;
    case 'awning':
      R(0, 0, T, T, '#efe2c4');
      for (let x = 0; x < T; x += 8) { R(x, 0, 4, 20, '#c8323c'); R(x + 4, 0, 4, 20, '#f4eedc'); }
      for (let x = 0; x < T; x += 8) { R(x, 20, 4, 3, '#a82a32'); R(x + 4, 20, 4, 2, '#dcd6c4'); }
      break;
    case 'signboard':
      R(0, 0, T, T, '#2b2f3a'); R(0, 0, T, 2, '#3a3f4d'); R(1, 6, 30, 16, '#14161c'); R(3, 8, 26, 12, '#3d6ea6'); R(6, 12, 20, 2, '#f4eedc'); R(8, 16, 14, 1, '#f2d36b'); R(0, 30, T, 2, '#14161c');
      break;
    case 'tree':
      R(0, 0, T, T, '#00000000');
      img.ellipse(ox + 16, oy + 29, 10, 3, '#00000044');
      R(14, 18, 4, 11, '#6b4630');
      img.ellipse(ox + 16, oy + 12, 13, 11, '#2f7d3b'); img.ellipse(ox + 11, oy + 9, 6, 5, '#3f9a4b'); img.ellipse(ox + 21, oy + 14, 6, 5, '#3f9a4b'); img.ellipse(ox + 15, oy + 5, 5, 3, '#57b864');
      break;
    case 'bench':
      R(0, 0, T, T, '#00000000');
      R(2, 10, 28, 4, '#8a5c3d'); R(2, 16, 28, 4, '#a77b52'); R(4, 20, 3, 8, '#3a3f4d'); R(25, 20, 3, 8, '#3a3f4d'); R(2, 10, 28, 1, '#b98b62');
      break;
    case 'lamp':
      R(0, 0, T, T, '#00000000');
      img.ellipse(ox + 16, oy + 30, 6, 2, '#00000044'); R(15, 6, 3, 24, '#3a3f4d'); R(11, 2, 11, 6, '#3a3f4d'); R(12, 4, 9, 3, '#f2d36b'); R(12, 28, 9, 3, '#3a3f4d');
      break;
    case 'flowerbed':
      R(0, 0, T, T, '#6aa84f'); R(2, 4, 28, 24, '#7d5537'); R(4, 6, 24, 20, '#4f7a4a');
      [[7, 9, '#e79aa0'], [15, 12, '#f2d36b'], [22, 8, '#ffffff'], [10, 19, '#c8323c'], [20, 20, '#e79aa0']].forEach(([x, y, c]) => R(x, y, 3, 3, c));
      break;
    case 'void':
      R(0, 0, T, T, '#14101f'); R(0, 0, T, 1, '#1d1830'); R(0, 0, 1, T, '#1d1830');
      for (let i = 0; i < 4; i++) R(Math.floor(rnd() * 30), Math.floor(rnd() * 30), 1, 1, '#3b2c4a');
      break;
    case 'frame_wall':
      R(0, 0, T, T, '#221a33'); img.frame(ox + 4, oy + 4, 24, 20, '#8c7bb8'); img.frame(ox + 6, oy + 6, 20, 16, '#5a4a7a');
      R(10, 10, 12, 1, '#3b2c4a');
      break;
    case 'frame':
      R(0, 0, T, T, '#14101f'); img.frame(ox + 5, oy + 3, 22, 26, '#b4b8c5'); img.frame(ox + 7, oy + 5, 18, 22, '#5b5d6e');
      R(9, 14, 8, 1, '#b4b8c5'); R(16, 15, 1, 6, '#b4b8c5'); R(12, 20, 5, 1, '#b4b8c5');
      break;
    case 'shard':
      R(0, 0, T, T, '#14101f'); R(0, 0, T, 1, '#1d1830');
      R(8, 12, 6, 2, '#c9d1dc'); R(10, 10, 2, 2, '#c9d1dc'); R(20, 20, 4, 1, '#8c7bb8'); R(22, 18, 1, 2, '#8c7bb8');
      break;
    default:
      R(0, 0, T, T, '#ff00ff');
  }
}

/**
 * Chỉnh màu kiểu trinh thám cho cả tileset: giảm bão hòa, kéo về xanh than, tối nhẹ.
 * Nhân vật không qua bước này nên nổi lên trên nền.
 */
function noirGrade(img) {
  const tint = [58, 78, 118];
  for (let i = 0; i < img.px.length; i += 4) {
    if (!img.px[i + 3]) continue;
    const [r, g, b] = [img.px[i], img.px[i + 1], img.px[i + 2]];
    const l = 0.3 * r + 0.59 * g + 0.11 * b;
    const ch = [r, g, b].map((c, k) => {
      const desat = c + (l - c) * 0.5;            // giảm 50% bão hòa
      const toned = desat * 0.78 + tint[k] * 0.22; // ám xanh than
      return Math.max(0, Math.min(255, Math.round(toned * 0.92)));
    });
    img.px[i] = ch[0]; img.px[i + 1] = ch[1]; img.px[i + 2] = ch[2];
  }
}

function buildTileset() {
  const cols = 8, rows = Math.ceil(TILES.length / cols);
  const img = new Img(cols * T, rows * T);
  TILES.forEach((name, i) => drawTile(img, name, (i % cols) * T, Math.floor(i / cols) * T, seeded(i + 7)));
  noirGrade(img);
  img.save(path.join(ROOT, 'assets/tiles/tiles.png'));
  return { cols, rows };
}

// ---------------------------------------------------------------- nhân vật

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

  // Thẻ phóng viên thực tập (dây đỏ, thẻ trắng sọc xanh)
  if (spec.press && dir === 'down') { R(13, 21 + y0, 1, 6, '#c8323c'); R(18, 21 + y0, 1, 6, '#c8323c'); R(13, 27 + y0, 6, 5, '#ffffff'); R(13, 27 + y0, 6, 1, '#3d7fd1'); R(14, 29 + y0, 4, 1, '#5b5d6e'); }
  if (spec.press && dir === 'right') { R(19, 26 + y0, 2, 4, '#ffffff'); }
  // Balo: quai đeo phía trước, thân balo phía sau / bên hông
  if (spec.backpack) {
    const bp = spec.backpack, bpD = shade(bp, -0.3);
    if (dir === 'down') { R(10, 20 + y0, 2, 9, bpD); R(20, 20 + y0, 2, 9, bpD); }
    if (dir === 'up') { R(10, 21 + y0, 12, 12, bp); R(10, 21 + y0, 12, 3, shade(bp, 0.15)); R(13, 26 + y0, 6, 4, bpD); }
    if (dir === 'right') { R(8, 21 + y0, 4, 11, bp); R(8, 21 + y0, 4, 2, shade(bp, 0.15)); R(12, 20 + y0, 1, 8, bpD); }
  }

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
    if (hs === 'bob') { R(8, 8 + y0, 3, 10, hair); R(21, 8 + y0, 3, 10, hair); R(8, 17 + y0, 3, 1, hairDark); R(21, 17 + y0, 3, 1, hairDark); }
  }
  if (hs === 'bob' && dir === 'up') R(8, 15 + y0, 16, 4, hairDark);
  if (hs === 'bob' && dir === 'right') { R(9, 8 + y0, 6, 10, hair); R(9, 17 + y0, 6, 1, hairDark); }
  // Bút gài sau tai
  if (spec.pen) {
    if (dir === 'down') { R(22, 7 + y0, 1, 6, '#f2d36b'); R(22, 6 + y0, 1, 1, '#c8323c'); }
    if (dir === 'right') { R(15, 7 + y0, 1, 6, '#f2d36b'); R(15, 6 + y0, 1, 1, '#c8323c'); }
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

/** Boss "Kẻ Dệt Chuyện": áo choàng ghép từ khung ảnh trống, mặt nạ gương nứt. blank = đã gỡ mặt nạ (khung trống). */
function drawBossFrame(blank) {
  const f = new Img(32, 48);
  const R = (x, y, w, h, c) => f.rect(x, y, w, h, c);
  // áo choàng hình thang
  for (let y = 14; y < 46; y++) { const w = 12 + Math.floor((y - 14) * 0.55); R(16 - w, y, w * 2, 1, '#2a2140'); }
  // các khung ảnh trống ghép trên áo
  [[8, 20, 7, 6], [17, 18, 8, 6], [11, 28, 8, 7], [21, 30, 6, 6], [6, 37, 7, 6], [16, 38, 9, 6]].forEach(([x, y, w, h]) => { f.frame(x, y, w, h, '#b4b8c5'); R(x + 1, y + 1, w - 2, h - 2, '#3b2c4a'); });
  // mũ trùm
  R(9, 4, 14, 12, '#2a2140'); R(8, 8, 16, 8, '#2a2140');
  if (blank) {
    f.frame(11, 6, 10, 9, '#b4b8c5'); R(12, 7, 8, 7, '#14101f');
  } else {
    R(11, 6, 10, 9, '#c9d1dc'); R(12, 7, 8, 7, '#e6ebf2');
    R(14, 6, 1, 3, '#5b5d6e'); R(15, 9, 1, 2, '#5b5d6e'); R(16, 11, 2, 1, '#5b5d6e'); R(18, 12, 1, 3, '#5b5d6e');
    R(13, 9, 2, 1, '#14101f'); R(17, 9, 2, 1, '#14101f');
  }
  const out = new Img(32, 48);
  out.ellipse(16, 46, 12, 2, '#00000060');
  for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) {
    if (f.get(x, y)[3] > 200) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < 32 && ny < 48 && f.get(nx, ny)[3] > 200; })) out.set(x, y, '#0b0912');
  }
  out.blit(f, 0, 0, 32, 48, 0, 0);
  return out;
}

/** Sprite sheet của boss (cùng bố cục 3x4 với nhân vật để dùng chung code) + bản đã gỡ mặt nạ. */
function buildBoss() {
  for (const [id, blank] of [['boss', false], ['boss_blank', true]]) {
    const sheet = new Img(96, 192);
    const frame = drawBossFrame(blank);
    for (let row = 0; row < 4; row++) for (let c = 0; c < 3; c++) sheet.blit(frame, 0, 0, 32, 48, c * 32, row * 48);
    sheet.save(path.join(ROOT, `assets/sprites/${id}.png`));
  }
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

// ---------------------------------------------------------------- bản đồ

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

/**
 * Dựng bản đồ Tiled từ lưới ký tự.
 * legend: ký tự → tên ô ở lớp walls (va chạm theo thuộc tính collides); ground(ch, x, y): tên ô nền;
 * doors: [[x, y, tên ô]] lớp cửa đóng (gỡ khi phòng mở).
 */
function buildMap(key, { rows, legend, ground, doors = [], objects, label, music }) {
  nextId = 1;
  const W = rows[0].length, H = rows.length;
  rows.forEach((r, i) => { if (r.length !== W) throw new Error(`${key}: hàng ${i} dài ${r.length}, cần ${W}`); });
  const g = [], w = [], d = new Array(W * H).fill(0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = rows[y][x];
    g.push(tid(ground(ch, x, y)) + 1);
    w.push(legend[ch] ? tid(legend[ch]) + 1 : 0);
  }
  for (const [x, y, tile] of doors) d[y * W + x] = tid(tile) + 1;
  const objs = objects();
  const layer = (id, name, data) => ({ id, name, type: 'tilelayer', width: W, height: H, x: 0, y: 0, opacity: 1, visible: true, data });
  const cols = 8, trows = Math.ceil(TILES.length / cols);
  const map = {
    compressionlevel: -1, type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down',
    infinite: false, width: W, height: H, tilewidth: T, tileheight: T, nextlayerid: 5, nextobjectid: nextId,
    properties: [prop('label', label), prop('music', music)],
    layers: [layer(1, 'ground', g), layer(2, 'walls', w), layer(3, 'doors', d),
      { id: 4, name: 'objects', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects: objs }],
    tilesets: [{
      firstgid: 1, name: 'tiles', image: '../assets/tiles/tiles.png', imagewidth: cols * T, imageheight: trows * T,
      tilewidth: T, tileheight: T, tilecount: TILES.length, columns: cols, margin: 0, spacing: 0,
      tiles: TILES.map((n, id) => ({ id, properties: [prop('name', n), { name: 'collides', type: 'bool', value: COLLIDES.has(n) }] }))
    }]
  };
  fs.mkdirSync(path.join(ROOT, 'maps'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, `maps/${key}.json`), JSON.stringify(map));
  return `${key} ${W}x${H} (${objs.length} object)`;
}

/** Cửa phòng đóng 2 ô ngang ở hàng tường trên (y) và mặt tường (y + 1). */
const roomDoor = (x, y) => [[x, y, 'wall_top'], [x + 1, y, 'wall_top'], [x, y + 1, 'door_closed'], [x + 1, y + 1, 'door_closed']];

const INDOOR = {
  '#': 'wall_top', W: 'wall_face', w: 'window', p: 'pinboard', d: 'desk', c: 'cabinet', b: 'bookshelf', P: 'plant', h: 'chair', s: 'sofa', R: 'reception', Q: 'door_closed',
  L: 'blinds', k: 'clock', o: 'poster', x: 'whiteboard', V: 'tv_wall', n: 'paper_desk', r: 'printer', q: 'water_cooler', f: 'filing_boxes',
  m: 'floor_lamp', a: 'coffee_table', t: 'trash', C: 'counter'
};

// ---------------- Văn phòng Ban Hải Đăng (gọn lại, nhiều chi tiết)
// # tường trên, W mặt tường, L cửa sổ rèm lá sách, p bảng ghim, k đồng hồ, o áp phích, x bảng trắng, V TV tin tức,
// D lối cửa phòng, E cửa ra phố, Q cửa Phòng họp (boss), . sàn gỗ, ~ thảm hành lang, , sàn sảnh,
// n bàn làm việc, d bàn, h ghế, c tủ hồ sơ, b kệ sách, f thùng hồ sơ, r máy in, q bình nước, m đèn cây, t thùng rác,
// P cây, s sofa, a bàn nước, R quầy lễ tân.
/** Lưới ký tự rỗng W x H; put(x, y, chuỗi) ghi đè từ (x, y). */
function grid(W, H, fill) {
  const g = Array.from({ length: H }, () => Array(W).fill(fill));
  const put = (x, y, str) => [...str].forEach((ch, i) => { g[y][x + i] = ch; });
  return { g, put, rows: () => g.map(r => r.join('')) };
}

const OFFICE = (() => {
  const W = 33, H = 20;
  const { g, put, rows } = grid(W, H, ',');
  put(0, 0, '#'.repeat(W));
  for (let y = 0; y < H; y++) { g[y][0] = '#'; g[y][W - 1] = '#'; }
  // bốn phòng phía trên (S3, S4, S7, S8), mỗi phòng 7 ô
  const ROOM = [
    ['WWppLWk', 'cc..f.P', '..nnn..', '...h...', '.......', 'm....tP'],   // S3 Hồ sơ
    ['WxxWLLW', 'bb...rP', '.nn.nn.', '.h..h..', '.......', 'P.....m'],   // S4 Phân tích ảnh
    ['WoWLLWk', 'P.bb..c', '..nnn..', '...h...', '.......', 'm....tP'],   // S7 Tác động
    ['WLLWxxW', 'c..f..P', '..nnn..', '...h...', '.......', 'P....tm']    // S8 Phân loại
  ];
  ROOM.forEach((lines, i) => lines.forEach((ln, j) => put(1 + i * 8, 1 + j, ln)));
  for (const x of [8, 16, 24]) for (let y = 0; y <= 7; y++) g[y][x] = '#';
  put(0, 7, '#'.repeat(W));
  put(1, 8, 'W'.repeat(W - 2));
  for (const x of [4, 12, 20, 28]) { g[7][x] = g[7][x + 1] = 'D'; g[8][x] = g[8][x + 1] = 'D'; }
  // hành lang
  put(1, 9, 'q' + '~'.repeat(29) + 'P');
  put(1, 10, '~'.repeat(31));
  // sảnh
  put(0, 11, '#'.repeat(13) + ','.repeat(6) + '#'.repeat(14));
  put(1, 12, 'WLLWpWVVWWLW'); put(19, 12, 'WWkWLLWWQQWLW');
  put(1, 13, 'bb'); g[13][12] = 'P'; g[13][19] = 'P'; put(29, 13, 'rqf');
  put(2, 14, 'sss'); put(27, 14, 'sss');
  g[15][3] = 'a'; put(13, 15, 'RRRRRR'); g[15][28] = 'a';
  put(2, 16, 'sss'); put(27, 16, 'sss');
  g[17][1] = 'm'; g[17][8] = 'P'; g[17][23] = 'P'; g[17][31] = 'm';
  g[18][1] = 'P'; g[18][10] = 't'; g[18][31] = 'P';
  put(0, 19, '#'.repeat(W)); g[19][16] = g[19][17] = 'E';
  // sàn: gỗ trong phòng, thảm hành lang
  for (let y = 1; y <= 6; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === ',') g[y][x] = '.';
  return rows();
})();
const OFFICE_RUGS = [[12, 16, 8, 3], [2, 14, 3, 3], [27, 14, 3, 3]];

const office = buildMap('office', {
  rows: OFFICE, legend: INDOOR, label: 'Văn phòng Ban Điều phối Thông tin Du lịch Hải Đăng', music: 'office',
  ground: (ch, x, y) => {
    if (ch === 'D') return 'doorway';
    if (ch === 'E') return 'exit_mat';
    if (ch === '~' || (y >= 9 && y <= 10)) return 'carpet';
    if (OFFICE_RUGS.some(([rx, ry, rw, rh]) => x >= rx && x < rx + rw && y >= ry && y < ry + rh)) return 'rug';
    if (y >= 11) return 'floor_lobby';
    return 'floor_wood';
  },
  doors: [...roomDoor(4, 7), ...roomDoor(12, 7), ...roomDoor(20, 7), ...roomDoor(28, 7)],
  objects: () => [
    point('spawn', 'spawn_start', 16.5, 17.6),
    point('spawn', 'spawn_from_street', 16.5, 17.6),
    point('spawn', 'spawn_from_boss', 27.5, 13.7),
    rectT('zone', 'zone_S3', 1, 1, 7, 6, { room: 'S3' }),
    rectT('zone', 'zone_S4', 9, 1, 7, 6, { room: 'S4' }),
    rectT('zone', 'zone_S7', 17, 1, 7, 6, { room: 'S7' }),
    rectT('zone', 'zone_S8', 25, 1, 7, 6, { room: 'S8' }),
    rectT('zone', 'zone_corridor', 1, 8, 31, 3, { area: 'corridor' }),
    rectT('zone', 'zone_lobby', 1, 11, 31, 8, { area: 'lobby' }),
    ...[['S3', 4], ['S4', 12], ['S7', 20], ['S8', 28]].map(([room, cx]) => rectT('door', `door_${room}`, cx, 7, 2, 2, { room })),
    rectT('exit', 'exit_street', 16, 18.6, 2, 1.4, { target: 'street', spawn: 'spawn_from_office' }),
    rectT('portal', 'portal_boss', 27, 12, 2, 1, { target: 'boss', spawn: 'spawn_from_office', room: 'S9' }),
    point('npc', 'npc1', 16, 16.6, { patrol: 'patrol_npc1_lobby' }),
    point('npc', 'npc2', 8, 9.7, { patrol: 'patrol_npc2' }),
    point('npc', 'amb_guard', 19.5, 18.4, { patrol: 'patrol_guard' }),
    point('npc', 'amb_worker', 22, 10.5, { patrol: 'patrol_worker' }),
    path_('patrol_npc1_lobby', [[13.5, 16.6], [18.5, 16.6]]),
    path_('patrol_npc2', [[3, 9.7], [29, 9.7]]),
    path_('patrol_guard', [[18.5, 18.4], [21.5, 18.4]]),
    path_('patrol_worker', [[14, 10.5], [30, 10.5]]),
    path_('patrol_npc1_hoso', [[2.5, 5.6], [6.5, 5.6]]),
    point('station', 'npc1_hoso', 4.5, 5.6),
    path_('patrol_npc2_s4', [[10.5, 5.6], [14.5, 5.6]]),
    point('station', 'npc2_s4', 12.5, 5.6),
    path_('patrol_npc1_s7', [[18.5, 5.6], [22.5, 5.6]]),
    point('station', 'npc1_s7', 20.5, 5.6),
    path_('patrol_npc1_s8', [[26.5, 5.6], [30.5, 5.6]]),
    point('station', 'npc1_s8', 28.5, 5.6),
    point('station', 'npc1_lobby_end', 22, 17.6),
    rectT('inspect', 'inspect_notice', 5, 12, 1, 1, { text: 'inspect_notice' }),
    rectT('inspect', 'inspect_window_lobby', 2, 12, 2, 1, { text: 'inspect_window' }),
    rectT('inspect', 'inspect_tv', 7, 12, 2, 1, { text: 'inspect_tv' }),
    rectT('inspect', 'inspect_reception', 13, 15, 6, 1, { text: 'inspect_reception' }),
    rectT('inspect', 'inspect_pinboard_S3', 3, 1, 2, 1, { text: 'inspect_pinboard' }),
    rectT('inspect', 'inspect_cabinet_S3', 1, 2, 2, 1, { text: 'inspect_cabinet' }),
    rectT('inspect', 'inspect_bookshelf_lobby', 1, 13, 2, 1, { text: 'inspect_bookshelf' }),
    rectT('inspect', 'inspect_lab_S4', 10, 3, 5, 1, { text: 'inspect_lab' }),
    rectT('inspect', 'inspect_whiteboard_S8', 29, 1, 2, 1, { text: 'inspect_whiteboard' }),
    rectT('inspect', 'inspect_cooler', 1, 9, 1, 1, { text: 'inspect_cooler' })
  ]
});

// ---------------- Phố ven vịnh (thành phố mở rộng)
// Tòa nhà (hàng 0–6): # mái, G máng xối, H kính, S biển hiệu, K gạch, k cửa sổ gạch, Z đá, z cửa sổ đá, N biển neon,
// A máy lạnh, Y ban công, W tường, w cửa sổ, a mái hiên, U cửa kính quán; o/n/t/c cửa (văn phòng / tòa soạn / thám tử / quán).
// Phố: _ vỉa hè, ^ mép vỉa trên, v mép vỉa dưới, = đường, - vạch giữa, % vạch qua đường, y hẻm sỏi, : lối sỏi, g cỏ,
// , lối dạo, L đèn, T cây, B ghế, F bồn hoa, Q sạp báo, J trạm xe buýt, b thùng rác, l cọc chắn, M sạp chợ, h trụ nước,
// p bảng bến tàu, | lan can, ~ nước, X cầu tàu, I đảo đá, O/R tàu neo (hai ô).
const CW = 64, CH = 36;
const CITY = (() => {
  const { g, put, rows } = grid(CW, CH, '_');
  const BUILDINGS = [
    [2, ['##############', '##############', 'GGGGGGGGGGGGGG', 'HHHHHSHHHHHHHH', 'HHHHHHHHHHHHHH', 'HHHHHHHHHHHHHH', 'HHHHHHooHHHHHH']],
    [19, ['############', '############', 'GGGGGGGGGGGG', 'KkKkKSKkKkKk', 'KkKkKkKkKkKk', 'KAKkKkKkKAKk', 'KKKKKnnKKKKK']],
    [34, ['##########', '##########', 'GGGGGGGGGG', 'ZzZZNNZZzZ', 'ZzZzZZzZzZ', 'ZzZzZZzZzZ', 'ZZZZttZZZZ']],
    [47, ['############', '############', 'GGGGGGGGGGGG', 'WwYwWSWwYwWw', 'WwWwWwWwWwWw', 'aaaaaaaaaaaa', 'UUUUUccUUUUU']]
  ];
  for (let y = 0; y <= 6; y++) for (let x = 0; x < CW; x++) g[y][x] = 'y';
  BUILDINGS.forEach(([x0, lines]) => lines.forEach((ln, y) => put(x0, y, ln)));
  [[0, 5, 'T'], [17, 4, 'T'], [17, 6, 'b'], [32, 5, 'T'], [45, 6, 'b'], [45, 4, 'T'], [61, 5, 'T'], [62, 2, 'T']].forEach(([x, y, c]) => { g[y][x] = c; });
  // vỉa hè trên
  [[5, 'L'], [17, 'h'], [21, 'L'], [32, 'Q'], [36, 'L'], [44, 'b'], [50, 'L'], [61, 'L'], [14, 'T'], [57, 'T']].forEach(([x, c]) => { g[7][x] = c; });
  put(0, 8, '^'.repeat(CW));
  // đường hai chiều
  for (const y of [9, 10, 12, 13]) put(0, y, '='.repeat(CW));
  put(0, 11, '-'.repeat(CW));
  for (const cx of [17, 45]) for (let y = 9; y <= 13; y++) { g[y][cx] = g[y][cx + 1] = '%'; }
  put(0, 14, 'v'.repeat(CW));
  // vỉa hè dưới: trạm xe buýt, sạp báo, chợ nhỏ
  [[10, 'J'], [15, 'l'], [20, 'l'], [43, 'l'], [48, 'l'], [5, 'B'], [34, 'L'], [60, 'B']].forEach(([x, c]) => { g[15][x] = c; });
  put(26, 16, 'MMMM'); g[16][12] = 'Q'; g[16][3] = 'T'; g[16][55] = 'T';
  // công viên
  for (let y = 17; y <= 22; y++) for (let x = 0; x < CW; x++) g[y][x] = 'g';
  for (let y = 17; y <= 22; y++) { g[y][17] = g[y][18] = ':'; g[y][45] = g[y][46] = ':'; }
  put(0, 20, ':'.repeat(CW));
  [[3, 18, 'T'], [8, 17, 'F'], [9, 17, 'F'], [12, 18, 'T'], [22, 18, 'B'], [23, 18, 'B'], [26, 17, 'T'], [30, 18, 'F'], [31, 18, 'F'],
    [35, 17, 'T'], [40, 18, 'T'], [50, 18, 'B'], [51, 18, 'B'], [55, 17, 'T'], [60, 18, 'F'], [61, 18, 'F'],
    [5, 22, 'T'], [14, 22, 'L'], [24, 22, 'T'], [30, 22, 'B'], [31, 22, 'B'], [42, 22, 'L'], [52, 22, 'T'], [58, 22, 'F']].forEach(([x, y, c]) => { g[y][x] = c; });
  // lối dạo ven vịnh, lan can, cầu tàu
  put(0, 23, ','.repeat(CW)); put(0, 24, ','.repeat(CW));
  g[24][40] = 'p';
  put(0, 25, '|'.repeat(CW)); g[25][36] = g[25][37] = g[25][38] = 'X';
  for (let y = 26; y < CH; y++) put(0, y, '~'.repeat(CW));
  for (let y = 26; y <= 31; y++) g[y][36] = g[y][37] = g[y][38] = 'X';
  put(33, 28, 'OR'); put(39, 30, 'OR');
  [[6, 29], [7, 29], [6, 30], [7, 30], [8, 30], [14, 33], [14, 34], [24, 28], [25, 28], [25, 29], [26, 29], [50, 30], [51, 30], [51, 31], [58, 34], [3, 34], [44, 33]]
    .forEach(([x, y]) => { g[y][x] = 'I'; });
  return rows();
})();

const street = buildMap('street', {
  rows: CITY, label: 'Phố ven vịnh Hạ Long', music: 'street',
  legend: {
    '#': 'roof', G: 'roof_edge', H: 'glass', S: 'signboard', K: 'brick', k: 'brick_window', Z: 'stone', z: 'stone_window', N: 'neon',
    A: 'ac_unit', Y: 'balcony', W: 'facade', w: 'facade_window', a: 'awning', U: 'cafe_window',
    L: 'lamp', T: 'tree', B: 'bench', F: 'flowerbed', Q: 'kiosk', J: 'bus_stop', b: 'bin', l: 'bollard', M: 'stall', h: 'hydrant', p: 'post',
    '|': 'railing', '~': 'water', I: 'karst', O: 'boat_l', R: 'boat_r'
  },
  ground: (ch, x, y) => {
    if ('onct'.includes(ch)) return 'shop_door';
    if (ch === '=') return 'road';
    if (ch === '-') return x % 3 === 0 ? 'road' : 'road_line';
    if (ch === '%') return 'crosswalk';
    if (ch === '^') return 'curb';
    if (ch === 'v') return 'curb_low';
    if (ch === 'X') return 'dock';
    if (ch === 'y') return 'gravel';
    if (ch === ':') return 'gravel';
    if (ch === 'g' || (y >= 17 && y <= 22)) return 'grass';
    if (y >= 26 || ch === '~' || ch === 'I' || ch === 'O' || ch === 'R') return 'water';
    if (y >= 23) return 'promenade';
    return 'sidewalk';
  },
  objects: () => [
    point('spawn', 'spawn_from_office', 9, 7.7),
    point('spawn', 'spawn_from_news', 25, 7.7),
    point('spawn', 'spawn_from_agency', 39, 7.7),
    point('spawn', 'spawn_from_cafe', 53, 7.7),
    rectT('zone', 'zone_street', 0, 7, CW, 9, { area: 'street' }),
    rectT('zone', 'zone_park', 0, 16, CW, 9, { area: 'park' }),
    rectT('zone', 'zone_pier', 36, 25, 3, 7, { area: 'pier' }),
    rectT('exit', 'door_office', 8, 6, 2, 1, { target: 'office', spawn: 'spawn_from_street' }),
    rectT('exit', 'door_news', 24, 6, 2, 1, { target: 'newsroom', spawn: 'spawn_from_street' }),
    rectT('exit', 'door_agency', 38, 6, 2, 1, { target: 'agency', spawn: 'spawn_from_street' }),
    rectT('exit', 'door_cafe', 52, 6, 2, 1, { target: 'cafe', spawn: 'spawn_from_street' }),
    // làn xe: dir -1 chạy sang trái, 1 sang phải; vạch qua đường (xe dừng khi có người)
    rectT('lane', 'lane_w_car', 0, 9, CW, 1, { dir: -1, kind: 'car' }),
    rectT('lane', 'lane_w_bike', 0, 10, CW, 1, { dir: -1, kind: 'bike' }),
    rectT('lane', 'lane_e_bike', 0, 12, CW, 1, { dir: 1, kind: 'bike' }),
    rectT('lane', 'lane_e_car', 0, 13, CW, 1, { dir: 1, kind: 'car' }),
    rectT('crosswalk', 'cross_1', 17, 9, 2, 5),
    rectT('crosswalk', 'cross_2', 45, 9, 2, 5),
    point('npc', 'npc5', 14, 23.6, { patrol: 'patrol_npc5' }),
    path_('patrol_npc5', [[6, 23.6], [30, 23.6]]),
    point('npc', 'amb_vendor', 11.5, 16.6),
    point('npc', 'amb_tourist', 40, 20.6, { patrol: 'patrol_tourist' }),
    path_('patrol_tourist', [[36, 20.6], [56, 20.6]]),
    point('npc', 'amb_fisher', 37.5, 30.6),
    point('npc', 'amb_student', 4, 7.7, { patrol: 'patrol_student' }),
    path_('patrol_student', [[2, 7.7], [30, 7.7]]),
    point('npc', 'amb_elder', 22.5, 19.4),
    point('npc', 'amb_jogger', 50, 24.4, { patrol: 'patrol_jogger' }),
    path_('patrol_jogger', [[2, 24.4], [62, 24.4]]),
    rectT('inspect', 'inspect_office_sign', 7, 3, 1, 1, { text: 'inspect_office_sign' }),
    rectT('inspect', 'inspect_news_sign', 24, 3, 1, 1, { text: 'inspect_news_sign' }),
    rectT('inspect', 'inspect_agency_sign', 38, 3, 2, 1, { text: 'inspect_agency_sign' }),
    rectT('inspect', 'inspect_cafe_sign', 52, 3, 1, 1, { text: 'inspect_cafe_sign' }),
    rectT('inspect', 'inspect_kiosk', 12, 16, 1, 1, { text: 'inspect_kiosk' }),
    rectT('inspect', 'inspect_kiosk_north', 32, 7, 1, 1, { text: 'inspect_kiosk' }),
    rectT('inspect', 'inspect_busstop', 10, 15, 1, 1, { text: 'inspect_busstop' }),
    rectT('inspect', 'inspect_stall', 26, 16, 4, 1, { text: 'inspect_stall' }),
    rectT('inspect', 'inspect_pier_sign', 40, 24, 1, 1, { text: 'inspect_pier_sign' }),
    rectT('inspect', 'inspect_boat', 33, 28, 2, 1, { text: 'inspect_boat' }),
    rectT('inspect', 'inspect_sea', 0, 25, 36, 1, { text: 'inspect_sea' })
  ]
});

// ---------------- Tòa soạn Tin Vịnh (S5 Lưu trữ, S6 Dòng thời gian)
const NEWS = [
  '##########################',
  '#bbbbbkbbbbb#WppWpppWppkW#',
  '#...........#............#',
  '#...nn...f..#..........f.#',
  '#...h.......#............#',
  '#........m..#m...........#',
  '#P.........P#P..........P#',
  '#####DD############DD#####',
  '#WLWWDDWWWLWVVWWLWWDDWWLW#',
  '#P......................P#',
  '#..nnn....nnn....nnn..r..#',
  '#...h......h......h......#',
  '#........................#',
  '#f......................t#',
  '#P.........m............P#',
  '############EE############'
];
const newsroom = buildMap('newsroom', {
  rows: NEWS, legend: INDOOR, label: 'Tòa soạn Tin Vịnh', music: 'archive',
  ground: ch => (ch === 'D' ? 'doorway' : ch === 'E' ? 'exit_mat' : 'floor_wood'),
  doors: [...roomDoor(5, 7), ...roomDoor(19, 7)],
  objects: () => [
    point('spawn', 'spawn_from_street', 13, 14),
    rectT('zone', 'zone_S5', 1, 1, 11, 6, { room: 'S5' }),
    rectT('zone', 'zone_S6', 13, 1, 12, 6, { room: 'S6' }),
    rectT('zone', 'zone_newsroom', 1, 9, 24, 6, { area: 'newsroom' }),
    rectT('door', 'door_S5', 5, 7, 2, 2, { room: 'S5' }),
    rectT('door', 'door_S6', 19, 7, 2, 2, { room: 'S6' }),
    rectT('exit', 'exit_street', 12, 14.6, 2, 1.4, { target: 'street', spawn: 'spawn_from_news' }),
    point('npc', 'npc3', 6, 5.5, { patrol: 'patrol_npc3_home' }),
    path_('patrol_npc3_home', [[2.5, 5.5], [10.5, 5.5]]),
    point('station', 'npc3_s6', 18.5, 5.5),
    path_('patrol_npc3_s6', [[14.5, 5.5], [23.5, 5.5]]),
    point('npc', 'npc4', 16, 12.5, { patrol: 'patrol_npc4' }),
    path_('patrol_npc4', [[13.5, 12.5], [22.5, 12.5]]),
    rectT('inspect', 'inspect_archive', 1, 1, 5, 1, { text: 'inspect_archive' }),
    rectT('inspect', 'inspect_timeline', 13, 1, 10, 1, { text: 'inspect_timeline' }),
    rectT('inspect', 'inspect_newsdesk', 10, 10, 3, 1, { text: 'inspect_newsdesk' }),
    rectT('inspect', 'inspect_news_tv', 12, 8, 2, 1, { text: 'inspect_news_tv' })
  ]
});

// ---------------- Quán cà phê Gió Biển
const CAFE = [
  '##################',
  '#WWLWWkWWVVWWLWWW#',
  '#CCCC........P..m#',
  '#................#',
  '#..T....T....T...#',
  '#.h.h..h.h..h.h..#',
  '#................#',
  '#..T....T....P...#',
  '#.h.h..h.h.......#',
  '#P..............P#',
  '#m...............#',
  '########EE########'
];
const cafe = buildMap('cafe', {
  rows: CAFE, legend: { ...INDOOR, T: 'cafe_table' }, label: 'Quán cà phê Gió Biển', music: 'cafe',
  ground: ch => (ch === 'E' ? 'exit_mat' : 'floor_check'),
  objects: () => [
    point('spawn', 'spawn_from_street', 9, 10.4),
    rectT('zone', 'zone_cafe', 1, 1, 16, 10, { room: 'CAFE' }),
    rectT('exit', 'exit_street', 8, 10.6, 2, 1.4, { target: 'street', spawn: 'spawn_from_cafe' }),
    point('npc', 'npc6', 11, 6.6),
    point('npc', 'amb_barista', 2.5, 3.4, { patrol: 'patrol_barista' }),
    path_('patrol_barista', [[1.5, 3.4], [5.5, 3.4]]),
    rectT('inspect', 'inspect_cafe_menu', 1, 2, 4, 1, { text: 'inspect_cafe_menu' }),
    rectT('inspect', 'inspect_cafe_tv', 9, 1, 2, 1, { text: 'inspect_cafe_tv' })
  ]
});

// ---------------- Phòng thám tử (GIẢ LẬP): các thiết bị mở giao diện công cụ mô phỏng
// e tường bằng chứng, V màn hình mạng xã hội, t bảng dòng thời gian, K máy tính tìm ngược ảnh,
// M bàn soi kính lúp, A máy dò ảnh AI, Y đầu đọc kho báo.
const AGENCY = [
  '##################',
  '#WWeeeWVVWwWtttWW#',
  '#Pf............mP#',
  '#..K..M....A..Y..#',
  '#..h..h....h..h..#',
  '#................#',
  '#~~~~~~~~~~~~~~~~#',
  '#~~ss~~~~~~~~dd~~#',
  '#~~~~~~~~~~~~h~~~#',
  '#P~~~~~~~~~~~~~~P#',
  '#######EE#########'
];
const agency = buildMap('agency', {
  rows: AGENCY, label: 'Phòng thám tử (GIẢ LẬP)', music: 'archive',
  legend: { ...INDOOR, e: 'dev_evidence', V: 'dev_monitors', t: 'dev_timeline', K: 'dev_pc', M: 'dev_lighttable', A: 'dev_detector', Y: 'dev_reader' },
  ground: (ch, x, y) => (ch === 'E' ? 'exit_mat' : ch === '~' || y >= 6 ? 'carpet' : 'floor_dark'),
  objects: () => [
    point('spawn', 'spawn_from_street', 7.5, 9.4),
    rectT('zone', 'zone_agency', 1, 1, 16, 9, { area: 'agency' }),
    rectT('exit', 'exit_street', 7, 9.6, 2, 1.4, { target: 'street', spawn: 'spawn_from_agency' }),
    rectT('device', 'computer', 3, 3, 1, 1, { device: 'computer' }),
    rectT('device', 'magnifier', 6, 3, 1, 1, { device: 'magnifier' }),
    rectT('device', 'detector', 11, 3, 1, 1, { device: 'detector' }),
    rectT('device', 'archive', 14, 3, 1, 1, { device: 'archive' }),
    rectT('device', 'evidence', 3, 1, 3, 1, { device: 'evidence' }),
    rectT('device', 'monitor', 7, 1, 2, 1, { device: 'monitor' }),
    rectT('device', 'timeline', 12, 1, 3, 1, { device: 'timeline' })
  ]
});

// ---------------- Phòng Boss (không gian trừu tượng)
const BOSS = [
  '####################',
  '#XXXXXXXXXXXXXXXXXX#',
  '#vvvvvvvvvvvvvvvvvv#',
  '#vfvvvvvvvvvvvvvvfv#',
  '#vvvvvvvvvvvvvvvvvv#',
  '#vvvvsvvvvvvvvsvvvv#',
  '#vfvvvvvvvvvvvvvvfv#',
  '#vvvvvvvvvvvvvvvvvv#',
  '#vvvsvvvvvvvvvvsvvv#',
  '#vfvvvvvvvvvvvvvvfv#',
  '#vvvvvvvvvvvvvvvvvv#',
  '#vvvvvvvvvvvvvvvvvv#',
  '#vvvvvvvvvvvvvvvvvv#',
  '#########EE#########'
];
const boss = buildMap('boss', {
  rows: BOSS, label: 'Phòng họp — nơi Kẻ Dệt Chuyện ẩn mình (GIẢ LẬP)', music: 'boss',
  legend: { '#': 'wall_top', X: 'frame_wall', f: 'frame' },
  ground: ch => (ch === 's' ? 'shard' : ch === 'E' ? 'exit_mat' : 'void'),
  objects: () => [
    point('spawn', 'spawn_from_office', 10, 12.4),
    rectT('zone', 'zone_boss', 1, 1, 18, 12, { room: 'S9' }),
    rectT('exit', 'exit_office', 9, 12.7, 2, 1.3, { target: 'office', spawn: 'spawn_from_boss' }),
    point('npc', 'boss', 10, 5)
  ]
});

/** Xe cộ (nhìn ngang, hướng sang phải; game lật ngang khi chạy sang trái). */
function buildVehicles() {
  const save = (img, id) => img.save(path.join(ROOT, `assets/sprites/${id}.png`));
  const outline = (f, w, h) => {
    const out = new Img(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (f.get(x, y)[3] > 200) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < w && ny < h && f.get(nx, ny)[3] > 200; })) out.set(x, y, '#0b0f18');
    }
    out.blit(f, 0, 0, w, h, 0, 0);
    return out;
  };
  // ô tô con, ba màu
  [['car1', '#c8323c'], ['car2', '#3d6ea6'], ['car3', '#e6e6e6']].forEach(([id, col]) => {
    const f = new Img(64, 32);
    const R = (x, y, w, h, c) => f.rect(x, y, w, h, c);
    R(3, 15, 58, 10, col); R(3, 15, 58, 2, shade(col, 0.25)); R(3, 23, 58, 2, shade(col, -0.3));
    R(15, 6, 32, 10, col); R(17, 7, 13, 8, '#9fd0e6'); R(32, 7, 13, 8, '#9fd0e6'); R(18, 8, 4, 2, '#e6f4fb'); R(30, 7, 2, 8, shade(col, -0.2));
    R(57, 17, 4, 3, '#ffe9a0'); R(3, 17, 3, 3, '#ff6a6a'); R(30, 18, 4, 1, shade(col, -0.35));
    for (const cx of [15, 49]) { f.ellipse(cx, 25, 5, 5, '#1b1d24'); f.ellipse(cx, 25, 2, 2, '#9aa1b3'); }
    const out = outline(f, 64, 32);
    const sh = new Img(64, 32); sh.ellipse(32, 30, 29, 2, '#00000055'); sh.blit(out, 0, 0, 64, 32, 0, 0);
    save(sh, id);
  });
  // xe buýt
  {
    const f = new Img(96, 40);
    const R = (x, y, w, h, c) => f.rect(x, y, w, h, c);
    R(2, 5, 92, 26, '#2a9d8f'); R(2, 5, 92, 3, '#5fc2b6'); R(2, 27, 92, 4, '#1e6f66');
    for (let x = 8; x < 82; x += 13) R(x, 9, 10, 9, '#9fd0e6');
    R(84, 9, 8, 14, '#9fd0e6'); R(70, 19, 9, 12, '#1e6f66'); R(71, 20, 3, 10, '#9fd0e6'); R(75, 20, 3, 10, '#9fd0e6');
    R(4, 21, 50, 3, '#f4eedc'); R(90, 25, 3, 3, '#ffe9a0');
    for (const cx of [20, 76]) { f.ellipse(cx, 32, 6, 6, '#1b1d24'); f.ellipse(cx, 32, 2, 2, '#9aa1b3'); }
    const out = outline(f, 96, 40);
    const sh = new Img(96, 40); sh.ellipse(48, 38, 44, 2, '#00000055'); sh.blit(out, 0, 0, 96, 40, 0, 0);
    save(sh, 'bus');
  }
  // xe máy có người lái (đội mũ bảo hiểm)
  [['bike1', '#c8323c', '#3d5a98', '#f2d36b'], ['bike2', '#2b2f3a', '#e07a5f', '#f4f4f4']].forEach(([id, body, shirt, helmet]) => {
    const f = new Img(32, 32);
    const R = (x, y, w, h, c) => f.rect(x, y, w, h, c);
    R(6, 20, 20, 5, body); R(20, 15, 5, 6, body); R(24, 13, 4, 2, '#3a3f4d'); R(8, 18, 10, 3, '#2b2f3a');
    R(11, 9, 7, 10, shirt); R(17, 12, 7, 3, shirt); R(12, 18, 6, 4, '#2d3a5a'); R(15, 21, 3, 4, '#2d3a5a');
    R(11, 2, 8, 7, helmet); R(16, 4, 4, 3, '#9fd0e6'); R(11, 7, 3, 2, '#f1c7a0');
    for (const cx of [8, 24]) { f.ellipse(cx, 26, 4, 4, '#1b1d24'); f.ellipse(cx, 26, 1, 1, '#9aa1b3'); }
    R(27, 17, 2, 2, '#ffe9a0');
    const out = outline(f, 32, 32);
    const sh = new Img(32, 32); sh.ellipse(16, 30, 13, 2, '#00000055'); sh.blit(out, 0, 0, 32, 32, 0, 0);
    save(sh, id);
  });
}

buildTileset();
buildVehicles();
for (const [id, spec] of Object.entries(CHARACTERS)) buildCharacter(id, spec);
buildBoss();
console.log(['ok:', `tileset ${TILES.length} ô`, office, street, newsroom, cafe, agency, boss].join('\n  '));
