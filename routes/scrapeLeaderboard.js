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
    // Extraer metadatos
    const { escenario, track } = await page.evaluate(() => ({
      escenario: document.querySelector('h2.text-center')?.textContent.trim() || 'Escenario no encontrado',
      track: document.querySelector('div.container h3')?.textContent.trim() || 'Track no encontrado'
    }));

    // Cambiar a pestaña
    await page.evaluate((texto) => {
      const tabs = Array.from(document.querySelectorAll('a'));
      const targetTab = tabs.find(tab => tab.textContent.includes(texto));
      if (targetTab) targetTab.click();
    }, textoPestania);

    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.waitForSelector('tbody tr', { timeout: 10000 });

    // Extraer resultados
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

    return { metadata: { escenario, track }, resultados };
  } finally {
    await browser.close();
  }
}

router.get('/scrape-leaderboard', async (_req, res) => {
  const TRACK1_URL = 'https://www.velocidrone.com/leaderboard/33/1763/All';
  const TRACK2_URL = 'https://www.velocidrone.com/leaderboard/29/217/All'; // Ejemplo segundo track

  try {
    const [raceModeTrack1, threeLapTrack2] = await Promise.all([
      obtenerDatosCompletos(TRACK1_URL, 'Race Mode: Single Class'),
      obtenerDatosCompletos(TRACK2_URL, '3 Lap: Single Class')
    ]);

    res.json({ 
      success: true,
      raceMode: raceModeTrack1,
      threeLap: threeLapTrack2,
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