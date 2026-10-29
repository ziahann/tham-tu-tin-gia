
> Game: Thám tử tin giả (ca ảnh AI giả về vụ lật tàu Vịnh Xanh 58, vịnh Hạ Long) Cách dùng: điền `[ĐIỀN]`. Chỗ ghi _(gợi ý)_ là đề xuất sẵn, bạn duyệt rồi xóa chữ "gợi ý". File liên quan: `02-noi-dung-npc.md` (nội dung, NPC, lưu chat), `03-cai-dat-chung.md` (cài đặt chung), `04-nhan-vat-cot-truyen-art.md` (nhân vật, boss, pixel), `05-kieu-choi-nhiem-vu.md` (nhiệm vụ, công cụ).

---

## 1. TỔNG QUAN TRẢI NGHIỆM

- Cảm giác muốn tạo ra: người chơi là thám tử ngồi ở văn phòng điều tra, đi qua từng phòng (hồ sơ, phân tích ảnh, lưu trữ báo chí, dòng thời gian, thẩm vấn) để tự thu thập bằng chứng, rồi đối đầu Kẻ Giấu Mặt ở cuối.
- Giọng điệu: **trang trọng, tôn trọng nạn nhân**. Đề tài là một thảm kịch có thật, nên game không "vui hóa" nỗi đau (xem mục 4.9 và file 03 mục 3).
- Một lượt chơi: 20p
- Nền tảng: web, chạy trên máy tính và điện thoại.

## 2. DANH SÁCH MÀN HÌNH

| Mã     | Màn hình                      | Mục đích                                                                      | Chuyển tiếp |
| ------ | ----------------------------- | ----------------------------------------------------------------------------- | ----------- |
| S0     | Trang chủ + cảnh báo nội dung | Tên game, nhãn GIẢ LẬP, **cảnh báo đề tài nhạy cảm**, nút bắt đầu             | S1          |
| S1     | Nhận vụ án                    | NPC giao vụ án, giới thiệu ba câu hỏi xác minh                                | S2          |
| S2     | Bản đồ văn phòng (hub)        | Chọn phòng điều tra; phòng mở dần theo tiến độ                                | các phòng   |
| S3     | Phòng Hồ sơ                   | Q1-Q2: xác định đối tượng thẩm định và sự kiện thật                           | S2          |
| S4     | Phòng Phân tích ảnh           | Q3-Q6: tìm ngược ảnh, soi lỗi AI, so sánh chéo, công cụ phát hiện AI          | S2          |
| S5     | Phòng Lưu trữ báo chí         | Q7: đối chiếu clip cũ và ảnh sai chú thích                                    | S2          |
| S6     | Phòng Dòng thời gian          | Q8: xếp dòng thời gian phát tán                                               | S2          |
| S7     | Phòng Tác động và chủ đích    | Q9-Q10: đánh giá tác động, tìm dấu hiệu chủ đích                              | S2          |
| S8     | Phòng Phân loại và xử lý      | Q11-Q12 (+Q13 tùy chọn): phân loại Information Disorder, phương án đính chính | S2          |
| S9     | Phòng Boss                    | Đối đầu Kẻ Giấu Mặt khi đủ thẻ evidence                                       | S10         |
| S10    | Kết quả                       | Tóm tắt, bảng "đã xác minh / chưa đủ căn cứ", nguồn, chơi lại                 | S0          |
| [ĐIỀN] | Màn phụ (nếu có)              |                                                                               |             |
|        |                               |                                                                               |             |

## 3. BỐ CỤC CHUNG (áp dụng cho S3-S8)

_(gợi ý)_ Chia 3 vùng:

```
+--------------------------------------------------------------+
| THANH TRÊN: tên game | phòng hiện tại | tiến độ | Sổ tay      |
+--------------------------------------------------------------+
|                           |                                  |
|  VÙNG TƯ LIỆU (trái)      |   VÙNG ĐIỀU TRA (phải)           |
|  mô phỏng pixel, bảng     |   câu hỏi, link công cụ / nguồn, |
|  kết quả công cụ, trích   |   ô điền evidence, nút Kiểm tra  |
|  báo (đã làm mờ nếu nhạy) |                                  |
|                           |                                  |
+--------------------------------------------------------------+
| KHUNG CHAT NPC (thu gọn được)                                |
+--------------------------------------------------------------+
| CHÂN TRANG: nhãn GIẢ LẬP | lưu ý điểm số | nút Nguồn         |
+--------------------------------------------------------------+
```

- Điện thoại: các vùng xếp dọc, khung chat thu gọn thành nút nổi.
- [ĐIỀN điều chỉnh bố cục nếu muốn khác]

## 4. TÍNH NĂNG CHI TIẾT

### 4.1. Chat với NPC

- Bong bóng chat, avatar pixel, tên và vai trò NPC.
- Tương tác: _(gợi ý)_ người chơi bấm câu hỏi có sẵn, không gõ tự do.
- Lịch sử chat xem lại được, lưu theo lượt chơi (cấu trúc ở file 02 mục 7).
- NPC không đưa đáp án trực tiếp; chỉ gợi hướng và nhắc quy trình.

### 4.2. Mở link nguồn và công cụ ngoài

- Mỗi nhiệm vụ có nút **"Mở công cụ / nguồn"** (tab mới, `rel="noopener noreferrer"`).
- Thẻ tài nguyên hiển thị: tên, loại (công cụ / bài báo), mô tả một dòng, trạng thái "đã mở".
- Mỗi nguồn quan trọng có **bản dự phòng** trong game (ảnh chụp có chú thích nguồn) phòng khi link chết.

### 4.3. Hồ sơ evidence (ô điền)

- Người chơi tự điền evidence đã tìm được (chữ, ngày, chọn từ danh sách, kéo thả).
- Nút **Kiểm tra** cho ba kết quả: đúng / một phần / chưa đạt. Chưa đạt cho thử lại.
- Khi đúng: hiện **kết luận nhỏ** + thẻ evidence được thêm vào sổ tay.

### 4.4. Sổ tay thám tử và bảng ghim

- Sổ tay: danh sách thẻ evidence đã thu thập, nguồn và mệnh đề liên quan.
- Bảng ghim: kéo thẻ evidence nối với các mệnh đề; gắn nhãn Có cơ sở / Sai / Chưa đủ căn cứ.
- Ở phòng Boss, các thẻ trong sổ tay là "vũ khí" phản bác. Boss sẽ tấn công bằng cách chứng minh bản thân đưa tin thật, người chơi tấn công bằng cách đưa ra các bằng chứng bảo vệ. 

### 4.5. Công cụ nhúng trong game

- **Kính soi lỗi AI (mô phỏng):** xem lưới ảnh mô phỏng pixel, bấm khoanh vùng lỗi (tàu khác nhau, chữ méo, chi tiết đổi).
- **Bảng kết quả công cụ phát hiện AI (bản ghi lại):** hiển thị kết quả đã ghi ngày 11/10/2026 theo báo cáo, để người chơi đọc và diễn giải.
- **Đồng hồ dòng thời gian:** kéo thả mốc ngày.
- Mọi công cụ mô phỏng phải có nhãn **MÔ PHỎNG / GIẢ LẬP**.

### 4.6. Gợi ý và điểm

- Gợi ý 3 cấp, mỗi cấp trừ điểm nhẹ.
- Điểm: [ĐIỀN cách tính, xem file 05 mục 7].
- **Bắt buộc:** ở S10 và chân trang luôn có dòng: "Điểm số và chiến thắng chỉ đo kết quả chơi, không chứng minh thông tin đúng hay sai."

### 4.7. Phản hồi sau mỗi lần kiểm tra

- Thẻ phản hồi gồm: (1) đúng / một phần / chưa đạt, (2) giải thích, (3) dẫn chứng thật kèm nguồn, (4) nút Tiếp tục.
- Làm sai không kết thúc game; có hậu quả nhẹ rồi cho thử lại.

### 4.8. Nhãn GIẢ LẬP

- Dải nhãn cố định ở thanh trên và chân trang khi ở phần hư cấu (NPC, tổ chức, Kẻ Giấu Mặt, công cụ mô phỏng).
- Tên tổ chức và nhân vật dùng tên hư cấu; không dùng logo hay thương hiệu thật.

### 4.9. Xử lý hình ảnh nhạy cảm (bắt buộc)

- **Không hiển thị** ảnh nạn nhân thật, ảnh trẻ em thật, hay cảnh dựng lại tai nạn.
- Ảnh AI giả dùng làm bằng chứng: chỉ hiển thị dạng **mô phỏng pixel** hoặc ảnh chụp bài báo đã **làm mờ + gạch chéo + nhãn "ẢNH GIẢ"**, đúng nguyên tắc báo cáo đề xuất (gạch chéo hoặc làm mờ ảnh giả khi đính chính).
- Ảnh gốc của gia đình có ảnh thật bị gắn sai chú thích: chỉ mô tả bằng chữ, không hiển thị.
- Có nút "Ẩn hình ảnh nhạy cảm" ở thanh trên (mặc định bật).

### 4.10. Lưu tiến trình

- Tự lưu sau mỗi nhiệm vụ vào trình duyệt; nút "Chơi tiếp" và "Chơi lại từ đầu".
- [ĐIỀN: có cho xuất kết quả (ảnh/PDF) không?]

## 5. GIAO DIỆN VÀ PHONG CÁCH (pixel)

> Thông số pixel chi tiết ở `04-nhan-vat-cot-truyen-art.md` mục 6.

|Hạng mục|Quyết định|
|---|---|
|Chủ đề thị giác|Văn phòng điều tra pixel, bảng ghim, ghi chú dán|
|Bảng màu|[ĐIỀN, gợi ý: tông lạnh, trầm, dịu; màu nhấn đỏ đậm cho cảnh báo; tránh sắc độ gợi cảnh tai nạn]|
|Màu trạng thái|Đúng: [ĐIỀN] / Sai: [ĐIỀN] / Một phần: [ĐIỀN] / Chưa đủ căn cứ: [ĐIỀN]|
|Font|[ĐIỀN, cần hỗ trợ đủ dấu tiếng Việt]|
|Hoạt ảnh|Nhẹ, tôn trọng "giảm chuyển động"; không hiệu ứng giật mình|
|Âm thanh|[ĐIỀN: có / không]; nhạc trầm, nút tắt tiếng luôn hiển thị|

**Không dùng màu để truyền đạt đúng/sai một mình:** luôn kèm biểu tượng và chữ.

## 6. MÔ TẢ TỪNG MÀN (điền chi tiết)

### S0. Trang chủ + cảnh báo

- Nội dung cảnh báo _(gợi ý)_: "Game dựa trên một vụ tai nạn có thật. Nội dung nhắc đến thiệt hại về người. Game không hiển thị hình ảnh nạn nhân. Bạn có thể thoát bất cứ lúc nào."
- Nút: Bắt đầu / Hướng dẫn / [ĐIỀN]

### S1. Nhận vụ án

- NPC xuất hiện: [ĐIỀN]
- Hiển thị ba câu hỏi xác minh của vụ án _(theo báo cáo mục 4.1)_: (1) ảnh thật hay AI; (2) nhân vật có phải nạn nhân thật; (3) cách trình bày có khiến người xem hiểu nhầm không.

### S2. Bản đồ văn phòng

- Các phòng và khóa mở: [ĐIỀN, gợi ý: mở tuần tự S3 → S4 → S5 → S6 → S7 → S8, phòng Boss mở khi đủ thẻ evidence tối thiểu]
- Hiển thị tiến độ từng phòng.

### S3-S8. Các phòng điều tra

- Nội dung từng nhiệm vụ: xem `05-kieu-choi-nhiem-vu.md` mục 4.
- Giao diện riêng của từng phòng: [ĐIỀN]

### S9. Phòng Boss

- Thanh "uy tín lập luận" của Kẻ Giấu Mặt theo 3 pha; thẻ evidence ở dưới; không có hình ảnh gợi cảnh tai nạn.
- Chi tiết: file 04 mục 4, file 05 mục 6.

### S10. Kết quả

- Hiển thị: [ĐIỀN, gợi ý: danh hiệu, số thẻ evidence, câu chốt học tập]
- Bảng "Đã xác minh / Chưa đủ căn cứ" lấy từ báo cáo (xem file 02 mục 4, F13).
- Nút: Chơi lại / Xem nguồn / [ĐIỀN]

## 7. TRẠNG THÁI VÀ XỬ LÝ LỖI

- Chưa điền mà bấm Kiểm tra: nhắc nhẹ, không chuyển màn.
- Link ngoài không mở được: hiện bản dự phòng.
- Không có mạng: chế độ dùng ảnh và nội dung dự phòng.
- Mất dữ liệu lưu: về S0 kèm thông báo.
- [ĐIỀN thêm]

## 8. KHẢ NĂNG TIẾP CẬN

- [ ] Dùng được bằng bàn phím (Tab, Enter, Esc)
- [ ] Ảnh mô phỏng có mô tả thay thế (alt) bằng tiếng Việt
- [ ] Độ tương phản chữ đủ đọc
- [ ] Không phụ thuộc màu sắc đơn thuần
- [ ] Tùy chọn giảm chuyển động và tắt âm thanh

## 9. THIẾT BỊ HỖ TRỢ

|Thiết bị|Chiều rộng|Yêu cầu|
|---|---|---|
|Điện thoại|360-430px|[ĐIỀN, gợi ý: bố cục dọc, nút lớn]|
|Máy tính bảng|768px|[ĐIỀN]|
|Máy tính|1024px trở lên|[ĐIỀN]|

## 10. DỰ KIẾN VIDEO DEMO (2-3 phút)

|Thời điểm|Cảnh|
|---|---|
|0:00-0:20|Giới thiệu game, cảnh báo nội dung, nhãn GIẢ LẬP|
|0:20-1:10|Một nhiệm vụ: mở công cụ, tự thu thập evidence, điền hồ sơ, nhận kết luận nhỏ|
|1:10-2:10|Bảng ghim, chat NPC, đối đầu Kẻ Giấu Mặt|
|2:10-2:40|Màn kết quả, bảng "chưa đủ căn cứ", lưu ý điểm số|
|[ĐIỀN]||