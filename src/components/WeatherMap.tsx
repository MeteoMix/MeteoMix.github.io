import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Cloud, Sun, CloudRain, Navigation, Layers, Wind, Droplets, ThermometerSun } from 'lucide-react';
import './WeatherMap.css';

interface WeatherMapProps {
  locationQuery: string;
  lat?: number;
  lon?: number;
  avgTemp?: number;
  currentCondition?: string;
  extraData?: {
    windSpeed: number | string;
    humidity: number | string;
    precipitation: number | string;
    high: number | string;
    low: number | string;
  };
}

const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  const firstLoad = useRef(true);

  useEffect(() => {
    if (firstLoad.current) {
      map.setView(center, 6);
      setTimeout(() => {
        map.flyTo(center, zoom, { duration: 3, easeLinearity: 0.1 });
      }, 500);
      firstLoad.current = false;
    } else {
      map.flyTo(center, zoom, { duration: 2 });
    }
  }, [center, zoom, map]);

  return null;
};

const neonPulseIcon = new L.DivIcon({
  className: 'custom-pulse-marker',
  html: `<div class="pulse-marker"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const WeatherMap: React.FC<WeatherMapProps> = ({ locationQuery, lat, lon, avgTemp, currentCondition, extraData }) => {
  const [center, setCenter] = useState<[number, number]>([41.8719, 12.5674]);
  const [zoom] = useState(6);
  const [radarPath, setRadarPath] = useState<string | null>(null);
  const [showRadar, setShowRadar] = useState(false);

  useEffect(() => {
    if (lat && lon) {
      setCenter([lat, lon]);
    }
  }, [lat, lon]);

  useEffect(() => {
    const fetchRadar = async () => {
      try {
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await res.json();
        if (data.radar?.past?.length > 0) {
          const latest = data.radar.past[data.radar.past.length - 1];
          setRadarPath(latest.path);
          console.log(`[RADAR] Layer sincronizzato con path: ${latest.path}`);
        }
      } catch (err) {
        console.warn('Radar offline:', err);
      }
    };
    fetchRadar();
  }, []);

  const getConditionIcon = () => {
    switch (currentCondition) {
      case 'Sunny': return <Sun size={32} color="#ffca28" />;
      case 'Cloudy': return <Cloud size={32} color="#c5c6c7" />;
      case 'Rainy': return <CloudRain size={32} color="#5c6bc0" />;
      default: return <Sun size={32} />;
    }
  };

  return (
    <div className="map-wrapper">
      {/* Immersive Sidebar/Card Overlay */}
      <div className="map-overlay-card">
        <div className="map-card-header">
          <Navigation size={18} color="#5c6bc0" />
          <span className="map-card-title">Dettagli Area</span>
        </div>
        
        <div className="map-card-main">
          <div className="map-icon-circle">
            {getConditionIcon()}
          </div>
          <div className="map-info-text">
            <h3 className="map-location-name">{locationQuery || "Ricerca..."}</h3>
            <div className="map-temp-large">
              {avgTemp !== undefined ? `${avgTemp}°C` : "--°"}
            </div>
            <p className="map-condition-text">{currentCondition || "N/A"}</p>
          </div>
        </div>

        {extraData && (
          <div className="map-stats-grid">
            <div className="map-stat-box">
              <Wind size={16} color="#8e99f3" />
              <div className="map-stat-info">
                <span className="map-stat-label">Vento</span>
                <strong className="map-stat-value">{extraData.windSpeed} km/h</strong>
              </div>
            </div>
            
            <div className="map-stat-box">
              <Droplets size={16} color="#8e99f3" />
              <div className="map-stat-info">
                <span className="map-stat-label">Umidità</span>
                <strong className="map-stat-value">{extraData.humidity}%</strong>
              </div>
            </div>

            <div className="map-stat-box">
              <CloudRain size={16} color="#8e99f3" />
              <div className="map-stat-info">
                <span className="map-stat-label">Pioggia</span>
                <strong className="map-stat-value">{extraData.precipitation} mm</strong>
              </div>
            </div>

            <div className="map-stat-box">
              <ThermometerSun size={16} color="#8e99f3" />
              <div className="map-stat-info">
                <span className="map-stat-label">Max / Min:</span>
                <strong className="map-stat-value">{extraData.high}° / {extraData.low}°</strong>
              </div>
            </div>
          </div>
        )}

        <div className="map-card-footer">
          <div 
            className="map-control-btn"
            style={{opacity: showRadar ? 1 : 0.5}} 
            onClick={() => setShowRadar(!showRadar)}
          >
            <Layers size={16} />
            <span>{showRadar ? "Nascondi Radar" : "Mostra Radar"}</span>
          </div>
        </div>
      </div>

      {showRadar && radarPath && (
        <div className="radar-active-glow">
          <div className="radar-dot"></div>
          Precipitazioni Real-Time
        </div>
      )}

      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%', border: 'none' }}
        zoomControl={false}
      >
        <MapController center={center} zoom={zoom} />
        
        <TileLayer
          className="base-map-layer"
          url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
        />

        {showRadar && radarPath && (
          <TileLayer
            key={radarPath}
            className="radar-layer"
            url={`https://tilecache.rainviewer.com${radarPath}/256/{z}/{x}/{y}/4/1_1.png`}
            opacity={1}
            zIndex={400}
            maxNativeZoom={12}
          />
        )}<ZoomControl position="bottomleft" />

        <Marker position={center} icon={neonPulseIcon}>
          <Popup className="premium-popup" closeButton={false}>
            <div style={{ padding: '5px', textAlign: 'center' }}>
              <strong style={{ fontSize: '1.1rem' }}>{locationQuery}</strong>
              <div style={{ color: '#8e99f3', fontWeight: 'bold' }}>Centro Analisi</div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default WeatherMap;

