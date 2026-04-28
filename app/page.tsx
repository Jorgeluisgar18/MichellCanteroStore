import { getPageContent } from '@/lib/cms';
import { supabase } from '@/lib/supabase';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
    const [homeContent, categoriesContent] = await Promise.all([
        getPageContent('home'),
        getPageContent('categorias')
    ]);

    // Opcionalmente podemos precargar los productos aquí,
    // o dejar que el cliente los cargue asincronamente.
    // Para simplificar y mejorar el LCP, obtenemos algunos productos destacados aquí.
    // Obtenemos los productos más recientes (aumentamos el límite para asegurar destacados y nuevos a largo plazo)
    const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

    if (productsError) {
        console.error('[HomePage] Error fetching products:', productsError);
    }

    const { data: countsData, error: countsError } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null);

    if (countsError) {
        console.error('[HomePage] Error fetching category counts:', countsError);
    }

    const categoryCounts = (countsData ?? []).reduce((acc: Record<string, number>, product) => {
        if (product.category) {
            acc[product.category] = (acc[product.category] || 0) + 1;
        }
        return acc;
    }, {});

    return (
        <HomeClient 
            initialHomeContent={homeContent} 
            initialCategoriesContent={categoriesContent}
            initialProducts={productsData || []}
            initialCounts={categoryCounts}
        />
    );
}
