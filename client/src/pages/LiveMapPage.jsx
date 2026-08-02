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
  'Finding your location...',
  'Locating nearby railway lines...',
  'Awareness ready',
];

export default function LiveMapPage() {
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isEmergencyModeActive, setIsEmergencyModeActive] = useState(false);
  const { isSimulating, setIsSimulating, simulatedPosition, setSimulatedPosition } =
    useSimulation();

  const { rawPosition, permissionStatus } = useLocationTracking(
    isSimulating,
    simulatedPosition
  );

  const position = useMarkerAnimation(rawPosition);

  // Safety-critical backend requests must use rawPosition, never smoothed animation state.
  const rawLat = rawPosition ? rawPosition[0] : null;
  const rawLng = rawPosition ? rawPosition[1] : null;

  console.log("[Before Backend]", rawLat, rawLng);

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
    console.log("[Manual Input / Panel Apply]", coords[0], coords[1]);
    setSimulatedPosition(coords);
    if (!isSimulating) setIsSimulating(true);
    if (rawLat === coords[0] && rawLng === coords[1]) {
      requestObservationRefresh();
    }
  };

  const isDev = import.meta.env.DEV;

  const isTrainNearby = observationData?.awareness?.requiresProminentDisplay === true;

  return (
    <div className="relative flex w-full h-screen bg-slate-50 overflow-hidden font-sans">

      {/* Left Sidebar */}
      <AwarenessSidebar
        observationData={observationData}
        isTrainNearby={isTrainNearby}
      />

      {/* Main Map Container */}
      <div className="flex-1 relative h-full min-w-0">

        {/* Background Map layer */}
        <div className="absolute inset-0 z-0">
          <LiveMap
            position={position}
            isSimulating={isSimulating}
            onMapClick={(latlng) => handleApplyCoordinates(latlng)}
            observationData={observationData}
            isDiagnosticsOpen={isDiagnosticsOpen}
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
                  {loadingStep === 1 ? 'Locating nearby railway lines... (this can take a few seconds depending on network)' : LOADING_STEPS[loadingStep]}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Network Error Overlay */}
        {observationStatus === 'error' && !isTrainNearby && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-sm">
            <div className="bg-white/95 backdrop-blur-lg border-l-4 border-l-orange-500 border-y border-r border-slate-200 rounded-xl p-4 shadow-2xl flex flex-col items-center space-y-3 text-center">
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
        )}
        {/* Emergency Mode Toggle Button */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-[55] w-11/12 max-w-md">
          <button
            onClick={() => setIsEmergencyModeActive(true)}
            className="w-full py-4 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-2xl uppercase tracking-wider rounded-xl shadow-2xl border-4 border-red-800 transition-all"
          >
            I need help now
          </button>
        </div>
      </div>

      {/* Developer Diagnostics Panel */}
      {!import.meta.env.PROD && (
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
          onClose={() => setIsEmergencyModeActive(false)}
        />
      )}

      {/* Permission Denied — Full Screen Blocking Overlay */}
      {permissionStatus === 'denied' && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-white/95 backdrop-blur-md p-6 text-center border-4 border-red-500">
          <MapPinOff className="w-16 h-16 text-red-600 mb-6" />
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Location Access Required</h2>
          <p className="text-slate-600 text-lg max-w-md mb-8">
            RailAware requires your location to detect nearby railway corridors.
            We do not save your location history.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-xl transition-all"
          >
            Enable Location &amp; Reload
          </button>
        </div>
      )}

    </div>
  );
}
