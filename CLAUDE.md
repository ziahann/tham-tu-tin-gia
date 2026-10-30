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
2. Không còn điểm số: mỗi hồ sơ khép lại trao một huy hiệu kỹ năng (`quests.json → rooms[].badge`); huy hiệu chỉ để chơi, không phải bằng chứng thật/giả. Detector AI (Hive) chỉ là bằng chứng bổ trợ.
3. NPC và tình huống đều hư cấu, không dùng tên người/ca sĩ thật. Theo yêu cầu của nhóm (29/10/2026): KHÔNG ghi chữ "GIẢ LẬP" / chú thích "(hư cấu)" trong lúc chơi (lời thoại, nhãn tên, thanh trên, tòa nhà, tường); disclaimer chỉ đặt ở màn hình chính và thẻ cuối intro (`quests.json → intro.cards`, `ui.json → title.simulatedNote`), phải nêu rõ không đại diện cho Báo Thanh Niên.
4. Nhân đạo: không ảnh nạn nhân/trẻ em; ảnh giả chỉ là mô phỏng pixel trừu tượng gắn "ẢNH GIẢ"; có cảnh báo nội dung khi bắt đầu và nút "Ẩn hình ảnh nhạy cảm".
5. Không doxxing, không kết luận động cơ tiền bạc/danh tính khi chưa có dữ liệu (F13). Không tư vấn pháp lý.
6. **Bản quyền:** nhân vật chính và boss phải ORIGINAL. Không dùng Conan/"Cô Nan"/"Sự thật chỉ có một"/yếu tố của series có sẵn, kể cả bản pixel. Người chơi bắt buộc tự nhập tên nhân vật (không có tên mặc định).
7. Asset, font, âm thanh phải tự tạo hoặc giấy phép mở; ghi nguồn.
8. Phân loại Disinformation/Misinformation/Malinformation theo từng nhóm đối tượng, không gộp.

## Kỹ thuật
- **Hiển thị isometric** (`js/iso.js`): logic (va chạm, vùng, lối ra, NPC, xe, dẫn đường, bản đồ nhỏ) vẫn chạy trên lưới vuông 32 px; mọi thứ hiển thị chiếu bằng P(x, y) = (x − y, (x + y)/2), độ sâu = x + y. Nền: ô thoi `assets/iso/ground.png`; tường: khối `assets/iso/walls.png` (tools/iso.mjs); đồ vật / xe / tòa nhà: khối isometric `<khóa>@iso` (tools/props.mjs → isoExtrude, buildingIso); đồ / chữ dán tường cắt xiên và cắt theo ranh giới ô (`sliceOnWall`). Phím đi lại theo hướng màn hình.
- Huy hiệu kỹ năng: `tools/badges.mjs` → `assets/badges/<mã phòng>.png`.
- Đồ có món đặt trên mặt (bàn, quầy, bàn soi): `tools/props.mjs → isoWithItems` tách màn hình, giấy, đèn... thành khối nhỏ trên mặt bàn. Đồ áp tường tây đặt `{ face: 'e' }` (bản `<khóa>@isoE`, mặt trước quay vào phòng; (x, y) = giữa mép trước phía đông). Không đặt tủ / kệ sát tường nam (người chơi sẽ thấy lưng tủ).
- Nháy chuột / chạm để đi (`js/pathfind.js`, A* lưới 16 px; `settings.clickMove`); bấm vào người / đồ vật thì đi tới rồi tương tác.
- Trận boss (`story.js → runBoss`, dữ liệu `quests.json → boss.phases[].mode`): 3 pha ở 3 bục (`boss_p1..3` trên bản đồ `boss` 22x16), mỗi pha một kiểu chơi: `flaws` (soi khung có đồng hồ, dùng lại bước Q4), `labels` (gỡ nhãn sai: chọn nguồn gốc thật trong 15 giây, 3 lượt chịu sai, dữ kiện của Q7), `arena` (chơi trên bản đồ: nhặt 3 mảnh bằng chứng, né bong bóng tin đồn, tránh thẻ suy đoán — `world.js → startArena / updateArena`), rồi chốt hạ bằng phân loại kết luận (`bossFinale`; xếp thẻ suy đoán vào "Đã chứng minh" = kết thúc B, xếp lại).
- Cài đặt có nút "Tới thẳng phòng boss" (`story.js → skipToBoss`: nhiệm vụ bắt buộc chưa làm tính là đã khép, nhận thẻ evidence, không trao huy hiệu; cờ `skipped_to_boss`). Mọi bảng menu (`#modal`) mở thành khung bên phải như balo. Khu phố: nền kéo dài ra ngoài bản đồ (`iso.js → buildGround(..., extend)`, lặp ô ở mép) và một vòng nhà / đảo đá trang trí ngoài rìa (tọa độ âm hoặc > 96 trong `gen-assets.mjs`).
- Lượt mới bắt đầu bằng cảnh xe buýt (`world.js → busIntro`, cờ `progress.introBus`) dừng ở trạm `spawn_bus` trước Trụ sở Báo Thanh Niên.
- Nhân vật chính đeo balo Văn Lang (đỏ, viền xanh than, khiên trắng: `characters.mjs → vlu`) và thẻ sinh viên dây xanh ngọc; Sổ tay mở đầu bằng thẻ sinh viên mô phỏng (tên, ngành, uy tín = trung bình độ tin cậy các hồ sơ). Lần đầu dùng mỗi thiết bị ở Phòng xác minh có hướng dẫn (`ui.json → devices.<id>.tutorial`).
- Cản trở (`js/obstacles.js`): **độ tin cậy** theo từng hồ sơ (`progress.cred`, trả lời sai −15, một phần −5, bị kẻ tung tin lừa −10, đưa manh mối giả vào hồ sơ −15, đăng vội −25; về 0 thì hồ sơ đặt lại từ đầu); **hạn chót** (`progress.pressure`) tăng khi đi lại lúc có hồ sơ, đầy thì Phát Vội gọi giục đăng; **kẻ tung tin** `amb_rumor*` đuổi theo trên phố, hỏi câu trong `npc_dialogues.json → rumors`; **manh mối đánh lừa** object `decoy` + `decoys` (không đặt trong tòa Báo Thanh Niên); **thẻ khách** từ bảo vệ mới đi thang máy sảnh; thang máy có lúc phải chờ; đi giữa làn ngoài vạch kẻ bị xe hất về vỉa hè; vỉa hè bắc có rào thi công. Cài đặt "Thử thách: Đầy đủ / Nhẹ" (`settings.challenge`).
- Game nhập vai góc nhìn từ trên xuống: Phaser 3.80.1 (MIT, lưu sẵn ở `game/vendor/`) vẽ bản đồ; giao diện (khung thoại, balo, thanh trên) là HTML/CSS phủ lên. Nội dung ở JSON; lưu bằng localStorage (`tfd_progress`, `tfd_settings`, `tfd_chat_log`).
- 13 bản đồ Tiled JSON ở `game/maps/`: Trụ sở Báo Thanh Niên `tn_lobby`, `tn_f2` (S3), `tn_f3` (S4), `tn_f4` (S7), `tn_f5` (S8) nối bằng thang máy (object `elevator`, danh sách tầng ở `quests.json → building`); `street` = khu phố 96x64; `newsroom` (Tin Vịnh, hư cấu: S5, S6); `cafe`; `agency` = Phòng xác minh; ba tòa trang trí vào được `office2` (cao ốc văn phòng), `clinic` (trung tâm y tế), `cafe2` (Cà phê Sương Sớm) — hư cấu, chỉ có NPC trang trí (`ambientLines`), không có nhiệm vụ; `boss` (tầng thượng), chung tileset `assets/tiles/tiles.png`; ô 32x32, sprite nhân vật 32x48 (3 khung x 4 hướng); thám tử có 2 mẫu `hero_m` / `hero_f`. Đồ vật lớn và tòa nhà là props (`tools/props.mjs` → atlas `assets/props/`, object `prop` trên bản đồ, depth theo đáy, va chạm ở chân đế; giả 3D góc 3/4: tòa nhà có mái + mặt hông + bóng đổ `<khóa>_shadow`, đồ vật được `extrude()` thành khối, `meta.ox` = tâm mặt trước; thước tỉ lệ: người 32x48 ≈ 1,7 m). Asset do `node tools/gen-assets.mjs` (tileset, bản đồ, props, sprite, xe) và `node tools/gen-portraits.mjs` (chân dung 72x88, 5 biểu cảm) sinh ra từ thông số chung `tools/characters.mjs` — chạy lại sẽ ghi đè. Sửa bố cục bản đồ thì tăng `MAP_VERSION` trong `js/world.js`.
- Thế giới mở (`js/grading.js → isUnlocked`): nhiệm vụ đầu mỗi hồ sơ mở ngay; theo dõi hồ sơ bằng `progress.tracked`, mũi tên ở `js/guide.js`. Bước có `tool` (quests.json) làm tại thiết bị ở Phòng thám tử (`js/story.js → useDevice`, giao diện `js/tools.js`). Nguồn đọc trong game (trình đọc báo, không mở tab mới).
- Thời tiết (`js/weather.js`, Light2D) đổi ngẫu nhiên mỗi 5 phút (`main.js → randomWeather`), chỉ có hiệu lực ngoài trời; hiệu ứng `WEATHER_FX` (mưa đi chậm, sương tầm nhìn hẹp, đêm kẻ tung tin đuổi xa + hạn chót nhanh). Khung thoại thu nhỏ được (`dialogue.js → minimize`), khi thu nhỏ người chơi đi lại tự do. Khối isometric rộng được cắt cột 16 px, mỗi cột một độ sâu (`world.js → sliceIso`). Thời tiết cũ: ánh sáng đêm, xe cộ `js/traffic.js`, âm thanh WebAudio `js/audio.js` (bước chân, giọng, môi trường). NPC có trạm `map` (stations) thì xuất hiện ở tầng tương ứng.
- Nhạc nền: Kevin MacLeod (incompetech.com), CC BY 4.0 — ghi công bắt buộc, danh sách ở `sources.json → music`. Báo cáo của nhóm (`baocao`) là nguồn `internal`, không hiển thị trong game.
- Tòa nhà chính mang tên thật Báo Thanh Niên: disclaimer ở màn hình chính + intro (không ghi trên tòa nhà); không đặt nhân vật bẫy hay trang mạo danh vào đó.
- Phông VT323 (có tiếng Việt). Pixelify Sans thiếu ký tự tiếng Việt, đừng dùng.
- Nhiệm vụ chạy trong hội thoại (`js/story.js`); chân dung lớn hai bên khung thoại, ai nói thì sáng (`mood` trên câu thoại). Dạng mới: `steps` trong quests.json, mỗi bước `choice | input | flaws | match | multi | order | sort | open | interview | say` có `ask`, `hints`, `walkthrough`, `tool` (tùy chọn), tư liệu `exhibit` (`lens`, `hive`, `mpv12`, `mco9` trong `quests.json → exhibits`, vẽ bởi `js/exhibits.js`). Q1/Q2 dùng dạng cũ G2/G1. Phòng có nhiệm vụ chưa dựng hiện "Đang xây dựng" (`js/grading.js → isPlayable`).
- Mọi đáp án phải tra được: từ link nguồn đã đọc nội dung (`sources.json → urlStatus: verified`) hoặc từ tư liệu trong game có trích báo cáo.
- Test: `cd game && python -m http.server 8000`; thêm `?debug` vào URL để lộ `window.__game` cho công cụ test.
- Hosting: GitHub Pages https://ziahann.github.io/tham-tu-tin-gia/ (repo `ziahann/tham-tu-tin-gia`), phục vụ từ nhánh `gh-pages` = nội dung `game/`. Cập nhật bản online sau khi đẩy `master`: `git subtree split --prefix game -b gh-pages && git push origin gh-pages` (token hiện chưa có quyền `workflow` nên không dùng GitHub Actions).

## Lời thoại
- Xưng hô: mọi NPC gọi người chơi là "em" và tự xưng theo vai (chị Tuệ Lâm, anh Khải, bác Tín Thư, anh Lịch, chị Cẩn, anh Phân, chú Sáu...); người chơi xưng "em". Riêng Kẻ Dệt Chuyện (boss) xưng "ta", gọi "ngươi".
- Mỗi hồ sơ một người phụ trách: S3 Tuệ Lâm (npc1), S4 Khải (npc2), S5 bác Tín Thư (npc3), S6 anh Lịch (npc7), S7 chị Cẩn (npc8), S8 anh Phân (npc9), CAFE chú Sáu (npc6); màn bonus Tuệ Lâm.
- Không hiện mã dữ kiện (F1…F16) và không nói tới điểm trong chữ người chơi thấy; mã F chỉ giữ trong các trường dữ liệu (`facts`, `fact`, ghi chú).

## Cách làm việc
- Việc lớn: dùng plan mode trước, làm từng bước nhỏ, commit thường xuyên.
- Kiểm tra JSON hợp lệ sau mỗi lần sửa; test trên điện thoại và máy tính.
- Giao diện và lời thoại bằng tiếng Việt.
