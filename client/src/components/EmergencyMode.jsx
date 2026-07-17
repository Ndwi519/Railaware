import React from 'react';
import { Train } from 'lucide-react';
import { formatStatus, formatDistance, formatConfidence } from '../utils/awarenessFormatters';

export default function EmergencyMode({ observationData }) {
  if (!observationData || !observationData.awareness) return null;
  
  // Explicitly note: This trigger condition is intentionally tied to the current 
  // awareness.status values as a temporary UI implementation. It is not a permanent 
  // product rule. If new awareness.status values are introduced in the future, 
  // this condition must be re-evaluated rather than assuming APPROACHING_STATION 
  // and AT_STATION remain the only states that justify a prominent awareness overlay.
  const isTrainNearby = 
    observationData.awareness.status === 'APPROACHING_STATION' || 
    observationData.awareness.status === 'AT_STATION';
    
  if (!isTrainNearby) return null;

  const { awareness } = observationData;

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/95 text-white p-8 animate-in fade-in zoom-in duration-300"
      role="status" 
      aria-live="polite"
    >
      <Train className="w-24 h-24 mb-6 text-slate-300" />
      
      <h1 className="text-7xl font-black tracking-tight text-center mb-4 leading-none text-blue-100">
        {formatDistance(awareness.distanceMetres)}
      </h1>
      
      <p className="text-3xl font-medium text-center mb-10 max-w-2xl text-slate-300 uppercase tracking-widest">
        {formatStatus(awareness.status)}
      </p>

      <div className="bg-slate-800 border border-slate-700 py-6 px-10 rounded-2xl shadow-xl text-center min-w-[300px]">
        <div className="grid grid-cols-2 gap-8 text-left">
          <div>
            <div className="text-slate-400 text-sm uppercase tracking-wider mb-1">Direction</div>
            <div className="text-xl font-semibold text-slate-100">
              {awareness.direction ? awareness.direction.replace(/_/g, ' ') : 'Unknown'}
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-sm uppercase tracking-wider mb-1">Data Confidence</div>
            <div className="text-xl font-semibold text-slate-100">
              {formatConfidence(awareness.confidence)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

