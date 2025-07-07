// routes/scrapeLeaderboard.js
import express from 'express';
import puppeteer from 'puppeteer';

const router = express.Router();

router.get('/scrape-leaderboard', async (_req, res) => {
  const URL = 'https://www.velocidrone.com/leaderboard/33/1763/All';
  
  try {
    const browser = await puppeteer.launch({ 
      headless: true, // Cambiar a false para debug
      args: ['--no-sandbox'] 
    });
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: 'networkidle2' });

    // Extraer datos de "Race Mode: Single Class"
    const raceModeData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#race-mode-single-class .leaderboard-row'));
      return rows.slice(0, 20).map(row => ({
        pilot: row.querySelector('.pilot-name').innerText.trim(),
        time: row.querySelector('.time').innerText.trim(),
      }));
    });

    // Extraer datos de "3 Lap: Single Class"
    const threeLapData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#three-lap-single-class .leaderboard-row'));
      return rows.slice(0, 20).map(row => ({
        pilot: row.querySelector('.pilot-name').innerText.trim(),
        time: row.querySelector('.time').innerText.trim(),
      }));
    });

    await browser.close();

    res.json({
      raceMode: raceModeData,
      threeLap: threeLapData,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;