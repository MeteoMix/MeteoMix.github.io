import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CloudRain, Sun, Wind, CloudLightning } from 'lucide-react';
import './Home.css';

const Home: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/result?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="home-container">
      {/* Decorative background icons */}
      <div style={{ top: '10%', left: '15%' }} className="home-bg-icon animate-float"><CloudRain size={80} color="rgba(255,255,255,0.03)" /></div>
      <div style={{ top: '20%', right: '15%', animationDuration: '8s' }} className="home-bg-icon animate-float"><Sun size={120} color="rgba(255,255,255,0.03)" /></div>
      <div style={{ bottom: '20%', left: '20%', animationDuration: '7s' }} className="home-bg-icon animate-float"><Wind size={90} color="rgba(255,255,255,0.03)" /></div>
      <div style={{ bottom: '15%', right: '25%', animationDuration: '9s' }} className="home-bg-icon animate-float"><CloudLightning size={70} color="rgba(255,255,255,0.03)" /></div>

      <div className="home-center-box animate-fade-in">
        <div className="home-header">
          <h1 className="home-title">
             Meteo<span className="text-gradient">Mix</span> Italia
          </h1>
          <p className="home-subtitle">
            Una visione a 360° per le previsioni meteorologiche in Italia. Cerca la tua città o regione.
          </p>
        </div>

        <form 
          onSubmit={handleSearch} 
          className={`search-wrapper glass-panel ${isFocused ? 'search-wrapper-focused' : ''}`}
        >
          <Search size={24} color={isFocused ? '#8e99f3' : '#a0a0a0'} className="search-icon" />
          <input
            type="text"
            placeholder="Cerca per città (es. Milano, Roma, Veneto)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="search-input"
          />
          <button type="submit" className="search-button">
            Cerca
          </button>
        </form>
      </div>
    </div>
  );
};

export default Home;
