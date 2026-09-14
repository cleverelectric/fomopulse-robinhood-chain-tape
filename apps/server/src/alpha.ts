/**
 * A deliberately boring first-pass signal score. It is not a prediction model and the weights
 * are not backtested yet; the point is to turn Discover's evidence into one explainable number
 * that can later be calibrated against recorded forward returns.
 */

export const ALPHA_VERSION = "heuristic-v0" as const;

export interface AlphaInput {
  buyers: number;
  buyersRecent: number;
  sellers: number;
  holders: number;
  rankedBuyers: number[];
  boughtUsd: number;
  soldUsd: number;
  liquidity: number | null;
  volume24: number | null;
  pairCreatedAt: number | null;
  firstLag: number | null;
  mcapAt: number | null;
  marketCap: number | null;
  dusted: number;
  wash: number;
  now: number;
}

export interface AlphaBreakdown {
  crowd: number;
  quality: number;
  flow: number;
  freshness: number;
  liquidity: number;
  retention: number;
  early: number;
  penalties: number;
}

export interface AlphaSignal {
  version: typeof ALPHA_VERSION;
  score: number;
  breakdown: AlphaBreakdown;
  reasons: string[];
}

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

const crowdPoints = (buyers: number): number => {
  if (buyers >= 5) return 25;
  if (buyers === 4) return 21;
  if (buyers === 3) return 16;
  if (buyers === 2) return 10;
  if (buyers === 1) return 4;
  return 0;
};

const qualityPoints = (ranks: number[]): number => {
  const clean = ranks.filter((rank) => Number.isFinite(rank) && rank > 0).sort((a, b) => a - b);
  if (clean.length === 0) return 0;
  const best = clean[0]!;
  const bestPoints = best <= 25 ? 12 : best <= 50 ? 10 : best <= 100 ? 8 : best <= 200 ? 5 : 2;
  const breadthPoints = clean.length >= 3 ? 8 : clean.length === 2 ? 5 : 2;
  return bestPoints + breadthPoints;
};

const flowPoints = (net: number, liquidity: number | null): number => {
  if (net <= 0) return 0;
  if (liquidity !== null && liquidity > 0) {
    const share = net / liquidity;
    if (share >= 0.1) return 15;
    if (share >= 0.05) return 12;
    if (share >= 0.02) return 8;
    if (share >= 0.005) return 4;
    return 1;
  }
  if (net >= 50_000) return 15;
  if (net >= 20_000) return 12;
  if (net >= 5_000) return 8;
  if (net >= 1_000) return 4;
  return 1;
};

const freshnessPoints = (createdAt: number | null, now: number): number => {
  if (createdAt === null) return 0;
  const age = Math.max(0, now - createdAt / 1_000);
  if (age <= 3_600) return 10;
  if (age <= 6 * 3_600) return 8;
  if (age <= 24 * 3_600) return 6;
  if (age <= 48 * 3_600) return 4;
  if (age <= 72 * 3_600) return 2;
  return 0;
};

const liquidityPoints = (liquidity: number | null): number => {
  if (liquidity === null) return 0;
  if (liquidity >= 250_000) return 10;
  if (liquidity >= 100_000) return 8;
  if (liquidity >= 50_000) return 6;
  if (liquidity >= 25_000) return 4;
  if (liquidity >= 10_000) return 2;
  return 0;
};

const earlyPoints = (lag: number | null): number => {
  if (lag === null) return 0;
  if (lag <= 5 * 60) return 10;
  if (lag <= 30 * 60) return 8;
  if (lag <= 2 * 3_600) return 6;
  if (lag <= 6 * 3_600) return 3;
  if (lag <= 24 * 3_600) return 1;
  return 0;
};

const penaltyPoints = (input: AlphaInput): { total: number; reasons: string[] } => {
  let total = 0;
  const reasons: string[] = [];

  if (input.wash > 0) {
    const points = Math.min(20, input.wash * 10);
    total += points;
    reasons.push(`−${points} wash activity`);
  }

  if (input.dusted > 0) {
    const points = Math.min(15, 5 + Math.floor(input.dusted / 2) * 2);
    total += points;
    reasons.push(`−${points} spray/handout activity`);
  }

  if (input.liquidity !== null && input.liquidity > 0 && input.volume24 !== null) {
    const churn = input.volume24 / input.liquidity;
    const points = churn > 10 ? 10 : churn > 5 ? 6 : churn > 2 ? 2 : 0;
    if (points > 0) {
      total += points;
      reasons.push(`−${points} high churn`);
    }
  }

  if (input.mcapAt !== null && input.mcapAt > 0 && input.marketCap !== null) {
    const multiple = input.marketCap / input.mcapAt;
    const points = multiple > 5 ? 15 : multiple > 3 ? 10 : multiple > 2 ? 6 : multiple > 1.5 ? 3 : 0;
    if (points > 0) {
      total += points;
      reasons.push(`−${points} already ${multiple.toFixed(1)}× since first tracked buy`);
    }
  }

  if (input.soldUsd > input.boughtUsd) {
    total += 10;
    reasons.push("−10 tracked net outflow");
  }

  if (input.buyers > 0 && input.sellers / input.buyers > 0.5) {
    const points = input.sellers >= input.buyers ? 8 : 4;
    total += points;
    reasons.push(`−${points} many tracked sellers`);
  }

  return { total, reasons };
};

export function scoreAlpha(input: AlphaInput): AlphaSignal {
  const net = input.boughtUsd - input.soldUsd;
  const crowd = crowdPoints(input.buyersRecent);
  const quality = qualityPoints(input.rankedBuyers);
  const flow = flowPoints(net, input.liquidity);
  const freshness = freshnessPoints(input.pairCreatedAt, input.now);
  const liquidity = liquidityPoints(input.liquidity);
  const retention = input.buyers <= 0 ? 0 : Math.round(10 * clamp(input.holders / input.buyers, 0, 1));
  const early = earlyPoints(input.firstLag);
  const penalty = penaltyPoints(input);
  const positive = crowd + quality + flow + freshness + liquidity + retention + early;
  const score = Math.round(clamp(positive - penalty.total, 0, 100));

  const reasons: string[] = [];
  if (crowd >= 16) reasons.push(`${input.buyersRecent} recent tracked buyers`);
  if (quality >= 10 && input.rankedBuyers.length > 0)
    reasons.push(`ranked buyers led by #${Math.min(...input.rankedBuyers)}`);
  if (flow >= 8) reasons.push(`$${Math.round(Math.max(0, net)).toLocaleString("en-US")} tracked net inflow`);
  if (early >= 8) reasons.push("tracked wallets found the pool early");
  if (liquidity >= 8) reasons.push("stronger pool liquidity");
  if (retention >= 8 && input.buyers > 1) reasons.push(`${input.holders}/${input.buyers} tracked buyers still holding`);
  reasons.push(...penalty.reasons);

  return {
    version: ALPHA_VERSION,
    score,
    breakdown: { crowd, quality, flow, freshness, liquidity, retention, early, penalties: penalty.total },
    reasons,
  };
}
