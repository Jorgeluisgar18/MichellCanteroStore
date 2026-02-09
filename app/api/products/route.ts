import { supabase, supabaseAdmin } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-responses';
import { getAdminUser } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/products
 * Fetch products with optional filtering
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const featured = searchParams.get('featured');
        const isNew = searchParams.get('new');
        const inStock = searchParams.get('inStock');
        const slug = searchParams.get('slug');
        const limit = searchParams.get('limit');
        const counts = searchParams.get('counts');

        // Return category counts if requested
        if (counts === 'true') {
            const { data, error } = await supabase
                .from('products')
                .select('category');

            if (error) {
                console.error('Error fetching product counts:', error);
                return ApiResponse.error('Error al obtener conteos de productos', 500);
            }

            // Count products by category
            const categoryCounts = data.reduce((acc: Record<string, number>, product) => {
                acc[product.category] = (acc[product.category] || 0) + 1;
                return acc;
            }, {});

            return ApiResponse.success(categoryCounts);
        }

        let query = supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (slug) query = query.eq('slug', slug);
        if (limit) query = query.limit(parseInt(limit));
        if (category) query = query.eq('category', category);
        if (featured === 'true') query = query.eq('featured', true);
        if (isNew === 'true') query = query.eq('is_new', true);
        if (inStock === 'true') query = query.eq('in_stock', true);

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching products:', error);
            return ApiResponse.error('Error al obtener productos', 500);
        }

        return ApiResponse.success(data);
    } catch (error) {
        return ApiResponse.error(error);
    }
}

/**
 * POST /api/products
 * Create a new product (Admin Only)
 */
export async function POST(request: Request) {
    try {
        // ✅ Standardized Admin Authorization
        await getAdminUser();

        const body = await request.json();

        const {
            name,
            description,
            price,
            compare_at_price,
            category,
            subcategory,
            images,
            stock_quantity,
            variants,
            featured,
            is_new,
            in_stock,
            slug,
            tags,
            brand
        } = body;

        // Validation
        if (!name || !price || !category) {
            return ApiResponse.badRequest('Faltan campos requeridos: name, price, category');
        }

        const productData: Record<string, string | number | boolean | string[] | unknown[] | null> = {
            name,
            description: description || '',
            price: parseFloat(String(price)),
            category,
            subcategory: subcategory || null,
            images: Array.isArray(images) ? images : [],
            stock_quantity: parseInt(String(stock_quantity)) || 0,
            featured: featured === true,
            is_new: is_new === true,
            in_stock: in_stock !== false,
            slug: slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
            tags: Array.isArray(tags) ? tags : [],
            brand: brand || null
        };

        if (compare_at_price) {
            productData.compare_at_price = parseFloat(String(compare_at_price));
        }

        if (variants && Array.isArray(variants) && variants.length > 0) {
            productData.variants = variants.map((v: { id?: string; name?: string; type?: string; value?: string; stock_quantity?: number | string }) => ({
                id: v.id || crypto.randomUUID(),
                name: v.name || 'Sin nombre',
                type: v.type || 'variant',
                value: v.value || '',
                stock_quantity: parseInt(String(v.stock_quantity)) || 0,
                inStock: (parseInt(String(v.stock_quantity)) || 0) > 0
            }));
        } else {
            productData.variants = [];
        }

        const { data, error } = await supabaseAdmin
            .from('products')
            .insert([productData])
            .select()
            .single();

        if (error) {
            console.error('Product insertion failed:', error);
            return ApiResponse.error(`Error al crear producto: ${error.message}`);
        }

        return ApiResponse.success(data, 201);
    } catch (error) {
        return ApiResponse.error(error);
    }
}
