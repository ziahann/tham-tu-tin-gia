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
