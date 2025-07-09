import express from 'express';
import puppeteer from 'puppeteer';
import supabase from '../config/supabaseClient.js'; // ✅ Ruta corregida

const router = express.Router();

async function obtenerDatosPestania(url, textoPestania, pilotosFiltrados) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  await page.setViewport({ width: 1366, height: 768 });

  try {
    // Navegar a la URL
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Extraer metadatos
    const metadatos = await page.evaluate(() => ({
      escenario: document.querySelector('h2.text-center')?.textContent.trim() || 'Escenario no encontrado',
      track: document.querySelector('div.container h3')?.textContent.trim() || 'Track no encontrado'
    }));

    // Cambiar a pestaña
    await page.evaluate((texto) => {
      const tabs = Array.from(document.querySelectorAll('a'));
      const targetTab = tabs.find(tab => tab.textContent.includes(texto));
      if (targetTab) targetTab.click();
    }, textoPestania);

    await page.waitForTimeout(3000);
    await page.waitForSelector('tbody tr', { timeout: 10000 });

    // Extraer y filtrar resultados
    const resultados = await page.evaluate((pilotosFiltrados) => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.slice(0, 20).map(row => {
        const cols = row.querySelectorAll('td');
        const piloto = cols[2]?.textContent.trim();
        if (!pilotosFiltrados.includes(piloto)) return null;
        
        return {
          position: cols[0]?.textContent.trim() || '',
          time: cols[1]?.textContent.trim() || 'N/A',
          pilot: piloto
        };
      }).filter(Boolean);
    }, pilotosFiltrados);

    return { metadata: metadatos, resultados };
  } finally {
    await browser.close();
  }
}

router.get('/scrape-leaderboard', async (_req, res) => {
  try {
    // 1. Obtener configuración desde Supabase
    const { data: config, error: configError } = await supabase
      .from('configuracion_tracks')
      .select(`
        track_race_mode: tracks_race_mode(escenario_id, track_id, nombre_escenario, nombre_track),
        track_3_lap: tracks_3_lap(escenario_id, track_id, nombre_escenario, nombre_track)
      `)
      .eq('activo', true)
      .single();

    if (configError) throw configError;

    // 2. Obtener pilotos activos
    const { data: pilotos, error: pilotosError } = await supabase
      .from('pilotos')
      .select('nombre')
      .eq('activo', true);

    if (pilotosError) throw pilotosError;
    const nombresPilotos = pilotos.map(p => p.nombre);

    // 3. Construir URLs
    const urlRace = `https://www.velocidrone.com/leaderboard/${config.track_race_mode.escenario_id}/${config.track_race_mode.track_id}/All`;
    const url3Lap = `https://www.velocidrone.com/leaderboard/${config.track_3_lap.escenario_id}/${config.track_3_lap.track_id}/All`;

    // 4. Obtener datos
    const [raceMode, threeLap] = await Promise.all([
      obtenerDatosPestania(urlRace, 'Race Mode: Single Class', nombresPilotos),
      obtenerDatosPestania(url3Lap, '3 Lap: Single Class', nombresPilotos)
    ]);

    res.json({
      success: true,
      raceMode,
      threeLap,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en scraping:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Error al obtener datos del leaderboard'
    });
  }
});

export default router;