import type { AttemptStatus, AttemptType } from "@prisma/client";

// Cube times are stored as centiseconds (1/100 s) integers, with status
// carrying DNF/DNS independently of `value`. We keep the formatter dumb on
// purpose — the canonical display is value+penalty, status badge for
// DNF/DNS.

export function formatCentis(centis: number): string {
  if (!Number.isFinite(centis) || centis < 0) return "—";
  const totalHundredths = Math.round(centis);
  const hundredths = totalHundredths % 100;
  const totalSeconds = Math.floor(totalHundredths / 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);

  const cc = hundredths.toString().padStart(2, "0");
  if (hours > 0) {
    const mm = minutes.toString().padStart(2, "0");
    const ss = seconds.toString().padStart(2, "0");
    return `${hours}:${mm}:${ss}.${cc}`;
  }
  if (minutes > 0) {
    const ss = seconds.toString().padStart(2, "0");
    return `${minutes}:${ss}.${cc}`;
  }
  return `${seconds}.${cc}`;
}

export type AttemptDisplay = {
  status: AttemptStatus;
  type: AttemptType;
  attemptNumber: number;
  value: number;
  penalty: number;
  replacedBy: number | null;
};

export function attemptText(a: AttemptDisplay): string {
  if (a.status === "DNF") return "DNF";
  if (a.status === "DNS") return "DNS";
  const total = a.value + a.penalty;
  const base = formatCentis(total);
  return a.penalty > 0 ? `${base}+` : base;
}

// Parses a human time string (e.g. "12.34", "1:23.45", "0.50") into
// centiseconds. Returns null if the input is unparseable so the caller can
// surface a friendly error.
const TIME_RE = /^(?:(\d+):)?(\d+)(?:\.(\d{1,2}))?$/;
export function parseHumanTime(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const m = TIME_RE.exec(trimmed);
  if (!m) return null;
  const [, mm, ss, ff] = m;
  const minutes = mm ? Number(mm) : 0;
  const seconds = Number(ss);
  const hundredths = ff ? Number(ff.padEnd(2, "0")) : 0;
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
  if (seconds >= 60 && minutes > 0) return null;
  return minutes * 60 * 100 + seconds * 100 + hundredths;
}

// "Best" of a completed-status set; skips DNF/DNS. Returns null if nothing
// usable. Useful for highlighting the personal best across an attempts list.
export function bestOf(attempts: AttemptDisplay[]): number | null {
  let best: number | null = null;
  for (const a of attempts) {
    if (a.status === "DNF" || a.status === "DNS") continue;
    const total = a.value + a.penalty;
    if (best === null || total < best) best = total;
  }
  return best;
}
