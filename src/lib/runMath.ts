import type { Insight, LapInput, RunEntry, RunType, SegmentMetric, SegmentResult } from "../types/models";

function effectiveLaps(run: RunEntry): LapInput[] {
  if (run.type !== "Interval") return run.laps;
  const laps: LapInput[] = [
    {
      id: "warm",
      distanceMiles: 2,
      paceSecondsPerMile: run.intervalWarmUpPaceSecondsPerMile
    },
    ...run.intervalReps
      .filter((r) => r.durationSeconds > 0 && r.paceSecondsPerMile > 0)
      .map((r) => ({ id: r.id, distanceMiles: r.durationSeconds / r.paceSecondsPerMile, paceSecondsPerMile: r.paceSecondsPerMile }))
  ];

  if (run.intervalCooldownMiles > 0) {
    laps.push({
      id: "cool",
      distanceMiles: run.intervalCooldownMiles,
      paceSecondsPerMile: run.intervalCoolDownPaceSecondsPerMile
    });
  }
  return laps;
}

export function totalMiles(run: RunEntry): number {
  if (run.type === "Easy") return 0;
  return effectiveLaps(run).reduce((acc, lap) => acc + lap.distanceMiles, 0);
}

export function averagePace(run: RunEntry): number {
  if (run.type === "Easy") return 0;
  const miles = totalMiles(run);
  if (miles <= 0) return 0;
  const totalSeconds = effectiveLaps(run).reduce((acc, lap) => acc + lap.distanceMiles * lap.paceSecondsPerMile, 0);
  return totalSeconds / miles;
}

function paceResult(metric: SegmentMetric, start: number, end: number, laps: LapInput[]): SegmentResult | null {
  if (end <= start) return null;
  let cursor = 0;
  let coveredMiles = 0;
  let coveredSeconds = 0;

  for (const lap of laps) {
    const lapStart = cursor;
    const lapEnd = cursor + lap.distanceMiles;
    cursor = lapEnd;

    const overlapStart = Math.max(lapStart, start);
    const overlapEnd = Math.min(lapEnd, end);
    const overlapMiles = overlapEnd - overlapStart;

    if (overlapMiles > 0) {
      coveredMiles += overlapMiles;
      coveredSeconds += overlapMiles * lap.paceSecondsPerMile;
    }
  }

  if (coveredMiles <= 0) return null;
  return { metric, secondsPerMile: coveredSeconds / coveredMiles };
}

export function segmentResults(run: RunEntry): SegmentResult[] {
  const laps = effectiveLaps(run);
  if (run.type === "Long") {
    return [
      paceResult("First 2 mi", 0, 2, laps),
      paceResult("Middle 4 mi", 2, 6, laps),
      paceResult("Last 2 mi", 6, 8, laps)
    ].filter(Boolean) as SegmentResult[];
  }
  if (run.type === "Tempo") {
    const miles = totalMiles(run);
    const coolStart = Math.min(miles, 5.5);
    return [
      paceResult("First 2 mi", 0, 2, laps),
      paceResult("Next 0.5 mi", 2, 2.5, laps),
      paceResult("Next 3 mi", 2.5, 5.5, laps),
      paceResult("Cool down", coolStart, miles, laps)
    ].filter(Boolean) as SegmentResult[];
  }
  if (run.type === "Interval") {
    const miles = totalMiles(run);
    const cool = Math.max(0, Math.min(run.intervalCooldownMiles, Math.max(0, miles - 2)));
    const end = Math.max(2, miles - cool);
    return [
      paceResult("Warm-up 2 mi", 0, 2, laps),
      paceResult("Interval block", 2, end, laps),
      paceResult("Cool down", end, miles, laps)
    ].filter(Boolean) as SegmentResult[];
  }
  return [];
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function std(values: number[]): number {
  const avg = mean(values);
  return Math.sqrt(values.map((v) => (v - avg) ** 2).reduce((a, b) => a + b, 0) / values.length);
}

function comparisonBlocks<T>(values: T[]): { previous: T[]; recent: T[] } {
  if (values.length >= 8) {
    return {
      previous: values.slice(-8, -4),
      recent: values.slice(-4)
    };
  }
  const half = Math.floor(values.length / 2);
  return {
    previous: values.slice(0, half),
    recent: values.slice(-half)
  };
}

export function insights(runs: RunEntry[], type: RunType): Insight[] {
  const filtered = runs.filter((r) => r.type === type).sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  if (filtered.length < 4) {
    return [{ title: "Need more data", detail: `Add at least 4 ${type.toLowerCase()} runs for reliable trend signals.`, isPositive: false }];
  }

  const items: Insight[] = [];
  const blocks = comparisonBlocks(filtered);

  if (type !== "Easy") {
    const recentPace = blocks.recent.map(averagePace);
    const prevPace = blocks.previous.map(averagePace);
    if (recentPace.length > 0 && prevPace.length > 0) {
      const delta = mean(recentPace) - mean(prevPace);
      items.push({
        title: "Overall pace trend",
        detail: delta < -8
          ? `Recent runs are ${Math.round(Math.abs(delta))} sec/mi faster than prior block.`
          : `Recent runs are ${Math.round(Math.abs(delta))} sec/mi slower than prior block.`,
        isPositive: delta < -8
      });
    }
  }

  const hrRecent = blocks.recent.map((r) => r.averageHeartRate);
  const hrPrevious = blocks.previous.map((r) => r.averageHeartRate);
  if (hrRecent.length > 0 && hrPrevious.length > 0) {
    const delta = mean(hrRecent) - mean(hrPrevious);
    items.push({
      title: "Cardiac load",
      detail: Math.abs(delta) <= 3 ? "Average HR is stable." : `Average HR shifted by ${Math.round(delta)} bpm.`,
      isPositive: Math.abs(delta) <= 3
    });
  }

  if (type === "Tempo") {
    const recent = filtered.slice(-4).map((r) => segmentResults(r).map((s) => s.secondsPerMile)).filter((p) => p.length >= 3);
    if (recent.length > 0) {
      const variability = mean(recent.map(std));
      items.push({
        title: "Tempo consistency",
        detail: variability <= 12 ? `Tempo pacing is consistent (±${Math.round(variability)} sec/mi).` : `Tempo pacing varies (±${Math.round(variability)} sec/mi).`,
        isPositive: variability <= 12
      });
    }
  }

  if (type === "Easy") {
    const recentDuration = blocks.recent.map((r) => r.easyDurationSeconds);
    const prevDuration = blocks.previous.map((r) => r.easyDurationSeconds);
    if (recentDuration.length > 0 && prevDuration.length > 0) {
      const delta = mean(recentDuration) - mean(prevDuration);
      items.push({
        title: "Easy run duration",
        detail: delta > 120 ? `Recent easy runs are longer by ~${Math.round(delta)} sec.` : `Easy run duration change is ~${Math.round(delta)} sec.`,
        isPositive: delta > 120
      });
    }
  }

  if (items.length === 0) {
    return [{
      title: "Collecting trend signal",
      detail: `You have ${filtered.length} ${type.toLowerCase()} runs. Add more runs of this type to strengthen trend comparisons.`,
      isPositive: false
    }];
  }

  return items;
}
