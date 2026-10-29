// Phòng xác minh: khung cửa sổ công cụ MÔ PHỎNG bọc quanh tư liệu, trình đọc báo trong game, chế độ xem thử.
// Kết quả trong công cụ lấy từ bản ghi của nhóm (quests.json → exhibits) và tóm tắt nguồn đã kiểm tra (sources.json).
import { data, t, sourceById, shortCite, evidenceById } from './data.js';
import { state, saveProgress, markSourceOpened } from './state.js';
import { sfx } from './audio.js';
import { toast } from './ui.js';

export const DEVICES = ['computer', 'magnifier', 'monitor', 'detector', 'archive', 'timeline', 'evidence'];

/** Mã người nói của thiết bị trong khung thoại ("dev_computer"...). */
export const deviceSpeaker = id => `dev_${id}`;

/** Tạo phần tử với class và chữ. */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/** Khung cửa sổ công cụ: thanh tiêu đề, nhãn GIẢ LẬP, hiệu ứng quét ngắn rồi hiện nội dung. */
export function toolWindow(device, body) {
  const win = el('div', `tool-window tool-${device}`);
  const bar = el('div', 'tool-bar');
  bar.append(el('span', 'tool-dots'), el('span', 'tool-title', t(`devices.${device}.app`)));
  const content = el('div', 'tool-body');
  content.append(body);
  win.append(bar, content);
  if (!state.settings.reduceMotion) {
    const scan = el('div', 'tool-scan');
    scan.append(el('span', null, t('devices.scanning')), el('span', 'tool-progress'));
    win.append(scan);
    sfx('scan');
    setTimeout(() => scan.remove(), 650);
  }
  return win;
}

/** Ngày đăng đọc từ chuỗi APA, ví dụ "(2025, ngày 21 tháng 7)" → "21/7/2025". */
function apaDate(apa) {
  const m = apa.match(/\((\d{4}), ngày (\d{1,2}) tháng (\d{1,2})\)/);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : '';
}

/** Tiêu đề bài đọc từ chuỗi APA (phần sau ngày, trước tên báo). */
function apaTitle(src) {
  const m = src.apa.match(/\)\.\s*(.+?)\.\s*[^.]+\.?$/);
  return m ? m[1] : src.apa;
}

/** Các dòng dữ kiện để hiện trong trang báo (bỏ ghi chú nội bộ về báo cáo của nhóm). */
function factLines(src) {
  return (src.verifiedContent || '').split(/;\s+|\.\s+(?=[A-ZĐÂÊÔƠƯÁÀẢÃẠ"“])/)
    .map(s => s.trim().replace(/(?<![A-Z])\.$/, ''))
    .filter(s => s && !/báo cáo/i.test(s));
}

/** Ghi một dòng vào sổ tay (balo → Sổ tay); trả về true nếu là dòng mới. */
function addNote(sourceId, text) {
  const notes = (state.progress.notes ||= []);
  if (notes.some(n => n.source === sourceId && n.text === text)) return false;
  notes.push({ source: sourceId, text });
  saveProgress();
  return true;
}

/**
 * Trình đọc báo trong game: mỗi nguồn một thẻ; trang gồm tên báo, ngày, tiêu đề, tóm tắt đã kiểm tra.
 * Bấm một dòng để ghi vào sổ tay. Không mở tab mới.
 */
export function reader(sourceIds) {
  const ids = sourceIds.filter(id => sourceById(id) && !sourceById(id).internal);
  const wrap = el('div', 'reader');
  const tabs = el('div', 'reader-tabs');
  const page = el('article', 'paper');
  const show = id => {
    const src = sourceById(id);
    tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
    page.innerHTML = '';
    const kind = src.urlStatus === 'tool' ? t('reader.tool') : src.urlStatus === 'missing' ? t('reader.report') : src.outlet;
    page.append(el('div', 'paper-mast', kind));
    const date = apaDate(src.apa);
    page.append(el('div', 'paper-date', [date, shortCite(src)].filter(Boolean).join(' · ')));
    page.append(el('h3', 'paper-title', apaTitle(src)));
    const lines = factLines(src);
    if (lines.length) {
      page.append(el('p', 'paper-note', t('reader.summary', { date: (src.checked || '').split('-').reverse().join('/') })));
      const ul = el('ul', 'paper-facts');
      for (const line of lines) {
        const li = el('li');
        const b = el('button', null, line);
        b.type = 'button';
        const noted = () => (state.progress.notes || []).some(n => n.source === id && n.text === line);
        b.classList.toggle('is-noted', noted());
        b.addEventListener('click', () => {
          if (addNote(id, line)) { sfx('paper'); toast(t('reader.noted')); }
          b.classList.add('is-noted');
        });
        li.append(b);
        ul.append(li);
      }
      page.append(ul, el('p', 'paper-hint', t('reader.note')));
    } else {
      page.append(el('p', 'muted', t('reader.noSummary')));
    }
    page.append(el('p', 'paper-apa', src.apa));
    markSourceOpened(id);
  };
  for (const id of ids) {
    const src = sourceById(id);
    const b = el('button', null, src.urlStatus === 'tool' ? src.outlet : `${src.outlet}${apaDate(src.apa) ? ` · ${apaDate(src.apa)}` : ''}`);
    b.type = 'button';
    b.dataset.id = id;
    b.addEventListener('click', () => { sfx('paper'); show(id); });
    tabs.append(b);
  }
  wrap.append(tabs, page);
  if (ids.length) show(ids[0]);
  return wrap;
}

/** Nội dung xem thử khi không có hồ sơ cần thiết bị (chỉ đọc). exhibitFor: hàm vẽ tư liệu theo khóa. */
export function browseContent(device, exhibitFor) {
  const ex = key => exhibitFor({ exhibit: key });
  switch (device) {
    case 'computer': return ex('lens');
    case 'detector': return ex('hive');
    case 'magnifier': return ex('mpv12');
    case 'monitor': return ex('mco9');
    case 'archive': return reader(data.sources.sources.filter(s => s.verifiedContent).map(s => s.id));
    case 'timeline': return timelineBoard();
    case 'evidence': return evidenceWall();
    default: return el('p', 'muted', t('devices.browse'));
  }
}

/** Bảng dòng thời gian: các nguồn có ngày đăng, xếp theo ngày. */
function timelineBoard() {
  const list = data.sources.sources.filter(s => s.verifiedContent && apaDate(s.apa))
    .map(s => ({ s, d: apaDate(s.apa).split('/').map(Number) }))
    .sort((a, b) => a.d[2] - b.d[2] || a.d[1] - b.d[1] || a.d[0] - b.d[0]);
  const ol = el('ol', 'timeline-board');
  list.forEach(({ s }) => {
    const li = el('li');
    li.append(el('strong', null, apaDate(s.apa)), document.createTextNode(` ${s.outlet}: ${apaTitle(s)}`));
    ol.append(li);
  });
  return ol;
}

/** Tường bằng chứng: các thẻ evidence đã thu thập. */
function evidenceWall() {
  const cork = el('div', 'cork');
  const cards = (state.progress?.evidenceCards || []).map(evidenceById).filter(Boolean);
  if (!cards.length) cork.append(el('p', 'muted', t('backpack.noCards')));
  cards.forEach(ev => {
    const n = el('div', 'note');
    n.append(el('strong', null, ev.title), el('p', null, ev.text));
    cork.append(n);
  });
  return cork;
}
