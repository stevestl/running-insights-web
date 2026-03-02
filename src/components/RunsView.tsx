import { useMemo, useState } from "react";
import { formatDuration, formatPace, parseDuration, parsePace, uid } from "../lib/format";
import { averagePace, segmentResults, totalMiles } from "../lib/runMath";
import type { RunEntry, RunType } from "../types/models";

type Props = {
  runs: RunEntry[];
  onDelete: (runId: string) => void;
  onUpdate: (run: RunEntry) => Promise<void>;
};

type Sort = "Date (Newest)" | "Date (Oldest)" | "Distance (High)" | "Distance (Low)";

export function RunsView({ runs, onDelete, onUpdate }: Props): JSX.Element {
  const [filter, setFilter] = useState<"All" | RunType>("All");
  const [sort, setSort] = useState<Sort>("Date (Newest)");
  const [editing, setEditing] = useState<RunEntry | null>(null);

  const filtered = useMemo(() => {
    let base = filter === "All" ? runs.slice() : runs.filter((r) => r.type === filter);
    if (sort === "Date (Newest)") base = base.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
    if (sort === "Date (Oldest)") base = base.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    if (sort === "Distance (High)") base = base.sort((a, b) => totalMiles(b) - totalMiles(a));
    if (sort === "Distance (Low)") base = base.sort((a, b) => totalMiles(a) - totalMiles(b));
    return base;
  }, [runs, filter, sort]);

  return (
    <div className="stack">
      <div className="card">
        <h2>Runs</h2>
        <div className="grid2">
          <label>Filter
            <select value={filter} onChange={(e) => setFilter(e.target.value as "All" | RunType)}>
              <option>All</option>
              <option>Long</option>
              <option>Tempo</option>
              <option>Interval</option>
              <option>Easy</option>
            </select>
          </label>
          <label>Sort
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option>Date (Newest)</option>
              <option>Date (Oldest)</option>
              <option>Distance (High)</option>
              <option>Distance (Low)</option>
            </select>
          </label>
        </div>
      </div>

      {filtered.map((run) => (
        <div className="card" key={run.id}>
          <div className="row">
            <strong>{run.dateISO} · {run.type}</strong>
            <div className="row">
              <button className="secondary" onClick={() => setEditing(run)}>Edit</button>
              <button className="danger" onClick={() => onDelete(run.id)}>Delete</button>
            </div>
          </div>
          {run.type === "Easy" ? (
            <div className="muted">Duration {formatDuration(run.easyDurationSeconds)} · Avg HR {run.averageHeartRate}</div>
          ) : (
            <div className="muted">{totalMiles(run).toFixed(2)} mi · {formatPace(averagePace(run))} · Avg HR {run.averageHeartRate}</div>
          )}
          {run.type !== "Easy" && (
            <div className="stack-tight">
              {segmentResults(run).map((s) => (
                <div className="muted" key={s.metric}>{s.metric}: {formatPace(s.secondsPerMile)}</div>
              ))}
            </div>
          )}
        </div>
      ))}

      {editing && <EditModal run={editing} onClose={() => setEditing(null)} onSave={async (r) => {
        await onUpdate(r);
        setEditing(null);
      }} />}
    </div>
  );
}

function EditModal({ run, onClose, onSave }: { run: RunEntry; onClose: () => void; onSave: (run: RunEntry) => Promise<void>; }): JSX.Element {
  const [draft, setDraft] = useState<RunEntry>(run);
  const [saving, setSaving] = useState(false);

  async function save(): Promise<void> {
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal card">
        <h3>Edit Run</h3>
        <label>Date<input type="date" value={draft.dateISO} onChange={(e) => setDraft({ ...draft, dateISO: e.target.value })} /></label>
        <label>Type
          <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as RunType })}>
            <option>Long</option>
            <option>Tempo</option>
            <option>Interval</option>
            <option>Easy</option>
          </select>
        </label>
        <div className="grid3">
          <label>Avg HR<input type="number" value={draft.averageHeartRate} onChange={(e) => setDraft({ ...draft, averageHeartRate: Number(e.target.value || 0) })} /></label>
          <label>Max HR<input type="number" value={draft.maxHeartRate} onChange={(e) => setDraft({ ...draft, maxHeartRate: Number(e.target.value || 0) })} /></label>
          <label>Cadence<input type="number" value={draft.cadence} onChange={(e) => setDraft({ ...draft, cadence: Number(e.target.value || 0) })} /></label>
        </div>

        {draft.type === "Easy" ? (
          <label>Duration
            <input value={formatDuration(draft.easyDurationSeconds)} onChange={(e) => {
              const parsed = parseDuration(e.target.value);
              if (parsed === null) return;
              setDraft({ ...draft, easyDurationSeconds: parsed, laps: [] });
            }} />
          </label>
        ) : draft.type === "Long" ? (
          <div className="stack-tight">
            <div className="grid2">
              <strong>Mile</strong>
              <strong>Pace</strong>
            </div>
            {draft.laps.map((lap, idx) => (
              <div className="grid2" key={lap.id}>
                <div className="muted" style={{ paddingTop: 10 }}>{idx + 1}</div>
                <input value={formatPace(lap.paceSecondsPerMile)} onChange={(e) => {
                  const parsed = parsePace(e.target.value);
                  if (parsed === null) return;
                  const laps = draft.laps.slice();
                  laps[idx] = { ...lap, distanceMiles: 1, paceSecondsPerMile: parsed };
                  setDraft({ ...draft, laps });
                }} />
              </div>
            ))}
            <button className="secondary" onClick={() => {
              const nextLap = { id: uid(), distanceMiles: 1, paceSecondsPerMile: 0 };
              setDraft({ ...draft, laps: [...draft.laps, nextLap] });
            }}>Add Mile Split</button>
          </div>
        ) : (
          <div className="stack-tight">
            {draft.laps.map((lap, idx) => (
              <div className="grid2" key={lap.id}>
                <input type="number" step="0.01" value={lap.distanceMiles} onChange={(e) => {
                  const laps = draft.laps.slice();
                  laps[idx] = { ...lap, distanceMiles: Number(e.target.value || 0) };
                  setDraft({ ...draft, laps });
                }} />
                <input value={formatPace(lap.paceSecondsPerMile)} onChange={(e) => {
                  const parsed = parsePace(e.target.value);
                  if (parsed === null) return;
                  const laps = draft.laps.slice();
                  laps[idx] = { ...lap, paceSecondsPerMile: parsed };
                  setDraft({ ...draft, laps });
                }} />
              </div>
            ))}
          </div>
        )}

        <div className="row">
          <button className="secondary" onClick={onClose}>Cancel</button>
          <button onClick={() => { void save(); }} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        </div>
        <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>ID: {draft.id}</div>
      </div>
    </div>
  );
}
