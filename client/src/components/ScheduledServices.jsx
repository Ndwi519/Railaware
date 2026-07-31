import React, { useState, useEffect } from 'react';

/**
 * ScheduledServices Component
 *
 * Fetches and displays published scheduled services for the current corridor.
 * Conceptually independent from live awareness and strictly non-authoritative.
 */
function ScheduledServices({ corridorId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [services, setServices] = useState([]);
  const [errorReason, setErrorReason] = useState(null);

  useEffect(() => {
    if (!corridorId || !isOpen) return;
    
    // Only fetch once when opened, or when corridorId changes while open
    let isCancelled = false;
    setStatus('loading');

    fetch(`/api/v1/schedule/corridor/${corridorId}`)
      .then(res => res.json())
      .then(data => {
        if (isCancelled) return;
        if (data.status === 'success') {
          setServices(data.scheduledServices || []);
          setStatus('success');
        } else {
          // Both error states and intentional empty states (no trains found, unbounded)
          // collapse into the safe empty state representation.
          setServices([]);
          setStatus('empty');
          setErrorReason(data.reason);
        }
      })
      .catch(err => {
        if (isCancelled) return;
        console.error('Failed to fetch scheduled services:', err);
        setServices([]);
        setStatus('error');
      });

    return () => {
      isCancelled = true;
    };
  }, [corridorId, isOpen]);

  if (!corridorId) {
    return null;
  }

  return (
    <div className="mt-6 border border-slate-700/50 rounded-lg overflow-hidden bg-slate-800/20">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-800/40 hover:bg-slate-700/40 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h3 className="text-sm font-semibold text-slate-300">Scheduled Services</h3>
        </div>
        <svg 
          className={`w-5 h-5 text-slate-400 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      {isOpen && (
        <div className="p-4 bg-slate-800/20 border-t border-slate-700/50">
          {status === 'loading' && (
            <div className="flex items-center justify-center p-4 text-slate-400">
              <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Checking published schedules...</span>
            </div>
          )}

          {(status === 'empty' || (status === 'success' && services.length === 0)) && (
            <div className="p-3 mb-2 rounded-md bg-slate-900/50 text-sm text-slate-400 border border-slate-800">
              <p className="font-medium text-amber-500/80 mb-1">No scheduled services found for this corridor.</p>
              <p>This does not indicate the railway is inactive or safe to cross. Unscheduled, freight, or delayed trains may pass at any time.</p>
            </div>
          )}

          {status === 'error' && (
            <div className="p-3 mb-2 rounded-md bg-slate-900/50 text-sm text-slate-400 border border-slate-800">
              <p className="font-medium text-amber-500/80 mb-1">Unable to retrieve scheduled services right now.</p>
              <p>Try again shortly.</p>
            </div>
          )}

          {status === 'success' && services.length > 0 && (
            <div className="space-y-3">
              <div className="p-2 mb-3 rounded-md bg-slate-900/50 text-xs text-slate-400 border border-slate-800">
                <p>Showing published timetables. This data is not real-time. Unscheduled traffic may still occur.</p>
              </div>
              
              {services.map((service, idx) => (
                <div key={`${service.trainNumber}-${idx}`} className="p-3 bg-slate-800/40 rounded border border-slate-700/30">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-slate-200">{service.trainNumber}</span>
                    <span className="text-xs px-2 py-1 bg-slate-900/50 rounded text-slate-400 border border-slate-700/50">Scheduled</span>
                  </div>
                  
                  <div className="text-sm text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Departure</span>
                      <span>{service.scheduledDeparture.time}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-slate-400">Arrival</span>
                      <span>{service.scheduledArrival.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ScheduledServices;
