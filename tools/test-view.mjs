// Kiểm tra công tắc góc nhìn (game/js/iso.js) và ảnh tòa nhà top-down (props_meta.json) bằng node.
// Chạy ở thư mục gốc repo: node tools/test-view.mjs
import fs from 'node:fs';
import { iso, setupIso } from '../game/js/iso.js';

let fails = 0;
const eq = (got, want, label) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) { fails++; console.error(`✗ ${label}: được ${g}, cần ${w}`); }
};

// --- top-down (mặc định)
eq(iso.mode, 'top', 'mặc định top-down');
eq(setupIso(100, 50), { width: 100, height: 50 }, 'top: setupIso');
eq(iso.P(10, 20), { x: 10, y: 20 }, 'top: P');
eq(iso.depth(10, 20), 20, 'top: depth theo y');
eq(iso.toLogicalDir(1, 0), { x: 1, y: 0 }, 'top: toLogicalDir');
eq(iso.toScreenDir(0, 1), { x: 0, y: 1 }, 'top: toScreenDir');

// --- isometric (giữ nguyên hành vi cũ)
iso.mode = 'iso';
eq(setupIso(100, 50), { width: 150, height: 75 }, 'iso: setupIso');
eq(iso.P(10, 20), { x: 40, y: 15 }, 'iso: P');
eq(iso.depth(10, 20), 30, 'iso: depth');
iso.mode = 'top';

// --- mọi tòa nhà có bản top-down
{
  const meta = JSON.parse(fs.readFileSync(new URL('../game/assets/props/props_meta.json', import.meta.url), 'utf8'));
  const blds = Object.keys(meta).filter(k => k.startsWith('bld_') && !k.includes('@'));
  eq(blds.filter(k => !meta[`${k}@top`]), [], 'mọi bld_* có bld_*@top');
  eq(blds.filter(k => meta[k].sign && !meta[`${k}@top`]?.sign), [], 'biển hiệu có ở @top');
  eq(blds.filter(k => meta[`${k}@top`] && meta[`${k}@top`].h > 1.2 * meta[k].h), [], '@top không cao hơn 1,2 lần bản iso');
}

if (fails) { console.error(`test-view: ${fails} lỗi`); process.exit(1); }
console.log('test-view: ok');
