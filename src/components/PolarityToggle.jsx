import React from 'react';
import { useStore } from '../state/store.js';

export function PolarityToggle() {
  const { state, dispatch } = useStore();
  const options = [
    { value: 'pos',  label: 'Positive' },
    { value: 'neg',  label: 'Negative' },
    { value: 'both', label: 'Both' }
  ];
  return (
    <div className="field">
      <label>Polarity filter</label>
      <div style={{ display: 'flex', gap: 4 }}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`btn ${state.polarityFilter === o.value ? 'primary' : ''}`}
            onClick={() => dispatch({ type: 'SET_POLARITY', polarity: o.value })}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
