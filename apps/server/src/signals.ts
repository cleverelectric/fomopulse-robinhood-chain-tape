import { dueSignals, MAX_POOL_AGE, markSignal, saveSignal } from "./db.ts";
import { discoverList } from "./discover.ts";
import { log } from "./log.ts";

export const SIGNAL_THRESHOLDS = [60, 70, 80, 90] as const;
export const SIGNAL_HORIZONS = [60, 300, 900, 3_600, 14_400, 86_400] as const;
const INTERVAL_MS = 120_000;
/** Keep enough old signals around for the longest forward mark plus a little slack. */
const MARK_LOOKBACK = 2 * 86_400;

export function captureSignals(now: number): { inserted: number; marked: number } {
  const rows = discoverList(now - MAX_POOL_AGE, 200);
  let inserted = 0;

  for (const row of rows) {
    for (const threshold of SIGNAL_THRESHOLDS) {
      if (row.alpha.score < threshold) continue;
      const id = saveSignal({
        token: row.token,
        pairAddress: row.pair_address,
        version: row.alpha.version,
        threshold,
        observedAt: now,
        score: row.alpha.score,
        price: row.price,
        quotedAt: row.quoted_at,
        liquidity: row.liquidity,
        marketCap: row.market_cap,
        evidence: JSON.stringify({
          alpha: row.alpha,
          buyers: row.buyers,
          buyers_recent: row.buyers_recent,
          sellers: row.sellers,
          bought_usd: row.bought_usd,
          sold_usd: row.sold_usd,
          holders: row.holders,
          holders_then: row.holders_then,
          first_buy_ts: row.first_buy_ts,
          first_lag: row.first_lag,
          pair_created_at: row.pair_created_at,
          volume24: row.volume24,
          liquidity: row.liquidity,
          market_cap: row.market_cap,
          mcap_at: row.mcap_at,
          dusted: row.dusted,
          wash: row.wash,
          best_rank: row.best_rank,
          buyers_list: row.buyers_list,
        }),
      });
      if (id !== null) inserted++;
    }
  }

  let marked = 0;
  for (const signal of dueSignals(now, now - MARK_LOOKBACK)) {
    markSignal(signal.id, signal.horizon, now, signal.price, signal.quotedAt);
    marked++;
  }
  return { inserted, marked };
}

export function startSignals(): ReturnType<typeof setInterval> {
  const tick = () => {
    try {
      const { inserted, marked } = captureSignals(Math.floor(Date.now() / 1000));
      if (inserted > 0 || marked > 0) log.info(`signals: ${inserted} new, ${marked} forward marks`);
    } catch (error) {
      log.error("signals", error);
    }
  };
  tick();
  return setInterval(tick, INTERVAL_MS);
}
