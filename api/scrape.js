import axios from 'axios';
import * as cheerio from 'cheerio';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// --- 1. CONFIGURATION & CACHE (Vercel has dynamic instances, so this is per-instance memory) ---
const CACHE_TTL_MS = 15 * 60 * 1000;
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
        timeout: 8000,
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
      if (attempt > retries) throw new Error(`Fetch failed after ${retries} retries: ${err.message}`);
      await new Promise(r => setTimeout(r, attempt * 500));
    }
  }
}

function parseConditionFromText(text) {
    const t = (text || '').toLowerCase();
    if (t.match(/pioggia|piove|temporale|rovesci|acquazzone|rain|shower|storm/)) return 'Rainy';
    if (t.match(/nuvol|coperto|nebbia|cloud|overcast|fog/)) return 'Cloudy';
    if (t.match(/sereno|sole|limpido|sun|clear|fair/)) return 'Sunny';
    return 'Cloudy';
}

function translateCondition(condition) {
    switch(condition) {
        case 'Sunny': return 'Soleggiato';
        case 'Cloudy': return 'Nuvoloso';
        case 'Rainy': return 'Piovoso';
        default: return 'Nuvoloso';
    }
}

async function fetchWithCurl(url) {
    try {
        const { stdout } = await execAsync(`curl -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36" -m 10 "${url}"`);
        return stdout;
    } catch (error) {
        throw new Error("cURL error: " + error.message);
    }
}

// --- 3. SCRAPING STRATEGIES ---

async function scrapeIlMeteo(cityRaw) {
    const url = `https://www.ilmeteo.it/meteo/${encodeURIComponent(cityRaw.trim().replace(/\s+/g, '-'))}`;
    try {
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
        if (temp === null) throw new Error("Temp not found");
        const cond = parseConditionFromText(desc);
        return { name: 'iLMeteo.it', url, prediction: { temp, condition: cond, description: translateCondition(cond) } };
    } catch (err) {
        throw err;
    }
}

async function scrapeWttr(cityRaw) {
    const url = `https://wttr.in/${encodeURIComponent(cityRaw.trim())}?format=j1`;
    try {
      const jsonStr = await fetchWithCurl(url);
        const data = JSON.parse(jsonStr);
        const current = data.current_condition[0];
        const temp = parseInt(current.temp_C, 10);
        const humidity = parseInt(current.humidity, 10);
        const windSpeed = parseInt(current.windspeedKmph, 10);
        const precipitation = parseFloat(current.precipMM);
        
        const high = parseInt(data.weather[0].maxtempC, 10);
        const low = parseInt(data.weather[0].mintempC, 10);

        const descObj = current.weatherDesc[0].value;
        if (isNaN(temp)) throw new Error("Temp not found");
        const cond = parseConditionFromText(descObj);
        return { 
           name: 'Wttr.in (WorldWeather)', 
           url: `https://wttr.in/${encodeURIComponent(cityRaw.trim())}`, 
           prediction: { 
             temp, condition: cond, description: translateCondition(cond),
             humidity, windSpeed, precipitation, high, low
           } 
        };
    } catch (err) {
        throw err;
    }
}

async function getCoordinates(cityRaw) {
    try {
        const geoData = await fetchWithRetry(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityRaw)}&count=1&language=it`, 2);
        if (!geoData.results || geoData.results.length === 0) throw new Error("Coordinate non trovate");
        return geoData.results[0]; // { latitude, longitude }
    } catch(err) {
        throw new Error("Errore geocoding: " + err.message);
    }
}

async function scrapeYrNo(cityRaw) {
    try {
        const coords = await getCoordinates(cityRaw);
        // Yr.no api needs a custom user-agent!
        const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${coords.latitude}&lon=${coords.longitude}`;
        const jsonStr = await fetchWithCurl(url);
        const data = JSON.parse(jsonStr);
        const details = data.properties.timeseries[0].data.instant.details;
        const temp = Math.round(details.air_temperature);
        const humidity = Math.round(details.relative_humidity);
        const windSpeed = Math.round(details.wind_speed * 3.6); // m/s to km/h
        const precipitation = data.properties.timeseries[0].data.next_1_hours?.details?.precipitation_amount || 0;

        const symbol = data.properties.timeseries[0].data.next_1_hours?.summary?.symbol_code || data.properties.timeseries[0].data.next_6_hours?.summary?.symbol_code || 'cloudy';
        const cond = parseConditionFromText(symbol);
        return { 
           name: 'Yr.no (MET Norway)', 
           url: `https://www.yr.no/en/forecast/daily-table/${coords.latitude},${coords.longitude}`, 
           prediction: { 
             temp, condition: cond, description: translateCondition(cond),
             humidity, windSpeed, precipitation
           } 
        };
    } catch(err) {
        console.warn(`[SCRAPE FAIL] Yr.no per ${cityRaw}:`, err.message);
        throw err;
    }
}

async function scrape7Timer(cityRaw) {
    try {
        const coords = await getCoordinates(cityRaw);
        const url = `http://www.7timer.info/bin/api.pl?lon=${coords.longitude}&lat=${coords.latitude}&product=civil&output=json`;
        const jsonStr = await fetchWithCurl(url);
        const data = JSON.parse(jsonStr);
        const temp = data.dataseries[0].temp2m;
        const windPower = data.dataseries[0].wind10m.speed;
        let windSpeed = 10;
        if (windPower < 3) windSpeed = 10;
        else if (windPower < 5) windSpeed = 20;
        else windSpeed = 40;
        
        const humidity = parseInt(data.dataseries[0].rh2m.replace(/\D/g, ''), 10) || 50;

        const weatherObj = data.dataseries[0].weather;
        const cond = parseConditionFromText(weatherObj);
        return { 
           name: '7Timer! (NOAA)', 
           url: `http://www.7timer.info/`, 
           prediction: { 
             temp, condition: cond, description: translateCondition(cond),
             humidity, windSpeed
           } 
        };
    } catch(err) {
        console.warn(`[SCRAPE FAIL] 7Timer per ${cityRaw}:`, err.message);
        throw err;
    }
}

async function scrapeMeteoGiuliacci(cityRaw) {
    const url = `https://www.meteogiuliacci.it/meteo/${encodeURIComponent(cityRaw.trim().toLowerCase().replace(/\s+/g, '-'))}`;
    try {
        const html = await fetchWithRetry(url, 2);
        const $ = cheerio.load(html);
        let temp = null;
        let desc = $('meta[name="description"]').attr('content') || '';
        
        const ht = $('.hot-temp').first().text().replace(/[^\d]/g, '');
        if (ht) temp = parseInt(ht, 10);
        
        if (temp === null) throw new Error("Temp not found");
        const cond = parseConditionFromText(desc);
        return { name: 'MeteoGiuliacci', url, prediction: { temp, condition: cond, description: translateCondition(cond) } };
    } catch (err) {
        throw err;
    }
}

// Rimosso MeteoAM che falliva frequentemente
async function scrapeMeteoAM(cityRaw) {
    throw new Error("Deprecato per inaffidabilità SPA");
}

// --- Handler (Vercel Serverless Function) ---
export default async function handler(req, res) {
  // Configura CORS per Vercel
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const rawCity = req.query.q;
  if (!rawCity) return res.status(400).json({ error: 'City is required parameter' });
  
  const normalizedCity = rawCity.toLowerCase().trim();
  
  if (memoryCache.has(normalizedCity)) {
     const cachedData = memoryCache.get(normalizedCity);
     if (Date.now() - cachedData.timestamp < CACHE_TTL_MS) {
         return res.json({ forecasts: cachedData.data, _metadata: { cached: true, target: normalizedCity } });
     }
  }

  const results = await Promise.allSettled([
      scrapeIlMeteo(rawCity),
      scrapeWttr(rawCity),
      scrapeMeteoGiuliacci(rawCity),
      scrapeYrNo(rawCity),
      scrape7Timer(rawCity)
  ]);
  
  const successfulForecasts = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
    
  if (successfulForecasts.length === 0) {
      return res.status(500).json({ error: 'Completamente bloccato. Server Proxy incapace di eludere.' });
  }

  memoryCache.set(normalizedCity, {
      timestamp: Date.now(),
      data: successfulForecasts
  });

  return res.json({ forecasts: successfulForecasts, _metadata: { cached: false, target: normalizedCity } });
}
