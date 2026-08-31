// ISO 8601 形式の日時文字列を「YYYY/MM/DD(曜日) HH:MM:SS」形式に変換するユーティリティ。
// バックエンドから返却される created_at などの日時フィールドの表示に使用する。

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

// 数値を2桁のゼロ埋め文字列に変換する（例: 3 → "03"）
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// dateStr: ISO 8601 形式の日時文字列（例: "2026-08-20T10:00:00Z"）
// 戻り値: "2026/08/20(木) 10:00:00" 形式の文字列
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1); // getMonth() は 0 始まりのため +1
  const dd = pad(d.getDate());
  const weekday = WEEKDAYS[d.getDay()]; // getDay() は 0=日曜〜6=土曜
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}/${mm}/${dd}(${weekday}) ${hh}:${min}:${ss}`;
}
