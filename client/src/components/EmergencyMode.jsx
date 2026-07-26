import React from 'react';
import { Train } from 'lucide-react';
import { formatConfidence } from '../utils/awarenessFormatters';

export default function EmergencyMode({ observationData }) {
  if (!observationData || !observationData.awareness) return null;

  const isTrainNearby = observationData.awareness.requiresProminentDisplay === true;

  if (!isTrainNearby) return null;

  const { awareness, assistance } = observationData;

  if (!assistance?.guidance) {
    console.warn(
      'EmergencyMode received observation data without assistance guidance. ' +
      'This violates the backend API contract. Returning null.'
    );
    return null;
  }

  const hasSos = assistance?.availableActions?.includes('DIAL_EMERGENCY');

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/95 text-white p-8 animate-in fade-in zoom-in duration-300"
      role="status"
      aria-live="polite"
    >
      <Train className="w-24 h-24 mb-6 text-slate-300" />

      {/* Dynamic Assistance Guidance */}
      <div className="text-center mb-8">
        <h1 className="text-4xl lg:text-6xl font-black tracking-tight mb-4 leading-tight text-blue-100">
          {assistance.guidance.title}
        </h1>
        <div className="text-2xl font-medium max-w-2xl text-slate-300 uppercase tracking-widest space-y-2">
          {assistance.guidance.instructions.map((instruction, idx) => (
            <p key={idx}>{instruction}</p>
          ))}
        </div>
      </div>

      {/* SOS Button */}
      {hasSos && assistance.emergencyContact && (
        <a
          href={`tel:${assistance.emergencyContact.number}`}
          className="mb-8 bg-red-600 hover:bg-red-500 text-white font-bold py-4 px-10 rounded-full shadow-2xl transition-all flex items-center gap-3 text-xl"
        >
          📞 Call {assistance.emergencyContact.description}
        </a>
      )}

      <div className="bg-slate-800 border border-slate-700 py-6 px-10 rounded-2xl shadow-xl text-center min-w-[300px]">
        <div className="grid grid-cols-2 gap-8 text-left">
          <div>
            <div className="text-slate-400 text-sm uppercase tracking-wider mb-1">Direction</div>
            <div className="text-xl font-semibold text-slate-100">
              {awareness.direction ? awareness.direction.replace(/_/g, ' ') : 'Direction unavailable'}
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-sm uppercase tracking-wider mb-2">Data Confidence</div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Observation</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  observationData.confidence?.observationConfidence === 'HIGH' ? 'bg-green-900 text-green-300' :
                  observationData.confidence?.observationConfidence === 'MEDIUM' ? 'bg-yellow-900 text-yellow-300' :
                  observationData.confidence?.observationConfidence === 'LOW' ? 'bg-red-900 text-red-300' :
                  observationData.confidence?.observationConfidence === 'UNKNOWN' ? 'bg-slate-700 text-slate-300' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {observationData.confidence?.observationConfidence || 'UNASSESSED'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Provider</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  observationData.confidence?.providerReliability === 'HIGH' ? 'bg-green-900 text-green-300' :
                  observationData.confidence?.providerReliability === 'MEDIUM' ? 'bg-yellow-900 text-yellow-300' :
                  observationData.confidence?.providerReliability === 'LOW' ? 'bg-red-900 text-red-300' :
                  observationData.confidence?.providerReliability === 'UNKNOWN' ? 'bg-slate-700 text-slate-300' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {observationData.confidence?.providerReliability || 'UNASSESSED'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Topology</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  observationData.confidence?.topologyConfidence === 'HIGH' ? 'bg-green-900 text-green-300' :
                  observationData.confidence?.topologyConfidence === 'MEDIUM' ? 'bg-yellow-900 text-yellow-300' :
                  observationData.confidence?.topologyConfidence === 'LOW' ? 'bg-red-900 text-red-300' :
                  observationData.confidence?.topologyConfidence === 'UNKNOWN' ? 'bg-slate-700 text-slate-300' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {observationData.confidence?.topologyConfidence || 'UNASSESSED'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

