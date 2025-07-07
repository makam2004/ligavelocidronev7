import express from 'express';
import puppeteer from 'puppeteer';

const router = express.Router();

router.get('/scrape-leaderboard', async (_req, res) => {
  const URL = 'https://www.velocidrone.com/leaderboard/33/1763/All';
  
  try {
    // 1. Configuración mejorada de Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ],
      timeout: 60000
    });
    
    const page = await browser.newPage();
    
    // 2. Configurar navegador como humano
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setJavaScriptEnabled(true);
    await page.setViewport({ width: 1366, height: 768 });
    await page.setDefaultNavigationTimeout(60000);

    // 3. Navegar a la página con espera inteligente
    console.log('Navegando a la página...');
    await page.goto(URL, { 
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // 4. Esperar específicamente por los elementos de la tabla
    console.log('Esperando tablas...');
    await page.waitForFunction(() => {
      const headers = Array.from(document.querySelectorAll('th'));
      return headers.some(header => header.textContent.includes('Time')) && 
             headers.some(header => header.textContent.includes('Player'));
    }, { timeout: 30000 });

    // 5. Extraer datos de ambas pestañas
    const extractTableData = async (tabName) => {
      try {
        // Cambiar a la pestaña correspondiente
        await page.click(`a[href="#${tabName}"]`).catch(() => {});
        await page.waitForTimeout(2000); // Esperar a que cargue el contenido

        return await page.evaluate((tabName) => {
          const table = document.querySelector(`#${tabName} table`);
          if (!table) return [];

          const rows = Array.from(table.querySelectorAll('tbody tr')).slice(0, 20);
          return rows.map(row => {
            const cols = row.querySelectorAll('td');
            return {
              position: cols[0]?.textContent?.trim() || '',
              time: cols[1]?.textContent?.trim() || 'N/A',
              pilot: cols[2]?.textContent?.trim() || 'N/A',
              country: cols[3]?.textContent?.trim() || '',
              ranking: cols[4]?.textContent?.trim() || '',
              model: cols[5]?.textContent?.trim() || '',
              date: cols[6]?.textContent?.trim() || ''
            };
          }).filter(item => item.pilot !== 'N/A');
        }, tabName);
      } catch (e) {
        console.error(`Error extrayendo ${tabName}:`, e);
        return [];
      }
    };

    // 6. Extraer datos de ambas pestañas
    const [raceModeData, threeLapData] = await Promise.all([
      extractTableData('race-mode-single-class'),
      extractTableData('three-lap-single-class')
    ]);

    await browser.close();
    
    // 7. Formatear respuesta
    const response = {
      success: true,
      raceMode: raceModeData.map(item => ({
        position: item.position,
        pilot: item.pilot,
        time: item.time
      })),
      threeLap: threeLapData.map(item => ({
        position: item.position,
        pilot: item.pilot,
        time: item.time
      })),
      fullDataAvailable: raceModeData.length > 0 || threeLapData.length > 0,
      timestamp: new Date().toISOString()
    };

    if (!response.fullDataAvailable) {
      throw new Error('No se encontraron datos en el formato esperado');
    }

    res.json(response);

  } catch (error) {
    console.error('Error general:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener datos',
      details: error.message,
      suggestion: 'Por favor verifica que: 1) La URL sea correcta, 2) No haya protección anti-bots, 3) Los selectores coincidan con la estructura actual'
    });
  }
});

export default router;