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
- HTML/CSS/JS thuần, nội dung ở JSON; lưu tiến trình và chat bằng localStorage (`tfd_chat_log`, ...).
- Pixel: canvas 320x180, ô 16x16, `image-rendering: pixelated`, font hỗ trợ tiếng Việt có dấu.
- Hosting: GitHub Pages hoặc Netlify. Code trong `game/`.

## Cách làm việc
- Việc lớn: dùng plan mode trước, làm từng bước nhỏ, commit thường xuyên.
- Kiểm tra JSON hợp lệ sau mỗi lần sửa; test trên điện thoại và máy tính.
- Giao diện và lời thoại bằng tiếng Việt.
