// RDB / DBE per spec §3.4:
//   RDB = 1 + 0.5 · Σ Nᵢ · (Vᵢ − 2)
// Isotopes of an element share the element's valence (already carried on each row).

export function computeRDB(countsByRowId, rows) {
  let sum = 0;
  for (const row of rows) {
    const n = countsByRowId[row.id] || 0;
    if (!n) continue;
    sum += n * (row.valence - 2);
  }
  return 1 + 0.5 * sum;
}
