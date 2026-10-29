// Cản trở người chơi: độ tin cậy theo từng hồ sơ, áp lực hạn chót, chế độ thử thách (Đầy đủ / Nhẹ).
// Độ tin cậy chỉ để chơi: về 0 thì hồ sơ đó làm lại từ bước đầu; hồ sơ khác không ảnh hưởng.
import { data, questById } from './data.js';
import { state, saveProgress, hasFlag } from './state.js';

export const CRED_MAX = 100;
export const PENALTY = { wrong: 15, partial: 5, rumor: 10, decoy: 15, publish: 25 };
const FILL_MS = 150000; // đi lại liên tục 2,5 phút khi đang làm hồ sơ thì thanh hạn chót đầy

/** Chế độ Nhẹ: không hạn chót, kẻ tung tin không đuổi, không mất độ tin cậy. */
export const isLight = () => state.settings.challenge === 'light';

export const roomName = id => data.quests.rooms.find(r => r.id === id)?.name || id;

/** Hồ sơ còn đang làm (không phải Phòng họp, chưa khép). */
export const caseOpen = room => !!room && data.quests.rooms.some(r => r.id === room && !r.boss) && !hasFlag(`done_${room}`);

export const credOf = room => state.progress?.cred?.[room] ?? CRED_MAX;

/**
 * Trừ độ tin cậy của một hồ sơ. Trả về null (không áp dụng: chế độ Nhẹ, hồ sơ đã khép),
 * 'lost' (bị trừ) hoặc 'reset' (về 0, hồ sơ đã được đặt lại từ đầu).
 */
export function loseCred(room, n) {
  if (!state.progress || isLight() || !caseOpen(room)) return null;
  const cred = (state.progress.cred ||= {});
  cred[room] = Math.max(0, credOf(room) - n);
  if (cred[room] > 0) { saveProgress(); return 'lost'; }
  resetCase(room);
  return 'reset';
}

/** Đặt lại một hồ sơ: xóa tiến độ các nhiệm vụ của phòng, độ tin cậy về đầy, hạn chót về 0. */
export function resetCase(room) {
  const r = data.quests.rooms.find(x => x.id === room);
  for (const id of r?.quests || []) {
    delete state.progress.questProgress[id];
    state.progress.flags = state.progress.flags.filter(f => f !== `intro_${id}`);
  }
  // đang theo dõi một nhiệm vụ sau của hồ sơ này thì quay về nhiệm vụ đầu
  if (questById(state.progress.tracked)?.room === room) state.progress.tracked = r.quests[0];
  state.progress.cred[room] = CRED_MAX;
  state.progress.pressure = 0;
  saveProgress();
}

export const pressure = () => state.progress?.pressure || 0;

/** Tăng thanh hạn chót theo thời gian đi lại; trả về true khi vừa đầy. */
export function tickPressure(delta, room) {
  if (!state.progress || isLight() || !caseOpen(room)) return false;
  const before = pressure();
  state.progress.pressure = Math.min(100, before + (delta / FILL_MS) * 100);
  return before < 100 && state.progress.pressure >= 100;
}

/** Giảm áp lực (trả lời đúng một bước, từ chối đăng vội). */
export function easePressure(n) {
  if (state.progress) state.progress.pressure = Math.max(0, pressure() - n);
}
