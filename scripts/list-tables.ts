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
    console.error('Error leyendo .env.local, usando variables de entorno del sistema');
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('Asegúrate de tener configurado .env.local con:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function listTables() {
  try {
    console.log('🔍 Consultando tablas de Supabase...\n');
    console.log(`📊 Proyecto: ${supabaseUrl}\n`);

    // Consultar las tablas del esquema público
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public')
      .order('table_name');

    if (error) {
      // Si falla con information_schema, intentar consulta directa a pg_tables
      console.log('⚠️  Intentando método alternativo...\n');
      
      // Usar una consulta SQL directa
      const { data: tablesData, error: tablesError } = await supabase.rpc('exec_sql', {
        query: `
          SELECT tablename as table_name 
          FROM pg_tables 
          WHERE schemaname = 'public'
          ORDER BY tablename;
        `
      });

      if (tablesError) {
        // Método más simple: intentar acceder a las tablas conocidas
        console.log('📋 Listando tablas conocidas del proyecto:\n');
        const knownTables = ['profiles', 'products', 'orders', 'order_items'];
        
        for (const tableName of knownTables) {
          const { data: tableData, error: tableError } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (!tableError) {
            const { count } = await supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true });
            
            console.log(`✅ ${tableName}`);
            console.log(`   Registros: ${count || 0}`);
            
            // Obtener columnas
            const { data: sample } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
            
            if (sample && sample.length > 0) {
              const columns = Object.keys(sample[0]);
              console.log(`   Columnas: ${columns.join(', ')}`);
            }
            console.log('');
          }
        }
        return;
      }

      if (tablesData) {
        console.log('📋 Tablas encontradas:\n');
        tablesData.forEach((table: any) => {
          console.log(`  ✅ ${table.table_name}`);
        });
        return;
      }
    }

    if (data && data.length > 0) {
      console.log('📋 Tablas encontradas:\n');
      
      for (const table of data) {
        const tableName = table.table_name;
        console.log(`📊 ${tableName}`);
        
        // Obtener información de la tabla
        const { count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        console.log(`   Registros: ${count || 0}`);
        
        // Obtener una muestra para ver las columnas
        const { data: sample } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (sample && sample.length > 0) {
          const columns = Object.keys(sample[0]);
          console.log(`   Columnas (${columns.length}): ${columns.join(', ')}`);
        }
        console.log('');
      }
    } else {
      console.log('⚠️  No se encontraron tablas en el esquema público');
    }

  } catch (err: any) {
    console.error('❌ Error al consultar tablas:', err.message);
    
    // Método alternativo: listar tablas conocidas
    console.log('\n📋 Intentando listar tablas conocidas del proyecto:\n');
    const knownTables = ['profiles', 'products', 'orders', 'order_items'];
    
    for (const tableName of knownTables) {
      try {
        const { data: tableData, error: tableError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!tableError) {
          const { count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          
          console.log(`✅ ${tableName}`);
          console.log(`   Registros: ${count || 0}`);
          
          if (tableData && tableData.length > 0) {
            const columns = Object.keys(tableData[0]);
            console.log(`   Columnas: ${columns.join(', ')}`);
          }
          console.log('');
        }
      } catch (e) {
        // Ignorar errores de tablas que no existen
      }
    }
  }
}

listTables()
  .then(() => {
    console.log('✅ Consulta completada');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });

