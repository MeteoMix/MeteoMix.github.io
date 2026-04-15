import React from 'react';
import { ExternalLink, Cloud, Sun, CloudRain } from 'lucide-react';

interface WeatherCardProps {
  siteName: string;
  url: string;
  prediction: {
    temp: number;
    condition: 'Sunny' | 'Cloudy' | 'Rainy';
    description: string;
  };
}

const WeatherCard: React.FC<WeatherCardProps> = ({ siteName, url, prediction }) => {
  const getIcon = () => {
    switch (prediction.condition) {
      case 'Sunny': return <Sun size={48} color="#ffca28" />;
      case 'Cloudy': return <Cloud size={48} color="#c5c6c7" />;
      case 'Rainy': return <CloudRain size={48} color="#a8c0ff" />;
      default: return <Sun size={48} color="#ffca28" />;
    }
  };

  return (
    <div style={styles.card} className="glass-panel">
      <div style={styles.header}>
        <h3 style={styles.siteName}>{siteName}</h3>
        <a href={url} target="_blank" rel="noopener noreferrer" style={styles.linkIcon}>
          <ExternalLink size={20} />
        </a>
      </div>
      
      <div style={styles.content}>
        <div style={styles.iconWrapper}>
          {getIcon()}
        </div>
        <div style={styles.info}>
          <div style={styles.temp}>{prediction.temp}°C</div>
          <div style={styles.desc}>{prediction.description}</div>
        </div>
      </div>
      
      <div style={styles.footer}>
        <a href={url} target="_blank" rel="noopener noreferrer" style={styles.button}>
          Visita il sito
        </a>
      </div>
    </div>
  );
};

const styles = {
  card: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
    transition: 'var(--transition)',
    cursor: 'pointer',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '0.75rem',
  },
  siteName: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#fff',
  },
  linkIcon: {
    color: 'var(--text-secondary)',
    transition: 'var(--transition)',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  iconWrapper: {
    padding: '1rem',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: 'var(--radius-md)',
  },
  info: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  temp: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#fff',
    lineHeight: 1.2,
  },
  desc: {
    fontSize: '1rem',
    color: 'var(--text-secondary)',
  },
  footer: {
    marginTop: 'auto',
  },
  button: {
    display: 'block',
    textAlign: 'center' as const,
    padding: '0.75rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-sm)',
    color: '#fff',
    fontWeight: 500,
    transition: 'var(--transition)',
    textDecoration: 'none',
  }
};

export default WeatherCard;
