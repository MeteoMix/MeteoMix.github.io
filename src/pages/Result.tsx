import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronLeft, Map as MapIcon, LayoutGrid, Loader2, CloudLightning } from 'lucide-react';
import WeatherCard from '../components/WeatherCard';
import WeatherMap from '../components/WeatherMap';
import './Result.css';

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
    windSpeed?: number;
    humidity?: number;
    precipitation?: number;
    high?: number;
    low?: number;
  };
}

const Result: React.FC = () => {
  const queryParam = useQuery().get('q') || '';
  const [viewMode, setViewMode] = useState<'cards' | 'map'>('cards');
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [coords, setCoords] = useState<{lat: number, lon: number} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!queryParam) return;
      setIsLoading(true);
      setError(null);
      try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryParam)}&count=1&language=it`);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
          throw new Error('Città non trovata');
        }

        const { latitude, longitude } = geoData.results[0];
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&current=relative_humidity_2m,precipitation&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
        const weatherData = await weatherRes.json();

        const currentWmoCode = weatherData.current_weather.weathercode;
        const currentTemp = weatherData.current_weather.temperature;
        
        let condition: 'Sunny' | 'Cloudy' | 'Rainy' = 'Sunny';
        let description = 'Prevalentemente soleggiato';

        if (currentWmoCode >= 1 && currentWmoCode <= 3) {
          condition = 'Cloudy';
          description = 'Nuvolosità sparsa';
        } else if (currentWmoCode >= 50) {
          condition = 'Rainy';
          description = 'Pioggia in corso';
        }

        const realData: Forecast = {
          name: 'Open-Meteo (Dati Reali)',
          url: 'https://open-meteo.com',
          prediction: {
            temp: Math.round(currentTemp),
            condition,
            description,
            windSpeed: weatherData.current_weather?.windspeed,
            humidity: weatherData.current?.relative_humidity_2m,
            precipitation: weatherData.current?.precipitation,
            high: weatherData.daily?.temperature_2m_max?.[0],
            low: weatherData.daily?.temperature_2m_min?.[0],
          }
        };

        setCoords({ lat: latitude, lon: longitude });

        let otherData: Forecast[] = [];
        try {
          const isDev = import.meta.env.DEV;
          const API_BASE = isDev ? 'http://localhost:3001' : ''; 
          const proxyRes = await fetch(`${API_BASE}/api/scrape?q=${encodeURIComponent(queryParam)}`);
          if (proxyRes.ok) {
             const data = await proxyRes.json();
             otherData = data.forecasts || [];
          }
        } catch (backendError) {
          console.warn("Backend Proxy non attivo o errore durante lo scraping reale.", backendError);
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

  const avgData = React.useMemo(() => {
    if (forecasts.length === 0) return null;
    let counts = { temp: 0, windSpeed: 0, humidity: 0, precipitation: 0, high: 0, low: 0 };
    let sums = { temp: 0, windSpeed: 0, humidity: 0, precipitation: 0, high: 0, low: 0 };

    forecasts.forEach(f => {
      const p = f.prediction;
      if (typeof p.temp === 'number' && !isNaN(p.temp)) { sums.temp += p.temp; counts.temp++; }
      if (typeof p.windSpeed === 'number' && !isNaN(p.windSpeed)) { sums.windSpeed += p.windSpeed; counts.windSpeed++; }
      if (typeof p.humidity === 'number' && !isNaN(p.humidity)) { sums.humidity += p.humidity; counts.humidity++; }
      if (typeof p.precipitation === 'number' && !isNaN(p.precipitation)) { sums.precipitation += p.precipitation; counts.precipitation++; }
      if (typeof p.high === 'number' && !isNaN(p.high)) { sums.high += p.high; counts.high++; }
      if (typeof p.low === 'number' && !isNaN(p.low)) { sums.low += p.low; counts.low++; }
    });

    return {
      temp: counts.temp > 0 ? Math.round(sums.temp / counts.temp) : undefined,
      windSpeed: counts.windSpeed > 0 ? Math.round(sums.windSpeed / counts.windSpeed) : '--',
      humidity: counts.humidity > 0 ? Math.round(sums.humidity / counts.humidity) : '--',
      precipitation: counts.precipitation > 0 ? Number((sums.precipitation / counts.precipitation).toFixed(1)) : 0,
      high: counts.high > 0 ? Math.round(sums.high / counts.high) : '--',
      low: counts.low > 0 ? Math.round(sums.low / counts.low) : '--',
    };
  }, [forecasts]);

  return (
    <div className="result-container">
      <header className="result-header glass-panel">
        <div className="result-header-content">
          <Link to="/" className="back-button">
            <ChevronLeft size={24} />
            <span>Indietro</span>
          </Link>
          <div className="title-wrapper">
            <h1 className="result-title">
              Meteo <span className="text-gradient">{queryParam}</span>
            </h1>
            {!isLoading && !error && avgData?.temp !== undefined && (
              <div className="avg-badge">
                Media: {avgData.temp}°C
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="result-main">
        <div className="controls">
          <div className="toggle-wrapper glass-panel">
            <button 
              className={`toggle-btn ${viewMode === 'cards' ? 'active-toggle' : ''}`}
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid size={20} />
              Lista
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'map' ? 'active-toggle' : ''}`}
              onClick={() => setViewMode('map')}
            >
              <MapIcon size={20} />
              Mappa
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
            <div className="result-grid">
              {forecasts.map((f, idx) => (
                <WeatherCard 
                   key={idx}
                  siteName={f.name}
                  url={f.url}
                  prediction={f.prediction as any}
                />
              ))}
            </div>
          ) : (
            <div className="map-outer-container">
              <WeatherMap 
                locationQuery={queryParam} 
                lat={coords?.lat} 
                lon={coords?.lon} 
                avgTemp={avgData?.temp}
                currentCondition={forecasts[0]?.prediction?.condition}
                extraData={avgData || undefined}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};


const LoadingScanner = () => {
    const [step, setStep] = React.useState(0);
    const steps = [
        "Inizializzazione scansione...",
        "Interrogazione modelli...",
        "Sincronizzazione radar...",
        "Analisi dati iLMeteo...",
        "Aggregazione multi-fonte..."
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
                <h3 className="text-gradient animate-pulse-soft" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
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
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '1rem', padding: '0 1rem' }}>
                    Sincronizzazione dati reali in corso
                </p>
            </div>
        </div>
    );
};

export default Result;
