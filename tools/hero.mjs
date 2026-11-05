// Sprite người chơi hero_m / hero_f ghép từ bộ thiết kế "Thám Tử VLU" của nhóm (art-src/vlu-hero, art của nhóm):
// mỗi nguồn là một hàng 12 khung 64x64 nhìn chính diện hơi xoay 3/4 sang phải — idle 0–3, walk 4–9, inspect 10–11.
// Sheet game: 9 cột x 6 hàng (hàng 0 xuống, 1 trái, 2 phải, 3 lên, 4–5 ngồi); cột 0 đứng, 1–6 bước đi (hero chạy 6 khung, 10 fps).
// Nguồn chưa có mặt lưng: hàng "lên" tạm dùng khung chính diện. Trái = lật ngang.
import fs from 'node:fs';
import { Img, decodePng } from './png.mjs';

const F = 64;
const SRC = { hero_m: 'player-male-sheet.png', hero_f: 'player-female-sheet.png' };
const IDLE = 0, WALK = [4, 5, 6, 7, 8, 9];

/** Sheet 576x384 cho 'hero_m' | 'hero_f'. */
export function buildHero(id) {
  const src = decodePng(fs.readFileSync(new URL(`../art-src/vlu-hero/${SRC[id]}`, import.meta.url)));
  const strip = { get: (x, y) => { const i = (y * src.w + x) * 4; return [src.px[i], src.px[i + 1], src.px[i + 2], src.px[i + 3]]; } };
  const img = new Img(9 * F, 6 * F);
  const frames = [IDLE, ...WALK, WALK[0], WALK[1]]; // cột 7–8 chỉ lấp chỗ, hoạt cảnh hero dùng cột 1–6
  frames.forEach((f, col) => {
    for (const row of [0, 2, 3]) img.blit(strip, f * F, 0, F, F, col * F, row * F);
    img.blit(strip, f * F, 0, F, F, col * F, F, true); // trái
  });
  // khung ngồi (người chơi không ngồi): khung đứng
  [[0, 0, 0, 4], [0, 2, 1, 4], [0, 1, 2, 4], [0, 3, 0, 5]].forEach(([sc, sr, dc, dr]) => img.blit(img, sc * F, sr * F, F, F, dc * F, dr * F));
  return img;
}
