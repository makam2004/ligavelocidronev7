import express from 'express';
import puppeteer from 'puppeteer';

const router = express.Router();

router.get('/scrape-leaderboard', async (_req, res) => {
  const URL = 'https://www.velocidrone.com/leaderboard/33/1763/All';
  
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Configurar User-Agent y esperar selectores dinámicos
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Esperar a que las tablas se carguen
    await page.waitForSelector('#race-mode-single-class', { timeout: 5000 });
    await page.waitForSelector('#three-lap-single-class', { timeout: 5000 });

    // Extraer datos con selectores mejorados
    const raceModeData = await page.evaluate(() => {
      const table = document.querySelector('#race-mode-single-class');
      return Array.from(table.querySelectorAll('tbody tr')).slice(0, 20).map(row => {
        const cols = row.querySelectorAll('td');
        return {
          pilot: cols[1]?.textContent?.trim() || 'N/A',
          time: cols[2]?.textContent?.trim() || 'N/A'
        };
      });
    });

    const threeLapData = await page.evaluate(() => {
      const table = document.querySelector('#three-lap-single-class');
      return Array.from(table.querySelectorAll('tbody tr')).slice(0, 20).map(row => {
        const cols = row.querySelectorAll('td');
        return {
          pilot: cols[1]?.textContent?.trim() || 'N/A',
          time: cols[2]?.textContent?.trim() || 'N/A'
        };
      });
    });

    await browser.close();
    
    res.json({ 
      raceMode: raceModeData.filter(item => item.pilot !== 'N/A'), 
      threeLap: threeLapData.filter(item => item.pilot !== 'N/A') 
    });

  } catch (error) {
    console.error('Error en scraping:', error);
    res.status(500).json({ 
      error: 'Error al obtener datos', 
      details: error.message 
    });
  }
});

export default router;