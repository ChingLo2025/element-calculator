import React, { createContext, useContext, useMemo, useReducer, useEffect, useRef } from 'react';
import { ADDUCTS } from '../data/adducts.js';
import { NUCLIDES, monoisotopeFor } from '../data/nuclides.js';
import { computeAllAdducts } from '../engine/neutralMass.js';
import { enumerateFormulas } from '../engine/formulaSearch.js';
import { buildIonFormula, simulateIsotopePattern, normalizePeaks } from '../engine/isotopes.js';

const DEFAULT_ELEMENTS = [
  { sym: 'C', min: 0, max: 60 },
  { sym: 'H', min: 0, max: 80 },
  { sym: 'O', min: 0, max: 20 },
  { sym: 'N', min: 0, max: 10 },
  { sym: 'P', min: 0, max: 5 },
  { sym: 'S', min: 0, max: 5 }
];

let rowIdCounter = 1;
function makeRowId() {
  return `r${rowIdCounter++}`;
}

function makeDefaultRows() {
  return DEFAULT_ELEMENTS.map(({ sym, min, max }) => {
    const nuc = monoisotopeFor(sym);
    return {
      id: makeRowId(),
      nuclide: nuc,
      label: sym,
      min,
      max,
      valence: nuc.valence
    };
  });
}

const INITIAL_STATE = {
  // Stage 1
  inputMz: null,
  polarityFilter: 'both',
  adductResults: [],

  // Selection carried across stages
  selection: null,

  // Stage 2
  targetMass: null,
  params: {
    tolPpm: 5,
    rdbMin: -1,
    rdbMax: 40,
    integerRdbOnly: true,
    topN: 20,
    sortBy: 'absPpm'
  },
  elementRows: makeDefaultRows(),
  results: [],
  resultsTruncated: false,

  // Stage 3
  selectedFormula: null,
  isotopeSettings: {
    minRelAbundancePct: 0.1,
    normalize: 'base',
    showInputMarker: true
  },
  isotopePeaks: [],

  // UI
  modal: null
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_INPUT_MZ': {
      const mz = action.mz;
      const adductResults = Number.isFinite(mz) && mz > 0 ? computeAllAdducts(mz, ADDUCTS) : [];
      return { ...state, inputMz: mz, adductResults };
    }
    case 'SET_POLARITY':
      return { ...state, polarityFilter: action.polarity };
    case 'SELECT_ADDUCT': {
      const { adduct, neutralMass, inputMz } = action;
      return {
        ...state,
        selection: { inputMz, adduct, neutralMass },
        targetMass: neutralMass
      };
    }
    case 'SET_TARGET_MASS':
      return { ...state, targetMass: action.mass };
    case 'SET_PARAM':
      return { ...state, params: { ...state.params, [action.key]: action.value } };
    case 'ADD_ELEMENT_ROWS': {
      const newRows = action.rows.map((partial) => ({
        id: makeRowId(),
        nuclide: partial.nuclide,
        label: partial.label,
        min: partial.min ?? 0,
        max: partial.max ?? 5,
        valence: partial.valence ?? partial.nuclide.valence
      }));
      // Deduplicate: don't add rows for nuclides already present.
      const existing = new Set(state.elementRows.map((r) => r.nuclide.key));
      const filtered = newRows.filter((r) => !existing.has(r.nuclide.key));
      return { ...state, elementRows: [...state.elementRows, ...filtered] };
    }
    case 'UPDATE_ELEMENT_ROW': {
      const rows = state.elementRows.map((r) =>
        r.id === action.id ? { ...r, ...action.patch } : r
      );
      return { ...state, elementRows: rows };
    }
    case 'REMOVE_ELEMENT_ROW':
      return { ...state, elementRows: state.elementRows.filter((r) => r.id !== action.id) };
    case 'SET_RESULTS':
      return { ...state, results: action.results, resultsTruncated: action.truncated };
    case 'SELECT_FORMULA':
      return { ...state, selectedFormula: action.formula };
    case 'SET_ISOTOPE_SETTING':
      return { ...state, isotopeSettings: { ...state.isotopeSettings, [action.key]: action.value } };
    case 'SET_ISOTOPE_PEAKS':
      return { ...state, isotopePeaks: action.peaks };
    case 'OPEN_MODAL':
      return { ...state, modal: action.modal };
    case 'CLOSE_MODAL':
      return { ...state, modal: null };
    default:
      return state;
  }
}

const StoreCtx = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // Auto-run Stage 2 when target, params, or rows change.
  const stage2Deps = [state.targetMass, state.params, state.elementRows];
  useEffect(() => {
    if (!state.targetMass || state.targetMass <= 0 || !state.elementRows.length) {
      dispatch({ type: 'SET_RESULTS', results: [], truncated: false });
      return;
    }
    // Validity check on rows.
    const invalid = state.elementRows.some(
      (r) => !Number.isFinite(r.min) || !Number.isFinite(r.max) || r.min < 0 || r.max < r.min
    );
    if (invalid) {
      dispatch({ type: 'SET_RESULTS', results: [], truncated: false });
      return;
    }
    const { results, truncated } = enumerateFormulas(state.targetMass, state.elementRows, state.params);
    dispatch({ type: 'SET_RESULTS', results, truncated });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, stage2Deps);

  // If the currently selected formula is no longer in results, clear it.
  useEffect(() => {
    if (state.selectedFormula && !state.results.find((r) => r.formulaString === state.selectedFormula.formulaString)) {
      dispatch({ type: 'SELECT_FORMULA', formula: null });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.results]);

  // Auto-run Stage 3 when selection or settings change.
  useEffect(() => {
    if (!state.selectedFormula || !state.selection) {
      dispatch({ type: 'SET_ISOTOPE_PEAKS', peaks: [] });
      return;
    }
    const ion = buildIonFormula(state.selectedFormula.counts, state.elementRows, state.selection.adduct);
    if (!ion) {
      dispatch({ type: 'SET_ISOTOPE_PEAKS', peaks: [] });
      return;
    }
    let peaks = simulateIsotopePattern(
      ion.ionElementCounts,
      ion.z,
      ion.sign,
      Math.max(state.isotopeSettings.minRelAbundancePct, 0.0001)
    );
    peaks = normalizePeaks(peaks, state.isotopeSettings.normalize);
    dispatch({ type: 'SET_ISOTOPE_PEAKS', peaks });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedFormula, state.selection, state.isotopeSettings, state.elementRows]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return React.createElement(StoreCtx.Provider, { value }, children);
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

// Utility: derived ion element counts for the currently selected formula.
export function useIonFormula() {
  const { state } = useStore();
  if (!state.selectedFormula || !state.selection) return null;
  return buildIonFormula(state.selectedFormula.counts, state.elementRows, state.selection.adduct);
}
