import express from 'express';
import puppeteer from 'puppeteer';

const router = express.Router();

router.get('/scrape-leaderboard', async (_req, res) => {
  const URL = 'https://www.velocidrone.com/leaderboard/33/1763/All';
  
  try {
    // 1. Configuración optimizada
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    
    const page = await browser.newPage();
    
    // 2. Configuración stealth
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });

    // 3. Navegación con timeout extendido
    console.log('Cargando página...');
    await page.goto(URL, { 
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // 4. Esperar a que cargue el contenido dinámico
    console.log('Esperando tablas...');
    await page.waitForFunction(() => {
      const tables = document.querySelectorAll('.leaderboard-table');
      return tables.length >= 2;
    }, { timeout: 30000 });

    // 5. Extracción directa basada en estructura actual
    const leaderboardData = await page.evaluate(() => {
      const result = { raceMode: [], threeLap: [] };
      const tabs = document.querySelectorAll('.nav-tabs .nav-item');
      
      tabs.forEach((tab, index) => {
        const tabName = tab.textContent.trim();
        const table = document.querySelectorAll('.leaderboard-table')[index];
        
        if (table) {
          const rows = Array.from(table.querySelectorAll('tbody tr'));
          rows.slice(0, 20).forEach(row => {
            const cols = row.querySelectorAll('td');
            const entry = {
              position: cols[0]?.textContent?.trim() || '',
              time: cols[1]?.textContent?.trim() || 'N/A',
              pilot: cols[2]?.textContent?.trim() || 'N/A'
            };
            
            if (tabName.includes('Race Mode')) {
              result.raceMode.push(entry);
            } else if (tabName.includes('3 Lap')) {
              result.threeLap.push(entry);
            }
          });
        }
      });
      
      return result;
    });

    await browser.close();

    // 6. Validación de resultados
    if (leaderboardData.raceMode.length === 0 && leaderboardData.threeLap.length === 0) {
      throw new Error('No se encontraron datos en las tablas');
    }

    res.json({ 
      success: true,
      raceMode: leaderboardData.raceMode,
      threeLap: leaderboardData.threeLap,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener datos',
      details: error.message,
      suggestion: 'Por favor verifique: 1) La URL es correcta 2) La estructura no ha cambiado'
    });
  }
});

export default router;