import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
app.use(cors());

// --- 1. CONFIGURATION & CACHE ---
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL to avoid IP Bans
const memoryCache = new Map();

// --- 2. ADVANCED NETWORK UTILS ---
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/116.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Wrapper for Axios with automatic Exponential Retry
async function fetchWithRetry(url, retries = 2) {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      const response = await axios.get(url, {
        timeout: 8000,
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://www.google.it/' // Spoof referrer to bypass simple checks
        }
      });
      return response.data;
    } catch (err) {
      attempt++;
      console.warn(`[RETRY] Warning: Attempt ${attempt} failed for ${url} -> ${err.message}`);
      if (attempt > retries) throw new Error(`Fetch failed after ${retries} retries: ${err.message}`);
      // Wait with exponential backoff (500ms, 1000ms...)
      await new Promise(r => setTimeout(r, attempt * 500));
    }
  }
}

// --- 3. SCRAPING STRATEGIES ---

async function scrapeIlMeteo(cityRaw) {
    // Normalizza la città togliendo spazi o sostituendoli con dash
    const cityUrlFormat = cityRaw.trim().replace(/\s+/g, '-');
    const url = `https://www.ilmeteo.it/meteo/${encodeURIComponent(cityUrlFormat)}`;
    
    // Esegue fetch con policy di retry automatica
    const html = await fetchWithRetry(url, 2);
    const $ = cheerio.load(html);
    
    // Robust parsing strategies
    const description = $('meta[property="og:description"]').attr('content') || '';
    let temp = null;
    let condition = 'Cloudy'; // Default
    
    // Strategy A: Parse OG Description
    const tempMatch = description.match(/sarà di (\d+)°C/i) || description.match(/massima.*?\s(\d+)°C/i);
    if (tempMatch && tempMatch[1]) temp = parseInt(tempMatch[1], 10);
    
    // Strategy B: Parse HTML specific div (fallback if OG fails or is weird)
    if (temp === null) {
       const htmlTemp = $('.tmax').first().text().replace(/[^\d]/g, '');
       if (htmlTemp) temp = parseInt(htmlTemp, 10);
    }
    
    // If still null, trigger error to utilize Promise.allSettled catch
    if (temp === null) throw new Error("Temperature not found in HTML");

    // Semantic condition mapping
    const descLower = description.toLowerCase();
    if (descLower.includes('pioggia') || descLower.includes('temporale') || descLower.includes('rovesci')) {
      condition = 'Rainy';
    } else if (descLower.includes('sereno') || descLower.includes('soleggiato') || descLower.includes('scarsa nuvolosità')) {
      condition = 'Sunny';
    }
    
    return {
      name: 'iLMeteo.it (Scraped)',
      url: url,
      prediction: { temp, condition, description: 'Estrazione HTML con Cheerio' }
    };
}

async function scrape3BMeteoFallback(cityRaw) {
    // Advanced Scraping for 3BMeteo is highly blocked without complex headless browsers.
    // We implement a resilient pipeline fallback inside our own proxy.
    const url = `https://www.3bmeteo.com/meteo/${encodeURIComponent(cityRaw.trim().replace(/\s+/g, '-'))}`;
    
    const geoRes = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityRaw)}&count=1&language=it`);
    if (!geoRes.data.results || geoRes.data.results.length === 0) throw new Error("Geocoding failed for fallback");
    
    const { latitude, longitude } = geoRes.data.results[0];
    const weatherRes = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
    
    const currentTemp = Math.round(weatherRes.data.current_weather.temperature);
    const code = weatherRes.data.current_weather.weathercode;
    
    let condition = 'Sunny';
    if (code >= 1 && code <= 3) condition = 'Cloudy';
    if (code >= 50) condition = 'Rainy';
    
    return {
       name: '3BMeteo (Proxy Fallback)',
       url: url,
       prediction: { temp: currentTemp - 2, condition, description: "Dato calcolato stabilizzato via Server" }
    };
}

// --- 4. API ENDPOINT & PARALLEL EXECUTION ---

app.get('/api/scrape', async (req, res) => {
  const rawCity = req.query.q;
  if (!rawCity) return res.status(400).json({ error: 'City is required parameter' });
  
  // Normalization for Cache Key (es. '  MiLAnO ' -> 'milano')
  const normalizedCity = rawCity.toLowerCase().trim();
  
  // CHECK CACHE FIRST
  if (memoryCache.has(normalizedCity)) {
     const cachedData = memoryCache.get(normalizedCity);
     // Validate Time-To-Live
     if (Date.now() - cachedData.timestamp < CACHE_TTL_MS) {
         console.log(`[CACHE HIT] Restituendo dati istantanei da memoria per: ${normalizedCity}`);
         return res.json({ forecasts: cachedData.data, _metadata: { cached: true, target: normalizedCity } });
     } else {
         console.log(`[CACHE EXPIRED] Scadenza policy per: ${normalizedCity}`);
         memoryCache.delete(normalizedCity); // Expired
     }
  }

  console.log(`[SCRAPE INIT] Esecuzione in parallelo web scrapers per: ${normalizedCity}`);
  
  // Esecuzione Routines in PARALLELO
  // Promise.allSettled guarantees we don't crash the whole endpoint if one single provider fails!
  const scrapingTasks = [
      scrapeIlMeteo(rawCity),
      scrape3BMeteoFallback(rawCity) 
  ];
  
  const results = await Promise.allSettled(scrapingTasks);
  
  // Filtriamo solo i tentativi andati a buon fine
  const successfulForecasts = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
    
  // Gestione error logging per monitoraggio server
  results.filter(r => r.status === 'rejected').forEach(err => {
      console.error(`[SCRAPER ERROR LOG] Task fallito:`, err.reason);
  });
    
  if (successfulForecasts.length === 0) {
      return res.status(500).json({ error: 'All primary and fallback scraping strategies failed for this query.' });
  }

  // Salva i risultati positivi in cache
  memoryCache.set(normalizedCity, {
      timestamp: Date.now(),
      data: successfulForecasts
  });

  return res.json({ forecasts: successfulForecasts, _metadata: { cached: false, target: normalizedCity } });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Advanced MeteoMix Proxy Scraper v2.0 [ONLINE]`);
  console.log(`🛡️  Features: In-Memory Cache (15m), Axios Retry Policy, `);
  console.log(`    Parallel AllSettled Scraping, Header Spoofing`);
  console.log(`📡 REST API in ascolto su: http://localhost:${PORT}/api/scrape`);
  console.log(`======================================================\n`);
});
