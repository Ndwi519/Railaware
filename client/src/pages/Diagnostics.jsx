import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Activity } from 'lucide-react';

export default function DiagnosticsPage() {
  return (
    <div className="flex flex-col min-h-screen p-6 max-w-2xl mx-auto space-y-6 w-full">
      <header className="flex items-center">
        <Link to="/" className="p-2 -ml-2 rounded-lg hover:bg-slate-700 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="ml-4 font-semibold text-xl">Phase 0 Diagnostics</h1>
      </header>
      
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
        <div className="flex items-center gap-3">
          <Activity className="text-yellow-500 w-8 h-8" />
          <h2 className="text-lg font-medium">Provider Validation Status</h2>
        </div>
        <p className="text-slate-400 text-sm">
          This system requires Phase 0 validation against the live RailRadar API to confirm schema shapes, rate limits, and array boundaries.
        </p>
        <div className="p-4 bg-slate-900 rounded border border-slate-700 font-mono text-sm">
          <span className="text-slate-500">$ </span>npm run phase0
          <br /><br />
          <span className="text-yellow-400">[PENDING]</span> API Key validation
          <br />
          <span className="text-yellow-400">[PENDING]</span> Endpoint discovery
          <br />
          <span className="text-yellow-400">[PENDING]</span> Rate limit monitoring
        </div>
      </div>
    </div>
  );
}
