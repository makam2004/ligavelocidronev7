import express from 'express';
import puppeteer from 'puppeteer';

const router = express.Router();

router.get('/scrape-leaderboard', async (_req, res) => {
  const URL = 'https://www.velocidrone.com/leaderboard/33/1763/All';
  
  try {
    // 1. Configuración mejorada
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    
    const page = await browser.newPage();
    
    // 2. Configurar como navegador real
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });

    // 3. Navegar a la página
    console.log('Cargando página...');
    await page.goto(URL, { 
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // 4. Función mejorada para extraer datos de cada pestaña
    const extractTabData = async (tabId, tabName) => {
      try {
        console.log(`Procesando pestaña: ${tabName}`);
        
        // Hacer clic en la pestaña usando diferentes selectores posibles
        const tabSelectors = [
          `a[href="#${tabId}"]`,
          `button[data-target="#${tabId}"]`,
          `li a[aria-controls="${tabId}"]`
        ];

        for (const selector of tabSelectors) {
          try {
            await page.click(selector);
            await page.waitForTimeout(3000); // Espera para carga dinámica
            break;
          } catch (e) {
            console.log(`Selector ${selector} no funcionó, probando siguiente...`);
          }
        }

        // Extraer datos con verificación de pestaña activa
        return await page.evaluate((expectedTabId) => {
          // Verificar que la pestaña correcta está activa
          const activeTab = document.querySelector('.nav-link.active, .nav-item.active a');
          if (activeTab && !activeTab.getAttribute('href')?.includes(expectedTabId)) {
            console.warn(`Pestaña activa no coincide: ${activeTab.getAttribute('href')}`);
            return [];
          }

          const table = document.querySelector('.tab-content .tab-pane.active table, .tab-pane.active table');
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
        }, tabId);
      } catch (e) {
        console.error(`Error procesando ${tabName}:`, e);
        return [];
      }
    };

    // 5. Extraer datos secuencialmente con verificación
    console.log('Extrayendo Race Mode...');
    let raceModeData = await extractTabData('race-mode-single-class', 'Race Mode');
    
    // Verificar que no son datos de 3 Lap
    if (raceModeData.length > 0 && raceModeData[0].time.includes(':')) {
      console.log('Posible mezcla de datos, reintentando...');
      raceModeData = await extractTabData('race-mode-single-class', 'Race Mode');
    }

    console.log('Extrayendo 3 Lap...');
    const threeLapData = await extractTabData('three-lap-single-class', '3 Lap');

    await browser.close();

    // 6. Validación final
    if (raceModeData.length === 0 && threeLapData.length === 0) {
      throw new Error('No se encontraron datos válidos');
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
      suggestion: 'Por favor verifique: 1) La estructura de la página no ha cambiado 2) No hay protección anti-bots'
    });
  }
});

export default router;