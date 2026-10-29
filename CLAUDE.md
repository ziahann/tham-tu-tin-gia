# Thám tử tin giả — Vụ án Những Gương Mặt Không Có Thật

Game pixel-art HTML/CSS/JS (không backend) cho bài tập mục 08, môn Thẩm định tin tức (Văn Lang). Người chơi là thẩm định viên: chọn bằng chứng, nhận giải thích bằng sự thật thật. Tình huống dựa vụ lật tàu Vịnh Xanh 58 (19/7/2025); mọi thứ bịa phải ghi **GIẢ LẬP**.

## Tài liệu thiết kế (đọc file liên quan theo từng việc, không đọc hết mỗi lần)
- `CÀI ĐẶT CHUNG CỦA DỰ ÁN.md` — quy tắc bắt buộc, công nghệ, cấu trúc thư mục, quy ước, triển khai
- `THIẾT KẾ TÍNH NĂNG VÀ GIAO DIỆN GAME.md` — màn hình S0–S10, giao diện, trợ năng
- `THIẾT KẾ NỘI DUNG, NPC VÀ LƯU TRỮ CHAT.md` — NPC, hội thoại, sự thật F1–F16, lưu chat
- `NHÂN VẬT, CỐT TRUYỆN, BOSS VÀ ART PIXEL.md` — nhân vật, boss, art
- `KIỂU CHƠI, NHIỆM VỤ VÀ CÔNG CỤ.md` — vòng chơi, G1–G11, Q1–Q13, boss, điểm
- `QUYẾT ĐỊNH ĐÃ CHỐT.md` — các quyết định đã chốt (mới hơn các tài liệu trên khi mâu thuẫn)
- Dữ liệu máy đọc: `game/data/quests.json`, `npc_dialogues.json`, `sources.json`, `ui.json` (chữ giao diện) — nguồn sự thật chính cho code; sửa nội dung ở đây
- Chạy thử: `cd game && python -m http.server 8000` (xem `game/README.md`)

## Quy tắc không được vi phạm
1. Chỉ dùng sự thật F1–F16 trong tài liệu 02; không bịa số liệu. Số 49 người/10 được cứu có cờ `verifyBeforeRelease`: đối chiếu nguồn chính thức trước khi phát hành.
2. Điểm game chỉ để chơi, không phải bằng chứng thật/giả. Detector AI (Hive) chỉ là bằng chứng bổ trợ.
3. Mọi tình huống/NPC bịa gắn nhãn GIẢ LẬP. NPC đều hư cấu, không dùng tên người/ca sĩ thật.
4. Nhân đạo: không ảnh nạn nhân/trẻ em; ảnh giả chỉ là mô phỏng pixel trừu tượng gắn "ẢNH GIẢ"; có cảnh báo nội dung khi bắt đầu và nút "Ẩn hình ảnh nhạy cảm".
5. Không doxxing, không kết luận động cơ tiền bạc/danh tính khi chưa có dữ liệu (F13). Không tư vấn pháp lý.
6. **Bản quyền:** nhân vật chính và boss phải ORIGINAL. Không dùng Conan/"Cô Nan"/"Sự thật chỉ có một"/yếu tố của series có sẵn, kể cả bản pixel. Tên nhân vật đọc từ `quests.json → hero.displayName` (đổi ở đó).
7. Asset, font, âm thanh phải tự tạo hoặc giấy phép mở; ghi nguồn.
8. Phân loại Disinformation/Misinformation/Malinformation theo từng nhóm đối tượng, không gộp.

## Kỹ thuật
- Game nhập vai góc nhìn từ trên xuống: Phaser 3.80.1 (MIT, lưu sẵn ở `game/vendor/`) vẽ bản đồ; giao diện (khung thoại, balo, thanh trên) là HTML/CSS phủ lên. Nội dung ở JSON; lưu bằng localStorage (`tfd_progress`, `tfd_settings`, `tfd_chat_log`).
- 6 bản đồ Tiled JSON ở `game/maps/` (office, street = khu phố 64x36, newsroom, cafe, agency = Phòng thám tử, boss), chung tileset `assets/tiles/tiles.png`; ô 32x32, sprite nhân vật 32x48 (3 khung x 4 hướng); thám tử có 2 mẫu `hero_m` / `hero_f`. Asset do `node tools/gen-assets.mjs` (tileset, bản đồ, sprite, xe) và `node tools/gen-portraits.mjs` (chân dung 72x88, 5 biểu cảm) sinh ra từ thông số chung `tools/characters.mjs` — chạy lại sẽ ghi đè. Sửa bố cục bản đồ thì tăng `MAP_VERSION` trong `js/world.js`.
- Thế giới mở (`js/grading.js → isUnlocked`): nhiệm vụ đầu mỗi hồ sơ mở ngay; theo dõi hồ sơ bằng `progress.tracked`, mũi tên ở `js/guide.js`. Bước có `tool` (quests.json) làm tại thiết bị ở Phòng thám tử (`js/story.js → useDevice`, giao diện `js/tools.js`). Nguồn đọc trong game (trình đọc báo, không mở tab mới).
- Thời tiết / ánh sáng đêm `js/weather.js` (Light2D), xe cộ `js/traffic.js`, âm thanh WebAudio `js/audio.js` (bước chân, giọng, môi trường).
- Phông VT323 (có tiếng Việt). Pixelify Sans thiếu ký tự tiếng Việt, đừng dùng.
- Nhiệm vụ chạy trong hội thoại (`js/story.js`); chân dung lớn hai bên khung thoại, ai nói thì sáng (`mood` trên câu thoại). Dạng mới: `steps` trong quests.json, mỗi bước `choice | input | flaws | match | multi | order | sort | open | interview | say` có `ask`, `hints`, `walkthrough`, `tool` (tùy chọn), tư liệu `exhibit` (`lens`, `hive`, `mpv12`, `mco9` trong `quests.json → exhibits`, vẽ bởi `js/exhibits.js`). Q1/Q2 dùng dạng cũ G2/G1. Phòng có nhiệm vụ chưa dựng hiện "Đang xây dựng" (`js/grading.js → isPlayable`).
- Mọi đáp án phải tra được: từ link nguồn đã đọc nội dung (`sources.json → urlStatus: verified`) hoặc từ tư liệu trong game có trích báo cáo.
- Test: `cd game && python -m http.server 8000`; thêm `?debug` vào URL để lộ `window.__game` cho công cụ test.
- Hosting: GitHub Pages. Code trong `game/`.

## Cách làm việc
- Việc lớn: dùng plan mode trước, làm từng bước nhỏ, commit thường xuyên.
- Kiểm tra JSON hợp lệ sau mỗi lần sửa; test trên điện thoại và máy tính.
- Giao diện và lời thoại bằng tiếng Việt.
