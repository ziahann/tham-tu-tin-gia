// Lớp hiển thị isometric (góc chéo 45°). Logic game (va chạm, vùng, lối ra, NPC, xe, dẫn đường) vẫn chạy trên lưới vuông
// 32 px; mọi thứ hiển thị được chiếu bằng P(x, y) = (x − y + ox, (x + y) / 2). Độ sâu vẽ = x + y (tâm chân / tâm ô).
// Ô nền vẽ sẵn vào RenderTexture chia mảnh; tường là khối (chỉ ô tường giáp sàn), tường phía trước được cắt thấp.

const T = 32;
const CHUNK = 2048;
export const WALL_H = 56;
const WALL_NAMES = new Set(['wall_top', 'wall_upper', 'wall_lower', 'wall_face', 'door_closed', 'window', 'pinboard']);

/** Phép chiếu dùng chung cho cảnh hiện tại. */
export const iso = {
  ox: 0,
  P(x, y) { return { x: x - y + this.ox, y: (x + y) / 2 }; },
  depth(x, y) { return x + y; },
  /** Hướng trên màn hình (sx, sy) → hướng logic. */
  toLogicalDir(sx, sy) { return { x: sy + sx / 2, y: sy - sx / 2 }; },
  /** Hướng logic → hướng trên màn hình. */
  toScreenDir(dx, dy) { return { x: dx - dy, y: (dx + dy) / 2 }; }
};

/** Đặt gốc chiếu theo kích thước bản đồ (pixel logic) để toạ độ màn hình luôn dương. */
export function setupIso(wPx, hPx) {
  iso.ox = hPx;
  iso.w = wPx; iso.h = hPx;
  return { width: wPx + hPx, height: (wPx + hPx) / 2 };
}

/** Ô có phải tường (khối) không. */
const isWall = t => !!t && WALL_NAMES.has(t.properties?.name);

/**
 * Vẽ nền: mọi ô lớp ground (và nước của lớp walls) thành ô thoi vào các RenderTexture 2048 px.
 * Trả về danh sách RenderTexture (để bật ánh sáng ban đêm).
 */
export function buildGround(scene, map, ground, walls) {
  const { width, height } = { width: map.widthInPixels + map.heightInPixels, height: (map.widthInPixels + map.heightInPixels) / 2 };
  const chunks = [];
  for (let cy = 0; cy * CHUNK < height + 64; cy++) for (let cx = 0; cx * CHUNK < width; cx++) {
    const w = Math.min(CHUNK, width - cx * CHUNK), h = Math.min(CHUNK, height + 64 - cy * CHUNK);
    const rt = scene.add.renderTexture(cx * CHUNK, cy * CHUNK, w, h).setOrigin(0).setDepth(-10);
    chunks.push({ rt, x0: cx * CHUNK, y0: cy * CHUNK, w, h });
  }
  // danh sách ô cần vẽ (một lần), rồi vẽ vào từng mảnh — mỗi RenderTexture một lượt beginDraw / endDraw
  const cells = [];
  for (let ty = 0; ty < map.height; ty++) for (let tx = 0; tx < map.width; tx++) {
    const p = iso.P(tx * T, ty * T);
    const g = ground.getTileAt(tx, ty);
    if (g) cells.push([g.index - 1, p.x - 32, p.y]);
    const w = walls.getTileAt(tx, ty);
    if (w && w.properties?.name === 'water') cells.push([w.index - 1, p.x - 32, p.y]);
  }
  for (const c of chunks) {
    c.rt.beginDraw();
    for (const [frame, sx, sy] of cells) {
      if (sx + 64 < c.x0 || sx > c.x0 + c.w || sy + 32 < c.y0 || sy > c.y0 + c.h) continue;
      c.rt.batchDrawFrame('isoground', frame, sx - c.x0, sy - c.y0);
    }
    c.rt.endDraw();
  }
  return chunks.map(c => c.rt);
}

/**
 * Khối tường: ô tường giáp sàn (4 hướng) mới vẽ. Sàn ở phía nam / đông (phía trước người nhìn) → tường sau, vẽ cao;
 * chỉ có sàn ở phía bắc / tây → tường trước, vẽ thấp để thấy trong phòng. Lan can ven vịnh vẽ dạng thanh thấp.
 * Các ô tường khác (đèn, cột biển...) vẽ dạng ảnh đứng lấy từ tileset.
 */
export function buildWalls(scene, map, walls) {
  const floor = (x, y) => x >= 0 && y >= 0 && x < map.width && y < map.height && !walls.getTileAt(x, y);
  const out = [];
  walls.forEachTile(t => {
    if (t.index < 1) return;
    const name = t.properties?.name;
    if (name === 'water') return;
    const p = iso.P(t.x * T, t.y * T);
    const depth = iso.depth(t.x * T + 16, t.y * T + 16);
    if (isWall(t)) {
      const back = floor(t.x, t.y + 1) || floor(t.x + 1, t.y);
      const front = floor(t.x, t.y - 1) || floor(t.x - 1, t.y);
      if (!back && !front) return;
      const img = scene.add.image(p.x - 32, p.y - WALL_H, 'isowalls', back ? 0 : 1).setOrigin(0).setDepth(depth);
      img.tile = t; img.tall = back;
      out.push(img);
    } else if (name === 'railing') {
      out.push(scene.add.image(p.x - 32, p.y - WALL_H, 'isowalls', 2).setOrigin(0).setDepth(depth));
    } else {
      // ô đồ vật cũ: ảnh đứng tại tâm ô
      const c = iso.P(t.x * T + 16, t.y * T + 24);
      out.push(scene.add.image(c.x, c.y, 'tilesheet', t.index - 1).setOrigin(0.5, 1).setDepth(depth));
    }
  });
  return out;
}

/**
 * Lớp hiển thị cho vật thể động: mỗi sprite vật lý (ẩn) có một ảnh hiển thị đặt theo phép chiếu, cùng khung hình,
 * lật, tỉ lệ. sync() gọi cuối mỗi khung hình.
 */
export class ViewLayer {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
  }

  /** Tạo ảnh hiển thị cho sprite logic s; trả về ảnh. */
  add(s, { depthBias = 0, isoTex = null } = {}) {
    // isoTex: { key, fw, ay, h, d } — ảnh isometric dựng sẵn (xe), neo tại chân mép trái mặt nam
    const v = isoTex ? this.scene.add.image(0, 0, isoTex.key).setOrigin(0, isoTex.ay / isoTex.h)
      : this.scene.add.sprite(0, 0, s.texture.key, s.frame.name).setOrigin(s.originX, s.originY);
    s.setVisible(false);
    if (s.pipeline?.name === 'Light2D') v.setPipeline('Light2D');
    s.view = v;
    this.items.push({ s, v, depthBias, isoTex });
    this.syncOne(this.items[this.items.length - 1]);
    return v;
  }

  syncOne({ s, v, depthBias, isoTex }) {
    if (isoTex) {
      const p = iso.P(s.x - isoTex.fw / 2, s.y);
      v.setPosition(Math.round(p.x), Math.round(p.y)).setDepth(iso.depth(s.x, s.y - isoTex.d / 2) + depthBias);
      return;
    }
    const p = iso.P(s.x, s.y);
    v.setPosition(Math.round(p.x), Math.round(p.y));
    if (v.texture.key !== s.texture.key) v.setTexture(s.texture.key, s.frame.name);
    else if (v.frame.name !== s.frame.name) v.setFrame(s.frame.name);
    v.setFlipX(s.flipX).setScale(s.scaleX, s.scaleY).setDepth(iso.depth(s.x, s.y) + depthBias);
  }

  /** Đồng bộ mọi ảnh; bỏ ảnh của sprite đã huỷ. */
  sync() {
    this.items = this.items.filter(it => {
      if (!it.s.active || !it.s.scene) { it.v.destroy(); return false; }
      this.syncOne(it);
      return true;
    });
  }

  /** Mọi ảnh hiển thị (để bật ánh sáng ban đêm). */
  views() { return this.items.filter(it => it.v.active && it.s.active).map(it => it.v); }
}

/**
 * Chữ nằm trên mặt tường / mặt tiền isometric: vẽ lên canvas với phép cắt xiên (cột x hạ x/2 px), thêm vào texture.
 * lines: các dòng chữ; size, color; plate: nền tối; fixed: { w, h } khung cố định (biển hiệu). Trả về { key, w, h0, h }.
 */
export function shearedText(scene, lines, { size = 16, color = '#e8ecf2', plate = false, sub = null, fixed = null } = {}) {
  const key = `txt:${lines.join('|')}:${sub || ''}:${size}:${fixed ? `${fixed.w}x${fixed.h}` : ''}`;
  const font = n => `${n}px VT323`;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font(size);
  const pad = plate ? 8 : 0;
  const w = fixed ? fixed.w : Math.ceil(Math.max(...lines.map(l => probe.measureText(l).width))) + pad * 2;
  const h0 = fixed ? fixed.h : lines.length * size + (plate ? 6 : 0);
  if (!scene.textures.exists(key)) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h0 + Math.ceil(w / 2) + 1;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0.5, 0, 1, 0, 0);
    if (plate) { ctx.fillStyle = '#0e1015'; ctx.fillRect(0, 0, w, h0); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
    ctx.font = font(size);
    const total = lines.length * size + (sub ? size * 0.6 : 0);
    let y = h0 / 2 - total / 2 + size / 2;
    for (const l of lines) { ctx.fillText(l, w / 2, y); y += size; }
    if (sub) { ctx.font = font(Math.round(size * 0.55)); ctx.fillStyle = '#a3adbf'; ctx.fillText(sub, w / 2, y - size * 0.2); }
    scene.textures.addCanvas(key, c);
  }
  return { key, w, h0, h: h0 + Math.ceil(w / 2) + 1 };
}

/** Làm mờ tường / đồ vật / tòa nhà đang che người chơi (vẽ sau người chơi và chồng lên ảnh của họ). */
export function fadeOccluders(list, hero) {
  const hb = hero.getBounds();
  for (const o of list) {
    if (!o.active) continue;
    const covers = o.depth > hero.depth && Phaser.Geom.Intersects.RectangleToRectangle(o.getBounds(), hb);
    const a = covers ? 0.35 : 1;
    if (o.alpha !== a) o.setAlpha(a);
  }
}
