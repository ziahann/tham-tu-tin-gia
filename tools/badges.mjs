// Huy hiệu kỹ năng: mỗi hồ sơ một huy hiệu 48x56 (khiên kim loại + dải ruy băng + biểu tượng riêng), vẽ bằng code.
// gen-assets gọi buildBadges() → game/assets/badges/<mã phòng>.png. Thiết kế gốc, không dùng asset ngoài.
import path from 'node:path';
import { Img } from './png.mjs';
import { shade } from './characters.mjs';

const W = 48, H = 56;
const OUT = '#0b0f18';

/** Khung huy hiệu: ruy băng hai đuôi + khiên lục giác, viền kim loại theo màu chủ đạo. */
function frame(metal, ribbon) {
  const img = new Img(W, H);
  const R = (x, y, w, h, c) => img.rect(x, y, w, h, c);
  // ruy băng phía dưới (hai đuôi chữ V)
  for (let y = 38; y < 56; y++) {
    const k = y - 38;
    R(10 + Math.floor(k / 3), y, 9, 1, ribbon); R(29 - Math.floor(k / 3), y, 9, 1, shade(ribbon, -0.2));
  }
  R(12, 52, 3, 4, '#00000000');
  // khiên lục giác
  for (let y = 2; y < 46; y++) {
    const t = y < 12 ? (y - 2) / 10 : y > 34 ? (46 - y) / 12 : 1;
    const hw = Math.round(8 + 13 * Math.min(1, t));
    R(24 - hw, y, hw * 2, 1, metal);
  }
  // mặt trong tối, viền sáng phía trên trái
  for (let y = 5; y < 43; y++) {
    const t = y < 13 ? (y - 5) / 8 : y > 33 ? (43 - y) / 10 : 1;
    const hw = Math.round(6 + 12 * Math.min(1, t));
    R(24 - hw, y, hw * 2, 1, y < 24 ? '#1d2638' : '#172031');
  }
  for (let y = 3; y < 12; y++) img.set(24 - Math.round(8 + 13 * (y - 2) / 10) + 1, y, shade(metal, 0.4));
  R(17, 3, 14, 1, shade(metal, 0.45));
  return img;
}

/** Viền tối quanh huy hiệu. */
function outlined(img) {
  const out = new Img(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (img.get(x, y)[3] > 200) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < W && ny < H && img.get(nx, ny)[3] > 200; })) out.set(x, y, OUT);
  }
  out.blit(img, 0, 0, W, H, 0, 0);
  return out;
}

/** Biểu tượng riêng cho từng huy hiệu (vẽ trong vùng ~ 26x26 giữa khiên, tâm (24, 23)). */
const ICONS = {
  // Dừng lại trước khi chia sẻ: biển dừng bát giác + mũi tên chia sẻ bị gạch
  S3: (R, E, img) => {
    for (let y = 12; y < 34; y++) { const d = Math.min(y - 12, 33 - y, 6); const hw = 5 + d; R(24 - hw, y, hw * 2, 1, '#c8323c'); }
    R(15, 21, 18, 4, '#f4eedc');
    R(30, 30, 9, 3, '#e8ecf2'); R(36, 28, 2, 7, '#e8ecf2'); R(38, 30, 2, 3, '#e8ecf2');
    for (let i = 0; i < 10; i++) img.set(29 + i, 27 + i, '#ffc857');
  },
  // Soi ảnh: khung ảnh + kính lúp
  S4: (R, E) => {
    R(12, 12, 20, 16, '#e8ecf2'); R(14, 14, 16, 10, '#5a88a8'); R(14, 20, 16, 4, '#2c4a6b'); R(17, 16, 5, 3, '#c9d9e8');
    E(29, 27, 7, 7, '#ffc857'); E(29, 27, 5, 5, '#9fd8ff'); R(27, 25, 2, 2, '#ffffff');
    for (let i = 0; i < 6; i++) R(33 + i, 31 + i, 3, 2, '#ffc857');
  },
  // Truy gốc clip cũ: dải phim + đồng hồ
  S5: (R, E) => {
    R(11, 13, 18, 20, '#2b303b'); for (let y = 14; y < 32; y += 4) { R(12, y, 2, 2, '#e8ecf2'); R(26, y, 2, 2, '#e8ecf2'); }
    R(15, 15, 10, 7, '#7a8ea6'); R(15, 24, 10, 7, '#5a6b80');
    E(31, 28, 7, 7, '#e8ecf2'); E(31, 28, 5, 5, '#1d2638'); R(31, 24, 1, 4, '#ffc857'); R(31, 28, 3, 1, '#ffc857');
  },
  // Dựng dòng thời gian: trục ngang với các mốc ghim
  S6: (R) => {
    R(10, 23, 28, 2, '#e8ecf2');
    [[12, '#ffc857', -1], [19, '#9fd8ff', 1], [26, '#ffc857', -1], [33, '#f4b6c2', 1]].forEach(([x, c, s]) => {
      R(x - 1, 21, 4, 6, c); R(x - 2, s < 0 ? 13 : 28, 6, 7, c); R(x - 1, s < 0 ? 15 : 30, 4, 1, '#1d2638'); R(x - 1, s < 0 ? 17 : 32, 3, 1, '#1d2638');
    });
  },
  // Cân tác động và chủ đích: cái cân
  S7: (R, E) => {
    R(23, 12, 2, 22, '#e8ecf2'); R(17, 33, 14, 3, '#e8ecf2'); R(12, 15, 24, 2, '#e8ecf2'); E(24, 13, 2, 2, '#ffc857');
    for (let i = 0; i < 6; i++) { R(13 - Math.floor(i / 2), 17 + i, 1, 1, '#9fb3c8'); R(14 + Math.floor(i / 2), 17 + i, 1, 1, '#9fb3c8'); R(34 - Math.floor(i / 2), 17 + i, 1, 1, '#9fb3c8'); R(35 + Math.floor(i / 2), 17 + i, 1, 1, '#9fb3c8'); }
    R(9, 23, 10, 2, '#ffc857'); R(30, 23, 10, 2, '#9fd8ff');
  },
  // Phân loại và ứng xử: ba thẻ nhãn màu xếp chồng
  S8: (R) => {
    [[12, 12, '#c8323c'], [16, 19, '#ffc857'], [20, 26, '#3aa7a3']].forEach(([x, y, c]) => {
      R(x, y, 16, 8, c); R(x + 16, y + 2, 3, 4, c); R(x + 2, y + 2, 9, 1, '#1d2638'); R(x + 2, y + 4, 6, 1, '#1d2638'); R(x + 17, y + 3, 1, 2, '#1d2638');
    });
  },
  // Phỏng vấn kiểm chứng: hai bóng thoại, một có dấu hỏi
  CAFE: (R) => {
    R(10, 13, 18, 11, '#e8ecf2'); R(13, 24, 3, 3, '#e8ecf2'); R(13, 16, 12, 1, '#7a8698'); R(13, 19, 8, 1, '#7a8698');
    R(22, 22, 16, 11, '#ffc857'); R(33, 33, 3, 3, '#ffc857');
    R(28, 24, 4, 1, '#1d2638'); R(31, 25, 1, 2, '#1d2638'); R(29, 27, 2, 2, '#1d2638'); R(29, 30, 2, 1, '#1d2638');
  },
  // Gỡ mặt nạ Kẻ Dệt Chuyện: mặt nạ gương nứt
  S9: (R, E, img) => {
    E(24, 23, 10, 11, '#d6dce6'); E(26, 25, 7, 8, '#aab2c2'); E(24, 22, 9, 10, '#d6dce6');
    R(18, 20, 4, 2, '#1d2638'); R(26, 20, 4, 2, '#1d2638');
    [[23, 13], [24, 16], [22, 19], [24, 22], [26, 25], [25, 28], [27, 31]].forEach(([x, y]) => R(x, y, 1, 3, '#4a4e60'));
    R(28, 26, 5, 6, '#1d2638');
    img.set(19, 20, '#b28cff'); img.set(27, 20, '#b28cff');
  },
  // Danh hiệu cuối game (tòa soạn trao): ngôi sao trên cuộn giấy chứng nhận — ba bậc vàng / bạc / đồng
  ...Object.fromEntries(['gold', 'silver', 'bronze'].map(k => [`TITLE_${k}`, (R, E, img) => {
    R(12, 26, 24, 9, '#e8dcc0'); R(12, 26, 24, 1, '#c9b48a'); R(15, 29, 18, 1, '#7a6a4a'); R(15, 32, 12, 1, '#7a6a4a');
    const c = { gold: '#ffd54a', silver: '#e8ecf2', bronze: '#e0a060' }[k];
    for (let y = 0; y < 13; y++) { const w = y < 5 ? 1 + y : y < 7 ? 12 - (y - 5) * 2 : 4 + Math.abs(y - 9); R(24 - Math.floor(w / 2), 11 + y, w, 1, c); }
    img.set(24, 11, '#ffffff');
  }])),
  // Nhận diện mạo danh: thẻ tên với dấu tích giả bị gạch chéo
  BONUS: (R, E, img) => {
    R(10, 14, 28, 18, '#e8ecf2'); R(10, 14, 28, 4, '#2c4a6b'); R(13, 21, 7, 8, '#9fb3c8'); R(22, 21, 13, 1, '#5b5d6e'); R(22, 24, 10, 1, '#5b5d6e');
    E(33, 16, 4, 4, '#3d7fd1'); R(31, 16, 2, 1, '#ffffff'); R(33, 15, 1, 2, '#ffffff');
    for (let i = 0; i < 14; i++) { img.set(12 + i * 2, 33 - i, '#c8323c'); img.set(13 + i * 2, 33 - i, '#c8323c'); }
  }
};

// màu kim loại / ruy băng theo nhóm: hồ sơ ảnh (bạc xanh), báo chí (đồng), tác động (vàng), boss (tím), tùy chọn (xanh lá)
const STYLE = {
  S3: ['#c9d1dc', '#c8323c'], S4: ['#9fb3c8', '#2c6a8f'], S5: ['#c49a6c', '#7a4a2a'], S6: ['#c49a6c', '#2c4a6b'],
  S7: ['#e8c66a', '#7a5a20'], S8: ['#e8c66a', '#3aa7a3'], CAFE: ['#7fbf8f', '#2f5a48'], S9: ['#b28cff', '#3b2c4a'], BONUS: ['#7fbf8f', '#c8323c'],
  TITLE_gold: ['#e8c66a', '#c8323c'], TITLE_silver: ['#c9d1dc', '#2c4a6b'], TITLE_bronze: ['#c49a6c', '#3a5a3a']
};

/** Ghi mọi huy hiệu ra game/assets/badges/<mã>.png. */
export function buildBadges(root) {
  for (const [id, draw] of Object.entries(ICONS)) {
    const [metal, ribbon] = STYLE[id];
    const img = frame(metal, ribbon);
    const R = (x, y, w, h, c) => img.rect(x, y, w, h, c);
    const E = (cx, cy, rx, ry, c) => img.ellipse(cx, cy, rx, ry, c);
    draw(R, E, img);
    outlined(img).save(path.join(root, `assets/badges/${id}.png`));
  }
  return `badges ${Object.keys(ICONS).length}`;
}
