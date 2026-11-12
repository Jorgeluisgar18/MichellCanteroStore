import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase-server';
import { canAccessCheckoutParams } from '@/lib/checkout/safety';
import { captureCheckoutIssue } from '@/lib/observability/checkout';
import { logger } from '@/lib/utils/logger';
import { getWompiTransactionById } from '@/lib/payments/wompi';
import { finalizeWompiPayment } from '@/lib/payments/finalize-payment';
import { getPaymentStatusForWompiStatus, getSuccessfulWompiReconciliationTransaction } from '@/lib/payments/webhook-safety';

export async function POST(request: Request) {
    try {
        const { orderId, email, transactionId } = await request.json();
        if (!orderId || !email || !transactionId) {
            return NextResponse.json({ error: 'Faltan parametros: orderId, email y transactionId son requeridos' }, { status: 400 });
        }
        const { data: { user } } = await createClient().auth.getUser();
        const { data: order, error } = await supabaseAdmin.from('orders')
            .select('id, total, order_number, user_id, payment_status, inventory_status, shipping_email, shipping_name, shipping_phone, shipping_address, shipping_city, wompi_transaction_id, status')
            .eq('id', orderId).single();
        if (error || !order) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        if (!canAccessCheckoutParams({ orderUserId: order.user_id, authenticatedUserId: user?.id ?? null,
            orderEmail: order.shipping_email, requestEmail: email })) {
            return NextResponse.json({ error: 'No tienes permiso para reconciliar esta orden' }, { status: 403 });
        }
        const privateKey = process.env.WOMPI_PRIVATE_KEY;
        if (!privateKey) {
            captureCheckoutIssue({ area: 'wompi_reconciliation', name: 'wompi_private_key_missing', level: 'fatal',
                route: '/api/payments/reconcile', orderId: order.id });
            return NextResponse.json({ error: 'Configuracion de pago incompleta' }, { status: 500 });
        }
        const transaction = await getWompiTransactionById({ transactionId, privateKey });
        const approved = getSuccessfulWompiReconciliationTransaction({ orderNumber: order.order_number,
            orderTotal: Number(order.total), transactions: transaction ? [transaction] : [] });
        if (!approved) {
            captureCheckoutIssue({ area: 'wompi_reconciliation', name: 'approved_transaction_not_found',
                level: getPaymentStatusForWompiStatus(transaction?.status ?? '') === 'failed' ? 'warning' : 'error',
                route: '/api/payments/reconcile', orderId: order.id, transactionId, status: transaction?.status ?? null });
            return NextResponse.json({ error: 'La transaccion aun no aparece aprobada en Wompi' },
                { status: getPaymentStatusForWompiStatus(transaction?.status ?? '') === 'failed' ? 409 : 202 });
        }
        const result = await finalizeWompiPayment(supabaseAdmin, order.id, approved);
        if (result.outcome === 'conflict') {
            captureCheckoutIssue({ area: 'wompi_reconciliation', name: 'terminal_transaction_conflict',
                route: '/api/payments/reconcile', orderId: order.id, transactionId });
            return NextResponse.json({ error: 'Conflicto de transaccion terminal' }, { status: 409 });
        }
        if (result.outcome === 'not_found') return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        if (result.outcome === 'inventory_review') {
            captureCheckoutIssue({ area: 'stock', name: 'stock_confirmation_blocked_paid_reconciliation',
                route: '/api/payments/reconcile', orderId: order.id, orderNumber: order.order_number,
                transactionId, reason: result.reason ?? null });
            return NextResponse.json({ error: 'Pago aprobado, pero el inventario requiere revision manual' }, { status: 409 });
        }
        if (result.outcome === 'ignored') return NextResponse.json({ error: 'Conflicto de transaccion terminal' }, { status: 409 });
        if (!result.changed) return NextResponse.json({ data: { status: 'already_paid', orderId: order.id } });
        try {
            const { data: items } = await supabaseAdmin.from('order_items').select('*').eq('order_id', order.id);
            if (items) {
                const { sendOrderNotificationToAdmin, sendOrderConfirmationToCustomer } = await import('@/lib/email');
                await sendOrderNotificationToAdmin(order, items);
                await sendOrderConfirmationToCustomer(order, items);
            }
        } catch (emailError) {
            captureCheckoutIssue({ area: 'checkout', name: 'reconciled_order_email_notification_failed', level: 'warning',
                route: '/api/payments/reconcile', orderId: order.id, transactionId }, emailError);
        }
        return NextResponse.json({ data: { status: 'reconciled', orderId: order.id, orderNumber: order.order_number } });
    } catch (error) {
        logger.error('[reconcile] Error inesperado', error);
        captureCheckoutIssue({ area: 'wompi_reconciliation', name: 'unhandled_exception', route: '/api/payments/reconcile' }, error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
