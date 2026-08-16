import React, { useState } from 'react';
import { Info, Menu, X, AlertTriangle, ChevronUp, ChevronDown, TrainTrack, TrainFront, Building2, TriangleAlert, Activity, ShieldCheck } from 'lucide-react';
import ScheduledServices from './ScheduledServices';

const AwarenessIcon = ({ icon: Icon, colorClass, bgClass }) => (
  <div className={`w-[32px] h-[32px] rounded-full flex items-center justify-center ${bgClass} shrink-0`}>
    <Icon className={`w-[18px] h-[18px] ${colorClass}`} aria-hidden="true" />
  </div>
);

export default function AwarenessSidebar({ observationData, isTrainNearby, isOpen, onOpenChange }) {
  const hasNearbyTracks = (observationData?.awareness?.nearbyTracks?.length ?? 0) > 0;
  const nearestTrack = observationData?.awareness?.nearbyTracks?.[0];
  const nearestStation = observationData?.awareness?.nearestStation;
  const nearestCrossing = observationData?.awareness?.nearestCrossing;

  return (
    <>
      {hasNearbyTracks && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-11/12 max-w-lg pointer-events-none">
          <div
            role="alert"
            aria-atomic="true"
            className="bg-red-100 border-l-4 border-red-500 p-3 rounded-xl flex items-start gap-3 shadow-2xl border border-red-200 pointer-events-auto"
          >
            <AlertTriangle className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-sm font-semibold text-red-700 leading-snug">
              Do not walk along tracks. If tracks are nearby, keep clear and use marked crossings only.
            </div>
          </div>
        </div>
      )}

      {observationData && !isTrainNearby && (
        <>
          {/* TABLET / DESKTOP TOGGLE BUTTON */}
          {!isOpen && (
            <button
              onClick={() => onOpenChange(true)}
              className="hidden md:block hide-on-desktop absolute top-4 left-4 z-[60] bg-white text-slate-800 p-3 rounded-xl shadow-xl border border-rail-steel"
              aria-label="Toggle Awareness Panel"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}

          {/* MOBILE COLLAPSED BOTTOM SHEET */}
          <div className={`md:hidden fixed z-[45] w-full left-0 bottom-0 transition-transform duration-300 ease-in-out pb-[env(safe-area-inset-bottom,16px)] bg-white/95 backdrop-blur-xl border-t border-rail-border shadow-[0_-8px_24px_rgba(30,55,80,0.10)] rounded-t-2xl ${isOpen ? 'translate-y-full' : 'translate-y-0'}`}>
            <button
              onClick={() => onOpenChange(true)}
              className="w-full flex flex-col items-center pt-2 pb-4 px-4 touch-manipulation"
              aria-expanded={isOpen}
              aria-label="Toggle Awareness Panel"
            >
              <div className="w-10 h-1.5 bg-slate-300 rounded-full mb-3"></div>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  {nearestTrack ? (
                    <AlertTriangle className="w-6 h-6 text-rail-amber-text" />
                  ) : (
                    <Info className="w-6 h-6 text-rail-blue" />
                  )}
                  <div className="text-left">
                    <p className="font-bold text-rail-text text-sm">
                      {nearestTrack ? 'Railway nearby' : 'No railway nearby'}
                    </p>
                    <p className="text-rail-text-secondary text-xs font-medium">
                      {nearestTrack?.crossTrackDistanceMetres != null
                        ? `Track ${Math.round(nearestTrack.crossTrackDistanceMetres)}m away`
                        : 'Distance unknown'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-rail-blue text-xs font-bold bg-rail-blue-soft px-3 py-1.5 rounded-full">
                  Details <ChevronUp className="w-4 h-4 text-rail-blue" />
                </div>
              </div>
            </button>
          </div>

          {/* MAIN PANEL (Mobile Expanded Bottom Sheet / Tablet Sidebar / Desktop Sidebar) */}
          <div
            id="awareness-main-panel"
            className={`
              fixed z-50 bg-white/95 backdrop-blur-xl transition-all duration-300 ease-in-out flex flex-col shadow-[0_8px_24px_rgba(30,55,80,0.10)]
              /* Mobile: Expanded Bottom Sheet */
              bottom-0 left-0 right-0 h-[85dvh] rounded-t-3xl border-t border-rail-border
              ${isOpen ? 'translate-y-0' : 'translate-y-full'}

              /* Tablet: Floating Sidebar */
              md:!translate-y-0 md:!bottom-auto md:!top-4 md:!h-auto
              md:absolute md:inset-y-0 md:left-4 md:w-80 md:rounded-2xl md:border md:border-rail-border
              ${isOpen ? 'md:translate-x-0' : 'md:-translate-x-[120%]'}

              /* Desktop: Always Visible Sidebar */
              lg:left-4 lg:w-[340px] lg:bottom-4 lg:translate-x-0
            `}
          >
            {/* Mobile Expanded Header */}
            <div className="md:hidden flex flex-col items-center pt-2 pb-2 px-4 border-b border-rail-divider bg-rail-panel rounded-t-3xl shrink-0">
               <button
                  onClick={() => onOpenChange(false)}
                  className="w-full flex flex-col items-center pt-1 pb-2 touch-manipulation"
                  aria-label="Close Awareness Panel"
                >
                  <div className="w-10 h-1.5 bg-slate-300 rounded-full mb-2"></div>
                  <h2 className="font-bold text-base text-rail-text">Awareness Details</h2>
               </button>
            </div>

            {/* Tablet Header */}
            <div className="hidden md:flex hide-on-desktop justify-between items-center p-4 border-b border-rail-divider bg-rail-panel rounded-t-2xl shrink-0">
              <h2 className="font-bold text-lg text-rail-text flex items-center gap-3">
                <AwarenessIcon icon={ShieldCheck} colorClass="text-rail-blue" bgClass="bg-rail-blue-soft" />
                Awareness Panel
              </h2>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 text-slate-400 hover:text-rail-text rounded-full hover:bg-slate-100 transition-colors"
                aria-label="Close Awareness Panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Desktop Header */}
            <div className="hidden show-on-desktop p-5 border-b border-rail-divider bg-rail-panel rounded-t-2xl shrink-0">
              <h2 className="font-bold text-lg text-rail-text flex items-center gap-3">
                <AwarenessIcon icon={ShieldCheck} colorClass="text-rail-blue" bgClass="bg-rail-blue-soft" />
                Awareness Panel
              </h2>
            </div>

            <div className="p-5 overflow-y-auto flex-1 pb-[calc(120px+env(safe-area-inset-bottom,16px))] md:pb-[calc(100px+env(safe-area-inset-bottom,16px))] lg:pb-[calc(env(safe-area-inset-bottom,16px)+1.25rem)]">
              <div className="space-y-6">
                {/* Corridor Details Card */}
                <div className="bg-rail-panel rounded-2xl border border-rail-border shadow-sm overflow-hidden">
                  <div className="bg-rail-panel border-b border-rail-divider p-3 sm:p-4">
                    <h3 className="font-bold text-rail-text text-xs sm:text-sm uppercase tracking-wide flex items-center gap-3">
                      <AwarenessIcon icon={TrainTrack} colorClass="text-rail-blue" bgClass="bg-rail-blue-soft" />
                      Matched Corridor
                    </h3>
                  </div>

                  {!nearestTrack ? (
                    <div className="p-4 bg-rail-panel text-rail-text-secondary text-sm italic border-b border-rail-divider">
                      No nearby railway infrastructure detected.
                    </div>
                  ) : null}

                  <div className="divide-y divide-rail-divider">
                    <div className="p-3 sm:p-4 flex justify-between items-center border-b border-rail-divider">
                      <div className="flex items-center gap-3">
                        <AwarenessIcon icon={TrainFront} colorClass="text-rail-blue" bgClass="bg-rail-blue-soft" />
                        <span className="text-xs sm:text-sm font-medium text-rail-text-secondary">Track Distance</span>
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-rail-text">
                        {nearestTrack?.crossTrackDistanceMetres != null
                          ? `${Math.round(nearestTrack.crossTrackDistanceMetres)} m`
                          : 'None in range'}
                      </span>
                    </div>

                    <div className="p-3 sm:p-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <AwarenessIcon icon={Building2} colorClass="text-rail-purple" bgClass="bg-rail-purple-soft" />
                        <span className="text-xs sm:text-sm font-medium text-rail-text-secondary">Nearest Station</span>
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-rail-text text-right truncate max-w-[150px] sm:max-w-[180px]" title={nearestStation ? nearestStation.name : 'None in range'}>
                        {nearestStation ? nearestStation.name : 'None in range'}
                      </span>
                    </div>

                    <div className="p-3 sm:p-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <AwarenessIcon icon={TriangleAlert} colorClass="text-rail-orange" bgClass="bg-rail-orange-soft" />
                        <span className="text-xs sm:text-sm font-medium text-rail-text-secondary">Nearest Crossing</span>
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-rail-text text-right">
                        {nearestCrossing?.distanceMetres != null
                          ? `${Math.round(nearestCrossing.distanceMetres)} m`
                          : 'None in range'}
                      </span>
                    </div>

                    <div className="p-3 sm:p-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <AwarenessIcon icon={Activity} colorClass="text-rail-green" bgClass="bg-rail-green-soft" />
                        <span className="text-xs sm:text-sm font-medium text-rail-text-secondary">Data Status</span>
                      </div>
                      <span className={`text-xs sm:text-sm font-bold px-2 py-1 rounded-full ${
                        observationData.dataStatus === 'DEGRADED' ? 'bg-orange-100 text-orange-800' :
                        observationData.dataStatus === 'CACHED' ? 'text-rail-text bg-slate-100' :
                        'bg-rail-green-soft text-rail-green-text'
                      }`}>
                        {observationData.dataStatus === 'DEGRADED' ? 'Unavailable' :
                         observationData.dataStatus === 'CACHED' ? 'Cached' : 'Live'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 bg-rail-amber-soft border-t border-rail-amber-border">
                    <div className="flex items-start gap-3 text-rail-amber-text">
                      <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="text-xs leading-relaxed font-medium">
                        {observationData.assistance?.guidance?.instructions?.[0] || 'No guidance available'}
                      </p>
                    </div>
                  </div>
                </div>

                <ScheduledServices corridorId={observationData.awareness?.nearbyTracks?.[0]?.id} />

                {/* Assistance SOS Button */}
                {observationData.assistance?.availableActions?.includes('DIAL_EMERGENCY') && observationData.assistance?.emergencyContact && (
                  <div className="mt-4">
                    <a
                      href={`tel:${observationData.assistance.emergencyContact.number}`}
                      className="w-full bg-red-600 hover:bg-red-500 text-white border border-red-500 font-bold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm md:text-base min-h-[48px]"
                    >
                      📞 Call {observationData.assistance.emergencyContact.description}
                    </a>
                  </div>
                )}

                {/* Transparency Statement */}
                <div className="mt-6 pt-4 border-t border-rail-divider">
                  <p className="text-xs text-rail-text-muted leading-relaxed font-medium">
                    Awareness is based on GPS location and public railway geometry. RailAware does not detect or track live trains.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tablet Backdrop (Only needed for tablet since mobile covers screen and desktop is always visible) */}
          {isOpen && (
            <div
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 hidden md:block hide-on-desktop"
              onClick={() => onOpenChange(false)}
              aria-hidden="true"
            />
          )}

          {/* Mobile Backdrop */}
          {isOpen && (
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
              onClick={() => onOpenChange(false)}
              aria-hidden="true"
            />
          )}
        </>
      )}
    </>
  );
}
