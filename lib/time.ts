export const fmt = (ms: number) =>
  new Date(ms).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function until(start: number, now: number) {
  const m = Math.round((start - now) / 60000);
  if (m <= 0) return "Live now";
  if (m < 60) return `Starts in ${m} min${m === 1 ? "" : "s"}`;
  if (m < 1440) return `Starts in ${Math.round(m / 60)} h`;
  return `Starts in ${Math.round(m / 1440)} d`;
}

export const hm = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// "Today, 9:00 AM to 10:30 AM"
export function when(start: number, end: number, now: number) {
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(new Date(start)) - day(new Date(now))) / 86400000);
  const label = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : new Date(start).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  return `${label}, ${hm(start)} to ${hm(end)}`;
}

export function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h >= 24 ? `${Math.floor(h / 24)}d` : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
