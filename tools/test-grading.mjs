// Kiểm tra chấm đáp án gõ tay (game/js/text.js) và tìm đường (game/js/pathfind.js) bằng node, không cần trình duyệt.
// Chạy ở thư mục gốc repo: node tools/test-grading.mjs
import { normalize, matchField } from '../game/js/text.js';
import { findPath } from '../game/js/pathfind.js';

// Bước `input` (gõ tay) hiện chưa có nhiệm vụ nào dùng (đã chuyển sang chọn đáp án): kiểm bằng đáp án mẫu.
const date = ['19/7/2025', '19-7-2025', '19.7.2025', '19 thang 7 nam 2025', '19 thang 7 2025', '19/7', '19-7', '19 thang 7'];
const vessel = ['vinh xanh 58', 'qn-7105', 'qn 7105', 'qn7105'];
const cause = ['giong loc', 'dong loc', 'giong', 'loc'];
const pct = ['99,9', '99.9', '99 9'], model = ['imagen 4', 'imagen'], year = ['2024', '8/2024', 'thang 8 2024'];

let fails = 0;
const eq = (got, want, label) => {
  if (got !== want) { fails++; console.error(`✗ ${label}: được ${got}, cần ${want}`); }
};

// chuẩn hóa
eq(normalize('19/07/2025'), '19/7/2025', 'bỏ số 0 đầu ngày tháng');
eq(normalize('Giông Lốc'), 'giong loc', 'bỏ dấu tiếng Việt');
eq(normalize('99,9%'), '99 9', 'số thập phân dấu phẩy');

// đáp án đúng, kể cả có chữ đệm
eq(matchField('19/07/2025', date), 'right', 'ngày có số 0');
eq(matchField('ngày 19 tháng 7 năm 2025', date), 'right', 'ngày viết chữ');
eq(matchField('QN-7105', vessel), 'right', 'số hiệu tàu');
eq(matchField('tàu Vịnh Xanh 58 QN 7105', vessel), 'right', 'tên + số hiệu tàu');
eq(matchField('do giông lốc', cause), 'right', 'nguyên nhân có dấu');
eq(matchField('99,9%', pct), 'right', 'tỉ lệ máy dò');
eq(matchField('Imagen 4 của Google', model), 'right', 'mô hình tạo ảnh');
eq(matchField('tháng 8 năm 2024', year), 'right', 'thời điểm clip cũ');

// đoán nhiều đáp án / trả lời ngược
eq(matchField('18/7 19/7 20/7', date), 'wrong', 'liệt kê nhiều ngày');
eq(matchField('không phải lốc', cause), 'wrong', 'phủ định');
eq(matchField('giông hoặc bão', cause), 'wrong', 'hoặc');
eq(matchField('lốc xoáy mưa đá sét đánh cháy nổ va đá ngầm quá tải', cause), 'wrong', 'liệt kê dài');

// gõ gần đúng
eq(matchField('imagne 4', model), 'almost', 'gõ sai một chữ');

// tìm đường: lưới 192x128 có tường kín quanh đích, đích không tới được → null, không treo
const W = 192, H = 128, blocked = new Uint8Array(W * H);
for (let x = 150; x <= 170; x++) for (const y of [90, 110]) blocked[y * W + x] = 1;
for (let y = 90; y <= 110; y++) for (const x of [150, 170]) blocked[y * W + x] = 1;
const g = { W, H, blocked, free: (cx, cy) => cx >= 0 && cy >= 0 && cx < W && cy < H && !blocked[cy * W + cx] };
let t = performance.now();
eq(findPath(g, 40, 40, 160 * 16 + 8, 100 * 16 + 8), null, 'đích bị vây kín');
const slow = performance.now() - t;
if (slow > 500) { fails++; console.error(`✗ tìm đường tới đích bị vây mất ${slow.toFixed(0)} ms`); }
const path = findPath(g, 40, 40, 100 * 16, 120 * 16);
eq(Array.isArray(path) && path.length >= 1, true, 'có đường tới đích mở');

console.log(fails ? `${fails} kiểm tra lỗi` : 'Tất cả kiểm tra đều qua');
process.exit(fails ? 1 : 0);
