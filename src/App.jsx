import React from 'react';
import { StoreProvider, useStore } from './state/store.js';
import { Stage1Panel } from './components/Stage1Panel.jsx';
import { Stage2Panel } from './components/Stage2Panel.jsx';
import { Stage3Panel } from './components/Stage3Panel.jsx';
import { PeriodicTableModal } from './components/PeriodicTableModal.jsx';
import { IsotopePickerModal } from './components/IsotopePickerModal.jsx';

function AppContent() {
  const { state } = useStore();
  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>m/z Elemental Composition Calculator</h1>
          <div className="subtitle">Neutral mass · Formula search · Isotope pattern</div>
        </div>
        <div className="subtitle">Spec v1.0 · client-side</div>
      </header>
      <Stage1Panel />
      <Stage2Panel />
      <Stage3Panel />
      {state.modal?.type === 'periodicTable' && <PeriodicTableModal />}
      {state.modal?.type === 'isotopePicker' && <IsotopePickerModal element={state.modal.element} />}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
