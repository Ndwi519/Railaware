import React, { useState, useEffect } from 'react';
import LiveMap from '../components/LiveMap';
import DeveloperDiagnosticsPanel from '../components/DeveloperDiagnosticsPanel';
import GuidedEmergencyMode from '../components/GuidedEmergencyMode';
import AwarenessSidebar from '../components/AwarenessSidebar';
import { useMarkerAnimation } from '../hooks/useMarkerAnimation';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { useSimulation } from '../hooks/useSimulation';
import { useAwareness } from '../hooks/useAwareness';
import { Loader2, MapPinOff } from 'lucide-react';

const LOADING_STEPS = [
  'Acquiring GPS position...',
  'Resolving local railway topology...',
  'Awareness active',
];

export default function LiveMapPage() {
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isEmergencyModeActive, setIsEmergencyModeActive] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isSimulating, setIsSimulating, simulatedPosition, setSimulatedPosition } =
    useSimulation();

  const { rawPosition, permissionStatus, geoError, requestPermission } = useLocationTracking(
    isSimulating,
    simulatedPosition
  );

  const position = useMarkerAnimation(rawPosition);

  // Safety-critical backend requests must use rawPosition, never smoothed animation state.
  const rawLat = rawPosition ? rawPosition[0] : null;
  const rawLng = rawPosition ? rawPosition[1] : null;

  const { observationData, observationStatus, requestObservationRefresh } =
    useAwareness(rawLat, rawLng);

  // Loading overlay sequencing
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    let interval;
    let timeoutId;
    if (permissionStatus === 'granted' && loadingStep === 0) {
      let step = 1;
      interval = setInterval(() => {
        setLoadingStep(step);
        step++;
        if (step >= LOADING_STEPS.length) {
          clearInterval(interval);
          timeoutId = setTimeout(() => setLoadingStep(-1), 2000);
        }
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionStatus]);

  const handleApplyCoordinates = (coords) => {
    setSimulatedPosition(coords);
    if (!isSimulating) setIsSimulating(true);
    if (rawLat === coords[0] && rawLng === coords[1]) {
      requestObservationRefresh();
    }
  };

  const isTrainNearby = observationData?.awareness?.requiresProminentDisplay === true;

  return (
    <div className="relative w-full h-[100dvh] bg-rail-platform overflow-hidden font-sans">

      {/* Left Sidebar */}
      <AwarenessSidebar
        observationData={observationData}
        isTrainNearby={isTrainNearby}
        isOpen={isSidebarOpen}
        onOpenChange={setIsSidebarOpen}
      />

      {/* Main Map Container */}
      <div
        className="absolute inset-0 z-0 transition-all duration-300"
      >

        {/* Background Map layer */}
        <div className="absolute inset-0 z-0">
          <LiveMap
            position={position}
            isSimulating={isSimulating}
            onMapClick={(latlng) => handleApplyCoordinates(latlng)}
            observationData={observationData}
          />
        </div>

        {/* Lightweight Loading Overlay */}
        {permissionStatus !== 'denied' && loadingStep >= 0 && observationStatus !== 'error' && !isTrainNearby && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-sm pointer-events-none">
            <div className="bg-white/95 backdrop-blur-lg border border-slate-200 rounded-2xl p-4 shadow-2xl flex items-center space-x-4 transition-all duration-500 pointer-events-auto">
              {loadingStep < LOADING_STEPS.length - 1 ? (
                <Loader2 className="w-6 h-6 text-emerald-600 animate-spin flex-shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-slate-800 font-bold text-sm">RailAware</h3>
                <p className="text-slate-600 text-sm truncate animate-pulse">
                  {loadingStep === 1 ? 'Resolving local railway topology... (this can take a few seconds depending on network)' : LOADING_STEPS[loadingStep]}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Network Error Overlay */}
        {observationStatus === 'error' && !observationData && !isTrainNearby && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-sm">
            <div
              role="status"
              aria-live="polite"
              className="bg-white/95 backdrop-blur-lg border border-slate-200 shadow-2xl rounded-xl flex flex-row overflow-hidden w-full"
            >
              {/* Left Accent Bar */}
              <div className="w-1.5 bg-orange-500 shrink-0"></div>
              {/* Content Box */}
              <div className="p-4 flex flex-col items-center space-y-3 text-center flex-1">
                <div>
                  <h3 className="text-slate-800 font-bold text-sm">Network Unreachable</h3>
                  <p className="text-slate-600 text-sm mt-1">Unable to fetch live awareness data. Please check your connection.</p>
                </div>
                <button
                  onClick={() => requestObservationRefresh()}
                  className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold rounded-lg text-sm transition-colors w-full"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Emergency Mode Toggle Button */}
      <div className={`absolute left-1/2 -translate-x-1/2 z-[55] w-11/12 max-w-md transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'cta-tablet-shifted' : ''
      } ${
        (observationData && !isTrainNearby)
          ? 'md:bottom-12 bottom-[calc(90px+env(safe-area-inset-bottom,16px))]'
          : 'bottom-6 md:bottom-12'
      }`}>
        <button
          onClick={() => setIsEmergencyModeActive(true)}
          aria-label="Open emergency guidance mode"
          className="w-full py-4 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-2xl uppercase tracking-wider rounded-xl shadow-[0_0_30px_rgba(220,38,38,0.5)] border-4 border-red-500 transition-all"
        >
          I need help now
        </button>
      </div>

      {/* Developer Diagnostics Panel */}
      {(import.meta.env.DEV || import.meta.env.VITE_ENABLE_DIAGNOSTICS === 'true') && (
        <DeveloperDiagnosticsPanel
          isOpen={isDiagnosticsOpen}
          setIsOpen={setIsDiagnosticsOpen}
          isSimulating={isSimulating}
          setIsSimulating={setIsSimulating}
          simulatedPosition={simulatedPosition}
          observationData={observationData}
          observationStatus={observationStatus}
          onApplyCoordinates={handleApplyCoordinates}
          onRefresh={requestObservationRefresh}
        />
      )}

      {/* Emergency Mode Overlay */}
      {isEmergencyModeActive && (
        <GuidedEmergencyMode
          awarenessData={observationData}
          rawPosition={rawPosition}
          onClose={() => setIsEmergencyModeActive(false)}
        />
      )}

      {/* Permission Prompts and Overlays */}
      {(permissionStatus === 'prompt' || permissionStatus === 'denied' || permissionStatus === 'unsupported') && !isSimulating && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-white/95 backdrop-blur-md p-6 text-center border-4 border-rail-red-border">
          <MapPinOff className="w-16 h-16 text-rail-red-text mb-6" />

          {permissionStatus === 'unsupported' ? (
            <>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Location Unsupported</h2>
              <p className="text-slate-600 text-lg max-w-md mb-8">
                Your browser or device does not support geolocation, which is required for RailAware to function.
              </p>
            </>
          ) : permissionStatus === 'prompt' ? (
            <>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Location Access Required</h2>
              <p className="text-slate-600 text-lg max-w-md mb-8">
                RailAware needs your device location to detect nearby railway infrastructure.
              </p>
              <button
                onClick={requestPermission}
                className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xl transition-all mb-4"
              >
                Enable Location
              </button>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Location access is blocked</h2>
              <p className="text-slate-600 text-lg max-w-md mb-8">
                RailAware needs your device location to detect nearby railway infrastructure.
                If you previously blocked location, open your browser's site settings, set Location to Allow, then return here.
              </p>
              <button
                onClick={requestPermission}
                className="px-8 py-4 bg-rail-red hover:bg-rail-red-hover text-rail-red-text font-bold rounded-xl shadow-xl transition-all mb-4"
              >
                Try Again
              </button>
            </>
          )}

          {(import.meta.env.DEV || import.meta.env.VITE_ENABLE_DIAGNOSTICS === 'true') && geoError && (
            <div className="mt-4 text-xs text-slate-500 bg-slate-100 p-2 rounded">
              Err {geoError.code}: {geoError.message} (State: {permissionStatus})
            </div>
          )}
        </div>
      )}

      {/* Transient GPS Error Overlay */}
      {permissionStatus === 'granted' && geoError && (geoError.code === 2 || geoError.code === 3) && !isSimulating && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-sm">
          <div className="bg-yellow-50 backdrop-blur-lg border border-yellow-200 rounded-xl p-4 shadow-lg flex flex-col items-center space-y-3 text-center">
            <div>
              <h3 className="text-yellow-900 font-bold text-sm">Unable to get your current location</h3>
              <p className="text-yellow-700 text-sm mt-1">The device could not provide a GPS position right now. Check your location settings and try again.</p>
            </div>
            <button
              onClick={requestPermission}
              className="px-4 py-2 bg-yellow-200 hover:bg-yellow-300 text-yellow-900 font-bold rounded-lg text-sm transition-colors w-full"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
