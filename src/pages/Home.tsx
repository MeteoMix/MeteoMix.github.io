import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CloudRain, Sun, Wind, CloudLightning } from 'lucide-react';

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
    <div style={styles.container}>
      {/* Decorative background icons */}
      <div style={{ ...styles.bgIcon, top: '10%', left: '15%' }} className="animate-float"><CloudRain size={80} color="rgba(255,255,255,0.03)" /></div>
      <div style={{ ...styles.bgIcon, top: '20%', right: '15%', animationDuration: '8s' }} className="animate-float"><Sun size={120} color="rgba(255,255,255,0.03)" /></div>
      <div style={{ ...styles.bgIcon, bottom: '20%', left: '20%', animationDuration: '7s' }} className="animate-float"><Wind size={90} color="rgba(255,255,255,0.03)" /></div>
      <div style={{ ...styles.bgIcon, bottom: '15%', right: '25%', animationDuration: '9s' }} className="animate-float"><CloudLightning size={70} color="rgba(255,255,255,0.03)" /></div>

      <div className="animate-fade-in" style={styles.centerBox}>
        <div style={styles.header}>
          <h1 style={styles.title}>
             Meteo<span className="text-gradient">Mix</span> Italia
          </h1>
          <p style={styles.subtitle}>
            Una visione a 360° per le previsioni meteorologiche in Italia. Cerca la tua città o regione.
          </p>
        </div>

        <form onSubmit={handleSearch} style={{...styles.searchWrapper, ...(isFocused ? styles.searchWrapperFocused : {})}} className="glass-panel">
          <Search size={24} color={isFocused ? '#8e99f3' : '#a0a0a0'} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Cerca per città (es. Milano, Roma, Veneto)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={styles.searchInput}
          />
          <button type="submit" style={styles.searchButton}>
            Cerca
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
    overflow: 'hidden',
    padding: '1rem',
  },
  bgIcon: {
    position: 'absolute' as const,
    zIndex: 0,
    pointerEvents: 'none' as const,
  },
  centerBox: {
    position: 'relative' as const,
    zIndex: 1,
    width: '100%',
    maxWidth: '800px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '3rem',
  },
  header: {
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  title: {
    fontSize: '4rem',
    fontWeight: 800,
    lineHeight: 1.1,
  },
  subtitle: {
    fontSize: '1.25rem',
    color: 'var(--text-secondary)',
    maxWidth: '600px',
    margin: '0 auto',
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    maxWidth: '650px',
    padding: '0.75rem 1rem 0.75rem 1.5rem',
    borderRadius: '100px',
    transition: 'var(--transition)',
  },
  searchWrapperFocused: {
    boxShadow: '0 0 0 2px rgba(142, 153, 243, 0.5), var(--shadow-glass)',
    background: 'rgba(255, 255, 255, 0.08)',
  },
  searchIcon: {
    marginRight: '1rem',
    transition: 'var(--transition)',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#ffffff',
    fontSize: '1.25rem',
    fontFamily: 'inherit',
    fontWeight: 500,
  },
  searchButton: {
    background: 'linear-gradient(135deg, #5c6bc0 0%, #26418f 100%)',
    color: '#ffffff',
    padding: '0.8rem 2rem',
    borderRadius: '100px',
    fontSize: '1.1rem',
    fontWeight: 600,
    boxShadow: 'var(--shadow-md)',
    transition: 'var(--transition)',
    marginLeft: '1rem',
  },
};

export default Home;
