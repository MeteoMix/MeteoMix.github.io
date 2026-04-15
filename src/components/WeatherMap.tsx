import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Cloud, Sun, CloudRain, Navigation, Map as MapIcon, Layers, Wind, Droplets, ThermometerSun } from 'lucide-react';

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

// Cinematic Map Transitions
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

  // Premium Visual Processing (Adjusted for better visibility)
  useEffect(() => {
    const applyFilters = () => {
      const panes = map.getPanes();
      if (panes.tilePane) {
        // Significantly increased brightness for clear readability
        panes.tilePane.style.filter = 'brightness(2.5) contrast(1.1) saturate(1.2)';
      }
    };
    map.on('tileload', applyFilters);
    applyFilters();
  }, [map]);

  return null;
};

// Custom DivIcon for the Neon Pulse
const neonPulseIcon = new L.DivIcon({
  className: 'custom-pulse-marker',
  html: `<div class="pulse-marker"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const WeatherMap: React.FC<WeatherMapProps> = ({ locationQuery, lat, lon, avgTemp, currentCondition, extraData }) => {
  const [center, setCenter] = useState<[number, number]>([41.8719, 12.5674]);
  const [zoom, setZoom] = useState(10);
  const [radarTimestamp, setRadarTimestamp] = useState<number | null>(null);
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
          setRadarTimestamp(data.radar.past[data.radar.past.length - 1].time);
        }
      } catch (err) {
        console.warn('Radar offline');
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
    <div style={styles.container}>
      {/* Immersive Sidebar/Card Overlay */}
      <div className="map-overlay-card">
        <div style={styles.cardHeader}>
          <Navigation size={18} color="#5c6bc0" />
          <span style={styles.cardTitle}>Dettagli Area</span>
        </div>
        
        <div style={styles.cardMain}>
          <div style={styles.iconCircle}>
            {getConditionIcon()}
          </div>
          <div style={styles.infoText}>
            <h3 style={styles.locationName}>{locationQuery || "Ricerca in corso..."}</h3>
            <div style={styles.tempLarge}>
              {avgTemp !== undefined ? `${avgTemp}°C` : "--°"}
            </div>
            <p style={styles.conditionText}>{currentCondition || "N/A"}</p>
          </div>
        </div>

        {extraData && (
          <div style={styles.statsGrid}>
            <div style={styles.statBox}>
              <Wind size={16} color="#8e99f3" />
              <div style={styles.statInfo}>
                <span style={styles.statLabel}>Vento</span>
                <strong style={styles.statValue}>{extraData.windSpeed} km/h</strong>
              </div>
            </div>
            
            <div style={styles.statBox}>
              <Droplets size={16} color="#8e99f3" />
              <div style={styles.statInfo}>
                <span style={styles.statLabel}>Umidità</span>
                <strong style={styles.statValue}>{extraData.humidity}%</strong>
              </div>
            </div>

            <div style={styles.statBox}>
              <CloudRain size={16} color="#8e99f3" />
              <div style={styles.statInfo}>
                <span style={styles.statLabel}>Pioggia</span>
                <strong style={styles.statValue}>{extraData.precipitation} mm</strong>
              </div>
            </div>

            <div style={styles.statBox}>
              <ThermometerSun size={16} color="#8e99f3" />
              <div style={styles.statInfo}>
                <span style={styles.statLabel}>Max / Min</span>
                <strong style={styles.statValue}>{extraData.high}° / {extraData.low}°</strong>
              </div>
            </div>
          </div>
        )}

        <div style={styles.cardFooter}>
          <div 
            style={{...styles.controlBtn, opacity: showRadar ? 1 : 0.5}} 
            onClick={() => setShowRadar(!showRadar)}
          >
            <Layers size={16} />
            <span>{showRadar ? "Nascondi Radar" : "Mostra Radar"}</span>
          </div>
        </div>
      </div>

      {/* Radar Status Indicator */}
      {showRadar && radarTimestamp && (
        <div className="radar-active-glow">
          <div className="radar-dot"></div>
          Precipitazioni Real-Time
        </div>
      )}

      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '650px', width: '100%', border: 'none' }}
        zoomControl={false}
      >
        <MapController center={center} zoom={zoom} />
        
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
        />

        {showRadar && radarTimestamp && (
          <TileLayer
            key={radarTimestamp}
            url={`https://tilecache.rainviewer.com/v2/radar/${radarTimestamp}/256/{z}/{x}/{y}/2/1_1.png`}
            opacity={0.7}
            zIndex={100}
            maxZoom={12} // Crucial FIX for "Zoom Not Supported"
          />
        )}

        <ZoomControl position="bottomleft" />

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

const styles = {
  container: {
    width: '100%',
    position: 'relative' as const,
    overflow: 'hidden',
    borderRadius: '24px',
    boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '15px',
  },
  cardTitle: {
    fontSize: '0.75rem',
    fontWeight: 800,
    textTransform: 'uppercase' as const,
    letterSpacing: '1.5px',
    color: '#8e99f3',
  },
  cardMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '20px',
  },
  iconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  infoText: {
    flex: 1,
  },
  locationName: {
    fontSize: '1.1rem',
    margin: 0,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  },
  tempLarge: {
    fontSize: '2.2rem',
    fontWeight: 800,
    lineHeight: 1.1,
    background: 'linear-gradient(to bottom, #fff, #8e99f3)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  conditionText: {
    fontSize: '0.8rem',
    color: '#c5c6c7',
    margin: 0,
    fontWeight: 500,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '20px',
    padding: '15px',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  statBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  statLabel: {
    fontSize: '0.65rem',
    color: '#8e99f3',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    fontWeight: 600,
  },
  statValue: {
    fontSize: '0.85rem',
    color: 'white',
    fontWeight: 700,
  },
  cardFooter: {
    borderTop: '1px solid rgba(255,255,255,0.1)',
    paddingTop: '15px',
  },
  controlBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    borderRadius: '12px',
    background: 'rgba(92, 107, 192, 0.2)',
    color: '#8e99f3',
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  }
};

export default WeatherMap;
