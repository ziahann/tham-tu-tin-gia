
> Game: Thám tử tin giả (ca ảnh AI giả về vụ lật tàu Vịnh Xanh 58, vịnh Hạ Long) Cách dùng: điền `[ĐIỀN]`. Chỗ ghi _(gợi ý)_ là đề xuất sẵn, bạn duyệt rồi xóa chữ "gợi ý". File liên quan: `01`, `02`, `04`, `05`.

---

## 1. THÔNG TIN DỰ ÁN

| Mục                                               | Nội dung                                                                           |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Tên dự án                                         | Thám tử tin giả: [ĐIỀN tên hiển thị]                                               |
| Tên thư mục / repo                                | tham-tu-tin-gia                                                                    |
| Trường / khoa                                     | Trường Đại học Văn Lang, Khoa Quan hệ công chúng và Truyền thông                   |
| Môn học                                           | Thẩm định tin tức                                                                  |
| Giảng viên                                        | Nguyễn Trần Duy                                                                    |
| Đề tài nền (báo cáo giữa kỳ)                      | Thẩm định tin giả sử dụng hình ảnh AI về vụ lật tàu Vịnh Xanh 58 trên vịnh Hạ Long |
| Nhóm thực hiện _(theo báo cáo mới, kiểm tra lại)_ | Trần Huỳnh Gia Hân, Đào Thị Mai Chi                                                |
| Lớp học phần _(theo báo cáo mới, kiểm tra lại)_   | 261_72NEPR40352_01                                                                 |
| Hạn nộp                                           | Chưa biết (Không cần thêm vào)                                                     |


## 2. YÊU CẦU CỦA ĐỀ BÀI (mục 08)

- Định dạng: game HTML / PowerPoint tương tác (dự án chọn HTML).
- Nhiệm vụ: người chơi là chuyên viên thẩm định, chọn chứng cứ và phương án phản hồi, mỗi lựa chọn được giải thích bằng dữ kiện thật.
- Kịch bản: xác định nguồn, chọn tài liệu, phân loại sai lệch, quyết định xử lý, nhận phản hồi và giải thích.
- Bằng chứng cần thể hiện: bộ chứng cứ đã kiểm chứng và đáp án minh bạch cho mỗi nhánh.
- Sản phẩm nộp: tệp game hoặc URL, video demo 2-3 phút, PDF.
- Rủi ro cần tránh: không dùng điểm trò chơi như chứng minh độ thật; tình huống bịa để chơi phải đánh dấu giả lập.

## 3. QUY TẮC BẮT BUỘC (không được vi phạm)

**Quy tắc từ đề bài**

1. Điểm số và chiến thắng chỉ để chơi, không dùng làm bằng chứng. Dòng lưu ý hiển thị ở màn kết quả và chân trang.
2. Phần hư cấu (NPC, tổ chức, Kẻ Giấu Mặt, công cụ mô phỏng) có nhãn **GIẢ LẬP**; tên hư cấu, không logo thật.
3. Mọi lựa chọn có giải thích bằng dữ kiện thật kèm nguồn.

**Quy tắc nhân văn (vì đề tài là một thảm kịch có thật)** 4. Tai nạn là có thật; game không bao giờ trình bày nó như thông tin giả. 5. Không hiển thị ảnh nạn nhân, ảnh trẻ em, hay cảnh dựng lại tai nạn. 6. Ảnh AI giả dùng làm bằng chứng chỉ ở dạng mô phỏng hoặc đã làm mờ, gạch chéo, nhãn "ẢNH GIẢ". 7. Không "vui hóa" nỗi đau: không "game over" gắn với nạn nhân, không nhạc chiến thắng ồn ào, không đùa cợt về tai nạn. 8. Có cảnh báo nội dung ở màn đầu và nút thoát.

**Quy tắc về bằng chứng và quy kết** 9. Không bịa dữ kiện, ngày tháng, số liệu. Chỗ chưa chắc ghi rõ "chưa đủ căn cứ". 10. Không định danh cá nhân đứng sau các trang ẩn danh; không khuyến khích "truy tìm danh tính" người thật. 11. Không khẳng định động cơ tài chính trực tiếp khi chưa có dữ liệu doanh thu. 12. Kết quả công cụ phát hiện AI chỉ là dữ liệu bổ trợ, không là căn cứ duy nhất. 13. Phân loại Information Disorder theo **từng nhóm chủ thể**, không gán một nhãn cho tất cả. 14. NPC hư cấu, không đại diện người thật (kể cả người nổi tiếng được nhắc trong báo chí). 15. Không thu thập dữ liệu cá nhân người chơi. 16. Tôn trọng bản quyền: ảnh chụp bài báo chỉ minh họa, có chú thích nguồn; nhân vật và âm thanh là nguyên bản hoặc có giấy phép rõ ràng. 17. [ĐIỀN thêm]

## 4. CÔNG NGHỆ

| Hạng mục                | Lựa chọn                                                           |
| ----------------------- | ------------------------------------------------------------------ |
| Ngôn ngữ                | HTML, CSS, JavaScript thuần _(gợi ý)_                              |
| Framework               | Tự do chọn theo Claude Code                                        |
| Backend / cơ sở dữ liệu | Tự do (có hoặc không)                                              |
| Lưu trữ phía người chơi | localStorage (file 02 mục 6)                                       |
| Dữ liệu nội dung        | `data/quests.json`, `data/npc_dialogues.json`, `data/sources.json` |
| Thư viện ngoài          | Tự do                                                              |
| Trình duyệt hỗ trợ      | [Chrome, Edge, Safari, Firefox                                     |
| Ngôn ngữ giao diện      | Tiếng Việt                                                         |

## 5. CẤU TRÚC THƯ MỤC ĐỀ XUẤT

```
tham-tu-tin-gia/
├── CLAUDE.md
├── README.md
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── main.js               (khởi động, điều hướng phòng)
│   ├── state.js              (trạng thái, điểm, cờ, thẻ evidence)
│   ├── chat.js               (chat NPC, lưu nhật ký)
│   ├── quests.js             (dựng nhiệm vụ, kiểm tra evidence)
│   ├── tools.js              (kính soi lỗi, đồng hồ dòng thời gian, bảng ghim)
│   └── boss.js               (đối đầu Kẻ Giấu Mặt)
├── data/
│   ├── quests.json
│   ├── npc_dialogues.json
│   └── sources.json          (trích dẫn APA)
├── assets/
│   ├── pixel/                (nhân vật, bối cảnh, giao diện pixel)
│   │   ├── hero/
│   │   ├── boss/
│   │   ├── npc/
│   │   └── ui/
│   ├── evidence/             (ảnh chụp bài báo đã xử lý nhạy cảm, bảng kết quả công cụ)
│   └── audio/
└── docs/
    ├── 01-tinh-nang-giao-dien.md
    ├── 02-noi-dung-npc.md
    ├── 03-cai-dat-chung.md
    ├── 04-nhan-vat-cot-truyen-art.md
    ├── 05-kieu-choi-nhiem-vu.md
    └── bao-cao-vinh-xanh-58.pdf
```

## 6. QUY ƯỚC ĐẶT TÊN VÀ VIẾT CODE

- Tên file, thư mục: chữ thường, không dấu, nối bằng dấu gạch ngang.
- Biến và hàm JavaScript: camelCase, tiếng Anh.
- ID trong dữ liệu: `màn_chủ đề_số`, ví dụ `q3_lens`.
- Nội dung hiển thị: tiếng Việt, đặt trong file dữ liệu, không viết cứng trong code.
- Mỗi hàm có chú thích ngắn nêu mục đích.
- [ĐIỀN thêm]

## 7. GIỌNG VĂN VÀ NGÔN NGỮ

- Xưng hô: NPC gọi người chơi là cậu
- Giọng: trang trọng, rõ ràng, không phán xét; khi nhắc nạn nhân dùng ngôn ngữ tôn trọng.
- Thuật ngữ nhất quán: Misinformation, Disinformation, Malinformation, sai ngữ cảnh, ảnh do AI tạo.
- Kiểm tra chính tả tiếng Việt và dấu trước khi nộp.
- Trích dẫn: APA 7 (danh sách trong `data/sources.json`).

## 8. QUY TRÌNH LÀM VIỆC VỚI CLAUDE CODE

1. Đặt 5 file thiết kế vào `docs/` và tạo `CLAUDE.md` (mục 9).
2. Mở Claude Code trong thư mục dự án, bật plan mode, bảo nó đọc 5 file rồi đề xuất kế hoạch.
3. Thứ tự: dữ liệu (`quests.json`, `npc_dialogues.json`, `sources.json`), khung game và hub, từng phòng, chat NPC, bảng ghim, boss, art pixel, kiểm thử.
4. Mỗi bước nhỏ: chạy thử, rồi `git commit`.
5. Phần nội dung học thuật: nhóm tự đối chiếu với báo cáo, không để Claude Code tự thêm dữ kiện.
6. Nhờ Claude Code vẽ pixel bằng code chỉ cho nhân vật và giao diện **nguyên bản** của nhóm.

## 9. NỘI DUNG GỢI Ý CHO `CLAUDE.md`

```markdown
# Thám tử tin giả

Game HTML tương tác (art pixel) cho môn Thẩm định tin tức (Đại học Văn Lang). Người chơi là thám tử kiểm chứng, điều tra ca ảnh AI giả và clip sai ngữ cảnh sau vụ lật tàu Vịnh Xanh 58 (vịnh Hạ Long, 19/7/2025).

## Đọc trước khi làm
- docs/01 đến docs/05

## Quy tắc bắt buộc
- Điểm số và chiến thắng chỉ để chơi, không dùng làm bằng chứng; luôn hiển thị dòng lưu ý.
- Tai nạn là có thật; không bao giờ trình bày nó như tin giả.
- Không hiển thị ảnh nạn nhân, ảnh trẻ em, cảnh dựng lại tai nạn. Ảnh AI giả chỉ ở dạng mô phỏng hoặc làm mờ + gạch chéo + nhãn "ẢNH GIẢ".
- Phần hư cấu có nhãn GIẢ LẬP; NPC và boss là nhân vật hư cấu nguyên bản.
- Chỉ dùng dữ kiện trong bảng F1-F16 của docs/02; không tự thêm dữ kiện, số liệu.
- Không định danh cá nhân đứng sau các trang ẩn danh.
- Không thu thập dữ liệu cá nhân.

## Công nghệ
- HTML/CSS/JS thuần, không backend; nội dung nằm trong data/*.json.
- Giao diện tiếng Việt; pixel art nguyên bản.

## Cách làm việc
- Làm từng bước nhỏ, chạy thử rồi commit.
- Hỏi lại khi nội dung học thuật chưa rõ.
```

## 10. KIỂM THỬ

- [ ] Chơi thử tất cả nhiệm vụ (đúng, một phần, sai), không có ngõ cụt
- [ ] Mọi phản hồi có dẫn chứng và nguồn
- [ ] Nhãn GIẢ LẬP xuất hiện ở các phần hư cấu
- [ ] Dòng lưu ý điểm số có ở màn kết quả và chân trang
- [ ] Không có ảnh nạn nhân / trẻ em / cảnh tai nạn nào trong game
- [ ] Ảnh nhạy cảm đã làm mờ + gạch chéo + nhãn; nút "Ẩn hình ảnh nhạy cảm" hoạt động
- [ ] Link ngoài mở tab mới; bản dự phòng hiện khi link chết
- [ ] Chat NPC lưu và tải lại đúng; nút xóa dữ liệu hoạt động
- [ ] Hiển thị tốt trên điện thoại, máy tính bảng, máy tính
- [ ] Dùng được bằng bàn phím; ảnh có mô tả thay thế
- [ ] Phông pixel hiển thị đủ dấu tiếng Việt
- [ ] Không còn lỗi chính tả tiếng Việt

## 11. TRIỂN KHAI VÀ NỘP BÀI

| Hạng mục         | Quyết định                                                 |
| ---------------- | ---------------------------------------------------------- |
| Nơi đưa lên URL  | Github Pages                                               |
| Gói nộp tệp game | [ĐIỀN, gợi ý: nén .zip toàn bộ thư mục, kèm hướng dẫn mở]  |
| Video demo       | 2-3 phút, kịch bản ở file 01 mục 10                        |
| PDF              | Giải thích thiết kế, cách chơi, nguồn dữ liệu, bảng đáp án |
| Người nộp        | [ĐIỀN]                                                     |

Checklist nộp:

- [ ] Tệp game / URL
- [ ] Video demo 2-3 phút
- [ ] PDF
- [ ] Danh sách nguồn APA 7 đầy đủ
- [ ] Rà lại các quy tắc ở mục 3

## 12. DANH MỤC NGUỒN (theo báo cáo, cần điền URL đầy đủ)

> URL trong PDF bị ngắt dòng ở nhiều chỗ. Nhóm mở từng link trong báo cáo gốc, kiểm tra rồi điền vào `data/sources.json`.

|Khóa|Nguồn|URL|
|---|---|---|
|thuthao2025|Thu Thảo. (2025, 22/7). Lợi dụng bi kịch lật tàu du lịch ở vịnh Hạ Long để "câu view" bằng AI. Thời báo VTV.|[ĐIỀN]|
|thuonghuyen2025|Thương Huyền, & Minh Nhật. (2025, 21/7). Phẫn nộ hành vi sử dụng AI câu tương tác từ vụ lật tàu ở Quảng Ninh. Dân trí.|[ĐIỀN]|
|th2025|T.H. (2025, 21/7). Tràn lan bài viết bịa đặt, ảnh AI câu view vụ lật tàu ở Hạ Long. VOH.|[ĐIỀN]|
|hoaianh2025|Hoài Anh. (2025, 20/7). Loạt video giả vụ lật tàu 'gây thiệt hại cho du lịch vịnh Hạ Long'. VnExpress.|[ĐIỀN]|
|minhthu2025|Minh Thu. (2025, 22/7). Dựng chuyện bằng AI, ghép ảnh câu like... VietnamPlus.|[ĐIỀN]|
|phamphuocdung2025|Phạm Phước Dũng. (2025, 23/7). Dàn dựng clip giả vụ lật tàu ở Hạ Long... Phụ Nữ Online.|[ĐIỀN]|
|manh2025|M. Anh. (2025, 21/7). Xử lý nghiêm hành vi đăng tin sai sự thật liên quan vụ lật tàu trên vịnh Hạ Long. Tuổi Trẻ Online.|[ĐIỀN]|
|kimngoc2025|Kim Ngọc. (2025, 23/7). Không thể để thông tin giả tiếp tục lộng hành. Lao Động.|[ĐIỀN]|
|dangkhoa2025|Đăng Khoa. (2025, 23/7). Hình AI giả tràn lan sau thảm kịch lật tàu ở Hạ Long... VietTimes.|[ĐIỀN]|
|doquyen2025|Đỗ Quyên, & Trọng Huy. (2025, 21/7). Câu view bất chấp từ vụ lật tàu Vịnh Xanh 58. Tiền Phong.|[ĐIỀN]|
|minhanh2025|Minh Anh. (2025, 25/7). Báo động vấn nạn "đạo đức số". Báo Văn Hóa.|[ĐIỀN]|
|google_lens|Google. (n.d.). Google Lens.|https://lens.google.com|
|hive|Hive. (n.d.). AI-generated content detection.|https://hivemoderation.com/ai-generated-content-detection|
|wardle2017|Wardle, C., & Derakhshan, H. (2017). Information disorder... Council of Europe.|[ĐIỀN]|
|unesco2021|UNESCO. (2021). Recommendation on the ethics of artificial intelligence.|[ĐIỀN]|
|vanban|Bộ TT&TT (2021) QĐ 874/QĐ-BTTTT; Chính phủ (2020) NĐ 15/2020/NĐ-CP; Chính phủ (2024) NĐ 147/2024/NĐ-CP; Hội Nhà báo Việt Nam (2018)|[ĐIỀN]|

Lưu ý: nếu game nhắc đến văn bản pháp luật, chỉ nêu đúng nội dung có trong nguồn và ghi rõ đây không phải tư vấn pháp lý.

## 13. RỦI RO VÀ CÁCH GIẢM

|Rủi ro|Cách giảm|
|---|---|
|Tái gây tổn thương cho gia đình nạn nhân|Quy tắc nhân văn (mục 3), cảnh báo nội dung, không hiển thị ảnh nhạy cảm|
|Làm ảnh AI giả lan truyền thêm|Chỉ dùng mô phỏng hoặc ảnh đã làm mờ + gạch chéo + nhãn|
|Hiểu nhầm điểm cao là "thông tin đúng"|Dòng lưu ý cố định + câu chốt ở màn kết quả|
|Gán nhãn Disinformation đồng loạt|Phân loại theo từng nhóm chủ thể (file 05, Q11)|
|Quy kết người thật / trang thật|Không định danh; chỉ dùng cách viết tắt như báo cáo; boss hư cấu|
|Claude Code thêm dữ kiện không có|Bảng F1-F16, nhóm đối chiếu mỗi bản cập nhật|
|Link nguồn chết|Bản dự phòng trong `assets/evidence/`|
|Vi phạm bản quyền (nhân vật, ảnh, âm thanh)|Tất cả nguyên bản hoặc có giấy phép rõ ràng|
|[ĐIỀN]||