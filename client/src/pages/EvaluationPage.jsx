import React from 'react';
import SimulationDashboard from '../components/evaluation/SimulationDashboard';

export default function EvaluationPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-white font-sans">
      <header className="px-6 py-4 border-b border-slate-700 bg-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-blue-400">RailAware Evaluation Mode</h1>
        <p className="text-sm text-slate-400 mt-1">Isolated simulation pipeline testing</p>
      </header>
      <main className="flex-1 p-6">
        <SimulationDashboard />
      </main>
    </div>
  );
}
