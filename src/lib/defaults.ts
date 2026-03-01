import type { RunEntry, RunType } from "../types/models";
import { uid } from "./format";

export function makeDefaultRun(type: RunType = "Long"): RunEntry {
  return {
    id: uid(),
    dateISO: new Date().toISOString().slice(0, 10),
    type,
    averageHeartRate: 0,
    maxHeartRate: 0,
    cadence: 0,
    laps: [{ id: uid(), distanceMiles: 1, paceSecondsPerMile: 600 }, { id: uid(), distanceMiles: 1, paceSecondsPerMile: 600 }, { id: uid(), distanceMiles: 1, paceSecondsPerMile: 600 }],
    intervalCooldownMiles: 1,
    intervalWarmUpPaceSecondsPerMile: 660,
    intervalCoolDownPaceSecondsPerMile: 720,
    intervalReps: [{ id: uid(), durationSeconds: 90, paceSecondsPerMile: 480 }],
    tempoMilesCount: 3,
    tempoIntervalCount: 1,
    tempoIntervalDistanceMiles: 0.5,
    easyDurationSeconds: 1800
  };
}
