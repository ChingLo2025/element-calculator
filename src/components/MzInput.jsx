import React, { useState, useEffect } from 'react';
import { useStore } from '../state/store.js';

export function MzInput() {
  const { state, dispatch } = useStore();
  const [raw, setRaw] = useState(state.inputMz != null ? String(state.inputMz) : '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (state.inputMz == null) return;
    // Keep local text in sync when store is reset externally.
    if (Number(raw) !== state.inputMz) {
      setRaw(String(state.inputMz));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.inputMz]);

  const commit = (text) => {
    setRaw(text);
    if (text.trim() === '') {
      setError('');
      dispatch({ type: 'SET_INPUT_MZ', mz: null });
      return;
    }
    const v = Number(text);
    if (!Number.isFinite(v) || v <= 0) {
      setError('Enter a positive number.');
      dispatch({ type: 'SET_INPUT_MZ', mz: null });
      return;
    }
    setError('');
    dispatch({ type: 'SET_INPUT_MZ', mz: v });
  };

  return (
    <div className="field">
      <label htmlFor="mz-input">Input m/z</label>
      <input
        id="mz-input"
        type="text"
        inputMode="decimal"
        value={raw}
        onChange={(e) => commit(e.target.value)}
        placeholder="e.g. 359.1030"
        style={{ width: 160 }}
      />
      {error && <div className="input-error">{error}</div>}
    </div>
  );
}
