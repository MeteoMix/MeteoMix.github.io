import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
app.use(cors());

// --- 1. CONFIGURATION & CACHE ---
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minuti cache 
const memoryCache = new Map();

// --- 2. ADVANCED NETWORK UTILS ---
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/116.0',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchWithRetry(url, retries = 2) {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://www.google.it/',
          'Cache-Control': 'no-cache'
        }
      });
      return response.data;
    } catch (err) {
      attempt++;
      console.warn(`[RETRY] Attempt ${attempt} fallito per ${url} -> ${err.message}`);
      if (attempt > retries) throw new Error(`Fetch failed after ${retries} retries: ${err.message}`);
      await new Promise(r => setTimeout(r, attempt * 500));
    }
  }
}

// Estrae semanticamente il meteo dal testo (Sunny, Cloudy, Rainy)
function parseConditionFromText(text) {
    const t = (text || '').toLowerCase();
    if (t.match(/pioggia|piove|temporale|rovesci|acquazzone/)) return 'Rainy';
    if (t.match(/nuvol|coperto|nebbia/)) return 'Cloudy';
    if (t.match(/sereno|sole|limpido/)) return 'Sunny';
    return 'Cloudy'; // default safe
}

// --- 3. SCRAPING STRATEGIES ---

// iLMeteo.it
async function scrapeIlMeteo(cityRaw) {
    const url = `https://www.ilmeteo.it/meteo/${encodeURIComponent(cityRaw.trim().replace(/\s+/g, '-'))}`;
    const html = await fetchWithRetry(url, 2);
    const $ = cheerio.load(html);
    
    let temp = null;
    const desc = $('meta[property="og:description"]').attr('content') || '';
    
    const tMatch = desc.match(/sarà di (\d+)°C/i) || desc.match(/massima.*?\s(\d+)°C/i);
    if (tMatch) temp = parseInt(tMatch[1], 10);
    
    if (temp === null) {
       const ht = $('.tmax').first().text().replace(/[^\d]/g, '');
       if (ht) temp = parseInt(ht, 10);
    }
    if (temp === null) throw new Error("Temperature missing on iLMeteo");
    
    return { name: 'iLMeteo.it', url, prediction: { temp, condition: parseConditionFromText(desc), description: 'Scraping via OpenGraph (iLMeteo)' } };
}

// 3BMeteo
async function scrape3BMeteo(cityRaw) {
    const url = `https://www.3bmeteo.com/meteo/${encodeURIComponent(cityRaw.trim().replace(/\s+/g, '-'))}`;
    const html = await fetchWithRetry(url, 2);
    const $ = cheerio.load(html);
    
    let temp = null;
    const desc = $('meta[property="og:description"]').attr('content') || $('title').text() || '';
    
    const tMatch = desc.match(/tra .* e (\d+)\s*°C/i) || desc.match(/max\s*(\d+)\s*°/i);
    if (tMatch) temp = parseInt(tMatch[1], 10);
    
    if (temp === null) {
       const ht = $('.valore-temperatura').first().text().replace(/[^\d]/g, '') || $('.temp').first().text().replace(/[^\d]/g, '');
       if (ht && ht.length <= 2) temp = parseInt(ht, 10);
    }
    if (temp === null) throw new Error("Temperature missing on 3BMeteo");
    
    return { name: '3BMeteo', url, prediction: { temp, condition: parseConditionFromText(desc), description: 'Scraping By-passato via Headers' } };
}

// meteoblue
async function scrapeMeteoBlue(cityRaw) {
    const searchUrl = `https://www.meteoblue.com/it/server/search/query3?query=${encodeURIComponent(cityRaw)}`;
    let targetUrl = '';
    
    try {
        const searchRes = await axios.get(searchUrl, { headers: { 'User-Agent': getRandomUserAgent() } });
        if (searchRes.data.items && searchRes.data.items.length > 0) {
            targetUrl = `https://www.meteoblue.com${searchRes.data.items[0].url}`;
        }
    } catch (e) {
        targetUrl = `https://www.meteoblue.com/it/tempo/settimana/${encodeURIComponent(cityRaw.trim().toLowerCase())}`;
    }
    if (!targetUrl) throw new Error("Impossibile risolvere URL di Meteoblue");
    
    const html = await fetchWithRetry(targetUrl, 2);
    const $ = cheerio.load(html);
    
    let temp = null;
    const desc = $('meta[name="description"]').attr('content') || '';
    
    const tMatch = desc.match(/Max\s*(\d+)°/i) || desc.match(/(\d+) °/);
    if (tMatch) temp = parseInt(tMatch[1], 10);
    
    if (temp === null) {
        const ht = $('.current-temp').text().replace(/[^\d]/g, '') || $('.picto-temp').first().text().replace(/[^\d]/g, '');
        if (ht) temp = parseInt(ht, 10);
    }
    if (temp === null) throw new Error("Temperature missing on Meteoblue");

    return { name: 'meteoblue', url: targetUrl, prediction: { temp, condition: parseConditionFromText(desc), description: 'Scraping via API Ricerca + HTML' } };
}

// MeteoAM (Aeronautica Militare)
async function scrapeMeteoAM(cityRaw) {
    const url = `https://www.meteoam.it/it/meteo-citta/${encodeURIComponent(cityRaw.trim().toLowerCase().replace(/\s+/g, '-'))}`;
    const html = await fetchWithRetry(url, 2);
    const $ = cheerio.load(html);
    
    let temp = null;
    let desc = $('meta[name="description"]').attr('content') || $('title').text() || '';
    
    const ht = $('div.temperature span.value').first().text() || $('td.temp').first().text();
    const tMatch = ht.match(/(\d+)/) || desc.match(/Temperatura:\s*(\d+)/i) || desc.match(/(\d+)\s*°C/);
    if (tMatch) temp = parseInt(tMatch[1], 10);
    
    if (temp === null) {
        throw new Error("Temperature missing on MeteoAM (Possibile Client-Side Rendering in atto)");
    }
    
    return { name: 'MeteoAM (Aeronautica)', url, prediction: { temp, condition: parseConditionFromText(desc), description: 'Scraping Nodo Istituzionale' } };
}


// --- 4. API ENDPOINT & PARALLEL EXECUTION ---

app.get('/api/scrape', async (req, res) => {
  const rawCity = req.query.q;
  if (!rawCity) return res.status(400).json({ error: 'City is required parameter' });
  
  const normalizedCity = rawCity.toLowerCase().trim();
  
  if (memoryCache.has(normalizedCity)) {
     const cachedData = memoryCache.get(normalizedCity);
     if (Date.now() - cachedData.timestamp < CACHE_TTL_MS) {
         console.log(`[CACHE HIT] Valori estratti dalla memoria per: ${normalizedCity}`);
         return res.json({ forecasts: cachedData.data, _metadata: { cached: true, target: normalizedCity } });
     } else {
         memoryCache.delete(normalizedCity);
     }
  }

  console.log(`[SCRAPE INIT] Scan asincrona online avviata per: ${normalizedCity}`);
  
  // Scrapers list: Avviamo le 4 analisi simultaneamente
  const scrapingTasks = [
      scrapeIlMeteo(rawCity),
      scrape3BMeteo(rawCity),
      scrapeMeteoBlue(rawCity),
      scrapeMeteoAM(rawCity)
  ];
  
  const results = await Promise.allSettled(scrapingTasks);
  
  // Teneiamo solo i prelievi andati a buon fine
  let successfulForecasts = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
    
  // Registriamo i fallimenti specifici (es. blocco Cloudflare o Errori HTML)
  results.filter(r => r.status === 'rejected').forEach(err => {
      console.error(`[SCRAPER FAULT] Errore da un provider:`, err.reason);
  });
    
  if (successfulForecasts.length === 0) {
      return res.status(500).json({ error: 'Tutti gli scraper online sono falliti a causa di protezioni anti-bot. Attivato Fallback Frontend Open-Meteo.' });
  }

  // Caching
  memoryCache.set(normalizedCity, {
      timestamp: Date.now(),
      data: successfulForecasts
  });

  return res.json({ forecasts: successfulForecasts, _metadata: { cached: false, target: normalizedCity } });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 MeteoMix Proxy Scraper v3.0 [LIVE]`);
  console.log(`🛡️  Siti tracciati: iLMeteo | 3BMeteo | meteoblue | MeteoAM`);
  console.log(`⏱️  Prestazioni: Promise.AllSettled() + Caching 15min`);
  console.log(`📡 Rotta abilitata su: http://localhost:${PORT}/api/scrape`);
  console.log(`======================================================\n`);
});
