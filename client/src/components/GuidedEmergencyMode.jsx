import React, { useEffect } from 'react';
import { X, Phone, AlertTriangle } from 'lucide-react';

export default function GuidedEmergencyMode({ awarenessData, onClose }) {
  // Lock body scroll when emergency mode is active
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  let nearestTrackText = 'Locating nearest track...';
  if (awarenessData?.awareness?.nearbyTracks?.length > 0) {
    const trackDist = Math.round(awarenessData.awareness.nearbyTracks[0].crossTrackDistanceMetres);
    nearestTrackText = `The nearest track is approximately ${trackDist}m away.`;
  } else if (awarenessData) {
    nearestTrackText = `No track found in immediate vicinity.`;
  }

  let nearestCrossingText = 'Locating nearest crossing...';
  if (awarenessData?.awareness?.nearestCrossing) {
    const crossDist = Math.round(awarenessData.awareness.nearestCrossing.distanceMetres);
    nearestCrossingText = `The nearest known crossing is approximately ${crossDist}m away.`;
  } else if (awarenessData) {
    nearestCrossingText = 'No known crossing nearby — do not attempt to cross tracks to reach safety.';
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900 text-white flex flex-col p-6 animate-in fade-in duration-200">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-red-500 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8" />
          EMERGENCY GUIDANCE
        </h1>
        <button
          onClick={onClose}
          className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition-colors"
          aria-label="Close emergency mode"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full space-y-12">
        {/* Distances Section */}
        <div className="bg-slate-800 p-8 rounded-2xl w-full text-center space-y-4 shadow-xl border border-slate-700">
          <p className="text-2xl lg:text-3xl font-medium text-slate-100">
            {nearestTrackText}
          </p>
          <p className="text-2xl lg:text-3xl font-medium text-amber-400">
            {nearestCrossingText}
          </p>
        </div>

        {/* Safety Instructions */}
        <div className="w-full space-y-6">
          <div className="bg-red-950/40 border-l-4 border-red-500 p-6 rounded-r-xl">
            <p className="text-2xl lg:text-3xl font-bold text-red-100">
              Do not walk along the tracks.
            </p>
          </div>
          <div className="bg-blue-950/40 border-l-4 border-blue-500 p-6 rounded-r-xl">
            <p className="text-2xl lg:text-3xl font-bold text-blue-100">
              Move away from the tracks, perpendicular to them, to open ground.
            </p>
          </div>
          <div className="bg-amber-950/40 border-l-4 border-amber-500 p-6 rounded-r-xl">
            <p className="text-2xl lg:text-3xl font-bold text-amber-100">
              If you must cross, only use a marked crossing.
            </p>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-600 text-center">
            <p className="text-xl lg:text-2xl font-semibold text-slate-300">
              This app cannot tell you if a train is coming. Stay alert and watch and listen for yourself.
            </p>
          </div>
        </div>

        {/* Emergency Call Button */}
        <a
          href="tel:112"
          className="w-full max-w-md py-6 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-3xl rounded-full shadow-2xl transition-all flex items-center justify-center gap-4 mt-8"
        >
          <Phone className="w-8 h-8" />
          Call Emergency Services
        </a>
      </div>
    </div>
  );
}
