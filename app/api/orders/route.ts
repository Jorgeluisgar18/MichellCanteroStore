import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/orders - Obtener órdenes del usuario o todas (admin)
export async function GET() {
    try {
        const { createClient } = await import('@/lib/supabase-server');
        const supabase = createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            );
        }

        // Verificar si es admin usando supabaseAdmin para mayor seguridad
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

        // Si no es admin, solo ver sus propias órdenes
        if (profile?.role !== 'admin') {
            query = query.eq('user_id', user.id);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching orders:', error);
            return NextResponse.json(
                { error: 'Error al obtener órdenes' },
                { status: 500 }
            );
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Error del servidor' },
            { status: 500 }
        );
    }
}

// POST /api/orders - Crear nueva orden
export async function POST(request: Request) {
    try {
        // ✅ SECURITY: Rate limiting
        const { checkRateLimit, getClientIdentifier, getRateLimitHeaders } = await import('@/lib/middleware/ratelimit');
        const clientId = getClientIdentifier(request);
        const rateLimitResult = checkRateLimit(clientId, { maxRequests: 10, windowMs: 60000 });

        if (!rateLimitResult.success) {
            return NextResponse.json(
                { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
                {
                    status: 429,
                    headers: getRateLimitHeaders(rateLimitResult)
                }
            );
        }

        const body = await request.json();

        // ✅ SECURITY: Validate input with Zod
        const { CreateOrderSchema } = await import('@/lib/validations/order');
        const { logger, logApiRequest, logApiError } = await import('@/lib/utils/logger');

        let validatedData;
        try {
            validatedData = CreateOrderSchema.parse(body);
        } catch (error: unknown) {
            const validationError = error as { errors?: Array<{ message: string }> };
            logger.warn('Order validation failed', {
                errors: validationError.errors?.map((e: { message: string }) => e.message)
            });
            return NextResponse.json(
                { error: 'Datos inválidos', details: validationError.errors },
                { status: 400 }
            );
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
            userId,
            customer_notes
        } = validatedData;

        logApiRequest('POST', '/api/orders', userId || 'guest');

        // ✅ SECURITY: Get real product data from database (prevent price manipulation)
        const productIds = items.map((item) => item.product_id);
        const { data: productsInDb, error: productsError } = await supabaseAdmin
            .from('products')
            .select('id, name, price, stock_quantity, in_stock, images')
            .in('id', productIds);

        if (productsError) {
            logApiError('POST', '/api/orders', productsError, userId || 'guest');
            throw new Error('Error al verificar inventario');
        }

        // Validate stock and build items with REAL prices
        const validatedItems = [];
        for (const item of items) {
            const product = productsInDb?.find(p => p.id === item.product_id);

            if (!product) {
                return NextResponse.json({
                    error: `Producto no encontrado`
                }, { status: 400 });
            }

            if (!product.in_stock || product.stock_quantity < item.quantity) {
                return NextResponse.json({
                    error: `Stock insuficiente para ${product.name}. Disponible: ${product.stock_quantity}`
                }, { status: 400 });
            }

            // ✅ SECURITY: Use REAL price from database, not client-provided price
            validatedItems.push({
                product_id: item.product_id,
                product_name: product.name,
                product_price: product.price, // ← Real price from DB
                product_image: product.images?.[0] || '', // First image from product
                quantity: item.quantity,
                variant_name: item.variant_name || null,
                variant_id: item.variant_id || null,
            });
        }

        // ✅ SECURITY: Calculate totals server-side with REAL prices
        const subtotal = validatedItems.reduce((acc, item) =>
            acc + (item.product_price * item.quantity), 0
        );
        const tax = 0; // Tax included in price
        const shipping = subtotal >= 200000 ? 0 : 12000;
        const total = subtotal + tax + shipping;

        // Generate order number (MC-YYYYMMDD-XXXX)
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
        const orderNumber = `MC-${dateStr}-${randomPart}`;

        // Create order
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert([{
                user_id: userId || null,
                order_number: orderNumber,
                status: 'pending',
                payment_status: 'pending',
                subtotal,
                tax,
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
            }])
            .select()
            .single();

        if (orderError) {
            logApiError('POST', '/api/orders', orderError, userId || 'guest');
            return NextResponse.json(
                { error: `Error al crear orden en BD: ${orderError.message}` },
                { status: 500 }
            );
        }

        // Create order items with validated data
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

        const { error: itemsError } = await supabaseAdmin
            .from('order_items')
            .insert(orderItems);

        if (itemsError) {
            logApiError('POST', '/api/orders/items', itemsError, userId || 'guest');
            // Rollback: delete the order if items creation failed
            await supabaseAdmin.from('orders').delete().eq('id', order.id);
            return NextResponse.json(
                { error: 'Error al crear items de la orden' },
                { status: 500 }
            );
        }

        logger.info('Order created successfully', {
            orderId: order.id,
            orderNumber: order.order_number,
            total: order.total
        });

        return NextResponse.json({
            data: {
                ...order,
                items: orderItems
            }
        }, { status: 201 });
    } catch (error: unknown) {
        const { logApiError } = await import('@/lib/utils/logger');
        logApiError('POST', '/api/orders', error instanceof Error ? error : new Error(String(error)));
        return NextResponse.json(
            { error: 'Error del servidor' },
            { status: 500 }
        );
    }
}
