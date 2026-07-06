# m/z Elemental Composition Calculator — Specification Sheet

**Type:** Pure client-side single-page application
**Stack:** React + Vite (no backend, no network calls, all constants bundled)
**UI language:** English (all labels, all copy)
**Input model:** one m/z value at a time
**Version:** Spec v1.0

---

## 1. Overview & Scope

A three-stage tool for interpreting a high-resolution m/z value:

1. **Stage 1 — Neutral mass across adducts.** Enter one m/z; the app computes the neutral monoisotopic mass under each of a fixed set of positive- and negative-mode adducts. Every neutral mass is a clickable control.
2. **Stage 2 — Elemental composition search.** Clicking a neutral mass (or editing the target field directly) searches for candidate molecular formulas within a mass tolerance, ranked by mass error. Element set, isotopes, ranges, tolerance, RDB constraints, and result count are all user-editable.
3. **Stage 3 — Isotope pattern simulation.** Clicking a candidate formula simulates its **observed ion** isotope pattern (not the neutral molecule) as a stick spectrum, reconstructing the ion from the Stage-1 adduct. Fine structure is preserved so that same-nominal-mass isotopologues (e.g. ¹³C₁ vs ¹⁵N₁) render as separate peaks.

Everything runs in the browser. The nuclide database and all physical constants are bundled static data; there is no server component.

---

## 2. Tech Stack & Project Structure

- **Build tool:** Vite.
- **Framework:** React (function components + hooks). Spec is written with TypeScript-style types for precision; implementation may be TS or JS.
- **State:** single app-level store via `useReducer` (or a tiny context). No external state library required.
- **Charting (Stage 3):** hand-rolled inline **SVG** stick renderer with pan/zoom. Sticks are drawn as vertical lines at exact m/z. A charting library is *not* recommended because peaks can sit ~0.0009 m/z apart and we need precise control over the x-axis; `d3-zoom` may be used for pan/zoom interaction only. **No Gaussian / profile mode** — sticks only.
- **No** `localStorage` / `sessionStorage` or any browser-storage API is required by the core app.

Suggested layout:

```
mz-formula-calculator/
  index.html
  vite.config.js
  package.json
  src/
    main.jsx
    App.jsx
    state/
      store.js              # reducer, initial state, action creators
    data/
      nuclides.js           # full nuclide database (all elements)
      adducts.js            # adduct definitions (Stage 1 + Stage 3 atom deltas)
      valences.js           # default valence table
      displayOrder.js       # formula element display order
    engine/
      constants.js          # electron, proton, epsilons
      neutralMass.js        # Stage 1
      formulaSearch.js      # Stage 2 enumeration
      rdb.js                # RDB / DBE
      ppm.js                # mass error
      isotopes.js           # Stage 3 fine-structure convolution
      formulaFormat.js      # formula -> display string
    components/
      Stage1Panel.jsx
      MzInput.jsx
      AdductTable.jsx
      Stage2Panel.jsx
      ParamsBar.jsx
      ElementTable.jsx
      PeriodicTableModal.jsx
      IsotopePickerModal.jsx
      ResultsTable.jsx
      Stage3Panel.jsx
      StickSpectrum.jsx
      PeakTable.jsx
    styles/
```

---

## 3. Core Constants & Conventions

### 3.1 Fundamental constants

| Constant | Value (Da) | Notes |
|---|---|---|
| electron mass `mₑ` | 0.00054858 | |
| proton mass `m_p` | 1.00727645 | = ¹H − electron; used for all proton bookkeeping |

### 3.2 Monoisotopic masses (defaults & adduct-relevant nuclides)

Full precision from a standard atomic-mass table (AME/NIST + IUPAC abundances). Bundle all elements; the values below are the ones used by defaults and adducts.

| Nuclide | Exact mass (Da) | Abundance | Valence |
|---|---|---|---|
| ¹H | 1.00782503 | 99.9885% | 1 |
| ²H | 2.01410178 | 0.0115% | 1 |
| ¹²C | 12.00000000 | 98.93% | 4 |
| ¹³C | 13.00335484 | 1.07% | 4 |
| ¹⁴N | 14.00307401 | 99.636% | 3 |
| ¹⁵N | 15.00010890 | 0.364% | 3 |
| ¹⁶O | 15.99491462 | 99.757% | 2 |
| ¹⁷O | 16.99913150 | 0.038% | 2 |
| ¹⁸O | 17.99916040 | 0.205% | 2 |
| ³¹P | 30.97376151 | 100% | 3 |
| ³²S | 31.97207069 | 94.99% | 2 |
| ³³S | 32.97145850 | 0.75% | 2 |
| ³⁴S | 33.96786683 | 4.25% | 2 |
| ³⁶S | 35.96708088 | 0.01% | 2 |
| ²³Na | 22.98976928 | 100% | 1 |
| ³⁹K | 38.96370649 | 93.258% | 1 |
| ⁴⁰K | 39.96399817 | 0.012% | 1 |
| ⁴¹K | 40.96182526 | 6.730% | 1 |
| ³⁵Cl | 34.96885268 | 75.76% | 1 |
| ³⁷Cl | 36.96590259 | 24.24% | 1 |

The bundled database contains every element (for the periodic-table picker) with the same record shape.

### 3.3 Mass-error (ppm) convention — **fixed, not user-configurable**

```
delta_ppm = (measured − theoretical) / theoretical × 1e6
```

`measured` = the target neutral mass carried into Stage 2 (derived from the input m/z + adduct).
`theoretical` = the neutral monoisotopic mass of the candidate formula (sum of neutral isotope masses).
Sign: positive when measured > theoretical. There is **no toggle** for the opposite convention.

### 3.4 RDB / DBE (Ring + Double Bond equivalents)

```
RDB = 1 + ½ · Σ Nᵢ · (Vᵢ − 2)
```

where `Nᵢ` = count of nuclide *i*, `Vᵢ` = valence of its element. Contributions: C (+1), monovalent H/halogens (−0.5), trivalent N/P (+0.5), divalent O/S (0). Isotopes of an element share the element's valence. RDB is always computed on the **neutral** formula (Stage 2 works on neutral mass, so this is correct without charge correction).

Reference checks: C₂₁H₁₄O₄N₂ → RDB = 16; C₁₄H₂₂O₁N₄S₃ → RDB = 6.

### 3.5 Numerical epsilons

| Name | Value | Purpose |
|---|---|---|
| `RDB_INT_EPS` | 1e-6 | "integer RDB" test: `abs(RDB − round(RDB)) < RDB_INT_EPS` |
| `PEAK_MERGE_EPS` | 1e-5 Da | Stage 3: merge two convolution branches only if their exact masses are equal within this. Far below the smallest real isotopologue spacing (~0.0009 Da for ¹³C vs ¹⁷O), so distinct isotopologues stay as separate sticks. Float-dedup only, **not** nominal-mass binning. |

### 3.6 Formula display order

Elements printed in the fixed priority order `['C','H','O','N','S','P']`, then any remaining elements alphabetically. Count of 1 is omitted. Non-monoisotopic nuclides carry a bracketed prefix, e.g. `[13C]`, `[15N]`, `[37Cl]`. (Matches the user's examples `C14H22ON4S3`, `C21H14O4N2`: O before N, S after N.) This order lives in `data/displayOrder.js` and can be reordered in one place.

---

## 4. Data Models

```ts
// A single nuclide = the atomic unit of the search space.
interface Nuclide {
  key: string;         // stable id, e.g. "C-12", "N-15"
  element: string;     // "C"
  Z: number;           // atomic number
  massNumber: number;  // 12
  exactMass: number;   // 12.0
  abundance: number;   // 0..1 natural fraction (used in Stage 3)
  valence: number;     // for RDB
  isMonoisotopic: boolean; // true for the most-abundant isotope
}

// A row in the editable element table (Stage 2 search dimension).
interface ElementRow {
  id: string;          // row id
  nuclide: Nuclide;    // resolved nuclide record
  label: string;       // "C", "13C", "37Cl" (display)
  min: number;         // >= 0
  max: number;         // >= min
  valence: number;     // defaults from nuclide, user-overridable
}

// Adduct definition.
interface Adduct {
  id: string;          // "M+H", "2M-H", "M+2H"
  label: string;       // "[M+H]+"
  mode: 'pos' | 'neg';
  z: number;           // charge magnitude (1, 2, ...)
  n: number;           // cluster count (1 = M, 2 = 2M)
  a: number;           // Stage 1: net mass added to M to form the ion (proton/electron bookkeeping baked in)
  atomDelta: Record<string, number>; // Stage 3: atoms added(+)/removed(-) vs the neutral, per element symbol
}

// Stage 2 parameters.
interface Stage2Params {
  tolPpm: number;            // default 5
  rdbMin: number;            // default -1
  rdbMax: number;            // default 40
  integerRdbOnly: boolean;   // default true
  topN: number;              // default 20
  sortBy: 'absPpm' | 'signedPpm' | 'mass' | 'rdb'; // default 'absPpm'
}

// A candidate result.
interface FormulaResult {
  counts: Record<string, number>; // nuclide.key -> count
  formulaString: string;          // display
  theoMass: number;               // neutral monoisotopic
  deltaPpm: number;               // signed, per §3.3
  rdb: number;
}

// Stage 3 simulated peak.
interface IsotopePeak {
  mz: number;            // observed m/z (charge-corrected)
  relInt: number;        // 0..100 after normalization
  probability: number;   // raw probability (pre-normalization)
  label: string;         // "mono", "13C1", "15N1", "37Cl1", "41K1", combos e.g. "13C1 15N1"
}

// Context passed Stage 1 -> Stage 2 -> Stage 3.
interface SelectionContext {
  inputMz: number;
  adduct: Adduct;
  neutralMass: number;   // Stage 2 target
}
```

---

## 5. Adduct Reference Table

Fixed set. `a` drives Stage 1; `atomDelta` drives Stage 3.

### 5.1 Stage 1 — neutral-mass solving

General formula (single equation for all adducts):

```
M = ( (m/z) · z − a ) / n
```

| Adduct (label) | Mode | z | n | a (Da) | M expression |
|---|---|---|---|---|---|
| [M+H]⁺ | pos | 1 | 1 | +1.0072765 | m/z − 1.0072765 |
| [M+NH₄]⁺ | pos | 1 | 1 | +18.0338255 | m/z − 18.0338255 |
| [M+Na]⁺ | pos | 1 | 1 | +22.9892207 | m/z − 22.9892207 |
| [M+K]⁺ | pos | 1 | 1 | +38.9631579 | m/z − 38.9631579 |
| [M+ACN+H]⁺ | pos | 1 | 1 | +42.0338256 | m/z − 42.0338256 |
| [M+CH₃OH+H]⁺ | pos | 1 | 1 | +33.0334916 | m/z − 33.0334916 |
| [2M+H]⁺ | pos | 1 | 2 | +1.0072765 | (m/z − 1.0072765) / 2 |
| [M+2H]²⁺ | pos | 2 | 1 | +2.0145530 | 2·(m/z) − 2.0145530 |
| [M−H]⁻ | neg | 1 | 1 | −1.0072765 | m/z + 1.0072765 |
| [M+Cl]⁻ | neg | 1 | 1 | +34.9693013 | m/z − 34.9693013 |
| [M+HCOO]⁻ (FA−H) | neg | 1 | 1 | +44.9982028 | m/z − 44.9982028 |
| [M+CH₃COO]⁻ (Hac−H) | neg | 1 | 1 | +59.0138529 | m/z − 59.0138529 |
| [M−H₂O−H]⁻ | neg | 1 | 1 | −19.0178411 | m/z + 19.0178411 |
| [2M−H]⁻ | neg | 1 | 2 | −1.0072765 | (m/z + 1.0072765) / 2 |
| [M−2H]²⁻ | neg | 2 | 1 | −2.0145530 | 2·(m/z) + 2.0145530 |

### 5.2 Stage 3 — atom deltas (ion reconstruction)

Ion formula = `n × (neutral formula)`, then apply `atomDelta`. Charge from `z` and `mode`.

| Adduct | atomDelta | n | z (signed) |
|---|---|---|---|
| [M+H]⁺ | +1 H | 1 | +1 |
| [M+NH₄]⁺ | +1 N, +4 H | 1 | +1 |
| [M+Na]⁺ | +1 Na | 1 | +1 |
| [M+K]⁺ | +1 K | 1 | +1 |
| [M+ACN+H]⁺ | +2 C, +4 H, +1 N | 1 | +1 |
| [M+CH₃OH+H]⁺ | +1 C, +5 H, +1 O | 1 | +1 |
| [2M+H]⁺ | +1 H (after ×2) | 2 | +1 |
| [M+2H]²⁺ | +2 H | 1 | +2 |
| [M−H]⁻ | −1 H | 1 | −1 |
| [M+Cl]⁻ | +1 Cl | 1 | −1 |
| [M+HCOO]⁻ | +1 C, +1 H, +2 O | 1 | −1 |
| [M+CH₃COO]⁻ | +2 C, +3 H, +2 O | 1 | −1 |
| [M−H₂O−H]⁻ | −1 O, −3 H | 1 | −1 |
| [2M−H]⁻ | −1 H (after ×2) | 2 | −1 |
| [M−2H]²⁻ | −2 H | 1 | −2 |

Adduct-borne atoms carry their own isotopes into the simulation automatically — e.g. K contributes ⁴¹K (~6.7%) as an M+2 stick, Cl contributes ³⁷Cl (~24%) as a strong M+2 stick.

---

## 6. Stage 1 — Neutral Mass Across Adducts

### 6.1 Behaviour

- Input: one m/z (positive real number).
- On valid input, compute `M` for every adduct via §5.1 and render a table.
- Each computed neutral mass is a **button**. Clicking it sets `SelectionContext = { inputMz, adduct, neutralMass }`, populates the Stage 2 target, runs the search, and scrolls to Stage 2.

### 6.2 UI (English)

- `MzInput`: numeric field labelled **"Input m/z"**, with validation message on invalid entry.
- Polarity display toggle: **"Positive" / "Negative" / "Both"** (default **Both**) — filters which adduct rows show.
- `AdductTable`: columns **"Adduct"**, **"Neutral mass (Da)"**. The neutral mass cell is the clickable button; masses shown to 5 decimals. The row for the currently selected adduct is visually highlighted once Stage 2 is active.

### 6.3 Validation

- Reject non-numeric, ≤ 0.
- If an adduct yields `M ≤ 0` (e.g. very small m/z with 2M or high-charge forms), show `—` / "n/a" for that row and disable its button.

---

## 7. Stage 2 — Elemental Composition Search

### 7.1 Inputs

- **Target mass**: editable numeric field (**"Target neutral mass (Da)"**), auto-filled from Stage 1 but directly editable for manual searches.
- Parameters (`ParamsBar`) and the element/isotope table (`ElementTable`).

### 7.2 Defaults

| Element | Min | Max |
|---|---|---|
| C | 0 | 60 |
| H | 0 | 80 |
| O | 0 | 20 |
| N | 0 | 10 |
| P | 0 | 5 |
| S | 0 | 5 |

`tolPpm = 5`, `rdbMin = -1`, `rdbMax = 40`, `integerRdbOnly = true`, `topN = 20`, `sortBy = 'absPpm'`.

### 7.3 Search algorithm (`engine/formulaSearch.js`)

Bounded enumeration with mass-window pruning; the lightest nuclide (typically ¹H) is solved analytically rather than looped.

1. **Window.** `half = tolPpm × target / 1e6`; acceptable mass range `[target − half, target + half]`.
2. **Order.** Sort active element rows by `exactMass` descending. Reserve the lightest nuclide as the "solve-last" dimension.
3. **DFS over all rows except the lightest.** At each level, for nuclide with mass `m` and accumulated mass `acc`, the count ranges from `row.min` to `min(row.max, floor((upper − acc) / m))`. Prune the branch when `acc > upper`.
4. **Solve lightest.** At the deepest level, compute residual to reach the window; candidate count for the lightest nuclide = `round(residual / lightestMass)`. Test that integer and its ±1 neighbours for landing inside the window and within `[min, max]`.
5. **Per candidate.** Compute `theoMass = Σ count·exactMass`, `deltaPpm` (§3.3), `rdb` (§3.4). Keep only if: mass in window, `rdb ∈ [rdbMin, rdbMax]`, and (if `integerRdbOnly`) RDB is integer within `RDB_INT_EPS`.
6. **Safety cap.** Stop collecting after `MAX_CANDIDATES` (e.g. 200 000) and set a `truncated` flag for the UI.
7. **Sort & slice.** Sort by `sortBy` (default `absPpm` ascending) and take `topN`.

Effective cost with pruning is near the number of feasible candidates — sub-second in-browser for the default space. The naive product (~41M) is never enumerated.

### 7.4 Reference outputs (sanity checks)

- Target 358.09571 (from 359.1030 as [M+H]⁺), default elements → top hit **C14H22O1N4S3**, theoretical **358.09557 Da**, **+0.363 ppm** (measured − theoretical convention), RDB **6**.
- Same target, **P and S removed** → top hit **C21H14O4N2**, theoretical **358.09536 Da**, RDB **16** (≈ +1.0 ppm vs the input-derived target).

### 7.5 ParamsBar UI (English)

Controls, left to right: **"Mass tolerance (± ppm)"**, **"RDB min"**, **"RDB max"**, **"Integer RDB only"** (checkbox), **"Max results"**, **"Sort by"** (dropdown: *Abs. ppm error* / *Signed ppm error* / *Theoretical mass* / *RDB*). A status line shows **"N candidates found"** and, if applicable, **"results truncated at cap"**.

### 7.6 ResultsTable UI (English)

Columns: **"#"**, **"Formula"**, **"Theoretical mass (Da)"** (5 dp), **"Δ (ppm)"** (3 dp, signed), **"RDB"** (integer, or 1 dp when fractional). Each formula row is clickable → launches Stage 3 for that candidate using the current `SelectionContext.adduct`.

Formatting: mass 5 dp, ppm 3 dp, formula per §3.6.

### 7.7 Element / Isotope table (`ElementTable`)

Editable grid; one row per nuclide. Columns: **"Element / isotope"**, **"Min"**, **"Max"**, **"Valence"**, and a per-row **"Remove"** action. Above the table: **"Add element"** button.

- Min/Max/Valence are inline-editable numeric inputs. Validation: `min ≥ 0`, `max ≥ min`; invalid rows flagged, search disabled until resolved.
- Removing a row drops that nuclide from the search space.
- Multiple isotopes of the same element are allowed as independent rows (each an independent search dimension); the formula formatter distinguishes them via bracket labels (§3.6).

### 7.8 Periodic Table modal (`PeriodicTableModal`)

- Opened by **"Add element"**. Renders the full periodic table as a clickable grid (standard 18-column layout; lanthanides/actinides in the usual detached rows).
- Clicking an element opens the **Isotope Picker** for that element.

### 7.9 Isotope Picker modal (`IsotopePickerModal`)

- Header: chosen element.
- Lists the element's isotopes from the nuclide DB: columns **"Isotope"** (e.g. ³⁷Cl), **"Exact mass"**, **"Natural abundance"**, and a **checkbox** to include.
- A **"Valence"** field, pre-filled from the default valence table (§ data/valences.js), user-editable — required because every added element needs a valence for RDB.
- **"Add"** confirms: each checked isotope becomes a new row in `ElementTable` (monoisotopic → plain label; others → bracket label). Default Min = 0, Max = a sensible small value (e.g. 5) for newly added elements; user adjusts.

---

## 8. Stage 3 — Isotope Pattern Simulation (Stick Spectrum)

Simulates the **observed ion** pattern for a chosen candidate formula, using the Stage-1 adduct to reconstruct the ion. Fine structure preserved: same-nominal-mass isotopologues appear as distinct sticks.

### 8.1 Ion reconstruction

1. Start from the candidate neutral formula (nuclide counts).
2. Multiply all counts by `n` (from the adduct, e.g. 2 for 2M forms).
3. Apply `atomDelta` (§5.2) to add/remove adduct atoms.
4. Record charge magnitude `z` and sign (`mode`).

Result: an **ion formula** (element→count) plus `(z, mode)`.

### 8.2 Fine-structure convolution (`engine/isotopes.js`)

Preserve exact masses throughout; **do not** bin at nominal mass.

1. **Per-element sub-distribution.** For element X with count `n` and isotopes `{mass, prob}`:
   - two-isotope elements (C, N, Cl, H…): binomial expansion `C(n,k)·p₁^(n−k)·p₂^k`, with the branch mass = sum of chosen isotope masses;
   - multi-isotope elements (O, S, K…): multinomial expansion.
   Prune branches whose cumulative probability falls below the pruning threshold (see §8.5) to keep the tree small.
2. **Convolve** all element sub-distributions into the whole-ion distribution: combine pairwise as **mass add, probability multiply**, accumulating a list of `{mass, probability}`. During accumulation, merge two entries **only** when their masses are equal within `PEAK_MERGE_EPS` (1e-5 Da) — float dedup only, so ¹³C₁, ¹⁵N₁, ¹⁷O₁, ²H₁ remain separate sticks.
3. Result = fine isotopologue distribution of the ion in terms of neutral-atom mass sums.

### 8.3 Convert to observed m/z

For each isotopologue:

```
m/z = ( Σ isotope_neutral_masses − sign · z · mₑ ) / z
```

`sign = +1` for positive ions (subtract z electrons), `sign = −1` for negative ions (add z electrons). Multi-charge **compresses spacing**: a single ¹³C substitution is +1.00336 Da in mass but appears as ≈ +0.50 on the m/z axis at `z = 2`. The renderer must plot on the m/z axis, not the mass axis.

### 8.4 Worked reference (must resolve to the 4th decimal)

Candidate **C₂₁H₁₄O₄N₂** as **[M+H]⁺** → ion formula **C₂₁H₁₅O₄N₂**, `z = 1`. Mono peak m/z ≈ **359.10263**. The M+1 region contains multiple fine peaks (intensities relative to mono, i.e. mono = 100%):

| Isotopologue | Δ mass (Da) | m/z | Rel. int. |
|---|---|---|---|
| ¹⁵N₁ | +0.99703 | 360.09966 | ~0.73% |
| ¹³C₁ | +1.00336 | 360.10599 | ~22.7% |
| ¹⁷O₁ | +1.00422 | 360.10685 | ~0.15% |
| ²H₁ | +1.00628 | 360.10891 | ~0.17% |

¹³C₁ vs ¹⁵N₁ differ by 0.0063 m/z; ¹³C₁ vs ¹⁷O₁ by only ~0.0009 m/z — hence the peak table shows **m/z to 5 decimals**. All four exceed the default 0.1% pruning threshold and are displayed.

> Note: sticks are computed from the **candidate formula's** exact isotope masses, so the mono peak sits at the formula's theoretical ion m/z (359.10263 here), which differs slightly from the raw input m/z (359.1030). The input m/z is drawn as a reference marker so the offset is visible.

### 8.5 Controls & display (English)

- **`StickSpectrum`** (SVG): x = **m/z**, y = **Relative intensity (%)**. Sticks are vertical lines at exact m/z. Supports **zoom / pan** (peaks may be ~0.0009 m/z apart). Base peak scaled to 100%. A dashed vertical **"Input m/z"** marker is drawn at `SelectionContext.inputMz`. **Sticks only — no profile/Gaussian rendering.**
- **`PeakTable`** (beside the plot): columns **"m/z"** (5 dp), **"Rel. int. (%)"** (2 dp), **"Isotopologue"** (labels: `mono`, `13C1`, `15N1`, `37Cl1`, `41K1`, and combinations like `13C1 15N1`). This table is the primary way to read the ¹³C-vs-¹⁵N distinction.
- **"Min relative abundance (%)"**: numeric input, **default 0.1**, user-editable. Drives both the convolution pruning and the display floor. Peaks below this are dropped.
- **"Normalize"** toggle: **"Base peak = 100%"** (default) or **"Sum = 100%"**.
- **"Show input m/z marker"**: checkbox, default on.

### 8.6 Notes carried into the engine (already resolved)

- Multi-charge m/z spacing (÷ z): handled in §8.3.
- Electron sign for +/− ions: handled in §8.3.
- Adduct-borne isotopes (K, Cl, Na, ACN/MeOH/formate/acetate carbon & hydrogen): handled because atoms are added *before* convolution (§8.1–8.2).
- Isotope database shared with the periodic-table picker (single source of truth in `data/nuclides.js`).
- **Isotopic labelling as a Stage-2 search dimension is out of scope for this version** — Stage 2 always searches natural isotopes; Stage 3 always runs the full natural-abundance distribution.

---

## 9. Component Tree

```
App
├── Stage1Panel
│   ├── MzInput
│   ├── PolarityToggle
│   └── AdductTable            (clickable neutral-mass buttons → Stage 2)
├── Stage2Panel
│   ├── TargetMassField
│   ├── ParamsBar
│   ├── ElementTable
│   │   └── (Add element) → PeriodicTableModal → IsotopePickerModal
│   └── ResultsTable           (clickable formula rows → Stage 3)
└── Stage3Panel
    ├── StickSpectrum
    └── PeakTable
```

Modals (`PeriodicTableModal`, `IsotopePickerModal`) render at app root over an overlay.

---

## 10. App State Shape

```ts
interface AppState {
  // Stage 1
  inputMz: number | null;
  polarityFilter: 'pos' | 'neg' | 'both';   // default 'both'
  adductResults: { adduct: Adduct; neutralMass: number | null }[]; // null = n/a

  // Selection carried across stages
  selection: SelectionContext | null;

  // Stage 2
  targetMass: number | null;
  params: Stage2Params;
  elementRows: ElementRow[];       // seeded with C,H,O,N,P,S defaults
  results: FormulaResult[];
  resultsTruncated: boolean;

  // Stage 3
  selectedFormula: FormulaResult | null;
  isotopeSettings: {
    minRelAbundancePct: number;    // default 0.1
    normalize: 'base' | 'sum';     // default 'base'
    showInputMarker: boolean;      // default true
  };
  isotopePeaks: IsotopePeak[];

  // UI
  modal: null | { type: 'periodicTable' } | { type: 'isotopePicker'; element: string };
}
```

Recompute rules: editing target/params/elementRows re-runs Stage 2; editing isotopeSettings or selecting a new formula re-runs Stage 3.

---

## 11. Engine Function Signatures (no implementations)

```ts
// Stage 1
function solveNeutralMass(adduct: Adduct, mz: number): number | null;
function computeAllAdducts(mz: number, adducts: Adduct[]):
  { adduct: Adduct; neutralMass: number | null }[];

// Stage 2
function enumerateFormulas(
  target: number,
  rows: ElementRow[],
  params: Stage2Params
): { results: FormulaResult[]; truncated: boolean };

function computeRDB(counts: Record<string, number>, rows: ElementRow[]): number;
function computePpm(measured: number, theoretical: number): number; // (m − t)/t × 1e6
function formatFormula(counts: Record<string, number>): string;

// Stage 3
function buildIonFormula(
  neutralCounts: Record<string, number>,
  adduct: Adduct
): { ionCounts: Record<string, number>; z: number; sign: 1 | -1 };

function simulateIsotopePattern(
  ionCounts: Record<string, number>,
  z: number,
  sign: 1 | -1,
  minRelAbundancePct: number
): IsotopePeak[];

function normalizePeaks(peaks: IsotopePeak[], mode: 'base' | 'sum'): IsotopePeak[];
```

---

## 12. Edge Cases & Validation

- **Stage 1:** non-numeric / ≤ 0 m/z rejected; adduct rows yielding `M ≤ 0` show "n/a" with disabled button.
- **Stage 2:** empty element set → no results with a clear empty state; `min > max` or negative min flagged inline and search blocked; extremely wide ranges → search runs but respects `MAX_CANDIDATES` cap and surfaces the `truncated` flag.
- **RDB:** fractional RDB filtered out when `integerRdbOnly`; fractional values still displayed (1 dp) when the toggle is off.
- **Isotopes:** adding multiple isotopes of one element is valid; formatter must keep them distinct; a nuclide already present is not added twice (or is merged).
- **Stage 3:** pruning threshold of 0 (or blank) should be clamped to a small floor to avoid combinatorial blow-up; very large ion formulas rely on branch pruning to stay tractable; multi-charge spacing verified via §8.3.
- **Floating point:** use `PEAK_MERGE_EPS` for peak dedup and `RDB_INT_EPS` for integer tests; never compare masses with `===`.

---

## 13. Defaults — Quick Reference

| Setting | Default |
|---|---|
| Input model | one m/z at a time |
| UI language | English |
| Polarity filter | Both |
| Elements | C 0–60, H 0–80, O 0–20, N 0–10, P 0–5, S 0–5 |
| Mass tolerance | ± 5 ppm |
| ppm convention | (measured − theoretical)/theoretical × 1e6 (**fixed**) |
| RDB range | −1 to 40 |
| Integer RDB only | on |
| Max results | 20 |
| Sort by | Abs. ppm error (ascending) |
| Formula order | C, H, O, N, S, P, then alphabetical |
| Stage 3 rendering | sticks only (no profile) |
| Stage 3 min rel. abundance | 0.1% (user-editable) |
| Stage 3 normalize | Base peak = 100% |
| Input m/z marker | shown |
| Mass display | 5 decimals |
| ppm display | 3 decimals (signed) |
| Peak m/z display | 5 decimals |

---

## 14. Out of Scope (v1) / Future

- Batch / multi-m/z input.
- Isotopic labelling as a Stage-2 search dimension (locked isotopes).
- Gaussian / resolving-power profile rendering.
- Nitrogen rule, Senior rule, and other heuristic filters.
- Isotope-pattern *matching* against an uploaded experimental spectrum.
- CSV export of results / peak tables.
- Persisted user presets.
