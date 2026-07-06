import React from 'react';
import { useStore } from '../state/store.js';

function NumField({ label, value, onCommit, step = 1, width = 80 }) {
  const [raw, setRaw] = React.useState(String(value));
  React.useEffect(() => { setRaw(String(value)); }, [value]);
  return (
    <div className="field">
      <label>{label}</label>
      <input
        type="number"
        value={raw}
        step={step}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => {
          const v = Number(raw);
          if (Number.isFinite(v)) onCommit(v);
          else setRaw(String(value));
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        style={{ width }}
      />
    </div>
  );
}

export function ParamsBar() {
  const { state, dispatch } = useStore();
  const p = state.params;
  const set = (key, value) => dispatch({ type: 'SET_PARAM', key, value });

  return (
    <div className="row-controls">
      <NumField
        label="Mass tolerance (± ppm)"
        value={p.tolPpm}
        step={0.1}
        onCommit={(v) => set('tolPpm', Math.max(0, v))}
        width={110}
      />
      <NumField label="RDB min"  value={p.rdbMin} step={0.5} onCommit={(v) => set('rdbMin', v)} />
      <NumField label="RDB max"  value={p.rdbMax} step={0.5} onCommit={(v) => set('rdbMax', v)} />
      <div className="field checkbox">
        <input
          id="int-rdb"
          type="checkbox"
          checked={p.integerRdbOnly}
          onChange={(e) => set('integerRdbOnly', e.target.checked)}
        />
        <label htmlFor="int-rdb">Integer RDB only</label>
      </div>
      <NumField
        label="Max results"
        value={p.topN}
        step={1}
        onCommit={(v) => set('topN', Math.max(1, Math.round(v)))}
      />
      <div className="field">
        <label>Sort by</label>
        <select value={p.sortBy} onChange={(e) => set('sortBy', e.target.value)}>
          <option value="absPpm">Abs. ppm error</option>
          <option value="signedPpm">Signed ppm error</option>
          <option value="mass">Theoretical mass</option>
          <option value="rdb">RDB</option>
        </select>
      </div>
    </div>
  );
}
