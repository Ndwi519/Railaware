import React, { useState, useEffect } from 'react';
import { X, Activity, Server, MapPin, Info } from 'lucide-react';

export default function DeveloperDiagnosticsPanel({
  isSimulating,
  setIsSimulating,
  simulatedPosition,
  observationData,
  observationStatus,
  onApplyCoordinates,
  onRefresh,
  isOpen: propsIsOpen,
  setIsOpen: propsSetIsOpen
}) {
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isOpen = propsIsOpen !== undefined ? propsIsOpen : localIsOpen;
  const setIsOpen = propsSetIsOpen !== undefined ? propsSetIsOpen : setLocalIsOpen;
  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (simulatedPosition) {
      setLatInput(simulatedPosition[0].toString());
      setLngInput(simulatedPosition[1].toString());
    }
  }, [simulatedPosition]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Ctrl + Alt + D to toggle Developer Diagnostics
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [setIsOpen]);

  const applyCoordinates = () => {
    const lat = Number(latInput);
    const lng = Number(lngInput);


    if (latInput.trim() === '' || lngInput.trim() === '') {
      setValidationError("Coordinates cannot be empty.");
      return;
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setValidationError("Coordinates must be valid numbers.");
      return;
    }

    if (lat < -90 || lat > 90) {
      setValidationError("Latitude must be between -90 and 90.");
      return;
    }

    if (lng < -180 || lng > 180) {
      setValidationError("Longitude must be between -180 and 180.");
      return;
    }

    if (simulatedPosition && simulatedPosition[0] === lat && simulatedPosition[1] === lng) {
      // Identical coordinates applied
    }

    setValidationError("");
    if (onApplyCoordinates) {
      onApplyCoordinates([lat, lng]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      applyCoordinates();
    }
  };


  return (
    <>      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 shadow-2xl z-[100] text-slate-300 font-mono text-xs overflow-y-auto flex flex-col">
          <div className="p-4 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-900/95 backdrop-blur z-10">
            <h2 className="text-white font-bold text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Diagnostics Panel
            </h2>
            <button onClick={() => setIsOpen(false)} className="hover:text-white p-1" aria-label="Close Diagnostics Panel">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-6">
            {/* Simulation Controls */}
            <div className="space-y-3">
              <h3 className="text-emerald-400 font-semibold uppercase tracking-wider text-[10px]">Simulation</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSimulating(!isSimulating)}
                  className={`flex-1 py-2 rounded font-bold transition-colors ${
                    isSimulating ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                  }`}
                >
                  {isSimulating ? 'SIMULATION ACTIVE' : 'ENABLE SIMULATION'}
                </button>
              </div>
              {isSimulating && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-3">
                  <p className="text-slate-500 text-xs">Click map or enter GPS coordinates manually</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Latitude"
                      className="w-full bg-slate-900 border border-slate-700 p-1.5 rounded text-slate-300"
                      value={latInput}
                      onKeyDown={handleKeyDown}
                      onChange={(e) => {
                        setLatInput(e.target.value);
                        if (validationError) setValidationError("");
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Longitude"
                      className="w-full bg-slate-900 border border-slate-700 p-1.5 rounded text-slate-300"
                      value={lngInput}
                      onKeyDown={handleKeyDown}
                      onChange={(e) => {
                        setLngInput(e.target.value);
                        if (validationError) setValidationError("");
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={applyCoordinates}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 p-1.5 rounded text-xs font-bold transition-colors"
                    >
                      APPLY COORDINATES
                    </button>
                    <button
                      onClick={() => onRefresh && onRefresh()}
                      className="bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 p-1.5 rounded text-xs font-bold transition-colors"
                      title="Force Refresh Observation"
                    >
                      REFRESH
                    </button>
                  </div>
                  {validationError && (
                    <div className="text-red-400 text-xs px-1 font-semibold">{validationError}</div>
                  )}
                  <div className="flex items-center gap-2 text-slate-300 text-xs">
                    <MapPin className="w-3 h-3 text-emerald-500" />
                    {simulatedPosition ? `${simulatedPosition[0].toFixed(5)}, ${simulatedPosition[1].toFixed(5)}` : 'Waiting for input...'}
                  </div>
                </div>
              )}
            </div>

            {/* Observation Pipeline Data */}
            {observationData && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-emerald-400 font-semibold uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1">
                    <Server className="w-3 h-3" /> State Machine
                  </h3>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800 text-emerald-300">
                    Phase: {observationStatus?.toUpperCase() || 'UNAVAILABLE'}
                  </div>
                </div>

                <div>
                  <h3 className="text-emerald-400 font-semibold uppercase tracking-wider text-[10px] mb-2">Corridor Resolver</h3>
                  <pre className="bg-slate-950 p-2 rounded border border-slate-800 overflow-x-auto">
                    {JSON.stringify({
                      status: observationData.discoveryContext?.corridor?.resolutionStatus,
                      trackPresence: !!observationData.discoveryContext?.corridor,
                      stations: observationData.discoveryContext?.corridor?.nearestBoundingStations,
                      fraction: observationData.discoveryContext?.corridor?.userSegmentFraction?.toFixed(4)
                    }, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="text-emerald-400 font-semibold uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Confidence & Context
                  </h3>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800 text-slate-300">
                    <p className="text-[10px] text-slate-400 mb-3 border-b border-slate-800 pb-2 italic">
                      These signals are intentionally unassessed in the current version — see the project's documented decision not to synthesize a misleading combined confidence score.
                    </p>
                    {/* Confidence Badges */}
                    <div className="grid grid-cols-1 gap-2 mb-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-400">Observation</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          observationData.confidence?.observationConfidence === 'HIGH' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' :
                          observationData.confidence?.observationConfidence === 'MEDIUM' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-800' :
                          observationData.confidence?.observationConfidence === 'LOW' ? 'bg-red-900/50 text-red-400 border border-red-800' :
                          observationData.confidence?.observationConfidence === 'UNKNOWN' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                          'bg-slate-800 text-slate-500 border border-slate-700' // UNASSESSED
                        }`}>
                          {observationData.confidence?.observationConfidence || 'UNASSESSED'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-400">Provider</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          observationData.confidence?.providerReliability === 'HIGH' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' :
                          observationData.confidence?.providerReliability === 'MEDIUM' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-800' :
                          observationData.confidence?.providerReliability === 'LOW' ? 'bg-red-900/50 text-red-400 border border-red-800' :
                          observationData.confidence?.providerReliability === 'UNKNOWN' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                          'bg-slate-800 text-slate-500 border border-slate-700' // UNASSESSED
                        }`}>
                          {observationData.confidence?.providerReliability || 'UNASSESSED'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-400">Topology</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          observationData.confidence?.topologyConfidence === 'HIGH' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' :
                          observationData.confidence?.topologyConfidence === 'MEDIUM' ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-800' :
                          observationData.confidence?.topologyConfidence === 'LOW' ? 'bg-red-900/50 text-red-400 border border-red-800' :
                          observationData.confidence?.topologyConfidence === 'UNKNOWN' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                          'bg-slate-800 text-slate-500 border border-slate-700' // UNASSESSED
                        }`}>
                          {observationData.confidence?.topologyConfidence || 'UNASSESSED'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-400">
                      {observationData.discoveryContext?.corridor?.stationResolutionDetails?.status === 'RESOLVED' && (
                        <p className="text-[10px] mt-2 border-t border-slate-800 pt-2">
                          Topology derived via {observationData.discoveryContext.corridor.stationResolutionDetails.attempts?.find(a => a.success)?.strategy || 'Unknown Strategy'}
                        </p>
                      )}
                      {observationData.discoveryContext?.corridor?.stationResolutionDetails?.status === 'UNRESOLVED' && (
                        <p className="text-[10px] mt-2 border-t border-slate-800 pt-2 text-orange-400">
                          Live discovery paused: Unable to resolve local topology bounding stations.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-emerald-400 font-semibold uppercase tracking-wider text-[10px] mb-2">Awareness Pipeline</h3>
                  <pre className="bg-slate-950 p-2 rounded border border-slate-800 overflow-x-auto">
                    {JSON.stringify(observationData.awareness, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="text-emerald-400 font-semibold uppercase tracking-wider text-[10px] mb-2">Provider Diagnostics</h3>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800 overflow-x-auto text-purple-300 space-y-2">
                    {observationData.discoveryContext ? (
                      <>
                        <div><strong className="text-purple-400">Station Resolution:</strong> {observationData.discoveryContext.corridor?.stationResolutionDetails?.status || 'Unknown'}</div>
                        <ul className="list-disc pl-4 text-[10px] text-slate-400 mb-2">
                          {observationData.discoveryContext.corridor?.stationResolutionDetails?.attempts?.map((attempt, i) => (
                             <li key={i}>{attempt.strategy}: {attempt.reason}</li>
                          ))}
                        </ul>

                        <div><strong className="text-purple-400">Train Resolution:</strong> {observationData.discoveryContext.strategyDiagnostics?.[0]?.status || 'Unknown'}</div>

                        <div><strong className="text-purple-400">Execution Trace:</strong></div>
                        <div className="space-y-1">
                          {(!observationData.discoveryContext.trace?.stages || observationData.discoveryContext.trace.stages.length === 0) ? <span className="text-[10px] text-slate-500">None</span> : null}
                          {observationData.discoveryContext.trace?.stages?.map((stage, i) => (
                             <div key={i} className="text-[10px] text-slate-400 border border-slate-800 p-1 rounded">
                               <div className="flex justify-between"><strong className="text-slate-300">{stage.stage}</strong> <span>{stage.elapsedTimeMs}ms</span></div>
                               <div><span className="font-bold text-slate-300">Status:</span> {stage.status}</div>
                               <div><span className="font-bold text-slate-300">Decision:</span> {stage.decision}</div>
                               <div><span className="font-bold text-slate-300">Reason:</span> {stage.reason}</div>
                             </div>
                          ))}
                        </div>
                      </>
                    ) : (
                       <span className="text-slate-500 text-xs">No diagnostics available.</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!observationData && (
              <div className="text-slate-500 italic text-center py-4">Waiting for observation data...</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
