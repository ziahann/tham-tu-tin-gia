
> Game: Thám tử tin giả (ca ảnh AI giả về vụ lật tàu Vịnh Xanh 58, vịnh Hạ Long) Cách dùng: điền `[ĐIỀN]`. Chỗ ghi _(gợi ý)_ là đề xuất sẵn, bạn duyệt rồi xóa chữ "gợi ý". File liên quan: `04-nhan-vat-cot-truyen-art.md` (boss, art), `02-noi-dung-npc.md` (bảng dữ kiện F1-F16, lưu chat).

---

## 1. VÒNG LẶP CỐT LÕI

```
[Nhận câu hỏi điều tra]
        |
[Mở link công cụ / nguồn (tab mới) hoặc dùng công cụ nhúng]
        |
[Tự tìm và thu thập evidence]
        |
[Điền evidence vào Hồ sơ] --> hệ thống kiểm tra
        |
[Kết luận nhỏ + thẻ evidence] --> ghim vào Bảng manh mối
        |
[Mở khóa nhiệm vụ / phòng kế tiếp] ... --> [Boss: Kẻ Giấu Mặt]
```

Nguyên tắc: **người chơi tự đi tìm bằng chứng ngoài đời thật** rồi điền vào hồ sơ. Game chỉ kiểm tra evidence và giải thích bằng dữ kiện có nguồn.

**Quy tắc xử lý ảnh nhạy cảm:** các nhiệm vụ dùng tư liệu về ảnh AI giả đều dùng bản mô phỏng pixel hoặc ảnh đã làm mờ, gạch chéo, có nhãn "ẢNH GIẢ". Khuyến khích người chơi **không tìm lại và không đăng lại** ảnh AI giả; link công cụ chỉ để thử với ảnh khác.

## 2. CÁC KIỂU CHƠI (mini-game)

|Mã|Kiểu chơi|Cách chơi|Kỹ năng dạy|Dùng ở|
|---|---|---|---|---|
|G1|**Điền evidence**|Mở link, tìm thông tin, điền vào ô (chữ, ngày, chọn từ danh sách)|Truy nguồn, đọc kỹ|Q2, Q3, Q6|
|G2|**Chọn thẻ mệnh đề**|Chọn đúng các đối tượng cần thẩm định trong nhiều thẻ|Bước Stop|Q1|
|G3|**Kính soi lỗi AI**|Bấm khoanh các vùng lỗi trên lưới mô phỏng|Nhận diện dấu hiệu ảnh AI|Q4|
|G4|**Xếp dòng thời gian**|Kéo thả mốc ngày vào đúng thứ tự|Dòng thời gian phát tán|Q8|
|G5|**Đọc kết quả công cụ**|Đọc bảng kết quả, chọn kết luận đúng / quá mức|Hiểu giới hạn công cụ|Q6|
|G6|**Bảng ghim nối dây**|Nối thẻ evidence với mệnh đề, gắn nhãn|Tổng hợp bằng chứng|Q5, Q7, Q9|
|G7|**Thẩm vấn**|Chọn câu hỏi cho NPC nhân chứng hư cấu, phát hiện mâu thuẫn|Nhận diện thiếu nguồn|Q10 (tùy chọn)|
|G8|**Phân loại theo chủ thể**|Gắn nhãn Mis / Dis / Mal cho từng nhóm chủ thể và chọn bằng chứng|Phân biệt Information Disorder|Q11|
|G9|**Chọn phương án xử lý**|Chọn và sắp xếp các bước đính chính|Đạo đức, đính chính nhân văn|Q12|
|G10|**Đối đầu boss bằng thẻ**|Boss tuyên bố sai, người chơi chọn thẻ phản bác|Lập luận từ bằng chứng|Boss|
|G11|**Màn bonus "mạo danh giả lập"** _(tùy chọn)_|Nhận diện dấu hiệu giả mạo trên ảnh tĩnh **có nhãn GIẢ LẬP**, tên tổ chức hư cấu|Nhận diện mạo danh|Bonus|

Nhóm chọn kiểu chơi nào bỏ / thêm: [ĐIỀN]

## 3. LƯỢC ĐỒ NHIỆM VỤ (`data/quests.json`)

```json
{
  "id": "q3_lens",
  "order": 3,
  "room": "S4",
  "title": "[ĐIỀN, ví dụ: Dấu vết đầu tiên]",
  "mode": "G1",
  "npcIntro": "[ĐIỀN lời giao việc của NPC]",
  "question": "Tìm ngược các hình ảnh trong vụ án. Có bản nào từ hãng tin, phóng viên hay nhân chứng tại hiện trường không? Các kết quả trùng khớp thuộc loại nào?",
  "resources": [
    { "label": "Google Lens", "url": "https://lens.google.com", "type": "tool" },
    { "label": "Bài của VTV (Thu Thảo, 2025)", "url": "[ĐIỀN URL]", "type": "source" },
    { "label": "Bài của Dân trí (Thương Huyền & Minh Nhật, 2025)", "url": "[ĐIỀN URL]", "type": "source" }
  ],
  "safetyNote": "Dùng bản mô phỏng trong game. Không đăng lại ảnh AI giả.",
  "fields": [
    {
      "id": "has_original",
      "label": "Có tìm thấy bản gốc từ hãng tin / phóng viên / nhân chứng không?",
      "input": "choice",
      "options": ["Có", "Không"],
      "accepts": ["Không"]
    },
    {
      "id": "match_type",
      "label": "Các kết quả trùng khớp chủ yếu là loại nào?",
      "input": "choice",
      "options": ["Ảnh hiện trường", "Bài cảnh báo ảnh giả", "Ảnh lưu trữ", "Không có kết quả"],
      "accepts": ["Bài cảnh báo ảnh giả"]
    }
  ],
  "hints": [
    { "level": 1, "text": "[ĐIỀN gợi ý nhẹ]" },
    { "level": 2, "text": "[ĐIỀN gợi ý rõ hơn]" },
    { "level": 3, "text": "[ĐIỀN gợi ý gần đáp án, trừ điểm]" }
  ],
  "feedback": {
    "correct": "[ĐIỀN, kèm dữ kiện F5 và nguồn]",
    "partial": "[ĐIỀN]",
    "wrong": "[ĐIỀN, không nói thẳng đáp án]"
  },
  "conclusion": "Không có nguồn hiện trường nào cho các ảnh này; kết quả trùng khớp chủ yếu là bài cảnh báo ảnh giả.",
  "evidenceCards": [
    { "id": "ev_f5", "factId": "F5", "title": "Không có bản gốc từ hiện trường" }
  ],
  "unlocks": ["q4_flaws"],
  "pinboard": { "x": 120, "y": 80, "linkedTo": ["claim_ai_images"] },
  "sources": ["google_lens", "thuthao2025", "thuonghuyen2025"]
}
```

Giải thích:

- `mode`: mã kiểu chơi ở mục 2.
- `resources`: link công cụ / nguồn mở ở tab mới.
- `fields`: các ô người chơi phải điền; `accepts` là đáp án chấp nhận.
- `hints`: 3 cấp gợi ý, mỗi cấp trừ điểm.
- `evidenceCards`: thẻ evidence nhận được, dùng lại ở bảng ghim và ở boss.
- `unlocks`: nhiệm vụ mở khi hoàn thành.
- `sources`: khóa trong `data/sources.json` (xem `03-cai-dat-chung.md` mục 12).

## 4. DANH SÁCH NHIỆM VỤ (điền sẵn từ báo cáo)

> Đáp án lấy từ báo cáo. Dữ kiện F1-F16 xem `02-noi-dung-npc.md` mục 4. URL bài báo nhóm tự điền từ danh mục tham khảo.

### Phòng Hồ sơ (S3)

**Q1. Stop: những gì cần thẩm định?**

- Kiểu: G2
- Tài nguyên: bài VTV [ĐIỀN URL], bài Dân trí [ĐIỀN URL]
- Người chơi chọn đúng các thẻ _(gợi ý)_:
    1. Ảnh và câu chuyện "nạn nhân" do AI dựng trên các fanpage
    2. Clip bão Yagi (2024) và clip chìm tàu Congo (10/2024) bị gán nhãn vụ 19/7
    3. Ảnh nhóm trẻ du lịch Hạ Long năm 2024 bị gắn chú thích sai
- Thẻ nhiễu _(gợi ý)_: "Vụ lật tàu Vịnh Xanh 58 không có thật" (**sai**, tai nạn có thật), "Mọi ảnh về vụ việc đều là giả", "Mọi người chia sẻ đều cố ý lừa" (quá mức)
- Câu hỏi xác minh người chơi ghi vào hồ sơ (báo cáo mục 4.1): (1) ảnh thật hay AI; (2) nhân vật có phải nạn nhân thật; (3) cách trình bày có gây hiểu nhầm
- Kết luận nhỏ: tai nạn là thật; cần thẩm định riêng từng nhóm nội dung đi kèm.
- Mở khóa: Q2

**Q2. Xác lập sự kiện thật**

- Kiểu: G1
- Tài nguyên: bài báo chính thống [ĐIỀN: chọn 1-2 bài trong danh mục nguồn]
- Ô điền: ngày xảy ra (19/7/2025); địa điểm (vịnh Hạ Long, Quảng Ninh); tên tàu (Vịnh Xanh 58, QN-7105); nguyên nhân theo nguồn (giông lốc); số người trên tàu / được cứu [ĐIỀN: chốt sau khi đối chiếu nguồn, báo cáo ghi 49 / 10]
- Kết luận nhỏ: đây là sự kiện có thật, làm mốc để so với các nội dung lan truyền.
- Dữ kiện: F1, F2
- Mở khóa: Q3

### Phòng Phân tích ảnh (S4)

**Q3. Tìm ngược hình ảnh**

- Kiểu: G1 (xem JSON mẫu ở mục 3)
- Công cụ: Google Lens (lens.google.com); bài báo [ĐIỀN URL]
- Kết quả theo báo cáo: không tìm thấy bản từ hãng tin, phóng viên, nhân chứng; kết quả trùng khớp là bài cảnh báo ảnh giả.
- Kết luận nhỏ: không có nguồn hiện trường cho các ảnh.
- Dữ kiện: F4, F5
- Mở khóa: Q4

**Q4. Kính soi lỗi AI**

- Kiểu: G3 (lưới mô phỏng pixel trừu tượng, không có mặt người thật)
- Nhiệm vụ: khoanh 4 nhóm dấu hiệu _(theo báo cáo)_:
    - Tàu gặp nạn có hình dạng khác nhau ở các ô 2, 5, 7, 12 và không khớp tàu thật
    - Chữ trên áo nhân vật ở ô 9 méo, vô nghĩa
    - Chi tiết thay đổi giữa ô 5 và ô 12 dù cùng nhóm nhân vật
    - Góc chụp cận cảnh giữa biển lúc tàu chìm không có người chụp hợp lý [ĐIỀN: ô số mấy nếu muốn nêu]
- Kết luận nhỏ: nhiều dấu hiệu vật lý đặc trưng của ảnh AI; quan sát bằng mắt là một lớp bằng chứng.
- Dữ kiện: F6
- Mở khóa: Q5

**Q5. So sánh chéo hai bộ ảnh**

- Kiểu: G6
- Nhiệm vụ: ghép hai bộ ảnh (lưới 9 ảnh và bộ 12 ô), tìm ảnh xuất hiện ở cả hai (người cha cài áo phao cho con, hiển thị bằng mô phỏng, không dùng ảnh thật).
- Kết luận nhỏ: cùng một ảnh AI được nhiều trang dùng lại.
- Dữ kiện: F8
- Mở khóa: Q6

**Q6. Đọc kết quả công cụ phát hiện AI**

- Kiểu: G5 + G1
- Công cụ: Hive Moderation, AI-generated content detection (https://hivemoderation.com/ai-generated-content-detection). Người chơi **thử với một ảnh tự chọn không liên quan thảm kịch** để biết công cụ hoạt động; kết quả cho vụ án lấy từ "bảng kết quả đã ghi ngày 11/10/2026" trong game.
- Ô điền: khả năng ảnh AI (99,9%); deepfake (0%); nguồn tạo dự đoán (Imagen 4, Gemini); có Content Credentials không (không tìm thấy)
- Câu hỏi diễn giải _(gợi ý)_: chọn kết luận đúng:
    - Đúng: "Kết quả là dữ liệu bổ trợ cùng các bằng chứng khác." / "Dự đoán nguồn tạo là ước lượng của công cụ."
    - Sai: "99,9% nghĩa là chắc chắn 100%." / "Không có Content Credentials nghĩa là ảnh là thật."
- Giới hạn nên nhắc: chỉ ô 3 và 11 được kiểm tra; ô 6 và 10 bị làm mờ nên không đánh giá.
- Kết luận nhỏ: các nguồn độc lập cùng dẫn đến kết luận ảnh do AI tạo, công cụ chỉ bổ trợ.
- Dữ kiện: F7
- Mở khóa: Q7

### Phòng Lưu trữ báo chí (S5) và Dòng thời gian (S6)

**Q7. Clip cũ và ảnh sai chú thích**

- Kiểu: G6 (nối thẻ với nhãn)
- Tài nguyên: VnExpress [ĐIỀN URL], VietnamPlus [ĐIỀN URL], Phụ Nữ Online [ĐIỀN URL]
- Nối _(theo báo cáo)_:
    - Clip tàu chìm do bão Yagi (2024): thật, bị gán nhãn vụ 19/7 → **sai ngữ cảnh**
    - Clip chìm tàu tại Congo (10/2024): thật, bị gán nhãn vụ 19/7 → **sai ngữ cảnh**
    - Ảnh nhóm trẻ du lịch Hạ Long 2024: ảnh thật, chú thích gây hiểu nhầm → **sai ngữ cảnh / thông tin xuyên tạc** (chỉ mô tả bằng chữ, không hiển thị ảnh)
    - Ảnh AI nạn nhân và gia đình hư cấu → **do AI tạo**, khác với ba loại trên
- Ghi chú giới hạn: nhóm không tự tìm ngược các clip này mà dựa vào đối chiếu của báo chí; game cũng yêu cầu người chơi đọc nguồn, không tự tìm ngược.
- Kết luận nhỏ: ảnh/clip thật vẫn có thể gây hiểu sai khi gắn sai bối cảnh.
- Dữ kiện: F10
- Mở khóa: Q8

**Q8. Xếp dòng thời gian phát tán**

- Kiểu: G4
- Mốc cần xếp _(theo báo cáo bảng 1)_:
    - Chiều 19/7: tai nạn xảy ra; các fanpage và tài khoản bắt đầu đăng câu chuyện về "nạn nhân"
    - Tối 20/7: một số fanpage lên tiếng phản đối việc dùng AI dựng chuyện thương tâm
    - Đến 21/7: M.P.V. đã đăng hơn 10 bài; M.C.O. đăng nhiều nội dung tương tự rồi bị khóa
    - 21/7: Công an tỉnh Quảng Ninh thông tin về việc xử lý người đăng tin sai sự thật
    - 22/7: VTV đăng bài phản ánh
- Kết luận nhỏ: thông tin sai nhen nhóm từ ngay chiều xảy ra tai nạn, rầm rộ trong 20-22/7; biện pháp xử lý đi sau tốc độ lan truyền.
- Ghi chú: chưa xác định được thời điểm đăng đầu tiên (F13).
- Dữ kiện: F3, F11, F14
- Mở khóa: Q9

### Phòng Tác động và chủ đích (S7)

**Q9. Bảng ghim: đã ghi nhận hay mới là nguy cơ?**

- Kiểu: G6
- Gắn nhãn cho từng tác động _(theo báo cáo bảng 2)_:
    - Người dùng nhầm nhân vật AI là nạn nhân thật, để lại lời chia buồn → **Đã ghi nhận**
    - Cộng đồng phẫn nộ, bài lên án thu hút hơn 200 bình luận → **Đã ghi nhận**
    - Gia đình có ảnh thật bị gắn sai chú thích bức xúc, lên tiếng đính chính → **Đã ghi nhận**
    - Nền tảng phải can thiệp, khóa trang; báo chí phải đính chính → **Đã ghi nhận**
    - Tin thất thiệt gây hoang mang, ảnh hưởng cứu nạn, an ninh trật tự → **Đã ghi nhận với tin sai nói chung**, không riêng ảnh AI
    - Gia đình nạn nhân tổn thương tinh thần → **Nguy cơ** (nhận định chuyên gia, chưa có phát ngôn trực tiếp)
    - Thiệt hại kinh tế du lịch vịnh Hạ Long → **Nguy cơ / dự báo** (hình ảnh bị ảnh hưởng đã ghi nhận qua phát ngôn của ngành du lịch; chưa có số liệu hủy tour)
- Ô điền: số liệu của một bài "gia đình anh Quý": ~89.000 cảm xúc, 23.700 bình luận, 1.000 chia sẻ; ghi chú: không phải tổng tiếp cận.
- Kết luận nhỏ: phân biệt rõ điều đã có chứng cứ với điều mới là nguy cơ.
- Dữ kiện: F11, F15
- Mở khóa: Q10

**Q10. Dấu hiệu chủ đích (và giới hạn)**

- Kiểu: G1 + G6 (tùy chọn kèm G7 thẩm vấn)
- Tài nguyên: VTV [ĐIỀN URL], Dân trí [ĐIỀN URL], VietTimes [ĐIỀN URL]
- Người chơi chọn các dấu hiệu _(theo báo cáo mục 6.1)_:
    - Tần suất: một fanpage đăng hơn 10 bài trong hai ngày đầu
    - Quy mô: có trang hơn 260.000 người theo dõi tham gia
    - Thủ pháp: kể chuyện ngắt quãng, link "Xem tiếp" dẫn sang website ngoài
    - Ghi chú "tình tiết hư cấu" khó thấy hoặc không có, cho thấy người đăng biết nội dung không có thật
- Câu chọn "điều **chưa** thể kết luận": doanh thu / động cơ tài chính trực tiếp; danh tính cá nhân; việc mọi tài khoản có cùng mục đích; thời điểm đăng đầu tiên
- Kết luận nhỏ: có dấu hiệu chủ đích thu hút tương tác ở nhóm đăng truyện AI, nhưng chưa đủ căn cứ về danh tính và động cơ tài chính.
- Dữ kiện: F9, F11, F12, F13, F16
- Mở khóa: Q11

### Phòng Phân loại và xử lý (S8)

**Q11. Phân loại theo từng nhóm chủ thể**

- Kiểu: G8
- Gắn nhãn và chọn bằng chứng _(theo báo cáo, kèm lưu ý)_:

|Nhóm|Nhãn gợi ý|Căn cứ|Lưu ý|
|---|---|---|---|
|Người tạo ảnh AI và truyện hư cấu gắn vào thảm kịch|Disinformation|Dấu hiệu chủ đích (F11, F12, F16)|Chưa định danh cá nhân; chưa khẳng định động cơ tài chính|
|Người gán nhãn clip cũ (Yagi, Congo) và chú thích sai ảnh 2024|[ĐIỀN: Disinformation theo báo cáo mục 3, hoặc "chưa đủ căn cứ chủ đích" nếu nhóm muốn thận trọng]|Báo chí ghi nhận gán nhãn "cố tình" (F10)|Bằng chứng chủ đích ở nhóm này mỏng hơn nhóm tạo truyện AI; nhóm tự cân nhắc|
|Người dùng thông thường chia sẻ vì thương cảm|Misinformation|Không có ý gây hại nhưng vẫn khuếch đại||
|Người nổi tiếng _(hư cấu trong game)_ vô tình chia sẻ ảnh trong bối cảnh tin sai lan truyền|Misinformation|Không có ý định gây hiểu nhầm|Dùng nhân vật hư cấu, không dùng tên người thật|
|Người đăng lại ảnh giả để lên án|Không phải tin giả, nhưng cần làm mờ / gạch chéo|Báo cáo mục 6.2||

- Kết luận nhỏ: một sự việc có thể có nhiều loại sai lệch; phân loại theo từng chủ thể.
- Mở khóa: Q12

**Q12. Quyết định xử lý và đính chính**

- Kiểu: G9
- Đáp án đúng _(theo báo cáo mục 5-6)_:
    - Đính chính công khai trên báo chí, làm rõ tàu Vịnh Xanh 58 là tàu nhỏ, không phải du thuyền lớn như ảnh AI mô tả
    - Cập nhật liên tục thông tin chính thức từ hiện trường
    - Kiến nghị nền tảng gỡ nội dung vi phạm; phối hợp cơ quan chức năng xử lý
    - Khi đính chính: **gạch chéo hoặc làm mờ** ảnh giả và ghi chú rõ là ảnh giả
    - Truyền thông nguyên tắc "Không tin ngay – Không vội chia sẻ – Kiểm tra nguồn tin"
    - Khi biết mình chia sẻ sai: gỡ hoặc đính chính công khai, không lặng lẽ xóa
- Phương án sai _(gợi ý)_: đăng nguyên ảnh AI để cảnh báo; xóa lặng lẽ; **công khai danh tính cá nhân đứng sau trang khi chưa xác minh**; dùng ảnh thật của gia đình nạn nhân để "chứng minh" ảnh kia là giả; kết luận chắc chắn mọi tài khoản đều trục lợi
- Kết luận nhỏ: đính chính phải minh bạch và nhân văn.
- Dữ kiện: F14
- Mở khóa: Boss

**Q13 _(tùy chọn)_. Trách nhiệm nền tảng**

- Kiểu: G6
- Nội dung _(theo báo cáo mục 6.3)_: cơ chế ưu tiên tương tác đẩy nội dung gây xúc động mạnh, bất kể thật giả; khóa trang diễn ra sau khi đã đăng nhiều bài, đi sau tốc độ lan truyền.
- [ĐIỀN: câu hỏi và đáp án]

### BOSS: Kẻ Giấu Mặt

- Kiểu: G10; chi tiết ba pha ở `04-nhan-vat-cot-truyen-art.md` mục 4. Cơ chế ở mục 6 dưới đây.

## 5. CÔNG CỤ VÀ LIÊN KẾT

> Kiểm tra từng link còn hoạt động trước khi nộp. Link bài báo nhóm tự điền từ danh mục tham khảo của báo cáo (PDF bị ngắt dòng, không sao chép nguyên văn).

|Mục|Dùng cho|URL|Ghi chú|
|---|---|---|---|
|Google Lens|Tìm ngược hình (Q3)|https://lens.google.com|Mở tab mới|
|Hive Moderation (AI-generated content detection)|Q6|https://hivemoderation.com/ai-generated-content-detection|Chỉ thử với ảnh tự chọn không liên quan thảm kịch; kết quả vụ án là bản ghi 11/10/2026|
|Wayback Machine|Dự phòng khi link chết|https://web.archive.org||
|Bài Thời báo VTV (Thu Thảo, 2025)|Q1, Q3, Q8, Q10|[ĐIỀN]||
|Bài Dân trí (Thương Huyền & Minh Nhật, 2025)|Q1, Q3, Q9, Q10|[ĐIỀN]||
|Bài VOH (T.H., 2025)|Q8, Q10|[ĐIỀN]||
|Bài VnExpress (Hoài Anh, 2025)|Q7|[ĐIỀN]||
|Bài VietnamPlus (Minh Thu, 2025)|Q7|[ĐIỀN]||
|Bài Phụ Nữ Online (Phạm Phước Dũng, 2025)|Q7|[ĐIỀN]||
|Bài Tuổi Trẻ (M. Anh, 2025)|Q8|[ĐIỀN]||
|Bài VietTimes (Đăng Khoa, 2025)|Q10|[ĐIỀN]||
|Bài Tiền Phong, Lao Động, Báo Văn Hóa|Bối cảnh bổ sung|[ĐIỀN]||

**Công cụ nhúng trong game (tự làm):**

- Kính soi lỗi AI (lưới mô phỏng), đồng hồ dòng thời gian, bảng ghim nối dây, sổ tay evidence, bảng kết quả công cụ (bản ghi).
- Mọi công cụ mô phỏng có nhãn **GIẢ LẬP / MÔ PHỎNG**.

**Lưu ý kỹ thuật cho link ngoài:**

- Mở tab mới, thêm `rel="noopener noreferrer"`; nhiều trang không cho nhúng iframe.
- Mỗi nguồn quan trọng có **bản dự phòng** (ảnh chụp bài, đã xử lý nhạy cảm, có chú thích nguồn) trong `assets/evidence/`.
- Không gửi dữ liệu người chơi lên trang ngoài.
- Không yêu cầu người chơi tải ảnh nạn nhân hay ảnh AI giả lên công cụ nào.

## 6. CƠ CHẾ BOSS

- Boss có thanh "uy tín lập luận" chia 3 pha (xem file 04 mục 4.2).
- Mỗi lượt: boss nói một tuyên bố sai; người chơi chọn thẻ từ sổ tay để phản bác. Thẻ đúng làm giảm thanh uy tín; thẻ sai không gây "chết" mà làm boss thêm một lượt.
- Pha 3 có **thẻ bẫy**: "tiết lộ danh tính một cá nhân/trang", "chắc chắn trục lợi tài chính". Chọn sẽ dẫn đến kết thúc B.
- Thẻ "Chưa đủ căn cứ" (F13) là thẻ quan trọng nhất ở pha 3.
- Không có hình ảnh, âm thanh gợi cảnh tai nạn; không dùng ảnh AI giả làm "đạn" cho boss.
- Số thẻ evidence tối thiểu để mở phòng Boss: [ĐIỀN, gợi ý: 8 trên 12].

## 7. CHẤM EVIDENCE, ĐIỂM VÀ ĐỘ KHÓ

- Chuẩn hóa đáp án: bỏ dấu, chữ thường, bỏ khoảng trắng thừa; chấp nhận nhiều cách viết.
- Ba trạng thái: đúng / một phần / chưa đạt. Chưa đạt không khóa cứng, cho thử lại.
- Gợi ý 3 cấp, mỗi cấp trừ điểm nhẹ.
- Nút "Tôi không tìm được": cho xem hướng dẫn từng bước rồi tiếp tục.
- Mỗi nhiệm vụ dự kiến [ĐIỀN, gợi ý: 1-3 phút]; toàn game [ĐIỀN, gợi ý: 20-30 phút].
- Không có mạng: bật chế độ dùng nội dung dự phòng.

|Hành động|Điểm|
|---|---|
|Đúng ngay lần đầu|[ĐIỀN]|
|Đúng sau gợi ý|[ĐIỀN]|
|Một phần|[ĐIỀN]|
|Thắng một pha boss|[ĐIỀN]|

- Danh hiệu: [ĐIỀN, gợi ý: Thực tập, Thẩm định viên, Thám tử kiểm chứng]
- **Bắt buộc:** bảng kết quả và chân trang có dòng "Điểm số và chiến thắng chỉ đo kết quả chơi, không chứng minh thông tin đúng hay sai."

## 8. LƯU TRỮ TIẾN TRÌNH

Dùng cấu trúc lưu của `02-noi-dung-npc.md` mục 6, bổ sung:

```json
{
  "questProgress": {
    "q1_stop": { "status": "done", "hints": 0, "answers": { "claims": ["c1","c2","c3"] } },
    "q3_lens": { "status": "in_progress", "hints": 1, "answers": {} }
  },
  "evidenceCards": ["ev_f1", "ev_f5"],
  "pinboard": [ { "evidenceId": "ev_f5", "claimId": "claim_ai_images", "label": "ai_generated" } ],
  "bossProgress": { "phase": 0, "cardsUsed": [] },
  "settings": { "hideSensitiveImages": true, "muted": false }
}
```

Không lưu tên thật hay dữ liệu định danh. Có nút "Xóa dữ liệu của tôi".

## 9. VIỆC CẦN CHỐT

- [ ] Giữ / bỏ các nhiệm vụ tùy chọn (Q10 thẩm vấn, Q13) và màn bonus G11
- [ ] Nhãn cho nhóm "gán nhãn clip cũ" ở Q11 (Disinformation hay chưa đủ căn cứ)
- [ ] Đối chiếu con số 49 người / 10 người được cứu sống (Q2)
- [ ] Tìm và điền URL các bài báo, kiểm tra link còn sống
- [ ] Số lượng đáp án chấp nhận cho từng ô điền
- [ ] Có làm chế độ offline hay không
- [ ] Điều kiện kết thúc B ở pha 3