# m/z Elemental Composition Calculator

A pure client-side single-page app for interpreting a high-resolution **m/z** value: solve the neutral mass under each of a fixed set of adducts, search elemental compositions within a mass tolerance, and simulate the observed-ion fine-structure isotope pattern.

**Live demo:** https://chinglo2025.github.io/element-calculator/

---

## English

### Features

- **Stage 1 — Neutral mass across adducts.** Enter one m/z; the app computes the neutral monoisotopic mass under 15 built-in positive- and negative-mode adducts (`[M+H]+`, `[M+Na]+`, `[M+NH4]+`, `[M+K]+`, `[M+ACN+H]+`, `[M+CH3OH+H]+`, `[2M+H]+`, `[M+2H]2+`, `[M-H]-`, `[M+Cl]-`, `[M+HCOO]-`, `[M+CH3COO]-`, `[M-H2O-H]-`, `[2M-H]-`, `[M-2H]2-`). Polarity filter: Positive / Negative / Both.
- **Stage 2 — Elemental composition search.** Click any neutral mass (or type one directly) to search candidate molecular formulas within a ppm tolerance. Ranked by mass error, with a full RDB / DBE (Ring + Double Bond equivalents) filter.
  - Editable element/isotope table (defaults: C 0–60, H 0–80, O 0–20, N 0–10, P 0–5, S 0–5).
  - Add any element from a periodic-table modal; pick specific isotopes from an isotope-picker modal (e.g. `[13C]`, `[37Cl]`).
  - Controls: mass tolerance (ppm), RDB min/max, integer-RDB-only toggle, max results, sort by (abs ppm / signed ppm / mass / RDB).
- **Stage 3 — Isotope pattern simulation.** Click a candidate formula to simulate its **observed ion** as a stick spectrum. The ion is reconstructed from the Stage-1 adduct (adduct-borne atoms, e.g. `Cl` or `K`, contribute their own isotopes). Fine structure is preserved so that same-nominal-mass isotopologues (e.g. `13C1` vs `15N1`, ~0.006 m/z apart) render as **separate sticks**.
  - Interactive SVG stick spectrum with drag-to-pan and wheel-to-zoom.
  - Peak table beside the plot: m/z (5 dp) · relative intensity (%) · isotopologue label (e.g. `mono`, `13C1`, `15N1`, `13C1 15N1`).
  - Controls: minimum relative abundance (%), normalize (base peak = 100% / sum = 100%), input m/z reference marker.
  - Google Search and PubChem Search shortcut links for the selected candidate.

### Usage

1. **Input an m/z** value in Stage 1 (e.g. `359.1030`). Optionally filter by polarity.
2. **Click a neutral mass** in the adduct table. The value is carried into Stage 2 as the target mass and the search runs immediately.
3. **Tune the search** in Stage 2: adjust element ranges, tolerance, RDB filter, or click **Add element** to include additional elements/isotopes.
4. **Pick a candidate** by clicking its row in the results table. Stage 3 opens and simulates the observed-ion isotope pattern.
5. **Explore the spectrum**: pan/zoom the plot, tune the abundance floor, switch normalization, or open the Google / PubChem search links at the bottom.

### Reference outputs (spec verified)

- Target `358.09572` Da (from m/z `359.1030` as `[M+H]+`): top hit **C14H22ON4S3** (RDB 6).
- Same target with P & S removed: top hit **C21H14O4N2** (RDB 16).
- C21H14O4N2 as `[M+H]+` (ion `C21H15O4N2`): mono m/z ≈ **359.10263**; M+1 fine peaks resolved at `360.09966` (¹⁵N₁), `360.10599` (¹³C₁, ~22.7 %), `360.10685` (¹⁷O₁), `360.10891` (²H₁).

### Tech stack

- **React 18** + **Vite 5**, no backend.
- Hand-rolled inline **SVG** stick renderer (no chart library) so ~0.0009 m/z peak spacing renders correctly.
- All nuclide data, adduct definitions and constants bundled statically. No network calls at runtime.
- State: single `useReducer` store; Stage 2 and Stage 3 recompute reactively when inputs change.

### Local development

```bash
npm install
npm run dev       # start Vite dev server at http://localhost:5173
npm run build     # production build to dist/
npm run preview   # serve the production build locally
node scripts/verify.mjs   # print spec §7.4 + §8.4 reference outputs
```

### Deployment

`main` deploys to GitHub Pages automatically via `.github/workflows/deploy.yml`. Vite base path is `/element-calculator/` in CI so assets resolve at `https://chinglo2025.github.io/element-calculator/`.

### License

MIT — see [LICENSE](./LICENSE).

---

## 中文

### 功能簡介

一個純前端的高解析 **m/z** 元素組成計算器，三個階段：

- **Stage 1 — 各 adduct 的中性質量。** 輸入一個 m/z，App 會用 15 個內建的正/負模式 adduct 分別解出中性質量（`[M+H]+`、`[M+Na]+`、`[M+NH4]+`、`[M+K]+`、`[M+ACN+H]+`、`[M+CH3OH+H]+`、`[2M+H]+`、`[M+2H]2+`、`[M-H]-`、`[M+Cl]-`、`[M+HCOO]-`、`[M+CH3COO]-`、`[M-H2O-H]-`、`[2M-H]-`、`[M-2H]2-`）。可依 Positive / Negative / Both 過濾。
- **Stage 2 — 元素組成搜尋。** 點任一 neutral mass（或直接手動輸入目標質量），在指定的 ppm 容差內搜尋所有可能的分子式，並以質量誤差排序，同時套用 RDB / DBE（環+雙鍵當量）過濾。
  - 可編輯的元素/同位素表格（預設 C 0–60、H 0–80、O 0–20、N 0–10、P 0–5、S 0–5）。
  - 透過週期表 modal 加入任何元素；透過同位素選擇 modal 挑選特定同位素（例如 `[13C]`、`[37Cl]`）。
  - 參數：ppm 容差、RDB 上下限、只顯示整數 RDB、最大結果數、排序方式（絕對 ppm / 帶號 ppm / 質量 / RDB）。
- **Stage 3 — 同位素圖譜模擬。** 點某個候選分子式後，會模擬對應**觀測離子**的細結構同位素分佈，並以 stick spectrum 呈現。離子是由 Stage 1 的 adduct 反推重建的（adduct 帶入的原子如 `Cl` 或 `K` 會自帶自己的同位素貢獻）。細結構會被保留，因此相同名義質量的同位素體（例如 `13C1` 與 `15N1`，m/z 相差約 0.006）會呈現為**分開的兩根 stick**。
  - 互動式 SVG stick spectrum，可拖曳平移、滾輪縮放。
  - 旁邊有 peak table：m/z（5 位小數）、相對強度（%）、同位素體標籤（如 `mono`、`13C1`、`15N1`、`13C1 15N1`）。
  - 控制項：最小相對豐度（%）、normalize（Base peak = 100% / Sum = 100%）、輸入 m/z 參考線開關。
  - 底部提供 Google Search 與 PubChem Search 的快速連結（用當前候選分子式作 query）。

### 使用方法

1. 在 Stage 1 輸入 **m/z**（例如 `359.1030`），必要時切換極性過濾。
2. 在 adduct table 點某個 **neutral mass**，數值會自動帶入 Stage 2 的目標質量，並立刻執行搜尋。
3. 在 Stage 2 調整搜尋參數：修改元素範圍、ppm 容差、RDB 過濾，或點 **Add element** 加入其他元素/同位素。
4. 在結果表點某一列 **候選分子式**，Stage 3 會自動模擬該離子的同位素圖譜。
5. 在 Stage 3 探索圖譜：拖曳/滾輪縮放、調整豐度下限、切換 normalize，或點下方的 Google / PubChem 連結搜尋該分子式。

### 參考輸出（規格驗證通過）

- 目標質量 `358.09572` Da（由 m/z `359.1030` 以 `[M+H]+` 反推）：Top hit 為 **C14H22ON4S3**（RDB 6）。
- 同目標，移除 P、S：Top hit 為 **C21H14O4N2**（RDB 16）。
- C21H14O4N2 以 `[M+H]+` 呈現（離子 `C21H15O4N2`）：mono 峰 m/z ≈ **359.10263**；M+1 區可辨析出 `360.09966`（¹⁵N₁）、`360.10599`（¹³C₁，~22.7%）、`360.10685`（¹⁷O₁）、`360.10891`（²H₁）四個 fine peak。

### 技術棧

- **React 18** + **Vite 5**，全前端，無後端。
- 手寫的 inline **SVG** stick renderer（不使用 chart library），確保 ~0.0009 m/z 的峰距能正確呈現。
- 所有核素資料、adduct 定義與常數都以靜態方式打包在 bundle 內，執行時完全不需連網。
- 狀態管理採單一 `useReducer` store；Stage 2、Stage 3 在輸入改變時自動重新計算。

### 本地開發

```bash
npm install
npm run dev       # 啟動 Vite dev server，網址 http://localhost:5173
npm run build     # 產出 production build 至 dist/
npm run preview   # 本地預覽 production build
node scripts/verify.mjs   # 印出規格 §7.4 + §8.4 的參考輸出
```

### 部署

推送到 `main` 會透過 `.github/workflows/deploy.yml` 自動部署到 GitHub Pages。Vite 的 base path 在 CI 環境中會被設為 `/element-calculator/`，因此網站會發佈於 `https://chinglo2025.github.io/element-calculator/`。

### 授權

MIT — 詳見 [LICENSE](./LICENSE)。
