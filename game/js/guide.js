// Dẫn đường: mũi tên quanh người chơi chỉ tới người giao hồ sơ (hoặc thiết bị) đang theo dõi.
// NPC ở bản đồ khác thì mũi tên chỉ tới lối ra gần nhất trên đường đi (tìm theo đồ thị cửa giữa các bản đồ).
import { data, t, npcById } from './data.js';
import { trackTarget, trackedRoom } from './story.js';
import { setTrack } from './hud.js';
import { state } from './state.js';
import { journeyGoal } from './journey.js';
import { graphFromMaps, routeTo, routeText } from './route.js';

const propOf = (o, name) => (o.properties || []).find(p => p.name === name)?.value;

let graph = null; // { edges: { map: [{ to, x, y }] }, where: { 'npc:id' | 'device:id': { map, x, y } } }
let names = null; // chữ cho lộ trình (route.js → routeText)

/** Đọc mọi bản đồ đã tải: lối ra / cổng nối các bản đồ, NPC đứng ở bản đồ nào. */
export function buildGraph(scene, maps) {
  if (graph) return;
  const tiled = Object.fromEntries(maps.map(k => [k, scene.cache.tilemap.get(k)?.data]).filter(([, d]) => d));
  const floors = data.quests.building?.floors || [];
  graph = graphFromMaps(tiled, floors);
  const tpl = data.ui.route;
  names = {
    tpl, city: tpl.cities, outdoor: ['street', 'hcm'],
    label: Object.fromEntries(Object.entries(tiled).map(([k, d]) => [k, propOf(d, 'label') || k])),
    floor: Object.fromEntries(floors.map(f => [f.map, `${f.label} · ${f.name}`])),
  };
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
    if (tg.kind === 'device' || tg.kind === 'spot') return { x: at.x, y: at.y, here: true };
    const s = scene.npcs.get(tg.id)?.sprite;
    return s ? { x: s.x, y: s.y - 20, here: true } : null;
  }
  const hop = routeTo(graph, scene.mapKey, at.map)?.[0];
  return hop ? { x: hop.x, y: hop.y, here: false } : null;
}

/** Bản đồ (tầng) của mục tiêu đang theo dõi, hoặc null (dùng để đánh dấu tầng trong thang máy). */
export function targetMap(scene) {
  const tg = trackTarget();
  if (!tg || !graph) return null;
  if (tg.kind === 'npc') return scene.npcMapOf?.(tg.id, true) || graph.where[`npc:${tg.id}`]?.map || null;
  return graph.where[`${tg.kind}:${tg.id}`]?.map || null;
}

/** Các bước chữ từ bản đồ hiện tại tới mục tiêu đang theo dõi; null nếu không theo dõi / không có đường. */
export function currentRoute(scene) {
  const tg = trackTarget(), to = tg && targetMap(scene);
  if (!to || !graph) return null;
  const arrive = tg.kind === 'npc' ? t('route.meet', { npc: npcById(tg.id)?.name || tg.id })
    : tg.kind === 'device' ? t('route.device', { device: t(`devices.${tg.id}.name`), place: names.label[to] })
    : journeyGoal();
  const edges = routeTo(graph, scene.mapKey, to);
  return edges && routeText(edges, arrive, names);
}

/** Cập nhật dòng "đang theo dõi" trên thanh trên. */
export function updateTrackLine(scene) {
  const tg = trackTarget();
  const jg = state.progress && journeyGoal();
  const r = scene && currentRoute(scene);
  if (r?.length) { setTrack(t('route.next', { step: r[0] }), true); return; }
  if (jg) { setTrack(jg, true); return; }
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
