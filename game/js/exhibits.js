// Tư liệu hiển thị trong khung thoại: lưới ảnh MÔ PHỎNG (khối hình trừu tượng, không có người),
// bản ghi kết quả công cụ (Google Lens, Hive) theo báo cáo, và nút mở nguồn.
import { data, t, sourceById, shortCite } from './data.js';
import { reader } from './tools.js';

const FW = 64, FH = 48; // cỡ một khung mô phỏng (pixel gốc)

/** Tạo phần tử với class và chữ. */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/** Vẽ một khung mô phỏng trừu tượng theo mô tả trong quests.json → exhibits. */
export function drawFrame(canvas, f) {
  canvas.width = FW;
  canvas.height = FH;
  const c = canvas.getContext('2d');
  const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const dark = f.kind === 'storm';
  // nền trời + biển
  R(0, 0, FW, 30, dark ? '#4a5068' : '#a9c4dc');
  R(0, 6, FW, 6, dark ? '#565d78' : '#bcd3e6');
  R(0, 30, FW, 18, dark ? '#2b3a55' : '#3f7899');
  for (let x = (f.n * 7) % 9; x < FW; x += 9) R(x, 34 + (x % 3) * 4, 5, 1, dark ? '#3d4d6b' : '#6aa3c2');
  R(6 + f.n * 3 % 30, 8, 14, 4, dark ? '#6b7290' : '#ffffff');

  switch (f.kind) {
    case 'boat': {
      const hulls = {
        A: () => { R(14, 28, 36, 4, '#e6e6e6'); R(16, 32, 32, 2, '#9aa3b0'); R(26, 22, 12, 6, '#f4f4f4'); },
        B: () => { R(18, 26, 28, 6, '#e6e6e6'); R(20, 32, 24, 2, '#9aa3b0'); R(22, 18, 20, 8, '#f4f4f4'); R(26, 12, 12, 6, '#dcdcdc'); },
        C: () => { R(20, 29, 22, 3, '#e6e6e6'); R(18, 27, 26, 2, '#e6e6e6'); R(23, 32, 16, 2, '#9aa3b0'); R(27, 23, 8, 4, '#f4f4f4'); },
        D: () => { R(16, 28, 30, 4, '#e6e6e6'); R(46, 26, 6, 4, '#e6e6e6'); R(18, 32, 26, 2, '#9aa3b0'); R(24, 16, 2, 12, '#7a7a7a'); R(26, 16, 8, 6, '#f4eedc'); }
      };
      (hulls[f.hull] || hulls.A)();
      if (f.buoy) { R(8, 33, 4, 4, f.buoy === 'red' ? '#c8323c' : '#f2d36b'); R(9, 32, 2, 1, '#ffffff'); }
      break;
    }
    case 'karst':
      R(8, 14, 10, 18, '#4f6b5a'); R(10, 10, 6, 4, '#4f6b5a'); R(40, 16, 14, 16, '#5c7a66'); R(43, 12, 8, 4, '#5c7a66');
      break;
    case 'shirt':
      R(0, 0, FW, FH, '#b7aa95');
      R(18, 10, 28, 30, '#3d7fd1'); R(10, 10, 8, 10, '#3d7fd1'); R(46, 10, 8, 10, '#3d7fd1'); R(28, 10, 8, 3, '#b7aa95');
      // chữ méo, không đọc được
      [[22, 20, 3], [26, 19, 2], [29, 21, 4], [34, 19, 2], [37, 20, 3], [23, 25, 4], [28, 26, 2], [32, 24, 5], [38, 26, 2]]
        .forEach(([x, y, w]) => R(x, y, w, 2, '#f4eedc'));
      R(25, 23, 1, 3, '#f4eedc'); R(35, 22, 1, 4, '#f4eedc');
      break;
    case 'vest': {
      const col = f.tone === 'red' ? '#c8323c' : '#e8902f';
      R(0, 0, FW, FH, '#8fa6ba');
      R(12, 14, 18, 24, col); R(18, 14, 6, 6, '#8fa6ba'); R(14, 24, 14, 2, '#ffffff');
      R(36, 22, 12, 16, col); R(40, 22, 4, 4, '#8fa6ba'); R(37, 30, 10, 2, '#ffffff');
      break;
    }
    default:
      break;
  }
}

/** Mô tả bằng chữ của một khung (cho trình đọc màn hình). */
function frameDesc(f) {
  if (f.blur) return t('exhibit.desc.blur');
  const tone = f.tone ? t(`exhibit.tone.${f.tone}`) : '';
  return t(`exhibit.desc.${f.kind}`, { hull: f.hull || '', tone });
}

/**
 * Lưới ảnh mô phỏng. opts.onPick(n): bấm ô; opts.marked: Set các ô đã đánh dấu; opts.highlight: số ô làm nổi.
 * Trả về phần tử lưới.
 */
export function frameGrid(setKey, opts = {}) {
  const set = data.quests.exhibits[setKey];
  const wrap = el('figure', 'exhibit');
  wrap.append(el('figcaption', null, `${set.title} · ${t('exhibit.fakeTag')}`));
  const grid = el('div', 'frame-grid');
  grid.style.setProperty('--cols', set.cols);
  for (const f of set.frames) {
    const cell = el(opts.onPick ? 'button' : 'div', 'frame');
    if (opts.onPick) cell.type = 'button';
    const cv = el('canvas');
    drawFrame(cv, f);
    if (f.blur) cv.classList.add('is-blur');
    const label = t(setKey === 'mco9' ? 'exhibit.cell' : 'exhibit.frame', { n: f.n });
    cell.setAttribute('aria-label', t('exhibit.frameAlt', { n: f.n, desc: frameDesc(f) }));
    cell.append(cv, el('span', 'frame-n', label), el('span', 'tag frame-fake', t('exhibit.fakeTag')));
    if (opts.highlight === f.n) cell.classList.add('is-highlight');
    if (opts.onPick) {
      const sync = () => {
        const on = opts.marked?.has(f.n);
        cell.classList.toggle('is-marked', !!on);
        cell.setAttribute('aria-pressed', String(!!on));
      };
      sync();
      cell.addEventListener('click', () => { opts.onPick(f.n); sync(); });
    }
    grid.append(cell);
  }
  wrap.append(grid);
  return wrap;
}

/** Một khung đơn lẻ để so sánh (ví dụ khung 11 của M.P.V.). */
export function singleFrame(setKey, n, caption) {
  const f = data.quests.exhibits[setKey].frames.find(x => x.n === n);
  const wrap = el('figure', 'exhibit exhibit-ref');
  const cell = el('div', 'frame is-highlight');
  const cv = el('canvas');
  drawFrame(cv, f);
  cell.setAttribute('role', 'img');
  cell.setAttribute('aria-label', t('exhibit.frameAlt', { n, desc: frameDesc(f) }));
  cell.append(cv, el('span', 'tag frame-fake', t('exhibit.fakeTag')));
  wrap.append(el('figcaption', null, caption), cell);
  return wrap;
}

/** Bảng bản ghi kết quả công cụ (lens | hive). */
export function toolPanel(key) {
  const ex = data.quests.exhibits[key];
  const wrap = el('figure', 'exhibit tool-panel');
  wrap.append(el('figcaption', null, ex.title));
  const table = el('table');
  if (key === 'lens') {
    wrap.append(el('p', 'muted', `${t('exhibit.query')}: ${ex.query}`));
    const head = el('tr');
    head.append(el('th', null, t('exhibit.site')), el('th', null, t('exhibit.kind')));
    table.append(head);
    ex.rows.forEach(r => { const tr = el('tr'); tr.append(el('td', null, r.site), el('td', null, r.kind)); table.append(tr); });
  } else {
    wrap.append(el('p', 'muted', ex.runDate));
    const head = el('tr');
    ex.columns.forEach(c => head.append(el('th', null, c)));
    table.append(head);
    ex.rows.forEach(r => { const tr = el('tr'); r.forEach((c, i) => tr.append(el(i ? 'td' : 'th', null, c))); table.append(tr); });
  }
  wrap.append(table, el('p', null, ex.footer), el('p', 'cite', `${ex.fact} · Nguồn: ${ex.sources.map(s => shortCite(sourceById(s))).join('; ')}`));
  return wrap;
}

/** Nguồn của bước: trình đọc báo trong game (mở / thu gọn), không mở tab mới. */
function sourceRow(ids) {
  const box = el('details', 'source-reader');
  box.append(el('summary', null, t('reader.readInGame')), reader(ids));
  return box;
}

/** Bảng định nghĩa khung Information Disorder. */
function wardlePanel() {
  const ex = data.quests.exhibits.wardle;
  const wrap = el('figure', 'exhibit tool-panel wardle-panel');
  wrap.append(el('figcaption', null, ex.title));
  const table = el('table');
  ex.rows.forEach(([term, def]) => { const tr = el('tr'); tr.append(el('td', null, term), el('td', null, def)); table.append(tr); });
  wrap.append(table, el('p', null, ex.footer), el('p', 'cite', `Nguồn: ${ex.sources.map(s => shortCite(sourceById(s))).join('; ')}`));
  return wrap;
}

/** Trang mạo danh GIẢ LẬP cho màn bonus. */
function fakePage() {
  const ex = data.quests.exhibits.fakepage;
  const wrap = el('figure', 'exhibit fakepage');
  wrap.append(el('span', 'tag', t('simulated')), el('div', 'fp-name', ex.name), el('div', 'fp-meta', ex.meta), el('div', 'fp-post', ex.post), el('p', 'fp-meta', ex.note));
  return wrap;
}

/** Dựng tư liệu cho một bước nhiệm vụ (hoặc null). */
export function exhibitFor(step) {
  const parts = [];
  if (step.exhibit === 'lens' || step.exhibit === 'hive') parts.push(toolPanel(step.exhibit));
  else if (step.exhibit === 'wardle') parts.push(wardlePanel());
  else if (step.exhibit === 'fakepage') parts.push(fakePage());
  else if (step.exhibit && step.type !== 'flaws' && step.type !== 'match') parts.push(frameGrid(step.exhibit));
  if (step.resources) parts.push(sourceRow(step.resources));
  if (!parts.length) return null;
  const box = el('div', 'exhibits');
  box.append(...parts);
  return box;
}
