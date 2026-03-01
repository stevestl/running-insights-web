export function uid(): string {
  return crypto.randomUUID();
}

export function parsePace(raw: string): number | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;

  if (/^\d{4}$/.test(cleaned)) {
    const min = Number(cleaned.slice(0, 2));
    const sec = Number(cleaned.slice(2, 4));
    if (sec >= 60) return null;
    return min * 60 + sec;
  }

  const parts = cleaned.split(":");
  if (parts.length !== 2) return null;
  const min = Number(parts[0]);
  const sec = Number(parts[1]);
  if (Number.isNaN(min) || Number.isNaN(sec) || sec < 0 || sec >= 60 || min < 0) return null;
  return min * 60 + sec;
}

export function formatPace(seconds: number): string {
  if (seconds <= 0) return "-";
  const s = Math.round(seconds);
  const min = Math.floor(s / 60);
  const rem = s % 60;
  return `${min}:${String(rem).padStart(2, "0")}`;
}

export function parseDuration(raw: string): number | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;

  if (/^\d{3}$/.test(cleaned)) {
    const min = Number(cleaned.slice(0, 1));
    const sec = Number(cleaned.slice(1, 3));
    if (sec >= 60) return null;
    return min * 60 + sec;
  }

  if (/^\d{4}$/.test(cleaned)) {
    const min = Number(cleaned.slice(0, 2));
    const sec = Number(cleaned.slice(2, 4));
    if (sec >= 60) return null;
    return min * 60 + sec;
  }

  const parts = cleaned.split(":");
  if (parts.length !== 2) return null;
  const min = Number(parts[0]);
  const sec = Number(parts[1]);
  if (Number.isNaN(min) || Number.isNaN(sec) || sec < 0 || sec >= 60 || min < 0) return null;
  return min * 60 + sec;
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0:00";
  const s = Math.round(seconds);
  const min = Math.floor(s / 60);
  const rem = s % 60;
  return `${min}:${String(rem).padStart(2, "0")}`;
}
