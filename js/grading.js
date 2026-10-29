// Chấm đáp án, tính điểm, trạng thái mở khóa của nhiệm vụ và phòng.
import { data, questById } from './data.js';
import { isQuestDone } from './state.js';
import { normalize, containsPhrase, levenshtein } from './text.js';

// Kiểu chơi đã dựng trong hội thoại. Phòng có kiểu khác hiện "Đang xây dựng".
export const SUPPORTED_MODES = new Set(['G1', 'G2']);

/** So một câu trả lời với danh sách đáp án: 'right' | 'almost' | 'wrong'. */
export function matchField(value, accepts, fuzzy = true) {
  const norm = normalize(value);
  if (!norm) return 'wrong';
  const accs = accepts.map(normalize);
  if (accs.some(a => containsPhrase(norm, a))) return 'right';
  if (fuzzy && accs.some(a => a.length >= 4 && levenshtein(norm, a) <= (a.length >= 8 ? 2 : 1))) return 'almost';
  return 'wrong';
}

/** Chấm G2 (chọn thẻ): trả về trạng thái, thẻ chọn sai, số thẻ đúng còn thiếu. */
export function checkCards(quest, picked) {
  const correct = quest.cards.filter(c => c.correct).map(c => c.id);
  const right = picked.filter(id => correct.includes(id));
  const wrong = picked.filter(id => !correct.includes(id)).map(id => quest.cards.find(c => c.id === id));
  const missing = correct.length - right.length;
  const status = missing === 0 && wrong.length === 0 ? 'correct' : right.length > 0 ? 'partial' : 'wrong';
  return { status, wrong, missing };
}

/** Điểm khi hoàn thành: trừ theo gợi ý và số lần sai, giới hạn khi xem hướng dẫn. */
export function questPoints(qs) {
  const sc = data.quests.settings.scoring;
  let points = Math.max(sc.minAfterHints, sc.firstTry - sc.hintPenaltyPerLevel * qs.hints - 2 * qs.fails);
  if (qs.walkthrough) points = Math.min(points, sc.partial);
  return points;
}

/** Nhiệm vụ đã mở khóa chưa (nhiệm vụ đầu tiên, hoặc có nhiệm vụ đã xong mở khóa nó). */
export function isUnlocked(q) {
  if (q.order === 1) return true;
  return data.quests.quests.some(o => isQuestDone(o.id) && (o.unlocks || []).includes(q.id));
}

/** Trạng thái phòng: done | open | locked | building. flags: cờ hiện có (so với room.requires). */
export function roomStatus(roomId, flags = []) {
  const room = data.quests.rooms.find(r => r.id === roomId);
  if (!room) return 'building';
  const quests = room.quests.map(questById);
  if (quests.some(q => !q || !SUPPORTED_MODES.has(q.mode))) return 'building';
  if (quests.filter(q => q.required !== false).every(q => isQuestDone(q.id))) return 'done';
  if ((room.requires || []).some(f => !flags.includes(f))) return 'locked';
  return quests.some(isUnlocked) ? 'open' : 'locked';
}

/** Trạng thái một nhiệm vụ để hiển thị: done | active | locked | building. */
export function questStatus(q) {
  if (!SUPPORTED_MODES.has(q.mode) || roomStatus(q.room) === 'building') return 'building';
  if (isQuestDone(q.id)) return 'done';
  return isUnlocked(q) ? 'active' : 'locked';
}
