// Adduct definitions per spec §5.
// `a` drives Stage 1 (M = (mz·z − a) / n).
// `atomDelta` drives Stage 3 ion reconstruction.

export const ADDUCTS = [
  // Positive mode
  { id: 'M+H',        label: '[M+H]+',        mode: 'pos', z: 1, n: 1, a:  1.0072765,  atomDelta: { H: +1 } },
  { id: 'M+NH4',      label: '[M+NH4]+',      mode: 'pos', z: 1, n: 1, a: 18.0338255,  atomDelta: { N: +1, H: +4 } },
  { id: 'M+Na',       label: '[M+Na]+',       mode: 'pos', z: 1, n: 1, a: 22.9892207,  atomDelta: { Na: +1 } },
  { id: 'M+K',        label: '[M+K]+',        mode: 'pos', z: 1, n: 1, a: 38.9631579,  atomDelta: { K: +1 } },
  { id: 'M+ACN+H',    label: '[M+ACN+H]+',    mode: 'pos', z: 1, n: 1, a: 42.0338256,  atomDelta: { C: +2, H: +4, N: +1 } },
  { id: 'M+CH3OH+H',  label: '[M+CH3OH+H]+',  mode: 'pos', z: 1, n: 1, a: 33.0334916,  atomDelta: { C: +1, H: +5, O: +1 } },
  { id: '2M+H',       label: '[2M+H]+',       mode: 'pos', z: 1, n: 2, a:  1.0072765,  atomDelta: { H: +1 } },
  { id: 'M+2H',       label: '[M+2H]2+',      mode: 'pos', z: 2, n: 1, a:  2.0145530,  atomDelta: { H: +2 } },
  // Negative mode
  { id: 'M-H',        label: '[M-H]-',        mode: 'neg', z: 1, n: 1, a: -1.0072765,  atomDelta: { H: -1 } },
  { id: 'M+Cl',       label: '[M+Cl]-',       mode: 'neg', z: 1, n: 1, a: 34.9693013,  atomDelta: { Cl: +1 } },
  { id: 'M+HCOO',     label: '[M+HCOO]-',     mode: 'neg', z: 1, n: 1, a: 44.9982028,  atomDelta: { C: +1, H: +1, O: +2 } },
  { id: 'M+CH3COO',   label: '[M+CH3COO]-',   mode: 'neg', z: 1, n: 1, a: 59.0138529,  atomDelta: { C: +2, H: +3, O: +2 } },
  { id: 'M-H2O-H',    label: '[M-H2O-H]-',    mode: 'neg', z: 1, n: 1, a: -19.0178411, atomDelta: { O: -1, H: -3 } },
  { id: '2M-H',       label: '[2M-H]-',       mode: 'neg', z: 1, n: 2, a: -1.0072765,  atomDelta: { H: -1 } },
  { id: 'M-2H',       label: '[M-2H]2-',      mode: 'neg', z: 2, n: 1, a: -2.0145530,  atomDelta: { H: -2 } }
];

export const ADDUCTS_BY_ID = Object.fromEntries(ADDUCTS.map((a) => [a.id, a]));
