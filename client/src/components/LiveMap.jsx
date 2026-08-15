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

        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    }
  });
  return null;
}

export default function LiveMap({ position, isSimulating, onMapClick, observationData }) {
  const [autoFollow, setAutoFollow] = useState(true);


  const nearbyTracks = observationData?.awareness?.nearbyTracks;

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

          {/* Nearby Tracks Polylines (Phase 2 & Feature 2 Highlighting) */}
          {nearbyTracks && [...nearbyTracks].reverse().map((track, idxReverse) => {
            if (!track.geometry || track.geometry.length === 0) return null;
            // Because we reversed the array to render the nearest track last (highest z-index),
            // the original index is length - 1 - idxReverse
            const idx = nearbyTracks.length - 1 - idxReverse;
            const isNearest = idx === 0;
            return (
              <Polyline
                key={track.id || idx}
                positions={track.geometry.map(p => [p.lat, p.lng])}
                pathOptions={{
                  color: isNearest ? '#a0c4de' : '#cbd5e1',
                  weight: isNearest ? 7 : 4,
                  opacity: 1.0
                }}
              />
            );
          })}

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
