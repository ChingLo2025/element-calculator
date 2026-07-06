// Default valences per element (used for RDB / DBE).
// Isotopes of an element share the element's valence.
export const DEFAULT_VALENCES = {
  H: 1, D: 1,
  Li: 1, Be: 2, B: 3, C: 4, N: 3, O: 2, F: 1,
  Na: 1, Mg: 2, Al: 3, Si: 4, P: 3, S: 2, Cl: 1,
  K: 1, Ca: 2, Br: 1, I: 1,
  // Fallback for elements not typically appearing in RDB — treated as 0 by default
};

export function defaultValenceFor(elementSymbol) {
  if (elementSymbol in DEFAULT_VALENCES) return DEFAULT_VALENCES[elementSymbol];
  return 0;
}
