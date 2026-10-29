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

## Chốt ngày 29/10/2026 (đợt 4 — thế giới mở, trinh thám)

> Thay thế các mục tương ứng ở đợt 1–3 (thứ tự phòng, mở khóa, âm thanh, bảng màu, nguồn mở tab mới).

| Mục | Quyết định |
|---|---|
| Thứ tự chơi | Thế giới mở: mọi hồ sơ (phòng) và NPC có ngay từ đầu, chọn hồ sơ nào làm trước cũng được; các bước trong một hồ sơ vẫn theo thứ tự. Xong mọi nhiệm vụ bắt buộc (và đủ thẻ evidence) thì Kẻ Dệt Chuyện xuất hiện |
| Theo dõi hồ sơ | Bảng Hồ sơ vụ án (phím J / nút trên thanh trên); chọn "Theo dõi" thì mũi tên vàng chỉ tới người giao việc, kể cả ở bản đồ khác |
| Phòng thám tử | Phòng có thiết bị (máy tính tìm ngược ảnh, kính soi, máy dò AI, kho lưu trữ, bảng dòng thời gian…); giao diện công cụ **mô phỏng** trong game, kết quả lấy từ dữ liệu đã kiểm chứng, không gọi API thật |
| Nguồn | Đọc ngay trong game (trang báo pixel tóm tắt nội dung đã kiểm tra), không mở tab mới; dữ kiện cũng rải trong thế giới để người chơi tự khám phá |
| Đồ họa | Chuyển sang tông lạnh kiểu trinh thám; phòng nhỏ lại nhưng chi tiết hơn; thành phố rộng hơn, có xe cộ và NPC qua đường |
| Thời tiết | Nắng / mưa / sương mù / đêm, người chơi đổi được (không có tuyết vì phi thực tế ở Hạ Long) |
| Hội thoại | Chân dung lớn có biểu cảm: người đang nói sáng lên, người kia mờ đi; khi người chơi trả lời thì chân dung thám tử bên trái sáng |
| Âm thanh | Âm thanh phản hồi theo tương tác (bước chân theo mặt sàn, cửa, thiết bị, giọng "bíp" riêng của từng NPC, tiếng mưa/sóng/xe), tạo bằng WebAudio; nhạc nền CC0 vẫn giữ |
| Màn hình chính | Làm nổi tên trò chơi, môn học, chủ đề vụ án; cảnh báo nội dung thu nhỏ (vẫn đọc được trước khi chơi) |

## Hoàn thiện đợt 4 (29/10/2026)

| Mục | Kết quả |
|---|---|
| Thế giới mở | Mọi hồ sơ mở ngay; bảng Hồ sơ vụ án (J) + mũi tên dẫn đường xuyên bản đồ; NPC chọn hồ sơ khi có nhiều hồ sơ đang mở; boss xuất hiện khi đủ điều kiện |
| Phòng thám tử | Bản đồ `agency` (tòa nhà thứ tư trên phố), 7 thiết bị; Q3–Q8 và màn bonus có bước làm tại thiết bị, xong quay về báo NPC |
| Nguồn | Trình đọc báo trong game (tóm tắt nội dung đã kiểm tra, bấm để ghi vào sổ); link bài gốc chỉ còn ở danh mục Nguồn. Sạp báo, TV, bảng tin... mở trình đọc để tự khám phá |
| Chân dung | 72x88, 5 biểu cảm cho thám tử, 6 NPC, boss, 9 người qua đường; thiết bị / đồ vật cũng có hình bên phải |
| Đồ họa | Tông lạnh; văn phòng 33x20 chi tiết; khu phố 64x36 (4 tòa nhà, đường có xe, công viên, bến tàu); 9 người qua đường GIẢ LẬP có câu thoại về thói quen kiểm chứng |
| Thời tiết | Quang / mưa / sương mù / đêm (phím T), ánh sáng đêm từ đèn đường, cửa sổ, màn hình |
| Âm thanh | Bước chân theo mặt sàn, giọng riêng từng nhân vật, âm thanh môi trường, nhạc nhỏ lại khi hội thoại; có nút tắt riêng |
| Cần nhóm xem | Tên và câu thoại 9 người qua đường (`npc_dialogues.json → npcs`, `ambientLines`); vẫn giữ việc sửa F11/F12 trong báo cáo |

## Chốt ngày 29/10/2026 (đợt 5)

| Mục | Quyết định |
|---|---|
| Nguồn báo cáo nhóm | Không hiển thị trong game (đánh dấu `internal` trong sources.json); trong lời thoại gọi là "hồ sơ kiểm chứng" |
| Tòa nhà chính | Trụ sở Báo Thanh Niên (tên thật, theo yêu cầu của nhóm), luôn kèm ghi chú: nhân vật và sự việc trong tòa nhà là GIẢ LẬP, không đại diện cho Báo Thanh Niên. Không đặt nhân vật bẫy hay trang mạo danh vào tòa này. Bỏ tổ chức "Ban Hải Đăng" |
| Các tầng | Thanh Niên: sảnh + 4 tầng (S3 Hồ sơ, S4 Phân tích ảnh, S7 Tác động, S8 Phân loại) + tầng thượng Phòng họp (boss), đi bằng thang máy có chọn tầng. Tòa soạn hư cấu Tin Vịnh giữ S5, S6 và Phát Vội |
| Nhân vật chính | Sinh viên ngành Quan hệ công chúng – Truyền thông, Trường Đại học Văn Lang; giữ tên game "Thám tử tin giả" (nghĩa bóng); "Phòng thám tử" → "Phòng xác minh" |
| Màn bonus | Trang mạo danh một quỹ thiện nguyện hư cấu ("Quỹ Thiện nguyện Hải Đăng") |
| Nhạc | Nhạc noir / bí ẩn của Kevin MacLeod (incompetech.com), CC BY 4.0, ghi công ở nút Nguồn và README |
| Đồ họa | Kiến trúc lạnh, u tối; đồ vật đúng tỉ lệ với người (props nhiều ô); thành phố rộng hơn, có tòa nhà trang trí và biển ghi chức năng |
| Trải nghiệm | Bấm icon bằng chuột xong vẫn đi lại ngay; balo mở được cạnh khung thoại khi đang trả lời |

**Kết quả đợt 5:** đã làm đủ 7 bước (commit 3918e6d → bước cuối). Chỉ 4 tòa vào được (Báo Thanh Niên, Tin Vịnh, Phòng xác minh, Cà phê Gió Biển) có biển hiệu; tòa trang trí không có biển. Nhạc ~53 MB (8 file mp3).


## Chốt ngày 29/10/2026 (đợt 6)

| Mục | Quyết định |
|---|---|
| Điểm số | Bỏ điểm và danh hiệu theo điểm (thay mục "Điểm" của đợt 1). Mỗi hồ sơ khép lại trao một **huy hiệu kỹ năng** kèm câu tóm tắt điều đã học; thanh trên hiện số huy hiệu và "Hồ sơ đã khép n/6"; gợi ý, hướng dẫn không bị trừ gì. Màn kết quả hiện bộ huy hiệu |
| Đồ họa giả 3D | Giữ góc nhìn từ trên xuống nhưng vẽ khối kiểu 3/4: tòa nhà có mái, mặt hông, đồ trên mái, bóng đổ chéo; đồ vật trong nhà và ngoài phố có mặt trên + mặt hông; đỉnh tường dày. Không chuyển hẳn sang isometric (chi phí cao) |

## Chốt ngày 29/10/2026 (đợt 7)

| Mục | Quyết định |
|---|---|
| Góc nhìn | Chuyển sang **isometric vẽ bằng code** (thay giả 3D). Logic giữ lưới vuông; chỉ đổi lớp hiển thị. Đồ vật, tòa nhà, xe, tàu, chữ trên tường / biển hiệu đều theo đúng góc nghiêng của lưới isometric |
| Huy hiệu | Mỗi huy hiệu có hình riêng (khiên + ruy băng + biểu tượng): Dừng lại trước khi chia sẻ (biển dừng), Soi ảnh (kính lúp), Truy gốc clip cũ (phim + đồng hồ), Dựng dòng thời gian (trục mốc), Cân tác động và chủ đích (cái cân), Phân loại và ứng xử (thẻ nhãn), Phỏng vấn kiểm chứng (bóng thoại), Gỡ mặt nạ Kẻ Dệt Chuyện (mặt nạ nứt), Nhận diện mạo danh (thẻ tên gạch chéo) |
| Còn lại | Nhân vật vẫn dùng sprite 4 hướng theo màn hình; cây, đèn, người là ảnh đứng (đúng với isometric) |

## Chốt ngày 29/10/2026 (đợt 8)

| Mục | Quyết định |
|---|---|
| Sửa hình | Thảm nằm phẳng trên sàn; bảng, áp phích, chữ dán sát tường; mỗi chiều xe một làn rộng 2 ô; đá vôi, ghế, bồn hoa dựng lại bằng khối voxel có đậm nhạt tạo khối |
| Công viên | Đài phun nước ở giữa, luống hoa, hàng rào cây xén, thêm ghế và đèn |
| Tòa nhà vào được | Thêm Cao ốc văn phòng, Trung tâm y tế, Cà phê Sương Sớm: hư cấu, gắn GIẢ LẬP trên biển hiệu và tên khu vực; bên trong có NPC trang trí (bác sĩ, điều dưỡng, người chờ khám, nhân viên văn phòng, pha chế, khách quen) nói câu về thói quen kiểm chứng, không thêm số liệu ngoài F1–F16, không có nhiệm vụ |

## Chốt ngày 29/10/2026 (đợt 9)

| Mục | Quyết định |
|---|---|
| Kích thước phòng | Thu gọn: sảnh 22x14, các tầng Thanh Niên 20x12, Tin Vịnh 24x17, quán cà phê 16x12, Phòng xác minh 18x12, phòng trang trí 16–18 x 11–12; đồ xếp theo cụm chức năng, chừa lối đi |
| Cản trở | Đủ bốn loại: kẻ tung tin đi rong (GIẢ LẬP, hỏi kỹ năng nhận diện tin giật tít, không thêm dữ kiện ngoài F1–F16); áp lực hạn chót (Phát Vội gọi giục đăng); manh mối đánh lừa (6 tờ giấy, mỗi hồ sơ một, không đặt trong tòa Báo Thanh Niên); chướng ngại di chuyển (thẻ khách, chờ thang máy, xe hất khi đi ngoài vạch kẻ, rào thi công) |
| Hậu quả | Thanh "Độ tin cậy" theo từng hồ sơ, bắt đầu 100; về 0 thì làm lại hồ sơ đó từ bước đầu. Huy hiệu vẫn là phần thưởng chính, không có điểm |
| Hạn chót | Chỉ chạy khi đang đi lại và có hồ sơ đang theo dõi; dừng khi hội thoại, đọc báo, mở menu; trả lời đúng một bước giảm áp lực |
| Chế độ Nhẹ | Cài đặt "Thử thách: Đầy đủ / Nhẹ". Nhẹ: không hạn chót, kẻ tung tin không đuổi, không mất độ tin cậy, xe vẫn dừng cho người chơi, thang máy không phải chờ |

## Chốt ngày 29/10/2026 (đợt 10)

| Mục | Quyết định |
|---|---|
| Điều khiển | Thêm nháy chuột / chạm để đi (bật mặc định, tắt trong Cài đặt); bấm vào người / đồ vật thì tự đi tới và tương tác |
| Mở đầu | Sau khi nhận nhiệm vụ ở màn hình chính: cảnh xe buýt chở nhân vật tới Hạ Long, dừng ở trạm trước Trụ sở Báo Thanh Niên (bỏ qua được) |
| Bến tàu | Làm lại: bãi gỗ dọc bờ, hai tàu tham quan neo sát bến có cầu lên tàu, quầy vé, cọc neo, phao cứu sinh, đèn, thùng hàng |
| Đồ trên bàn | Màn hình, giấy, đèn bàn, cốc là khối 3D riêng trên mặt bàn; tủ / kệ áp tường quay mặt vào trong phòng |
| Nhận diện | Nhân vật đeo balo Văn Lang (đỏ – xanh than, khiên trắng) và thẻ sinh viên dây xanh ngọc; Sổ tay có thẻ sinh viên mô phỏng (tên, ngành Quan hệ công chúng – Truyền thông, uy tín) |
| Hướng dẫn | Lần đầu dùng mỗi thiết bị ở Phòng xác minh: hướng dẫn ngắn; xem lại bằng nút "Xem hướng dẫn" |

## Chốt ngày 29/10/2026 (đợt 11)

| Mục | Quyết định |
|---|---|
| Nhãn GIẢ LẬP | Bỏ hết trong lúc chơi (lời thoại, nhãn tên, thanh trên, tòa nhà, tường, khu vực) và các chú thích "(hư cấu)" không cần thiết. Disclaimer chỉ ở màn hình chính và thẻ cuối intro, nêu rõ không đại diện cho Báo Thanh Niên |
| Mở đầu | Người chơi là sinh viên Văn Lang đọc bài đăng trên mạng xã hội, gọi tới Báo Thanh Niên xin tới kiểm chứng; chị Tuệ Lâm xác nhận cuộc gọi và dẫn vào các hồ sơ. Cảnh xe buýt tới trạm trước tòa nhà |
| Hội thoại | Không tự bắt chuyện khi lên tầng / vào phòng: người chơi phải bấm tương tác. NPC chào hỏi, làm quen ở lần gặp đầu. Khung thoại thu nhỏ được, khi thu nhỏ vẫn đi lại |
| Thời tiết | Ngẫu nhiên mỗi 5 phút, chỉ ngoài trời; mưa đi chậm, sương tầm nhìn hẹp, đêm kẻ tung tin đuổi xa hơn và hạn chót nhanh hơn. Bỏ nút đổi thời tiết |
| Người chơi | Tên để trống, bắt buộc nhập. Mẫu nữ: tóc dài nâu ánh sáng, nơ đỏ, áo khoác hồng, váy xanh than |
| Tác giả | Trần Huỳnh Gia Hân và Đào Thị Mai Chi (màn hình chính, danh mục nguồn) |

## Chốt ngày 30/10/2026 (đợt 12)

| Mục | Quyết định |
|---|---|
| Người giao việc | Mỗi hồ sơ một người phụ trách khác nhau; thêm anh Lịch (Dòng thời gian, Tin Vịnh), chị Cẩn (Tác động và chủ đích, tầng 4), anh Phân (Phân loại và xử lý, tầng 5). Tuệ Lâm giữ Phòng Hồ sơ và màn bonus |
| Xưng hô | NPC gọi người chơi là "em", người chơi xưng "em"; boss giữ "ta – ngươi" |
| Điểm | Bỏ mọi chữ "−… điểm" ở gợi ý và câu trả lời |
| Mã dữ kiện | Không hiện mã F… trong lời thoại, phản hồi, thẻ evidence, tư liệu |
