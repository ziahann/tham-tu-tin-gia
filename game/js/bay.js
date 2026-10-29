// Nền chuyển động vịnh Hạ Long (pixel, vẽ bằng code): trời, đảo đá vôi nhiều lớp, mặt nước phản chiếu,
// mây, chim, sương. Không vẽ tàu (quy tắc nhân đạo). Bật "giảm chuyển động" thì chỉ vẽ một khung tĩnh.
import { state } from './state.js';

const W = 480;
const H = 270;
const HORIZON = 170;

// Bảng màu theo thời điểm trong ngày.
const PALETTES = {
  calm: { skyTop: '#3d6fa8', skyMid: '#8fb3d1', skyBot: '#f2d9a6', sun: '#fff1b8', sunY: 118, sea: '#2f6f8f', seaDeep: '#1d3f5f', far: '#9db3c8', mid: '#6d8aa0', near: '#35514f', veg: '#4f7a4a', cloud: '#ffffff', glow: 0.35, stars: 0 },
  dusk: { skyTop: '#2b2550', skyMid: '#8a4a6a', skyBot: '#f09a5a', sun: '#ffd27a', sunY: 150, sea: '#5a3f62', seaDeep: '#231f3f', far: '#8a6a8a', mid: '#5a4a6a', near: '#2a2638', veg: '#36443c', cloud: '#e0a8a0', glow: 0.5, stars: 0 },
  night: { skyTop: '#070b1c', skyMid: '#14203a', skyBot: '#2b3a60', sun: '#f4eedc', sunY: 46, sea: '#16223c', seaDeep: '#080d1a', far: '#33405e', mid: '#232d48', near: '#111729', veg: '#1a2630', cloud: '#3a4568', glow: 0.15, stars: 1 },
  dawn: { skyTop: '#3a4a7a', skyMid: '#c89ab0', skyBot: '#ffd6b0', sun: '#fff4d6', sunY: 140, sea: '#7e98b8', seaDeep: '#3f5a7f', far: '#b8b0c8', mid: '#8a8aa8', near: '#454b63', veg: '#57725c', cloud: '#fff0f0', glow: 0.4, stars: 0 }
};
const COLOR_KEYS = ['skyTop', 'skyMid', 'skyBot', 'sun', 'sea', 'seaDeep', 'far', 'mid', 'near', 'veg', 'cloud'];

/** "#rrggbb" → [r, g, b]. */
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
/** [r, g, b] → "rgb(...)". */
const css = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
/** Trộn hai màu theo tỉ lệ k (0..1). */
const mix = (a, b, k) => [0, 1, 2].map(i => a[i] + (b[i] - a[i]) * k);

/** Số ngẫu nhiên có hạt giống để địa hình giống nhau mỗi lần mở. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Dãy chiều cao cột cho một lớp đảo đá vôi (vách dốc, đỉnh tròn), dài 2W để cuộn vòng. */
function karstRange(seed, count, minH, maxH, minW, maxW) {
  const rnd = seeded(seed);
  const len = W * 2;
  const heights = new Float32Array(len);
  for (let i = 0; i < count; i++) {
    const cx = rnd() * len, w = minW + rnd() * (maxW - minW), h = minH + rnd() * (maxH - minH);
    const lean = (rnd() - 0.5) * 0.4;
    for (let dx = -w; dx <= w; dx++) {
      const u = Math.abs(dx / w + lean * (dx / w));
      if (u >= 1) continue;
      const prof = h * Math.pow(1 - Math.pow(u, 3.2), 0.55);
      const x = ((Math.round(cx + dx) % len) + len) % len;
      heights[x] = Math.max(heights[x], prof);
    }
  }
  // Mép lởm chởm kiểu đá vôi
  const rnd2 = seeded(seed * 7 + 3);
  for (let x = 0; x < len; x++) if (heights[x] > 2) heights[x] = Math.max(0, heights[x] + Math.round((rnd2() - 0.5) * 3));
  return heights;
}

export class Bay {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width = W;
    canvas.height = H;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.layers = {
      far: { h: karstRange(11, 26, 18, 52, 14, 34), base: HORIZON + 1, speed: 2 },
      mid: { h: karstRange(29, 14, 34, 78, 18, 40), base: HORIZON + 3, speed: 4.5 },
      near: { h: karstRange(53, 5, 70, 120, 24, 46), base: HORIZON + 30, speed: 9 }
    };
    const rnd = seeded(97);
    this.stars = Array.from({ length: 70 }, () => ({ x: rnd() * W, y: rnd() * (HORIZON - 40), p: rnd() * 6 }));
    this.clouds = Array.from({ length: 6 }, (_, i) => ({ x: rnd() * W, y: 20 + rnd() * 70, s: 0.6 + rnd() * 0.8, v: 3 + rnd() * 4, seed: i }));
    this.birds = Array.from({ length: 4 }, () => ({ x: rnd() * W, y: 40 + rnd() * 60, v: 10 + rnd() * 8, ph: rnd() * 6 }));
    this.sparkles = Array.from({ length: 90 }, () => ({ x: rnd() * W, y: HORIZON + 4 + rnd() * (H - HORIZON - 6), w: 2 + Math.floor(rnd() * 5), ph: rnd() * 6 }));
    this.from = this.to = PALETTES.calm;
    this.blend = 1;
    this.t = 0;
    this.raf = 0;
    this.last = 0;
  }

  /** Chuyển sang cảnh (calm | dusk | night | dawn), đổi màu từ từ trong ~1,5 giây. */
  setScene(name) {
    const next = PALETTES[name] || PALETTES.calm;
    if (next === this.to) return;
    this.from = this.palette();
    this.to = next;
    this.blend = state.settings.reduceMotion ? 1 : 0;
    if (!this.raf) this.draw();
  }

  /** Bảng màu hiện tại (đang chuyển giữa hai cảnh). */
  palette() {
    const k = this.blend, p = {};
    for (const key of COLOR_KEYS) p[key] = mix(typeof this.from[key] === 'string' ? rgb(this.from[key]) : this.from[key], rgb(this.to[key]), k);
    for (const key of ['sunY', 'glow', 'stars']) p[key] = this.from[key] + (this.to[key] - this.from[key]) * k;
    return p;
  }

  /** Bắt đầu chạy (hoặc vẽ một khung tĩnh nếu giảm chuyển động). */
  start() {
    this.canvas.hidden = false;
    if (state.settings.reduceMotion) { this.blend = 1; this.draw(); return; }
    if (this.raf) return;
    this.last = performance.now();
    const loop = now => {
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.t += dt;
      this.blend = Math.min(1, this.blend + dt / 1.5);
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** Dừng và ẩn. */
  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.canvas.hidden = true;
  }

  /** Vẽ một khung hình. */
  draw() {
    const { ctx } = this;
    const p = this.palette();
    const t = this.t;

    // Trời: các dải màu, có hàng chấm xen kẽ ở ranh giới cho cảm giác pixel.
    const BANDS = 14;
    const skyAt = y => {
      const u = y / HORIZON;
      return u < 0.55 ? mix(p.skyTop, p.skyMid, u / 0.55) : mix(p.skyMid, p.skyBot, (u - 0.55) / 0.45);
    };
    let prev = -1;
    for (let y = 0; y < HORIZON; y++) {
      const band = Math.floor((y / HORIZON) * BANDS);
      const c = skyAt((band + 0.5) * (HORIZON / BANDS));
      ctx.fillStyle = css(c);
      ctx.fillRect(0, y, W, 1);
      if (band !== prev && prev >= 0) {
        ctx.fillStyle = css(skyAt((band - 0.5) * (HORIZON / BANDS)));
        for (let x = (y % 2) * 2; x < W; x += 4) ctx.fillRect(x, y, 2, 1);
      }
      prev = band;
    }

    // Sao (đêm)
    if (p.stars > 0.05) {
      for (const s of this.stars) {
        const tw = 0.5 + 0.5 * Math.sin(t * 2 + s.p);
        ctx.fillStyle = `rgba(244,238,220,${(0.3 + 0.7 * tw) * p.stars})`;
        ctx.fillRect(s.x | 0, s.y | 0, 1, 1);
      }
    }

    // Mặt trời / mặt trăng + quầng sáng
    const sunX = 330;
    ctx.fillStyle = `rgba(${css(p.sun).slice(4, -1)},${p.glow * 0.35})`;
    this.disc(sunX, p.sunY, 30);
    ctx.fillStyle = `rgba(${css(p.sun).slice(4, -1)},${p.glow * 0.5})`;
    this.disc(sunX, p.sunY, 20);
    ctx.fillStyle = css(p.sun);
    this.disc(sunX, p.sunY, 12);

    // Mây
    for (const c of this.clouds) {
      c.x = (c.x + c.v * (this.raf ? 1 / 60 : 0) + W + 80) % (W + 80);
      this.cloud(c.x - 40, c.y, c.s, p.cloud);
    }

    // Đảo xa và giữa
    this.range('far', p.far, mix(p.far, p.skyBot, 0.25));
    this.range('mid', p.mid, mix(p.mid, p.skyBot, 0.18));

    // Sương mỏng sát chân trời
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(${css(p.skyBot).slice(4, -1)},${0.09 - i * 0.012})`;
      ctx.fillRect(0, HORIZON - 6 - i * 3, W, 4);
    }

    // Phản chiếu: lật phần trời + đảo qua đường chân trời, gợn sóng theo từng hàng
    for (let y = HORIZON; y < H; y++) {
      const src = HORIZON - (y - HORIZON) * 1.15 - 1;
      if (src < 0) break;
      const wob = Math.round(Math.sin(t * 1.6 + y * 0.45) * (1 + (y - HORIZON) / 40));
      ctx.drawImage(this.canvas, 0, src | 0, W, 1, wob, y, W, 1);
    }
    // Nhuộm màu nước, càng gần càng sâu
    for (let y = HORIZON; y < H; y++) {
      const u = (y - HORIZON) / (H - HORIZON);
      const c = mix(p.sea, p.seaDeep, u);
      ctx.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${0.55 + u * 0.3})`;
      ctx.fillRect(0, y, W, 1);
    }
    ctx.fillStyle = css(mix(p.skyBot, p.sun, 0.5));
    ctx.fillRect(0, HORIZON, W, 1);

    // Vệt nắng lấp lánh dưới mặt trời + gợn sóng
    for (const s of this.sparkles) {
      const dx = Math.abs(s.x - sunX);
      const near = Math.max(0, 1 - dx / 70);
      const tw = 0.5 + 0.5 * Math.sin(t * 3 + s.ph);
      const a = (0.08 + near * 0.6 * p.glow * 2) * tw;
      if (a < 0.03) continue;
      ctx.fillStyle = `rgba(${css(near > 0.2 ? p.sun : p.skyBot).slice(4, -1)},${Math.min(0.9, a)})`;
      const x = (s.x + Math.sin(t * 0.7 + s.ph) * 3) | 0;
      ctx.fillRect(x, s.y | 0, s.w, 1);
    }

    // Đảo gần (chân nằm trong nước) và bóng của chúng
    this.range('near', p.near, p.veg, true);

    // Chim
    for (const b of this.birds) {
      if (this.raf) b.x += b.v / 60;
      if (b.x > W + 10) { b.x = -10; b.y = 40 + Math.random() * 60; }
      const flap = Math.sin(t * 8 + b.ph) > 0;
      const y = b.y + Math.sin(t + b.ph) * 2;
      ctx.fillStyle = css(mix(p.near, p.skyTop, 0.2));
      ctx.fillRect(b.x | 0, y | 0, 1, 1);
      ctx.fillRect((b.x - 1) | 0, (y - (flap ? 1 : 0)) | 0, 1, 1);
      ctx.fillRect((b.x + 1) | 0, (y - (flap ? 1 : 0)) | 0, 1, 1);
      ctx.fillRect((b.x - 2) | 0, (y - (flap ? 2 : -1)) | 0, 1, 1);
      ctx.fillRect((b.x + 2) | 0, (y - (flap ? 2 : -1)) | 0, 1, 1);
    }
  }

  /** Hình tròn đặc kiểu pixel. */
  disc(cx, cy, r) {
    for (let y = -r; y <= r; y++) {
      const w = Math.round(Math.sqrt(r * r - y * y));
      this.ctx.fillRect(cx - w, cy + y, w * 2, 1);
    }
  }

  /** Đám mây pixel ghép từ vài khối. */
  cloud(x, y, s, color) {
    const { ctx } = this;
    ctx.fillStyle = `rgba(${css(color).slice(4, -1)},0.75)`;
    const parts = [[0, 4, 30, 5], [6, 1, 14, 4], [14, -1, 10, 4], [22, 2, 12, 3]];
    for (const [dx, dy, w, h] of parts) ctx.fillRect((x + dx * s) | 0, (y + dy * s) | 0, (w * s) | 0, Math.max(1, (h * s) | 0));
  }

  /** Vẽ một lớp đảo đá vôi cuộn ngang; top là màu viền đỉnh (sáng / cây cối). */
  range(name, body, top, reflect = false) {
    const { ctx } = this;
    const L = this.layers[name];
    const off = Math.floor(this.t * L.speed);
    const len = L.h.length;
    const lit = css(mix(body, top, 0.45));
    for (let x = 0; x < W; x++) {
      const h = L.h[(x + off) % len];
      if (h < 1) continue;
      const y0 = Math.round(L.base - h);
      ctx.fillStyle = css(body);
      ctx.fillRect(x, y0, 1, Math.ceil(h));
      // mặt sáng ở sườn trái của mỗi khối (so với 3 cột trước để mép lởm chởm không tạo vệt sọc), viền đỉnh
      const hl = L.h[(x + off - 3 + len) % len];
      if (hl < h - 6) { ctx.fillStyle = lit; ctx.fillRect(x, y0, 1, Math.ceil(h * 0.7)); }
      ctx.fillStyle = css(top);
      ctx.fillRect(x, y0, 1, name === 'near' ? 3 : 1);
      if (reflect) {
        const rh = Math.min(H - L.base, Math.ceil(h * 0.55));
        const wob = Math.round(Math.sin(this.t * 1.6 + x * 0.05) * 1);
        ctx.fillStyle = `rgba(${css(body).slice(4, -1)},0.55)`;
        ctx.fillRect(x + wob, L.base, 1, rh);
      }
    }
  }
}
