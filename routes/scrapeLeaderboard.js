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
    
    // Configuración para evitar detección como bot
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });

    // Navegar a la página con timeout extendido
    await page.goto(URL, { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Esperar a que las tablas estén presentes
    await page.waitForSelector('.leaderboard-table', { timeout: 15000 });

    // Función para extraer datos de una tabla específica
    const extractTableData = async (tabId) => {
      // Hacer clic en la pestaña para activarla
      await page.click(`a[href="#${tabId}"]`);
      await page.waitForTimeout(1000); // Esperar a que cargue el contenido

      return await page.evaluate((tabId) => {
        const table = document.querySelector(`#${tabId} .leaderboard-table`);
        if (!table) return [];

        const rows = Array.from(table.querySelectorAll('tbody tr')).slice(0, 20);
        return rows.map(row => {
          const cols = row.querySelectorAll('td');
          return {
            position: cols[0]?.textContent?.trim() || '',
            pilot: cols[1]?.textContent?.trim() || 'N/A',
            time: cols[2]?.textContent?.trim() || 'N/A'
          };
        });
      }, tabId);
    };

    // Extraer datos de ambas pestañas
    const raceModeData = await extractTableData('race-mode-single-class');
    const threeLapData = await extractTableData('three-lap-single-class');

    await browser.close();
    
    res.json({ 
      success: true,
      raceMode: raceModeData.filter(item => item.pilot !== 'N/A'),
      threeLap: threeLapData.filter(item => item.pilot !== 'N/A'),
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en scraping:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener datos',
      details: error.message,
      suggestion: 'La estructura de la página puede haber cambiado. Verifique manualmente los selectores.'
    });
  }
});

export default router;