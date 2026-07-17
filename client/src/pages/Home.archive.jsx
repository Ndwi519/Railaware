import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Map, Settings } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center flex-1 p-6 text-center space-y-8">
      <div className="space-y-4">
        <div className="mx-auto w-20 h-20 bg-red-500 rounded-full flex items-center justify-center">
          <AlertTriangle className="text-white w-10 h-10" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">RailAware</h1>
        <p className="text-lg text-slate-400 max-w-sm mx-auto">
          Your active railway safety companion. Situational awareness when you need it most.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md">
        <Link 
          to="/map" 
          className="flex items-center gap-3 p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700"
        >
          <Map className="text-blue-400" />
          <div className="text-left">
            <h2 className="font-semibold">Live Map</h2>
            <p className="text-sm text-slate-400">View nearby railways</p>
          </div>
        </Link>
        <Link 
          to="/diagnostics" 
          className="flex items-center gap-3 p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700"
        >
          <Settings className="text-slate-400" />
          <div className="text-left">
            <h2 className="font-semibold">Phase 0</h2>
            <p className="text-sm text-slate-400">System diagnostics</p>
          </div>
        </Link>
      </div>
    </main>
  );
}
