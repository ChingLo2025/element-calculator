// Stage 1: solve neutral mass M from m/z using the adduct definition.
//   M = ((m/z) · z − a) / n
import { ADDUCTS } from '../data/adducts.js';

export function solveNeutralMass(adduct, mz) {
  if (!Number.isFinite(mz) || mz <= 0) return null;
  const m = (mz * adduct.z - adduct.a) / adduct.n;
  if (!Number.isFinite(m) || m <= 0) return null;
  return m;
}

export function computeAllAdducts(mz, adducts = ADDUCTS) {
  return adducts.map((adduct) => ({
    adduct,
    neutralMass: solveNeutralMass(adduct, mz)
  }));
}
