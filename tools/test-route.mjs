// Kiểm tra lộ trình chữ (game/js/route.js) trên các bản đồ thật. Chạy ở gốc repo: node tools/test-route.mjs
import fs from 'node:fs';
import { graphFromMaps, routeTo, routeText } from '../game/js/route.js';

const rd = p => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const MAPS = rd('../game/js/world.js').match(/const MAPS = \[(.*?)\]/)[1].match(/'(\w+)'/g).map(s => s.slice(1, -1));
const floors = JSON.parse(rd('../game/data/quests.json')).building.floors;
const ui = JSON.parse(rd('../game/data/ui.json')).route;
const maps = Object.fromEntries(MAPS.map(k => [k, JSON.parse(rd(`../game/maps/${k}.json`))]));
const label = {};
for (const k of MAPS) label[k] = maps[k].properties?.find(p => p.name === 'label')?.value;
const names = {
  label, tpl: ui, city: ui.cities, outdoor: ['street', 'hcm'],
  floor: Object.fromEntries(floors.map(f => [f.map, `${f.label} · ${f.name}`])),
};
const g = graphFromMaps(maps, floors);

let fails = 0, n = 0;
const ok = (cond, msg) => { n++; if (!cond) { fails++; console.error('✗ ' + msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: được ${JSON.stringify(a)}, cần ${JSON.stringify(b)}`);

for (const k of MAPS) ok(label[k], `bản đồ ${k} thiếu label`);

const r = routeTo(g, 'tn_f5', 'newsroom');
eq(r?.map(e => e.to), ['tn_lobby', 'street', 'newsroom'], 'tn_f5 → newsroom');
ok(r?.[0].elevator, 'cạnh đầu là thang máy');
eq(routeText(r, 'Gặp bác Tín Thư', names), ['Đi thang máy tới Tầng trệt · Sảnh, lễ tân', 'Ra Khu phố ven vịnh Hạ Long', 'Vào Tòa soạn Tin Vịnh', 'Gặp bác Tín Thư'], 'routeText');

const hs = routeTo(g, 'home', 'street');
ok(hs?.some(e => e.bus === true), 'home → street có xe khách');
ok(routeText(hs, '', names).includes('Bắt xe khách đi Hạ Long'), 'chữ xe khách');
eq(routeTo(g, 'x', 'street'), null, 'bản đồ lạ');
eq(routeTo(g, 'cafe', 'cafe'), [], 'cùng bản đồ');

const targets = Object.entries(g.where).filter(([k, w]) => /^npc:npc(\d|10)$/.test(k) || k.startsWith('device:'));
const bad = [];
for (const from of MAPS.filter(m => m !== 'boss')) {
  for (const [key, w] of targets) {
    const p = routeTo(g, from, w.map);
    if (!p) { bad.push(`${from} → ${key} (${w.map})`); continue; }
    ok(!routeText(p, '', names).some(s => /undefined|\{/.test(s)), `câu hỏng ${from} → ${key}`);
  }
}
ok(!bad.length, `không tới được: ${bad.join('; ')}`);

if (fails) process.exit(1);
console.log(`✓ route: ${n} ca`);
