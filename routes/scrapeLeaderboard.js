import express from 'express';
import puppeteer from 'puppeteer';

const router = express.Router();

router.get('/scrape-leaderboard', async (_req, res) => {
  const URL = 'https://www.velocidrone.com/leaderboard/33/1763/All';
  
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    const page = await browser.newPage();
    
    // Configuración importante para evitar bloqueos
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setJavaScriptEnabled(true);
    await page.setViewport({ width: 1366, height: 768 });

    // Navegación con timeout extendido
    await page.goto(URL, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Esperar dinámicamente a que aparezcan los datos
    const waitForTableData = async (selector) => {
      await page.waitForFunction(
        selector => {
          const table = document.querySelector(selector);
          return table && table.querySelectorAll('tbody tr').length > 0;
        },
        { timeout: 15000 },
        selector
      );
    };

    // Extracción de datos mejorada
    const extractTableData = async (selector) => {
      try {
        await waitForTableData(selector);
        return await page.evaluate((selector) => {
          const rows = Array.from(document.querySelectorAll(`${selector} tbody tr`));
          return rows.slice(0, 20).map(row => {
            const cols = row.querySelectorAll('td');
            return {
              pilot: cols[1]?.textContent?.trim() || 'N/A',
              time: cols[2]?.textContent?.trim() || 'N/A'
            };
          }).filter(item => item.pilot !== 'N/A');
        }, selector);
      } catch (error) {
        console.error(`Error extracting ${selector}:`, error);
        return [];
      }
    };

    const [raceModeData, threeLapData] = await Promise.all([
      extractTableData('.tab-pane#race-mode-single-class'),
      extractTableData('.tab-pane#three-lap-single-class')
    ]);

    await browser.close();
    
    res.json({ 
      raceMode: raceModeData,
      threeLap: threeLapData,
      message: raceModeData.length === 0 && threeLapData.length === 0 
        ? 'No se encontraron datos. La estructura de la página puede haber cambiado.'
        : 'Datos obtenidos correctamente'
    });

  } catch (error) {
    console.error('Error general:', error);
    res.status(500).json({ 
      error: 'Error al obtener datos',
      details: error.message,
      solution: 'Intente nuevamente más tarde o verifique si la página ha cambiado su estructura'
    });
  }
});

export default router;