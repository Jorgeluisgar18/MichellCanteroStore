import { supabaseAdmin } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-responses';
import { createClient } from '@/lib/supabase-server';
import { captureCheckoutIssue } from '@/lib/observability/checkout';
import { getOrderReplayStatus } from '@/lib/checkout/idempotency';
import type { CreateOrderInput } from '@/lib/validations/order';
import {
    calculateCheckoutShippingCost,
    canReuseExistingOrderForIdempotency,
    normalizeOrderShippingFields,
} from '@/lib/checkout/safety';

export const dynamic = 'force-dynamic';

async function findIdempotentOrder(key: string, input: CreateOrderInput, userId: string | null) {
    const { data: existing, error } = await supabaseAdmin.from('orders')
        .select('*, order_items (*)').eq('idempotency_key', key).maybeSingle();
    if (error) return ApiResponse.error('Error al verificar el intento de compra');
    if (!existing) return null;
    // Authorize before exposing intent mismatches or creation progress.
    if (!canReuseExistingOrderForIdempotency({ existingOrderUserId: existing.user_id,
        authenticatedUserId: userId, existingOrderEmail: existing.shipping_email, requestEmail: input.shipping_email })) {
        return ApiResponse.forbidden('No tienes permiso para reutilizar esta orden');
    }
    const replay = getOrderReplayStatus(existing, input);
    if (replay === 'mismatch') return ApiResponse.error('Este intento de compra corresponde a otros datos o productos', 409);
    if (replay === 'incomplete') {
        const response = ApiResponse.error('La orden todavía se está preparando. Intenta nuevamente en unos segundos.', 409);
        response.headers.set('Retry-After', '3');
        return response;
    }
    return ApiResponse.success(existing);
}

/**
 * GET /api/orders
 * Fetch orders for current user or all orders for admins.
 */
export async function GET() {
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return ApiResponse.unauthorized();
        }

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
            return ApiResponse.error('Error al obtener ordenes');
        }

        return ApiResponse.success(data);
    } catch (error) {
        return ApiResponse.error(error);
    }
}

/**
 * POST /api/orders
 * Create a pending order, its items and stock holds in one database transaction.
 *
 * The customer is allowed to continue to Wompi only after stock has been
 * reserved. This prevents paid orders for inventory that cannot be fulfilled.
 */
export async function POST(request: Request) {
    try {
        const { checkRateLimit, getClientIdentifier } = await import('@/lib/middleware/ratelimit');
        const clientId = getClientIdentifier(request);
        const rateLimitResult = await checkRateLimit(clientId, { maxRequests: 10, windowMs: 60000 });

        if (!rateLimitResult.success) {
            return ApiResponse.error('Demasiadas solicitudes. Por favor intenta de nuevo mas tarde.', 429);
        }

        const body = await request.json();
        const { CreateOrderSchema } = await import('@/lib/validations/order');
        const { logger, logApiRequest, logApiError } = await import('@/lib/utils/logger');

        const { success, data: validatedData, error: valError } = CreateOrderSchema.safeParse(body);

        if (!success) {
            logger.warn('Order validation failed', { errors: valError.errors });
            return ApiResponse.badRequest('Datos de orden invalidos', 'VALIDATION_ERROR');
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
            shipping_location,
        } = validatedData;

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const authenticatedUserId = user?.id ?? null;

        logApiRequest('POST', '/api/orders', authenticatedUserId || 'guest');

        if (idempotency_key) {
            const replay = await findIdempotentOrder(idempotency_key, validatedData, authenticatedUserId);
            if (replay) return replay;
        }

        const productIds = items.map((item) => item.product_id);
        const { data: productsInDb, error: productsError } = await supabaseAdmin
            .from('products')
            .select('id, name, price, stock_quantity, in_stock, images, variants')
            .in('id', productIds);

        if (productsError) {
            throw new Error('Error al verificar inventario');
        }

        const validatedItems = [];
        for (const item of items) {
            const product = productsInDb?.find(p => p.id === item.product_id);

            if (!product) {
                return ApiResponse.badRequest(`Producto ${item.product_id} no encontrado`);
            }

            if (!product.in_stock || product.stock_quantity < item.quantity) {
                return ApiResponse.badRequest(`La cantidad solicitada de "${product.name}" ya no esta disponible. Por favor actualiza tu carrito.`);
            }

            let finalPrice = product.price;
            if (item.variant_id && Array.isArray(product.variants)) {
                const variant = (product.variants as Array<{
                    id: string;
                    priceModifier?: number;
                }>).find(v => v.id === item.variant_id);

                if (typeof variant?.priceModifier === 'number') {
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

        const subtotal = validatedItems.reduce((acc, item) => acc + (item.product_price * item.quantity), 0);
        const shipping = calculateCheckoutShippingCost({
            subtotal,
            shippingMethod: shipping_method,
            shippingLocation: shipping_location,
        });
        const total = subtotal + shipping;

        const { randomBytes } = await import('crypto');
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const suffix = randomBytes(3).toString('hex').toUpperCase();
        const orderNumber = `MC-${dateStr}-${suffix}`;
        const normalizedShippingFields = normalizeOrderShippingFields({
            shipping_address,
            shipping_city,
            shipping_state,
            shipping_zip_code,
        });

        const { data: created, error: orderError } = await supabaseAdmin.rpc('create_order_with_stock', {
            order_param: {
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
                ...normalizedShippingFields,
                payment_method: payment_method || 'wompi',
                customer_notes: customer_notes || null,
                idempotency_key: idempotency_key || null,
                shipping_method,
                shipping_location,
            },
            items_param: validatedItems,
        });

        if (orderError) {
            if (orderError.code === '23505' && idempotency_key) {
                const replay = await findIdempotentOrder(idempotency_key, validatedData, authenticatedUserId);
                if (replay) return replay;
            }
            if (orderError.code === 'P0001') {
                captureCheckoutIssue({ area: 'stock', name: 'stock_reservation_failed', level: 'warning',
                    route: '/api/orders', orderNumber, reason: 'Atomic stock reservation rejected' });
                return ApiResponse.badRequest('No pudimos reservar el inventario de tu pedido. Actualiza tu carrito e intenta nuevamente.', 'STOCK_RESERVATION_FAILED');
            }
            if (orderError.code === 'P0002') {
                return ApiResponse.error('El catálogo cambió mientras preparábamos tu pedido. Intenta nuevamente.', 409);
            }
            logApiError('POST', '/api/orders', orderError);
            captureCheckoutIssue({
                area: 'checkout',
                name: 'order_create_transaction_failed',
                route: '/api/orders',
                metadata: { orderError },
            }, orderError);
            return ApiResponse.error('Error al crear la orden');
        }

        if (!created?.order?.id || !Array.isArray(created.items)) return ApiResponse.error('Respuesta de creación de orden inválida');
        return ApiResponse.success({ ...created.order, items: created.items }, 201);
    } catch (error) {
        captureCheckoutIssue({
            area: 'checkout',
            name: 'order_create_unhandled_exception',
            route: '/api/orders',
        }, error);
        return ApiResponse.error(error);
    }
}
