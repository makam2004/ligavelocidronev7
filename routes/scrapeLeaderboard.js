import express from 'express';
import puppeteer from 'puppeteer';

const router = express.Router();

async function obtenerDatosCompletos(url, textoPestania) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  try {
    // 1. Extraer información del escenario y track
    const { escenario, track } = await page.evaluate(() => {
      return {
        escenario: document.querySelector('h2.text-center')?.textContent.trim() || 'Escenario no encontrado',
        track: document.querySelector('div.container h3')?.textContent.trim() || 'Track no encontrado'
      };
    });

    // 2. Cambiar a la pestaña solicitada
    await page.evaluate((texto) => {
      const tabs = Array.from(document.querySelectorAll('a'));
      const targetTab = tabs.find(tab => tab.textContent.includes(texto));
      if (targetTab) targetTab.click();
    }, textoPestania);

    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.waitForSelector('tbody tr', { timeout: 10000 });

    // 3. Extraer datos de la tabla
    const resultados = await page.evaluate(() => {
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

    return { escenario, track, resultados };
  } finally {
    await browser.close();
  }
}

router.get('/scrape-leaderboard', async (_req, res) => {
  const URL = 'https://www.velocidrone.com/leaderboard/33/1763/All';
  
  try {
    // Obtener datos de ambas pestañas
    const [raceMode, threeLap] = await Promise.all([
      obtenerDatosCompletos(URL, 'Race Mode: Single Class'),
      obtenerDatosCompletos(URL, '3 Lap: Single Class')
    ]);

    res.json({ 
      success: true,
      metadata: {
        escenario: raceMode.escenario, // "Dynamic Weather"
        track: raceMode.track          // "SGDC Floodlit BQE March 2025"
      },
      raceMode: raceMode.resultados,
      threeLap: threeLap.resultados,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener datos',
      details: error.message
    });
  }
});

export default router;