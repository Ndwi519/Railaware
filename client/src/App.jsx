import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LiveMapPage from './pages/LiveMapPage';
import DiagnosticsPage from './pages/Diagnostics';

function App() {
  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen flex flex-col font-sans">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LiveMapPage />} />
          <Route path="/diagnostics" element={<DiagnosticsPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
