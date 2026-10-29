# Thám tử tin giả — Vụ án Những Gương Mặt Không Có Thật

Game pixel HTML/CSS/JS (không backend) cho bài tập mục 08, môn Thẩm định tin tức (Văn Lang).
Tình huống, nhân vật, tổ chức và công cụ mô phỏng là **GIẢ LẬP**; dữ kiện về vụ lật tàu Vịnh Xanh 58 lấy từ báo chí, có ghi nguồn.

## Chạy trên máy

Game đọc dữ liệu JSON bằng `fetch`, nên phải chạy qua máy chủ web (mở thẳng file `index.html` sẽ báo lỗi tải dữ liệu):

```sh
cd game
python -m http.server 8000
# rồi mở http://localhost:8000
```

## Triển khai GitHub Pages

GitHub Pages chỉ phục vụ từ thư mục gốc hoặc `/docs`, nên đẩy riêng thư mục `game/` lên nhánh `gh-pages`:

1. Đẩy repo lên GitHub (`git push origin main`).
2. `git subtree push --prefix game origin gh-pages`
3. Trên GitHub: Settings → Pages → Deploy from a branch → `gh-pages` / `(root)`.
4. Mỗi lần cập nhật game, chạy lại bước 2.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `data/quests.json` | Nhiệm vụ, phòng, thẻ evidence, nhân vật chính, tổ chức hư cấu, boss |
| `data/npc_dialogues.json` | NPC, cảnh hội thoại (`scenes`), từ khóa trả lời tự do (`freeChat`) |
| `data/sources.json` | Nguồn trích dẫn APA |
| `data/ui.json` | Toàn bộ chữ trên giao diện |
| `js/main.js` | Khởi động, điều hướng màn S0–S3, sổ tay, nguồn, nhật ký, cài đặt |
| `js/quests.js` | Dựng nhiệm vụ G1 (điền evidence), G2 (chọn thẻ), chấm điểm, gợi ý |
| `js/chat.js` | Chat NPC, lưu nhật ký `tfd_chat_log`, xuất JSON |
| `js/state.js` | Tiến trình `tfd_progress`, cài đặt `tfd_settings` |
| `js/pixel.js` | Bảng màu, sprite, cảnh nền 320×180 vẽ bằng code |
| `js/audio.js` | Hiệu ứng âm thanh tạo bằng WebAudio |

## Đã có / chưa có

- Đã có: S0 (cảnh báo nội dung), S1 (nhận vụ án, đặt tên), S2 (bản đồ), S3 Phòng Hồ sơ (Q1, Q2).
- Đang xây dựng: S4–S8, Boss S9, Kết quả S10, màn bonus G11.

## Nguồn tài nguyên (giấy phép)

| Tài nguyên | Nguồn | Giấy phép |
|---|---|---|
| Phông chữ VT323 (Peter Hull) | Google Fonts | SIL Open Font License 1.1 |
| Sprite, cảnh nền, bảng màu 16 màu | Tự tạo bằng code (`js/pixel.js`) | Của nhóm |
| Âm thanh | Tự tạo bằng WebAudio (`js/audio.js`) | Của nhóm |

Ghi chú: Pixelify Sans đã cân nhắc nhưng không có bộ ký tự tiếng Việt (thiếu U+1EA0–1EF1), nên dùng VT323.

## Lưu dữ liệu

Chỉ lưu trên trình duyệt (localStorage): `tfd_progress`, `tfd_settings`, `tfd_chat_log` (giữ mọi lượt chơi). Không lưu tên thật hay dữ liệu định danh. Nút "Xóa dữ liệu của tôi" trong Nhật ký xóa toàn bộ.
