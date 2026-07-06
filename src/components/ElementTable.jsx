import React from 'react';
import { useStore } from '../state/store.js';

function isotopeLabel(nuclide) {
  if (nuclide.isMonoisotopic) return nuclide.element;
  return `[${nuclide.massNumber}${nuclide.element}]`;
}

function InlineNum({ value, onCommit, width = 60, min }) {
  const [raw, setRaw] = React.useState(String(value));
  React.useEffect(() => { setRaw(String(value)); }, [value]);
  return (
    <input
      type="number"
      value={raw}
      min={min}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={() => {
        const v = Number(raw);
        if (Number.isFinite(v)) onCommit(v);
        else setRaw(String(value));
      }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      style={{ width }}
    />
  );
}

export function ElementTable() {
  const { state, dispatch } = useStore();
  const rows = state.elementRows;

  const openPT = () => dispatch({ type: 'OPEN_MODAL', modal: { type: 'periodicTable' } });

  const updateRow = (id, patch) => dispatch({ type: 'UPDATE_ELEMENT_ROW', id, patch });
  const removeRow = (id) => dispatch({ type: 'REMOVE_ELEMENT_ROW', id });

  const hasInvalid = rows.some(
    (r) => !Number.isFinite(r.min) || !Number.isFinite(r.max) || r.min < 0 || r.max < r.min
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Element / isotope table</div>
        <button className="btn" onClick={openPT}>+ Add element</button>
      </div>
      <table className="data">
        <thead>
          <tr>
            <th>Element / isotope</th>
            <th className="num" style={{ width: 110 }}>Exact mass (Da)</th>
            <th className="num" style={{ width: 80 }}>Min</th>
            <th className="num" style={{ width: 80 }}>Max</th>
            <th className="num" style={{ width: 80 }}>Valence</th>
            <th style={{ width: 70 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const bad = !Number.isFinite(row.min) || !Number.isFinite(row.max) || row.min < 0 || row.max < row.min;
            return (
              <tr key={row.id} className={bad ? 'row-invalid' : ''}>
                <td>
                  <span className="formula">
                    {row.nuclide.isMonoisotopic
                      ? row.nuclide.element
                      : <span className="isotope">{isotopeLabel(row.nuclide)}</span>}
                  </span>
                </td>
                <td className="num">{row.nuclide.exactMass.toFixed(5)}</td>
                <td className="num">
                  <InlineNum value={row.min} min={0} onCommit={(v) => updateRow(row.id, { min: Math.max(0, Math.round(v)) })} />
                </td>
                <td className="num">
                  <InlineNum value={row.max} min={0} onCommit={(v) => updateRow(row.id, { max: Math.max(0, Math.round(v)) })} />
                </td>
                <td className="num">
                  <InlineNum value={row.valence} onCommit={(v) => updateRow(row.id, { valence: v })} />
                </td>
                <td>
                  <button className="btn small" onClick={() => removeRow(row.id)}>Remove</button>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={6} className="no-results">No elements selected. Click "Add element" to begin.</td></tr>
          )}
        </tbody>
      </table>
      {hasInvalid && <div className="input-error">Some rows have invalid ranges (min &lt; 0 or max &lt; min). Fix these to run the search.</div>}
    </div>
  );
}
