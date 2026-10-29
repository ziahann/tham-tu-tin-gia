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
| Chọn hồ sơ để theo dõi (mũi tên vàng chỉ đường) | J hoặc biểu tượng hồ sơ | Biểu tượng hồ sơ |
| Đổi thời tiết (quang / mưa / sương mù / đêm) | T hoặc biểu tượng mây | Biểu tượng mây |
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
| `data/npc_dialogues.json` | NPC và người qua đường, cảnh hội thoại (`scenes`), luật nói chuyện (`interactions`), trạm đứng của NPC (`stations`, có thể gắn `room`), lời giới thiệu phòng (`zoneScenes`), chữ khi xem đồ vật (`inspect`), đồ vật mở trình đọc báo (`inspectSources`), câu của người qua đường (`ambientLines`) |
| `data/sources.json` | Nguồn trích dẫn APA |
| `data/ui.json` | Toàn bộ chữ trên giao diện |
| `maps/*.json` | 6 bản đồ Tiled (office, street = khu phố, newsroom, cafe, agency = Phòng thám tử, boss), dùng chung `assets/tiles/tiles.png`. Lớp `walls` và `doors` có va chạm theo thuộc tính `collides` của ô; lớp `objects` chứa điểm xuất hiện, khu vực, cửa phòng, lối ra (`exit`), cổng (`portal`), NPC, đường đi tuần, đồ vật xem được (`inspect`), thiết bị (`device`), làn xe (`lane`), vạch qua đường (`crosswalk`) |
| `assets/` | Tileset, sprite, xe cộ sinh bởi `node tools/gen-assets.mjs`; chân dung hội thoại (`assets/portraits`, 5 biểu cảm) sinh bởi `node tools/gen-portraits.mjs` (chạy ở thư mục gốc repo; thông số nhân vật chung ở `tools/characters.mjs`) |
| `js/main.js` | Khởi động, màn hình chính, cài đặt, nguồn |
| `js/world.js`, `js/actors.js` | Cảnh Phaser: bản đồ, người chơi, NPC đi tuần, bong bóng biểu cảm, cửa, khu vực, thiết bị |
| `js/guide.js` | Mũi tên dẫn đường tới người giao việc / thiết bị của hồ sơ đang theo dõi (kể cả ở bản đồ khác) |
| `js/tools.js` | Phòng thám tử: cửa sổ công cụ MÔ PHỎNG, trình đọc báo trong game, chế độ xem thử |
| `js/weather.js`, `js/traffic.js` | Thời tiết và ánh sáng ban đêm; xe cộ theo làn |
| `js/story.js`, `js/dialogue.js` | Cốt truyện và nhiệm vụ trong hội thoại; khung thoại |
| `js/grading.js`, `js/text.js` | Chấm đáp án (bỏ dấu, gần đúng), điểm, trạng thái phòng |
| `js/backpack.js` | Balo: sổ tay (thẻ evidence + ghi chép từ báo), bảng Hồ sơ vụ án + bản đồ nhỏ, bảng ghim, lịch sử theo NPC |
| `js/state.js`, `js/history.js` | Lưu tiến trình, cài đặt, lịch sử trò chuyện |

## Nội dung

| Địa điểm (bản đồ) | Nhiệm vụ | NPC |
|---|---|---|
| Trụ sở Báo Thanh Niên (`tn_lobby`, `tn_f2`–`tn_f5`; tên thật theo yêu cầu của nhóm, nhân vật và sự việc bên trong là GIẢ LẬP) | Sảnh; tầng 2 S3 Hồ sơ Q1–Q2; tầng 3 S4 Phân tích ảnh Q3–Q6; tầng 4 S7 Tác động Q9–Q10; tầng 5 S8 Phân loại Q11–Q13; tầng thượng Phòng họp (Boss). Đi bằng thang máy | Tuệ Lâm, Khải, bảo vệ, nhân viên |
| Khu phố ven vịnh (`street`, 96x64) | Phố chính và đường ven vịnh có xe, phố đi bộ, công viên, lối dạo, bến tàu (tàu tham quan neo, không có tàu gặp nạn); 4 tòa vào được có biển hiệu, các tòa trang trí không có biển | Bông Mây, người qua đường |
| Phòng xác minh (`agency`) | Thiết bị: máy tìm ngược ảnh (Q3), bàn soi (Q4), màn hình mạng xã hội (Q5, bonus), máy dò AI (Q6), kho báo (Q7), bảng dòng thời gian (Q8), tường bằng chứng | — |
| Tòa soạn Tin Vịnh (`newsroom`, trang tin hư cấu) | S5 Lưu trữ Q7; S6 Dòng thời gian Q8 | Bác Tín Thư, Phát Vội |
| Quán cà phê Gió Biển (`cafe`) | Q10b thẩm vấn (tùy chọn) | Chú Sáu Nhóm |
| Phòng Boss (`boss`) | Đối đầu Kẻ Dệt Chuyện 3 pha, kết thúc A/B, màn kết quả; sau đó màn bonus G11 (trang mạo danh) | Kẻ Dệt Chuyện |

Thế giới mở: mọi hồ sơ mở ngay, làm theo thứ tự tùy ý (các bước trong một hồ sơ vẫn theo thứ tự); xong mọi nhiệm vụ bắt buộc thì Kẻ Dệt Chuyện xuất hiện. Bước có `tool` trong `quests.json` làm tại thiết bị ở Phòng thám tử.

Intro trên nền vịnh Hạ Long chuyển động (`js/bay.js`), chọn mẫu thám tử nam/nữ, nhạc nền CC0 đổi theo bản đồ (`js/music.js`; trình duyệt chỉ phát sau thao tác đầu tiên, nhỏ lại khi hội thoại). Art vẽ bằng code (`tools/gen-assets.mjs`, `tools/gen-portraits.mjs`).

## Nguồn tài nguyên (giấy phép)

| Tài nguyên | Nguồn | Giấy phép |
|---|---|---|
| Phaser 3.80.1 | phaser.io (`vendor/PHASER-LICENSE.md`) | MIT |
| Phông chữ VT323 (Peter Hull) | Google Fonts | SIL Open Font License 1.1 |
| Tileset, sprite, xe cộ, chân dung | Tự tạo bằng code (`tools/gen-assets.mjs`, `tools/gen-portraits.mjs`) | Của nhóm |
| Hiệu ứng và âm thanh môi trường | Tự tạo bằng WebAudio (`js/audio.js`) | Của nhóm |
| Nhạc nền (`assets/audio/*.mp3`) | Kevin MacLeod (incompetech.com) | Creative Commons: By Attribution 4.0 (bắt buộc ghi công; ghi ở nút Nguồn trong game) |

Nhạc theo mốc (mỗi bài: "Tên bài" Kevin MacLeod (incompetech.com), Licensed under Creative Commons: By Attribution 4.0 License, https://creativecommons.org/licenses/by/4.0/):
`title` = *Night on the Docks - Sax*; `office` (Báo Thanh Niên) = *Hard Boiled*; `street` = *Bass Walker*; `archive` (Tin Vịnh) = *I Knew a Guy*; `cafe` = *Lobby Time*; `agency` (Phòng xác minh) = *Spy Glass*; `boss` = *Crypto*; `ending` = *Past Sadness*. Danh sách máy đọc ở `data/sources.json → music`. Đổi bài: thay file cùng tên và sửa danh sách đó.

## Lưu dữ liệu

Chỉ lưu trên trình duyệt (localStorage): `tfd_progress` (gồm hồ sơ đang theo dõi, ghi chép từ báo), `tfd_settings` (gồm thời tiết, âm thanh môi trường), `tfd_chat_log` (giữ mọi lượt chơi). Không lưu tên thật hay dữ liệu định danh. Nút "Xóa dữ liệu của tôi" trong balo → Lịch sử xóa toàn bộ.
