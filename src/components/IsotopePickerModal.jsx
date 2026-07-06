import React, { useState, useMemo } from 'react';
import { useStore } from '../state/store.js';
import { isotopesForElement, ELEMENTS_BY_SYM } from '../data/nuclides.js';
import { defaultValenceFor } from '../data/valences.js';

export function IsotopePickerModal({ element }) {
  const { state, dispatch } = useStore();
  const meta = ELEMENTS_BY_SYM[element];
  const isotopes = useMemo(() => isotopesForElement(element), [element]);
  const existingKeys = new Set(state.elementRows.map((r) => r.nuclide.key));

  const [checked, setChecked] = useState(() => {
    // Default: check the monoisotope only.
    const s = {};
    for (const iso of isotopes) s[iso.key] = iso.isMonoisotopic;
    return s;
  });
  const [valence, setValence] = useState(defaultValenceFor(element));

  const close = () => dispatch({ type: 'CLOSE_MODAL' });
  const back = () => dispatch({ type: 'OPEN_MODAL', modal: { type: 'periodicTable' } });

  const add = () => {
    const toAdd = isotopes
      .filter((iso) => checked[iso.key] && !existingKeys.has(iso.key))
      .map((iso) => ({
        nuclide: iso,
        label: iso.isMonoisotopic ? iso.element : `[${iso.massNumber}${iso.element}]`,
        min: 0,
        max: 5,
        valence
      }));
    if (toAdd.length) dispatch({ type: 'ADD_ELEMENT_ROWS', rows: toAdd });
    close();
  };

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal iso-picker" onClick={(e) => e.stopPropagation()}>
        <h3>Add isotopes of {meta?.name} ({element})</h3>
        <table className="data">
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Isotope</th>
              <th className="num">Exact mass (Da)</th>
              <th className="num">Natural abundance</th>
            </tr>
          </thead>
          <tbody>
            {isotopes.map((iso) => {
              const exists = existingKeys.has(iso.key);
              const label = iso.isMonoisotopic ? iso.element : `[${iso.massNumber}${iso.element}]`;
              return (
                <tr key={iso.key} style={exists ? { opacity: 0.55 } : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!checked[iso.key]}
                      disabled={exists}
                      onChange={(e) => setChecked((s) => ({ ...s, [iso.key]: e.target.checked }))}
                    />
                  </td>
                  <td><span className="formula">{iso.isMonoisotopic ? <>{label}</> : <span className="isotope">{label}</span>}</span> {exists && <span style={{ color: 'var(--text-mute)', fontSize: 11 }}>(already added)</span>}</td>
                  <td className="num">{iso.exactMass.toFixed(6)}</td>
                  <td className="num">{(iso.abundance * 100).toFixed(3)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="valence-row field">
          <label>Valence (used for RDB)</label>
          <input
            type="number"
            value={valence}
            onChange={(e) => setValence(Number(e.target.value))}
            style={{ width: 100 }}
          />
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={back}>Back</button>
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn primary" onClick={add}>Add</button>
        </div>
      </div>
    </div>
  );
}
