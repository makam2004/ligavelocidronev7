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
      timeout: 60000
    });
    
    const page = await browser.newPage();
    
    // 2. Configurar como navegador real
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });
    await page.setDefaultNavigationTimeout(60000);

    // 3. Navegación con espera inteligente
    console.log('Cargando página...');
    await page.goto(URL, { 
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // 4. Esperar dinámicamente por contenido
    console.log('Buscando tablas...');
    await page.waitForFunction(() => {
      const tables = document.querySelectorAll('.table-responsive table');
      return tables.length >= 2; // Debería haber al menos 2 tablas
    }, { timeout: 30000 });

    // 5. Extraer datos con selectores actualizados
    const extractTableData = async (index) => {
      return await page.evaluate((index) => {
        const tables = document.querySelectorAll('.table-responsive table');
        if (index >= tables.length) return [];
        
        const rows = Array.from(tables[index].querySelectorAll('tbody tr'));
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
      }, index);
    };

    // 6. Extraer ambas tablas (índice 0 = Race Mode, 1 = 3 Lap)
    const [raceModeData, threeLapData] = await Promise.all([
      extractTableData(0),
      extractTableData(1)
    ]);

    await browser.close();

    // 7. Validar y enviar respuesta
    if (raceModeData.length === 0 && threeLapData.length === 0) {
      throw new Error('Las tablas no contenían datos válidos');
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
      suggestion: 'Por favor verifique: 1) La URL es correcta 2) La estructura no ha cambiado 3) No hay protección anti-bots'
    });
  }
});

export default router;