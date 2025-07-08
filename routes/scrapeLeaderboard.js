import express from 'express';
import puppeteer from 'puppeteer';

const router = express.Router();

router.get('/scrape-leaderboard', async (_req, res) => {
  const URL = 'https://www.velocidrone.com/leaderboard/33/1763/All';
  
  try {
    // Configuración mejorada para producción
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ],
      timeout: 60000
    });
    
    const page = await browser.newPage();
    
    // Configurar navegación
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setJavaScriptEnabled(true);
    await page.setViewport({ width: 1366, height: 768 });
    await page.setDefaultNavigationTimeout(60000);

    // Navegar a la página
    console.log('Navegando a la página...');
    const response = await page.goto(URL, { 
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    if (!response.ok()) {
      throw new Error(`HTTP ${response.status()} - ${response.statusText()}`);
    }

    // Esperar por contenido específico
    console.log('Esperando contenido...');
    await page.waitForSelector('table', { timeout: 30000 });

    // Función de delay alternativa (para versiones antiguas de Puppeteer)
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    // Extraer datos
    const extractTableData = async (tabName) => {
      try {
        // Cambiar a la pestaña si existe
        const tabSelector = `a[href="#${tabName}"]`;
        if (await page.$(tabSelector)) {
          await page.click(tabSelector);
          await delay(2000); // Espera alternativa
        }

        return await page.evaluate((tabName) => {
          const table = document.querySelector(`#${tabName} table`);
          if (!table) return [];

          const rows = Array.from(table.querySelectorAll('tbody tr')).slice(0, 20);
          return rows.map(row => {
            const cols = row.querySelectorAll('td');
            if (cols.length < 3) return null;
            
            return {
              position: cols[0]?.textContent?.trim() || '',
              time: cols[1]?.textContent?.trim() || 'N/A',
              pilot: cols[2]?.textContent?.trim() || 'N/A'
            };
          }).filter(Boolean);
        }, tabName);
      } catch (e) {
        console.error(`Error extrayendo ${tabName}:`, e);
        return [];
      }
    };

    // Extraer datos
    const [raceModeData, threeLapData] = await Promise.all([
      extractTableData('race-mode-single-class'),
      extractTableData('three-lap-single-class')
    ]);

    await browser.close();

    // Verificar datos
    if (raceModeData.length === 0 && threeLapData.length === 0) {
      throw new Error('No se encontraron datos válidos');
    }

    res.json({ 
      success: true,
      raceMode: raceModeData,
      threeLap: threeLapData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error general:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener datos',
      details: error.message,
      suggestion: 'Intente nuevamente más tarde o contacte al soporte'
    });
  }
});

export default router;