import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RunEntry, RunType } from "../types/models";
import { formatDuration, formatPace } from "../lib/format";
import { averagePace, insights } from "../lib/runMath";

type Props = {
  runs: RunEntry[];
};

const runTypes: RunType[] = ["Long", "Tempo", "Interval", "Easy"];

export function AnalyzeView({ runs }: Props): JSX.Element {
  const [selected, setSelected] = useState<RunType>("Long");
  const byType = runs.filter((r) => r.type === selected);
  const chartData = byType
    .slice()
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
    .map((r) => ({
      date: r.dateISO,
      value: selected === "Easy" ? r.easyDurationSeconds : averagePace(r)
    }));

  const cards = insights(runs, selected);

  return (
    <div className="stack">
      <div className="card">
        <h2>Analysis</h2>
        <label>
          Run Type
          <select value={selected} onChange={(e) => setSelected(e.target.value as RunType)}>
            {runTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="card">
        <h3>{selected === "Easy" ? "Duration Trend" : "Pace Trend"}</h3>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(v) => (selected === "Easy" ? formatDuration(Number(v)) : formatPace(Number(v)))} />
              <Line type="monotone" dataKey="value" stroke="#0f766e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3>Actionable Insights</h3>
        {cards.map((card) => (
          <div className={`insight ${card.isPositive ? "good" : "warn"}`} key={card.title}>
            <div className="insight-title">{card.title}</div>
            <div className="muted">{card.detail}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Recent Runs</h3>
        {runTypes.map((t) => (
          <div key={t} className="muted">{t}: {runs.filter((r) => r.type === t).length}</div>
        ))}
      </div>
    </div>
  );
}
