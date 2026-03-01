import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from "firebase/firestore";
import type { RunEntry } from "../types/models";
import { db } from "./firebase";

export function subscribeRuns(userId: string, onRuns: (runs: RunEntry[]) => void, onError: (message: string) => void): () => void {
  const q = query(collection(db, "users", userId, "runs"), orderBy("dateISO", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const runs = snap.docs.map((d) => d.data() as RunEntry);
      onRuns(runs);
    },
    (err) => onError(err.message)
  );
}

export async function saveRun(userId: string, run: RunEntry): Promise<void> {
  await setDoc(doc(db, "users", userId, "runs", run.id), run);
}

export async function removeRun(userId: string, runId: string): Promise<void> {
  await deleteDoc(doc(db, "users", userId, "runs", runId));
}
