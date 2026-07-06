import React, { useState, useEffect } from 'react';
import { useStore, useIonFormula } from '../state/store.js';
import { StickSpectrum } from './StickSpectrum.jsx';
import { PeakTable } from './PeakTable.jsx';
import { ionFormulaString } from '../engine/isotopes.js';

function IsotopeControls() {
  const { state, dispatch } = useStore();
  const s = state.isotopeSettings;
  const [rawMin, setRawMin] = useState(String(s.minRelAbundancePct));
  useEffect(() => { setRawMin(String(s.minRelAbundancePct)); }, [s.minRelAbundancePct]);

  const commitMin = (text) => {
    setRawMin(text);
    const v = Number(text);
    if (Number.isFinite(v) && v >= 0) {
      // Clamp to a small floor to avoid combinatorial blow-up.
      const clamped = Math.max(v, 0.001);
      dispatch({ type: 'SET_ISOTOPE_SETTING', key: 'minRelAbundancePct', value: clamped });
    }
  };

  return (
    <div className="row-controls">
      <div className="field">
        <label>Min relative abundance (%)</label>
        <input
          type="number"
          step={0.05}
          value={rawMin}
          onChange={(e) => commitMin(e.target.value)}
          style={{ width: 90 }}
        />
      </div>
      <div className="field">
        <label>Normalize</label>
        <select
          value={s.normalize}
          onChange={(e) => dispatch({ type: 'SET_ISOTOPE_SETTING', key: 'normalize', value: e.target.value })}
        >
          <option value="base">Base peak = 100%</option>
          <option value="sum">Sum = 100%</option>
        </select>
      </div>
      <div className="field checkbox">
        <input
          id="show-marker"
          type="checkbox"
          checked={s.showInputMarker}
          onChange={(e) => dispatch({ type: 'SET_ISOTOPE_SETTING', key: 'showInputMarker', value: e.target.checked })}
        />
        <label htmlFor="show-marker">Show input m/z marker</label>
      </div>
    </div>
  );
}

export function Stage3Panel() {
  const { state } = useStore();
  const ion = useIonFormula();
  const sel = state.selectedFormula;

  return (
    <section id="stage3" className="stage-panel">
      <h2><span className="stage-tag">Stage 3</span> Isotope pattern simulation</h2>
      {!sel && (
        <div className="no-results">
          Click a candidate formula in Stage 2 to simulate its observed-ion isotope pattern.
        </div>
      )}
      {sel && (
        <>
          <div className="status-line" style={{ fontSize: 13, color: 'var(--text)' }}>
            Candidate <b className="formula">{sel.formulaString}</b>
            {state.selection && <> · adduct <b>{state.selection.adduct.label}</b></>}
            {ion && <> · ion <b className="formula">{ionFormulaString(ion.ionElementCounts)}</b> ({ion.z === 1 ? '' : ion.z}{ion.sign > 0 ? '+' : '−'})</>}
          </div>
          <IsotopeControls />
          <div className="split-3">
            <StickSpectrum />
            <PeakTable />
          </div>
        </>
      )}
    </section>
  );
}
