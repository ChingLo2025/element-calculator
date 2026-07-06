import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../state/store.js';

const MARGIN = { top: 12, right: 16, bottom: 34, left: 46 };
const HEIGHT = 380;

function niceStep(range, targetTicks = 6) {
  const rough = range / targetTicks;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / pow;
  let step;
  if (norm < 1.5) step = 1;
  else if (norm < 3) step = 2;
  else if (norm < 7) step = 5;
  else step = 10;
  return step * pow;
}

function generateTicks(min, max) {
  const range = max - min;
  if (range <= 0) return [min];
  const step = niceStep(range, 6);
  const start = Math.ceil(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 1e-9; v += step) {
    ticks.push(v);
  }
  return ticks;
}

export function StickSpectrum() {
  const { state } = useStore();
  const peaks = state.isotopePeaks;
  const inputMz = state.selection?.inputMz;
  const showMarker = state.isotopeSettings.showInputMarker;

  const wrapRef = useRef(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.max(320, Math.floor(w)));
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Compute default domain: pad around peaks (and input marker).
  const dataMinMax = useMemo(() => {
    if (!peaks.length) return null;
    let lo = Infinity, hi = -Infinity;
    for (const p of peaks) { if (p.mz < lo) lo = p.mz; if (p.mz > hi) hi = p.mz; }
    if (inputMz != null && showMarker) {
      lo = Math.min(lo, inputMz);
      hi = Math.max(hi, inputMz);
    }
    let pad = (hi - lo) * 0.15;
    if (pad < 0.5) pad = 0.5;
    return { lo: lo - pad, hi: hi + pad };
  }, [peaks, inputMz, showMarker]);

  // Zoom/pan state: x-domain [xmin, xmax].
  const [domain, setDomain] = useState(null);
  useEffect(() => {
    if (dataMinMax) setDomain([dataMinMax.lo, dataMinMax.hi]);
    else setDomain(null);
  }, [dataMinMax]);

  const innerW = Math.max(50, width - MARGIN.left - MARGIN.right);
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const xScale = (mz) => {
    if (!domain) return 0;
    const [lo, hi] = domain;
    return ((mz - lo) / (hi - lo)) * innerW;
  };
  const yScale = (relInt) => innerH - (relInt / 100) * innerH;

  // Drag/pan.
  const dragRef = useRef(null);
  const onMouseDown = (e) => {
    if (!domain) return;
    dragRef.current = { startX: e.clientX, startDomain: domain };
  };
  const onMouseMove = (e) => {
    if (!dragRef.current) return;
    const { startX, startDomain } = dragRef.current;
    const dx = e.clientX - startX;
    const span = startDomain[1] - startDomain[0];
    const shift = (-dx / innerW) * span;
    setDomain([startDomain[0] + shift, startDomain[1] + shift]);
  };
  const onMouseUp = () => { dragRef.current = null; };

  const onWheel = (e) => {
    if (!domain) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - MARGIN.left;
    const [lo, hi] = domain;
    const span = hi - lo;
    const anchorMz = lo + (px / innerW) * span;
    const factor = e.deltaY > 0 ? 1.2 : 1 / 1.2;
    const newSpan = span * factor;
    const newLo = anchorMz - (px / innerW) * newSpan;
    const newHi = newLo + newSpan;
    setDomain([newLo, newHi]);
  };

  const reset = () => { if (dataMinMax) setDomain([dataMinMax.lo, dataMinMax.hi]); };
  const zoomIn = () => {
    if (!domain) return;
    const [lo, hi] = domain;
    const mid = (lo + hi) / 2;
    const half = (hi - lo) / 2 / 1.5;
    setDomain([mid - half, mid + half]);
  };
  const zoomOut = () => {
    if (!domain) return;
    const [lo, hi] = domain;
    const mid = (lo + hi) / 2;
    const half = ((hi - lo) / 2) * 1.5;
    setDomain([mid - half, mid + half]);
  };

  if (!peaks.length) {
    return (
      <div ref={wrapRef} className="stick-container">
        <div className="no-results" style={{ padding: 40 }}>
          Select a candidate formula in Stage 2 to simulate its isotope pattern.
        </div>
      </div>
    );
  }

  const xTicks = domain ? generateTicks(domain[0], domain[1]) : [];
  const yTicks = [0, 25, 50, 75, 100];

  const visible = peaks.filter((p) => domain && p.mz >= domain[0] && p.mz <= domain[1]);

  return (
    <div ref={wrapRef} className="stick-container">
      <div className="stick-controls">
        <button className="btn small" onClick={zoomOut}>−</button>
        <button className="btn small" onClick={zoomIn}>+</button>
        <button className="btn small" onClick={reset}>Reset view</button>
        <div style={{ marginLeft: 'auto' }}>Drag to pan · wheel to zoom</div>
        {inputMz != null && showMarker && (
          <span><span className="legend-marker" />Input m/z {inputMz}</span>
        )}
      </div>
      <svg
        className="stick-svg"
        width={width}
        height={HEIGHT}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {/* Gridlines & y-axis */}
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line x1={0} x2={innerW} y1={yScale(t)} y2={yScale(t)} stroke="#eef0f5" />
              <text x={-6} y={yScale(t) + 3} fontSize={10} textAnchor="end" fill="#5a5f6b">{t}</text>
            </g>
          ))}
          {/* x-axis */}
          <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#c0c4cf" />
          {xTicks.map((t) => (
            <g key={`x${t}`} transform={`translate(${xScale(t)},${innerH})`}>
              <line y2={4} stroke="#c0c4cf" />
              <text y={16} fontSize={10} textAnchor="middle" fill="#5a5f6b" fontFamily="ui-monospace, monospace">{t.toFixed(2)}</text>
            </g>
          ))}
          {/* Input m/z marker */}
          {inputMz != null && showMarker && domain && inputMz >= domain[0] && inputMz <= domain[1] && (
            <line
              x1={xScale(inputMz)} x2={xScale(inputMz)}
              y1={0} y2={innerH}
              stroke="#b7381c"
              strokeDasharray="4 3"
              strokeWidth={1.2}
            />
          )}
          {/* Sticks */}
          {visible.map((p, i) => (
            <g key={i}>
              <line x1={xScale(p.mz)} x2={xScale(p.mz)} y1={innerH} y2={yScale(p.relInt)} stroke="#1f56b8" strokeWidth={1.5} />
              {p.relInt > 15 && (
                <text
                  x={xScale(p.mz)} y={yScale(p.relInt) - 3}
                  fontSize={10}
                  textAnchor="middle"
                  fill="#1f56b8"
                  fontFamily="ui-monospace, monospace"
                >
                  {p.mz.toFixed(4)}
                </text>
              )}
            </g>
          ))}
          {/* Axis labels */}
          <text x={innerW / 2} y={innerH + 30} fontSize={11} textAnchor="middle" fill="#5a5f6b">m/z</text>
          <text x={-innerH / 2} y={-34} transform="rotate(-90)" fontSize={11} textAnchor="middle" fill="#5a5f6b">Relative intensity (%)</text>
        </g>
      </svg>
    </div>
  );
}
