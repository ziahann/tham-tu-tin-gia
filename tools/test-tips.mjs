// Kiểm tra hàng đợi mẹo (game/js/tips.js) không cần trình duyệt: DOM, state, đồng hồ đều giả. Chạy ở gốc repo: node tools/test-tips.mjs
import fs from 'node:fs';

const ui = JSON.parse(fs.readFileSync(new URL('../game/data/ui.json', import.meta.url), 'utf8'));
let fails = 0, n = 0;
const eq = (a, b, msg) => { n++; if (JSON.stringify(a) !== JSON.stringify(b)) { fails++; console.error(`✗ ${msg}: được ${JSON.stringify(a)}, cần ${JSON.stringify(b)}`); } };

// đồng hồ giả: setTimeout chỉ chạy khi gọi tick()
let now = 0, timers = [], tid = 0;
globalThis.setTimeout = (fn, ms = 0) => { timers.push({ id: ++tid, at: now + ms, fn }); return tid; };
globalThis.clearTimeout = id => { timers = timers.filter(t => t.id !== id); };
const tick = ms => { const end = now + ms; for (;;) { timers.sort((a, b) => a.at - b.at); const t = timers[0]; if (!t || t.at > end) break; timers.shift(); now = t.at; t.fn(); } now = end; };

// DOM giả: chỉ những gì tips.js dùng
const node = () => ({ textContent: '', hidden: false, children: [], on: {}, addEventListener(e, f) { this.on[e] = f; }, replaceChildren(...c) { this.children = c; } });
const box = Object.assign(node(), { hidden: true });
let cine = false;
globalThis.document = { getElementById: () => box, createElement: node, querySelector: () => null, body: { classList: { contains: () => cine } } };
globalThis.window = { matchMedia: () => ({ matches: false }) };
const shown = () => (box.hidden ? null : box.children[0].textContent);
const ok = () => box.children.at(-1).on.click();

const state = { settings: { tips: true, tipsSeen: [] } };
globalThis.__tipsStub = { data: { ui }, t: k => k, state, saveSettings() {}, getWorld: () => null };
const src = fs.readFileSync(new URL('../game/js/tips.js', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '')
  .replace(/^/, 'const { data, t, state, saveSettings, getWorld } = globalThis.__tipsStub;\n');
const tips = await import('data:text/javascript,' + encodeURIComponent(src));
const title = id => ui.tips[id].title;

// 1. mẹo khác gọi trước 'move' thì chờ; 'move' hiện trước, 'backpack' ngay sau, rồi theo thứ tự gọi
tips.showTip('feed');
eq(shown(), null, 'feed chờ move');
tips.showTip('move');
eq(shown(), title('move'), 'move hiện đầu tiên');
tips.showTip('track'); tips.showTip('cred');
ok();
eq(shown(), title('backpack'), 'backpack nối ngay sau move');
tick(12000);
eq(shown(), title('feed'), 'tự đóng sau 12 giây → mẹo kế');
ok(); eq(shown(), title('track'), 'track');
// 2. gọi trong lúc có cảnh cắt: chờ, hết cảnh cắt thì hiện tiếp
ok(); eq(shown(), title('cred'), 'cred');
cine = true;
ok(); tips.showTip('pressure'); tips.showTip('rumor');
eq(shown(), null, 'không hiện khi đang có cảnh cắt');
tick(5000);
eq(timers.length, 1, 'chỉ một vòng chờ cảnh cắt');
cine = false; tick(1000);
eq(shown(), title('pressure'), 'hết cảnh cắt → pressure');
ok(); eq(shown(), title('rumor'), 'rumor');
ok(); eq(shown(), null, 'hết hàng');
eq(state.settings.tipsSeen, ['move', 'backpack', 'feed', 'track', 'cred', 'pressure', 'rumor'], 'mỗi mẹo một lần, đúng thứ tự');
tips.showTip('feed'); eq(shown(), null, 'không hiện lại mẹo đã xem');

// 3. tắt mẹo: không hiện, không xếp hàng; bật lại thì 'move' mở đường cho mẹo khác
state.settings.tipsSeen = []; state.settings.tips = false;
tips.showTip('move'); tips.showTip('board');
eq(shown(), null, 'tắt mẹo → không hiện');
state.settings.tips = true;
tips.showTip('board'); eq(shown(), null, 'board chờ move');
tips.showTip('move'); // main.js gọi khi bật lại công tắc
eq(shown(), title('move'), 'bật lại → move');
ok(); eq(shown(), title('backpack'), 'backpack'); ok(); eq(shown(), title('board'), 'board không bị kẹt');

console.log(fails ? `${fails}/${n} lỗi` : `tips: ${n}/${n} đạt`);
process.exit(fails ? 1 : 0);
