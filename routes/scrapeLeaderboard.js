import express from 'express';
import puppeteer from 'puppeteer';

const router = express.Router();

router.get('/scrape-leaderboard', async (_req, res) => {
  const URL = 'https://www.velocidrone.com/leaderboard/33/1763/All';
  
  try {
    // Configuración de Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    
    const page = await browser.newPage();
    
    // Configurar como navegador legítimo
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });

    // Navegar a la página
    console.log('Navegando a la página...');
    await page.goto(URL, { 
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Esperar a que carguen las tablas
    console.log('Esperando tablas...');
    await page.waitForSelector('.tab-content', { timeout: 30000 });

    // Función para extraer datos de una pestaña específica
    const extractTabData = async (tabId) => {
      // Activar la pestaña
      await page.click(`a[href="#${tabId}"]`);
      await page.waitForTimeout(2000); // Esperar a que cargue el contenido

      return await page.evaluate((tabId) => {
        const tabContent = document.querySelector(`#${tabId}`);
        if (!tabContent) return [];

        const table = tabContent.querySelector('table');
        if (!table) return [];

        const rows = Array.from(table.querySelectorAll('tbody tr')).slice(0, 20);
        return rows.map(row => {
          const cols = row.querySelectorAll('td');
          return {
            position: cols[0]?.textContent?.trim() || '',
            time: cols[1]?.textContent?.trim() || 'N/A',
            pilot: cols[2]?.textContent?.trim() || 'N/A'
          };
        });
      }, tabId);
    };

    // Extraer datos de ambas pestañas
    const raceModeData = await extractTabData('race-mode-single-class');
    const threeLapData = await extractTabData('three-lap-single-class');

    await browser.close();

    // Verificar resultados
    if (raceModeData.length === 0 && threeLapData.length === 0) {
      throw new Error('No se encontraron datos en ninguna tabla');
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
      suggestion: 'Por favor verifique: 1) La URL 2) Si la página requiere autenticación 3) Si hay protección anti-bots'
    });
  }
});

export default router;