// Lộ trình chữ giữa các bản đồ: thuần dữ liệu, không import gì (chạy được bằng node).
const propOf = (o, name) => (o.properties || []).find(p => p.name === name)?.value;

/** Đồ thị cửa / thang máy / xe khách + nơi NPC, thiết bị, điểm đứng (cùng quy tắc guide.js → buildGraph). */
export function graphFromMaps(maps, floors = []) {
  const keys = Object.keys(maps);
  const graph = { edges: {}, where: {} };
  for (const key of keys) {
    const objs = maps[key].layers?.find(l => l.name === 'objects')?.objects || [];
    const edges = graph.edges[key] = [];
    const mid = o => ({ x: o.x + o.width / 2, y: o.y + o.height / 2 });
    for (const o of objs) {
      const target = propOf(o, 'target');
      if ((o.type === 'exit' || o.type === 'portal') && keys.includes(target)) edges.push({ to: target, ...mid(o) });
      else if (o.type === 'npc') graph.where[`npc:${o.name}`] = { map: key };
      else if (o.type === 'elevator') {
        for (const f of floors) if (f.map !== key && keys.includes(f.map)) edges.push({ to: f.map, ...mid(o), elevator: true });
      } else if (o.type === 'spot' || o.type === 'device') {
        const at = { map: key, x: o.x + o.width / 2, y: o.y + o.height + 8 };
        graph.where[o.type === 'spot' ? `spot:${o.name}` : `device:${propOf(o, 'device')}`] = at;
        const to = propOf(o, 'to');
        if (o.type === 'spot' && propOf(o, 'act') === 'bus' && keys.includes(to)) edges.push({ to, x: at.x, y: at.y, bus: true });
      }
    }
  }
  return graph;
}

/** Đường ngắn nhất (BFS) dưới dạng danh sách cạnh; [] nếu cùng bản đồ, null nếu không tới được. */
export function routeTo(graph, from, to) {
  if (from === to) return [];
  const parent = new Map([[from, null]]); // map -> cạnh dẫn tới nó
  const from_ = new Map();
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    for (const e of graph.edges[cur] || []) {
      if (parent.has(e.to)) continue;
      parent.set(e.to, e); from_.set(e.to, cur);
      if (e.to === to) {
        const path = [];
        for (let m = to; m !== from; m = from_.get(m)) path.unshift(parent.get(m));
        return path;
      }
      queue.push(e.to);
    }
  }
  return null;
}

/** Mỗi cạnh một câu, thêm arrive ở cuối. names = { label, floor, city, outdoor, tpl }. */
export function routeText(edges, arrive, names) {
  const { tpl } = names;
  const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k]);
  const lines = edges.map(e => {
    if (e.elevator) return fill(tpl.elevator, { floor: names.floor[e.to] });
    if (e.bus) return fill(tpl.bus, { city: names.city[e.to] });
    return fill(names.outdoor.includes(e.to) ? tpl.exit : tpl.enter, { place: names.label[e.to] });
  });
  return arrive ? [...lines, arrive] : lines;
}
