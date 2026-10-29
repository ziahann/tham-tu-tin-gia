// Bộ vẽ ảnh RGBA tối giản + ghi file PNG (chỉ dùng thư viện có sẵn của Node).
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

/** CRC32 cho khối PNG. */
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Đóng gói một khối PNG (độ dài + loại + dữ liệu + CRC). */
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** Chuyển "#rrggbb" hoặc "#rrggbbaa" thành [r, g, b, a]. */
export function rgba(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4, 6].map(i => (i < h.length ? parseInt(h.slice(i, i + 2), 16) : 255));
}

/** Ảnh RGBA trong bộ nhớ với vài hàm vẽ pixel. */
export class Img {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h * 4);
  }

  /** Đặt một pixel (có pha trộn alpha). */
  set(x, y, color) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !color) return;
    const [r, g, b, a] = typeof color === 'string' ? rgba(color) : color;
    const i = (y * this.w + x) * 4;
    const k = a / 255;
    this.px[i] = r * k + this.px[i] * (1 - k);
    this.px[i + 1] = g * k + this.px[i + 1] * (1 - k);
    this.px[i + 2] = b * k + this.px[i + 2] * (1 - k);
    this.px[i + 3] = Math.min(255, a + this.px[i + 3] * (1 - k));
  }

  /** Tô hình chữ nhật. */
  rect(x, y, w, h, color) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, color);
  }

  /** Viền hình chữ nhật dày 1px. */
  frame(x, y, w, h, color) {
    this.rect(x, y, w, 1, color); this.rect(x, y + h - 1, w, 1, color);
    this.rect(x, y, 1, h, color); this.rect(x + w - 1, y, 1, h, color);
  }

  /** Tô hình elip. */
  ellipse(cx, cy, rx, ry, color) {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) this.set(cx + x, cy + y, color);
    }
  }

  /** Lấy màu một pixel. */
  get(x, y) {
    const i = (y * this.w + x) * 4;
    return [this.px[i], this.px[i + 1], this.px[i + 2], this.px[i + 3]];
  }

  /** Chép một vùng của ảnh khác vào (tùy chọn lật ngang). */
  blit(src, sx, sy, w, h, dx, dy, flip = false) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const c = src.get(sx + (flip ? w - 1 - i : i), sy + j);
      if (c[3]) this.set(dx + i, dy + j, c);
    }
  }

  /** Ghi ra file PNG. */
  save(file) {
    const raw = Buffer.alloc((this.w * 4 + 1) * this.h);
    for (let y = 0; y < this.h; y++) {
      raw[y * (this.w * 4 + 1)] = 0;
      Buffer.from(this.px.buffer, y * this.w * 4, this.w * 4).copy(raw, y * (this.w * 4 + 1) + 1);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.w, 0);
    ihdr.writeUInt32BE(this.h, 4);
    ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', zlib.deflateSync(raw)),
      chunk('IEND', Buffer.alloc(0))
    ]);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, png);
  }
}

/** Số ngẫu nhiên có hạt giống (để ảnh sinh ra giống nhau mỗi lần chạy). */
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
