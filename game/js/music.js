// Nhạc nền noir / bí ẩn của Kevin MacLeod (incompetech.com, CC BY 4.0, ghi công ở sources.json → music) đổi theo mốc:
// màn chính, Báo Thanh Niên, phố, tòa soạn Tin Vịnh, quán cà phê, Phòng xác minh, boss, kết thúc.
// Phát bằng thẻ <audio> (tải dần), chuyển bài bằng giảm/tăng âm lượng.
import { state } from './state.js';

const VOLUME = 0.35;
const FADE_MS = 700;

let current = null;      // { key, audio }
let wanted = null;       // bài cần phát khi được phép
let unlocked = false;    // trình duyệt chỉ cho phát sau thao tác đầu tiên của người chơi

/** Trình duyệt có phát được MP3 không. */
export const musicSupported = (() => {
  try { return new Audio().canPlayType('audio/mpeg') !== ''; } catch { return false; }
})();

const enabled = () => musicSupported && state.settings.music !== false;

/** Tăng / giảm âm lượng một thẻ audio tới mức đích, rồi gọi done. */
function fade(audio, to, done) {
  const from = audio.volume;
  const steps = 14;
  let i = 0;
  const timer = setInterval(() => {
    i++;
    audio.volume = Math.max(0, Math.min(1, from + (to - from) * (i / steps)));
    if (i >= steps) { clearInterval(timer); done?.(); }
  }, FADE_MS / steps);
}

/** Dừng bài đang phát (giảm dần). */
function stopCurrent() {
  if (!current) return;
  const { audio } = current;
  current = null;
  fade(audio, 0, () => { audio.pause(); audio.src = ''; });
}

/** Phát bài theo khóa (title | office | street | archive | cafe | agency | boss | ending). */
export function playMusic(key) {
  wanted = key;
  if (!unlocked || !enabled() || !key) return;
  if (current?.key === key) return;
  stopCurrent();
  const audio = new Audio(`assets/audio/${key}.mp3`);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0;
  current = { key, audio };
  audio.play().then(() => fade(audio, ducked ? VOLUME * 0.4 : VOLUME)).catch(() => { /* bị chặn hoặc lỗi tải: im lặng */ });
}

let ducked = false;

/** Hạ nhỏ nhạc khi đang hội thoại để nghe rõ giọng / hiệu ứng; trả lại khi xong. */
export function duckMusic(on) {
  if (ducked === on) return;
  ducked = on;
  if (current) fade(current.audio, on ? VOLUME * 0.4 : VOLUME);
}

/** Gọi ở thao tác đầu tiên của người chơi để được phép phát nhạc. */
export function unlockMusic() {
  if (unlocked) return;
  unlocked = true;
  playMusic(wanted);
}

/** Áp dụng lại cài đặt bật / tắt nhạc. */
export function refreshMusic() {
  if (!enabled()) stopCurrent();
  else playMusic(wanted);
}
