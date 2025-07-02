import express from 'express';
import healthcheckRouter from './routes/healthcheck.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(express.json());

// Rutas
app.use('/api', healthcheckRouter);

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});