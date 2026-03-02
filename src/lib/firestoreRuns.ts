import { collection, deleteDoc, doc, getDocs, onSnapshot, query, setDoc, Timestamp, where } from "firebase/firestore";
import type { RunEntry } from "../types/models";
import { db } from "./firebase";

export function subscribeRuns(userId: string, onRuns: (runs: RunEntry[]) => void, onError: (message: string) => void): () => void {
  const q = query(collection(db, "users", userId, "runs"));
  return onSnapshot(
    q,
    (snap) => {
      const selectedById = new Map<string, { run: RunEntry; freshness: number }>();
      for (const d of snap.docs) {
        const run = toRunEntry(d.data(), d.id);
        const freshness = resolveFreshnessEpochMillis(d.data());
        const existing = selectedById.get(run.id);
        if (!existing || freshness >= existing.freshness) {
          selectedById.set(run.id, { run, freshness });
        }
      }

      const runs = Array.from(selectedById.values())
        .map((entry) => entry.run)
        .sort((a, b) => b.dateISO.localeCompare(a.dateISO));
      onRuns(runs);
    },
    (err) => onError(err.message)
  );
}

export async function saveRun(userId: string, run: RunEntry): Promise<void> {
  const normalized = toWritableRun(run);
  const targetDocId = await resolveTargetDocumentId(userId, run);
  await setDoc(doc(db, "users", userId, "runs", targetDocId), normalized, { merge: true });
}

export async function removeRun(userId: string, runId: string): Promise<void> {
  await deleteDoc(doc(db, "users", userId, "runs", runId));
}

export async function normalizeRunDateFieldsOnce(userId: string): Promise<void> {
  const key = `run_date_normalization_v2_${userId}`;
  if (localStorage.getItem(key) === "done") return;

  const snapshot = await getDocs(query(collection(db, "users", userId, "runs")));
  for (const document of snapshot.docs) {
    const data = document.data();
    const hasDate = data.date !== undefined && data.date !== null;
    const hasDateISO = typeof data.dateISO === "string" && data.dateISO.trim().length > 0;
    const iso = resolveDateISO(data);
    if (!iso) continue;
    const canonical = canonicalDateFromISO(iso);
    const canonicalISO = formatDateOnly(canonical);
    const existingISO = typeof data.dateISO === "string" ? data.dateISO.trim() : "";
    const existingDateISO = resolveDateISO({ date: data.date });
    const existingDateMatches = existingDateISO ? formatDateOnly(canonicalDateFromISO(existingDateISO)) === canonicalISO : false;
    const existingISOMatches = existingISO.length > 0 && existingISO === canonicalISO;

    const updates: Record<string, unknown> = {};
    if (!hasDateISO || !existingISOMatches) updates.dateISO = canonicalISO;
    if (!hasDate || !existingDateMatches) updates.date = Timestamp.fromDate(canonical);
    if (Object.keys(updates).length > 0) {
      await setDoc(doc(db, "users", userId, "runs", document.id), updates, { merge: true });
    }
  }

  localStorage.setItem(key, "done");
}

function toWritableRun(run: RunEntry): Record<string, unknown> {
  const iso = run.dateISO || new Date().toISOString();
  const canonical = canonicalDateFromISO(iso);
  const { firestoreDocId: _firestoreDocId, ...plainRun } = run;
  return {
    ...plainRun,
    dateISO: formatDateOnly(canonical),
    date: Timestamp.fromDate(canonical),
    updatedAt: Timestamp.fromDate(new Date())
  };
}

function toRunEntry(data: Record<string, unknown>, fallbackId: string): RunEntry {
  const run = data as RunEntry;
  const resolved = resolveDateISO(data) ?? new Date(0).toISOString();
  const dateISO = formatDateOnly(canonicalDateFromISO(resolved));
  return {
    ...run,
    id: typeof run.id === "string" && run.id.length > 0 ? run.id : fallbackId,
    firestoreDocId: fallbackId,
    dateISO
  };
}

async function resolveTargetDocumentId(userId: string, run: RunEntry): Promise<string> {
  if (run.firestoreDocId && run.firestoreDocId.trim().length > 0) {
    return run.firestoreDocId;
  }

  const snapshot = await getDocs(
    query(collection(db, "users", userId, "runs"), where("id", "==", run.id))
  );
  if (!snapshot.empty) {
    const best = snapshot.docs.reduce((current, next) => {
      return resolveFreshnessEpochMillis(current.data()) >= resolveFreshnessEpochMillis(next.data()) ? current : next;
    });
    return best.id;
  }

  return run.id;
}

function canonicalDateFromISO(iso: string): Date {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return new Date(Date.UTC(1970, 0, 1, 12, 0, 0));
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 12, 0, 0));
}

function formatDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveDateISO(data: Record<string, unknown>): string | null {
  if (typeof data.dateISO === "string" && data.dateISO.trim().length > 0) {
    const date = new Date(data.dateISO);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  const rawDate = data.date as unknown;
  if (rawDate instanceof Timestamp) {
    return rawDate.toDate().toISOString();
  }
  if (rawDate instanceof Date) {
    return rawDate.toISOString();
  }
  if (typeof rawDate === "number") {
    const date = new Date(rawDate * 1000);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  if (typeof rawDate === "string") {
    const date = new Date(rawDate);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
    const dateOnly = new Date(`${rawDate}T00:00:00Z`);
    if (!Number.isNaN(dateOnly.getTime())) return dateOnly.toISOString();
  }
  if (rawDate && typeof rawDate === "object") {
    const sec = (rawDate as { seconds?: number; _seconds?: number }).seconds ?? (rawDate as { _seconds?: number })._seconds;
    const ns = (rawDate as { nanoseconds?: number; _nanoseconds?: number }).nanoseconds ?? (rawDate as { _nanoseconds?: number })._nanoseconds ?? 0;
    if (typeof sec === "number") {
      return new Date((sec * 1000) + Math.floor(ns / 1_000_000)).toISOString();
    }
  }

  return null;
}

function resolveFreshnessEpochMillis(data: Record<string, unknown>): number {
  const updated = resolveDateISO({ date: data.updatedAt });
  if (updated) return new Date(updated).getTime();

  const date = resolveDateISO(data);
  if (date) return new Date(date).getTime();

  return 0;
}
