import React from 'react';
import { useStore } from '../state/store.js';
import { ELEMENTS } from '../data/nuclides.js';

// Grid positions for the periodic table.
// We use two rows for lanthanides/actinides, offset below the main table.
function positionFor(el) {
  if (el.series === 'lanthanide') {
    // La (57) .. Lu (71). Show in row 9, columns 3..17
    return { row: 9, col: 3 + (el.Z - 57) };
  }
  if (el.series === 'actinide') {
    return { row: 10, col: 3 + (el.Z - 89) };
  }
  return { row: el.period, col: el.group };
}

export function PeriodicTableModal() {
  const { state, dispatch } = useStore();
  const existingElements = new Set(state.elementRows.map((r) => r.nuclide.element));

  const close = () => dispatch({ type: 'CLOSE_MODAL' });
  const pickElement = (sym) => dispatch({ type: 'OPEN_MODAL', modal: { type: 'isotopePicker', element: sym } });

  // Build a 10x18 grid.
  const cells = [];
  for (let r = 1; r <= 10; r++) {
    for (let c = 1; c <= 18; c++) cells.push({ r, c, el: null });
  }
  for (const el of ELEMENTS) {
    const p = positionFor(el);
    const idx = cells.findIndex((cell) => cell.r === p.row && cell.c === p.col);
    if (idx >= 0) cells[idx].el = el;
  }

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal" style={{ minWidth: 780 }} onClick={(e) => e.stopPropagation()}>
        <h3>Add element from periodic table</h3>
        <div className="help-text" style={{ marginBottom: 10 }}>
          Click an element to pick its isotopes. Green squares indicate elements already in the search table.
        </div>
        <div className="pt-grid">
          {cells.map((cell, idx) => {
            if (!cell.el) return <div key={idx} className="pt-cell empty" />;
            const exists = existingElements.has(cell.el.sym);
            return (
              <button
                key={cell.el.sym}
                className={`pt-cell ${exists ? 'exists' : ''}`}
                onClick={() => pickElement(cell.el.sym)}
                title={cell.el.name}
              >
                <span className="z">{cell.el.Z}</span>
                <span className="sym">{cell.el.sym}</span>
              </button>
            );
          })}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={close}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
