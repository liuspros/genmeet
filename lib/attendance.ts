export type Status = "present" | "late" | "partial" | "absent";
export type Interval = [number, number];

// Defaults for every course. Change them here.
export const RULES = {
  lateAfterMin: 10,   // first join more than this many minutes after the class started
  partialBelow: 0.6,  // stayed for less than this share of the class
  absentBelowMin: 5,  // fewer minutes than this counts as absent
};

export function merge(iv: Interval[]): Interval[] {
  const s = [...iv].sort((a, b) => a[0] - b[0]);
  const out: Interval[] = [];
  for (const x of s) {
    const last = out[out.length - 1];
    if (last && x[0] <= last[1]) last[1] = Math.max(last[1], x[1]);
    else out.push([x[0], x[1]]);
  }
  return out;
}

export const minutesIn = (iv: Interval[], from: number, to: number) =>
  merge(iv).reduce((a, [s, e]) => a + Math.max(0, Math.min(e, to) - Math.max(s, from)), 0) / 60000;

// Priority: absent, then partial, then late, then present.
export function judge(iv: Interval[], schedStart: number, schedEnd: number, refStart: number) {
  if (!iv.length) return { status: "absent" as Status, minutes: 0, first: 0, last: 0 };
  const m = merge(iv);
  const first = m[0][0];
  const last = m[m.length - 1][1];
  const from = Math.max(schedStart, refStart); // if the lecturer opened the room late, lateness counts from then
  const minutes = minutesIn(m, from, schedEnd);
  const window = Math.max(1, (schedEnd - from) / 60000);
  let status: Status = "present";
  if (minutes < RULES.absentBelowMin) status = "absent";
  else if (minutes / window < RULES.partialBelow) status = "partial";
  else if ((Math.max(first, from) - from) / 60000 > RULES.lateAfterMin) status = "late";
  return { status, minutes: Math.round(minutes), first, last };
}

// "Obi Amaka" and "amaka obi" match.
export const normName = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean).sort().join(" ");
