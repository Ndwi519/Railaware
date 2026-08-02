import React, { useState } from 'react';
import { Info, Menu, X, AlertTriangle } from 'lucide-react';
import { formatStatus, formatDistance } from '../utils/awarenessFormatters';
import ScheduledServices from './ScheduledServices';

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

        {/* Offline Cache Warning Banner */}
        {observationData._isCached && (
          <div className="bg-amber-100 border-l-4 border-amber-500 p-3 flex flex-col justify-center shadow-inner">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900 leading-tight">
                <span className="font-bold block mb-1">You appear to be offline.</span>
                Showing last known data from {Math.round((Date.now() - observationData._cachedAt) / 60000)} minutes ago. This may be outdated.
              </div>
            </div>
          </div>
        )}

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

            {observationData.awareness?.status === 'TRACKS_NEARBY' && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-xl flex items-start gap-3 shadow-sm border border-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm font-semibold text-red-900 leading-snug">
                  Do not walk along tracks. If tracks are nearby, keep clear and use marked crossings only.
                </div>
              </div>
            )}

            <ScheduledServices corridorId={observationData.discoveryContext?.corridor?.id || observationData.nearbyTracks?.[0]?.id} />

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
