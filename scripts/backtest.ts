import { summarizeOutcomes } from "../apps/server/src/backtest.ts";
import { db } from "../apps/server/src/db.ts";

const rows = db
  .query<{ threshold: number; horizon: number; entryPrice: number; exitPrice: number }, []>(
    `SELECT s.threshold AS threshold, m.horizon AS horizon,
            s.price AS entryPrice, m.price AS exitPrice
       FROM signals s
       JOIN signal_marks m ON m.signal_id = s.id
      WHERE s.price IS NOT NULL AND s.price > 0 AND m.price IS NOT NULL`,
  )
  .all();

const stats = summarizeOutcomes(rows);
if (stats.length === 0) {
  console.log("No completed signal marks yet.");
  process.exit(0);
}

console.log("threshold\thorizon\tn\tmedian\tmean\twin%\tp25\tp75");
for (const row of stats) {
  const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
  console.log(
    [
      row.threshold,
      row.horizon,
      row.count,
      pct(row.median),
      pct(row.mean),
      pct(row.winRate),
      pct(row.p25),
      pct(row.p75),
    ].join("\t"),
  );
}
