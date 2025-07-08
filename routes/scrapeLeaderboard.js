import express from 'express';
import puppeteer from 'puppeteer';

const router = express.Router();

router.get('/scrape-leaderboard', async (_req, res) => {
  const URL = 'https://www.velocidrone.com/leaderboard/33/1763/All';
  
  try {
    // 1. Configuración mejorada para producción
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ],
      timeout: 90000
    });
    
    const page = await browser.newPage();
    
    // 2. Configuración stealth avanzada
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setJavaScriptEnabled(true);
    await page.setViewport({ width: 1280, height: 800 });
    await page.setDefaultNavigationTimeout(90000);

    // 3. Navegación con espera inteligente
    console.log('Cargando página...');
    await page.goto(URL, { 
      waitUntil: 'networkidle2',
      timeout: 90000
    });

    // 4. Extracción específica para Velocidrone (basado en tu imagen)
    const extractTableData = async (tabName) => {
      try {
        // Hacer clic en la pestaña correspondiente
        await page.click(`a[href="#${tabName}"]`);
        await page.waitForTimeout(3000); // Espera generosa para carga dinámica

        return await page.evaluate(() => {
          const table = document.querySelector('.tab-pane.active table');
          if (!table) return [];

          const rows = Array.from(table.querySelectorAll('tbody tr'));
          return rows.slice(0, 20).map(row => {
            const cols = row.querySelectorAll('td');
            return {
              position: cols[0]?.textContent?.trim() || '',
              time: cols[1]?.textContent?.trim() || 'N/A',
              pilot: cols[2]?.textContent?.trim() || 'N/A',
              country: cols[3]?.textContent?.trim() || '',
              model: cols[4]?.textContent?.trim() || ''
            };
          });
        });
      } catch (e) {
        console.error(`Error en ${tabName}:`, e);
        return [];
      }
    };

    // 5. Extraer datos secuencialmente (más confiable que Promise.all)
    console.log('Extrayendo Race Mode...');
    const raceModeData = await extractTableData('race-mode-single-class');
    
    console.log('Extrayendo 3 Lap...');
    const threeLapData = await extractTableData('three-lap-single-class');

    await browser.close();

    // 6. Validación de resultados
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
      suggestion: 'Por favor verifique: 1) La URL es correcta 2) La estructura no ha cambiado 3) No hay protección anti-bots'
    });
  }
});

export default router;