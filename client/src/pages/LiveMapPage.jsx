import React, { useState, useEffect } from 'react';
import LiveMap from '../components/LiveMap';
import DeveloperDiagnosticsPanel from '../components/DeveloperDiagnosticsPanel';
import EmergencyMode from '../components/EmergencyMode';
import { useSmoothedLocation } from '../hooks/useSmoothedLocation';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { useSimulation } from '../hooks/useSimulation';
import { useObservation } from '../hooks/useObservation';
import { Loader2, MapPinOff, Info } from 'lucide-react';
import { formatStatus, formatDistance } from '../utils/awarenessFormatters';

const LOADING_STEPS = [
  'Finding your location...',
  'Locating nearby railway lines...',
  'Checking live train data...',
  'Live updates active',
];

export default function LiveMapPage() {
  const { isSimulating, setIsSimulating, simulatedPosition, setSimulatedPosition } =
    useSimulation();

  const { rawPosition, permissionStatus } = useLocationTracking(
    isSimulating,
    simulatedPosition
  );

  const position = useSmoothedLocation(rawPosition, 0.3);
  const lat = position ? position[0] : null;
  const lng = position ? position[1] : null;

  console.log("[Before Backend]", lat, lng);

  const { observationData, observationStatus, requestObservationRefresh } =
    useObservation(lat, lng);

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
    if (lat === coords[0] && lng === coords[1]) {
      requestObservationRefresh();
    }
  };

  const isDev = import.meta.env.DEV;
  // Explicitly note: This trigger condition is intentionally tied to the current 
  // awareness.status values as a temporary UI implementation. It is not a permanent 
  // product rule. If new awareness.status values are introduced in the future, 
  // this condition must be re-evaluated rather than assuming APPROACHING_STATION 
  // and AT_STATION remain the only states that justify a prominent awareness overlay.
  const isTrainNearby =
    observationData?.awareness?.status === 'APPROACHING_STATION' ||
    observationData?.awareness?.status === 'AT_STATION';

  return (
    <div className="relative w-full h-screen bg-slate-50 overflow-hidden font-sans">

      {/* Background Map layer */}
      <div className="absolute inset-0 z-0">
        <LiveMap
          position={position}
          isSimulating={isSimulating}
          onMapClick={(latlng) => handleApplyCoordinates(latlng)}
          observationData={observationData}
        />
      </div>

      {/* Developer Diagnostics Panel */}
      {isDev && (
        <DeveloperDiagnosticsPanel
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
      <EmergencyMode observationData={observationData} />

      {/* Permission Denied — Full Screen Blocking Overlay */}
      {permissionStatus === 'denied' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-md p-6 text-center border-4 border-red-500">
          <MapPinOff className="w-16 h-16 text-red-600 mb-6" />
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Location Access Required</h2>
          <p className="text-slate-600 text-lg max-w-md mb-8">
            RailAware requires your location to detect nearby railway corridors and approaching trains.
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

      {/* Lightweight Loading Overlay */}
      {permissionStatus !== 'denied' && loadingStep >= 0 && !isTrainNearby && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-md pointer-events-none">
          <div className="bg-white/90 backdrop-blur-lg border border-slate-200 rounded-2xl p-4 shadow-2xl flex items-center space-x-4 transition-all duration-500 pointer-events-auto">
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
                {LOADING_STEPS[loadingStep]}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Observation & Awareness Status Panel */}
      {observationData && !isTrainNearby && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-md pointer-events-none">
          <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl p-5 shadow-2xl pointer-events-auto">

            {/* Awareness Banner */}
            <div className="p-4 rounded-xl border mb-4 flex items-center space-x-3 bg-slate-50 border-slate-200 text-slate-900">
              <div className="w-3 h-3 rounded-full flex-shrink-0 bg-blue-500" />
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wide">
                  Status: {formatStatus(observationData.awareness?.status)}
                </h3>
                <p className="text-sm mt-0.5 opacity-90">
                  {formatDistance(observationData.awareness?.distanceMetres)}
                </p>
              </div>
            </div>

            {/* Provider Status Details */}
            <div className="text-sm text-slate-600 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Track Proximity:</span>
                <span className="bg-slate-100 px-2 py-1 rounded text-xs font-semibold">
                  {observationData.corridor ? 'On Railway Corridor' : 'Clear'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-medium">Live Train Data:</span>
                <span className="text-right">
                  {observationData.metadata?.providerError ?
                    <span className="text-red-600 font-semibold bg-red-50 px-2 py-1 rounded text-xs">Currently Unavailable</span> :
                  observationData.corridor?.resolutionStatus === 'UNRESOLVED' ?
                    <span className="text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded text-xs">Topological Gap</span> :
                  observationData.trains?.length === 0 ?
                    <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded text-xs">No approaching trains identified</span> :
                  observationData.trains?.length > 0 ?
                    <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded text-xs">{observationData.trains?.length} Trains Estimated Nearby</span> :
                    <span className="text-slate-400">Loading...</span>
                  }
                </span>
              </div>

              {/* Confidence & Context */}
              <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-100">
                <h4 className="flex items-center text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  <Info className="w-3 h-3 mr-1" /> Confidence &amp; Context
                </h4>
                <div className="space-y-1 text-xs text-slate-500">
                  {observationData.corridor?.stationResolutionDetails?.status === 'RESOLVED' && (
                    <p className="text-[10px] mt-2 border-t pt-2 opacity-70">
                      Topology derived via {observationData.corridor.stationResolutionDetails.attempts?.find(a => a.success)?.strategy || 'Unknown Strategy'}
                    </p>
                  )}
                  {observationData.corridor?.stationResolutionDetails?.status === 'UNRESOLVED' && (
                    <p className="text-[10px] mt-2 border-t pt-2 text-orange-600/80">
                      Live discovery paused: Unable to resolve local topology bounding stations.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
