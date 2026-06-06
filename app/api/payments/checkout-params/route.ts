import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase-server';
import { captureCheckoutIssue } from '@/lib/observability/checkout';
import { logger } from '@/lib/utils/logger';
import {
    canAccessCheckoutParams,
    canRequestCheckoutParamsForReservation,
} from '@/lib/checkout/safety';
import { buildWompiCheckoutParams } from '@/lib/payments/checkout-params';

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
            logger.error('[checkout-params] Error verificando reserva de stock', reservationError, {
                orderId,
            });
            captureCheckoutIssue({
                area: 'checkout_params',
                name: 'reservation_lookup_failed',
                route: '/api/payments/checkout-params',
                orderId,
                metadata: { reservationError },
            }, reservationError);
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
            logger.error('[checkout-params] Variables de Wompi no configuradas', {
                hasPublicKey: !!WOMPI_PUBLIC_KEY,
                hasIntegritySecret: !!WOMPI_INTEGRITY_SECRET,
            });
            captureCheckoutIssue({
                area: 'checkout_params',
                name: 'wompi_checkout_config_missing',
                level: 'fatal',
                route: '/api/payments/checkout-params',
                orderId,
                metadata: {
                    hasPublicKey: !!WOMPI_PUBLIC_KEY,
                    hasIntegritySecret: !!WOMPI_INTEGRITY_SECRET,
                },
            });
            return NextResponse.json({ error: 'Configuracion de pago incompleta' }, { status: 500 });
        }

        const checkoutParams = buildWompiCheckoutParams({
            publicKey: WOMPI_PUBLIC_KEY,
            integritySecret: WOMPI_INTEGRITY_SECRET,
            siteUrl: SITE_URL,
            orderId,
            orderNumber: order.order_number,
            orderTotal: Number(order.total),
            customerEmail: email,
        });

        return NextResponse.json({
            data: checkoutParams
        });

    } catch (error) {
        logger.error('[checkout-params] Error inesperado', error);
        captureCheckoutIssue({
            area: 'checkout_params',
            name: 'checkout_params_unhandled_exception',
            route: '/api/payments/checkout-params',
        }, error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
