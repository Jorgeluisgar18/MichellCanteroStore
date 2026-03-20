import { supabase, supabaseAdmin } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-responses';
import { getAdminUser } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

type ProductVariantInput = {
    id?: string;
    name?: string;
    type?: string;
    value?: string;
    stock_quantity?: number | string;
    image?: string;
    colorName?: string | null;
    colorHex?: string | null;
    size?: string | null;
    sku?: string | null;
};

function serializeVariants(variants: ProductVariantInput[]) {
    return variants.map((variant) => {
        const stockQuantity = parseInt(String(variant.stock_quantity)) || 0;

        return {
            id: variant.id || crypto.randomUUID(),
            name: variant.name || 'Sin nombre',
            type: variant.type || 'variant',
            value: variant.value || '',
            stock_quantity: stockQuantity,
            inStock: stockQuantity > 0,
            image: variant.image || '',
            colorName: variant.colorName || null,
            colorHex: variant.colorHex || null,
            size: variant.size || null,
            sku: variant.sku || null,
        };
    });
}

function getInventoryFromVariants(variants: ReturnType<typeof serializeVariants>) {
    const totalStock = variants.reduce((sum, variant) => sum + variant.stock_quantity, 0);

    return {
        stock_quantity: totalStock,
        in_stock: totalStock > 0,
    };
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
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

        if (slug) query = query.eq('slug', slug);
        if (category) query = query.eq('category', category);
        if (featured === 'true') query = query.eq('featured', true);
        if (isNew === 'true') query = query.eq('is_new', true);
        if (inStock === 'true') query = query.eq('in_stock', true);

        // Pagination logic
        const itemsPerPage = limit ? parseInt(limit) : 20;
        const currentPage = page ? parseInt(page) : 1;
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        if (!slug) {
            query = query.range(from, to);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching products:', error);
            return ApiResponse.error('Error al obtener productos', 500);
        }

        return ApiResponse.success({
            products: data,
            pagination: {
                total: count || data.length,
                page: currentPage,
                limit: itemsPerPage,
                totalPages: Math.ceil((count || data.length) / itemsPerPage)
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
            const serializedVariants = serializeVariants(variants as ProductVariantInput[]);
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

        return ApiResponse.success(data);
    } catch (error) {
        return ApiResponse.error(error);
    }
}
