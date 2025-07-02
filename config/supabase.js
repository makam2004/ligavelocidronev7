import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    db: { schema: 'public' }
  }
);

// Test de conexión inicial
supabase
  .from('jugadores')
  .select('*')
  .limit(1)
  .then(({ error }) => {
    if (error) console.error('❌ Error Supabase:', error);
    else console.log('✅ Conexión a Supabase exitosa');
  });

export default supabase;