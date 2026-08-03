import React, { useEffect, useState } from 'react';
import { X, Phone, AlertTriangle, MapPin, Copy, Share2, Check } from 'lucide-react';

export default function GuidedEmergencyMode({ awarenessData, rawPosition, onClose }) {
  // Lock body scroll and vibrate on mount
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([200]);
      } catch (e) {
        // gracefully degrade
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const [copied, setCopied] = useState(false);
  const lat = rawPosition ? rawPosition[0].toFixed(5) : null;
  const lng = rawPosition ? rawPosition[1].toFixed(5) : null;

  const nearestStation = awarenessData?.awareness?.nearestStation;
  let nearestStationText = null;
  if (nearestStation && nearestStation.name) {
    nearestStationText = `Nearest station: ${nearestStation.name}, approximately ${Math.round(nearestStation.distanceMetres)}m away.`;
  }

  const handleCopyLocation = async () => {
    if (!lat || !lng) return;
    try {
      await navigator.clipboard.writeText(`${lat}, ${lng}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Clipboard copy failed", e);
    }
  };

  const handleShareLocation = async () => {
    if (!lat || !lng) return;
    
    let text = `My location: ${lat}, ${lng}`;
    if (nearestStationText) {
      text += `\n${nearestStationText}`;
    }
    text += `\n\n(Note: Shared via RailAware. This app does not provide live train tracking.)`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Emergency Location',
          text: text,
        });
      } catch (e) {
        // Fallback to copy if user didn't explicitly abort the share sheet
        if (e.name !== 'AbortError') {
          handleCopyLocation();
        }
      }
    } else {
      // Fallback if Web Share API is not supported
      handleCopyLocation();
    }
  };


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
        
        {/* Exact Location & Sharing */}
        <div className="w-full bg-slate-900 border border-slate-700 p-6 rounded-2xl flex flex-col items-center text-center space-y-4">
          <div className="flex items-center gap-2 text-slate-300">
            <MapPin className="w-5 h-5 text-red-500" />
            <span className="text-xl font-mono bg-slate-950 px-3 py-1 rounded">
              {lat && lng ? `${lat}, ${lng}` : 'Waiting for GPS...'}
            </span>
          </div>
          
          {nearestStationText && (
            <p className="text-lg text-slate-400">
              {nearestStationText}
            </p>
          )}

          <div className="flex gap-4 w-full max-w-md pt-2">
            <button
              onClick={handleCopyLocation}
              disabled={!lat || !lng}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={handleShareLocation}
              disabled={!lat || !lng}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Share2 className="w-5 h-5" />
              Share
            </button>
          </div>
        </div>
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
