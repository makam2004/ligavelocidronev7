import express from 'express';
import puppeteer from 'puppeteer';

const router = express.Router();

async function obtenerDatosPestania(url, textoPestania) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  try {
    // 1. Hacer clic en la pestaña correcta
    await page.evaluate((texto) => {
      const tabs = Array.from(document.querySelectorAll('a'));
      const targetTab = tabs.find(tab => tab.textContent.includes(texto));
      if (targetTab) targetTab.click();
    }, textoPestania);

    // 2. Esperar a que cargue el contenido
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.waitForSelector('tbody tr', { timeout: 10000 });

    // 3. Extraer datos de la tabla
    return await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.slice(0, 20).map(row => {
        const cols = row.querySelectorAll('td');
        return {
          position: cols[0]?.textContent?.trim() || '',
          time: cols[1]?.textContent?.trim() || 'N/A',
          pilot: cols[2]?.textContent?.trim() || 'N/A'
        };
      });
    });
  } finally {
    await browser.close();
  }
}

router.get('/scrape-leaderboard', async (_req, res) => {
  const URL = 'https://www.velocidrone.com/leaderboard/33/1763/All';
  
  try {
    // Obtener datos de ambas pestañas
    const [raceModeData, threeLapData] = await Promise.all([
      obtenerDatosPestania(URL, 'Race Mode: Single Class'),
      obtenerDatosPestania(URL, '3 Lap: Single Class')
    ]);

    // Validar resultados
    if (raceModeData.length === 0 && threeLapData.length === 0) {
      throw new Error('No se encontraron datos en ninguna pestaña');
    }

    res.json({ 
      success: true,
      raceMode: raceModeData,
      threeLap: threeLapData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener datos',
      details: error.message,
      suggestion: 'Por favor verifique la URL y la estructura de la página'
    });
  }
});

export default router;