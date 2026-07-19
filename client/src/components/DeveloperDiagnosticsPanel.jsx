import React, { useState, useEffect } from 'react';
import { Settings, X, Activity, Server, MapPin } from 'lucide-react';

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

  const applyCoordinates = () => {
    const lat = Number(latInput);
    const lng = Number(lngInput);
    console.log("[Apply Button]", lat, lng);

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

  if (import.meta.env.PROD) return null; // Ensure this never renders in production

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="absolute top-4 right-4 z-50 bg-slate-900/90 text-white p-2.5 rounded-xl shadow-lg hover:bg-slate-800 backdrop-blur transition-all"
        title="Developer Diagnostics"
      >
        <Settings className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 shadow-2xl z-[100] text-slate-300 font-mono text-xs overflow-y-auto flex flex-col">
          <div className="p-4 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-900/95 backdrop-blur z-10">
            <h2 className="text-white font-bold text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Diagnostics Panel
            </h2>
            <button onClick={() => setIsOpen(false)} className="hover:text-white p-1">
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
                      status: observationData.corridor?.resolutionStatus,
                      trackPresence: !!observationData.corridor,
                      stations: observationData.corridor?.nearestBoundingStations,
                      fraction: observationData.corridor?.userSegmentFraction?.toFixed(4)
                    }, null, 2)}
                  </pre>
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
                    {observationData.metadata?.diagnostics ? (
                      <>
                        <div><strong className="text-purple-400">Station Resolution:</strong> {observationData.metadata.diagnostics.stationResolution?.status || 'Unknown'}</div>
                        <ul className="list-disc pl-4 text-[10px] text-slate-400 mb-2">
                          {observationData.metadata.diagnostics.stationResolution?.attempts?.map((attempt, i) => (
                             <li key={i}>{attempt.strategy}: {attempt.reason}</li>
                          ))}
                        </ul>
                        
                        <div><strong className="text-purple-400">Train Resolution:</strong> {observationData.metadata.diagnostics.trainResolution || 'Unknown'}</div>
                        
                        <div><strong className="text-purple-400">Risk Reasons:</strong></div>
                        <ul className="list-disc pl-4 text-[10px] text-slate-400 mb-2">
                          {observationData.metadata.diagnostics.riskReasons?.map((reason, i) => (
                             <li key={i}>{reason}</li>
                          ))}
                        </ul>

                        <div><strong className="text-purple-400">Provider Requests:</strong></div>
                        <div className="space-y-1">
                          {(!observationData.metadata.diagnostics.providerRequests || observationData.metadata.diagnostics.providerRequests.length === 0) ? <span className="text-[10px] text-slate-500">None</span> : null}
                          {observationData.metadata.diagnostics.providerRequests?.map((req, i) => (
                             <div key={i} className="text-[10px] text-slate-400 border border-slate-800 p-1 rounded">
                               <div><span className="font-bold text-slate-300">Endpoint:</span> {req.endpoint}</div>
                               <div><span className="font-bold text-slate-300">Status:</span> {req.status}</div>
                               <div><span className="font-bold text-slate-300">Summary:</span> {req.responseSummary}</div>
                             </div>
                          ))}
                        </div>
                        <div><strong className="text-purple-400">Execution Trace:</strong></div>
                        <div className="space-y-1">
                          {(!observationData.metadata.executionTrace?.stages || observationData.metadata.executionTrace.stages.length === 0) ? <span className="text-[10px] text-slate-500">None</span> : null}
                          {observationData.metadata.executionTrace?.stages?.map((stage, i) => (
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
