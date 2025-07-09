import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan variables de entorno SUPABASE_URL o SUPABASE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' }
});

// Prueba de conexión
supabase
  .from('configuracion_tracks')
  .select('*')
  .limit(1)
  .then(({ error }) => {
    if (error) console.error('Error conexión Supabase:', error);
    else console.log('✅ Conexión a Supabase exitosa');
  });

export default supabase;