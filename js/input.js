// Bàn phím + phím ảo: hướng đi đang giữ và các sự kiện hành động (E/Space/Enter, B, J, T, Esc).

const held = new Set();
const touchHeld = new Set();
const listeners = {};

const KEY_DIR = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right'
};

/** Đăng ký hàm nghe sự kiện: action | backpack | cases | weather | escape. */
export function on(name, fn) {
  (listeners[name] ||= []).push(fn);
}

/** Phát sự kiện tới các hàm nghe. */
export function emit(name) {
  (listeners[name] || []).forEach(fn => fn());
}

/** Người chơi đang gõ chữ (ô nhập): mọi phím thuộc về ô nhập. */
const isTextTarget = t => t instanceof HTMLElement && (t.matches('input, textarea, select') || t.isContentEditable);
/** Đang focus một nút / link: Space, Enter để trình duyệt bấm nút; phím đi lại và E vẫn điều khiển game. */
const isButtonTarget = t => t instanceof HTMLElement && t.matches('button, a, summary');

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
    if (isTextTarget(e.target)) return;
    const d = KEY_DIR[e.code];
    if (d) { held.add(d); e.preventDefault(); return; }
    if (e.repeat) return;
    const onButton = isButtonTarget(e.target);
    if (e.code === 'KeyE' || (!onButton && (e.code === 'Space' || e.code === 'Enter'))) { e.preventDefault(); emit('action'); }
    else if (e.code === 'KeyB') { emit('backpack'); }
    else if (e.code === 'KeyJ') { emit('cases'); }
    else if (e.code === 'KeyT') { emit('weather'); }
  });
  window.addEventListener('keyup', e => {
    const d = KEY_DIR[e.code];
    if (d) held.delete(d);
  });
  window.addEventListener('blur', releaseAll);
  // Bấm chuột vào nút ngoài khung thoại (thanh trên, balo): bỏ focus để phím quay về điều khiển nhân vật.
  document.addEventListener('click', e => {
    const b = e.target instanceof Element && e.target.closest('button, summary');
    if (b && e.detail > 0 && !b.closest('#dialog, #modal, #intro, #title, #results')) b.blur();
  });

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
