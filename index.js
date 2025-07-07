// index.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import healthcheckRouter from './routes/healthcheck.js';
import scrapeLeaderboardRouter from './routes/scrapeLeaderboard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Para archivos estáticos (CSS/JS)

// Rutas API
app.use('/api', healthcheckRouter);
app.use('/api', scrapeLeaderboardRouter);

// Ruta principal (HTML)
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});