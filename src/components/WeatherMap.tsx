import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface WeatherMapProps {
  locationQuery: string;
}

// A simple component to update map view dynamically
const MapUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// Custom premium marker icon
const customIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const getMockCoordinates = (query: string): [number, number] => {
  const q = query.toLowerCase();
  if (q.includes('milan')) return [45.4642, 9.1900];
  if (q.includes('roma') || q.includes('rome')) return [41.9028, 12.4964];
  if (q.includes('napol')) return [40.8518, 14.2681];
  if (q.includes('torin')) return [45.0703, 7.6869];
  if (q.includes('firenze') || q.includes('florence')) return [43.7696, 11.2558];
  if (q.includes('venezia') || q.includes('venice')) return [45.4408, 12.3155];
  if (q.includes('palermo')) return [38.1157, 13.3615];
  if (q.includes('bologna')) return [44.4949, 11.3426];
  
  // Default center (Italy) for unknown locations
  return [41.8719, 12.5674];
};

const WeatherMap: React.FC<WeatherMapProps> = ({ locationQuery }) => {
  const [center, setCenter] = useState<[number, number]>([41.8719, 12.5674]);
  const [zoom, setZoom] = useState(6);

  useEffect(() => {
    if (locationQuery) {
      const coords = getMockCoordinates(locationQuery);
      setCenter(coords);
      setZoom(coords[0] === 41.8719 && coords[1] === 12.5674 ? 6 : 10);
    }
  }, [locationQuery]);

  return (
    <div style={styles.mapWrapper} className="glass-panel">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}
        zoomControl={true}
      >
        <MapUpdater center={center} zoom={zoom} />
        {/* Using a dark themed tile layer for premium aesthetics */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
        />
        <Marker position={center} icon={customIcon}>
          <Popup>
            <div style={{ textAlign: 'center' }}>
              <strong style={{ fontSize: '1.2rem', color: '#1a1b26' }}>{locationQuery || 'Italia'}</strong><br/>
              <span style={{ color: '#1a1b26', fontWeight: 'bold' }}>Media: 22°C</span><br/>
              Soleggiato
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

const styles = {
  mapWrapper: {
    height: '600px',
    width: '100%',
    position: 'relative' as const,
    zIndex: 1,
    overflow: 'hidden',
  }
};

export default WeatherMap;
