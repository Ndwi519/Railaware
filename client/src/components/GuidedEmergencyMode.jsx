import React, { useEffect, useState } from 'react';
import { X, Phone, AlertTriangle, MapPin, Copy, Share2, Check, ArrowRight } from 'lucide-react';

function getBearingString(startLat, startLng, destLat, destLng) {
  const toRad = (val) => (val * Math.PI) / 180;
  const toDeg = (val) => (val * 180) / Math.PI;

  const y = Math.sin(toRad(destLng - startLng)) * Math.cos(toRad(destLat));
  const x = Math.cos(toRad(startLat)) * Math.sin(toRad(destLat)) -
            Math.sin(toRad(startLat)) * Math.cos(toRad(destLat)) * Math.cos(toRad(destLng - startLng));

  const brng = (toDeg(Math.atan2(y, x)) + 360) % 360;
  const dirs = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  return dirs[Math.round(brng / 45) % 8];
}

export default function GuidedEmergencyMode({ awarenessData, rawPosition, onClose }) {
  // Lock body scroll and vibrate on mount
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([200]);
      } catch (e) {
        // gracefully degrade
      }
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const [copied, setCopied] = useState(false);
  const lat = rawPosition ? rawPosition[0].toFixed(5) : null;
  const lng = rawPosition ? rawPosition[1].toFixed(5) : null;

  const nearestStation = awarenessData?.awareness?.nearestStation;
  let nearestStationText = null;
  if (nearestStation && nearestStation.name) {
    const stationDist = nearestStation.distanceMetres != null
      ? `approximately ${Math.round(nearestStation.distanceMetres)}m away`
      : 'distance unknown';
    nearestStationText = `Nearest station: ${nearestStation.name}, ${stationDist}.`;
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
        if (e.name !== 'AbortError') {
          handleCopyLocation();
        }
      }
    } else {
      handleCopyLocation();
    }
  };

  let nearestTrackText = 'Locating nearest track...';
  if (awarenessData?.awareness?.nearbyTracks?.length > 0) {
    const rawDist = awarenessData.awareness.nearbyTracks[0].crossTrackDistanceMetres;
    const trackDist = rawDist != null ? `approximately ${Math.round(rawDist)}m away` : 'distance unknown';
    nearestTrackText = `The nearest track is ${trackDist}.`;
  } else if (awarenessData) {
    nearestTrackText = `No track found in immediate vicinity.`;
  }

  let nearestCrossingText = 'Locating nearest crossing...';
  const crossing = awarenessData?.awareness?.nearestCrossing;
  if (crossing) {
    const rawCross = crossing.distanceMetres;
    const crossDist = rawCross != null ? `${Math.round(rawCross)}m` : 'distance unknown';

    let bearingText = '';
    if (lat && lng && crossing.lat != null && crossing.lon != null) {
      const bearing = getBearingString(rawPosition[0], rawPosition[1], crossing.lat, crossing.lon);
      bearingText = ` ${bearing}`;
    } else if (lat && lng && crossing.feature?.lat != null && crossing.feature?.lng != null) {
      // Sometimes it's nested in feature depending on resolver
      const bearing = getBearingString(rawPosition[0], rawPosition[1], crossing.feature.lat, crossing.feature.lng);
      bearingText = ` ${bearing}`;
    }

    nearestCrossingText = `Nearest crossing — ${crossDist}${bearingText ? ' · ' + bearingText : ''}`;
  } else if (awarenessData) {
    nearestCrossingText = 'No known crossing nearby — do not attempt to cross tracks to reach safety.';
  }

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900 text-white flex flex-col animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-guidance-heading"
    >
      <div className="flex justify-between items-center p-4 pb-2 shrink-0">
        <h1
          id="emergency-guidance-heading"
          className="text-xl md:text-2xl font-black text-red-500 flex items-center gap-2"
        >
          <AlertTriangle className="w-6 h-6 md:w-8 md:h-8" aria-hidden="true" />
          EMERGENCY
        </h1>
        <button
          onClick={onClose}
          className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 transition-colors shrink-0"
          aria-label="Close emergency mode"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-[env(safe-area-inset-bottom,32px)]">
        <div className="flex flex-col items-center max-w-3xl mx-auto w-full space-y-5">

          {/* Primary CTA */}
          <div className="w-full mt-2">
            <a
              href="tel:112"
              className="w-full min-h-[64px] py-4 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-2xl md:text-3xl rounded-xl shadow-[0_0_30px_rgba(220,38,38,0.4)] border-2 border-red-500 transition-all flex flex-col items-center justify-center gap-1"
            >
              <div className="flex items-center gap-3">
                <Phone className="w-7 h-7" />
                <span>Call Emergency Services</span>
              </div>
              <span className="text-xl opacity-90 font-bold tracking-widest">112</span>
            </a>
          </div>

          {/* Distances Section */}
          <div className="bg-slate-800/80 p-5 rounded-xl w-full text-center space-y-2 shadow-lg border border-slate-700">
            <p className="text-lg font-medium text-slate-100">
              {nearestTrackText}
            </p>
            <p className="text-lg font-medium text-amber-400">
              {nearestCrossingText}
            </p>
          </div>

          {/* Top Priority Safety Instructions */}
          <div className="w-full space-y-3 mt-2">
            <div className="bg-red-950/60 border-l-4 border-red-500 p-4 rounded-r-lg">
              <h2 className="text-xl md:text-2xl font-black text-red-100 uppercase mb-1 tracking-wide">Move Away</h2>
              <p className="text-lg text-red-50 font-medium">
                Move away from railway tracks immediately.
              </p>
            </div>

            <div className="bg-orange-950/60 border-l-4 border-orange-500 p-4 rounded-r-lg">
              <h2 className="text-xl md:text-2xl font-black text-orange-100 uppercase mb-1 tracking-wide">Stay Clear</h2>
              <p className="text-lg text-orange-50 font-medium">
                Do not walk along or stand on railway tracks or railway infrastructure.
              </p>
            </div>

            <div className="bg-amber-950/60 border-l-4 border-amber-500 p-4 rounded-r-lg">
              <h2 className="text-xl md:text-2xl font-black text-amber-100 uppercase mb-1 tracking-wide">Cross Safely</h2>
              <p className="text-lg text-amber-50 font-medium">
                If you need to cross, use a marked public crossing and follow its signals and barriers.
              </p>
            </div>

            <div className="bg-rose-950/60 border-l-4 border-rose-500 p-4 rounded-r-lg">
              <h2 className="text-xl md:text-2xl font-black text-rose-100 uppercase mb-1 tracking-wide">If You See or Hear a Train</h2>
              <p className="text-lg text-rose-50 font-medium">
                Do not attempt to cross. Move to a safe location and wait.
              </p>
            </div>
          </div>



          {/* Exact Location & Sharing */}
          <div className="w-full bg-slate-800/50 border border-slate-700 p-5 rounded-xl flex flex-col items-center text-center space-y-4">
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm text-slate-400 uppercase font-bold">Your Location</p>
              <div className="flex items-center gap-2 text-slate-200">
                <MapPin className="w-5 h-5 text-blue-500" />
                <span className="text-xl md:text-2xl font-mono bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700 shadow-inner">
                  {lat && lng ? `${lat}, ${lng}` : 'Waiting for GPS...'}
                </span>
              </div>
            </div>

            {nearestStationText && (
              <p className="text-base text-slate-300 font-medium">
                {nearestStationText}
              </p>
            )}

            <div className="flex gap-4 w-full pt-2">
              <button
                onClick={handleCopyLocation}
                disabled={!lat || !lng}
                className="flex-1 min-h-[48px] py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-100 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors text-base"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={handleShareLocation}
                disabled={!lat || !lng}
                className="flex-1 min-h-[48px] py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors text-base"
              >
                <Share2 className="w-5 h-5" />
                Share
              </button>
            </div>
          </div>

          {/* Safety Disclaimer */}
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 text-center w-full">
            <p className="text-sm font-medium text-slate-400 leading-relaxed">
              This app cannot tell you if a train is coming. Stay alert and watch and listen for yourself.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
