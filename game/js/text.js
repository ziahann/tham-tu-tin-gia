// Chuẩn hóa chữ tiếng Việt để so khớp đáp án và từ khóa.

/** Bỏ dấu, chữ thường, bỏ ký tự lạ, bỏ số 0 đứng đầu (07 → 7), gộp khoảng trắng. */
export function normalize(str) {
  return String(str ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9/.\- ]+/g, ' ')
    .replace(/[.\-/]+(?=\s|$)/g, ' ')
    .replace(/\b0+(\d)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Câu (đã chuẩn hóa) có chứa cụm từ khóa trọn vẹn không. */
export function containsPhrase(normText, normPhrase) {
  return normPhrase !== '' && ` ${normText} `.includes(` ${normPhrase} `);
}

/** Khoảng cách chỉnh sửa Levenshtein giữa hai chuỗi. */
export function levenshtein(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

// Phần còn lại của câu trả lời (sau khi bỏ cụm đáp án) mà có phủ định / "hoặc" là đoán nhiều đáp án hoặc trả lời ngược.
const NEGATION = /(^| )(khong|chua|ko|chang)( |$)/;
const GUESS_JOIN = /(^| )(hoac|or)( |$)/;
const MAX_EXTRA_WORDS = 6;
const numbers = s => s.match(/\d+/g) || [];

/** So một câu trả lời với danh sách đáp án: 'right' | 'almost' | 'wrong'.
 *  Câu trả lời được phép có thêm vài chữ đệm ("ngày 19/7/2025"), nhưng không được liệt kê nhiều phương án
 *  ("18/7 19/7 20/7"), phủ định ("không phải lốc") hay dài dòng để dò đáp án. */
export function matchField(value, accepts, fuzzy = true) {
  const norm = normalize(value);
  if (!norm) return 'wrong';
  const accs = accepts.map(normalize);
  if (accs.includes(norm)) return 'right';
  const hit = accs.filter(a => containsPhrase(norm, a)).sort((a, b) => b.length - a.length)[0];
  if (hit) {
    const rest = ` ${norm} `.replace(` ${hit} `, ' ').trim();
    const known = new Set(accs.flatMap(numbers));
    const single = !NEGATION.test(rest) && !GUESS_JOIN.test(rest)
      && rest.split(' ').length <= MAX_EXTRA_WORDS
      && numbers(rest).every(n => known.has(n));
    return single ? 'right' : 'wrong';
  }
  if (fuzzy && accs.some(a => a.length >= 4 && levenshtein(norm, a) <= (a.length >= 8 ? 2 : 1))) return 'almost';
  return 'wrong';
}
