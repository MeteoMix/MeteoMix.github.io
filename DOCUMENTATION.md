# MeteoMix - Documentation

- [2026-04-15 21:45:00]: Inizializzazione progetto e Sviluppo UI Core
  - *Details*: È stato creato un nuovo progetto React con Vite e TypeScript. È stato implementato il design per "MeteoHub Italia", applicazione concepita per effettuare query su più piattaforme meteo e calcolarne la media. È stato usato un design moderno (glassmorphism, animazioni premium, dark mode).
  - *Tech Notes*:
    - Dipendenze installate: `react-router-dom`, `lucide-react`, `leaflet`, `react-leaflet`, `@types/leaflet`.
    - Pagine create: `Home.tsx` (pagina ricerca), `Result.tsx` (risultato con opzioni cards/mappa).
    - Componenti creati: `WeatherCard.tsx` (vista a lista), `WeatherMap.tsx` (vista su mappa interattiva tramite Leaflet).
    - Stili globali: `index.css` include font ('Outfit'), animazioni e variabili CSS premium.

- [2026-04-15 21:55:00]: Integrazione Dati Reali (Open-Meteo & Scraper Proxy)
  - *Details*: L'applicativo è stato aggiornato per smettere di usare mock-data casuali e prelevare dati reali. È stata creata una doppia strategia (Fase 1 e Fase 3 affrontabili in sincrono) per massimizzare la robustezza.
  - *Tech Notes*:
    - **Fase 1 (Frontend)**: Inserita integrazione con l'API gratuita `Open-Meteo` in Geocoding e Forecast su `Result.tsx`. Aggiunti Loading e Error states. Il frontend funziona anche senza backend mostrandolo come unica fonte di "Dati Reali".
    - **Fase 3 (Backend Proxy)**: Creato server Express separato in `server.js`. Usa `axios` e `cheerio` per fare scraping su IlMeteo.it estraendo i text OG. Fallback robusto agli altri servizi in caso di blocco CORS IP (visto che 3BMeteo rifiuta programmaticamente i server senza cache). Aggiunti `express`, `cors`, `axios`, `cheerio` al `package.json`. Nuovo script `npm run dev:server`.
- [2026-04-15 22:01:00]: Proxy Scraper v2.0 (Enterprise Upgrade)
  - *Details*: Riscrittura completa del backend scraping locale per massimizzare l'affidabilità e abbattere i tempi di risposta.
  - *Tech Notes*:
    - **In-Memory Caching**: Aggiunto un sistema Map() con TTL di 15 minuti. Evita ip-ban e alleggerisce il carico sui server target.
    - **Axios Retry Pattern**: Introdotto un wrapper `fetchWithRetry` con backoff esponenziale automatico e spoofing iterativo degli header / User-Agents e Referers per raggirare firewall.
    - **Promise.allSettled**: Le routines di scraping ora girano in parallelo. Se un micro-servizio crasha, gli altri completano senza abbattere l'endpoint.
    - **Robust Cheerio Parsing**: Aggiunti fallback successivi con Regex robuste nel parsing dell'HTML.
