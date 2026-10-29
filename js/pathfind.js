// Tìm đường cho chế độ "nháy chuột để đi": lưới 16 px trên không gian logic, ô bị chặn khi chân người chơi (16x10)
// đặt ở tâm ô chạm tường / cửa có va chạm hoặc chân đế đồ vật. A* 8 hướng (không cắt góc), rồi kéo thẳng đường đi.

const C = 16;

/** Dựng lưới chặn cho bản đồ hiện tại. layers: lớp ô có va chạm; bodies: thân tĩnh của đồ vật. */
export function buildGrid(map, layers, bodies) {
  const W = Math.ceil(map.widthInPixels / C), H = Math.ceil(map.heightInPixels / C);
  const blocked = new Uint8Array(W * H);
  const rects = bodies.map(b => [b.x, b.y, b.x + b.width, b.y + b.height]);
  for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) {
    const px = cx * C + C / 2, py = cy * C + C / 2;
    const x0 = px - 8, x1 = px + 8, y0 = py - 11, y1 = py - 1;
    let hit = false;
    for (const L of layers) {
      for (let ty = Math.floor(y0 / 32); ty <= Math.floor(y1 / 32) && !hit; ty++) {
        for (let tx = Math.floor(x0 / 32); tx <= Math.floor(x1 / 32) && !hit; tx++) {
          const t = L.getTileAt(tx, ty);
          if (t?.collides) hit = true;
        }
      }
      if (hit) break;
    }
    if (!hit) hit = rects.some(r => x0 < r[2] && x1 > r[0] && y0 < r[3] && y1 > r[1]);
    blocked[cy * W + cx] = hit ? 1 : 0;
  }
  return { W, H, blocked, free: (cx, cy) => cx >= 0 && cy >= 0 && cx < W && cy < H && !blocked[cy * W + cx] };
}

/** Ô trống gần nhất quanh (cx, cy) trong bán kính r (đích bấm trúng đồ vật / tường). */
function nearestFree(g, cx, cy, r = 6) {
  if (g.free(cx, cy)) return [cx, cy];
  for (let d = 1; d <= r; d++) {
    let best = null, bd = Infinity;
    for (let y = cy - d; y <= cy + d; y++) for (let x = cx - d; x <= cx + d; x++) {
      if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== d || !g.free(x, y)) continue;
      const dd = (x - cx) ** 2 + (y - cy) ** 2;
      if (dd < bd) { bd = dd; best = [x, y]; }
    }
    if (best) return best;
  }
  return null;
}

/** Đi thẳng được giữa hai điểm (px) không. */
function clear(g, ax, ay, bx, by) {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 6);
  for (let i = 1; i <= n; i++) {
    const x = ax + ((bx - ax) * i) / n, y = ay + ((by - ay) * i) / n;
    // kiểm tra cả hai mép thân để không lách qua góc đồ vật
    for (const [ox, oy] of [[0, 0], [-6, -4], [6, -4], [-6, 3], [6, 3]]) {
      if (!g.free(Math.floor((x + ox) / C), Math.floor((y + oy) / C))) return false;
    }
  }
  return true;
}

/** Đường đi từ (sx, sy) tới (tx, ty) (px logic): danh sách điểm, hoặc null nếu không tới được. */
export function findPath(g, sx, sy, tx, ty) {
  const s = nearestFree(g, Math.floor(sx / C), Math.floor(sy / C), 2);
  const e = nearestFree(g, Math.floor(tx / C), Math.floor(ty / C));
  if (!s || !e) return null;
  const key = (x, y) => y * g.W + x;
  const goal = key(e[0], e[1]);
  const open = [[0, s[0], s[1]]];
  const cost = new Map([[key(s[0], s[1]), 0]]);
  const from = new Map();
  const h = (x, y) => Math.hypot(x - e[0], y - e[1]);
  let found = false, guard = 0;
  while (open.length && guard++ < 60000) {
    // hàng đợi đơn giản: lấy phần tử f nhỏ nhất (lưới nhỏ, đủ nhanh)
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [, x, y] = open[bi];
    open[bi] = open[open.length - 1]; open.pop();
    const k = key(x, y);
    if (k === goal) { found = true; break; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!g.free(nx, ny)) continue;
      if (dx && dy && (!g.free(x + dx, y) || !g.free(x, y + dy))) continue;
      const nk = key(nx, ny), nc = cost.get(k) + (dx && dy ? Math.SQRT2 : 1);
      if (nc >= (cost.get(nk) ?? Infinity)) continue;
      cost.set(nk, nc);
      from.set(nk, k);
      open.push([nc + h(nx, ny), nx, ny]);
    }
  }
  if (!found) return null;
  const cells = [];
  for (let k = goal; k != null; k = from.get(k)) cells.push([(k % g.W) * C + C / 2, Math.floor(k / g.W) * C + C / 2]);
  cells.reverse();
  // kéo thẳng: bỏ điểm giữa khi đi thẳng được
  const pts = [[sx, sy]];
  let i = 0;
  while (i < cells.length - 1) {
    let j = cells.length - 1;
    const [ax, ay] = pts[pts.length - 1];
    while (j > i + 1 && !clear(g, ax, ay, cells[j][0], cells[j][1])) j--;
    pts.push(cells[j]);
    i = j;
  }
  if (pts.length === 1) pts.push(cells[cells.length - 1]);
  return pts.slice(1).map(([x, y]) => ({ x, y }));
}
