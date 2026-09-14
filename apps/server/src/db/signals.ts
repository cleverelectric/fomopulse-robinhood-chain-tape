import { db } from "./connection.ts";

export interface SignalSnapshot {
  token: string;
  pairAddress: string | null;
  version: string;
  threshold: number;
  observedAt: number;
  score: number;
  price: number | null;
  quotedAt: number | null;
  liquidity: number | null;
  marketCap: number | null;
  evidence: string;
}

export interface DueSignal {
  id: number;
  token: string;
  horizon: number;
  price: number | null;
  quotedAt: number | null;
}

const insert = db.query<
  { id: number },
  [
    string,
    string | null,
    string,
    number,
    number,
    number,
    number | null,
    number | null,
    number | null,
    number | null,
    string,
  ]
>(
  `INSERT OR IGNORE INTO signals (
     token, pair_address, version, threshold, observed_at, score,
     price, quoted_at, liquidity, market_cap, evidence
   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   RETURNING id`,
);

const due = db.query<
  { id: number; token: string; horizon: number; price: number | null; quotedAt: number | null },
  [number, number]
>(
  `WITH horizons(value) AS (VALUES (60), (300), (900), (3600), (14400), (86400))
   SELECT s.id AS id, s.token AS token, h.value AS horizon,
          p.price_usd AS price, p.updated_at AS quotedAt
     FROM signals s
     CROSS JOIN horizons h
     LEFT JOIN signal_marks m ON m.signal_id = s.id AND m.horizon = h.value
     LEFT JOIN prices p ON p.token = s.token
    WHERE m.signal_id IS NULL
      AND s.observed_at + h.value <= ?1
      AND (?2 <= 0 OR s.observed_at >= ?2)
    ORDER BY s.observed_at, h.value`,
);

const mark = db.query<
  null,
  [number, number, number, number | null, number | null]
>(
  `INSERT OR IGNORE INTO signal_marks (signal_id, horizon, marked_at, price, quoted_at)
   VALUES (?, ?, ?, ?, ?)`,
);

export function saveSignal(snapshot: SignalSnapshot): number | null {
  const row = insert.get(
    snapshot.token,
    snapshot.pairAddress,
    snapshot.version,
    snapshot.threshold,
    snapshot.observedAt,
    snapshot.score,
    snapshot.price,
    snapshot.quotedAt,
    snapshot.liquidity,
    snapshot.marketCap,
    snapshot.evidence,
  );
  return row?.id ?? null;
}

export function dueSignals(now: number, sinceTs = 0): DueSignal[] {
  return due.all(now, sinceTs);
}

export function markSignal(
  signalId: number,
  horizon: number,
  markedAt: number,
  price: number | null,
  quotedAt: number | null,
): void {
  mark.run(signalId, horizon, markedAt, price, quotedAt);
}
