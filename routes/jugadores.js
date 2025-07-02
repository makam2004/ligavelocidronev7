// routes/jugadores.js
import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

router.get('/jugadores', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('jugadores')
      .select('id, nombre, puntos_anuales')
      .order('puntos_anuales', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;