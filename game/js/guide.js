// Dẫn đường: mũi tên quanh người chơi chỉ tới người giao hồ sơ (hoặc thiết bị) đang theo dõi.
// NPC ở bản đồ khác thì mũi tên chỉ tới lối ra gần nhất trên đường đi (tìm theo đồ thị cửa giữa các bản đồ).
import { data, t, npcById } from './data.js';
import { trackTarget, trackedRoom } from './story.js';
import { setTrack } from './hud.js';

const propOf = (o, name) => (o.properties || []).find(p => p.name === name)?.value;

let graph = null; // { edges: { map: [{ to, x, y }] }, where: { 'npc:id' | 'device:id': { map, x, y } } }

/** Đọc mọi bản đồ đã tải: lối ra / cổng nối các bản đồ, NPC đứng ở bản đồ nào. */
export function buildGraph(scene, maps) {
  if (graph) return;
  graph = { edges: {}, where: {} };
  for (const key of maps) {
    const layer = scene.cache.tilemap.get(key)?.data.layers.find(l => l.name === 'objects');
    const objs = layer?.objects || [];
    graph.edges[key] = objs
      .filter(o => (o.type === 'exit' || o.type === 'portal') && maps.includes(propOf(o, 'target')))
      .map(o => ({ to: propOf(o, 'target'), x: o.x + o.width / 2, y: o.y + o.height / 2 }));
    objs.filter(o => o.type === 'npc').forEach(o => { graph.where[`npc:${o.name}`] = { map: key }; });
    // Thang máy: nối tới mọi tầng khác của tòa nhà (quests.json → building.floors)
    for (const o of objs.filter(o => o.type === 'elevator')) {
      for (const f of data.quests.building?.floors || []) {
        if (f.map !== key && maps.includes(f.map)) graph.edges[key].push({ to: f.map, x: o.x + o.width / 2, y: o.y + o.height / 2, elevator: true });
      }
    }
    objs.filter(o => o.type === 'device').forEach(o => {
      graph.where[`device:${propOf(o, 'device')}`] = { map: key, x: o.x + o.width / 2, y: o.y + o.height + 8 };
    });
  }
}

/** Lối ra đầu tiên trên đường ngắn nhất từ bản đồ from tới bản đồ to (BFS). */
function firstHop(from, to) {
  const seen = new Set([from]);
  const queue = graph.edges[from].map(e => ({ map: e.to, first: e }));
  while (queue.length) {
    const { map, first } = queue.shift();
    if (map === to) return first;
    if (seen.has(map)) continue;
    seen.add(map);
    (graph.edges[map] || []).forEach(e => queue.push({ map: e.to, first }));
  }
  return null;
}

/** Điểm mũi tên cần chỉ tới trên bản đồ hiện tại, hoặc null nếu không theo dõi gì. */
export function guideTarget(scene) {
  const tg = trackTarget();
  let at = tg && graph?.where[`${tg.kind}:${tg.id}`];
  // NPC đứng theo tầng (trạm có map): lấy tầng NPC sẽ đứng khi người chơi tới
  const floorMap = tg?.kind === 'npc' ? scene.npcMapOf?.(tg.id, true) : null;
  if (floorMap) at = { map: floorMap };
  if (!at) return null;
  if (at.map === scene.mapKey) {
    if (tg.kind === 'device') return { x: at.x, y: at.y, here: true };
    const s = scene.npcs.get(tg.id)?.sprite;
    return s ? { x: s.x, y: s.y - 20, here: true } : null;
  }
  const hop = firstHop(scene.mapKey, at.map);
  return hop ? { x: hop.x, y: hop.y, here: false } : null;
}

/** Bản đồ (tầng) của mục tiêu đang theo dõi, hoặc null (dùng để đánh dấu tầng trong thang máy). */
export function targetMap(scene) {
  const tg = trackTarget();
  if (!tg || !graph) return null;
  if (tg.kind === 'npc') return scene.npcMapOf?.(tg.id, true) || graph.where[`npc:${tg.id}`]?.map || null;
  return graph.where[`${tg.kind}:${tg.id}`]?.map || null;
}

/** Cập nhật dòng "đang theo dõi" trên thanh trên. */
export function updateTrackLine() {
  const tg = trackTarget();
  if (!tg) { setTrack(t('hud.trackNone'), false); return; }
  if (tg.kind === 'device') { setTrack(t('hud.track', { npc: t(`devices.${tg.id}.name`), place: t('devices.place') }), true); return; }
  const room = data.quests.rooms.find(r => r.id === trackedRoom());
  setTrack(t('hud.track', { npc: npcById(tg.id)?.name || tg.id, place: room?.name || '' }), true);
}

/** Mũi tên pixel vẽ bằng Graphics; gọi draw mỗi khung hình. */
export class GuideArrow {
  constructor(scene) {
    this.scene = scene;
    this.g = scene.add.graphics().setDepth(100001);
  }

  /** Vẽ mũi tên từ người chơi hướng về target; ẩn khi đã tới gần. */
  draw(player, target, time) {
    const g = this.g;
    g.clear();
    if (!target) return;
    const px = player.x, py = player.y - 24; // tâm thân người
    const dx = target.x - px, dy = target.y - py;
    const dist = Math.hypot(dx, dy);
    if (dist < (target.here ? 56 : 24)) return;
    const a = Math.atan2(dy, dx);
    const bob = this.scene.reduceMotion ? 0 : Math.sin(time / 180) * 3;
    // quỹ đạo elip: hai bên cách thân 26px, phía trên vượt qua đỉnh đầu (đầu ở khoảng -24 so với tâm)
    const rx = 26 + bob, ry = (Math.sin(a) < 0 ? 40 : 30) + bob;
    const cx = px + Math.cos(a) * rx, cy = py + Math.sin(a) * ry;
    const pt = (len, ang) => ({ x: cx + Math.cos(a + ang) * len, y: cy + Math.sin(a + ang) * len });
    const tip = pt(9, 0), l = pt(8, 2.4), rr = pt(8, -2.4);
    g.fillStyle(0xffc857, 0.18);
    g.fillCircle(cx, cy, 11);
    g.fillStyle(0x0b1020, 0.9);
    g.fillTriangle(tip.x + 1, tip.y + 2, l.x + 1, l.y + 2, rr.x + 1, rr.y + 2);
    g.fillStyle(0xffc857, 1);
    g.fillTriangle(tip.x, tip.y, l.x, l.y, rr.x, rr.y);
    g.lineStyle(2, 0x0b1020, 1);
    g.strokeTriangle(tip.x, tip.y, l.x, l.y, rr.x, rr.y);
  }
}
