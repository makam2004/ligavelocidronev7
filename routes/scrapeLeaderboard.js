import express from 'express';
import puppeteer from 'puppeteer';

const router = express.Router();

// Función de delay mejorada
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

router.get('/scrape-leaderboard', async (_req, res) => {
  const URL = 'https://www.velocidrone.com/leaderboard/33/1763/All';
  
  try {
    // 1. Configuración optimizada para Render.com
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    });
    
    const page = await browser.newPage();
    
    // 2. Configuración de navegación
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setJavaScriptEnabled(true);
    await page.setViewport({ width: 1280, height: 800 });
    await page.setDefaultNavigationTimeout(60000);

    // 3. Navegación con múltiples estrategias de espera
    console.log('Navegando a la página...');
    await page.goto(URL, { 
      waitUntil: ['domcontentloaded', 'networkidle0'],
      timeout: 60000
    });

    // 4. Espera flexible para contenido dinámico
    console.log('Esperando contenido...');
    try {
      // Estrategia 1: Esperar por cualquier tabla
      await page.waitForSelector('table', { timeout: 30000 });
    } catch (e) {
      // Estrategia 2: Esperar por texto característico
      await page.waitForFunction(
        () => document.body.textContent.includes('Time') && 
              document.body.textContent.includes('Player'),
        { timeout: 30000 }
      );
    }

    // 5. Extracción de datos mejorada
    const extractData = async (tabId) => {
      try {
        // Intentar activar la pestaña
        const tabSelector = `a[href="#${tabId}"], [data-target="#${tabId}"]`;
        await page.click(tabSelector).catch(() => {});
        await delay(3000); // Espera generosa para carga dinámica

        return await page.evaluate((tabId) => {
          const tabContent = document.querySelector(`#${tabId}`);
          if (!tabContent) return [];

          const table = tabContent.querySelector('table');
          if (!table) return [];

          const rows = Array.from(table.querySelectorAll('tr')).slice(1, 21); // Excluir header
          return rows.map(row => {
            const cols = row.querySelectorAll('td');
            return {
              position: cols[0]?.textContent?.trim() || '',
              time: cols[1]?.textContent?.trim() || 'N/A',
              pilot: cols[2]?.textContent?.trim() || 'N/A'
            };
          }).filter(item => item.pilot !== 'N/A');
        }, tabId);
      } catch (e) {
        console.error(`Error en pestaña ${tabId}:`, e);
        return [];
      }
    };

    // 6. Extracción paralela con manejo de errores individual
    const [raceModeData, threeLapData] = await Promise.all([
      extractData('race-mode-single-class'),
      extractData('three-lap-single-class')
    ]);

    await browser.close();

    // 7. Validación de resultados
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
      suggestion: 'Recomendaciones: 1) Verificar URL 2) Intentar nuevamente 3) Contactar soporte si persiste'
    });
  }
});

export default router;