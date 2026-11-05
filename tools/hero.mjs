// Sprite người chơi hero_m / hero_f: nhóm tự vẽ bằng code (CC0), phong cách chibi tham khảo nhân vật của Ozzbit Games
// (đầu to, viền tối, khăn bay) nhưng không dùng điểm ảnh hay bảng màu của gói. Sinh viên Văn Lang: khăn đỏ, balo đỏ, thẻ dây xanh ngọc.
// Sheet giữ bố cục game: 9 cột x 6 hàng khung 64x64 (hàng 0 xuống, 1 trái, 2 phải, 3 lên, 4–5 ngồi), chân ở y = 62.
import { Img, rgba } from './png.mjs';

const F = 64;
const PAL = {
  '#': '#1a1220', h: '#6b4a3a', p: '#3e2a2a', v: '#8f6a55', S: '#f3c9a8', s: '#d9a07e', r: '#a8665a',
  E: '#3b2a22', e: '#fff6e8', P: '#5e1220', M: '#9c1c2c', k: '#c8404a',
  W: '#f2efe8', w: '#d6d8de', c: '#a9adbb', g: '#767c92', B: '#2a3558', b: '#1c2440', K: '#3a2c2a',
  R: '#b8223a', D: '#7a1426', N: '#1f2a44', T: '#2ec4b6'
};
const PINK = { f2efe8: '#f8dde4', d6d8de: '#eab9c6', a9adbb: '#c98c9f', '767c92': '#93596c' };

// ---- mặt trước / lưng: nửa trái 10 cột (lật thành 20), hàng 0–27; chân riêng
const FRONT = [
  '......#...', '.....#h#.#', '...#.#hh#h', '..#h#hhhhh', '..#phhhhhh', '.#phhhvhhh', '.#phhvhhhh', '#phhhhhhhh',
  '#phhphhhph', '#pphShphhS', '#pphSShSSS', '.#pSS##SSS', '.#pSS#ESSS', '.#qSSeESSS', '..#sSSSSSS', '...#ssSSSr',
  '..#PMMMMMM', '..#PPMMkMP', '.#s#wwRwww', '.#s#wwRwwW', '#sS#cwRwwW', '#sS#cwRwww', '#ss#cwDwww', '#rs#ggcccc',
  '.##.#BBBBB', '....#BBBBB', '....#bBBbB', '....#bBBBB'
].map(r => r.replace(/q/g, 'p'));
const BACK = [
  '......#...', '.....#h#.#', '...#.#hh#h', '..#h#hhhhh', '..#phhhhhh', '.#phhhhvhh', '.#phhhvhhh', '#phhhhhhhh',
  '#phhhhhhhh', '#pphhhhhhh', '#pphhhhhhh', '.#pphhhhhh', '.#pphhhhph', '.#ppphphpp', '..#pppppph', '...#rsssss',
  '..#PMMMMMM', '..#PPMMMMM', '.#s#wwwwww', '.#s#wwwwww', '#sS#cwwwww', '#sS#cwwwww', '#ss#cwwwww', '#rs#ggcccc',
  '.##.#BBBBB', '....#BBBBB', '....#bBBbB', '....#bBBBB'
];
const LEG = ['#BB#.', '#BB#.', '#BB#.', '#BB#.', '#Bb#.', '#Bb#.', '#bb#.', '#KKK#', '#KKK#', '#####']; // hàng 27–36
const PACK = ['.NNNNNNNNNN.', 'NRRRRRRRRRRN', 'NRRRRWWRRRRN', 'NRRRWWWWRRRN', 'NRRRWWWWRRRN', 'NRRRRWWRRRRN', 'NDDDDDDDDDDN', '.NNNNNNNNNN.'];
const STEPS = [[1, 0, 0], [2, 0, -1], [1, 0, 0], [0, 0, 0], [0, 1, 0], [0, 2, -1], [0, 1, 0], [0, 0, 0]]; // nhấc trái, nhấc phải, nhún

// ---- nhìn ngang (quay phải): đầu + thân 24 cột, hàng 0–26; tay, chân, khăn vẽ theo bước
const SIDE = [
  '...........#............', '.......#..#h#...........', '......#h##hh#.#.........', '.....#hhhhhhh#h#........',
  '....#phhhhvvhhhh#.......', '...#phhhhvvhhhhhh#......', '...#phhhhhhhhhhhhh#.....', '..#pphhhhhhhhhhphhh#....',
  '..#pphhhhhhhhphShph#....', '..#pphhhhhhhpSSSShh#....', '..#ppphhhhhpSSS##SS#....', '...#pphhhhsSSSS#ESS#....',
  '...#ppphhhrsSSSeES#.....', '....#pppp#rsSSSSSS#.....', '.....#pp#.#sSSSSr#......', '......##...#rsss##.......',
  '.........#PMMMMk#.......', '........#PPMMMMMP#......', '....NNNN#wwwwwwW#........', '...NRRRN#wwwwwWW#........',
  '...NRWRN#cwwwwWW#........', '...NRRRN#cwwwwWW#........', '...NRRRN#cwwwwwW#........', '...NDDDN#ccwwwww#........',
  '....NNN.#gggcccc#........', '........#BBBBBBB#........', '........#bBBBBBb#........'
].map(r => r.slice(0, 24));
const ARM = ['#ww#', '#ww#', '#cw#', '#ss#', '#ss#', '#Ss#', '.##.']; // từ vai (hàng 18) xuống
// bước đi ngang: [vung chân gần, nhấc chân gần, nhấc chân xa, nhún]
const SIDE_STEPS = [[3, 0, 0, 0], [2, 0, 1, -1], [0, 0, 2, -1], [-2, 0, 1, 0], [-3, 0, 0, 0], [-2, 1, 0, -1], [0, 2, 0, -1], [2, 1, 0, 0]];

const mirror = half => half.map(r => r + [...r].reverse().join(''));
function paint(img, x0, y0, rows, under = false) {
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '.' || ch === ' ') return;
    if (under && img.get(x0 + i, y0 + j)[3]) return;
    img.set(x0 + i, y0 + j, PAL[ch]);
  }));
}
const dot = (img, x, y, ch, under = false) => paint(img, x, y, [ch], under);

/** Mặt trước (back = false) hoặc lưng; step = null là đứng. */
function drawFacing(img, fx, fy, back, step, female) {
  const [la, ra, bob] = step == null ? [0, 0, 0] : STEPS[step];
  const x = fx + 22, y = fy + 26;
  paint(img, x + 4, y + 27 - la, LEG);
  paint(img, x + 11, y + 27 - ra, LEG.map(r => [...r].reverse().join('')));
  const top = y + bob;
  paint(img, x, top, mirror(back ? BACK : FRONT));
  dot(img, x + 9, top + 28, '##');
  const sway = step == null ? 0 : step < 4 ? 1 : -1;
  if (!back) {
    for (const [dx, dy] of [[8, 18], [9, 19], [11, 18], [10, 19]]) dot(img, x + dx, top + dy, 'T');
    paint(img, x + 9, top + 20, ['WW', 'WW', 'cc']);
    const right = sway >= 0;
    paint(img, right ? x + 17 : x - 1, top + 16, right ? ['##.', 'PM#', '#P#', '.#.'] : ['.##', '#MP', '#P#', '.#.'], true);
    if (female) for (let r = 9; r <= 16; r++) {
      const lock = r === 16 ? '##' : r < 13 ? '#h' : '#p';
      dot(img, x, top + r, lock); dot(img, x + 18, top + r, [...lock].reverse().join(''));
    }
  } else {
    paint(img, x + 4, top + 17, PACK);
    const c = x + 12 + sway;
    for (let r = 0; r < 5; r++) paint(img, c, top + 15 + r, ['#' + (r % 2 ? 'P' : 'M') + '#']);
    dot(img, c + 1, top + 20, '#');
    if (female) { dot(img, x + 9, top + 12, 'RR'); for (let r = 13; r <= 19; r++) dot(img, x + 8, top + r, '#hp#'); dot(img, x + 9, top + 20, '##'); }
  }
}

/** Một chân nhìn ngang: hông ở (hx, 27), vung swing điểm ảnh, nhấc lift hàng. near = chân gần (màu sáng). */
function sideLeg(img, hx, y, swing, lift, near) {
  const L = 7, fill = near ? 'BB' : 'bb';
  let fx = hx;
  for (let k = 0; k <= L; k++) {
    fx = hx + Math.round(swing * k / L);
    paint(img, fx, y + 27 + Math.round(k * (L - lift) / L), ['#' + fill + '#']);
  }
  const fy = y + 27 + (L - lift) + 1;
  paint(img, fx, fy, ['#KKKK#', '######']);
}

/** Khăn bay sau gáy: dải 2 điểm ảnh từ (x0, y0) sang trái, gợn theo phase. */
function scarfTail(img, x0, y0, phase, hang) {
  for (let j = 0; j < 10; j++) {
    const px = x0 - j, py = y0 + Math.round(hang * j + 1.4 * Math.sin(j * 0.7 - phase) * (j / 9));
    for (const [dy, ch] of [[-1, '#'], [0, j % 3 ? 'M' : 'k'], [1, 'P'], [2, '#']]) dot(img, px, py + dy, ch, ch === '#');
  }
  dot(img, x0 - 10, y0 + Math.round(hang * 10), '#', true);
}

/** Nhìn ngang quay phải; step = null là đứng. */
function drawSide(img, fx, fy, step, female) {
  const [sw, nl, fl, bob] = step == null ? [0, 0, 0, 0] : SIDE_STEPS[step];
  const x = fx + 20, y = fy + 26;
  sideLeg(img, x + 10, y, -sw, fl, false); // chân xa
  const top = y + bob;
  scarfTail(img, x + 9, top + 17, step == null ? 0 : step * 0.8, step == null ? 0.7 : 0.15);
  paint(img, x, top, SIDE);
  sideLeg(img, x + 11, y, sw, nl, true); // chân gần
  paint(img, x + 8, top + 25, ['#BBBBBBB#']);
  // tay gần vung ngược chân gần
  const aw = step == null ? 0 : -Math.round(sw * 0.7);
  ARM.forEach((row, k) => paint(img, x + 11 + Math.round(aw * k / 6), top + 18 + k, [row]));
  // thẻ sinh viên trước ngực
  dot(img, x + 15, top + 18, 'T'); paint(img, x + 14, top + 19, ['W', 'c']);
  if (female) paint(img, x, top + 6, ['.R#', '#hh#', '#hp#', '.#hp#', '..#p#', '...##'], true);
}

/** Sheet 576x384 cho 'hero_m' | 'hero_f'. */
export function buildHero(id) {
  const female = id === 'hero_f';
  const img = new Img(9 * F, 6 * F);
  for (let col = 0; col < 9; col++) {
    const step = col === 0 ? null : col - 1;
    drawFacing(img, col * F, 0, false, step, female);
    drawFacing(img, col * F, 3 * F, true, step, female);
    drawSide(img, col * F, 2 * F, step, female);
    for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) img.set(col * F + F - 1 - x, F + y, img.get(col * F + x, 2 * F + y));
  }
  // khung ngồi (người chơi không ngồi): chép khung đứng
  [[0, 0, 0, 4], [0, 2, 1, 4], [0, 1, 2, 4], [0, 3, 0, 5]].forEach(([sc, sr, dc, dr]) => img.blit(img, sc * F, sr * F, F, F, dc * F, dr * F));
  if (female) for (let i = 0; i < img.px.length; i += 4) {
    const hex = [img.px[i], img.px[i + 1], img.px[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('');
    const to = img.px[i + 3] && PINK[hex];
    if (to) { const [r, g, b] = rgba(to); img.px[i] = r; img.px[i + 1] = g; img.px[i + 2] = b; }
  }
  return img;
}
