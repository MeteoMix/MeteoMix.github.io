import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronLeft, Map as MapIcon, LayoutGrid } from 'lucide-react';
import WeatherCard from '../components/WeatherCard';
import WeatherMap from '../components/WeatherMap';

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const providers = [
  { name: 'Ilmeteo.net', url: 'https://www.ilmeteo.net' },
  { name: '3BMeteo', url: 'https://www.3bmeteo.com' },
  { name: 'iLMeteo', url: 'https://www.ilmeteo.it' },
  { name: 'Meteo.it', url: 'https://www.meteo.it' },
  { name: "Aeronautica Militare", url: 'http://www.meteoam.it' }
];

const generateMockData = (query: string) => {
  // Simple hashing of query string to create stable pseudo-random data
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    hash = query.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const baseTemp = 18 + (Math.abs(hash) % 15);
  const conditions: Array<'Sunny' | 'Cloudy' | 'Rainy'> = ['Sunny', 'Cloudy', 'Rainy'];
  
  return providers.map((provider, i) => {
    // Generate slight variations between providers
    const tempVar = (Math.abs(hash + i) % 5) - 2;
    const condIndex = Math.abs(hash + i * 3) % conditions.length;
    
    return {
      name: provider.name,
      url: provider.url,
      prediction: {
        temp: baseTemp + tempVar,
        condition: conditions[condIndex],
        description: conditions[condIndex] === 'Sunny' ? 'Prevalentemente soleggiato' : conditions[condIndex] === 'Cloudy' ? 'Nuvolosità sparsa' : 'Piogge deboli'
      }
    };
  });
};

const Result: React.FC = () => {
  const queryParam = useQuery().get('q') || '';
  const [viewMode, setViewMode] = useState<'cards' | 'map'>('cards');
  
  const forecasts = generateMockData(queryParam);
  
  // Calculate average temp
  const avgTemp = Math.round(forecasts.reduce((acc, curr) => acc + curr.prediction.temp, 0) / forecasts.length);

  return (
    <div style={styles.container}>
      <header style={styles.header} className="glass-panel">
        <div style={styles.headerContent}>
          <Link to="/" style={styles.backButton}>
            <ChevronLeft size={24} />
            <span>Nuova Ricerca</span>
          </Link>
          <div style={styles.titleWrapper}>
            <h1 style={styles.title}>
              Previsioni per <span className="text-gradient">"{queryParam}"</span>
            </h1>
            <div style={styles.avgBadge}>
              Media: {avgTemp}°C
            </div>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.controls}>
          <div style={styles.toggleWrapper} className="glass-panel">
            <button 
              style={{...styles.toggleBtn, ...(viewMode === 'cards' ? styles.activeToggle : {})}}
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid size={20} />
              Lista Siti
            </button>
            <button 
              style={{...styles.toggleBtn, ...(viewMode === 'map' ? styles.activeToggle : {})}}
              onClick={() => setViewMode('map')}
            >
              <MapIcon size={20} />
              Mappa Interattiva
            </button>
          </div>
        </div>

        <div className="animate-fade-in" style={{ width: '100%' }}>
          {viewMode === 'cards' ? (
            <div style={styles.grid}>
              {forecasts.map((f, idx) => (
                <WeatherCard 
                  key={idx}
                  siteName={f.name}
                  url={f.url}
                  prediction={f.prediction}
                />
              ))}
            </div>
          ) : (
            <div style={styles.mapContainer}>
              <WeatherMap locationQuery={queryParam} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    padding: '2rem 1.5rem',
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2rem',
  },
  header: {
    padding: '1.5rem',
    position: 'sticky' as const,
    top: '1rem',
    zIndex: 10,
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
    position: 'relative' as const,
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    transition: 'var(--transition)',
    textDecoration: 'none',
  },
  titleWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    flex: 1,
    justifyContent: 'center',
    paddingRight: '6rem', // Balance back button
  },
  title: {
    fontSize: '2rem',
    margin: 0,
  },
  avgBadge: {
    background: 'rgba(92, 107, 192, 0.2)',
    border: '1px solid rgba(92, 107, 192, 0.4)',
    color: '#8e99f3',
    padding: '0.25rem 0.75rem',
    borderRadius: 'var(--radius-full)',
    fontWeight: 700,
    fontSize: '1.1rem',
  },
  main: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '2rem',
    flex: 1,
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
  },
  toggleWrapper: {
    display: 'flex',
    padding: '0.5rem',
    gap: '0.5rem',
    borderRadius: '100px',
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    borderRadius: '100px',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    fontSize: '1rem',
    transition: 'var(--transition)',
  },
  activeToggle: {
    background: 'linear-gradient(135deg, #5c6bc0 0%, #26418f 100%)',
    color: '#fff',
    boxShadow: 'var(--shadow-md)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '2rem',
    width: '100%',
  },
  mapContainer: {
    width: '100%',
    animation: 'fadeIn 0.6s cubic-bezier(0.25, 0.8, 0.25, 1) forwards',
  }
};

export default Result;
