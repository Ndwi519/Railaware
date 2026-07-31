import React, { useState } from 'react';
import { Info, Menu, X } from 'lucide-react';
import { formatStatus, formatDistance } from '../utils/awarenessFormatters';

export default function AwarenessSidebar({ observationData, isTrainNearby }) {
  const [isOpen, setIsOpen] = useState(false);

  // Match the original rendering condition for the panel's structure:
  // Show sidebar structure only if there is observationData and no train nearby
  if (!observationData || isTrainNearby) return null;

  return (
    <>
      {/* Mobile/Tablet Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden absolute top-4 left-4 z-[60] bg-white text-slate-800 p-3 rounded-xl shadow-xl border border-slate-200"
        aria-label="Toggle Awareness Panel"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar Container */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-full sm:w-80 lg:w-[340px]
          bg-white/95 lg:bg-white/100 backdrop-blur-xl lg:backdrop-blur-none
          border-r border-slate-200 shadow-2xl lg:shadow-none
          transition-transform duration-300 ease-in-out
          flex flex-col flex-shrink-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Mobile Header */}
        <div className="lg:hidden flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-lg text-slate-800">Awareness Panel</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-200 transition-colors"
            aria-label="Close Awareness Panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block p-5 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-lg text-slate-800">Awareness Panel</h2>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Awareness Banner */}
            <div className="p-4 rounded-xl border flex items-center space-x-3 bg-slate-50 border-slate-200 text-slate-900">
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
                  {observationData.discoveryContext?.corridor ? 'On Railway Corridor' : 'Not yet determined'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-medium">Nearest Crossing:</span>
                <span className="bg-slate-100 px-2 py-1 rounded text-xs font-semibold text-right">
                  {observationData.awareness?.nearestCrossing 
                    ? formatDistance(observationData.awareness.nearestCrossing.distanceMetres)
                    : 'No known crossing found nearby'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-medium">Live Train Data:</span>
                <span className="text-right flex flex-col items-end">
                  {observationData.discoveryContext?.providerError ?
                    <span className="text-red-600 font-semibold bg-red-50 px-2 py-1 rounded text-xs">Currently Unavailable</span> :
                  observationData.discoveryContext?.corridor?.resolutionStatus === 'UNRESOLVED' ?
                    <span className="text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded text-xs">Topological Gap</span> :
                  observationData.discoveryContext?.discoveredTrains === null ?
                    <span className="text-slate-500 font-semibold bg-slate-100 px-2 py-1 rounded text-xs">Train discovery not performed</span> :
                  observationData.discoveryContext?.discoveredTrains?.length === 0 ?
                    <span className="text-slate-700 font-semibold bg-slate-100 px-2 py-1 rounded text-xs">No approaching trains identified</span> :
                  observationData.discoveryContext?.discoveredTrains?.length > 0 ?
                    <span className="text-slate-700 font-semibold bg-slate-100 px-2 py-1 rounded text-xs">{observationData.discoveryContext?.discoveredTrains?.length} Trains Estimated Nearby</span> :
                    <span className="text-slate-400">Loading...</span>
                  }
                </span>
              </div>

              {/* Assistance Guidance */}
              {observationData.assistance?.guidance && (
                <div className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <h4 className="flex items-center text-sm font-bold text-blue-800 mb-2">
                    {observationData.assistance.guidance.title}
                  </h4>
                  <div className="space-y-1 text-sm text-blue-900">
                    {observationData.assistance.guidance.instructions.map((instruction, idx) => (
                      <p key={idx}>{instruction}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Assistance SOS Button */}
              {observationData.assistance?.availableActions?.includes('DIAL_EMERGENCY') && observationData.assistance?.emergencyContact && (
                <div className="mt-4">
                  <a
                    href={`tel:${observationData.assistance.emergencyContact.number}`}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    📞 Call {observationData.assistance.emergencyContact.description}
                  </a>
                </div>
              )}

              {/* Confidence & Context */}
              <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-100">
                <h4 className="flex items-center text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  <Info className="w-3 h-3 mr-1" /> Confidence &amp; Context
                </h4>

                {/* Confidence Badges */}
                <div className="grid grid-cols-1 gap-2 mb-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-600">Observation</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      observationData.confidence?.observationConfidence === 'HIGH' ? 'bg-green-100 text-green-700' :
                      observationData.confidence?.observationConfidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                      observationData.confidence?.observationConfidence === 'LOW' ? 'bg-red-100 text-red-700' :
                      observationData.confidence?.observationConfidence === 'UNKNOWN' ? 'bg-slate-200 text-slate-600' :
                      'bg-gray-100 text-gray-500' // UNASSESSED
                    }`}>
                      {observationData.confidence?.observationConfidence || 'UNASSESSED'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-600">Provider</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      observationData.confidence?.providerReliability === 'HIGH' ? 'bg-green-100 text-green-700' :
                      observationData.confidence?.providerReliability === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                      observationData.confidence?.providerReliability === 'LOW' ? 'bg-red-100 text-red-700' :
                      observationData.confidence?.providerReliability === 'UNKNOWN' ? 'bg-slate-200 text-slate-600' :
                      'bg-gray-100 text-gray-500' // UNASSESSED
                    }`}>
                      {observationData.confidence?.providerReliability || 'UNASSESSED'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-600">Topology</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      observationData.confidence?.topologyConfidence === 'HIGH' ? 'bg-green-100 text-green-700' :
                      observationData.confidence?.topologyConfidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                      observationData.confidence?.topologyConfidence === 'LOW' ? 'bg-red-100 text-red-700' :
                      observationData.confidence?.topologyConfidence === 'UNKNOWN' ? 'bg-slate-200 text-slate-600' :
                      'bg-gray-100 text-gray-500' // UNASSESSED
                    }`}>
                      {observationData.confidence?.topologyConfidence || 'UNASSESSED'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-500">
                  {observationData.discoveryContext?.corridor?.stationResolutionDetails?.status === 'RESOLVED' && (
                    <p className="text-[10px] mt-2 border-t pt-2 opacity-70">
                      Topology derived via {observationData.discoveryContext.corridor.stationResolutionDetails.attempts?.find(a => a.success)?.strategy || 'Unknown Strategy'}
                    </p>
                  )}
                  {observationData.discoveryContext?.corridor?.stationResolutionDetails?.status === 'UNRESOLVED' && (
                    <p className="text-[10px] mt-2 border-t pt-2 text-orange-600/80">
                      Live discovery paused: Unable to resolve local topology bounding stations.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
