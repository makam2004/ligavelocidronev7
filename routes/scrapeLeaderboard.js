import express from 'express';
import puppeteer from 'puppeteer';

const router = express.Router();

router.get('/scrape-leaderboard', async (_req, res) => {
  const URL = 'https://www.velocidrone.com/leaderboard/33/1763/All';
  
  try {
    // 1. Configuración mejorada de Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new', // Usar el nuevo motor headless
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ],
      timeout: 60000
    });
    
    const page = await browser.newPage();
    
    // 2. Configuración de navegación
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setJavaScriptEnabled(true);
    await page.setViewport({ width: 1366, height: 768 });
    await page.setDefaultNavigationTimeout(60000);

    // 3. Navegación con múltiples estrategias de espera
    console.log('Navegando a la página...');
    await page.goto(URL, { 
      waitUntil: ['domcontentloaded', 'networkidle0'],
      timeout: 60000
    });

    // 4. Espera dinámica mejorada
    const waitForTable = async () => {
      try {
        console.log('Buscando tablas...');
        
        // Estrategia 1: Esperar por cualquier tabla de clasificación
        await page.waitForFunction(() => {
          const tables = document.querySelectorAll('.table, table, .leaderboard-table, .leaderboard');
          return tables.length > 0;
        }, { timeout: 30000 });

        // Estrategia 2: Si falla, buscar por texto característico
        await page.waitForFunction(() => {
          return document.body.textContent.includes('Player') || 
                 document.body.textContent.includes('Time');
        }, { timeout: 30000 });

        return true;
      } catch (e) {
        console.error('Error en waitForTable:', e);
        return false;
      }
    };

    if (!await waitForTable()) {
      throw new Error('No se pudo encontrar ninguna tabla de clasificación');
    }

    // 5. Extracción de datos con múltiples patrones de selectores
    const extractData = async (tabName) => {
      try {
        console.log(`Extrayendo datos de ${tabName}...`);
        
        // Hacer clic en la pestaña si existe
        await page.click(`a[href="#${tabName}"], [data-target="#${tabName}"]`).catch(() => {});
        await page.waitForTimeout(2000);

        return await page.evaluate((tabName) => {
          // Buscar la tabla usando múltiples patrones
          const table = document.querySelector(`#${tabName} table, #${tabName} .table, 
                                             #${tabName} .leaderboard-table, .${tabName}-table`);
          
          if (!table) {
            console.error(`Tabla ${tabName} no encontrada`);
            return [];
          }

          const rows = Array.from(table.querySelectorAll('tr')).slice(0, 20);
          return rows.map(row => {
            const cols = row.querySelectorAll('td');
            if (cols.length < 3) return null;
            
            return {
              position: cols[0]?.textContent?.trim() || '',
              pilot: cols[1]?.textContent?.trim() || 'N/A',
              time: cols[2]?.textContent?.trim() || 'N/A'
            };
          }).filter(item => item && item.pilot !== 'N/A');
        }, tabName);
      } catch (e) {
        console.error(`Error extrayendo ${tabName}:`, e);
        return [];
      }
    };

    // 6. Extraer datos de ambas pestañas
    const [raceModeData, threeLapData] = await Promise.all([
      extractData('race-mode-single-class'),
      extractData('three-lap-single-class')
    ]);

    await browser.close();
    
    // 7. Verificar resultados
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
      suggestion: [
        '1. Verifique que la URL siga siendo válida',
        '2. La página puede requerir autenticación',
        '3. Velocidrone puede estar bloqueando bots',
        '4. Los selectores pueden necesitar actualización'
      ]
    });
  }
});

export default router;