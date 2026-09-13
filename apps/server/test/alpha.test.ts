import { expect, test } from "bun:test";
import { type AlphaInput, scoreAlpha } from "../src/alpha.ts";

const NOW = 1_800_000_000;

const strong = (over: Partial<AlphaInput> = {}): AlphaInput => ({
  buyers: 5,
  buyersRecent: 5,
  sellers: 0,
  holders: 5,
  rankedBuyers: [10, 40, 90],
  boughtUsd: 40_000,
  soldUsd: 5_000,
  liquidity: 200_000,
  volume24: 150_000,
  pairCreatedAt: (NOW - 30 * 60) * 1_000,
  firstLag: 2 * 60,
  mcapAt: 200_000,
  marketCap: 240_000,
  dusted: 0,
  wash: 0,
  now: NOW,
  ...over,
});

test("a clean multi-wallet cluster scores highly for explicit reasons", () => {
  const alpha = scoreAlpha(strong());

  expect(alpha.version).toBe("heuristic-v0");
  expect(alpha.score).toBeGreaterThanOrEqual(90);
  expect(alpha.breakdown).toMatchObject({
    crowd: 25,
    quality: 20,
    flow: 15,
    freshness: 10,
    liquidity: 8,
    retention: 10,
    early: 10,
    penalties: 0,
  });
  expect(alpha.reasons.some((reason) => reason.includes("5 recent tracked buyers"))).toBe(true);
  expect(alpha.reasons.some((reason) => reason.includes("ranked buyers led by #10"))).toBe(true);
});

test("wash, spray, churn, a late pump and exits reduce the score instead of hiding the evidence", () => {
  const clean = scoreAlpha(strong());
  const risky = scoreAlpha(
    strong({
      sellers: 4,
      holders: 2,
      boughtUsd: 40_000,
      soldUsd: 50_000,
      volume24: 2_500_000,
      marketCap: 1_200_000,
      dusted: 4,
      wash: 2,
    }),
  );

  expect(risky.score).toBeLessThan(clean.score - 50);
  expect(risky.breakdown.penalties).toBeGreaterThanOrEqual(60);
  expect(risky.reasons.some((reason) => reason.includes("wash activity"))).toBe(true);
  expect(risky.reasons.some((reason) => reason.includes("spray/handout"))).toBe(true);
  expect(risky.reasons.some((reason) => reason.includes("already 6.0×"))).toBe(true);
  expect(risky.reasons.some((reason) => reason.includes("net outflow"))).toBe(true);
});

test("an unranked single buyer is not promoted into a strong signal", () => {
  const alpha = scoreAlpha(
    strong({
      buyers: 1,
      buyersRecent: 1,
      holders: 1,
      rankedBuyers: [],
      boughtUsd: 300,
      soldUsd: 0,
      liquidity: 50_000,
      pairCreatedAt: (NOW - 20 * 3_600) * 1_000,
      firstLag: 5 * 3_600,
    }),
  );

  expect(alpha.score).toBeLessThan(50);
  expect(alpha.breakdown.quality).toBe(0);
  expect(alpha.breakdown.crowd).toBe(4);
});

test("the public score always stays inside 0..100", () => {
  const ceiling = scoreAlpha(strong({ buyersRecent: 100, liquidity: 2_000_000 }));
  const floor = scoreAlpha(
    strong({
      buyers: 1,
      buyersRecent: 0,
      sellers: 10,
      holders: 0,
      rankedBuyers: [],
      boughtUsd: 0,
      soldUsd: 100_000,
      liquidity: 10_000,
      volume24: 1_000_000,
      pairCreatedAt: null,
      firstLag: null,
      mcapAt: 10_000,
      marketCap: 1_000_000,
      dusted: 50,
      wash: 10,
    }),
  );

  expect(ceiling.score).toBeLessThanOrEqual(100);
  expect(floor.score).toBe(0);
});
