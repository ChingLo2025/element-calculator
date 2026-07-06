import React from 'react';
import { useStore } from '../state/store.js';

export function AdductTable() {
  const { state, dispatch } = useStore();
  const rows = state.adductResults.filter(({ adduct }) =>
    state.polarityFilter === 'both' ? true : adduct.mode === state.polarityFilter
  );
  const selectedId = state.selection?.adduct?.id;

  const onSelect = (row) => {
    if (row.neutralMass == null) return;
    dispatch({
      type: 'SELECT_ADDUCT',
      adduct: row.adduct,
      neutralMass: row.neutralMass,
      inputMz: state.inputMz
    });
    setTimeout(() => {
      const el = document.getElementById('stage2');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  };

  if (!rows.length) {
    return (
      <div className="no-results">
        {state.inputMz == null ? 'Enter an m/z value to compute neutral masses.' : 'No adducts match the polarity filter.'}
      </div>
    );
  }

  return (
    <table className="data">
      <thead>
        <tr>
          <th style={{ width: 180 }}>Adduct</th>
          <th className="num" style={{ width: 200 }}>Neutral mass (Da)</th>
          <th>Mode</th>
          <th>Charge</th>
          <th>Cluster</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ adduct, neutralMass }) => {
          const selected = adduct.id === selectedId;
          return (
            <tr key={adduct.id} className={selected ? 'selected' : ''}>
              <td>{adduct.label}</td>
              <td className="num">
                {neutralMass == null
                  ? <span style={{ color: 'var(--text-mute)' }}>n/a</span>
                  : (
                    <button
                      className="mass-btn"
                      onClick={() => onSelect({ adduct, neutralMass })}
                    >
                      {neutralMass.toFixed(5)}
                    </button>
                  )}
              </td>
              <td>{adduct.mode === 'pos' ? '+' : '−'}</td>
              <td>{adduct.z}</td>
              <td>{adduct.n === 1 ? 'M' : `${adduct.n}M`}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
