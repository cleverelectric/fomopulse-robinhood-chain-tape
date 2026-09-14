import { expect, test } from "bun:test";
import { summarizeOutcomes } from "../src/backtest.ts";

test("signal outcomes are grouped by threshold and horizon with robust distribution stats", () => {
  const stats = summarizeOutcomes([
    { threshold: 70, horizon: 300, entryPrice: 1, exitPrice: 1.2 },
    { threshold: 70, horizon: 300, entryPrice: 1, exitPrice: 0.8 },
    { threshold: 70, horizon: 300, entryPrice: 1, exitPrice: 1.1 },
    { threshold: 80, horizon: 300, entryPrice: 2, exitPrice: 3 },
  ]);

  expect(stats).toHaveLength(2);
  expect(stats[0]).toMatchObject({ threshold: 70, horizon: 300, count: 3 });
  expect(stats[0]!.median).toBeCloseTo(0.1);
  expect(stats[0]!.winRate).toBeCloseTo(2 / 3);
  expect(stats[1]).toMatchObject({ threshold: 80, horizon: 300, count: 1 });
  expect(stats[1]!.median).toBeCloseTo(0.5);
});

test("invalid entry prices are ignored", () => {
  const stats = summarizeOutcomes([{ threshold: 60, horizon: 60, entryPrice: 0, exitPrice: 2 }]);
  expect(stats).toEqual([]);
});
