// Chấm đáp án, tính điểm, trạng thái mở khóa của nhiệm vụ và phòng.
import { data, questById } from './data.js';
import { state, isQuestDone, hasFlag } from './state.js';
import { normalize, containsPhrase, levenshtein } from './text.js';

// Kiểu chơi đã dựng trong hội thoại. Phòng có kiểu khác hiện "Đang xây dựng".
export const SUPPORTED_MODES = new Set(['G1', 'G2']);

/** Nhiệm vụ đã dựng được trong hội thoại chưa (kiểu chơi cũ G1/G2, hoặc dạng nhiều bước). */
export const isPlayable = q => !!q && (Array.isArray(q.steps) || (SUPPORTED_MODES.has(q.mode) && !q.options));

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

/**
 * Nhiệm vụ đã mở chưa. Thế giới mở: nhiệm vụ đầu của mỗi hồ sơ (phòng) mở ngay;
 * nhiệm vụ sau trong cùng hồ sơ mở khi nhiệm vụ trước nó (theo unlocks) đã xong.
 */
export function isUnlocked(q) {
  if (q.unlockFlags) return q.unlockFlags.every(hasFlag);
  const prev = data.quests.quests.filter(o => o.room === q.room && (o.unlocks || []).includes(q.id));
  return !prev.length || prev.some(o => isQuestDone(o.id));
}

/** Nhiệm vụ đang mở tiếp theo của một hồ sơ (phòng), hoặc null. */
export function nextQuestIn(roomId) {
  const room = data.quests.rooms.find(r => r.id === roomId);
  return (room?.quests || []).map(questById).find(q => q && !isQuestDone(q.id) && isUnlocked(q) && isPlayable(q)) || null;
}

/** Trạng thái phòng: done | open | locked | building. flags: cờ hiện có (dùng cho phòng Boss). */
export function roomStatus(roomId, flags = []) {
  const room = data.quests.rooms.find(r => r.id === roomId);
  if (!room) return 'building';
  if (room.boss) return bossStatus(flags);
  const quests = room.quests.map(questById);
  if (quests.some(q => !isPlayable(q))) return 'building';
  if (quests.filter(q => q.required !== false).every(q => isQuestDone(q.id))) return 'done';
  return quests.some(isUnlocked) ? 'open' : 'locked';
}

/** Trạng thái một nhiệm vụ để hiển thị: done | active | locked | building. */
export function questStatus(q) {
  if (!isPlayable(q) || (roomStatus(q.room) === 'building' && data.quests.rooms.some(r => r.id === q.room))) return 'building';
  if (isQuestDone(q.id)) return 'done';
  return isUnlocked(q) ? 'active' : 'locked';
}

/** Phòng Boss: mở khi xong mọi nhiệm vụ bắt buộc và đủ số thẻ evidence; done khi đã thắng. */
export function bossStatus(flags = []) {
  if (flags.includes('boss_done')) return 'done';
  const req = data.quests.boss.requires;
  const cards = (state.progress?.evidenceCards || []).filter(id => !data.quests.boss.guessCards.includes(id));
  const ready = req.requiredQuests.every(isQuestDone) && cards.length >= req.minCards;
  return ready ? 'open' : 'locked';
}
