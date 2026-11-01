// Lịch sử trò chuyện (localStorage: tfd_chat_log), lưu vài lượt chơi gần nhất, chia theo NPC.
import { state } from './state.js';

const LOG_KEY = 'tfd_chat_log';
// Chỉ giữ vài lượt gần nhất: lịch sử dùng chung 5 MB localStorage với tiến trình, đầy thì không lưu được tiến trình.
const KEEP_RUNS = 5;

/** Đọc toàn bộ lịch sử. */
export function readLog() {
  try {
    const log = JSON.parse(localStorage.getItem(LOG_KEY));
    if (log && log.schema === 1 && Array.isArray(log.runs)) return log;
  } catch { /* hỏng thì tạo mới */ }
  return { schema: 1, runs: [] };
}

/** Ghi lịch sử; hết dung lượng thì bỏ dần lượt cũ rồi ghi lại. */
function writeLog(log) {
  for (;;) {
    try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); return; } catch { /* hết chỗ */ }
    if (log.runs.length <= 1) return;
    log.runs.shift();
  }
}

/** Thêm một câu thoại vào lượt chơi hiện tại. msg: { npc (người cùng trò chuyện), from, text, ...id }. */
export function appendMessage(msg) {
  const p = state.progress;
  if (!p) return;
  const log = readLog();
  let run = log.runs.find(r => r.runId === p.runId);
  if (!run) {
    run = { runId: p.runId, startedAt: p.startedAt, heroName: p.heroName, messages: [] };
    log.runs.push(run);
    log.runs = log.runs.slice(-KEEP_RUNS);
  }
  run.messages.push({ t: new Date().toISOString(), ...msg });
  writeLog(log);
}

/** Các câu thoại của lượt hiện tại, nhóm theo NPC: { npcId: [msg...] }. */
export function currentRunByNpc() {
  const run = readLog().runs.find(r => r.runId === state.progress?.runId);
  const groups = {};
  run?.messages.forEach(m => { (groups[m.npc] ||= []).push(m); });
  return groups;
}

/** Tải toàn bộ lịch sử về máy dạng JSON. */
export function exportLog() {
  const blob = new Blob([JSON.stringify(readLog(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `tham-tu-tin-gia-lich-su-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
