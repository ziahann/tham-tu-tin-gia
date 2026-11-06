// Đồ tự vẽ của dự án (CC0) đặt lên sprite LPC: món LPC không có (nón lá, mũ lưỡi trai, dây thẻ, thẻ báo chí,
// máy ảnh, balo Văn Lang). Vị trí đo trên từng ô: đỉnh đầu, đáy chân, tâm ngang của thân.
import { shade } from './characters.mjs';

const F = 64;
const ROW_DIR = ['down', 'left', 'right', 'up'];
// ô ngồi: [cột, hàng, hướng]
const SIT = [[0, 4, 'down'], [1, 4, 'right'], [2, 4, 'left'], [0, 5, 'up']];
const NAVY = '#1f2a44';

/** Đo một ô: đỉnh, đáy và tâm ngang của phần không trong suốt. */
function measure(img, c, r) {
  let top = -1, bottom = -1, sx = 0, n = 0;
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
    if (!img.px[((r * F + y) * img.w + c * F + x) * 4 + 3]) continue;
    if (top < 0) top = y;
    bottom = y;
    if (y < top + 14) { sx += x; n++; }
  }
  if (top < 0) return null;
  // bề rộng đầu: đo ở hàng thứ 4 dưới đỉnh
  let left = F, right = -1;
  for (let x = 0; x < F; x++) if (img.px[((r * F + top + 4) * img.w + c * F + x) * 4 + 3]) { left = Math.min(left, x); right = x; }
  return { top, bottom, cx: Math.round(sx / n), h: bottom - top, headL: left, headW: right - left + 1 };
}

const fill = (img, x, y, w, h, color) => img.rect(x, y, w, h, color);

export const OWN_ITEMS = {
  conical_hat(img, ox, oy, dir, m, spec) {
    const c = spec.hat || '#e3cf9a', apex = oy + m.top - 5;
    for (let i = 0; i < 9; i++) fill(img, ox + m.cx - 2 - i * 1.4, apex + i, 4 + i * 2.8, 1, i % 3 === 2 ? shade(c, -0.25) : c);
    fill(img, ox + m.cx - 14, apex + 9, 28, 1, shade(c, -0.45));
  },
  cap(img, ox, oy, dir, m, spec) {
    // mũ ôm đầu: phủ 6 hàng trên cùng của tóc theo bề rộng đầu đo được, lưỡi trai về phía mặt
    const c = spec.cap || '#b23a3a', y = oy + m.top, x0 = ox + m.headL, w = m.headW;
    fill(img, x0 + 2, y - 1, w - 4, 1, shade(c, -0.4));
    fill(img, x0, y, w, 6, c);
    fill(img, x0 + 2, y + 1, w - 4, 1, shade(c, 0.2));
    fill(img, x0, y + 5, w, 1, shade(c, -0.3));
    if (dir === 'down') fill(img, x0 + 1, y + 6, w - 2, 2, shade(c, -0.45));
    if (dir === 'left') fill(img, x0 - 5, y + 4, 7, 2, shade(c, -0.45));
    if (dir === 'right') fill(img, x0 + w - 2, y + 4, 7, 2, shade(c, -0.45));
  },
  lanyard(img, ox, oy, dir, m) {
    if (dir === 'up') return;
    const neck = oy + m.top + Math.round(m.h * 0.42), x = ox + m.cx;
    for (let i = 0; i < 6; i++) { img.set(x - 3 + i * 0.5, neck + i, '#2a9d8f'); img.set(x + 3 - i * 0.5, neck + i, '#2a9d8f'); }
    if (dir === 'down') { fill(img, x - 2, neck + 6, 5, 6, '#f4f6f8'); fill(img, x - 1, neck + 7, 3, 2, '#2a9d8f'); }
    else fill(img, x + (dir === 'left' ? -2 : 0), neck + 6, 3, 5, '#f4f6f8');
  },
  press_card(img, ox, oy, dir, m) {
    if (dir !== 'down') return;
    const y = oy + m.top + Math.round(m.h * 0.55);
    fill(img, ox + m.cx - 7, y, 5, 4, '#f4f6f8');
    fill(img, ox + m.cx - 7, y, 5, 1, '#c8323c');
  },
  camera(img, ox, oy, dir, m) {
    if (dir === 'up') return;
    const y = oy + m.top + Math.round(m.h * 0.6), x = ox + m.cx + (dir === 'left' ? -9 : dir === 'right' ? 3 : 2);
    fill(img, x, y, 7, 5, '#22252e');
    fill(img, x + 2, y + 1, 3, 3, '#5a6b7a');
    img.set(x + 3, y + 2, '#c9d1dc');
  },
  vlu_backpack(img, ox, oy, dir, m, spec) {
    // vai đo từ chân (thân LPC cố định), không từ đỉnh tóc: tóc cao / dựng sẽ kéo quai xuống mặt
    const red = spec.backpack || '#b8223a', y = oy + m.bottom - 26, x = ox + m.cx;
    if (dir === 'down') { fill(img, x - 6, y, 2, 9, NAVY); fill(img, x + 4, y, 2, 9, NAVY); return; }
    if (dir === 'up') {
      fill(img, x - 7, y, 14, 15, NAVY);
      fill(img, x - 6, y + 1, 12, 13, red);
      fill(img, x - 6, y + 9, 12, 1, shade(red, -0.3));
      fill(img, x - 2, y + 3, 4, 4, '#f4f6f8');
      img.set(x - 1, y + 7, '#f4f6f8'); img.set(x, y + 7, '#f4f6f8');
      return;
    }
    const bx = dir === 'left' ? x + 4 : x - 9;
    fill(img, bx, y + 1, 5, 13, NAVY);
    fill(img, bx + 1, y + 2, 3, 11, red);
  }
};

/** Vẽ các món tự vẽ lên mọi ô đi + ngồi của sheet game (576x384). */
export function drawOwn(sheet, items, spec) {
  const cells = [];
  ROW_DIR.forEach((dir, r) => { for (let c = 0; c < 9; c++) cells.push([c, r, dir]); });
  cells.push(...SIT);
  for (const [c, r, dir] of cells) {
    const m = measure(sheet, c, r);
    if (!m) continue;
    for (const item of items) OWN_ITEMS[item](sheet, c * F, r * F, dir, m, spec);
  }
}
