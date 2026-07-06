// Stage 3 fine-structure isotope simulation (spec §8).
//
// - Build the ion formula: multiply neutral element counts by adduct.n, then apply atomDelta.
// - For each element (with count n in ion), enumerate isotopologue branches via
//   multinomial expansion, pruning branches whose cumulative probability falls
//   below the pruning threshold.
// - Convolve across elements: mass adds, probability multiplies. Merge only when
//   two entries have masses equal within PEAK_MERGE_EPS (float dedup, NOT nominal binning).
// - Convert mass → m/z via m/z = (mass − sign·z·mₑ) / z.
// - Build peak labels enumerating non-monoisotopic contributions.

import { ELECTRON_MASS, PEAK_MERGE_EPS } from './constants.js';
import { NUCLIDES } from '../data/nuclides.js';
import { formatIonFormula } from './formulaFormat.js';

// element -> [{ nuclide, ...}] sorted by isMonoisotopic first
function isotopesOf(elementSym) {
  return NUCLIDES.filter((n) => n.element === elementSym);
}

// Combination C(n,k) computed by product to avoid huge intermediate factorials.
function binomial(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let res = 1;
  for (let i = 1; i <= k; i++) {
    res = (res * (n - i + 1)) / i;
  }
  return res;
}

// Multinomial coefficient n! / (k1! · k2! · ... · km!) computed as chained binomials
// so we never form n!. counts is an array of k values summing to n.
function multinomial(n, counts) {
  let res = 1;
  let remaining = n;
  for (const k of counts) {
    res *= binomial(remaining, k);
    remaining -= k;
  }
  return res;
}

// Enumerate isotopologue branches for one element with total count n.
// Returns [{ isotopeCounts: {isotopeKey: count}, mass, probability, label }]
// where label omits isotopes at zero count and formats non-mono as e.g. "13C1".
function elementDistribution(elementSym, n, minProb) {
  const isos = isotopesOf(elementSym);
  if (!isos.length) return [];
  if (n === 0) {
    return [{ isotopeCounts: {}, mass: 0, probability: 1, labelParts: [] }];
  }

  // If single isotope only, trivial.
  if (isos.length === 1) {
    const iso = isos[0];
    return [{
      isotopeCounts: { [iso.key]: n },
      mass: iso.exactMass * n,
      probability: 1,
      labelParts: []
    }];
  }

  const branches = [];

  // Recursively assign counts to isotopes: at each level distribute a piece of
  // `remaining`, then descend. The last isotope must consume all remaining.
  const walk = (idx, remaining, chosen, cumProb) => {
    if (cumProb < minProb) return;
    if (idx === isos.length - 1) {
      // last isotope takes all remaining
      chosen[idx] = remaining;
      // compute probability & mass
      const coef = multinomial(n, chosen);
      let prob = coef;
      let mass = 0;
      for (let i = 0; i < isos.length; i++) {
        const k = chosen[i];
        if (k === 0) continue;
        prob *= Math.pow(isos[i].abundance, k);
        mass += isos[i].exactMass * k;
      }
      if (prob >= minProb) {
        const isotopeCounts = {};
        const labelParts = [];
        for (let i = 0; i < isos.length; i++) {
          const k = chosen[i];
          if (k > 0) {
            isotopeCounts[isos[i].key] = k;
            if (!isos[i].isMonoisotopic) {
              labelParts.push(`${isos[i].massNumber}${isos[i].element}${k}`);
            }
          }
        }
        branches.push({ isotopeCounts, mass, probability: prob, labelParts });
      }
      return;
    }
    // Cap upper by residual and by max plausible so that at prob-per-atom the
    // branch stays above minProb. We don't do a tight bound here; the cumProb
    // check + PROB_INCLUDE_EPS below prune.
    for (let k = 0; k <= remaining; k++) {
      chosen[idx] = k;
      // partial probability contribution to prune deep branches early
      const partial = cumProb * Math.pow(isos[idx].abundance, k) * binomial(remaining, k);
      if (partial < minProb && k > 0) {
        // as k grows further, the branch will keep shrinking for rare isotopes;
        // for the abundant isotope, k=0 was tried first and shouldn't be pruned yet.
        // We rely on the cumProb test at deeper levels rather than break here,
        // because probability is not monotonic in k for the abundant isotope.
      }
      walk(idx + 1, remaining - k, chosen, partial);
    }
    chosen[idx] = 0;
  };

  walk(0, n, new Array(isos.length).fill(0), 1);
  return branches;
}

// Convolve two distributions: pairwise combine, mass add, prob multiply,
// merge entries whose mass is within PEAK_MERGE_EPS. label parts concatenated.
function convolve(a, b) {
  // O(|a|·|b|) then O((|a|+|b|)) merge via sort.
  const combined = [];
  for (const x of a) {
    for (const y of b) {
      combined.push({
        mass: x.mass + y.mass,
        probability: x.probability * y.probability,
        labelParts: x.labelParts.concat(y.labelParts)
      });
    }
  }
  combined.sort((p, q) => p.mass - q.mass);
  const merged = [];
  for (const item of combined) {
    if (merged.length && Math.abs(item.mass - merged[merged.length - 1].mass) < PEAK_MERGE_EPS) {
      const last = merged[merged.length - 1];
      last.probability += item.probability;
      // Prefer the label-parts of the higher-prob branch. Since both branches
      // share a mass (or nearly so), they represent physically indistinguishable
      // isotopologues; concatenate distinct label sets.
      if (item.labelParts.join(' ') !== last.labelParts.join(' ')) {
        // Merge label lists preserving unique strings — used to signal
        // near-degenerate labels but such a case is rare given our epsilon.
        const combinedLabel = last.labelParts.concat(item.labelParts.filter((p) => !last.labelParts.includes(p)));
        last.labelParts = combinedLabel;
      }
    } else {
      merged.push({ ...item });
    }
  }
  return merged;
}

// Build the ion formula from a candidate (neutral counts keyed by row id) and adduct.
// Returns { ionElementCounts: { element: count }, z, sign }.
export function buildIonFormula(neutralCountsByRowId, rows, adduct) {
  // Aggregate neutral counts into element totals (nuclide-aware ion needs
  // per-nuclide counts so isotope constraints from the search survive; but
  // Stage 3 always convolves natural abundance, so we sum to elements).
  const elementCounts = {};
  for (const row of rows) {
    const n = neutralCountsByRowId[row.id] || 0;
    if (!n) continue;
    const el = row.nuclide.element;
    elementCounts[el] = (elementCounts[el] || 0) + n;
  }
  // Multiply by adduct.n (2M forms).
  const ionCounts = {};
  for (const el of Object.keys(elementCounts)) {
    ionCounts[el] = elementCounts[el] * adduct.n;
  }
  // Apply atomDelta.
  for (const [el, d] of Object.entries(adduct.atomDelta)) {
    ionCounts[el] = (ionCounts[el] || 0) + d;
    if (ionCounts[el] === 0) delete ionCounts[el];
    if (ionCounts[el] < 0) {
      // Impossible ion (e.g., loss more atoms than available). Return null-ish.
      return null;
    }
  }
  const sign = adduct.mode === 'pos' ? 1 : -1;
  return { ionElementCounts: ionCounts, z: adduct.z, sign };
}

// Simulate the isotope pattern for the given ion.
// minRelAbundancePct: display floor (%); we use this both as a display filter
// and as the internal probability pruning threshold (converted to fraction).
// Returns [{ mz, relInt, probability, label }] sorted by mz ascending.
export function simulateIsotopePattern(ionElementCounts, z, sign, minRelAbundancePct) {
  const displayFloor = Math.max(minRelAbundancePct, 1e-5) / 100; // as fraction
  // Prune threshold: keep branches at ~1/10 of display floor so combined pruning
  // doesn't kill true peaks (spec §8.2 leaves the exact factor to the impl).
  const pruneThreshold = displayFloor / 20;

  // Build per-element distributions.
  const elements = Object.keys(ionElementCounts).filter((el) => ionElementCounts[el] > 0);
  if (!elements.length) return [];

  let dist = [{ mass: 0, probability: 1, labelParts: [] }];
  for (const el of elements) {
    const n = ionElementCounts[el];
    const sub = elementDistribution(el, n, pruneThreshold);
    if (!sub.length) return [];
    dist = convolve(dist, sub);
    // Drop below prune threshold to keep the tree small
    dist = dist.filter((d) => d.probability >= pruneThreshold);
  }

  // Convert to m/z, build labels.
  const peaks = dist.map((d) => {
    const label = d.labelParts.length ? d.labelParts.join(' ') : 'mono';
    const mz = (d.mass - sign * z * ELECTRON_MASS) / z;
    return { mz, relInt: 0, probability: d.probability, label };
  });

  // Filter by display floor after normalization; do normalization here (base = 100)
  const maxProb = peaks.reduce((m, p) => Math.max(m, p.probability), 0);
  for (const p of peaks) {
    p.relInt = (p.probability / maxProb) * 100;
  }
  const filtered = peaks.filter((p) => p.relInt >= minRelAbundancePct);
  filtered.sort((a, b) => a.mz - b.mz);
  return filtered;
}

// Re-normalise peaks according to the display mode.
export function normalizePeaks(peaks, mode) {
  if (!peaks.length) return peaks;
  if (mode === 'sum') {
    const sum = peaks.reduce((s, p) => s + p.probability, 0);
    return peaks.map((p) => ({ ...p, relInt: sum > 0 ? (p.probability / sum) * 100 : 0 }));
  }
  // base peak = 100
  const max = peaks.reduce((m, p) => Math.max(m, p.probability), 0);
  return peaks.map((p) => ({ ...p, relInt: max > 0 ? (p.probability / max) * 100 : 0 }));
}

// Helper: display the ion formula string (spec-flavoured).
export function ionFormulaString(ionElementCounts) {
  return formatIonFormula(ionElementCounts);
}
