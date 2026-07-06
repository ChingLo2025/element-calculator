// Verifies the reference computations from the spec (no browser required).
import { computeAllAdducts, solveNeutralMass } from '../src/engine/neutralMass.js';
import { ADDUCTS_BY_ID } from '../src/data/adducts.js';
import { enumerateFormulas } from '../src/engine/formulaSearch.js';
import { monoisotopeFor } from '../src/data/nuclides.js';
import { buildIonFormula, simulateIsotopePattern, normalizePeaks, ionFormulaString } from '../src/engine/isotopes.js';

function defaultRows() {
  const spec = [
    { sym: 'C', min: 0, max: 60 },
    { sym: 'H', min: 0, max: 80 },
    { sym: 'O', min: 0, max: 20 },
    { sym: 'N', min: 0, max: 10 },
    { sym: 'P', min: 0, max: 5 },
    { sym: 'S', min: 0, max: 5 }
  ];
  let idc = 1;
  return spec.map(({ sym, min, max }) => {
    const nuc = monoisotopeFor(sym);
    return {
      id: `r${idc++}`,
      nuclide: nuc,
      label: sym,
      min, max,
      valence: nuc.valence
    };
  });
}

const params = { tolPpm: 5, rdbMin: -1, rdbMax: 40, integerRdbOnly: true, topN: 5, sortBy: 'absPpm' };

console.log('=== Spec §7.4 reference check ===');
const mz = 359.1030;
const adduct = ADDUCTS_BY_ID['M+H'];
const target = solveNeutralMass(adduct, mz);
console.log(`Input m/z = ${mz}, [M+H]+ neutral mass = ${target.toFixed(5)} Da  (expect ~358.09571)`);

const rows = defaultRows();
const { results: r1 } = enumerateFormulas(target, rows, params);
console.log(`\nDefault elements (C,H,O,N,P,S) top hits:`);
r1.slice(0, 5).forEach((r, i) => {
  console.log(`  ${i+1}. ${r.formulaString}  theo=${r.theoMass.toFixed(5)}  ppm=${r.deltaPpm.toFixed(3)}  RDB=${r.rdb}`);
});
console.log(`Expect top: C14H22ON4S3, theo 358.09557, +0.363 ppm, RDB 6`);

const rowsNoPS = rows.filter((r) => r.nuclide.element !== 'P' && r.nuclide.element !== 'S');
const { results: r2 } = enumerateFormulas(target, rowsNoPS, params);
console.log(`\nP & S removed top hits:`);
r2.slice(0, 5).forEach((r, i) => {
  console.log(`  ${i+1}. ${r.formulaString}  theo=${r.theoMass.toFixed(5)}  ppm=${r.deltaPpm.toFixed(3)}  RDB=${r.rdb}`);
});
console.log(`Expect top: C21H14O4N2, theo 358.09536, RDB 16, ~+1.0 ppm`);

console.log('\n=== Spec §8.4 reference check (isotope pattern) ===');
// Candidate C21H14O4N2 as [M+H]+
const c21Row = { id: 'c21', nuclide: monoisotopeFor('C'), min: 0, max: 60, valence: 4 };
const h14Row = { id: 'h14', nuclide: monoisotopeFor('H'), min: 0, max: 80, valence: 1 };
const o4Row  = { id: 'o4',  nuclide: monoisotopeFor('O'), min: 0, max: 20, valence: 2 };
const n2Row  = { id: 'n2',  nuclide: monoisotopeFor('N'), min: 0, max: 10, valence: 3 };
const testRows = [c21Row, h14Row, o4Row, n2Row];
const counts = { c21: 21, h14: 14, o4: 4, n2: 2 };
const ion = buildIonFormula(counts, testRows, adduct);
console.log(`Ion formula: ${ionFormulaString(ion.ionElementCounts)} (expect C21H15O4N2)`);
let peaks = simulateIsotopePattern(ion.ionElementCounts, ion.z, ion.sign, 0.1);
peaks = normalizePeaks(peaks, 'base');
console.log('Simulated peaks (mz, rel%, label):');
for (const p of peaks.slice(0, 20)) {
  console.log(`  mz=${p.mz.toFixed(5)}  rel=${p.relInt.toFixed(3)}%  ${p.label}`);
}
console.log(`Expect mono ≈ 359.10263; 15N1 ≈ 360.09966; 13C1 ≈ 360.10599 (~22.7%); 17O1 ≈ 360.10685; 2H1 ≈ 360.10891`);
