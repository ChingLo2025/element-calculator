import React from 'react';
import { useStore } from '../state/store.js';
import { RDB_INT_EPS } from '../engine/constants.js';

function renderFormula(str) {
  // Style subscript numbers and bracket-prefixed isotopes.
  // Tokenize into pieces: bracket groups, letters, and digit runs.
  const out = [];
  let i = 0;
  let k = 0;
  while (i < str.length) {
    const ch = str[i];
    if (ch === '[') {
      const end = str.indexOf(']', i);
      const tok = str.slice(i, end + 1);
      out.push(<span key={k++} className="isotope">{tok}</span>);
      i = end + 1;
    } else if (/[A-Za-z]/.test(ch)) {
      let j = i;
      while (j < str.length && /[A-Za-z]/.test(str[j])) j++;
      out.push(<span key={k++}>{str.slice(i, j)}</span>);
      i = j;
    } else if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < str.length && /[0-9]/.test(str[j])) j++;
      out.push(<span key={k++} className="sub">{str.slice(i, j)}</span>);
      i = j;
    } else {
      out.push(<span key={k++}>{ch}</span>);
      i++;
    }
  }
  return <span className="formula">{out}</span>;
}

function formatRdb(rdb) {
  const rounded = Math.round(rdb);
  if (Math.abs(rdb - rounded) < RDB_INT_EPS) return String(rounded);
  return rdb.toFixed(1);
}

export function ResultsTable() {
  const { state, dispatch } = useStore();
  const results = state.results;
  const selected = state.selectedFormula;

  const onPick = (r) => {
    dispatch({ type: 'SELECT_FORMULA', formula: r });
    setTimeout(() => {
      const el = document.getElementById('stage3');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  };

  if (!results.length) {
    return <div className="no-results">No candidates. Adjust element ranges, tolerance, or RDB constraints.</div>;
  }
  return (
    <table className="data">
      <thead>
        <tr>
          <th style={{ width: 40 }} className="num">#</th>
          <th>Formula</th>
          <th className="num" style={{ width: 140 }}>Theoretical mass (Da)</th>
          <th className="num" style={{ width: 110 }}>Δ (ppm)</th>
          <th className="num" style={{ width: 70 }}>RDB</th>
        </tr>
      </thead>
      <tbody>
        {results.map((r, i) => {
          const isSel = selected && selected.formulaString === r.formulaString;
          return (
            <tr key={r.formulaString + i} className={isSel ? 'selected' : ''} onClick={() => onPick(r)} style={{ cursor: 'pointer' }}>
              <td className="num">{i + 1}</td>
              <td>{renderFormula(r.formulaString)}</td>
              <td className="num">{r.theoMass.toFixed(5)}</td>
              <td className="num">{(r.deltaPpm >= 0 ? '+' : '') + r.deltaPpm.toFixed(3)}</td>
              <td className="num">{formatRdb(r.rdb)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
