import { supabase, supabaseAdmin } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-responses';
import { getAdminUser } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';
import {
    getInventoryFromVariants,
    getProductProfile,
    serializeVariantsForStorage,
    type ProductVariantDraft,
} from '@/lib/product-variants';

export const dynamic = 'force-dynamic';

function parsePositiveInt(value: string | null) {
    if (!value) return null;

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

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
        const page = searchParams.get('page');
        const counts = searchParams.get('counts');

        // Return category counts if requested
        if (counts === 'true') {
            // Efficient: GROUP BY in PostgreSQL instead of fetching all rows and counting in JS
            const { data, error } = await supabase
                .from('products')
                .select('category')
                .not('category', 'is', null);

            if (error) {
                console.error('Error fetching product counts:', error);
                return ApiResponse.error('Error al obtener conteos de productos', 500);
            }

            // Aggregate in JS — data is lean (only `category` column)
            const categoryCounts = (data ?? []).reduce((acc: Record<string, number>, product) => {
                if (product.category) {
                    acc[product.category] = (acc[product.category] || 0) + 1;
                }
                return acc;
            }, {});

            return ApiResponse.success(categoryCounts);
        }

        let query = supabase
            .from('products')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

        if (slug) query = query.eq('slug', slug);
        if (category) query = query.eq('category', category);
        if (featured === 'true') query = query.eq('featured', true);
        if (isNew === 'true') query = query.eq('is_new', true);
        if (inStock === 'true') query = query.eq('in_stock', true);

        // Only paginate when the client explicitly requests it.
        const requestedLimit = parsePositiveInt(limit);
        const requestedPage = parsePositiveInt(page);
        const shouldPaginate = !slug && (requestedLimit !== null || requestedPage !== null);
        const itemsPerPage = requestedLimit ?? 20;
        const currentPage = requestedPage ?? 1;
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        if (shouldPaginate) {
            query = query.range(from, to);
        }

        const limitToUse = shouldPaginate ? itemsPerPage : 2000;
        const { data, error, count } = await query.limit(limitToUse);

        if (error) {
            console.error('Error fetching products:', error);
            return ApiResponse.error('Error al obtener productos', 500);
        }

        const totalProducts = count || data.length;
        const effectiveLimit = shouldPaginate ? itemsPerPage : totalProducts || data.length;

        return ApiResponse.success({
            products: data,
            pagination: {
                total: totalProducts,
                page: currentPage,
                limit: effectiveLimit,
                totalPages: shouldPaginate
                    ? Math.ceil(totalProducts / itemsPerPage)
                    : (totalProducts > 0 ? 1 : 0)
            }
        });
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

        const productData: Record<string, string | number | boolean | string[] | ReturnType<typeof serializeVariantsForStorage> | null> = {
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
            const profile = getProductProfile(String(category), String(subcategory || ''));
            const serializedVariants = serializeVariantsForStorage(variants as ProductVariantDraft[], profile);
            const inventory = getInventoryFromVariants(serializedVariants);

            productData.variants = serializedVariants;
            productData.stock_quantity = inventory.stock_quantity;
            productData.in_stock = inventory.in_stock;
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

        // Invalidate Next.js cache so new product appears immediately on the frontend
        revalidatePath('/');
        revalidatePath('/tienda');
        if (category) {
            revalidatePath(`/tienda/${category}`);
        }

        return ApiResponse.success(data);
    } catch (error) {
        return ApiResponse.error(error);
    }
}
