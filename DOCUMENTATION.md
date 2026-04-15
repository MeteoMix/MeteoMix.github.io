# MeteoMix - Documentation

- [2026-04-15 21:45:00]: Inizializzazione progetto e Sviluppo UI Core
  - *Details*: È stato creato un nuovo progetto React con Vite e TypeScript. È stato implementato il design per "MeteoHub Italia", applicazione concepita per effettuare query su più piattaforme meteo e calcolarne la media. È stato usato un design moderno (glassmorphism, animazioni premium, dark mode).
  - *Tech Notes*:
    - Dipendenze installate: `react-router-dom`, `lucide-react`, `leaflet`, `react-leaflet`, `@types/leaflet`.
    - Pagine create: `Home.tsx` (pagina ricerca), `Result.tsx` (risultato con opzioni cards/mappa).
    - Componenti creati: `WeatherCard.tsx` (vista a lista), `WeatherMap.tsx` (vista su mappa interattiva tramite Leaflet).
    - Stili globali: `index.css` include font ('Outfit'), animazioni e variabili CSS premium.
