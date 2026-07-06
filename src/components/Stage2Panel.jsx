import React, { useState, useEffect } from 'react';
import { useStore } from '../state/store.js';
import { ParamsBar } from './ParamsBar.jsx';
import { ElementTable } from './ElementTable.jsx';
import { ResultsTable } from './ResultsTable.jsx';

function TargetMassField() {
  const { state, dispatch } = useStore();
  const [raw, setRaw] = useState(state.targetMass != null ? String(state.targetMass) : '');
  useEffect(() => {
    setRaw(state.targetMass != null ? String(state.targetMass) : '');
  }, [state.targetMass]);
  const commit = (text) => {
    setRaw(text);
    if (text.trim() === '') { dispatch({ type: 'SET_TARGET_MASS', mass: null }); return; }
    const v = Number(text);
    if (Number.isFinite(v) && v > 0) dispatch({ type: 'SET_TARGET_MASS', mass: v });
  };
  return (
    <div className="field">
      <label>Target neutral mass (Da)</label>
      <input
        type="text"
        inputMode="decimal"
        value={raw}
        onChange={(e) => commit(e.target.value)}
        placeholder="auto-filled from Stage 1"
        style={{ width: 180 }}
      />
    </div>
  );
}

export function Stage2Panel() {
  const { state } = useStore();
  const truncMsg = state.resultsTruncated ? ' — results truncated at cap' : '';
  return (
    <section id="stage2" className="stage-panel">
      <h2><span className="stage-tag">Stage 2</span> Elemental composition search</h2>
      <div className="row-controls">
        <TargetMassField />
      </div>
      <ParamsBar />
      <ElementTable />
      <div className="status-line" style={{ marginTop: 12 }}>
        {state.results.length} candidate{state.results.length === 1 ? '' : 's'} found{truncMsg}
        {state.selection && (
          <> · target from <b>{state.selection.adduct.label}</b> at m/z <span className="tabular">{state.selection.inputMz}</span></>
        )}
      </div>
      <ResultsTable />
    </section>
  );
}
