// Dẫn đường: mũi tên quanh người chơi chỉ tới người giao hồ sơ đang theo dõi.
// NPC ở bản đồ khác thì mũi tên chỉ tới lối ra gần nhất trên đường đi (tìm theo đồ thị cửa giữa các bản đồ).
import { data, t, npcById } from './data.js';
import { state } from './state.js';
import { giverOf, trackedRoom } from './story.js';
import { setTrack } from './hud.js';

const propOf = (o, name) => (o.properties || []).find(p => p.name === name)?.value;

let graph = null; // { edges: { map: [{ to, x, y }] }, npcMap: { npcId: map } }

/** Đọc mọi bản đồ đã tải: lối ra / cổng nối các bản đồ, NPC đứng ở bản đồ nào. */
export function buildGraph(scene, maps) {
  if (graph) return;
  graph = { edges: {}, npcMap: {} };
  for (const key of maps) {
    const layer = scene.cache.tilemap.get(key)?.data.layers.find(l => l.name === 'objects');
    const objs = layer?.objects || [];
    graph.edges[key] = objs
      .filter(o => (o.type === 'exit' || o.type === 'portal') && maps.includes(propOf(o, 'target')))
      .map(o => ({ to: propOf(o, 'target'), x: o.x + o.width / 2, y: o.y + o.height / 2 }));
    objs.filter(o => o.type === 'npc').forEach(o => { graph.npcMap[o.name] = key; });
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
  const npc = giverOf(state.progress?.tracked);
  if (!npc || !graph) return null;
  const map = graph.npcMap[npc];
  if (map === scene.mapKey) {
    const s = scene.npcs.get(npc)?.sprite;
    return s ? { x: s.x, y: s.y - 20, npc, here: true } : null;
  }
  const hop = map && firstHop(scene.mapKey, map);
  return hop ? { x: hop.x, y: hop.y, npc, here: false } : null;
}

/** Cập nhật dòng "đang theo dõi" trên thanh trên. */
export function updateTrackLine() {
  const npc = giverOf(state.progress?.tracked);
  if (!npc) { setTrack(t('hud.trackNone'), false); return; }
  const room = data.quests.rooms.find(r => r.id === trackedRoom());
  setTrack(t('hud.track', { npc: npcById(npc)?.name || npc, place: room?.name || '' }), true);
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
    const px = player.x, py = player.y - 22;
    const dx = target.x - px, dy = target.y - py;
    const dist = Math.hypot(dx, dy);
    if (dist < (target.here ? 56 : 24)) return;
    const a = Math.atan2(dy, dx);
    const bob = this.scene.reduceMotion ? 0 : Math.sin(time / 180) * 3;
    const r = 30 + bob;
    const cx = px + Math.cos(a) * r, cy = py + Math.sin(a) * r;
    const pt = (len, ang) => ({ x: cx + Math.cos(a + ang) * len, y: cy + Math.sin(a + ang) * len });
    const tip = pt(9, 0), l = pt(8, 2.4), rr = pt(8, -2.4);
    g.fillStyle(0x0b1020, 0.9);
    g.fillTriangle(tip.x + 1, tip.y + 2, l.x + 1, l.y + 2, rr.x + 1, rr.y + 2);
    g.fillStyle(0xffc857, 1);
    g.fillTriangle(tip.x, tip.y, l.x, l.y, rr.x, rr.y);
    g.lineStyle(2, 0x0b1020, 1);
    g.strokeTriangle(tip.x, tip.y, l.x, l.y, rr.x, rr.y);
  }
}
