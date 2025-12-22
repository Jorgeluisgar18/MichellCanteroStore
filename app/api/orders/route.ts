import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/orders - Obtener órdenes del usuario o todas (admin)
export async function GET() {
    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            );
        }

        // Verificar si es admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        let query = supabase
            .from('orders')
            .select(`
        *,
        order_items (*)
      `)
            .order('created_at', { ascending: false });

        // Si no es admin, solo ver sus propias órdenes
        if (profile?.role !== 'admin') {
            query = query.eq('user_id', session.user.id);
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
        const body = await request.json();

        // Desestructurar lo que viene del checkout
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
        } = body;

        // Calcular totales si no vienen
        const subtotal = items.reduce((acc: number, item: { product_price: number; quantity: number }) => acc + (item.product_price * item.quantity), 0);
        const tax = subtotal * 0.19;
        const shipping = subtotal > 150000 ? 0 : 12000;
        const total = subtotal + tax + shipping;

        // Generar número de orden (MC-YYYYMMDD-XXXX)
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
        const orderNumber = `MC-${dateStr}-${randomPart}`;

        // Crear orden
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
            console.error('Error creating order:', orderError);
            return NextResponse.json(
                { error: 'Error al crear orden en BD' },
                { status: 500 }
            );
        }

        // Crear items de la orden
        const orderItems = items.map((item: {
            product_id: string;
            product_name: string;
            product_price: number;
            product_image: string;
            quantity: number;
            variant_name?: string;
            variant_id?: string;
            subtotal?: number;
        }) => ({
            order_id: order.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_price: item.product_price,
            product_image: item.product_image,
            quantity: item.quantity,
            variant_name: item.variant_name || null,
            variant_id: item.variant_id || null,
            subtotal: item.subtotal || (item.product_price * item.quantity),
        }));

        const { error: itemsError } = await supabaseAdmin
            .from('order_items')
            .insert(orderItems);

        if (itemsError) {
            console.error('Error creating order items:', itemsError);
            // Intentar eliminar la orden si falló la creación de items
            await supabaseAdmin.from('orders').delete().eq('id', order.id);
            return NextResponse.json(
                { error: 'Error al crear items de la orden' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            data: {
                ...order,
                items: orderItems
            }
        }, { status: 201 });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Error del servidor' },
            { status: 500 }
        );
    }
}
