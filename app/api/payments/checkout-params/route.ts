import { NextResponse } from 'next/server';
import { commerceMaintenanceResponse } from '@/lib/commerce/maintenance';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase-server';
import { captureCheckoutIssue } from '@/lib/observability/checkout';
import { logger } from '@/lib/utils/logger';
import {
    canAccessCheckoutParams,
} from '@/lib/checkout/safety';
import { buildWompiCheckoutParams } from '@/lib/payments/checkout-params';

const WOMPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
const WOMPI_INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://michellcanterostore.com';

export async function POST(request: Request) {
    const maintenance = commerceMaintenanceResponse();
    if (maintenance) return maintenance;
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

        const { data: claim, error: claimError } = await supabaseAdmin.rpc('claim_wompi_checkout', { order_id_param: orderId });
        if (claimError || !claim) throw claimError ?? new Error('Missing checkout claim');
        if (claim.outcome === 'existing' || claim.outcome === 'processed') {
            return NextResponse.json({ code: 'payment_verification_required', orderId }, { status: 202 });
        }
        if (claim.outcome !== 'issued' || typeof claim.total !== 'number' || !claim.order_number) {
            return NextResponse.json({ error: 'No pudimos iniciar otro pago. Verifica el estado de tu pedido.' }, { status: 409 });
        }
        const checkoutParams = buildWompiCheckoutParams({
            publicKey: WOMPI_PUBLIC_KEY,
            integritySecret: WOMPI_INTEGRITY_SECRET,
            siteUrl: SITE_URL,
            orderId,
            orderNumber: claim.order_number,
            orderTotal: claim.total,
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
