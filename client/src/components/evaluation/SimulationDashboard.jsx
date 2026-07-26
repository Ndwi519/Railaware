import React, { useState, useEffect } from 'react';

export default function SimulationDashboard() {
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/v1/evaluation/scenarios')
      .then(r => r.json())
      .then(data => {
        setScenarios(data);
        if (data.length > 0) {
          setSelectedScenario(data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  const runEvaluation = async () => {
    if (!selectedScenario) return;
    setLoading(true);
    try {
      const response = await fetch('/api/v1/evaluation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: selectedScenario })
      });
      const data = await response.json();
      setResult(data);
    } catch (e) {
      console.error(e);
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      {/* EVALUATION MODE WATERMARK/BANNER */}
      <div className="absolute -top-4 left-0 right-0 flex justify-center z-10 pointer-events-none">
        <div className="bg-slate-700 text-slate-300 text-xs font-bold px-4 py-1 rounded-b-lg border-b border-l border-r border-slate-600 tracking-widest uppercase">
          Evaluation Mode
        </div>
      </div>

      <div className="p-[1px] rounded-xl shadow-xl bg-slate-700">
        <div className="bg-slate-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-white">Simulation Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Select Scenario</label>
            <select value={selectedScenario} onChange={(e) => setSelectedScenario(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500">
              {scenarios.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.ticksCount} ticks)</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-2">
              {scenarios.find(s => s.id === selectedScenario)?.description}
            </p>
          </div>
        </div>
        <button onClick={runEvaluation} disabled={loading} className="mt-6 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-6 rounded transition-colors disabled:opacity-50 flex items-center justify-center">
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Evaluating...
            </>
          ) : 'Run Evaluation'}
        </button>
        </div>
      </div>

      {result && (
        <div className="p-[1px] rounded-xl shadow-xl animate-fade-in bg-slate-700 relative">
          <div className="absolute top-0 right-8 bg-slate-700 text-slate-400 text-[10px] font-bold px-2 py-1 rounded-b border-b border-l border-r border-slate-600 tracking-widest uppercase opacity-70">
            SIMULATION
          </div>
          <div className="bg-slate-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-emerald-400">Evaluation Report</h2>

          {result.error ? (
            <div className="p-4 bg-red-900/50 border border-red-500 rounded text-red-200">
              Error: {result.error}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 rounded border border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Scenario Status</h3>
                  <p className="text-3xl font-bold text-white">{result.success ? 'COMPLETED' : 'FAILED'}</p>
                </div>
              </div>



              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-900 rounded border border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Final Observation Detail</h3>
                  <div className="space-y-2 text-sm text-slate-300">
                    <div className="flex justify-between"><span>Scenario:</span> <span className="font-mono text-white">{result.report?.scenarioName || 'N/A'}</span></div>
                    <div className="flex justify-between"><span>Ticks Ran:</span> <span className="font-mono text-white">{result.records?.length || 0}</span></div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-900 rounded border border-slate-700 mt-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Metrics</h3>
                {result.report ? (
                  <div className="space-y-4 text-sm text-slate-300">
                    <div>
                      <h4 className="font-bold text-white border-b border-slate-700 pb-1 mb-2">Performance</h4>
                      <div className="flex justify-between"><span>Mean Obs Age:</span> <span className="font-mono text-emerald-400">{result.report.summary.performance.meanObservationAgeSec}s</span></div>
                      <div className="flex justify-between"><span>Mean Awareness Latency:</span> <span className="font-mono text-emerald-400">{result.report.summary.performance.meanAwarenessLatencySec}s</span></div>
                    </div>
                    <div>
                      <h4 className="font-bold text-white border-b border-slate-700 pb-1 mb-2">Accuracy</h4>
                      <div className="flex justify-between"><span>Mean Position Error:</span> <span className="font-mono text-emerald-400">{result.report.summary.accuracy.meanPositionErrorMetres?.toFixed(2) || 'N/A'}m</span></div>
                    </div>
                    <div>
                      <h4 className="font-bold text-white border-b border-slate-700 pb-1 mb-2">Behaviour</h4>
                      <div className="flex justify-between"><span>False Negatives:</span> <span className="font-mono text-red-400">{result.report.summary.behaviour.falseNegatives}</span></div>
                      <div className="flex justify-between"><span>False Positives:</span> <span className="font-mono text-yellow-400">{result.report.summary.behaviour.falsePositives}</span></div>
                    </div>
                  </div>
                ) : (
                  <p>No report generated.</p>
                )}
              </div>

              <details className="mt-4 outline-none">
                <summary className="cursor-pointer text-blue-400 hover:text-blue-300 font-medium select-none outline-none">View Raw Pipeline Context</summary>
                <pre className="mt-4 p-4 bg-slate-950 text-slate-400 text-xs overflow-x-auto rounded border border-slate-700">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
