import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import {
    getInventoryFromVariants,
    getProductProfile,
    serializeVariantsForStorage,
    type ProductVariantDraft,
} from '../lib/product-variants';

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

async function main() {
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, category, subcategory, variants, stock_quantity, in_stock')
        .order('created_at', { ascending: true });

    if (error) {
        throw error;
    }

    let scanned = 0;
    let updated = 0;
    let unchanged = 0;
    let withoutVariants = 0;

    for (const product of products || []) {
        const variants = Array.isArray(product.variants)
            ? product.variants as ProductVariantDraft[]
            : [];

        if (variants.length === 0) {
            withoutVariants += 1;
            continue;
        }

        scanned += 1;

        const profile = getProductProfile(product.category || '', product.subcategory || '');
        const normalizedVariants = serializeVariantsForStorage(variants, profile);
        const inventory = getInventoryFromVariants(normalizedVariants);

        const variantsChanged = JSON.stringify(normalizedVariants) !== JSON.stringify(variants);
        const inventoryChanged = product.stock_quantity !== inventory.stock_quantity
            || product.in_stock !== inventory.in_stock;

        if (!variantsChanged && !inventoryChanged) {
            unchanged += 1;
            continue;
        }

        const { error: updateError } = await supabase
            .from('products')
            .update({
                variants: normalizedVariants,
                stock_quantity: inventory.stock_quantity,
                in_stock: inventory.in_stock,
            })
            .eq('id', product.id);

        if (updateError) {
            throw new Error(`No se pudo normalizar ${product.name}: ${updateError.message}`);
        }

        updated += 1;
        console.log(`Normalizado: ${product.name} (${product.id})`);
    }

    console.log(
        JSON.stringify({
            scanned,
            updated,
            unchanged,
            withoutVariants,
            total: products?.length || 0,
        }, null, 2)
    );
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
