// Sinh asset TẠM cho giai đoạn 1: tileset văn phòng, sprite nhân vật 4 hướng, bản đồ Tiled.
// Chạy: node tools/gen-assets.mjs   (giai đoạn 2 sẽ thay bằng art thật; bản đồ có thể sửa bằng Tiled)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img, rgba, seeded } from './png.mjs';
import { CHARACTERS, shade } from './characters.mjs';
import { allProps, vehicles } from './props.mjs';
import { isoGround, isoWalls } from './iso.mjs';
import { buildBadges } from './badges.mjs';

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
  // phòng xác minh: thiết bị (mỗi thiết bị là một object 'device' trên bản đồ)
  'floor_dark', 'dev_pc', 'dev_lighttable', 'dev_detector', 'dev_reader', 'dev_monitors', 'dev_timeline', 'dev_evidence',
  // nội thất chi tiết
  'wall_upper', 'wall_lower',
  'blinds', 'clock', 'poster', 'whiteboard', 'tv_wall', 'paper_desk', 'printer', 'water_cooler', 'filing_boxes', 'floor_lamp',
  'coffee_table', 'trash', 'counter', 'cafe_table', 'floor_check',
  // mặt tiền và phố
  'glass', 'brick', 'brick_window', 'stone', 'stone_window', 'roof_edge', 'ac_unit', 'balcony', 'cafe_window', 'neon',
  'curb', 'curb_low', 'crosswalk', 'kiosk', 'bus_stop', 'bin', 'bollard', 'stall', 'boat_l', 'boat_r', 'gravel', 'hydrant', 'post'
];
const COLLIDES = new Set(['wall_top', 'wall_face', 'wall_upper', 'wall_lower', 'door_closed', 'window', 'pinboard', 'desk', 'cabinet', 'bookshelf', 'plant', 'sofa', 'reception',
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
  // tường lạnh: vữa xám xanh, ốp chân tường gỗ sẫm
  const wallFace = () => {
    R(0, 0, T, T, '#a9b0bb');
    for (let x = 0; x < T; x += 8) R(x, 2, 1, 18, '#a0a7b2');
    R(0, 0, T, 2, '#bcc3cd');
    R(0, 20, T, 12, '#3e3a3a'); R(0, 20, T, 2, '#5a5452'); R(0, 30, T, 2, '#2a2626');
    for (let x = 4; x < T; x += 8) R(x, 23, 1, 6, '#34302f');
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
      // đỉnh bức tường dày nhìn từ trên: mặt trên xám đá, gờ sáng phía trên, cạnh tối phía dưới và bên phải
      R(0, 0, T, T, '#4e5562'); R(0, 0, T, 3, '#6a7280'); R(0, 26, T, 6, '#2e333c'); R(29, 0, 3, T, '#3a404b');
      for (let x = 4; x < T; x += 10) R(x, 8, 1, 14, '#454b57');
      noise('#4e5562', 0.08, 16);
      break;
    case 'wall_face':
      wallFace();
      break;
    case 'wall_upper':
      // nửa trên của tường cao 2 ô (≈ 2,5 m so với người 1,7 m)
      R(0, 0, T, T, '#a9b0bb'); R(0, 0, T, 4, '#7e8692'); R(0, 4, T, 2, '#c3c9d2');
      for (let x = 0; x < T; x += 8) R(x, 6, 1, 26, '#a0a7b2');
      noise('#a9b0bb', 0.05, 20);
      break;
    case 'wall_lower':
      R(0, 0, T, T, '#a9b0bb'); for (let x = 0; x < T; x += 8) R(x, 0, 1, 12, '#a0a7b2');
      R(0, 12, T, 20, '#3e3a3a'); R(0, 12, T, 2, '#5a5452'); R(0, 29, T, 3, '#2a2626');
      for (let x = 4; x < T; x += 8) R(x, 16, 1, 11, '#34302f');
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
      // biển hiệu neon của Phòng xác minh (kính lúp phát sáng)
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
  // bản isometric: ô nền hình thoi + khối tường (tools/iso.mjs)
  isoGround(img, TILES.length).save(path.join(ROOT, 'assets/iso/ground.png'));
  isoWalls(img, { wall_top: tid('wall_top'), wall_upper: tid('wall_upper'), wall_lower: tid('wall_lower') }).save(path.join(ROOT, 'assets/iso/walls.png'));
  return { cols, rows };
}

// ---------------------------------------------------------------- nhân vật

const OUTLINE = '#1a1420';

/** Tạo cảm giác khối cho sprite: điểm đặc có trên trống thì sáng thêm, có bên phải trống thì tối đi (2 px). */
function shade3d(f, w, h) {
  const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && f.get(x, y)[3] > 200;
  const hex = c => `#${c.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('')}`;
  const marks = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!solid(x, y)) continue;
    const c = hex(f.get(x, y));
    if (!solid(x + 1, y)) marks.push([x, y, shade(c, -0.3)]);
    else if (!solid(x + 2, y)) marks.push([x, y, shade(c, -0.14)]);
    else if (!solid(x, y - 1)) marks.push([x, y, shade(c, 0.16)]);
  }
  for (const [x, y, c] of marks) f.set(x, y, c);
}

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

  // Thẻ sinh viên Văn Lang (dây xanh ngọc, thẻ đỏ, ô ảnh)
  if (spec.press && dir === 'down') { R(13, 21 + y0, 1, 6, '#1fa39a'); R(18, 21 + y0, 1, 6, '#1fa39a'); R(13, 27 + y0, 6, 5, '#d8283f'); R(13, 27 + y0, 6, 1, '#ffffff'); R(14, 29 + y0, 2, 2, '#1fa39a'); }
  if (spec.press && dir === 'right') { R(19, 26 + y0, 2, 4, '#d8283f'); }
  // Balo: quai đeo phía trước, thân balo phía sau / bên hông
  if (spec.backpack) {
    const bp = spec.backpack, bpD = shade(bp, -0.3);
    if (spec.vlu) {
      // balo Văn Lang: thân đỏ, viền xanh than trên / dưới, khiên trắng có chữ V đỏ ở mặt sau
      const navy = '#2e3170', navyL = '#3d4290';
      if (dir === 'down') { R(10, 20 + y0, 2, 9, navy); R(20, 20 + y0, 2, 9, navy); R(10, 20 + y0, 2, 1, bp); R(20, 20 + y0, 2, 1, bp); }
      if (dir === 'up') {
        R(9, 20 + y0, 14, 14, bp); R(9, 20 + y0, 14, 2, navyL); R(9, 32 + y0, 14, 2, navy); R(21, 22 + y0, 2, 10, shade(bp, -0.2));
        R(11, 23 + y0, 1, 7, shade(bp, 0.15));
        R(14, 24 + y0, 5, 4, '#ffffff'); R(15, 28 + y0, 3, 1, '#ffffff'); R(16, 29 + y0, 1, 1, '#ffffff');
        R(15, 25 + y0, 1, 1, bp); R(17, 25 + y0, 1, 1, bp); R(16, 26 + y0, 1, 1, bp);
      }
      if (dir === 'right') { R(7, 21 + y0, 5, 12, bp); R(7, 21 + y0, 5, 2, navyL); R(7, 31 + y0, 5, 2, navy); R(12, 20 + y0, 1, 8, navy); R(8, 25 + y0, 2, 2, '#ffffff'); }
    } else {
      if (dir === 'down') { R(10, 20 + y0, 2, 9, bpD); R(20, 20 + y0, 2, 9, bpD); }
      if (dir === 'up') { R(10, 21 + y0, 12, 12, bp); R(10, 21 + y0, 12, 3, shade(bp, 0.15)); R(13, 26 + y0, 6, 4, bpD); }
      if (dir === 'right') { R(8, 21 + y0, 4, 11, bp); R(8, 21 + y0, 4, 2, shade(bp, 0.15)); R(12, 20 + y0, 1, 8, bpD); }
    }
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
  // Ánh tóc và nơ cài tóc
  if (spec.highlight && hs === 'long') {
    if (dir === 'down') { R(12, 5 + y0, 3, 1, spec.highlight); R(9, 10 + y0, 1, 4, spec.highlight); R(22, 10 + y0, 1, 4, spec.highlight); }
    if (dir === 'up') { R(12, 6 + y0, 1, 12, spec.highlight); R(18, 6 + y0, 1, 12, spec.highlight); }
    if (dir === 'right') { R(11, 8 + y0, 1, 10, spec.highlight); R(13, 5 + y0, 4, 1, spec.highlight); }
  }
  if (spec.ribbon) {
    const rb = spec.ribbon, rbD = shade(rb, -0.3);
    if (dir === 'down') { R(19, 3 + y0, 2, 2, rb); R(22, 3 + y0, 2, 2, rb); R(21, 3 + y0, 1, 2, rbD); }
    if (dir === 'up') { R(13, 8 + y0, 2, 3, rb); R(17, 8 + y0, 2, 3, rb); R(15, 8 + y0, 2, 2, rbD); R(15, 10 + y0, 1, 3, rb); R(16, 10 + y0, 1, 3, rbD); }
    if (dir === 'right') { R(10, 5 + y0, 2, 2, rb); R(13, 5 + y0, 2, 2, rb); R(12, 5 + y0, 1, 2, rbD); }
  }
  // Bút gài sau tai
  if (spec.pen) {
    if (dir === 'down') { R(22, 7 + y0, 1, 6, '#f2d36b'); R(22, 6 + y0, 1, 1, '#c8323c'); }
    if (dir === 'right') { R(15, 7 + y0, 1, 6, '#f2d36b'); R(15, 6 + y0, 1, 1, '#c8323c'); }
  }

  // Mũ cói / mũ lưỡi trai
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

  // Khối giả 3D (nắng từ trên trái): mép trên sáng lên, mép phải tối đi; bóng đổ chéo sang phải
  shade3d(f, 32, 48);
  // Viền ngoài tự động
  const out = new Img(32, 48);
  out.ellipse(18, 45, 10, 2, '#00000050'); out.ellipse(21, 45, 6, 1, '#00000030');
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
  shade3d(f, 32, 48);
  out.ellipse(18, 46, 13, 2, '#00000060');
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

/** Lưới ký tự rỗng W x H; put(x, y, chuỗi) ghi đè từ (x, y). */
function grid(W, H, fill) {
  const g = Array.from({ length: H }, () => Array(W).fill(fill));
  const put = (x, y, str) => [...str].forEach((ch, i) => { g[y][x + i] = ch; });
  return { g, put, rows: () => g.map(r => r.join('')) };
}

// ---------------- Trụ sở Báo Thanh Niên (tên thật theo yêu cầu của nhóm; nhân vật và sự việc bên trong là GIẢ LẬP)
// Sảnh tầng trệt + 4 tầng, mỗi tầng một phòng của hồ sơ; đi lại bằng thang máy (object 'elevator', group 'tn').
// Tường phía bắc cao 2 ô (^ nửa trên, _ nửa dưới); đồ đạc là props đúng tỉ lệ.
/** Đạo cụ đặt tại (tx, ty) = tâm đáy tính theo ô. */
const pp = (key, tx, ty, props = {}) => obj('prop', key, tx * T, ty * T, 0, 0, props, { point: true });
/** Manh mối đánh lừa: tờ giấy nằm trên đất + vùng tương tác (dữ liệu ở npc_dialogues.json → decoys). */
const decoyAt = (id, tx, ty) => [pp('flyer', tx + 0.35, ty + 0.25), rectT('decoy', id, tx - 0.6, ty - 0.6, 1.2, 1.2, { decoy: id })];
/** Chữ ghi trên tường / sàn (biển tầng, biển phòng). */
const label = (name, tx, ty, text, props = {}) => obj('label', name, tx * T, ty * T, 0, 0, { text, ...props }, { point: true });

/** Khung một tầng: tường ngoài, tường bắc cao 2 ô, sàn; extra(put) để vẽ thêm. */
function floorRows(W, H, extra) {
  const { g, put, rows } = grid(W, H, '.');
  put(0, 0, '#'.repeat(W)); put(0, H - 1, '#'.repeat(W));
  for (let y = 0; y < H; y++) { g[y][0] = '#'; g[y][W - 1] = '#'; }
  put(1, 1, '^'.repeat(W - 2)); put(1, 2, '_'.repeat(W - 2));
  extra?.(g, put);
  return rows();
}
const TN_LEGEND = { '#': 'wall_top', '^': 'wall_upper', _: 'wall_lower' };

/** Một tầng của Thanh Niên (gọn 20x12): thang máy góc trái, căn phòng của hồ sơ chiếm cả tầng. */
function tnFloor(key, { floor, room, roomName, ground, props, inspects = [], extra = [] }) {
  const W = 20, H = 12;
  return buildMap(key, {
    rows: floorRows(W, H), legend: TN_LEGEND, label: `Báo Thanh Niên · ${floor} · ${roomName}`, music: 'office',
    ground: () => ground,
    objects: () => [
      point('spawn', 'spawn_elevator', 3.5, 4.3),
      rectT('zone', `zone_${room}`, 1, 3, W - 2, H - 4, { room }),
      rectT('elevator', 'elevator', 2.5, 2, 2, 1, { group: 'tn' }),
      pp('elevator', 3.5, 3),
      label('floor_label', 7.6, 1.5, `${floor.toUpperCase()}
${roomName.toUpperCase()}`, { size: 16, color: '#e8ecf2', plate: true }),
      pp('plant_big', 1.6, 4.4),
      // lối đi giữa phòng (hàng y 9,4) để trống cho người phụ trách đi tuần
      point('station', 'npc_station', 12, 9.4),
      path_('npc_patrol', [[9.5, 9.4], [15.5, 9.4]]),
      ...props, ...inspects, ...extra
    ]
  });
}

// Sảnh gọn 22x14: thang máy giữa tường bắc, quầy lễ tân trước thang máy, chờ bên trái, bảo vệ bên phải cửa
const tnLobby = buildMap('tn_lobby', {
  rows: floorRows(22, 14, (g, put) => { g[13][10] = g[13][11] = 'E'; }),
  legend: TN_LEGEND, label: 'Trụ sở Báo Thanh Niên — sảnh', music: 'office',
  ground: (ch, x, y) => (ch === 'E' ? 'exit_mat' : 'floor_lobby'),
  objects: () => [
    point('spawn', 'spawn_start', 11, 11.4),
    point('spawn', 'spawn_from_street', 11, 11.4),
    point('spawn', 'spawn_elevator', 11, 4.3),
    rectT('zone', 'zone_lobby', 1, 3, 20, 10, { area: 'lobby' }),
    rectT('exit', 'exit_street', 10, 12.6, 2, 1.4, { target: 'street', spawn: 'spawn_from_office' }),
    rectT('elevator', 'elevator', 10, 2, 2, 1, { group: 'tn' }),
    pp('elevator', 11, 3),
    label('lobby_name', 4.8, 1.6, 'BÁO THANH NIÊN — TRỤ SỞ', { size: 20, color: '#e8ecf2', plate: true }),
    pp('tv_wall', 15, 2.6), pp('cork_board', 18.6, 2.9), pp('wall_clock', 13.4, 1.6),
    pp('reception', 11, 7.4),
    pp('rug_lobby', 11, 12),
    pp('sofa', 3.6, 6.2), pp('coffee_table', 3.6, 7.6), pp('sofa', 3.6, 9.8),
    pp('desk_papers', 17.8, 11.6), pp('chair', 17.8, 10.4), pp('trash', 19.8, 12.2),
    pp('sofa', 18, 6.2), pp('coffee_table', 18, 7.6),
    pp('plant_big', 1.6, 4.4), pp('plant_big', 20.4, 4.4), pp('bookshelf', 1.75, 11.2, { face: 'e' }), pp('plant_small', 5.6, 12.6),
    pp('water_cooler', 12.9, 4.2), pp('floor_lamp', 6.4, 9), pp('floor_lamp', 15.6, 9),
    point('npc', 'amb_guard', 15.6, 11.4, { patrol: 'patrol_guard' }),
    path_('patrol_guard', [[15.6, 11.4], [13.4, 11.4]]),
    point('npc', 'amb_worker', 6, 5, { patrol: 'patrol_worker' }),
    path_('patrol_worker', [[5.5, 5], [16.5, 5]]),
    point('station', 'npc1_lobby_end', 8, 9.4),
    path_('patrol_npc1_lobby', [[7.4, 9.4], [14.6, 9.4]]),
    rectT('inspect', 'inspect_notice', 17.6, 2, 2, 1, { text: 'inspect_notice' }),
    rectT('inspect', 'inspect_tv', 14, 2, 2, 1, { text: 'inspect_tv' }),
    rectT('inspect', 'inspect_reception', 8.5, 6.6, 5, 1, { text: 'inspect_reception' }),
    rectT('inspect', 'inspect_bookshelf_lobby', 1.75, 10.2, 0.8, 2, { text: 'inspect_bookshelf' }),
    rectT('inspect', 'inspect_cooler', 12.4, 3.6, 1, 0.8, { text: 'inspect_cooler' })
  ]
});

const tnF2 = tnFloor('tn_f2', {
  floor: 'Tầng 2', room: 'S3', roomName: 'Phòng Hồ sơ', ground: 'floor_wood',
  props: [
    pp('cork_board', 11.4, 2.9), pp('blinds_window', 14.6, 2.9), pp('whiteboard', 17.6, 2.75),
    pp('cabinet', 12.9, 4.2), pp('cabinet', 14, 4.2), pp('archive_shelf', 1.8, 7.6, { face: 'e' }),
    pp('desk_papers', 7, 7), pp('chair', 7, 8.1), pp('desk_papers', 11, 7), pp('chair', 11, 8.1),
    pp('desk_pc', 15, 7), pp('chair', 15, 8.1),
    pp('rug_room', 9.6, 10.8), pp('filing_boxes', 4, 10.6), pp('plant_small', 18.4, 10.6),
    pp('floor_lamp', 1.6, 10.6), pp('trash', 17.6, 7.6)
  ],
  inspects: [
    rectT('inspect', 'inspect_pinboard_S3', 10.4, 2, 2, 1, { text: 'inspect_pinboard' }),
    rectT('inspect', 'inspect_cabinet_S3', 12.2, 3.3, 2.4, 1, { text: 'inspect_cabinet' })
  ]
});
const tnF3 = tnFloor('tn_f3', {
  floor: 'Tầng 3', room: 'S4', roomName: 'Phòng Phân tích ảnh', ground: 'floor_dark',
  props: [
    pp('poster_a', 11.2, 2.4), pp('blinds_window', 14, 2.9), pp('tv_wall', 17.2, 2.6),
    pp('desk_lab', 7, 6.6), pp('chair', 7, 7.8), pp('desk_lab', 11.5, 6.6), pp('chair', 11.5, 7.8),
    pp('desk_lab', 16, 6.6), pp('chair', 16, 7.8),
    pp('dev_magnifier', 5.6, 10.6), pp('dev_monitor', 16, 10.8), pp('cabinet', 18.4, 4.2),
    pp('plant_small', 1.6, 10.6), pp('trash', 11.6, 10.6)
  ],
  inspects: [rectT('inspect', 'inspect_lab_S4', 5.9, 5.6, 11.2, 1, { text: 'inspect_lab' })]
});
const tnF4 = tnFloor('tn_f4', {
  floor: 'Tầng 4', room: 'S7', roomName: 'Phòng Tác động và chủ đích', ground: 'carpet',
  props: [
    pp('whiteboard', 12.6, 2.75), pp('cork_board', 15.4, 2.9), pp('tv_wall', 18, 2.6),
    pp('meeting_table', 12, 7.4), pp('water_cooler', 6.6, 4.2), pp('floor_lamp', 18.4, 4.6),
    pp('plant_big', 18.4, 10.6), pp('coffee_table', 4, 10.6)
  ]
});
const tnF5 = tnFloor('tn_f5', {
  floor: 'Tầng 5', room: 'S8', roomName: 'Phòng Phân loại và xử lý', ground: 'floor_lobby',
  props: [
    pp('cork_board', 12.4, 2.9), pp('whiteboard', 15, 2.75), pp('whiteboard', 17.8, 2.75),
    pp('desk_pc', 7, 6.8), pp('chair', 7, 7.9), pp('desk_papers', 15, 6.8), pp('chair', 15, 7.9),
    pp('sofa', 4.6, 10.8), pp('filing_boxes', 16.4, 10.6), pp('plant_small', 18.4, 10.6)
  ],
  inspects: [rectT('inspect', 'inspect_whiteboard_S8', 16.6, 1.8, 2.4, 1.2, { text: 'inspect_whiteboard' })]
});

// ---------------- Khu phố ven vịnh (mở rộng, u tối, nhiều lớp tòa nhà)
// Bắc → nam: hai lớp tòa nhà (lớp sau cao hơn, nhô lên sau mái lớp trước), vỉa hè, phố chính (2 chiều), vỉa hè,
// công viên + phố đi bộ + dãy nhà thấp quay mặt ra đường ven vịnh, đường ven vịnh (2 chiều), lối dạo, lan can, bến tàu, vịnh.
// Ký hiệu nền: _ vỉa hè, ^ mép vỉa trên, v mép vỉa dưới, = đường, - vạch giữa, % vạch qua đường, g cỏ, : sỏi, y hẻm,
// , lát đá (lối dạo, phố đi bộ), X cầu tàu; tường / nước: | lan can, ~ nước, p bảng bến tàu.
const CW = 96, CH = 64;
const N_BOTTOM = 19;   // đáy dãy nhà phía bắc
const C_BOTTOM = 38;   // đáy dãy nhà giữa (quay mặt ra đường ven vịnh)
const CITY = (() => {
  const { g, put, rows } = grid(CW, CH, 'y');
  const fill = (x0, y0, w, h, ch) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) g[y][x] = ch; };
  const road = (y0, crosses) => {
    put(0, y0 - 1, '^'.repeat(CW));
    for (const y of [y0, y0 + 1, y0 + 3, y0 + 4]) put(0, y, '='.repeat(CW));
    put(0, y0 + 2, '-'.repeat(CW));
    put(0, y0 + 5, 'v'.repeat(CW));
    for (const cx of crosses) for (let y = y0; y <= y0 + 4; y++) g[y][cx] = g[y][cx + 1] = '%';
  };
  fill(0, 19, CW, 2, '_');            // vỉa hè bắc
  road(22, [20, 60]);                 // phố chính: hàng 21–27
  fill(0, 28, CW, 2, '_');            // vỉa hè nam
  fill(0, 30, 44, 8, 'g');            // công viên
  for (let y = 30; y < 38; y++) g[y][20] = g[y][21] = ':';
  put(0, 34, ':'.repeat(44));
  fill(44, 28, 5, 11, ',');           // phố đi bộ (chợ)
  fill(0, 38, CW, 2, '_');            // vỉa hè ven vịnh
  road(41, [20, 46, 74]);             // đường ven vịnh: hàng 40–46
  fill(0, 47, CW, 3, ',');            // lối dạo
  put(0, 50, '|'.repeat(CW));
  fill(0, 51, CW, CH - 51, '~');
  // bến tàu: bãi gỗ 3 hàng dọc bờ (thay lan can) + hai cầu lên tàu
  for (let y = 50; y <= 52; y++) for (let x = 34; x <= 57; x++) g[y][x] = 'X';
  for (const x of [41, 42, 52, 53]) g[53][x] = 'X';
  g[49][48] = 'p';
  return rows();
})();

/** Tòa nhà (prop) với đáy ở hàng `bottom`, mép trái ở cột x0; sign/sub: chữ trên bảng hiệu. */
const bld = (key, x0, cols, bottom, sign, sub, extra = {}) => pp(key, x0 + cols / 2, bottom, { ...(sign ? { sign } : {}), ...(sub ? { sub } : {}), ...extra });
/** Lối vào tòa nhà: ô cửa (2 ô) ở cột doorX..doorX+2, sát chân tường. */
const doorExit = (name, doorX, bottom, target) => rectT('exit', name, doorX, bottom, 2, 0.7, { target, spawn: 'spawn_from_street' });

const street = buildMap('street', {
  rows: CITY, label: 'Khu phố ven vịnh Hạ Long', music: 'street',
  legend: { '|': 'railing', '~': 'water', p: 'post' },
  ground: (ch, x, y) => {
    if (ch === '=') return 'road';
    if (ch === '-') return x % 3 === 0 ? 'road' : 'road_line';
    if (ch === '%') return 'crosswalk';
    if (ch === '^') return 'curb';
    if (ch === 'v') return 'curb_low';
    if (ch === 'X') return 'dock';
    if (ch === 'g') return 'grass';
    if (ch === ':' || ch === 'y') return 'gravel';
    if (ch === ',') return 'promenade';
    if (ch === '~' || ch === '|') return y >= 51 ? 'water' : 'promenade';
    return 'sidewalk';
  },
  objects: () => [
    // --- lớp nhà phía sau (trang trí, nhô lên sau mái)
    bld('bld_apartment', 9, 9, 11),
    bld('bld_tenement', 25, 6, 11),
    bld('bld_hotel', 49, 10, 10),
    bld('bld_apartment', 76, 9, 11),
    // --- dãy nhà phía bắc, quay mặt ra phố chính
    bld('bld_office', 2, 7, N_BOTTOM, 'CAO ỐC VĂN PHÒNG'),
    bld('bld_thanhnien', 11, 12, N_BOTTOM, 'BÁO THANH NIÊN', 'Trụ sở'),
    bld('bld_tinvinh', 25, 9, N_BOTTOM, 'TIN VỊNH', 'trang tin'),
    bld('bld_pharmacy', 36, 5, N_BOTTOM),
    bld('bld_xacminh', 41, 8, N_BOTTOM, 'PHÒNG XÁC MINH', 'thiết bị thẩm định'),
    bld('bld_hotel', 51, 10, N_BOTTOM, null, null, { flip: true }),
    bld('bld_cafe', 63, 8, N_BOTTOM, 'CÀ PHÊ GIÓ BIỂN', 'mở cửa đến khuya'),
    bld('bld_books', 71, 5, N_BOTTOM),
    bld('bld_tenement', 78, 6, N_BOTTOM),
    bld('bld_store', 84, 6, N_BOTTOM),
    // --- dãy nhà thấp giữa hai con đường, quay mặt ra đường ven vịnh
    bld('bld_clinic', 50, 6, C_BOTTOM, 'TRUNG TÂM Y TẾ'),
    bld('bld_warehouse', 57, 12, C_BOTTOM),
    bld('bld_cafe2', 70, 6, C_BOTTOM, 'CÀ PHÊ SƯƠNG SỚM'),
    bld('bld_books', 77, 5, C_BOTTOM),
    bld('bld_pharmacy', 83, 5, C_BOTTOM, null, null, { flip: true }),
    bld('bld_closed', 89, 6, C_BOTTOM, null, null, { flip: true }),
    // --- lối vào các tòa nhà tương tác
    doorExit('door_office', 16.5, N_BOTTOM, 'tn_lobby'),
    doorExit('door_news', 27.5, N_BOTTOM, 'newsroom'),
    doorExit('door_agency', 44.5, N_BOTTOM, 'agency'),
    doorExit('door_cafe', 66.5, N_BOTTOM, 'cafe'),
    doorExit('door_office2', 4.5, N_BOTTOM, 'office2'),
    doorExit('door_clinic', 52.5, C_BOTTOM, 'clinic'),
    doorExit('door_cafe2', 72.5, C_BOTTOM, 'cafe2'),
    point('spawn', 'spawn_from_office2', 5.5, 20.4),
    point('spawn', 'spawn_from_clinic', 53.5, 39.4),
    point('spawn', 'spawn_from_cafe2', 73.5, 39.4),
    point('spawn', 'spawn_from_office', 17.5, 20.4),
    point('spawn', 'spawn_from_news', 28.5, 20.4),
    point('spawn', 'spawn_from_agency', 45.5, 20.4),
    point('spawn', 'spawn_from_cafe', 67.5, 20.4),
    // --- vỉa hè phố chính
    ...[4, 24, 40, 56, 72, 92].map((x, i) => pp('street_lamp', x, 20.2, i % 2 ? { flip: true } : {})),
    pp('tree', 9.6, 20.6), pp('tree', 34.5, 20.6), pp('tree', 61.5, 20.6), pp('tree', 89, 20.6),
    // trạm xe buýt trước Trụ sở Báo Thanh Niên (intro: nhân vật xuống xe buýt ở đây)
    pp('bus_stop', 11.6, 20.9), point('spawn', 'spawn_bus', 13.4, 21.3),
    pp('hydrant', 23, 20.5), pp('street_bin', 49.8, 20.5), pp('street_bin', 75.6, 20.5), pp('kiosk', 31.5, 20.8),
    pp('bus_stop', 10, 29.8), pp('bollard', 19.3, 28.8), pp('bollard', 22.7, 28.8), pp('bollard', 59.3, 28.8), pp('bollard', 62.7, 28.8),
    ...[30, 52, 66, 86].map(x => pp('street_lamp', x, 29.6)),
    pp('planter', 38, 29.6), pp('planter', 80, 29.6),
    // --- công viên
    // đài phun nước giữa công viên, luống hoa quanh, hàng rào cây dọc mép, ghế hướng vào đài phun
    pp('fountain', 28.5, 37.2),
    pp('flowerbed', 24.2, 32.4), pp('flowerbed', 33, 32.4), pp('flowerbed', 24.2, 37.4), pp('flowerbed', 33, 37.4),
    pp('hedge', 2.5, 30.7), pp('hedge', 8.5, 30.7), pp('hedge', 35.5, 30.7), pp('hedge', 41.5, 30.7),
    pp('tree_big', 4, 34.4), pp('tree_big', 14, 34.2), pp('tree', 9, 37.6), pp('tree_big', 40, 35.2), pp('tree', 17.6, 31.6),
    pp('bench', 11, 32.6), pp('bench', 28.5, 31.4), pp('bench', 38, 37.6), pp('bench', 18.5, 37.6),
    pp('kiosk', 12.4, 37.6), pp('street_lamp', 22.2, 34.4), pp('street_lamp', 35.4, 34.4), pp('street_lamp', 3, 37.4),
    // --- phố đi bộ (chợ)
    pp('market_stall', 45.5, 31.4), pp('market_stall', 45.5, 35.4), pp('street_bin', 48.6, 37.2),
    // --- vỉa hè ven vịnh, lối dạo
    ...[8, 30, 54, 82].map(x => pp('street_lamp', x, 39.6)),
    pp('bus_stop', 40, 39.8), pp('tree', 16, 39.8), pp('tree', 68, 39.8),
    ...[6, 26, 62, 86].map(x => pp('street_lamp', x, 49.2)),
    pp('bench', 14, 49.4), pp('bench', 34, 49.4), pp('bench', 70, 49.4), pp('planter', 52, 49.6), pp('planter', 90, 49.6),
    // --- vịnh: tàu neo, đảo đá
    // bến tàu du lịch (hư cấu): hai tàu neo sát bến, cầu lên tàu, quầy vé, cọc neo, phao cứu sinh, đèn, thùng hàng
    pp('tour_boat', 42, 57.25), pp('tour_boat', 52.5, 57.25, { flip: true }),
    pp('kiosk', 36.6, 52.4), pp('market_stall', 56, 51.4),
    ...[35, 39, 44.5, 47.5, 50, 55.6].map(x => pp('bollard', x, 52.85)),
    pp('life_ring', 46, 52.7), pp('life_ring', 38, 50.6),
    pp('street_lamp', 40, 50.4), pp('street_lamp', 50.6, 50.4), pp('street_lamp', 57.4, 52.6),
    pp('filing_boxes', 54.6, 50.8), pp('filing_boxes', 55.4, 51.9), pp('street_bin', 48.4, 50.6),
    pp('karst_big', 10, 62), pp('karst', 26, 60), pp('karst_big', 76, 63), pp('karst', 90, 58),
    // --- vùng, làn xe, vạch qua đường
    rectT('zone', 'zone_street', 0, 19, CW, 11, { area: 'street' }),
    rectT('zone', 'zone_park', 0, 30, 44, 8, { area: 'park' }),
    rectT('zone', 'zone_market', 44, 28, 5, 11, { area: 'market' }),
    rectT('zone', 'zone_coast', 0, 38, CW, 12, { area: 'coast' }),
    rectT('zone', 'zone_pier', 34, 50, 24, 4, { area: 'pier' }),
    // mỗi chiều một làn rộng 2 ô (ô tô, xe buýt, xe máy chạy chung, nối đuôi nhau)
    rectT('lane', 'lane_w', 0, 22, CW, 2, { dir: -1, kind: 'mixed' }),
    rectT('lane', 'lane_e', 0, 25, CW, 2, { dir: 1, kind: 'mixed' }),
    rectT('lane', 'lane2_w', 0, 41, CW, 2, { dir: -1, kind: 'mixed' }),
    rectT('lane', 'lane2_e', 0, 44, CW, 2, { dir: 1, kind: 'mixed' }),
    ...[[20, 22], [60, 22], [20, 41], [46, 41], [74, 41]].map(([x, y], i) => rectT('crosswalk', `cross_${i}`, x, y, 2, 5)),
    // --- người
    point('npc', 'npc5', 14, 48.4, { patrol: 'patrol_npc5' }),
    path_('patrol_npc5', [[4, 48.4], [40, 48.4]]),
    point('npc', 'amb_vendor', 14.2, 37.7),
    point('npc', 'amb_tourist', 50, 48.6, { patrol: 'patrol_tourist' }),
    path_('patrol_tourist', [[50, 48.6], [66, 48.6]]),
    point('npc', 'amb_fisher', 46.6, 51.8),
    point('npc', 'amb_student', 6, 19.6, { patrol: 'patrol_student' }),
    path_('patrol_student', [[2, 19.6], [34, 19.6]]),
    point('npc', 'amb_elder', 26, 32.6),
    point('npc', 'amb_jogger', 70, 47.6, { patrol: 'patrol_jogger' }),
    // kẻ tung tin đi rong (GIẢ LẬP): đuổi theo người chơi khi lại gần
    point('npc', 'amb_rumor', 60, 28.8, { patrol: 'patrol_rumor' }),
    path_('patrol_rumor', [[52, 28.8], [92, 28.8]]),
    point('npc', 'amb_rumor2', 80, 20.4, { patrol: 'patrol_rumor2' }),
    path_('patrol_rumor2', [[54, 20.4], [92, 20.4]]),
    // vỉa hè bắc đang thi công: rào kín vỉa hè và mép đường, phải sang đường ở vạch kẻ
    pp('barrier_ns', 36.5, 22.05), pp('barrier', 35.4, 19.3), pp('barrier', 35.4, 22.2),
    rectT('inspect', 'inspect_barrier', 35, 18.8, 3.2, 3.2, { text: 'inspect_barrier' }),
    ...decoyAt('decoy_S4', 13.4, 33.2), ...decoyAt('decoy_S7', 29.2, 20.6), ...decoyAt('decoy_S8', 40.2, 33.6),
    path_('patrol_jogger', [[2, 47.6], [94, 47.6]]),
    // --- đồ vật xem được
    rectT('inspect', 'inspect_office_sign', 13, 18.3, 3, 0.7, { text: 'inspect_office_sign' }),
    rectT('inspect', 'inspect_news_sign', 25.5, 18.3, 2, 0.7, { text: 'inspect_news_sign' }),
    rectT('inspect', 'inspect_agency_sign', 41.5, 18.3, 3, 0.7, { text: 'inspect_agency_sign' }),
    rectT('inspect', 'inspect_cafe_sign', 63.5, 18.3, 3, 0.7, { text: 'inspect_cafe_sign' }),
    rectT('inspect', 'inspect_kiosk_north', 30.5, 19.6, 2, 0.8, { text: 'inspect_kiosk' }),
    rectT('inspect', 'inspect_kiosk', 11.4, 36.8, 2, 0.8, { text: 'inspect_kiosk' }),
    rectT('inspect', 'inspect_busstop', 8.5, 29, 3, 0.8, { text: 'inspect_busstop' }),
    rectT('inspect', 'inspect_stall', 44.2, 30.6, 2.6, 0.8, { text: 'inspect_stall' }),
    rectT('inspect', 'inspect_pier_sign', 48, 49, 1, 1, { text: 'inspect_pier_sign' }),
    rectT('inspect', 'inspect_boat', 40.6, 53, 2.8, 1, { text: 'inspect_boat' }),
    rectT('inspect', 'inspect_boat_e', 51.6, 53, 2.8, 1, { text: 'inspect_boat' }),
    rectT('inspect', 'inspect_ticket', 35.4, 51.2, 2.4, 1.4, { text: 'inspect_ticket' }),
    rectT('inspect', 'inspect_sea', 0, 50, 34, 1, { text: 'inspect_sea' }),
    rectT('inspect', 'inspect_sea_e', 58, 50, 38, 1, { text: 'inspect_sea' })
  ]
});

// ---------------- Tòa soạn Tin Vịnh (trang tin hư cấu): S5 Lưu trữ, S6 Dòng thời gian, phòng biên tập (Phát Vội)
// Gọn 24x17: hai phòng nhỏ phía bắc (hàng 3–7), phòng biên tập phía nam (hàng 11–15)
const NEWS = floorRows(24, 17, (g, put) => {
  for (let y = 0; y <= 10; y++) g[y][11] = '#';
  put(0, 8, '#'.repeat(24)); put(1, 9, '^'.repeat(22)); put(1, 10, '_'.repeat(22));
  for (const x of [5, 6, 16, 17]) for (let y = 8; y <= 10; y++) g[y][x] = 'D';
  g[16][11] = g[16][12] = 'E';
});
const newsroom = buildMap('newsroom', {
  rows: NEWS, legend: TN_LEGEND, label: 'Tòa soạn Tin Vịnh', music: 'archive',
  // lối vào hai phòng (D) lát cùng sàn để thấy rõ là cửa mở thông
  ground: (ch, x, y) => (ch === 'E' ? 'exit_mat' : y < 8 || (ch === 'D' && y < 10) ? (x < 11 ? 'floor_wood' : 'floor_dark') : 'floor_wood'),
  objects: () => [
    point('spawn', 'spawn_from_street', 12, 14.6),
    rectT('zone', 'zone_S5', 1, 3, 10, 5, { room: 'S5' }),
    rectT('zone', 'zone_S6', 12, 3, 11, 5, { room: 'S6' }),
    rectT('zone', 'zone_newsroom', 1, 8, 22, 8, { area: 'newsroom' }),
    rectT('exit', 'exit_street', 11, 15.6, 2, 1.4, { target: 'street', spawn: 'spawn_from_news' }),
    label('news_name', 11.5, 9.55, 'TIN VỊNH — trang tin', { size: 14, plate: true }),
    label('s5_name', 4, 1.5, 'LƯU TRỮ BÁO CHÍ', { size: 14, plate: true }),
    label('s6_name', 14.6, 1.3, 'DÒNG THỜI GIAN', { size: 14, plate: true }),
    // S5 lưu trữ
    pp('archive_shelf', 3.4, 4.6), pp('archive_shelf', 7.6, 4.6), pp('cabinet', 10.2, 4.2),
    pp('desk_papers', 2.8, 7.6), pp('chair', 2.8, 6.5), pp('filing_boxes', 9.4, 7.6),
    // S6 dòng thời gian
    pp('dev_timeline', 17.6, 2.95), pp('cork_board', 21.2, 2.9), pp('desk_pc', 13.6, 7.6), pp('chair', 13.6, 6.5), pp('plant_small', 22.4, 7.6),
    // phòng biên tập
    pp('tv_wall', 7.6, 10.9), pp('blinds_window', 2.6, 11.1), pp('blinds_window', 21.4, 11.1), pp('poster_b', 15.4, 10.6),
    pp('desk_pc', 4, 13.2), pp('chair', 4, 14.3), pp('desk_pc', 8, 13.2), pp('chair', 8, 14.3),
    pp('desk_papers', 16, 13.2), pp('chair', 16, 14.3), pp('desk_pc', 20, 13.2), pp('chair', 20, 14.3),
    pp('printer', 22.4, 15.6), pp('water_cooler', 1.6, 11.6), pp('plant_big', 1.6, 15.6), pp('trash', 18, 15.6),
    point('npc', 'npc3', 5, 5.6, { patrol: 'patrol_npc3_home' }),
    path_('patrol_npc3_home', [[4.6, 5.6], [9.4, 5.6]]),
    point('station', 'npc3_s6', 17, 5.6),
    path_('patrol_npc3_s6', [[15, 5.6], [21.4, 5.6]]),
    point('npc', 'npc4', 12, 11.6, { patrol: 'patrol_npc4' }),
    path_('patrol_npc4', [[9.6, 11.6], [14.4, 11.6]]),
    rectT('inspect', 'inspect_archive', 1.8, 3.6, 3.2, 1, { text: 'inspect_archive' }),
    rectT('inspect', 'inspect_timeline', 15.5, 2, 4.2, 1, { text: 'inspect_timeline' }),
    rectT('inspect', 'inspect_newsdesk', 15, 12.2, 2, 1, { text: 'inspect_newsdesk' }),
    rectT('inspect', 'inspect_news_tv', 6.6, 9.6, 2, 1.2, { text: 'inspect_news_tv' }),
    ...decoyAt('decoy_S5', 6, 15.2)
  ]
});

// ---------------- Quán cà phê Gió Biển (gọn 16x12)
const cafe = buildMap('cafe', {
  rows: floorRows(16, 12, g => { g[11][7] = g[11][8] = 'E'; }), legend: TN_LEGEND, label: 'Quán cà phê Gió Biển', music: 'cafe',
  ground: ch => (ch === 'E' ? 'exit_mat' : 'floor_check'),
  objects: () => [
    point('spawn', 'spawn_from_street', 8, 9.6),
    rectT('zone', 'zone_cafe', 1, 3, 14, 8, { room: 'CAFE' }),
    rectT('exit', 'exit_street', 7, 10.6, 2, 1.4, { target: 'street', spawn: 'spawn_from_cafe' }),
    label('cafe_name', 4.5, 1.5, 'CÀ PHÊ GIÓ BIỂN', { size: 16, plate: true }),
    pp('cafe_counter', 4.4, 5.6), pp('tv_wall', 9.4, 2.6), pp('blinds_window', 13, 2.9), pp('wall_clock', 11.4, 1.4),
    pp('cafe_table', 9.6, 6.8), pp('cafe_table', 13, 6.8), pp('cafe_table', 3.4, 9.4), pp('cafe_table', 12.6, 10),
    pp('plant_big', 14.4, 10.6), pp('plant_big', 1.6, 10.6), pp('floor_lamp', 14.4, 4.6),
    point('npc', 'npc6', 10.6, 8.6),
    point('npc', 'amb_barista', 3, 3.9, { patrol: 'patrol_barista' }),
    path_('patrol_barista', [[1.8, 3.9], [6.6, 3.9]]),
    rectT('inspect', 'inspect_cafe_menu', 1.6, 4.2, 6, 1.2, { text: 'inspect_cafe_menu' }),
    rectT('inspect', 'inspect_cafe_tv', 8.4, 1.6, 2, 1.4, { text: 'inspect_cafe_tv' }),
    ...decoyAt('decoy_S3', 5.6, 8.2)
  ]
});

// ---------------- Phòng xác minh (GIẢ LẬP): thiết bị là props đúng tỉ lệ, object 'device' để tương tác
/** Thiết bị: prop + vùng tương tác ngay chân thiết bị. */
const devAt = (id, tx, ty, w = 2) => [pp(`dev_${id}`, tx, ty), rectT('device', id, tx - w / 2, ty - 1, w, 1, { device: id })];
// Gọn 18x12: ba thiết bị trên tường / sát tường, bốn thiết bị một hàng giữa phòng
const agency = buildMap('agency', {
  rows: floorRows(18, 12, g => { g[11][8] = g[11][9] = 'E'; }), legend: TN_LEGEND, label: 'Phòng xác minh', music: 'agency',
  ground: (ch, x, y) => (ch === 'E' ? 'exit_mat' : y >= 9 ? 'carpet' : 'floor_dark'),
  objects: () => [
    point('spawn', 'spawn_from_street', 9, 9.6),
    rectT('zone', 'zone_agency', 1, 3, 16, 8, { area: 'agency' }),
    rectT('exit', 'exit_street', 8, 10.6, 2, 1.4, { target: 'street', spawn: 'spawn_from_agency' }),
    label('agency_name', 8.2, 1.0, 'PHÒNG XÁC MINH', { size: 14, plate: true }),
    ...devAt('evidence', 2.8, 2.95), ...devAt('monitor', 8.6, 4.6, 3), ...devAt('timeline', 14.4, 2.95, 4),
    ...devAt('computer', 2.8, 7.6), ...devAt('magnifier', 6.6, 7.6), ...devAt('detector', 10.4, 7.6, 1.4), ...devAt('archive', 14.2, 7.6),
    pp('chair', 2.8, 8.7), pp('chair', 14.2, 8.7),
    pp('sofa', 3.6, 10.8), pp('coffee_table', 13.6, 10.6), pp('plant_big', 16.4, 10.6), pp('floor_lamp', 1.6, 10.6), pp('filing_boxes', 16.4, 6),
    ...decoyAt('decoy_S6', 11.6, 10.2)
  ]
});


// ---------------- Tòa nhà trang trí vào được (hư cấu, GIẢ LẬP): chỉ để thế giới sống động, không có nhiệm vụ
/** Nội thất nhỏ: tường bắc cao, cửa ra ở giữa cạnh nam. */
function decorRoom(key, { W, H, label, music, area, ground, back, items }) {
  const ex = Math.floor(W / 2) - 1;
  return buildMap(key, {
    rows: floorRows(W, H, g => { g[H - 1][ex] = g[H - 1][ex + 1] = 'E'; }), legend: TN_LEGEND, label, music,
    ground: ch => (ch === 'E' ? 'exit_mat' : ground),
    objects: () => [
      point('spawn', 'spawn_from_street', ex + 1, H - 2.4),
      rectT('zone', `zone_${key}`, 1, 3, W - 2, H - 4, { area }),
      rectT('exit', 'exit_street', ex, H - 1.4, 2, 1.4, { target: 'street', spawn: back }),
      ...items
    ]
  });
}
const office2 = decorRoom('office2', {
  W: 18, H: 12, label: 'Cao ốc văn phòng', music: 'office', area: 'office2', ground: 'floor_lobby', back: 'spawn_from_office2',
  items: [
    label('o2_name', 5, 1.5, 'CAO ỐC VĂN PHÒNG\nTẦNG TRỆT', { size: 14, plate: true }),
    pp('blinds_window', 10.4, 2.9), pp('whiteboard', 14.4, 2.75), pp('wall_clock', 12.4, 1.3),
    pp('plant_big', 1.6, 4.4), pp('water_cooler', 16.4, 4.2),
    pp('desk_pc', 4.6, 6.8), pp('chair', 4.6, 7.9), pp('desk_pc', 9, 6.8), pp('chair', 9, 7.9), pp('desk_pc', 13.4, 6.8), pp('chair', 13.4, 7.9),
    pp('printer', 14.6, 10.6), pp('filing_boxes', 2.6, 10.6), pp('trash', 11.6, 10.6), pp('plant_small', 16.4, 10.6),
    point('npc', 'amb_clerk', 3, 9.2, { patrol: 'patrol_clerk' }), path_('patrol_clerk', [[2.6, 9.2], [6.6, 9.2]]),
    point('npc', 'amb_clerk2', 12, 4.6)
  ]
});
const clinic = decorRoom('clinic', {
  W: 16, H: 12, label: 'Trung tâm y tế', music: 'agency', area: 'clinic', ground: 'floor_lobby', back: 'spawn_from_clinic',
  items: [
    label('cl_name', 4.5, 1.5, 'TRUNG TÂM Y TẾ', { size: 14, plate: true }),
    pp('poster_a', 9.4, 2.4), pp('tv_wall', 12.8, 2.6),
    pp('reception', 5, 5.6), pp('cabinet', 14.4, 4.2),
    pp('sofa', 3.4, 8.8), pp('coffee_table', 3.4, 10.2), pp('sofa', 12.6, 8.8), pp('water_cooler', 14.6, 6.4),
    pp('plant_big', 14.4, 10.6), pp('floor_lamp', 1.6, 10.6),
    point('npc', 'amb_nurse', 4, 3.9, { patrol: 'patrol_nurse' }), path_('patrol_nurse', [[2.6, 3.9], [7.4, 3.9]]),
    point('npc', 'amb_doctor', 11, 6.6, { patrol: 'patrol_doctor' }), path_('patrol_doctor', [[9.6, 6.6], [13.2, 6.6]]),
    point('npc', 'amb_patient', 12.2, 10)
  ]
});
const cafe2 = decorRoom('cafe2', {
  W: 16, H: 11, label: 'Cà phê Sương Sớm', music: 'cafe', area: 'cafe2', ground: 'floor_wood', back: 'spawn_from_cafe2',
  items: [
    label('c2_name', 4.5, 1.5, 'CÀ PHÊ SƯƠNG SỚM', { size: 14, plate: true }),
    pp('blinds_window', 10, 2.9), pp('poster_b', 13.6, 2.4),
    pp('cafe_counter', 4.4, 5.2), pp('bookshelf', 14.4, 4.6),
    pp('cafe_table', 9.6, 6.2), pp('cafe_table', 13, 7.6), pp('cafe_table', 3.4, 8.6),
    pp('floor_lamp', 1.6, 6.6), pp('plant_big', 14.4, 9.6),
    point('npc', 'amb_barista2', 3, 3.9, { patrol: 'patrol_barista2' }), path_('patrol_barista2', [[1.8, 3.9], [6.4, 3.9]]),
    point('npc', 'amb_patron', 11, 7.6)
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
  rows: BOSS, label: 'Phòng họp — nơi Kẻ Dệt Chuyện ẩn mình', music: 'boss',
  legend: { '#': 'wall_top', X: 'frame_wall', f: 'frame' },
  ground: ch => (ch === 's' ? 'shard' : ch === 'E' ? 'exit_mat' : 'void'),
  objects: () => [
    point('spawn', 'spawn_from_office', 10, 12.4),
    rectT('zone', 'zone_boss', 1, 1, 18, 12, { room: 'S9' }),
    rectT('exit', 'exit_office', 9, 12.7, 2, 1.3, { target: 'tn_lobby', spawn: 'spawn_elevator' }),
    point('npc', 'boss', 10, 5)
  ]
});

/** Xe cộ đúng tỉ lệ (tools/props.mjs → vehicles), nhìn ngang hướng sang phải; game lật khi chạy sang trái. */
function buildVehicles() {
  for (const [id, img] of Object.entries(vehicles())) img.save(path.join(ROOT, `assets/sprites/${id}.png`));
}

/**
 * Ghép props vào atlas (xếp theo kệ, rộng 2048): assets/props/props.png + props.json (định dạng JSON Hash của Phaser)
 * + props_meta.json (chân đế, đèn, biển hiệu, phẳng / dán tường).
 */
function buildProps() {
  const props = allProps();
  const list = Object.entries(props).sort((a, b) => b[1].img.h - a[1].img.h);
  const MAXW = 2048, PAD = 2;
  let x = 0, y = 0, rowH = 0;
  const pos = {};
  for (const [k, { img }] of list) {
    if (x + img.w > MAXW) { x = 0; y += rowH + PAD; rowH = 0; }
    pos[k] = [x, y];
    x += img.w + PAD; rowH = Math.max(rowH, img.h);
  }
  const atlas = new Img(MAXW, y + rowH);
  const frames = {}, meta = {};
  for (const [k, { img, meta: m }] of list) {
    const [px, py] = pos[k];
    atlas.blit(img, 0, 0, img.w, img.h, px, py);
    frames[k] = { frame: { x: px, y: py, w: img.w, h: img.h }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: img.w, h: img.h }, sourceSize: { w: img.w, h: img.h } };
    meta[k] = { w: img.w, h: img.h, ...m };
  }
  atlas.save(path.join(ROOT, 'assets/props/props.png'));
  fs.writeFileSync(path.join(ROOT, 'assets/props/props.json'), JSON.stringify({ frames, meta: { image: 'props.png', size: { w: MAXW, h: y + rowH }, scale: 1 } }));
  fs.writeFileSync(path.join(ROOT, 'assets/props/props_meta.json'), JSON.stringify(meta));
  return `props ${list.length} (atlas ${MAXW}x${y + rowH})`;
}

buildTileset();
const propsInfo = buildProps();
const badgesInfo = buildBadges(ROOT);
buildVehicles();
for (const [id, spec] of Object.entries(CHARACTERS)) buildCharacter(id, spec);
buildBoss();
console.log(['ok:', `tileset ${TILES.length} ô`, tnLobby, tnF2, tnF3, tnF4, tnF5, street, newsroom, cafe, agency, office2, clinic, cafe2, boss, propsInfo, badgesInfo].join('\n  '));
