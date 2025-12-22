/**
 * Script para migrar productos desde JSON a Supabase
 * 
 * Uso:
 * 1. Asegúrate de tener las variables de entorno configuradas en .env.local
 * 2. Ejecuta: node --loader ts-node/esm scripts/migrate-products.ts
 * O con tsx: npx tsx scripts/migrate-products.ts
 */

import { createClient } from '@supabase/supabase-js';
import productsData from '../data/products.json' assert { type: 'json' };

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Faltan variables de entorno');
    console.error('Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local');
    process.exit(1);
}

const supabase = createClient<any>(supabaseUrl, supabaseServiceKey);

type ProductInsert = any;

async function migrateProducts() {
    console.log('🚀 Iniciando migración de productos...\n');

    try {
        // Transformar productos del JSON al formato de Supabase
        const products: ProductInsert[] = productsData.map((product: any) => ({
            name: product.name,
            slug: product.slug,
            description: product.description,
            price: product.price,
            compare_at_price: product.compareAtPrice || null,
            category: product.category,
            subcategory: product.subcategory || null,
            brand: product.brand || null,
            images: product.images,
            in_stock: product.inStock,
            stock_quantity: product.stockQuantity,
            variants: product.variants || null,
            tags: product.tags || [],
            featured: product.featured || false,
            is_new: product.isNew || false,
            rating: product.rating || null,
            review_count: product.reviewCount || 0,
        }));

        console.log(`📦 Productos a migrar: ${products.length}\n`);

        // Verificar si ya existen productos
        const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true });

        if (count && count > 0) {
            console.log(`⚠️  Ya existen ${count} productos en la base de datos`);
            console.log('¿Deseas continuar? Esto agregará productos duplicados si ya existen.');
            console.log('Presiona Ctrl+C para cancelar o espera 5 segundos para continuar...\n');

            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // Insertar productos
        console.log('📝 Insertando productos...\n');

        const { data, error } = await supabase
            .from('products')
            .insert(products)
            .select();

        if (error) {
            console.error('❌ Error al insertar productos:', error);
            process.exit(1);
        }

        console.log(`✅ Migración completada exitosamente!`);
        console.log(`📊 Productos insertados: ${data?.length || 0}\n`);

        // Mostrar resumen por categoría
        const categoryCounts: Record<string, number> = {};
        data?.forEach((product: any) => {
            categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1;
        });

        console.log('📈 Resumen por categoría:');
        Object.entries(categoryCounts).forEach(([category, count]) => {
            console.log(`   - ${category}: ${count} productos`);
        });

        console.log('\n✨ Migración finalizada!\n');
    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        process.exit(1);
    }
}

// Ejecutar migración
migrateProducts();
