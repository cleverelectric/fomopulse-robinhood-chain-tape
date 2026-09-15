import { expect, test } from "bun:test";
import { db, dueSignals, markSignal, saveSignal } from "../src/db.ts";

const token = "0x51a1000000000000000000000000000000000001";

const snapshot = (over: Partial<Parameters<typeof saveSignal>[0]> = {}) => ({
  token,
  pairAddress: "0xpair",
  version: "heuristic-v0",
  threshold: 70,
  observedAt: 1_800_000_000,
  score: 74,
  price: 1,
  quotedAt: 1_800_000_000,
  liquidity: 100_000,
  marketCap: 500_000,
  evidence: JSON.stringify({ alpha: { score: 74 } }),
  ...over,
});

test("a threshold crossing is immutable for one token and score version", () => {
  const first = saveSignal(snapshot());
  const duplicate = saveSignal(snapshot({ observedAt: 1_800_000_120, score: 88, price: 2 }));

  expect(first).not.toBeNull();
  expect(duplicate).toBeNull();

  const row = db
    .query<{ observed_at: number; score: number; price: number }, [number]>(
      "SELECT observed_at, score, price FROM signals WHERE id = ?",
    )
    .get(first!);
  expect(row).toEqual({ observed_at: 1_800_000_000, score: 74, price: 1 });
});

test("a forward mark waits for a quote at or after the horizon and is written once", () => {
  const markedToken = "0x51a1000000000000000000000000000000000002";
  const signal = saveSignal(snapshot({ token: markedToken, threshold: 80, score: 82 }))!;

  db.query(
    "INSERT INTO prices (token, price_usd, liquidity_usd, change24, pair_created_at, pair_address, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(markedToken, 1.25, 100_000, 0, 1_799_000_000_000, "0xpair2", 1_800_000_050);

  expect(dueSignals(1_800_000_120).filter((row) => row.id === signal)).toHaveLength(0);

  db.query("UPDATE prices SET updated_at = ?, price_usd = ? WHERE token = ?").run(1_800_000_061, 1.3, markedToken);
  const due = dueSignals(1_800_000_120).filter((row) => row.id === signal && row.horizon === 60);
  expect(due).toHaveLength(1);
  expect(due[0]!.price).toBe(1.3);

  markSignal(signal, 60, 1_800_000_120, due[0]!.price, due[0]!.quotedAt);
  expect(dueSignals(1_800_000_120).filter((row) => row.id === signal && row.horizon === 60)).toHaveLength(0);

  markSignal(signal, 60, 1_800_000_180, 9, 1_800_000_180);
  const mark = db
    .query<{ price: number; marked_at: number }, [number]>(
      "SELECT price, marked_at FROM signal_marks WHERE signal_id = ? AND horizon = 60",
    )
    .get(signal)!;
  expect(mark).toEqual({ price: 1.3, marked_at: 1_800_000_120 });
});
