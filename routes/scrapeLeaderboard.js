import express from 'express';
import puppeteer from 'puppeteer';

const router = express.Router();

router.get('/scrape-leaderboard', async (_req, res) => {
  const URL = 'https://www.velocidrone.com/leaderboard/33/1763/All';
  
  try {
    // 1. Configuración ultra compatible
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ],
      timeout: 90000
    });
    
    const page = await browser.newPage();
    
    // 2. Configuración stealth avanzada
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setJavaScriptEnabled(true);
    await page.setViewport({ width: 1280, height: 720 });
    await page.setDefaultNavigationTimeout(90000);

    // 3. Navegación con múltiples puntos de verificación
    console.log('Iniciando navegación...');
    const response = await page.goto(URL, { 
      waitUntil: ['domcontentloaded', 'networkidle0'],
      timeout: 90000
    });

    if (!response.ok()) {
      throw new Error(`Error HTTP ${response.status()}`);
    }

    // 4. Estrategia de espera alternativa
    console.log('Esperando contenido...');
    let attempts = 0;
    let dataFound = false;
    let raceModeData = [];
    let threeLapData = [];

    while (attempts < 5 && !dataFound) {
      attempts++;
      try {
        // Intentar extraer datos directamente sin esperar selectores específicos
        const pageContent = await page.content();
        
        // Extracción directa de datos (método alternativo)
        const extractedData = await page.evaluate(() => {
          const results = { raceMode: [], threeLap: [] };
          
          // Buscar todas las tablas en la página
          document.querySelectorAll('table').forEach((table, index) => {
            const rows = Array.from(table.querySelectorAll('tr')).slice(1, 21); // Excluir encabezado
            
            rows.forEach(row => {
              const cols = row.querySelectorAll('td');
              if (cols.length >= 3) {
                const entry = {
                  position: cols[0]?.textContent?.trim() || '',
                  time: cols[1]?.textContent?.trim() || 'N/A',
                  pilot: cols[2]?.textContent?.trim() || 'N/A'
                };
                
                // Asignar a la tabla correspondiente basado en posición o contenido
                if (index === 0 || entry.time.match(/^\d+\.\d{3}$/)) {
                  results.raceMode.push(entry);
                } else {
                  results.threeLap.push(entry);
                }
              }
            });
          });
          
          return results;
        });

        if (extractedData.raceMode.length > 0 || extractedData.threeLap.length > 0) {
          raceModeData = extractedData.raceMode.slice(0, 20);
          threeLapData = extractedData.threeLap.slice(0, 20);
          dataFound = true;
        } else {
          await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos
          await page.reload({ waitUntil: ['networkidle0'], timeout: 30000 });
        }
      } catch (e) {
        console.log(`Intento ${attempts} fallido:`, e.message);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    await browser.close();

    if (!dataFound) {
      throw new Error('No se pudieron extraer datos después de 5 intentos');
    }

    res.json({ 
      success: true,
      raceMode: raceModeData,
      threeLap: threeLapData,
      timestamp: new Date().toISOString(),
      attempts: attempts
    });

  } catch (error) {
    console.error('Error final:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error crítico al obtener datos',
      details: error.message,
      suggestion: 'Por favor contacte al soporte técnico con este mensaje de error'
    });
  }
});

export default router;