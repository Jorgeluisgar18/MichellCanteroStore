import { supabaseAdmin } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-responses';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/orders
 * Fetch orders for current user or all (Admin)
 */
export async function GET() {
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return ApiResponse.unauthorized();
        }

        // Check if user is admin
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        let query = supabaseAdmin
            .from('orders')
            .select(`
                *,
                order_items (*)
            `)
            .order('created_at', { ascending: false });

        if (profile?.role !== 'admin') {
            query = query.eq('user_id', user.id);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching orders:', error);
            return ApiResponse.error('Error al obtener órdenes');
        }

        return ApiResponse.success(data);
    } catch (error) {
        return ApiResponse.error(error);
    }
}

/**
 * POST /api/orders
 * Create a new order with stock reservation and idempotency
 */
export async function POST(request: Request) {
    try {
        // SECURITY: Rate limiting
        const { checkRateLimit, getClientIdentifier } = await import('@/lib/middleware/ratelimit');
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimit(clientId, { maxRequests: 10, windowMs: 60000 });

        if (!rateLimitResult.success) {
            return ApiResponse.error('Demasiadas solicitudes. Por favor intenta de nuevo más tarde.', 429);
        }

        const body = await request.json();

        // SECURITY: Validate input
        const { CreateOrderSchema } = await import('@/lib/validations/order');
        const { logger, logApiRequest, logApiError } = await import('@/lib/utils/logger');

        const { success, data: validatedData, error: valError } = CreateOrderSchema.safeParse(body);

        if (!success) {
            logger.warn('Order validation failed', { errors: valError.errors });
            return ApiResponse.badRequest('Datos de orden inválidos', 'VALIDATION_ERROR');
        }

        const {
            shipping_name,
            shipping_email,
            shipping_phone,
            shipping_address,
            shipping_city,
            shipping_state,
            shipping_zip_code,
            payment_method,
            items,
            customer_notes,
            idempotency_key,
            shipping_method,
            shipping_location
        } = validatedData;
        
        // SECURITY: Verify user from session
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const authenticatedUserId = user?.id ?? null;

        logApiRequest('POST', '/api/orders', authenticatedUserId || 'guest');

        // SECURITY: Check idempotency
        if (idempotency_key) {
            const { data: existingOrder } = await supabaseAdmin
                .from('orders')
                .select('*, order_items (*)')
                .eq('idempotency_key', idempotency_key)
                .single();

            if (existingOrder) {
                logger.info('Returning existing order (idempotency)');
                return ApiResponse.success(existingOrder);
            }
        }

        // SECURITY: Verify inventory and build items with REAL prices
        const productIds = items.map((item) => item.product_id);
        const { data: productsInDb, error: productsError } = await supabaseAdmin
            .from('products')
            .select('id, name, price, stock_quantity, in_stock, images, variants')
            .in('id', productIds);

        if (productsError) throw new Error('Error al verificar inventario');

        const validatedItems = [];
        for (const item of items) {
            const product = productsInDb?.find(p => p.id === item.product_id);

            if (!product) return ApiResponse.badRequest(`Producto ${item.product_id} no encontrado`);

            if (!product.in_stock || product.stock_quantity < item.quantity) {
                return ApiResponse.badRequest(`Stock insuficiente para ${product.name}`);
            }

            // Aplicar priceModifier si la variante lo tiene
            let finalPrice = product.price;
            if (item.variant_id && Array.isArray(product.variants)) {
                const variant = (product.variants as Array<{
                    id: string; priceModifier?: number
                }>).find(v => v.id === item.variant_id);
                if (variant?.priceModifier) {
                    finalPrice = product.price + variant.priceModifier;
                }
            }

            validatedItems.push({
                product_id: item.product_id,
                product_name: product.name,
                product_price: finalPrice,
                product_image: product.images?.[0] || '',
                quantity: item.quantity,
                variant_name: item.variant_name || null,
                variant_id: item.variant_id || null,
            });
        }

        // Calculate totals
        const calculateShippingCost = (subtotal: number, shippingMethod: string, shippingLocation?: string | null): number => {
            if (shippingMethod === 'pickup') return 0;
            if (subtotal >= 200000) return 0;
            const rates: Record<string, number> = {
                'cienaga': 5000,
                'santa-marta': 10000,
                'resto-colombia': 16000,
            };
            return rates[shippingLocation ?? ''] ?? 16000;
        }

        const subtotal = validatedItems.reduce((acc, item) => acc + (item.product_price * item.quantity), 0);
        const shipping = calculateShippingCost(subtotal, shipping_method, shipping_location);
        const total = subtotal + shipping;

        // Create order
        const { randomBytes } = await import('crypto');
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const suffix = randomBytes(3).toString('hex').toUpperCase();
        const orderNumber = `MC-${dateStr}-${suffix}`;

        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert([{
                user_id: authenticatedUserId,
                order_number: orderNumber,
                status: 'pending',
                payment_status: 'pending',
                subtotal,
                tax: 0,
                shipping,
                total,
                shipping_name,
                shipping_email,
                shipping_phone,
                shipping_address,
                shipping_city,
                shipping_state,
                shipping_zip_code,
                payment_method: payment_method || 'wompi',
                customer_notes: customer_notes || null,
                idempotency_key: idempotency_key || null,
                shipping_method,
                shipping_location,
            }])
            .select()
            .single();

        if (orderError) {
            logApiError('POST', '/api/orders', orderError);
            return ApiResponse.error('Error al crear la orden');
        }

        // Create order items
        const orderItems = validatedItems.map((item) => ({
            order_id: order.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_price: item.product_price,
            product_image: item.product_image,
            quantity: item.quantity,
            variant_name: item.variant_name,
            variant_id: item.variant_id,
            subtotal: item.product_price * item.quantity,
        }));

        const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItems);

        if (itemsError) {
            await supabaseAdmin.from('orders').delete().eq('id', order.id);
            return ApiResponse.error('Error al crear items de la orden');
        }

        // SECURITY: Reserve stock
        const reservationErrors = [];
        for (const item of validatedItems) {
            const { data: resData, error: resError } = await supabaseAdmin.rpc('reserve_product_stock', {
                product_id_param: item.product_id,
                order_id_param: order.id,
                quantity_param: item.quantity,
                expiration_minutes: 15
            });

            if (resError || !resData?.success) {
                reservationErrors.push({ product: item.product_name, error: resData?.error || resError?.message });
            }
        }

        if (reservationErrors.length > 0) {
            await supabaseAdmin.from('orders').delete().eq('id', order.id);
            return ApiResponse.badRequest('Stock insuficiente para completar la orden', 'STOCK_RESERVE_FAILED');
        }

        return ApiResponse.success({ ...order, items: orderItems }, 201);
    } catch (error) {
        return ApiResponse.error(error);
    }
}
