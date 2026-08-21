// YYYY/MM/DD(WeekDay) HH:MM:SS形式に変換
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const weekday = WEEKDAYS[d.getDay()];
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}/${mm}/${dd}(${weekday}) ${hh}:${min}:${ss}`;
}
