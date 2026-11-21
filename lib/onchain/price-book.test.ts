import { describe, expect, it } from "vitest";
import { MOCK_STOCKS } from "@/lib/data/mock/stocks";
import { PRICE_BOOK_STOCKS } from "./universe";
import { MAX_STOCKS, decodePriceBook, encodePushPrices, priceBookAddress, toMicroUsd, twapBetween } from "./price-book";

describe("price book universe", () => {
  it("matches the game's stock list in the same order", () => {
    expect(PRICE_BOOK_STOCKS.map(([t, m]) => `${t}:${m}`)).toEqual(MOCK_STOCKS.map((s) => `${s.ticker}:${s.mint}`));
  });
  it("fits the onchain capacity", () => {
    expect(PRICE_BOOK_STOCKS.length).toBeLessThanOrEqual(MAX_STOCKS);
  });
});

describe("price encoding", () => {
  it("converts USD to micro-USD and treats missing prices as no update", () => {
    expect(toMicroUsd(354.66)).toBe(BigInt(354_660_000));
    expect(toMicroUsd(undefined)).toBe(BigInt(0));
    expect(toMicroUsd(-1)).toBe(BigInt(0));
  });
  it("encodes push_prices as discriminator + vec<u64>", () => {
    const data = encodePushPrices([BigInt(1), BigInt(2)]);
    expect(data.length).toBe(8 + 4 + 16);
    expect(Array.from(data.slice(0, 8))).toEqual([120, 246, 190, 84, 249, 75, 136, 47]);
    expect(data[8]).toBe(2);
    expect(data[12]).toBe(1);
    expect(data[20]).toBe(2);
  });
  it("derives a stable price book address", async () => {
    expect(await priceBookAddress()).toBe(await priceBookAddress());
  });
});

function fakeAccount(count: number, prices: number[], cum: bigint[], lastTs: number): Uint8Array {
  const size = 8 + 32 + 32 + 1 + 1 + 8 + 8 + 8 + MAX_STOCKS * 8 + MAX_STOCKS * 16 + MAX_STOCKS * 8;
  const b = new Uint8Array(size);
  const v = new DataView(b.buffer);
  b.set([58, 79, 217, 46, 6, 199, 93, 200], 0);
  let o = 8 + 64;
  b[o] = count;
  o += 2;
  v.setBigUint64(o, BigInt(7), true);
  v.setBigInt64(o + 8, BigInt(1000), true);
  v.setBigInt64(o + 16, BigInt(lastTs), true);
  o += 24;
  prices.forEach((p, i) => v.setBigUint64(o + i * 8, toMicroUsd(p), true));
  o += MAX_STOCKS * 8;
  cum.forEach((c, i) => {
    v.setBigUint64(o + i * 16, c & BigInt("0xffffffffffffffff"), true);
    v.setBigUint64(o + i * 16 + 8, c >> BigInt(64), true);
  });
  return b;
}

describe("price book decoding", () => {
  it("round-trips the account layout and computes TWAP", () => {
    const a = decodePriceBook(fakeAccount(2, [100, 200], [BigInt(0), BigInt(0)], 1000));
    expect(a.count).toBe(2);
    expect(a.updates).toBe(7);
    expect(a.prices).toEqual([100, 200]);
    // 60s at $100 then 120s at $110
    const cum = BigInt(100 * 60 + 110 * 120) * BigInt(1_000_000);
    const b = decodePriceBook(fakeAccount(2, [110, 200], [cum, BigInt(200 * 180 * 1_000_000)], 1180));
    expect(twapBetween(a, b, 0)).toBeCloseTo((100 * 60 + 110 * 120) / 180, 4);
    expect(twapBetween(a, b, 1)).toBe(200);
    expect(twapBetween(b, a, 0)).toBeNull();
  });
  it("rejects other accounts", () => {
    expect(() => decodePriceBook(new Uint8Array(64))).toThrow();
  });
});
