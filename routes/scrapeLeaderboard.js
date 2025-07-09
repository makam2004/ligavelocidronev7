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
      timeout: 120000
    });
    
    const page = await browser.newPage();
    
    // 2. Configuración stealth avanzada
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setJavaScriptEnabled(true);
    await page.setViewport({ width: 1366, height: 768 });
    await page.setDefaultNavigationTimeout(120000);

    // 3. Navegación con espera inteligente
    console.log('Navegando a la página...');
    await page.goto(URL, { 
      waitUntil: 'networkidle2',
      timeout: 120000
    });

    // 4. Esperar a que cargue el contenido dinámico
    console.log('Esperando contenido...');
    await page.waitForFunction(() => {
      return document.querySelector('table') || 
             document.body.textContent.includes('Time');
    }, { timeout: 30000 });

    // 5. Extracción de datos mejorada
    const extractData = async (tabName) => {
      try {
        // Intentar activar la pestaña si existe
        const tabSelector = `a[href="#${tabName}"], [data-target="#${tabName}"], [aria-controls="${tabName}"]`;
        const tabElement = await page.$(tabSelector);
        
        if (tabElement) {
          await tabElement.click();
          await page.waitForTimeout(5000); // Espera generosa para carga
        }

        return await page.evaluate((tabName) => {
          // Buscar la tabla activa o dentro del contenedor de pestaña
          const tabContent = document.querySelector(`#${tabName}`) || 
                            document.querySelector('.tab-pane.active') || 
                            document.querySelector('.active.tab-pane');
          
          const table = tabContent ? tabContent.querySelector('table') : document.querySelector('table');
          if (!table) return [];

          const rows = Array.from(table.querySelectorAll('tbody tr')).slice(0, 20);
          return rows.map(row => {
            const cols = row.querySelectorAll('td');
            return {
              position: cols[0]?.textContent?.trim() || '',
              time: cols[1]?.textContent?.trim() || 'N/A',
              pilot: cols[2]?.textContent?.trim() || 'N/A'
            };
          });
        }, tabName);
      } catch (e) {
        console.error(`Error en ${tabName}:`, e.message);
        return [];
      }
    };

    // 6. Extraer datos con múltiples intentos
    let raceModeData = [];
    let threeLapData = [];
    let attempts = 0;
    
    while (attempts < 3 && (raceModeData.length === 0 || threeLapData.length === 0)) {
      attempts++;
      console.log(`Intento ${attempts} de extracción...`);
      
      if (raceModeData.length === 0) {
        raceModeData = await extractData('race-mode-single-class');
      }
      
      if (threeLapData.length === 0) {
        threeLapData = await extractData('three-lap-single-class');
      }
      
      if (raceModeData.length === 0 && threeLapData.length === 0) {
        await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForTimeout(5000);
      }
    }

    await browser.close();

    // 7. Validación final
    if (raceModeData.length === 0 && threeLapData.length === 0) {
      throw new Error('No se encontraron datos después de 3 intentos');
    }

    res.json({ 
      success: true,
      raceMode: raceModeData,
      threeLap: threeLapData,
      timestamp: new Date().toISOString(),
      attempts: attempts
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