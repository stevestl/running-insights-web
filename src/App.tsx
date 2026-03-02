import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { AuthGate } from "./components/AuthGate";
import { AddRunView } from "./components/AddRunView";
import { RunsView } from "./components/RunsView";
import { AnalyzeView } from "./components/AnalyzeView";
import { auth } from "./lib/firebase";
import { makeDefaultRun } from "./lib/defaults";
import { normalizeRunDateFieldsOnce, removeRun, saveRun, subscribeRuns } from "./lib/firestoreRuns";
import { uid } from "./lib/format";
import type { RunEntry, RunType } from "./types/models";

type Tab = "Add" | "Runs" | "Analyze";

export default function App(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [runs, setRuns] = useState<RunEntry[]>([]);
  const [tab, setTab] = useState<Tab>("Add");
  const [draft, setDraft] = useState<RunEntry>(makeDefaultRun("Long"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) {
      setRuns([]);
      return;
    }
    normalizeRunDateFieldsOnce(user.uid).catch((e) => {
      setError(`Date normalization failed: ${(e as Error).message}`);
    });
    return subscribeRuns(
      user.uid,
      (next) => setRuns(next),
      (message) => setError(`Sync error: ${message}`)
    );
  }, [user]);

  const recentAverages = useMemo(() => {
    const byType = new Map<RunType, RunEntry[]>();
    for (const type of ["Long", "Tempo", "Interval", "Easy"] as RunType[]) {
      byType.set(type, runs.filter((r) => r.type === type).slice(0, 5));
    }
    return byType;
  }, [runs]);

  useEffect(() => {
    const sample = recentAverages.get(draft.type) ?? [];
    if (sample.length < 3) return;
    if (draft.averageHeartRate !== 0 || draft.maxHeartRate !== 0 || draft.cadence !== 0) return;
    const mean = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    setDraft((prev) => ({
      ...prev,
      averageHeartRate: mean(sample.map((r) => r.averageHeartRate)),
      maxHeartRate: mean(sample.map((r) => r.maxHeartRate)),
      cadence: mean(sample.map((r) => r.cadence))
    }));
  }, [recentAverages, draft.type, draft.averageHeartRate, draft.maxHeartRate, draft.cadence]);

  async function onSignIn(email: string, password: string): Promise<void> {
    setError("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onSignUp(email: string, password: string): Promise<void> {
    setError("");
    setBusy(true);
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onSaveDraft(): Promise<void> {
    if (!user) return;
    setError("");
    setBusy(true);
    try {
      await saveRun(user.uid, normalizeRun(draft));
      setDraft(makeDefaultRun(draft.type));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteRun(id: string): Promise<void> {
    if (!user) return;
    setError("");
    try {
      await removeRun(user.uid, id);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onUpdateRun(run: RunEntry): Promise<void> {
    if (!user) return;
    setError("");
    try {
      await saveRun(user.uid, normalizeRun(run));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!user) {
    return <AuthGate busy={busy} error={error} onSignIn={onSignIn} onSignUp={onSignUp} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="./icon-192.png" alt="Running Insights logo" className="brand-logo" />
          <div className="brand-copy">
            <div className="brand-title">Running Insights</div>
            <div className="brand-subtitle">Winged training dashboard</div>
          </div>
        </div>
        <div className="tabs">
          <button className={tab === "Add" ? "active" : ""} onClick={() => setTab("Add")}>Add</button>
          <button className={tab === "Runs" ? "active" : ""} onClick={() => setTab("Runs")}>Runs</button>
          <button className={tab === "Analyze" ? "active" : ""} onClick={() => setTab("Analyze")}>Analyze</button>
        </div>
        <button className="secondary" onClick={() => signOut(auth)}>Sign Out</button>
      </header>

      {!!error && <div className="error-banner">{error}</div>}

      <main className="content">
        {tab === "Add" && <AddRunView draft={draft} onChange={setDraft} onSave={onSaveDraft} />}
        {tab === "Runs" && <RunsView runs={runs} onDelete={onDeleteRun} onUpdate={onUpdateRun} />}
        {tab === "Analyze" && <AnalyzeView runs={runs} />}
      </main>
    </div>
  );
}

function normalizeRun(run: RunEntry): RunEntry {
  const next = { ...run };
  if (next.type === "Easy") {
    next.easyDurationSeconds = Math.max(60, next.easyDurationSeconds);
    next.laps = [];
    next.intervalReps = [];
    return next;
  }
  if (next.type === "Interval") {
    next.intervalReps = next.intervalReps
      .filter((r) => r.durationSeconds > 0 && r.paceSecondsPerMile > 0)
      .map((r) => ({ ...r, id: r.id || uid() }));
    if (next.intervalReps.length === 0) {
      next.intervalReps = [{ id: uid(), durationSeconds: 90, paceSecondsPerMile: 480 }];
    }
    return next;
  }
  next.laps = next.laps
    .filter((l) => l.distanceMiles > 0 && l.paceSecondsPerMile > 0)
    .map((l) => ({ ...l, id: l.id || uid() }));
  if (next.laps.length === 0) {
    next.laps = [{ id: uid(), distanceMiles: 3, paceSecondsPerMile: 600 }];
  }
  return next;
}
