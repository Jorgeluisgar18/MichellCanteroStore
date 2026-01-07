import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Cargar variables de entorno desde .env.local
function loadEnv() {
  try {
    const envFile = readFileSync(resolve(__dirname, '../.env.local'), 'utf-8');
    const envVars: Record<string, string> = {};
    
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return envVars;
  } catch (error) {
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function showTablesDetail() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 TABLAS DE SUPABASE - MICHELL CANTERO STORE');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`🔗 Proyecto: ${supabaseUrl}\n`);

  const tables = [
    { name: 'profiles', description: 'Perfiles de usuarios' },
    { name: 'products', description: 'Catálogo de productos' },
    { name: 'orders', description: 'Órdenes de compra' },
    { name: 'order_items', description: 'Items de las órdenes' },
  ];

  for (const table of tables) {
    try {
      const { count, error: countError } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.log(`❌ ${table.name}`);
        console.log(`   Error: ${countError.message}\n`);
        continue;
      }

      console.log(`📋 ${table.name.toUpperCase()}`);
      console.log(`   Descripción: ${table.description}`);
      console.log(`   Registros: ${count || 0}`);

      // Obtener una muestra para ver estructura
      const { data: sample, error: sampleError } = await supabase
        .from(table.name)
        .select('*')
        .limit(1);

      if (!sampleError && sample && sample.length > 0) {
        const columns = Object.keys(sample[0]);
        console.log(`   Columnas (${columns.length}):`);
        columns.forEach(col => {
          const value = sample[0][col as keyof typeof sample[0]];
          const type = value === null ? 'null' : 
                      Array.isArray(value) ? 'array' :
                      typeof value;
          console.log(`      - ${col} (${type})`);
        });
      } else if (!sampleError) {
        // Si no hay datos, intentar obtener estructura desde el schema
        console.log(`   Columnas: (sin datos para inferir estructura)`);
      }

      // Mostrar algunos datos de ejemplo si existen
      if (count && count > 0 && sample && sample.length > 0) {
        console.log(`   Ejemplo de datos:`);
        const example = sample[0];
        const exampleKeys = Object.keys(example).slice(0, 5); // Primeras 5 columnas
        exampleKeys.forEach(key => {
          const value = example[key as keyof typeof example];
          let displayValue = String(value);
          if (displayValue.length > 50) {
            displayValue = displayValue.substring(0, 47) + '...';
          }
          console.log(`      ${key}: ${displayValue}`);
        });
        if (Object.keys(example).length > 5) {
          console.log(`      ... (${Object.keys(example).length - 5} columnas más)`);
        }
      }

      console.log('');
    } catch (err: any) {
      console.log(`❌ ${table.name}`);
      console.log(`   Error: ${err.message}\n`);
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Consulta completada');
  console.log('═══════════════════════════════════════════════════════════');
}

showTablesDetail()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });

