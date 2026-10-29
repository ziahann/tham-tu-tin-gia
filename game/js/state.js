// Trạng thái lượt chơi, điểm, thẻ evidence và cài đặt; lưu bằng localStorage.

const PROGRESS_KEY = 'tfd_progress';
const SETTINGS_KEY = 'tfd_settings';
const SCHEMA = 2;

const defaultSettings = () => ({
  hideSensitiveImages: true,
  muted: false,
  music: true,
  ambience: true,
  reduceMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
});

export const state = {
  progress: null,
  settings: defaultSettings(),
  lostSave: false
};

/** Đọc JSON từ localStorage; trả về null nếu thiếu hoặc lỗi. */
function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return undefined; // undefined = có dữ liệu nhưng hỏng
  }
}

/** Ghi JSON vào localStorage, bỏ qua lỗi (chế độ riêng tư, hết dung lượng). */
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* không lưu được thì vẫn chơi tiếp */ }
}

/** Tạo mã lượt chơi theo thời gian + chuỗi ngẫu nhiên. */
export function newRunId() {
  return `${new Date().toISOString()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Tạo tiến trình rỗng cho một lượt mới. */
function freshProgress(heroName, heroLook = 'm') {
  return {
    schema: SCHEMA,
    runId: newRunId(),
    startedAt: new Date().toISOString(),
    heroName,
    heroLook,
    screen: 'S1',
    room: null,
    flags: [],
    questProgress: {},
    evidenceCards: [],
    sourcesOpened: [],
    pos: null,
    tracked: null,
    score: 0
  };
}

/** Nạp tiến trình và cài đặt khi mở game. */
export function loadState() {
  const p = readJson(PROGRESS_KEY);
  // Bản lưu cũ (schema 1, chơi theo chuỗi): giữ tiến độ, bản đồ mới nên đặt lại vị trí.
  if (p?.schema === 1) Object.assign(p, { schema: SCHEMA, pos: null, tracked: null });
  if (p === undefined || (p && p.schema !== SCHEMA)) {
    state.lostSave = true;
    state.progress = null;
  } else {
    state.progress = p;
  }
  const s = readJson(SETTINGS_KEY);
  if (s) state.settings = { ...defaultSettings(), ...s };
}

/** Lưu tiến trình hiện tại. */
export function saveProgress() {
  if (state.progress) writeJson(PROGRESS_KEY, state.progress);
}

/** Lưu cài đặt. */
export function saveSettings() {
  writeJson(SETTINGS_KEY, state.settings);
}

/** Bắt đầu lượt mới (xóa tiến trình cũ, giữ cài đặt). */
export function startNewProgress(heroName, heroLook) {
  state.progress = freshProgress(heroName, heroLook);
  saveProgress();
  return state.progress;
}

/** Xóa toàn bộ dữ liệu game trên trình duyệt này. */
export function clearAllStorage() {
  try {
    Object.keys(localStorage).filter(k => k.startsWith('tfd_')).forEach(k => localStorage.removeItem(k));
  } catch { /* bỏ qua */ }
  state.progress = null;
  state.settings = defaultSettings();
}

/** Lấy (hoặc tạo) bản ghi tiến độ của một nhiệm vụ. */
export function questState(id) {
  const qp = state.progress.questProgress;
  if (!qp[id]) qp[id] = { status: 'new', hints: 0, fails: 0, answers: {} };
  return qp[id];
}

export const isQuestDone = id => state.progress?.questProgress[id]?.status === 'done';

/** Bật cờ hành vi người chơi. */
export function setFlag(flag) {
  if (!state.progress.flags.includes(flag)) state.progress.flags.push(flag);
}

export const hasFlag = flag => !!state.progress?.flags.includes(flag);

/** Thêm thẻ evidence; trả về true nếu là thẻ mới. */
export function addEvidence(id) {
  if (state.progress.evidenceCards.includes(id)) return false;
  state.progress.evidenceCards.push(id);
  return true;
}

/** Ghi nhận người chơi đã mở một nguồn. */
export function markSourceOpened(id) {
  if (!state.progress.sourcesOpened.includes(id)) state.progress.sourcesOpened.push(id);
  saveProgress();
}
