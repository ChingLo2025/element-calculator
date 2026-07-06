import React from 'react';
import { MzInput } from './MzInput.jsx';
import { PolarityToggle } from './PolarityToggle.jsx';
import { AdductTable } from './AdductTable.jsx';

export function Stage1Panel() {
  return (
    <section id="stage1" className="stage-panel">
      <h2><span className="stage-tag">Stage 1</span> Neutral mass across adducts</h2>
      <div className="row-controls">
        <MzInput />
        <PolarityToggle />
      </div>
      <AdductTable />
    </section>
  );
}
