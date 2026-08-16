import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, AlertCircle, Info, Clock } from 'lucide-react';

/**
 * ScheduledServices Component
 *
 * Fetches and displays published scheduled services for the current corridor.
 * Conceptually independent from live awareness and strictly non-authoritative.
 *
 * Architectural Decision: corridorId Naming
 * The 'corridorId' prop technically receives a topological branch identifier
 * (e.g., from nearbyTracks[0].id). Renaming this to 'branchId' consistently
 * across the frontend components, hooks, and backend API endpoints
 * (/api/v1/schedule/corridor/:id) has been explicitly deferred to prevent
 * scope creep in this UI polish pass.
 */
function ScheduledServices({ corridorId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, loading, success, error, empty
  const [services, setServices] = useState([]);

  useEffect(() => {
    if (!corridorId) {
      setStatus('idle');
      setServices([]);
      return;
    }

    // Fetch immediately when corridorId changes to determine card visibility
    const controller = new AbortController();
    setStatus('loading');

    const API_BASE_URL =
      import.meta.env.VITE_API_URL || '';

    fetch(`${API_BASE_URL}/api/v1/schedule/corridor/${corridorId}`, {
      signal: controller.signal
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.scheduledServices && data.scheduledServices.length > 0) {
          setServices(data.scheduledServices);
          setStatus('success');
        } else {
          setServices([]);
          setStatus('empty');
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.error('Failed to fetch scheduled services:', err);
        setServices([]);
        setStatus('error');
      });

    return () => {
      controller.abort();
    };
  }, [corridorId]);

  if (!corridorId || status === 'idle' || status === 'empty' || status === 'error') {
    return null;
  }

  return (
    <div className="mt-6 bg-rail-panel rounded-2xl border border-rail-border shadow-sm overflow-hidden flex flex-col">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 sm:p-4 bg-rail-panel-soft hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rail-blue shrink-0"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-rail-blue" aria-hidden="true" />
          <h3 className="font-bold text-rail-text text-xs sm:text-sm uppercase tracking-wide">
            Scheduled Services
          </h3>
        </div>
        {status === 'loading' ? (
          <div className="animate-spin h-5 w-5 border-2 border-rail-divider border-t-rail-blue rounded-full"></div>
        ) : isOpen ? (
          <ChevronUp className="w-5 h-5 text-rail-text-secondary" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-5 h-5 text-rail-text-secondary" aria-hidden="true" />
        )}
      </button>

      {isOpen && status === 'success' && (
        <div className="bg-rail-panel border-t border-rail-divider flex flex-col max-h-[300px]">
          <div className="px-4 py-3 bg-rail-panel-soft flex items-start gap-2 border-b border-rail-divider shrink-0">
            <Info className="w-4 h-4 text-rail-blue flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[11px] sm:text-xs font-bold text-rail-text-secondary uppercase tracking-wide">
              Published Timetable &middot; Not Real-Time
            </p>
          </div>

          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header Row */}
            <div className="grid grid-cols-3 px-4 py-2 bg-rail-panel-soft text-[10px] sm:text-xs font-bold text-rail-text-secondary uppercase tracking-wider shrink-0">
              <div>Train Number</div>
              <div className="text-right flex justify-end items-center gap-1"><Clock className="w-3 h-3" /> Departure</div>
              <div className="text-right flex justify-end items-center gap-1"><Clock className="w-3 h-3" /> Arrival</div>
            </div>

            {/* Scrollable List */}
            <div className="divide-y divide-rail-divider overflow-y-auto overscroll-contain">
              {services.map((service, idx) => (
                <div key={`${service.trainNumber}-${idx}`} className="grid grid-cols-3 px-4 py-3.5 items-center hover:bg-slate-50 transition-colors">
                  <div className="font-bold text-rail-text text-sm sm:text-base">{service.trainNumber}</div>
                  <div className="text-right text-sm sm:text-base text-rail-text-secondary font-medium">{service.scheduledDeparture.time}</div>
                  <div className="text-right text-sm sm:text-base text-rail-text-secondary font-medium">{service.scheduledArrival.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduledServices;
