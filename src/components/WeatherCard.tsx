import React from 'react';
import { ExternalLink, Cloud, Sun, CloudRain } from 'lucide-react';
import './WeatherCard.css';

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
    <div className="weather-card glass-panel">
      <div className="card-header">
        <h3 className="site-name">{siteName}</h3>
        <a href={url} target="_blank" rel="noopener noreferrer" className="link-icon">
          <ExternalLink size={20} />
        </a>
      </div>
      
      <div className="card-content">
        <div className="icon-wrapper">
          {getIcon()}
        </div>
        <div className="card-info">
          <div className="temp-text">{prediction.temp}°C</div>
          <div className="desc-text">{prediction.description}</div>
        </div>
      </div>
      
      <div className="card-footer">
        <a href={url} target="_blank" rel="noopener noreferrer" className="visit-button">
          Visita il sito
        </a>
      </div>
    </div>
  );
};

export default WeatherCard;

