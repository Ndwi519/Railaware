import React, { useState } from 'react';
import { Target, Search, MousePointerClick, Activity } from 'lucide-react';
import { StationSearchService } from '../services/StationSearchService';

const stationSearchService = new StationSearchService();

export default function DeveloperSimulationPanel({
  isSimulating,
  setIsSimulating,
  setSimulatedPosition,
  simulatedPosition
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const coords = await stationSearchService.search(searchQuery);
      if (coords) {
        setSimulatedPosition(coords);
        if (!isSimulating) setIsSimulating(true);
      } else {
        setSearchError('Location not found.');
      }
    } catch {
      setSearchError('Search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="absolute top-4 right-4 z-[1000] w-80 bg-white shadow-2xl rounded-xl border border-slate-200 overflow-hidden text-slate-800 font-sans">
      <div className="bg-slate-800 text-white p-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-orange-400" />
          <h3 className="font-semibold text-sm">Developer Simulation</h3>
        </div>
        <button
          onClick={() => setIsSimulating(!isSimulating)}
          className={`px-2 py-1 text-xs font-bold rounded ${isSimulating ? 'bg-orange-500 text-white' : 'bg-slate-600 text-slate-300'}`}
        >
          {isSimulating ? 'ACTIVE' : 'OFF'}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex space-x-2">
          <input
            type="text"
            placeholder="Search station, city, or lat,lng"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-slate-100 border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSearching ? <span className="animate-spin inline-block">↻</span> : <Search className="w-4 h-4" />}
          </button>
        </form>

        {searchError && (
          <p className="text-red-600 text-xs font-semibold">{searchError}</p>
        )}

        {/* Click Instruction */}
        <div className="flex items-start space-x-3 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
          <MousePointerClick className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
          <p>
            When Active, clicking anywhere on the map will override the device GPS and trigger the Observation pipeline.
          </p>
        </div>

        {/* Current State */}
        {isSimulating && simulatedPosition && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center"><Target className="w-3 h-3 mr-1" /> Spoofed GPS:</span>
            <span className="font-mono">{simulatedPosition[0].toFixed(5)}, {simulatedPosition[1].toFixed(5)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
