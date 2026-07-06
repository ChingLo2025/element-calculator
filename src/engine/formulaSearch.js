// Stage 2 formula enumeration (spec §7.3).
// Bounded DFS with mass-window pruning; the lightest active row is solved
// analytically at the deepest level.

import { computePpm } from './ppm.js';
import { computeRDB } from './rdb.js';
import { formatFormula } from './formulaFormat.js';
import { MAX_CANDIDATES, RDB_INT_EPS } from './constants.js';

function isIntegerWithin(v, eps) {
  return Math.abs(v - Math.round(v)) < eps;
}

export function enumerateFormulas(target, rows, params) {
  if (!Number.isFinite(target) || target <= 0 || !rows.length) {
    return { results: [], truncated: false };
  }
  // Filter rows with max >= min && max > 0 (rows with max=0 don't contribute).
  const active = rows.filter((r) => Number.isFinite(r.min) && Number.isFinite(r.max) && r.max >= r.min && r.max > 0);
  if (!active.length) return { results: [], truncated: false };

  const tolPpm = params.tolPpm;
  const half = (tolPpm * target) / 1e6;
  const lower = target - half;
  const upper = target + half;

  // Sort descending by exactMass; lightest is the solve-last row.
  const sorted = [...active].sort((a, b) => b.nuclide.exactMass - a.nuclide.exactMass);
  const lightRow = sorted[sorted.length - 1];
  const dfsRows = sorted.slice(0, -1);
  const lightMass = lightRow.nuclide.exactMass;

  const results = [];
  let truncated = false;

  const counts = {};
  for (const r of active) counts[r.id] = 0;

  const evaluate = (accMass) => {
    // Residual to reach the window: try count = round((target − accMass)/lightMass) ± 1
    const residual = target - accMass;
    const base = Math.round(residual / lightMass);
    for (const cand of [base - 1, base, base + 1]) {
      if (cand < lightRow.min || cand > lightRow.max) continue;
      const totalMass = accMass + cand * lightMass;
      if (totalMass < lower || totalMass > upper) continue;
      counts[lightRow.id] = cand;
      // RDB check
      const rdb = computeRDB(counts, active);
      if (rdb < params.rdbMin || rdb > params.rdbMax) continue;
      if (params.integerRdbOnly && !isIntegerWithin(rdb, RDB_INT_EPS)) continue;

      // Add to results.
      const captured = { ...counts };
      const formulaString = formatFormula(captured, active);
      results.push({
        counts: captured,
        formulaString,
        theoMass: totalMass,
        deltaPpm: computePpm(target, totalMass),
        rdb
      });
      if (results.length >= MAX_CANDIDATES) {
        truncated = true;
        return true; // signal early stop
      }
    }
    counts[lightRow.id] = 0;
    return false;
  };

  // Recursive DFS over dfsRows.
  const dfs = (level, accMass) => {
    if (accMass > upper) return false;
    if (level === dfsRows.length) {
      return evaluate(accMass);
    }
    const row = dfsRows[level];
    const m = row.nuclide.exactMass;
    // Maximum count for this row: constrained by row.max and the remaining budget.
    const remaining = upper - accMass;
    const capacity = Math.floor(remaining / m);
    const maxCount = Math.min(row.max, capacity);
    for (let k = row.min; k <= maxCount; k++) {
      counts[row.id] = k;
      const stop = dfs(level + 1, accMass + k * m);
      if (stop) {
        counts[row.id] = 0;
        return true;
      }
    }
    counts[row.id] = 0;
    return false;
  };

  dfs(0, 0);

  // Sort & slice.
  const sortBy = params.sortBy || 'absPpm';
  results.sort((a, b) => {
    switch (sortBy) {
      case 'absPpm':    return Math.abs(a.deltaPpm) - Math.abs(b.deltaPpm);
      case 'signedPpm': return a.deltaPpm - b.deltaPpm;
      case 'mass':      return a.theoMass - b.theoMass;
      case 'rdb':       return a.rdb - b.rdb;
      default:          return Math.abs(a.deltaPpm) - Math.abs(b.deltaPpm);
    }
  });
  const topN = Math.max(1, params.topN | 0);
  return { results: results.slice(0, topN), truncated };
}
