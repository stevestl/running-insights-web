import { formatDuration, formatPace, parseDuration, parsePace, uid } from "../lib/format";
import { averagePace, segmentResults, totalMiles } from "../lib/runMath";
import type { RunEntry, RunType } from "../types/models";

type Props = {
  draft: RunEntry;
  onChange: (next: RunEntry) => void;
  onSave: () => void;
};

export function AddRunView({ draft, onChange, onSave }: Props): JSX.Element {
  return (
    <div className="stack">
      <div className="card">
        <h2>Add Run</h2>
        <div className="grid2">
          <label>
            Date
            <input type="date" value={draft.dateISO} onChange={(e) => onChange({ ...draft, dateISO: e.target.value })} />
          </label>
          <label>
            Type
            <select value={draft.type} onChange={(e) => onChange(applyTypeTemplate({ ...draft, type: e.target.value as RunType }))}>
              <option>Long</option>
              <option>Tempo</option>
              <option>Interval</option>
              <option>Easy</option>
            </select>
          </label>
        </div>
      </div>

      <div className="card">
        <h3>Core Metrics</h3>
        <div className="grid3">
          <label>Avg HR<input type="number" value={draft.averageHeartRate || ""} onChange={(e) => onChange({ ...draft, averageHeartRate: Number(e.target.value || 0) })} /></label>
          <label>Max HR<input type="number" value={draft.maxHeartRate || ""} onChange={(e) => onChange({ ...draft, maxHeartRate: Number(e.target.value || 0) })} /></label>
          <label>Cadence<input type="number" value={draft.cadence || ""} onChange={(e) => onChange({ ...draft, cadence: Number(e.target.value || 0) })} /></label>
        </div>
      </div>

      {draft.type === "Long" && (
        <div className="card">
          <h3>Long Entry</h3>
          <label>Miles<input type="number" inputMode="numeric" value={draft.laps.length} onChange={(e) => onChange(ensureLongRows(draft, Number(e.target.value || 1)))} /></label>
          <table>
            <thead><tr><th>Mile</th><th>Pace (mm:ss or 1142)</th></tr></thead>
            <tbody>
              {draft.laps.map((lap, i) => (
                <tr key={lap.id}>
                  <td>{i + 1}</td>
                  <td><input value={formatPace(lap.paceSecondsPerMile)} onChange={(e) => {
                    const parsed = parsePace(e.target.value);
                    if (parsed === null) return;
                    const laps = draft.laps.slice();
                    laps[i] = { ...lap, distanceMiles: 1, paceSecondsPerMile: parsed };
                    onChange({ ...draft, laps });
                  }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {draft.type === "Tempo" && (
        <div className="card">
          <h3>Tempo Entry</h3>
          <div className="grid3">
            <label>Miles<input type="number" inputMode="numeric" value={draft.tempoMilesCount} onChange={(e) => onChange(ensureTempoRows(draft, Number(e.target.value || 1), draft.tempoIntervalCount, draft.tempoIntervalDistanceMiles))} /></label>
            <label>Tempo distance (mi)<input type="number" inputMode="decimal" step="0.01" value={draft.tempoIntervalDistanceMiles} onChange={(e) => onChange(ensureTempoRows(draft, draft.tempoMilesCount, draft.tempoIntervalCount, Number(e.target.value || 0.5)))} /></label>
            <label>Tempo intervals<input type="number" inputMode="numeric" value={draft.tempoIntervalCount} onChange={(e) => onChange(ensureTempoRows(draft, draft.tempoMilesCount, Number(e.target.value || 1), draft.tempoIntervalDistanceMiles))} /></label>
          </div>
          <table>
            <thead><tr><th>Row</th><th>Pace</th></tr></thead>
            <tbody>
              {draft.laps.map((lap, i) => (
                <tr key={lap.id}>
                  <td>{i < draft.tempoMilesCount ? `Mile ${i + 1}` : `Tempo ${i - draft.tempoMilesCount + 1}`}</td>
                  <td><input value={formatPace(lap.paceSecondsPerMile)} onChange={(e) => {
                    const parsed = parsePace(e.target.value);
                    if (parsed === null) return;
                    const laps = draft.laps.slice();
                    laps[i] = { ...lap, paceSecondsPerMile: parsed };
                    onChange({ ...draft, laps });
                  }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {draft.type === "Interval" && (
        <div className="card">
          <h3>Interval Entry</h3>
          <div className="grid3">
            <label>Intervals<input type="number" inputMode="numeric" value={draft.intervalReps.length} onChange={(e) => onChange(ensureIntervalRows(draft, Number(e.target.value || 1)))} /></label>
            <label>Warm-up pace<input value={formatPace(draft.intervalWarmUpPaceSecondsPerMile)} onChange={(e) => {
              const parsed = parsePace(e.target.value);
              if (parsed === null) return;
              onChange({ ...draft, intervalWarmUpPaceSecondsPerMile: parsed });
            }} /></label>
            <label>Cool-down miles<input type="number" step="0.1" inputMode="decimal" value={draft.intervalCooldownMiles} onChange={(e) => onChange({ ...draft, intervalCooldownMiles: Number(e.target.value || 0) })} /></label>
          </div>
          <table>
            <thead><tr><th>Duration (m:ss or 123)</th><th>Pace</th></tr></thead>
            <tbody>
              {draft.intervalReps.map((rep, i) => (
                <tr key={rep.id}>
                  <td><input value={formatDuration(rep.durationSeconds)} onChange={(e) => {
                    const parsed = parseDuration(e.target.value);
                    if (parsed === null) return;
                    const reps = draft.intervalReps.slice();
                    reps[i] = { ...rep, durationSeconds: parsed };
                    onChange({ ...draft, intervalReps: reps });
                  }} /></td>
                  <td><input value={formatPace(rep.paceSecondsPerMile)} onChange={(e) => {
                    const parsed = parsePace(e.target.value);
                    if (parsed === null) return;
                    const reps = draft.intervalReps.slice();
                    reps[i] = { ...rep, paceSecondsPerMile: parsed };
                    onChange({ ...draft, intervalReps: reps });
                  }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {draft.type === "Easy" && (
        <div className="card">
          <h3>Easy Entry</h3>
          <label>Total run duration
            <input value={formatDuration(draft.easyDurationSeconds)} onChange={(e) => {
              const parsed = parseDuration(e.target.value);
              if (parsed === null) return;
              onChange({ ...draft, easyDurationSeconds: parsed, laps: [] });
            }} />
          </label>
        </div>
      )}

      <div className="card">
        <button onClick={onSave}>Save Run</button>
      </div>

      {draft.type !== "Easy" && (
        <div className="card">
          <h3>Auto Summary</h3>
          <div className="muted">Total miles: {totalMiles(draft).toFixed(2)}</div>
          <div className="muted">Average pace: {formatPace(averagePace(draft))}</div>
          {segmentResults(draft).map((s) => (
            <div className="muted" key={s.metric}>{s.metric}: {formatPace(s.secondsPerMile)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function ensureLongRows(run: RunEntry, miles: number): RunEntry {
  const count = Math.max(1, Math.min(30, miles || 3));
  const laps = Array.from({ length: count }, (_, i) => ({ id: run.laps[i]?.id ?? uid(), distanceMiles: 1, paceSecondsPerMile: run.laps[i]?.paceSecondsPerMile ?? 600 }));
  return { ...run, laps };
}

function applyTypeTemplate(run: RunEntry): RunEntry {
  if (run.type === "Long") return ensureLongRows(run, run.laps.length || 3);
  if (run.type === "Tempo") return ensureTempoRows(run, run.tempoMilesCount || 3, run.tempoIntervalCount || 1, run.tempoIntervalDistanceMiles || 0.5);
  if (run.type === "Interval") return ensureIntervalRows(run, run.intervalReps.length || 1);
  return { ...run, laps: [] };
}

function ensureTempoRows(run: RunEntry, miles: number, intervals: number, distance: number): RunEntry {
  const mileCount = Math.max(1, Math.min(30, miles || 3));
  const intCount = Math.max(1, Math.min(30, intervals || 1));
  const dist = Math.max(0.05, Math.min(5, distance || 0.5));

  const laps = [
    ...Array.from({ length: mileCount }, (_, i) => ({ id: run.laps[i]?.id ?? uid(), distanceMiles: 1, paceSecondsPerMile: run.laps[i]?.paceSecondsPerMile ?? 600 })),
    ...Array.from({ length: intCount }, (_, i) => ({
      id: run.laps[mileCount + i]?.id ?? uid(),
      distanceMiles: dist,
      paceSecondsPerMile: run.laps[mileCount + i]?.paceSecondsPerMile ?? 540
    }))
  ];

  return { ...run, tempoMilesCount: mileCount, tempoIntervalCount: intCount, tempoIntervalDistanceMiles: dist, laps };
}

function ensureIntervalRows(run: RunEntry, intervals: number): RunEntry {
  const count = Math.max(1, Math.min(30, intervals || 1));
  const reps = Array.from({ length: count }, (_, i) => ({
    id: run.intervalReps[i]?.id ?? uid(),
    durationSeconds: run.intervalReps[i]?.durationSeconds ?? 90,
    paceSecondsPerMile: run.intervalReps[i]?.paceSecondsPerMile ?? 480
  }));
  return { ...run, intervalReps: reps };
}
