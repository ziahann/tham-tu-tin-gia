// Tải dữ liệu JSON và tra cứu chữ giao diện.

export const data = { ui: null, quests: null, npcs: null, sources: null };

/** Tải toàn bộ file dữ liệu; ném lỗi nếu file nào không đọc được. */
export async function loadAll() {
  const files = { ui: 'data/ui.json', quests: 'data/quests.json', npcs: 'data/npc_dialogues.json', sources: 'data/sources.json' };
  await Promise.all(Object.entries(files).map(async ([key, url]) => {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    data[key] = await res.json();
  }));
  return data;
}

/** Thay {tên} trong chuỗi bằng giá trị tương ứng. */
export function fill(str, vars = {}) {
  return String(str).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

/** Lấy chữ giao diện theo đường dẫn "S0.start"; trả về chính đường dẫn nếu thiếu. */
export function t(path, vars) {
  const val = path.split('.').reduce((o, k) => (o == null ? o : o[k]), data.ui);
  return val == null ? path : fill(val, vars);
}

/** Tìm nhiệm vụ theo id. */
export const questById = id => data.quests.quests.find(q => q.id === id);

/** Tìm thẻ evidence theo id. */
export const evidenceById = id => (data.quests.evidence || []).find(e => e.id === id);

/** Tìm nguồn theo id. */
export const sourceById = id => data.sources.sources.find(s => s.id === id);

/** Tìm NPC theo id. */
export const npcById = id => data.npcs.npcs.find(n => n.id === id);

/** Tìm cảnh hội thoại theo id. */
export const sceneById = id => (data.npcs.scenes || []).find(s => s.id === id);

/** Nguồn được hiển thị trong game (bỏ tài liệu nội bộ `internal`, ví dụ báo cáo của nhóm). */
export const visibleSources = (ids = []) => ids.map(sourceById).filter(s => s && !s.internal);

/** Dòng trích nguồn ngắn ("Thu Thảo (2025); ..."); rỗng nếu không có nguồn hiển thị. */
export const citeLine = ids => visibleSources(ids).map(shortCite).join('; ');

/** Trích ngắn tác giả + năm từ chuỗi APA, ví dụ "Thu Thảo (2025)". */
export function shortCite(src) {
  if (src.short) return src.short;
  const m = src.apa.match(/^(.+?)\.\s*\((\d{4}|n\.d\.)/);
  return m ? `${m[1].replace(/,? &/, ' &')} (${m[2]})` : src.outlet;
}
