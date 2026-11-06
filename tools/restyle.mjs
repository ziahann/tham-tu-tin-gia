// Chỉnh sprite LPC cho hợp đồ họa thế giới (khối isometric tông trầm, lạnh, sáng từ trên trái, viền tối có chọn lọc):
// viền đen LPC → viền bóng xanh than (ngoài) / sắc tối của màu kề bên (trong); giảm bão hòa, ngả lạnh; ánh viền trên trái, tối mép phải.
// Chạy trên cả sheet (các khung 64x64 cách nhau bằng vùng trong suốt). Không đổi alpha → khung, chân, vùng bấm giữ nguyên.
import { Img } from './png.mjs';

const NAVY = [28, 33, 49];   // viền bóng ngoài, cùng tông mép khối tường / tòa nhà
const FOG = [40, 50, 74];    // tông không khí của thế giới
const INK = 34;              // độ sáng dưới mức này = nét viền LPC

const lum = (p, i) => 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

/** Trả về Img mới đã chỉnh; src giữ nguyên. */
export function restyle(src) {
  const { w, h, px } = src, out = new Img(w, h);
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : (y * w + x) * 4);
  const solid = i => i >= 0 && px[i + 3] > 127;
  const ink = i => solid(i) && lum(px, i) < INK;
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = at(x, y);
    if (!px[i + 3]) continue;
    let c = [px[i], px[i + 1], px[i + 2]];
    if (ink(i)) {
      const nb = N4.map(([dx, dy]) => at(x + dx, y + dy));
      if (nb.some(j => !solid(j))) c = mix(c, NAVY, 0.85);       // mép ngoài: xanh than thay đen
      else {
        // nét trong: lấy màu sáng nhất kề bên (8 hướng) làm tối đi → viền cùng chất liệu như mép khối
        let best = -1, bl = INK;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const j = at(x + dx, y + dy); if (solid(j) && lum(px, j) > bl) { bl = lum(px, j); best = j; } }
        // chất liệu tối (tóc đen, quần đậm) giữ nét gần đen, chỉ ngả xanh than — tránh lốm đốm xám
        if (best >= 0) c = bl < 110 ? mix(c, NAVY, 0.3) : mix([px[best], px[best + 1], px[best + 2]].map(v => v * 0.5), NAVY, 0.35);
      }
    } else {
      // ánh sáng trên trái / tối phải theo mép khối (nhìn ảnh gốc để không lan dây chuyền)
      // chỉ xét mép bóng (cách vùng trong suốt ≤ 2 px), không xét nét trong → không tạo sọc trên tóc
      const edge = (dx, dy) => !solid(at(x + dx, y + dy)) || (ink(at(x + dx, y + dy)) && !solid(at(x + 2 * dx, y + 2 * dy)));
      if (edge(0, -1)) c = mix(c, [255, 250, 235], edge(-1, -1) ? 0.16 : 0.09);
      else if (edge(1, 0)) c = c.map(v => v * 0.84);
    }
    const g = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    c = mix(c, [g, g, g], 0.12);                                    // giảm bão hòa (nhẹ: mạnh hơn thì tóc nâu thành xám)
    c = mix(c, FOG, 0.1);                                           // ngả lạnh, nâng đen lên tông xanh than
    out.px.set([...c.map(v => Math.max(0, Math.min(255, Math.round(v)))), px[i + 3]], i);
  }
  return out;
}
