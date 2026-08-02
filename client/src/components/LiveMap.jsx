import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const trainIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const snappedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const defaultCenter = [28.6139, 77.2090]; // NDLS fallback

// Helper component to recenter map when position changes (unless user panned)
function Recenter({ position, autoFollow }) {
  const map = useMap();
  useEffect(() => {
    if (position && autoFollow) {
      map.setView(position, map.getZoom() > 17 ? map.getZoom() : 18, { animate: false });
    }
  }, [position, map, autoFollow]);
  return null;
}


/**
 * MapResizer listens for changes in the MapContainer's element size (via ResizeObserver)
 * and triggers Leaflet to update its internal cache dimensions using invalidateSize({ pan: false }).
 * 
 * To preserve the current viewport instead of snapping to the tracked GPS marker,
 * we capture the current geographic center (where the user has manually panned or zoomed)
 * BEFORE Leaflet invalidates its cache, and then explicitly call setView() to restore that
 * exact geographic center to the visual center of the newly-resized map viewport.
 * This ensures that manual panning continues to work and the map remains stable during transitions.
 */
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();

    const resizeObserver = new ResizeObserver(() => {
      const center = map.getCenter();
      map.invalidateSize({ pan: false });
      map.setView(center, map.getZoom(), { animate: false });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [map]);
  return null;
}


// Track if user intentionally panned
function MapInteractions({ setAutoFollow, isSimulating, onMapClick }) {
  useMapEvents({
    dragstart() {
      setAutoFollow(false);
    },
    click(e) {
      if (isSimulating && onMapClick) {
        console.log("[Map Click]", e.latlng.lat, e.latlng.lng);
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    }
  });
  return null;
}

export default function LiveMap({ position, isSimulating, onMapClick, observationData, isDiagnosticsOpen }) {
  const [autoFollow, setAutoFollow] = useState(true);

  const corridor = observationData?.discoveryContext?.corridor;
  const trains = observationData?.discoveryContext?.discoveredTrains;
  const nearbyTracks = observationData?.awareness?.nearbyTracks;

  // Extract snapped point if available
  // The corridor resolver should ideally return the snapped coordinate.
  // We assume the first point of the corridor geometry is closest, or there's a closestPoint field.
  const snappedPoint = corridor?.closestPoint ? [corridor.closestPoint.lat, corridor.closestPoint.lng] : null;

  return (
    <div className="relative h-full w-full">
      <div className="relative h-full w-full">
        <MapContainer
          center={position || defaultCenter}
          zoom={18}
          maxZoom={19}
          className="w-full h-full"
          style={{ zIndex: 0 }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            maxZoom={19}
          />
          <Recenter position={position} autoFollow={autoFollow} />
          <MapResizer />
          <MapInteractions setAutoFollow={setAutoFollow} isSimulating={isSimulating} onMapClick={onMapClick} />

          {/* Railway Corridor Polyline (Legacy) */}
          {corridor?.corridorGeometry && (
            <Polyline
              positions={corridor.corridorGeometry.map(p => [p.lat, p.lng])}
              pathOptions={{ color: '#0f172a', weight: 6, opacity: 0.6 }}
            />
          )}

          {/* Nearby Tracks Polylines (Phase 2) */}
          {nearbyTracks?.map((track, idx) => {
            if (!track.geometry || track.geometry.length === 0) return null;
            return (
              <Polyline
                key={track.id || idx}
                positions={track.geometry.map(p => [p.lat, p.lng])}
                pathOptions={{ color: '#0f172a', weight: 6, opacity: 0.6 }}
              />
            );
          })}

          {/* Dashed line snapping user to track */}
          {position && snappedPoint && (
            <Polyline
              positions={[position, snappedPoint]}
              pathOptions={{ color: '#2563eb', weight: 2, dashArray: '5, 10', opacity: 0.8 }}
            />
          )}

          {/* Snapped User Position on Track */}
          {snappedPoint && (
            <Marker position={snappedPoint} icon={snappedIcon}>
              <Popup>Projected Railway Position</Popup>
            </Marker>
          )}

          {/* Raw GPS Position & Track Distance Ring */}
          {position && (
            <>
              {observationData?.awareness?.distanceMetres != null && (
                <Circle 
                  center={position} 
                  radius={observationData.awareness.distanceMetres} 
                  pathOptions={{ color: '#f59e0b', fillOpacity: 0.05, weight: 1, dashArray: '4, 8' }} 
                />
              )}
              <Circle center={position} radius={25} pathOptions={{ color: '#3b82f6', fillOpacity: 0.2, weight: 1, stroke: false }} />
              <Marker position={position} icon={userIcon}>
                <Popup>{isSimulating ? 'Spoofed GPS Location' : 'Raw GPS Location'}</Popup>
              </Marker>
            </>
          )}

          {/* Estimated Train Positions */}
          {Array.isArray(trains) && trains.map((train, index) => {
            if (!train.estimatedTrainCoordinate) return null;
            return (
              <Marker
                key={train.trainNumber || train.id || index}
                position={[train.estimatedTrainCoordinate.lat, train.estimatedTrainCoordinate.lng]}
                icon={trainIcon}
              >
                <Popup>
                  <div className="text-center w-48">
                    <div className="font-bold text-red-700 text-sm">Train {train.name || train.id}</div>

                    <div className="mt-1 text-xs text-slate-700 font-medium border-b pb-1">
                      {train.approaching ? (
                        train.previousStation ? `Approaching from ${train.previousStation}` : 'Approaching your location'
                      ) : (
                        train.nextStation ? `Moving away toward ${train.nextStation}` : 'Passed your location'
                      )}
                    </div>



                    <div className="mt-2 text-[10px] text-orange-600 bg-orange-50 rounded px-1 py-0.5 inline-block">
                      Estimated Position
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        </MapContainer>

        {/* Center on Me Button */}
        {!autoFollow && position && (
          <button
            onClick={() => setAutoFollow(true)}
            className="absolute bottom-32 right-4 z-40 bg-white text-slate-800 p-3 rounded-full shadow-xl font-bold text-sm border border-slate-200 hover:bg-slate-50 transition-all"
          >
            Center on Me
          </button>
        )}
      </div>
    </div>
  );
}
