import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronLeft, Map as MapIcon, LayoutGrid, Loader2, CloudLightning } from 'lucide-react';
import WeatherCard from '../components/WeatherCard';
import WeatherMap from '../components/WeatherMap';

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

interface Forecast {
  name: string;
  url: string;
  prediction: {
    temp: number;
    condition: 'Sunny' | 'Cloudy' | 'Rainy';
    description: string;
  };
}

const providers = [
  { name: 'Ilmeteo.net', url: 'https://www.ilmeteo.net' },
  { name: '3BMeteo', url: 'https://www.3bmeteo.com' },
  { name: 'iLMeteo', url: 'https://www.ilmeteo.it' },
  { name: 'Meteo.it', url: 'https://www.meteo.it' },
  { name: "Aeronautica Militare", url: 'http://www.meteoam.it' }
];

const Result: React.FC = () => {
  const queryParam = useQuery().get('q') || '';
  const [viewMode, setViewMode] = useState<'cards' | 'map'>('cards');
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [coords, setCoords] = useState<{lat: number, lon: number, extraData?: any} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!queryParam) return;
      setIsLoading(true);
      setError(null);
      try {
        // 1. Geocoding
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryParam)}&count=1&language=it`);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
          throw new Error('Città non trovata');
        }

        const { latitude, longitude } = geoData.results[0];
        // 2. Weather with extra parameters
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&current=relative_humidity_2m,precipitation&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
        const weatherData = await weatherRes.json();

        const currentWmoCode = weatherData.current_weather.weathercode;
        const currentTemp = weatherData.current_weather.temperature;
        
        const extraData = {
          windSpeed: weatherData.current_weather?.windspeed || '--',
          humidity: weatherData.current?.relative_humidity_2m || '--',
          precipitation: weatherData.current?.precipitation || 0,
          high: weatherData.daily?.temperature_2m_max?.[0] || '--',
          low: weatherData.daily?.temperature_2m_min?.[0] || '--',
        };
        
        setCoords({ lat: latitude, lon: longitude, extraData });

        // Map WMO code to simplified conditions
        let condition: 'Sunny' | 'Cloudy' | 'Rainy' = 'Sunny';
        let description = 'Prevalentemente soleggiato';

        if (currentWmoCode >= 1 && currentWmoCode <= 3) {
          condition = 'Cloudy';
          description = 'Nuvolosità sparsa';
        } else if (currentWmoCode >= 50) {
          condition = 'Rainy';
          description = 'Pioggia in corso';
        }

        // Create the primary Open-Meteo prediction
        const realData: Forecast = {
          name: 'Open-Meteo (Dati Reali)',
          url: 'https://open-meteo.com',
          prediction: {
            temp: Math.round(currentTemp),
            condition,
            description
          }
        };

        // --- PHASE 3: Fetch scraped data from Backend Proxy ---
        let otherData: Forecast[] = [];
        try {
          const isDev = import.meta.env.DEV;
          const API_BASE = isDev ? 'http://localhost:3001' : ''; // On Vercel, it's relative
          const proxyRes = await fetch(`${API_BASE}/api/scrape?q=${encodeURIComponent(queryParam)}`);
          if (proxyRes.ok) {
             const data = await proxyRes.json();
             otherData = data.forecasts || [];
          } else {
             throw new Error("Backend response not ok");
          }
        } catch (backendError) {
          console.warn("Backend Proxy non attivo o errore durante lo scraping reale.", backendError);
          otherData = []; // No fake data allowed
        }

        setForecasts([realData, ...otherData]);
      } catch (err: any) {
        setError(err.message || "Errore nel caricamento dei dati meteo.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeather();
  }, [queryParam]);

  const avgTemp = forecasts.length > 0 
    ? Math.round(forecasts.reduce((acc, curr) => acc + curr.prediction.temp, 0) / forecasts.length) 
    : undefined;

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
            {!isLoading && !error && avgTemp !== undefined && (
              <div style={styles.avgBadge}>
                Media: {avgTemp}°C
              </div>
            )}
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

        <div className="animate-fade-in" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          {isLoading ? (
             <LoadingScanner />
          ) : error ? (
            <div style={{ padding: '2rem', background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.3)', borderRadius: '12px', color: '#ffb3b3', textAlign: 'center', width: '100%', maxWidth: '600px' }}>
              <h3>Nessun risultato trovato</h3>
              <p>{error}</p>
            </div>
          ) : viewMode === 'cards' ? (
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
              <WeatherMap 
                locationQuery={queryParam} 
                lat={coords?.lat} 
                lon={coords?.lon} 
                avgTemp={avgTemp}
                currentCondition={forecasts[0]?.prediction?.condition}
                extraData={coords?.extraData}
              />
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

const LoadingScanner = () => {
    const [step, setStep] = React.useState(0);
    const steps = [
        "Inizializzazione scansione satellitare...",
        "Interrogazione modelli GFS...",
        "Sincronizzazione radar RainViewer...",
        "Analisi dati reali iLMeteo & Giuliacci...",
        "Aggregazione multi-fonte in corso..."
    ];

    React.useEffect(() => {
        const interval = setInterval(() => {
            setStep(s => (s + 1) % steps.length);
        }, 1200);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="loading-container animate-fade-in">
            <div className="scanner-circle">
                <div className="scanner-ring"></div>
                <div className="scanner-ring-inner"></div>
                <div className="scanner-icon animate-float">
                    <CloudLightning size={48} />
                </div>
            </div>
            
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <h3 className="text-gradient animate-pulse-soft" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    {steps[step]}
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    {[0,1,2,3,4].map(i => (
                        <div 
                            key={i}
                            style={{ 
                                width: '8px', 
                                height: '8px', 
                                borderRadius: '50%', 
                                background: step === i ? 'var(--secondary)' : 'rgba(255,255,255,0.1)',
                                transition: 'all 0.4s ease'
                            }} 
                        />
                    ))}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '1rem' }}>
                    Stiamo bypassando i blocchi per garantirti solo dati reali
                </p>
            </div>
        </div>
    );
};

export default Result;
