## Cose da fare:

### Setup Backend Scraping
1. Ferma momentaneamente il server e lancia `npm install` nel terminale per installare i nuovi pacchetti del backend (express, axios, cheerio, cors).
2. Per attivare la visualizzazione dei veri siti Italiani (Fase 3: Scraper Proxy), devi avviare il backend in un **nuovo tab del terminale** eseguendo questo comando:
   `npm run dev:server`
*(Se non lo avvii, il frontend ricorrerà automaticamente alla Fase 1 usando Open-Meteo per i dati reali e fallbacks per il resto).*
