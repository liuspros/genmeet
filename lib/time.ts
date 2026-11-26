export const fmt = (ms: number) =>
  new Date(ms).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function until(start: number, now: number) {
  const m = Math.round((start - now) / 60000);
  if (m <= 0) return "Live now";
  if (m < 60) return `Starts in ${m} min${m === 1 ? "" : "s"}`;
  if (m < 1440) return `Starts in ${Math.round(m / 60)} h`;
  return `Starts in ${Math.round(m / 1440)} d`;
}
