export type RunType = "Long" | "Tempo" | "Interval" | "Easy";

export type LapInput = {
  id: string;
  distanceMiles: number;
  paceSecondsPerMile: number;
};

export type IntervalRepInput = {
  id: string;
  durationSeconds: number;
  paceSecondsPerMile: number;
};

export type RunEntry = {
  id: string;
  dateISO: string;
  type: RunType;
  averageHeartRate: number;
  maxHeartRate: number;
  cadence: number;
  laps: LapInput[];
  intervalCooldownMiles: number;
  intervalWarmUpPaceSecondsPerMile: number;
  intervalCoolDownPaceSecondsPerMile: number;
  intervalReps: IntervalRepInput[];
  tempoMilesCount: number;
  tempoIntervalCount: number;
  tempoIntervalDistanceMiles: number;
  easyDurationSeconds: number;
};

export type SegmentMetric =
  | "First 2 mi"
  | "Middle 4 mi"
  | "Last 2 mi"
  | "Next 0.5 mi"
  | "Next 3 mi"
  | "Warm-up 2 mi"
  | "Interval block"
  | "Cool down";

export type SegmentResult = {
  metric: SegmentMetric;
  secondsPerMile: number;
};

export type Insight = {
  title: string;
  detail: string;
  isPositive: boolean;
};
