// Cản trở người chơi: độ tin cậy chung của cả game (0–100, bắt đầu ở 50), áp lực hạn chót, chế độ thử thách (Đầy đủ / Nhẹ).
// Độ tin cậy chỉ để chơi: tăng khi trả lời đúng ngay lần đầu, giảm khi sai; quyết định danh hiệu và số lượt chịu sai ở trận cuối.
import { showTip } from './tips.js';
import { data } from './data.js';
import { state, saveProgress, hasFlag } from './state.js';

export const CRED_MAX = 100;
export const CRED_START = 50;
export const GAIN = { step: 2, quest: 3 }; // đúng ngay lần đầu một ô / bước; khép một nhiệm vụ
export const PENALTY = { wrong: 15, partial: 5, rumor: 10, decoy: 15, publish: 25, hint: 3 };
const FILL_MS = 150000; // đi lại liên tục 2,5 phút khi đang làm hồ sơ thì thanh hạn chót đầy

/** Chế độ Nhẹ: không hạn chót, kẻ tung tin không đuổi, không mất độ tin cậy. */
export const isLight = () => state.settings.challenge === 'light';

export const roomName = id => data.quests.rooms.find(r => r.id === id)?.name || id;

/** Hồ sơ còn đang làm (không phải Phòng họp, chưa khép). */
export const caseOpen = room => !!room && data.quests.rooms.some(r => r.id === room && !r.boss) && !hasFlag(`done_${room}`);

/**
 * Độ tin cậy hiện tại. Lượt cũ còn độ tin cậy theo từng hồ sơ (progress.cred) thì lấy trung bình của chúng.
 */
export function credScore() {
  const p = state.progress;
  if (!p) return CRED_START;
  if (p.trust != null) return p.trust;
  const old = Object.values(p.cred || {});
  return old.length ? Math.round(old.reduce((a, b) => a + b, 0) / old.length) : CRED_START;
}

function setCred(v) {
  state.progress.trust = Math.max(0, Math.min(CRED_MAX, Math.round(v)));
  saveProgress();
}

/** Trừ độ tin cậy; trả về true nếu có trừ (chế độ Nhẹ: không trừ). */
export function loseCred(n) {
  if (!state.progress || isLight()) return false;
  setCred(credScore() - n);
  showTip('cred');
  return true;
}

/** Cộng độ tin cậy (trả lời đúng ngay lần đầu, khép nhiệm vụ). */
export function gainCred(n) {
  if (state.progress) setCred(credScore() + n);
}

/** Thấp thì bị giục nhiều hơn (thanh hạn chót đầy nhanh ×1,5), cao thì thong thả hơn (×0,75); dưới 30 kẻ tung tin phát hiện từ xa hơn. */
export const credPressureRate = () => { const c = credScore(); return c < 30 ? 1.5 : c >= 70 ? 0.75 : 1; };
export const credChaseRate = () => (credScore() < 30 ? 1.3 : 1);

export const pressure = () => state.progress?.pressure || 0;

/** Tăng thanh hạn chót theo thời gian đi lại; trả về true khi vừa đầy. */
export function tickPressure(delta, room) {
  if (!state.progress || isLight() || !caseOpen(room)) return false;
  const before = pressure();
  state.progress.pressure = Math.min(100, before + (delta / FILL_MS) * 100 * credPressureRate());
  return before < 100 && state.progress.pressure >= 100;
}

/** Giảm áp lực (trả lời đúng một bước, từ chối đăng vội). */
export function easePressure(n) {
  if (state.progress) state.progress.pressure = Math.max(0, pressure() - n);
}
