/**
 * The numeric search both page-fitting passes in `render.ts` are built on:
 * grow (or narrow) a candidate value until a `check` function's answer
 * changes, then close in on the boundary within `tolerance`. Pulled out on
 * its own so the search itself — not the PDF rendering behind `check` — is
 * what a test pins down. Mutants that concentrate in one function are a
 * refactor signal, not just a test-writing backlog: this used to be two
 * copies of the same bisection loop, one per direction.
 */

/**
 * Grows `value` from `initialGuess` (by `growthFactor` each step, up to
 * `maxGrowthSteps` times) until `check(value)` is true, then bisects back
 * down to the smallest value — within `tolerance` — that still satisfies it.
 *
 * Throws if `check` never returns true within `maxGrowthSteps`.
 */
export async function growAndBisect(
  check: (value: number) => Promise<boolean>,
  initialGuess: number,
  tolerance: number,
  maxGrowthSteps = 12,
  growthFactor = 1.35,
): Promise<{ value: number; attempts: number }> {
  let attempts = 0;
  const attempt = async (value: number) => {
    attempts += 1;
    return check(value);
  };

  let low = 0;
  let high = Math.ceil(initialGuess);
  let fits = false;

  for (let step = 0; step < maxGrowthSteps && !fits; step += 1) {
    fits = await attempt(high);
    if (!fits) {
      low = high;
      high = Math.ceil(high * growthFactor);
    }
  }
  if (!fits) throw new Error("could not fit the content within the growth limit");

  while (high - low > tolerance) {
    const middle = Math.round((low + high) / 2);
    if (await attempt(middle)) high = middle;
    else low = middle;
  }

  return { value: high, attempts };
}

/**
 * Bisects between `fitsAt` (already known to satisfy `check`) and `failsAt`
 * (already known not to) until within `tolerance`, returning the value
 * closest to `failsAt` that still satisfies `check`. Direction-agnostic:
 * `fitsAt` may be smaller or larger than `failsAt`.
 */
export async function bisectBetween(
  check: (value: number) => Promise<boolean>,
  fitsAt: number,
  failsAt: number,
  tolerance: number,
): Promise<number> {
  let tight = fitsAt;
  let loose = failsAt;
  while (Math.abs(loose - tight) > tolerance) {
    const middle = (loose + tight) / 2;
    if (await check(middle)) tight = middle;
    else loose = middle;
  }
  return tight;
}
