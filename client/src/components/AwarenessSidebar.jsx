import React, { useState } from 'react';
import { Info, Menu, X, AlertTriangle } from 'lucide-react';
import { formatStatus, formatDistance } from '../utils/awarenessFormatters';
import ScheduledServices from './ScheduledServices';

export default function AwarenessSidebar({ observationData, isTrainNearby }) {
  const [isOpen, setIsOpen] = useState(false);

  // Match the original rendering condition for the panel's structure:
  // Show sidebar structure only if there is observationData and no train nearby
  if (!observationData || isTrainNearby) return null;

  const nearestTrack = observationData.awareness?.nearbyTracks?.[0];
  const nearestStation = observationData.awareness?.nearestStation;
  const nearestCrossing = observationData.awareness?.nearestCrossing;

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

      {/* ALWAYS VISIBLE SAFETY STRIP - displayed whenever nearby railway infrastructure exists, no click required */}
      {observationData.awareness?.status === 'TRACKS_NEARBY' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-11/12 max-w-lg pointer-events-none">
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-xl flex items-start gap-3 shadow-2xl border border-red-100 pointer-events-auto">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm font-semibold text-red-900 leading-snug">
              Do not walk along tracks. If tracks are nearby, keep clear and use marked crossings only.
            </div>
          </div>
        </div>
      )}

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
            {/* Corridor Details Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 p-4">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                  Matched Corridor
                </h3>
              </div>
              
              {!nearestTrack ? (
                <div className="p-4 bg-slate-50 text-slate-600 text-sm italic border-b border-slate-100">
                  No nearby railway infrastructure detected.
                </div>
              ) : null}

              <div className="divide-y divide-slate-100">
                <div className="p-4 flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Nearest Track Distance</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {nearestTrack?.crossTrackDistanceMetres != null 
                      ? `${Math.round(nearestTrack.crossTrackDistanceMetres)} m`
                      : 'Unknown'}
                  </span>
                </div>
                
                <div className="p-4 flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Track Side</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {nearestTrack?.side || 'Unknown'}
                  </span>
                </div>

                <div className="p-4 flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Nearest Station</span>
                  <span className="text-sm font-semibold text-slate-900 text-right">
                    {nearestStation ? nearestStation.name : 'Unknown'}
                  </span>
                </div>

                <div className="p-4 flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Nearest Crossing</span>
                  <span className="text-sm font-semibold text-slate-900 text-right">
                    {nearestCrossing ? `${Math.round(nearestCrossing.distanceMetres)} m` : 'Unknown'}
                  </span>
                </div>

                <div className="p-4 flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Offline Status</span>
                  <span className="text-sm font-semibold text-slate-900 text-right">
                    {observationData._isCached ? 'Cached' : 'Live'}
                  </span>
                </div>
              </div>
              
              <div className="p-4 bg-slate-50 border-t border-slate-200">
                <div className="flex items-start gap-3 text-slate-600">
                  <Info className="w-5 h-5 flex-shrink-0 text-slate-400 mt-0.5" />
                  <p className="text-xs leading-relaxed">
                    {observationData.assistance?.guidance?.instructions?.[0] || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            <ScheduledServices corridorId={observationData.discoveryContext?.corridor?.id || observationData.awareness?.nearbyTracks?.[0]?.id} />

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
