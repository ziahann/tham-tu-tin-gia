# Quyết định đã chốt

> Ghi lại các mục `[ĐIỀN]` / "cần chốt" trong 5 tài liệu thiết kế. Nếu mâu thuẫn với tài liệu khác, file này mới hơn.

## Chốt ngày 29/10/2026

| Mục | Quyết định |
|---|---|
| Cách dựng | Làm lát cắt dọc trước: S0 → S1 → S2 → S3 (Q1–Q2), sau đó thêm từng phòng |
| Tên nhân vật chính | Người chơi tự đặt ở S1; mặc định "Tầm" (`quests.json → hero.displayName`). Bỏ "Cô Nan" và câu "Sự thật chỉ có một" (vi phạm bản quyền, quy tắc 6) |
| Câu cửa miệng | "Chưa có bằng chứng thì chưa kết luận." |
| Tổ chức hư cấu | Ban Điều phối Thông tin Du lịch Hải Đăng (GIẢ LẬP) — chờ nhóm duyệt |
| Boss | Tên "Kẻ Dệt Chuyện", biệt danh "Kẻ Giấu Mặt" |
| Kết thúc | A + B. B kích hoạt khi chọn thẻ "tiết lộ danh tính" hoặc "chắc chắn trục lợi tài chính" ở pha 3, sau đó chơi lại pha 3 |
| Nhiệm vụ tùy chọn | Giữ Q10 (thẩm vấn), Q13 và màn bonus G11 |
| Chat NPC | Có câu chọn sẵn + gõ tự do; trả lời tự do bằng so khớp từ khóa offline (`npc_dialogues.json → freeChat`), chỉ dùng F1–F16 |
| Nhật ký chat | Giữ mọi lượt chơi; cho xuất JSON; có nút xóa dữ liệu |
| Q11 nhóm clip cũ | Chấp nhận cả Misinformation và "chưa đủ căn cứ về chủ đích", kèm giải thích F13 |
| Chấm ô điền | Dễ tính: bỏ dấu, không phân biệt hoa thường, nhiều cách viết, cho "gần đúng" khi sai 1–2 ký tự (trừ ô ngày) |
| Điểm | Đúng lần đầu 10; mỗi gợi ý −2; mỗi lần sai −2; tối thiểu 4; dùng "Tôi không tìm được" tối đa 5 |
| Chế độ offline | Không làm |
| Phông chữ | VT323 (SIL OFL). Pixelify Sans thiếu ký tự tiếng Việt nên không dùng |
| Bảng màu | 16 màu gốc của dự án, kiểu retro giới hạn (xem `game/css/styles.css`) |
| Màu trạng thái | Đúng: xanh lá ✓ / Sai: đỏ ✗ / Một phần: cam ◐ / Chưa đủ căn cứ: tím ? (luôn kèm biểu tượng và chữ) |
| Âm thanh | Chỉ hiệu ứng ngắn tạo bằng WebAudio, có nút tắt tiếng, không có nhạc |
| Số 49 người / 10 người được cứu | Không đưa vào game; Q2 chỉ hỏi ngày, nơi, tàu, nguyên nhân |
| URL nguồn | Claude tìm và kiểm tra, nhóm xác nhận |
| NPC | Giữ 6 NPC trong `npc_dialogues.json`, đã có phiếu nhân vật đề xuất — chờ nhóm duyệt |
| Hosting | GitHub Pages (xem `game/README.md`) |
| Đánh số phòng | Theo tài liệu giao diện: S3 Hồ sơ, S4 Phân tích ảnh, S5 Lưu trữ báo chí, S6 Dòng thời gian, S7 Tác động và chủ đích, S8 Phân loại và xử lý, S9 Boss |

## Chốt ngày 29/10/2026 (đợt 2 — chuyển sang game nhập vai đi lại được)

> Thay thế các mục tương ứng ở đợt 1 (âm thanh, độ phân giải, chat, bố cục).

| Mục | Quyết định |
|---|---|
| Kiểu game | Nhập vai góc nhìn từ trên xuống: người chơi đi lại trên bản đồ tràn toàn khung trình duyệt, nói chuyện với NPC |
| Engine | Phaser 3 (MIT) + bản đồ Tiled (JSON), nhóm có thể sửa bản đồ bằng Tiled |
| Đồ họa | Pixel art độ chi tiết cao; dùng gói asset CC0 cho nền/nội thất, Claude vẽ bổ sung nhân vật chính, NPC, boss (sprite 4 hướng có hoạt ảnh đi) |
| Nhạc | Nhạc CC0 có sẵn, đổi theo mốc (intro, văn phòng, ngoài trời, phòng điều tra, boss, kết thúc); ghi nguồn, luôn có nút tắt |
| Bối cảnh ngoài trời | Phố ven vịnh, quán cà phê, tòa soạn báo hư cấu, bến tàu du lịch (cảnh bình thường, không có tàu gặp nạn) |
| Intro | Hoạt cảnh pixel chạy trong game, có nút Bỏ qua; xong thì hiện nút Bắt đầu → nhận nhiệm vụ (có giới thiệu bối cảnh vụ án) |
| Điều khiển | Máy tính: WASD/mũi tên + E/Space. Điện thoại: phím ảo D-pad + nút hành động |
| Hội thoại | Khung thoại kiểu game cốt truyện ở cạnh dưới; giao nhiệm vụ, tra nguồn, trả lời, chấm đúng/sai, gợi ý đều diễn ra trong hội thoại |
| Trả lời | Kết hợp: chủ yếu chọn đáp án trong khung thoại; dữ kiện tự tra (ngày, tên tàu, nguyên nhân) thì gõ vào ô trong khung thoại |
| Gõ tự do với NPC | Bỏ (thay quyết định đợt 1) |
| Balo (khung dọc bên phải) | Sổ tay + thẻ evidence; lịch sử trò chuyện chia theo NPC; bảng ghim; bản đồ khu vực + danh sách nhiệm vụ |
| Thanh trên | Cài đặt và Nguồn dùng biểu tượng thay chữ |
| NPC | Đi tuần theo lộ trình, quay mặt về người chơi khi nói chuyện; ở mốc cốt truyện thì đi trước dẫn đường |
| Thời hạn | Trên 3 tuần |

## Chốt ngày 29/10/2026 (đợt 3)

| Mục | Quyết định |
|---|---|
| Thứ tự làm | Nội dung trước: dựng đủ Q3–Q13, boss, màn kết quả với hình tạm; sau đó mới thay art/nhạc, rồi bối cảnh ngoài trời |
| Phong cách đồ họa | Ấm áp, chi tiết (kiểu game nông trại / đời thường); tìm gói CC0 theo hướng này |
| NPC, tổ chức, boss | Đã duyệt: 6 NPC theo phiếu trong `npc_dialogues.json`; "Ban Điều phối Thông tin Du lịch Hải Đăng"; boss "Kẻ Dệt Chuyện" (biệt danh "Kẻ Giấu Mặt") |
| Thám tử | Đổi ngoại hình: sinh viên báo chí (áo khoác dù, balo, thẻ phóng viên thực tập, sổ tay, bút sau tai). Người chơi chọn mẫu nam / nữ ở cuối intro; lời thoại dùng "bạn" |
| Đối chiếu nguồn Q3–Q13 | Kiểm tra khi dựng từng phòng, như đã làm với Q1–Q2 |
| Nguyên nhân tai nạn (Q2) | Giữ câu hỏi, ghi rõ "theo phát biểu của lãnh đạo tỉnh tại họp báo 20/7", không phải kết luận điều tra |
| Nguồn báo cáo của nhóm | Báo cáo **cuối kỳ**; tác giả Trần Huỳnh Gia Hân, Đào Thị Mai Chi (2026). Tiêu đề lấy theo đề tài nền, nhóm đối chiếu lại với bìa |
| Video demo | Cần video 2–3 phút; Claude chuẩn bị kịch bản quay (tài liệu 01 mục 10) |
| GitHub | Tài khoản `ziahann` (chưa có repo công khai nào, kiểm tra 29/10/2026). Tạo repo + bật Pages khi game gần xong; Claude chỉ push khi được yêu cầu |
| Thời hạn | Ngày nộp còn rất lâu; không cần cắt phạm vi |
| Màn ghi công | Không cần (nguồn đã có ở nút Nguồn và README) |

## Đối chiếu nguồn Q7–Q13 (29/10/2026) — nhóm cần sửa báo cáo

| Dữ kiện | Báo cáo ghi | Nguồn thực tế (đã đọc) | Game dùng |
|---|---|---|---|
| F11 | Bài "anh Quý" ~89.000 cảm xúc, 23.700 bình luận, 1.000 chia sẻ; **fanpage** 260.000+ người theo dõi | VOH (21/7/2025): 22.000 lượt tương tác, 1.400 chia sẻ, hơn 4.000 bình luận; **tài khoản cá nhân** D.N.Q. hơn 260.000 người theo dõi. Không tìm thấy con số 89.000 ở nguồn nào (Dân trí không có số liệu) | Số liệu VOH, có trích nguồn |
| F12 | Link "Xem tiếp", "Đoạn kết", "Trọn vẹn câu chuyện" | Dân trí: "nhấp vào các đường link trong phần bình luận để đọc tiếp", trang "Tin Hay" nhiều quảng cáo, "có thể tiềm ẩn nhiều nguy cơ". VietTimes không có các cụm trên | Câu chữ của Dân trí |
| F14 | Công an thông báo xử lý (21/7) | Tuổi Trẻ đăng 21/7: Công an tỉnh làm việc ngày 20/7 với người bình luận sai về số người tử vong (23h30 ngày 19/7) | "Tuổi Trẻ đưa tin (21/7)" |
| F10 | Bão Yagi (2024) | VnExpress không ghi năm cơn bão; Congo tháng 10/2024; VietnamPlus: ảnh chụp tháng 8/2024 | Hỏi tên bão, quốc gia, năm chụp ảnh |

## Hoàn thiện (29/10/2026)

| Mục | Kết quả |
|---|---|
| Nội dung | Đủ Q1–Q13, Q10b thẩm vấn (tùy chọn), boss 3 pha với kết thúc A/B, màn kết quả S10, màn bonus G11 |
| Bản đồ | 5 bản đồ: văn phòng, phố ven vịnh (có bến tàu, không có tàu), tòa soạn, quán cà phê, phòng boss |
| Nhạc | CC0 của Juhani Junkala (JRPG Music Pack #2, #3, #4), 7 bản theo mốc |
| Đồ họa | Vẫn vẽ bằng code (`tools/gen-assets.mjs`), đã chỉnh tông ấm. Chưa ghép gói tile CC0: các gói CC0 phổ biến dùng ô 16px, phóng lên 32px sẽ lệch nét với nhân vật và vịnh đã vẽ. Nếu nhóm muốn, chọn một gói rồi Claude ghép lại |
| Video demo | Kịch bản ở `KỊCH BẢN VIDEO DEMO.md` |
