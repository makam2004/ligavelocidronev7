import express from 'express';
import puppeteer from 'puppeteer';
import supabase from '../config/supabase.js';

const router = express.Router();

// Función de espera mejorada
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function obtenerDatosPestania(url, textoPestania, pilotosFiltrados) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  await page.setViewport({ width: 1366, height: 768 });

  try {
    // 1. Navegación rápida
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // 2. Extraer metadatos
    const metadatos = await page.evaluate(() => ({
      escenario: document.querySelector('h2.text-center')?.textContent.trim() || 'Escenario no encontrado',
      track: document.querySelector('div.container h3')?.textContent.trim() || 'Track no encontrado'
    }));

    // 3. Cambiar a pestaña específica
    const tabSelector = `a:has-text("${textoPestania}")`;
    await page.click(tabSelector);
    await delay(1500);

    // 4. Extraer y filtrar pilotos
    const resultados = await page.evaluate((pilotosFiltrados) => {
      const resultadosFiltrados = [];
      const rows = document.querySelectorAll('tbody tr');
      const maxRows = Math.min(200, rows.length);
      
      for (let i = 0; i < maxRows; i++) {
        const cols = rows[i].querySelectorAll('td');
        if (cols.length >= 3) {
          const piloto = cols[2]?.textContent.trim();
          if (pilotosFiltrados.includes(piloto)) {
            resultadosFiltrados.push({
              position: cols[0]?.textContent.trim() || (i + 1).toString(),
              time: cols[1]?.textContent.trim() || 'N/A',
              pilot: piloto
            });
          }
        }
      }
      return resultadosFiltrados;
    }, pilotosFiltrados);

    return { metadata: metadatos, resultados };
  } finally {
    await browser.close();
  }
}

router.get('/scrape-leaderboard', async (_req, res) => {
  try {
    // 1. Obtener pilotos activos
    const { data: pilotos, error: pilotosError } = await supabase
      .from('pilotos')
      .select('nombre')
      .eq('activo', true);

    if (pilotosError) throw pilotosError;
    const nombresPilotos = pilotos.map(p => p.nombre);

    // 2. Obtener configuración de tracks
    const { data: config, error: configError } = await supabase
      .from('configuracion_tracks')
      .select(`
        track_race_mode: tracks!track_race_mode(escenario_id, track_id),
        track_3_lap: tracks!track_3_lap(escenario_id, track_id)
      `)
      .eq('activo', true)
      .single();

    if (configError) throw configError;

    // 3. Construir URLs
    const urlRace = `https://www.velocidrone.com/leaderboard/${config.track_race_mode.escenario_id}/${config.track_race_mode.track_id}/All`;
    const url3Lap = `https://www.velocidrone.com/leaderboard/${config.track_3_lap.escenario_id}/${config.track_3_lap.track_id}/All`;

    // 4. Scraping con timeout controlado
    const scrapingPromise = Promise.all([
      obtenerDatosPestania(urlRace, 'Race Mode: Single Class', nombresPilotos),
      obtenerDatosPestania(url3Lap, '3 Lap: Single Class', nombresPilotos)
    ]);

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout excedido')), 30000);
    });

    const [raceMode, threeLap] = await Promise.race([scrapingPromise, timeoutPromise]);

    res.json({
      success: true,
      raceMode,
      threeLap,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Error al obtener datos'
    });
  }
});

export default router;