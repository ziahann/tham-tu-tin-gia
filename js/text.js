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
