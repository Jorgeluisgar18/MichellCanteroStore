import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase-server';
import {
    canAccessCheckoutParams,
    canRequestCheckoutParamsForReservation,
} from '@/lib/checkout/safety';

const WOMPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
const WOMPI_INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://michellcanterostore.com';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { orderId, email } = body;

        if (!orderId || !email) {
            return NextResponse.json({ error: 'Faltan parametros: orderId y email son requeridos' }, { status: 400 });
        }

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const authenticatedUserId = user?.id ?? null;

        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .select('id, total, order_number, user_id, payment_status, shipping_email')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        }

        if (!canAccessCheckoutParams({
            orderUserId: order.user_id,
            authenticatedUserId,
            orderEmail: order.shipping_email,
            requestEmail: email,
        })) {
            return NextResponse.json({ error: 'No tienes permiso para pagar esta orden' }, { status: 403 });
        }

        if (order.payment_status !== 'pending') {
            return NextResponse.json(
                { error: `Esta orden ya fue procesada (estado: ${order.payment_status})` },
                { status: 400 }
            );
        }

        const { count: activeReservationCount, error: reservationError } = await supabaseAdmin
            .from('stock_reservations')
            .select('id', { count: 'exact', head: true })
            .eq('order_id', orderId)
            .eq('status', 'reserved')
            .gt('expires_at', new Date().toISOString());

        if (reservationError) {
            console.error('[checkout-params] Error verificando reserva de stock:', reservationError);
            return NextResponse.json(
                { error: 'No pudimos verificar la reserva de inventario' },
                { status: 500 }
            );
        }

        if (!canRequestCheckoutParamsForReservation({ activeReservationCount })) {
            return NextResponse.json(
                { error: 'La reserva de stock expiro. Por favor actualiza tu carrito y crea una nueva orden.' },
                { status: 409 }
            );
        }

        if (!WOMPI_PUBLIC_KEY || !WOMPI_INTEGRITY_SECRET) {
            console.error('[checkout-params] Variables de Wompi no configuradas');
            return NextResponse.json({ error: 'Configuracion de pago incompleta' }, { status: 500 });
        }

        const amountInCents = Math.round(order.total * 100);
        const concatenation = `${order.order_number}${amountInCents}COP${WOMPI_INTEGRITY_SECRET}`;
        const signature = crypto.createHash('sha256').update(concatenation).digest('hex');

        return NextResponse.json({
            data: {
                publicKey: WOMPI_PUBLIC_KEY,
                currency: 'COP',
                amountInCents,
                reference: order.order_number,
                signature,
                redirectUrl: `${SITE_URL}/checkout/confirmacion?orderId=${orderId}`,
                customerEmail: email,
            }
        });

    } catch (error) {
        console.error('[checkout-params] Error inesperado:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
