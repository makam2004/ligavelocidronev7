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
        '--disable-dev-shm-usage',
        '--single-process'
      ]
    });
    
    const page = await browser.newPage();
    
    // 2. Configurar navegador como humano
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });

    // 3. Navegar a la página con esperas inteligentes
    console.log('Navegando a la página...');
    await page.goto(URL, { 
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // 4. Esperar dinámicamente por contenido específico
    console.log('Buscando tablas...');
    await page.waitForFunction(() => {
      const tables = document.querySelectorAll('table');
      return tables.length > 0;
    }, { timeout: 30000 });

    // 5. Extraer datos de ambas pestañas
    const extractTableData = async () => {
      try {
        return await page.evaluate(() => {
          const results = [];
          const tables = document.querySelectorAll('table');
          
          tables.forEach(table => {
            const rows = Array.from(table.querySelectorAll('tr')).slice(1, 21); // Saltar header
            rows.forEach(row => {
              const cols = row.querySelectorAll('td');
              if (cols.length >= 3) {
                results.push({
                  position: cols[0]?.textContent?.trim() || '',
                  time: cols[1]?.textContent?.trim() || 'N/A',
                  pilot: cols[2]?.textContent?.trim() || 'N/A'
                });
              }
            });
          });
          
          return results;
        });
      } catch (e) {
        console.error('Error al extraer datos:', e);
        return [];
      }
    };

    const tableData = await extractTableData();
    await browser.close();

    // 6. Dividir resultados (asumimos que la primera tabla es Race Mode y la segunda es 3 Lap)
    const raceModeData = tableData.slice(0, 20);
    const threeLapData = tableData.slice(20, 40);

    if (raceModeData.length === 0 && threeLapData.length === 0) {
      throw new Error('No se encontraron datos en las tablas');
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
      suggestion: 'La estructura de la página puede haber cambiado. Por favor verifique manualmente.'
    });
  }
});

export default router;