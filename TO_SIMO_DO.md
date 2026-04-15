# AZIONI MANUALI PER DEPLOY (Vercel)

Hai scelto la via più semplice! Ora avrai frontend e backend in un unico posto.

## 1. Pubblicazione su Vercel
1. Vai su [Vercel.com](https://vercel.com) e accedi con GitHub.
2. Clicca su **"Add New" > "Project"**.
3. Importa il tuo repository `MeteoMix.github.io`.
4. **Framework Preset**: Vercel dovrebbe rilevare automaticamente "Vite".
5. Clicca su **Deploy**.

## 2. Configurazione (Opzionale)
Non servono variabili d'ambiente poiché il frontend ora chiama il backend tramite un percorso relativo `/api/scrape`. Vercel gestisce tutto automaticamente.

## 3. Dominio Personalizzato
Se vuoi che il sito risponda a `meteomix.github.io`, dovrai configurarlo nelle impostazioni di Vercel, ma ti consiglio di usare l'URL che ti darà Vercel (es: `meteomix.vercel.app`) perché è molto più veloce da configurare.

## 4. Aggiornamenti Futuri
Ogni volta che farai un push su GitHub:
```bash
git add .
git commit -m "Deploy to Vercel"
git push origin main
```
Vercel aggiornerà automaticamente sia il sito che le API!
- Riavviare il server con 'npm run dev:server' per applicare la rimozione dei dati fake e testare la visualizzazione pulita dei soli dati reali.
