import express from 'express';
const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

export default router;