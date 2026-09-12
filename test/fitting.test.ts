import { describe, expect, test } from "bun:test";
import { bisectBetween, growAndBisect } from "../src/fitting";

describe("growAndBisect", () => {
  test("grows from a too-small guess, then bisects down to just above the threshold", async () => {
    const threshold = 100;
    const calls: number[] = [];
    const { value, attempts } = await growAndBisect(
      async (candidate) => {
        calls.push(candidate);
        return candidate >= threshold;
      },
      10,
      1,
    );

    expect(value).toBeGreaterThanOrEqual(threshold);
    expect(value - threshold).toBeLessThanOrEqual(1);
    expect(attempts).toBe(calls.length);
    expect(attempts).toBeGreaterThan(1);
  });

  test("still bisects down from zero when the initial guess already fits", async () => {
    // Mirrors the original fitToOnePage: a guess that already fits on the
    // first try doesn't short-circuit — it's still only an upper bound, so
    // the search bisects between 0 and that guess for the true boundary.
    const threshold = 30;
    const calls: number[] = [];
    const { value, attempts } = await growAndBisect(
      async (candidate) => {
        calls.push(candidate);
        return candidate >= threshold;
      },
      50,
      1,
    );

    expect(calls[0]).toBe(50);
    expect(value).toBeGreaterThanOrEqual(threshold);
    expect(value - threshold).toBeLessThanOrEqual(1);
    expect(attempts).toBeGreaterThan(1);
  });

  test("respects a custom growth factor and step count", async () => {
    // growthFactor 2 from guess 1 reaches 128 in 7 doublings (1,2,4,...,128);
    // maxGrowthSteps 8 gives it exactly enough room.
    const { value } = await growAndBisect(async (candidate) => candidate >= 128, 1, 1, 8, 2);

    expect(value).toBeGreaterThanOrEqual(128);
  });

  test("throws when the growth limit is exhausted without ever fitting", async () => {
    await expect(growAndBisect(async () => false, 1, 1, 3, 2)).rejects.toThrow(
      "could not fit the content within the growth limit",
    );
  });

  test("the growth limit is exactly maxGrowthSteps attempts, not one more or fewer", async () => {
    let calls = 0;
    await expect(
      growAndBisect(
        async () => {
          calls += 1;
          return false;
        },
        1,
        1,
        5,
        2,
      ),
    ).rejects.toThrow();
    expect(calls).toBe(5);
  });
});

describe("bisectBetween", () => {
  test("bisects upward (fitsAt below failsAt) to just below the boundary", async () => {
    const boundary = 50;
    const result = await bisectBetween(async (v) => v < boundary, 0, 100, 0.5);

    expect(result).toBeLessThan(boundary);
    expect(boundary - result).toBeLessThanOrEqual(0.5);
  });

  test("bisects downward (fitsAt above failsAt) to just above the boundary", async () => {
    const boundary = 50;
    const result = await bisectBetween(async (v) => v > boundary, 100, 0, 0.5);

    expect(result).toBeGreaterThan(boundary);
    expect(result - boundary).toBeLessThanOrEqual(0.5);
  });

  test("returns fitsAt untouched, without calling check, when already within tolerance", async () => {
    let called = false;
    const result = await bisectBetween(
      async () => {
        called = true;
        return true;
      },
      10,
      10.3,
      1,
    );

    expect(result).toBe(10);
    expect(called).toBe(false);
  });

  test("the midpoint is the arithmetic mean of both bounds", async () => {
    const seen: number[] = [];
    await bisectBetween(
      async (v) => {
        seen.push(v);
        return v <= 60;
      },
      0,
      100,
      50,
    );

    // A single bisection step: only the midpoint of [0, 100] is ever checked.
    expect(seen).toEqual([50]);
  });
});
