export interface SignalOutcome {
  threshold: number;
  horizon: number;
  entryPrice: number;
  exitPrice: number;
}

export interface BucketStats {
  threshold: number;
  horizon: number;
  count: number;
  median: number;
  mean: number;
  winRate: number;
  p25: number;
  p75: number;
}

const quantile = (values: number[], q: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * q;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  if (low === high) return sorted[low]!;
  const weight = index - low;
  return sorted[low]! * (1 - weight) + sorted[high]! * weight;
};

export function summarizeOutcomes(rows: SignalOutcome[]): BucketStats[] {
  const groups = new Map<string, SignalOutcome[]>();
  for (const row of rows) {
    if (!(row.entryPrice > 0) || !(row.exitPrice >= 0)) continue;
    const key = `${row.threshold}|${row.horizon}`;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }

  return [...groups.values()]
    .map((group) => {
      const first = group[0]!;
      const returns = group.map((row) => row.exitPrice / row.entryPrice - 1);
      return {
        threshold: first.threshold,
        horizon: first.horizon,
        count: returns.length,
        median: quantile(returns, 0.5),
        mean: returns.reduce((sum, value) => sum + value, 0) / returns.length,
        winRate: returns.filter((value) => value > 0).length / returns.length,
        p25: quantile(returns, 0.25),
        p75: quantile(returns, 0.75),
      };
    })
    .sort((a, b) => a.threshold - b.threshold || a.horizon - b.horizon);
}
