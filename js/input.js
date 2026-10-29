// Bàn phím + phím ảo: hướng đi đang giữ và các sự kiện hành động (E/Space/Enter, B, J, Esc).

const held = new Set();
const touchHeld = new Set();
const listeners = {};

const KEY_DIR = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right'
};

/** Đăng ký hàm nghe sự kiện: action | backpack | cases | escape. */
export function on(name, fn) {
  (listeners[name] ||= []).push(fn);
}

/** Phát sự kiện tới các hàm nghe. */
export function emit(name) {
  (listeners[name] || []).forEach(fn => fn());
}

/** Người chơi đang gõ chữ hoặc đang dùng nút gốc của trình duyệt. */
const isFormTarget = t => t instanceof HTMLElement && (t.matches('input, textarea, select, button, a') || t.isContentEditable);

/** Hướng di chuyển hiện tại {x, y} trong khoảng -1..1. */
export function direction() {
  const has = d => held.has(d) || touchHeld.has(d);
  return { x: (has('right') ? 1 : 0) - (has('left') ? 1 : 0), y: (has('down') ? 1 : 0) - (has('up') ? 1 : 0) };
}

/** Bỏ mọi phím đang giữ (khi mở hội thoại, đổi tab...). */
export function releaseAll() {
  held.clear();
  touchHeld.clear();
}

/** Gắn sự kiện bàn phím và phím ảo. */
export function initInput() {
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') { emit('escape'); return; }
    if (isFormTarget(e.target)) return;
    const d = KEY_DIR[e.code];
    if (d) { held.add(d); e.preventDefault(); return; }
    if (e.repeat) return;
    if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); emit('action'); }
    else if (e.code === 'KeyB') { emit('backpack'); }
    else if (e.code === 'KeyJ') { emit('cases'); }
  });
  window.addEventListener('keyup', e => {
    const d = KEY_DIR[e.code];
    if (d) held.delete(d);
  });
  window.addEventListener('blur', releaseAll);

  const touch = document.getElementById('touch');
  if (window.matchMedia('(pointer: coarse)').matches) touch.hidden = false;
  touch.querySelectorAll('[data-dir]').forEach(btn => {
    const d = btn.dataset.dir;
    const down = e => { e.preventDefault(); touchHeld.add(d); };
    const up = e => { e.preventDefault(); touchHeld.delete(d); };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('pointerleave', up);
  });
  document.getElementById('touch-a').addEventListener('pointerdown', e => { e.preventDefault(); emit('action'); });
}
