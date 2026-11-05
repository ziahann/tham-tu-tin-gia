// Dựng sprite nhân vật từ các lớp Liberated Pixel Cup (LPC): tải lớp (có cache), đổi màu theo dải màu vật liệu,
// ghép theo zPos, xếp lại theo bố cục game và gom ghi công. Nguồn ghim một commit cố định.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Img, decodePng, rgba } from './png.mjs';
import { shade } from './characters.mjs';
import { drawOwn } from './lpc-own.mjs';

const PIN = 'https://raw.githubusercontent.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/86160e7507d6841259cff624a51a63c1d4847ee3/';
const base = () => process.env.LPC_BASE || PIN;
export const cacheDir = () => process.env.LPC_CACHE || path.join(path.dirname(fileURLToPath(import.meta.url)), '.lpc-cache');

export const FRAME = 64;
const COLS = 9;
const GAME_DIRS = ['down', 'left', 'right', 'up'];
const LPC_ROW = { up: 0, left: 1, down: 2, right: 3 };
// Ô ngồi trong sheet game: [cột, hàng, hướng]
const SIT_CELLS = [[0, 4, 'down'], [1, 4, 'right'], [2, 4, 'left'], [0, 5, 'up']];
// sit.png có 3 cột là 3 kiểu ngồi (khoanh chân, quỳ, ngồi ghế); NPC trong game ngồi ghế.
const SIT_VARIANT = 2;

/** Đọc một file của kho LPC: lấy từ cache, thiếu thì tải về cache. */
export async function fetchLpc(rel) {
  const file = path.join(cacheDir(), rel);
  if (fs.existsSync(file)) return fs.readFileSync(file);
  let buf;
  try {
    const res = await fetch(base() + rel);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    throw new Error(`Thiếu ${rel} trong cache và không tải được (${e.message})`);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  return buf;
}

/** Định nghĩa một lớp (sheet_definitions/<defPath>). */
export async function loadDef(defPath) {
  return JSON.parse((await fetchLpc(`sheet_definitions/${defPath}`)).toString('utf8'));
}

const rampSets = new Map();
/** Dải màu ứng viên cho vật liệu: bảng ulpc của vật liệu (nếu có) + bảng chung all_lpcr; ownOnly = chỉ bảng riêng. */
export async function rampsFor(material, ownOnly = false) {
  const key = `${material}:${ownOnly}`;
  if (!rampSets.has(key)) {
    const out = {};
    const files = [`palette_definitions/${material}/${material}_ulpc.json`];
    if (!ownOnly) files.push('palette_definitions/all/all_lpcr.json');
    for (const rel of files) {
      try { Object.assign(out, JSON.parse((await fetchLpc(rel)).toString('utf8'))); } catch { /* vật liệu không có bảng riêng */ }
    }
    rampSets.set(key, Object.fromEntries(Object.entries(out).filter(([, v]) => Array.isArray(v) && typeof v[0] === 'string')));
  }
  return rampSets.get(key);
}

const keyOf = (px, i) => '#' + [0, 1, 2].map(k => px[i + k].toString(16).padStart(2, '0')).join('');

/** Dải gốc khớp nhiều pixel nhất: { name, ramp, share } (share = tỉ lệ pixel thấy được nằm trong dải). */
export function pickRamp(img, ramps) {
  const counts = new Map();
  let total = 0;
  for (let i = 0; i < img.px.length; i += 4) {
    if (!img.px[i + 3]) continue;
    total++;
    const k = keyOf(img.px, i);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  let best = { name: null, ramp: null, share: 0 };
  for (const [name, ramp] of Object.entries(ramps)) {
    const hits = new Set(ramp.map(c => c.toLowerCase().slice(0, 7)));
    let n = 0;
    for (const [k, v] of counts) if (hits.has(k)) n += v;
    const share = total ? n / total : 0;
    if (share > best.share) best = { name, ramp, share };
  }
  return best;
}

/** Đổi màu theo thứ tự độ sáng: các màu của lớp xếp tối → sáng rồi trải đều lên dải đích. */
export function recolorByLuma(img, toRamp) {
  const luma = k => { const [r, g, b] = rgba(k); return 0.299 * r + 0.587 * g + 0.114 * b; };
  const keys = new Set();
  for (let i = 0; i < img.px.length; i += 4) if (img.px[i + 3]) keys.add(keyOf(img.px, i));
  const sorted = [...keys].sort((a, b) => luma(a) - luma(b));
  const n = sorted.length;
  const map = new Map(sorted.map((k, j) => [k, rgba(toRamp[n === 1 ? 3 : Math.round((j / (n - 1)) * (toRamp.length - 1))])]));
  const out = new Img(img.w, img.h);
  out.px.set(img.px);
  for (let i = 0; i < out.px.length; i += 4) if (out.px[i + 3]) out.px.set(map.get(keyOf(out.px, i)).slice(0, 3), i);
  return out;
}

/** Dải 6 màu tối → sáng quanh màu đích (màu đích ở vị trí 4). */
export function rampFor(material, hex) {
  return [-0.75, -0.5, -0.25, 0, 0.2, 0.4].map(k => (k ? shade(hex, k) : hex.toLowerCase()));
}

/** Thay các màu trùng dải gốc bằng màu tương ứng của dải đích; màu khác giữ nguyên. */
export function recolor(img, fromRamp, toRamp) {
  const map = new Map(fromRamp.map((c, i) => [c.toLowerCase().slice(0, 7), rgba(toRamp[i])]));
  const out = new Img(img.w, img.h);
  out.px.set(img.px);
  for (let i = 0; i < out.px.length; i += 4) {
    if (!out.px[i + 3]) continue;
    const key = '#' + [0, 1, 2].map(k => out.px[i + k].toString(16).padStart(2, '0')).join('');
    const to = map.get(key);
    if (to) out.px.set(to.slice(0, 3), i);
  }
  return out;
}

/** Nhiều lượt đổi màu chính xác trên một lớp (vd. mặt: da + mắt); pass = { material, to }. Dải đích được lấy mẫu lại theo độ dài dải gốc. */
export function recolorParts(img, passes, rampsByMaterial) {
  let out = img;
  for (const { material, to } of passes) {
    const best = pickRamp(out, rampsByMaterial[material] || {});
    if (!best.share) continue;
    const n = best.ramp.length;
    out = recolor(out, best.ramp, best.ramp.map((_, i) => to[n === 1 ? 0 : Math.round((i * (to.length - 1)) / (n - 1))]));
  }
  return out;
}

/** Xếp walk.png (9x4) + sit.png (3x4) của LPC thành sheet game 9x6 ô 64 px. */
export function toGameSheet(walk, sit) {
  const out = new Img(COLS * FRAME, 6 * FRAME);
  GAME_DIRS.forEach((dir, row) => out.blit(walk, 0, LPC_ROW[dir] * FRAME, COLS * FRAME, FRAME, 0, row * FRAME));
  if (sit) for (const [c, r, dir] of SIT_CELLS) out.blit(sit, SIT_VARIANT * FRAME, LPC_ROW[dir] * FRAME, FRAME, FRAME, c * FRAME, r * FRAME);
  return out;
}

const cellEmpty = (img, c, r) => {
  for (let y = r * FRAME; y < (r + 1) * FRAME; y++) for (let x = c * FRAME; x < (c + 1) * FRAME; x++) if (img.px[(y * img.w + x) * 4 + 3]) return false;
  return true;
};

/** Lỗi của một sheet game: sai kích thước hoặc ô đi / ngồi trống. */
export function checkSheet(id, img) {
  if (img.w !== COLS * FRAME || img.h !== 6 * FRAME) return [`${id}: kích thước ${img.w}x${img.h}, cần ${COLS * FRAME}x${6 * FRAME}`];
  const errs = [];
  GAME_DIRS.forEach((dir, r) => { for (let c = 0; c < COLS; c++) if (cellEmpty(img, c, r)) errs.push(`${id}: ô trống walk ${dir} ${c}`); });
  for (const [c, r, dir] of SIT_CELLS) if (cellEmpty(img, c, r)) errs.push(`${id}: ô trống sit ${dir}`);
  return errs;
}

/** Thư mục ảnh của lớp cho một thân; thay biến ${head} (mặc định = thân). Thân không có thì dùng male. */
export function resolveDir(layerVal, body, vars) {
  const dir = layerVal[body] || layerVal.male;
  return dir && dir.replace(/\$\{head\}/g, vars.head || body);
}

/** Mục credits của định nghĩa ứng với các thư mục ảnh đã dùng (file là tiền tố của thư mục); không mục nào khớp thì giữ cả. */
export function creditsFor(def, dirs) {
  const all = def.credits || [];
  const hit = all.filter(c => dirs.some(d => d.startsWith(c.file.replace(/\/?$/, '/'))));
  return hit.length ? hit : all;
}

/** Tải một ảnh hoạt ảnh của lớp; lớp không có hoạt ảnh đó thì trả null. */
async function layerAnim(dir, anim, def) {
  if (def.animations && !def.animations.includes(anim)) return null;
  return decodePng(await fetchLpc(`spritesheets/${dir}${anim}.png`));
}

/**
 * Ghép một nhân vật. spec.lpc = { body, layers: [{ def, color?, material? }] }; màu đích = spec[color].
 * Trả { img (sheet game), credits (mục credits của các lớp, kèm usedBy) }.
 */
export async function buildLpcCharacter(id, spec) {
  const { body, layers } = spec.lpc;
  const parts = [];
  const credits = [];
  for (const layer of layers) {
    const def = await loadDef(layer.def);
    const material = layer.material || def.recolors?.material || (def.match_body_color ? 'body' : 'cloth');
    for (const [key, val] of Object.entries(def)) {
      if (!/^layer_\d+$/.test(key)) continue;
      const dir = resolveDir(val, body, layer.vars || {});
      if (!dir) throw new Error(`${id}: lớp ${layer.def} không có thân ${body}`);
      parts.push({ z: val.zPos, dir, def, layer, material });
    }
    const dirs = Object.entries(def).filter(([k]) => /^layer_\d+$/.test(k)).map(([, v]) => resolveDir(v, body, layer.vars || {}));
    for (const c of creditsFor(def, dirs)) credits.push({ ...c, usedBy: [id] });
  }
  parts.sort((a, b) => a.z - b.z);
  const walk = new Img(COLS * FRAME, 4 * FRAME), sit = new Img(3 * FRAME, 4 * FRAME);
  for (const p of parts) {
    for (const [anim, dest] of [['walk', walk], ['sit', sit]]) {
      let img = await layerAnim(p.dir, anim, p.def);
      if (!img) continue;
      if (p.layer.parts) {
        const passes = p.layer.parts.map(([key, material, fallback]) => ({ material, to: rampFor(material, spec[key] || fallback) }));
        const ramps = Object.fromEntries(await Promise.all(p.layer.parts.map(async ([, m]) => [m, await rampsFor(m, true)])));
        img = recolorParts(img, passes, ramps);
      } else if (p.layer.color && spec[p.layer.color]) {
        const to = rampFor(p.material, spec[p.layer.color]);
        const best = pickRamp(img, await rampsFor(p.material));
        img = best.share >= 0.5 ? recolor(img, best.ramp, to) : recolorByLuma(img, to);
      }
      dest.blit(img, 0, 0, Math.min(img.w, dest.w), Math.min(img.h, dest.h), 0, 0);
    }
  }
  const img = toGameSheet(walk, sit);
  if (spec.lpc.own?.length) drawOwn(img, spec.lpc.own, spec);
  return { img, credits };
}
