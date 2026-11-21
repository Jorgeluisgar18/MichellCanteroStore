import { NextResponse } from 'next/server';
import { commerceMaintenanceResponse } from '@/lib/commerce/maintenance';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import {
    getInventoryFromVariants,
    getProductProfile,
    serializeVariantsForStorage,
    type ProductVariantDraft,
} from '@/lib/product-variants';
import { validateProductTaxonomy } from '@/lib/catalog/taxonomy';

export const dynamic = 'force-dynamic';

// GET /api/products/[id] - Obtener producto por ID
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', params.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json(
                    { error: 'Producto no encontrado' },
                    { status: 404 }
                );
            }

            console.error('Error fetching product:', error);
            return NextResponse.json(
                { error: 'Error al obtener producto' },
                { status: 500 }
            );
        }

        return NextResponse.json({ data });
    } catch (error: unknown) {
        console.error('API Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return NextResponse.json(
            { error: `Error del servidor (GET): ${errorMessage}` },
            { status: 500 }
        );
    }
}

// PUT /api/products/[id] - Actualizar producto (solo admin)
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    const maintenance = commerceMaintenanceResponse();
    if (maintenance) return maintenance;
    try {
        const body = await request.json();
        let existingProductCategory: string | null = null;
        let existingProductSubcategory: string | null = null;
        let hadVariants = false;

        // Validar autenticación usando el cliente del servidor
        const { createClient } = await import('@/lib/supabase-server');
        const supabaseServer = createClient();

        const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const inventoryWrite = ['stock_quantity', 'variants', 'in_stock'].some((key) => Object.prototype.hasOwnProperty.call(body, key));
        const expectedVersion = body.expected_inventory_version;
        if (inventoryWrite && (!Number.isInteger(expectedVersion) || expectedVersion < 0 || expectedVersion > 2147483647)) {
            return NextResponse.json({ error: 'Se requiere una version de inventario valida' }, { status: 400 });
        }
        if (body.stock_quantity !== undefined && ((typeof body.stock_quantity !== 'number' && typeof body.stock_quantity !== 'string') || String(body.stock_quantity).trim() === '' || !Number.isInteger(Number(body.stock_quantity)) || Number(body.stock_quantity) < 0 || Number(body.stock_quantity) > 2147483647)) {
            return NextResponse.json({ error: 'Cantidad de inventario invalida' }, { status: 400 });
        }
        if (body.variants !== undefined && !Array.isArray(body.variants)) {
            return NextResponse.json({ error: 'Variantes invalidas' }, { status: 400 });
        }

        // Validar y sanitizar datos del producto
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

        // Preparar datos para actualización
        const productData: Record<string, string | number | boolean | string[] | ReturnType<typeof serializeVariantsForStorage> | null> = {};

        if (name !== undefined) productData.name = name;
        if (description !== undefined) productData.description = description;
        if (price !== undefined) productData.price = parseFloat(String(price));
        if (category !== undefined || subcategory !== undefined) {
            const { data: existingProduct, error: existingProductError } = await supabaseAdmin
                .from('products')
                .select('category, subcategory')
                .eq('id', params.id)
                .single();

            if (existingProductError) {
                console.error('Error fetching current product taxonomy:', existingProductError);
                return NextResponse.json(
                    { error: 'No se pudo obtener la categoria actual del producto' },
                    { status: 500 }
                );
            }

            existingProductCategory = existingProduct.category;
            existingProductSubcategory = existingProduct.subcategory;

            const taxonomy = validateProductTaxonomy({
                category: category !== undefined ? category : existingProductCategory,
                subcategory: subcategory !== undefined ? subcategory : existingProductSubcategory,
            });

            if (!taxonomy.valid) {
                return NextResponse.json(
                    { error: taxonomy.error || 'Categoria o subcategoria invalida' },
                    { status: 400 }
                );
            }

            productData.category = taxonomy.category!;
            productData.subcategory = taxonomy.subcategory ?? null;
        }
        if (images !== undefined) productData.images = Array.isArray(images) ? images : [];
        if (stock_quantity !== undefined) productData.stock_quantity = Number(stock_quantity);
        if (featured !== undefined) productData.featured = featured === true;
        if (is_new !== undefined) productData.is_new = is_new === true;
        if (in_stock !== undefined) productData.in_stock = in_stock !== false;
        if (slug !== undefined) productData.slug = slug;
        if (tags !== undefined) productData.tags = Array.isArray(tags) ? tags : [];
        if (brand !== undefined) productData.brand = brand || null;

        // Agregar compare_at_price
        if (compare_at_price !== undefined) {
            productData.compare_at_price = compare_at_price ? parseFloat(String(compare_at_price)) : null;
        }

        if (inventoryWrite) {
            const { data: current, error: currentError } = await supabaseAdmin.from('products')
                .select('category, subcategory, variants, stock_quantity, in_stock, inventory_version').eq('id', params.id).single();
            if (currentError || !current) return NextResponse.json({ error: 'No se pudo obtener el inventario actual' }, { status: 500 });
            existingProductCategory = current.category;
            existingProductSubcategory = current.subcategory;
            const currentVariants = Array.isArray(current.variants) ? current.variants as ProductVariantDraft[] : [];
            hadVariants = currentVariants.length > 0;
            if (variants === undefined && currentVariants.length > 0) {
                let inventory;
                try {
                    inventory = getInventoryFromVariants(serializeVariantsForStorage(currentVariants, getProductProfile(current.category ?? '', current.subcategory ?? '')));
                } catch {
                    return NextResponse.json({ error: 'El inventario requiere correccion de variantes' }, { status: 409 });
                }
                if (current.stock_quantity !== inventory.stock_quantity || (stock_quantity !== undefined && Number(stock_quantity) !== inventory.stock_quantity) || (in_stock !== undefined && in_stock !== inventory.in_stock)) {
                    return NextResponse.json({ error: 'El inventario debe coincidir con las variantes' }, { status: 409 });
                }
            }
            if (variants !== undefined && currentVariants.length > 0) {
                const sameQuantities = variants.length === currentVariants.length && currentVariants.every((old) => variants.some((next: ProductVariantDraft) => next?.id === old?.id && Number(next?.stock_quantity) === Number(old?.stock_quantity)));
                const oldTotal = currentVariants.reduce((sum, item) => sum + Number(item?.stock_quantity), 0);
                if (current.stock_quantity !== oldTotal && sameQuantities) {
                    return NextResponse.json({ error: 'Corrige las cantidades historicas antes de guardar' }, { status: 409 });
                }
            }
        }

        // Validar y agregar variantes si existen
        if (variants !== undefined) {
            if (Array.isArray(variants) && variants.length > 0) {
                if (existingProductCategory === null && existingProductSubcategory === null) {
                    const { data: existingProduct, error: existingProductError } = await supabaseAdmin
                        .from('products')
                        .select('category, subcategory')
                        .eq('id', params.id)
                        .single();

                    if (existingProductError) {
                        console.error('Error fetching current product profile:', existingProductError);
                        return NextResponse.json(
                            { error: 'No se pudo obtener la configuración actual del producto' },
                            { status: 500 }
                        );
                    }

                    existingProductCategory = existingProduct.category;
                    existingProductSubcategory = existingProduct.subcategory;
                }

                const resolvedCategory = String(productData.category ?? existingProductCategory ?? '');
                const resolvedSubcategory = String(productData.subcategory ?? existingProductSubcategory ?? '');
                const profile = getProductProfile(resolvedCategory, resolvedSubcategory);
                let serializedVariants;
                let inventory;
                try {
                    serializedVariants = serializeVariantsForStorage(variants as ProductVariantDraft[], profile);
                    inventory = getInventoryFromVariants(serializedVariants);
                } catch {
                    return NextResponse.json({ error: 'Variantes o cantidades invalidas' }, { status: 400 });
                }

                productData.variants = serializedVariants;
                productData.stock_quantity = inventory.stock_quantity;
                productData.in_stock = inventory.in_stock;
            } else {
                productData.variants = [];
                if (hadVariants) {
                    productData.stock_quantity = 0;
                    productData.in_stock = false;
                }
            }
        }

        // Actualizar producto usando el cliente admin
        let updateQuery = supabaseAdmin
            .from('products')
            .update(productData)
            .eq('id', params.id);
        if (inventoryWrite) updateQuery = updateQuery.eq('inventory_version', expectedVersion);
        const { data, error } = await updateQuery
            .select()
            .maybeSingle();

        if ((!error && !data) || error?.code === 'PGRST116' || (error?.code === '23514' && /inventory/i.test(error.message))) {
            return NextResponse.json({ error: 'El inventario cambio o tiene reservas activas; recarga el producto' }, { status: 409 });
        }

        if (error) {
            console.error('Error updating product:', error);
            return NextResponse.json(
                { error: `Error al actualizar producto: ${error.message}` },
                { status: 500 }
            );
        }

        // Invalidate Next.js cache so the updated product appears immediately
        revalidatePath('/');
        revalidatePath('/tienda');
        if (data?.category) {
            revalidatePath(`/tienda/${data.category}`);
        }
        if (data?.slug) {
            revalidatePath(`/producto/${data.slug}`);
        }

        return NextResponse.json({ data });
    } catch (error: unknown) {
        console.error('API Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return NextResponse.json(
            { error: `Error del servidor (PUT): ${errorMessage}` },
            { status: 500 }
        );
    }
}

// DELETE /api/products/[id] - Eliminar producto (solo admin)
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const maintenance = commerceMaintenanceResponse();
    if (maintenance) return maintenance;
    try {
        // Validar autenticación usando el cliente del servidor
        const { createClient } = await import('@/lib/supabase-server');
        const supabaseServer = createClient();

        const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        // Eliminar producto usando el cliente admin
        const { error } = await supabaseAdmin
            .from('products')
            .delete()
            .eq('id', params.id);

        if (error) {
            console.error('Error deleting product:', error);
            return NextResponse.json(
                { error: 'Error al eliminar producto' },
                { status: 500 }
            );
        }

        // Invalidate Next.js cache after deletion
        revalidatePath('/');
        revalidatePath('/tienda');

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Error del servidor' },
            { status: 500 }
        );
    }
}
