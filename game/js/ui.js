// Tiện ích giao diện chung: chữ từ ui.json, thông báo nhanh, hộp thoại.
import { t } from './data.js';

/** Điền chữ cho mọi phần tử có data-ui="đường.dẫn". */
export function applyUiText(root = document) {
  root.querySelectorAll('[data-ui]').forEach(n => { n.textContent = t(n.dataset.ui); });
}

let toastTimer = null;

/** Hiện thông báo ngắn ở đầu màn hình. */
export function toast(text, ms = 3200) {
  const box = document.getElementById('toast');
  box.textContent = text;
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.hidden = true; }, ms);
}

/** Mở hộp thoại với tiêu đề và nội dung (Node). Esc hoặc nút Đóng để thoát. */
export function openModal(title, contentNode) {
  const dlg = document.getElementById('modal');
  document.getElementById('modal-title').textContent = title;
  const body = document.getElementById('modal-body');
  body.innerHTML = '';
  body.append(contentNode);
  if (!dlg.open) dlg.showModal();
}

/** Đóng hộp thoại. */
export function closeModal() {
  const dlg = document.getElementById('modal');
  if (dlg.open) dlg.close();
}

/** Hỏi xác nhận bằng hộp thoại của game; trả về Promise<boolean>. */
export function confirmBox(title, text) {
  return new Promise(resolve => {
    const wrap = document.createElement('div');
    const p = document.createElement('p');
    p.textContent = text;
    const actions = document.createElement('div');
    actions.className = 'actions';
    const yes = document.createElement('button');
    yes.type = 'button'; yes.className = 'btn-primary'; yes.textContent = t('yes');
    const no = document.createElement('button');
    no.type = 'button'; no.className = 'btn'; no.textContent = t('no');
    const done = val => { closeModal(); resolve(val); };
    yes.addEventListener('click', () => done(true));
    no.addEventListener('click', () => done(false));
    document.getElementById('modal').addEventListener('close', () => resolve(false), { once: true });
    actions.append(yes, no);
    wrap.append(p, actions);
    openModal(title, wrap);
    no.focus();
  });
}
