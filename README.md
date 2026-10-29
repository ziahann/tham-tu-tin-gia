# Thám tử tin giả — Vụ án Những Gương Mặt Không Có Thật

Game pixel nhập vai (không backend) cho bài tập mục 08, môn Thẩm định tin tức (Văn Lang).
Người chơi đi lại trong văn phòng Ban Hải Đăng, nói chuyện với NPC, nhận nhiệm vụ và trả lời ngay trong hội thoại.
Tình huống, nhân vật, tổ chức và công cụ mô phỏng là **GIẢ LẬP**; dữ kiện về vụ lật tàu Vịnh Xanh 58 lấy từ báo chí, có ghi nguồn.

## Chạy trên máy

Game đọc dữ liệu bằng `fetch`, nên phải chạy qua máy chủ web (mở thẳng `index.html` sẽ báo lỗi tải dữ liệu):

```sh
cd game
python -m http.server 8000
# rồi mở http://localhost:8000
```

## Điều khiển

| Việc | Máy tính | Điện thoại |
|---|---|---|
| Đi lại | WASD hoặc phím mũi tên | Phím ảo D-pad |
| Nói chuyện / xem đồ vật / tiếp lời thoại | E, Space, Enter | Nút A hoặc chạm khung thoại |
| Mở balo | B hoặc biểu tượng balo | Biểu tượng balo |
| Đóng | Esc | Nút Đóng |

## Triển khai GitHub Pages

GitHub Pages chỉ phục vụ từ thư mục gốc hoặc `/docs`, nên đẩy riêng thư mục `game/` lên nhánh `gh-pages`:

1. Đẩy repo lên GitHub (`git push origin main`).
2. `git subtree push --prefix game origin gh-pages`
3. Trên GitHub: Settings → Pages → Deploy from a branch → `gh-pages` / `(root)`.
4. Mỗi lần cập nhật game, chạy lại bước 2.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `data/quests.json` | Phòng, nhiệm vụ, thẻ evidence, nhân vật chính, tổ chức hư cấu, boss |
| `data/npc_dialogues.json` | NPC, cảnh hội thoại (`scenes`), luật nói chuyện (`interactions`), trạm đứng của NPC (`stations`), lời giới thiệu phòng (`zoneScenes`), chữ khi xem đồ vật (`inspect`) |
| `data/sources.json` | Nguồn trích dẫn APA |
| `data/ui.json` | Toàn bộ chữ trên giao diện |
| `maps/office.json` | Bản đồ văn phòng (Tiled). Lớp `walls` và `doors` có va chạm theo thuộc tính `collides` của ô; lớp `objects` chứa điểm xuất hiện, khu vực, cửa, NPC, đường đi tuần / dẫn đường, đồ vật xem được |
| `assets/` | Tileset và sprite TẠM, sinh bởi `node tools/gen-assets.mjs` (ở thư mục gốc repo) |
| `js/main.js` | Khởi động, màn hình chính, cài đặt, nguồn |
| `js/world.js`, `js/actors.js` | Cảnh Phaser: bản đồ, người chơi, NPC đi tuần / dẫn đường, cửa, khu vực |
| `js/story.js`, `js/dialogue.js` | Cốt truyện và nhiệm vụ trong hội thoại; khung thoại |
| `js/grading.js`, `js/text.js` | Chấm đáp án (bỏ dấu, gần đúng), điểm, trạng thái phòng |
| `js/backpack.js` | Balo: sổ tay, nhiệm vụ + bản đồ nhỏ, bảng ghim, lịch sử theo NPC |
| `js/state.js`, `js/history.js` | Lưu tiến trình, cài đặt, lịch sử trò chuyện |

## Đã có / chưa có

- Đã có (giai đoạn 1): màn hình chính có cảnh báo nội dung, văn phòng đi lại được, NPC đi tuần và dẫn đường, Phòng Hồ sơ (Q1, Q2) trong hội thoại, balo, lịch sử theo NPC.
- Đã có: intro trên nền vịnh Hạ Long chuyển động (vẽ bằng code, `js/bay.js`) với 5 thẻ bối cảnh vụ án có trích nguồn.
- Đã có: Phòng Phân tích ảnh (Q3–Q6) với Khải — bản ghi Google Lens/Hive theo báo cáo, kính soi lỗi trên lưới 12 khung MÔ PHỎNG, tìm ảnh dùng lại giữa hai bộ.
- Chưa có: art và nhạc thật, bối cảnh ngoài trời, các phòng Q7–Q13, boss và kết quả.

## Nguồn tài nguyên (giấy phép)

| Tài nguyên | Nguồn | Giấy phép |
|---|---|---|
| Phaser 3.80.1 | phaser.io (`vendor/PHASER-LICENSE.md`) | MIT |
| Phông chữ VT323 (Peter Hull) | Google Fonts | SIL Open Font License 1.1 |
| Tileset, sprite tạm | Tự tạo bằng code (`tools/gen-assets.mjs`) | Của nhóm |
| Hiệu ứng âm thanh | Tự tạo bằng WebAudio (`js/audio.js`) | Của nhóm |

## Lưu dữ liệu

Chỉ lưu trên trình duyệt (localStorage): `tfd_progress`, `tfd_settings`, `tfd_chat_log` (giữ mọi lượt chơi). Không lưu tên thật hay dữ liệu định danh. Nút "Xóa dữ liệu của tôi" trong balo → Lịch sử xóa toàn bộ.
