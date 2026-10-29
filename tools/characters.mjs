// Thông số nhân vật dùng chung cho sprite bản đồ (gen-assets) và chân dung hội thoại (gen-portraits).
import { rgba } from './png.mjs';

/** Làm sáng / tối một màu hex theo hệ số (-1..1). */
export function shade(hex, k) {
  const [r, g, b] = rgba(hex);
  const f = c => Math.max(0, Math.min(255, Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k))));
  return `#${[f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

// Thông số từng nhân vật (thiết kế gốc). skirt: váy; hair: short | long | spiky | grey | bob.
export const CHARACTERS = {
  // Thám tử: sinh viên báo chí — áo khoác dù, balo, thẻ phóng viên thực tập, bút gài tai. Hai mẫu nam / nữ.
  hero_m: { skin: '#f1c7a0', hair: '#2b1d1a', hairStyle: 'short', top: '#3d7fd1', inner: '#f4eedc', bottom: '#2d3a5a', shoes: '#3b2418', backpack: '#6b7a3a', press: true, pen: true },
  hero_f: { skin: '#f3cdb0', hair: '#3a2318', hairStyle: 'bob', top: '#e07a5f', inner: '#f4eedc', bottom: '#3a4466', shoes: '#2b2b2b', backpack: '#2a9d8f', press: true, pen: true },
  npc1: { skin: '#f0c4a4', hair: '#1b1418', hairStyle: 'long', top: '#3d5a98', inner: '#f4eedc', bottom: '#4a4e5c', skirt: true, shoes: '#1d1d24', glasses: true, lanyard: true },
  npc2: { skin: '#e6b48f', hair: '#3a2a20', hairStyle: 'spiky', top: '#5f8a6b', bottom: '#2f2f38', shoes: '#22222a', glasses: true, camera: true },
  npc3: { skin: '#e9c2a0', hair: '#cfcfcf', hairStyle: 'grey', top: '#8a6b4f', inner: '#e8dcc0', bottom: '#4b4b4b', shoes: '#2b2b2b', glasses: true },
  npc4: { skin: '#e8b994', hair: '#5a3a1a', hairStyle: 'spiky', top: '#c0392b', bottom: '#2c3e50', shoes: '#1f1f1f', phone: true },
  npc5: { skin: '#f3cdb0', hair: '#d98aa8', hairStyle: 'long', top: '#f4f1de', bottom: '#f4f1de', skirt: true, shoes: '#c9a0dc' },
  npc6: { skin: '#d9a67e', hair: '#2a2a2a', hairStyle: 'short', top: '#7a8a99', bottom: '#5a4a3a', shoes: '#2b2118', cap: '#b23a3a' },
  // Người qua đường (GIẢ LẬP): làm thế giới sống động, nói vài câu về thói quen kiểm chứng
  amb_guard: { skin: '#e2b28c', hair: '#1d1d1d', hairStyle: 'short', top: '#2c3e66', inner: '#c9d1dc', bottom: '#1f2a44', shoes: '#111111', cap: '#1f2a44', badge: true },
  amb_worker: { skin: '#f0c8a8', hair: '#3a2a20', hairStyle: 'short', top: '#e8ecf2', bottom: '#3a3f4d', shoes: '#22252e', lanyard: true },
  amb_barista: { skin: '#e9bd98', hair: '#5a3a1a', hairStyle: 'bob', top: '#2f2f38', inner: '#c8a26b', bottom: '#2f2f38', shoes: '#1d1d24' },
  amb_vendor: { skin: '#d9a67e', hair: '#2a2a2a', hairStyle: 'long', top: '#6a8a6b', bottom: '#3a3a46', shoes: '#5a3a24', hat: '#e3cf9a', conical: true },
  amb_tourist: { skin: '#f3d0b5', hair: '#c9a66b', hairStyle: 'short', top: '#f2a03d', bottom: '#d8c8a4', shoes: '#f4f4f4', camera: true, cap: '#3d7fd1' },
  amb_fisher: { skin: '#c99572', hair: '#2a2a2a', hairStyle: 'short', top: '#5a6b7a', bottom: '#2c3e50', shoes: '#c9a03a', hat: '#d8c08a' },
  amb_student: { skin: '#f1c7a0', hair: '#1b1418', hairStyle: 'spiky', top: '#f4f6f8', bottom: '#2d3a5a', shoes: '#2b2b2b', backpack: '#c8323c', badge: true },
  amb_elder: { skin: '#e6bb98', hair: '#e0e0e0', hairStyle: 'grey', top: '#6b5a8a', inner: '#e8dcc0', bottom: '#4b4b4b', shoes: '#2b2b2b', glasses: true },
  amb_jogger: { skin: '#e9bd98', hair: '#2b1d1a', hairStyle: 'bob', top: '#2a9d8f', bottom: '#1f1f1f', shoes: '#f4f4f4' }
};

