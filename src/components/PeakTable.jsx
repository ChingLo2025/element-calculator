import React from 'react';
import { useStore } from '../state/store.js';

export function PeakTable() {
  const { state } = useStore();
  const peaks = state.isotopePeaks;
  if (!peaks.length) return null;
  return (
    <div style={{ maxHeight: 380, overflow: 'auto' }}>
      <table className="data">
        <thead>
          <tr>
            <th className="num" style={{ width: 100 }}>m/z</th>
            <th className="num" style={{ width: 90 }}>Rel. int. (%)</th>
            <th>Isotopologue</th>
          </tr>
        </thead>
        <tbody>
          {peaks.map((p, i) => (
            <tr key={i}>
              <td className="num">{p.mz.toFixed(5)}</td>
              <td className="num">{p.relInt.toFixed(2)}</td>
              <td className="tabular" style={{ fontSize: 12 }}>{p.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
