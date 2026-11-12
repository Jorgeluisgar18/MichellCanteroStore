import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import {
    formatWebhookTimestampForLog,
    getPaymentStatusForWompiStatus,
    isValidWompiSignatureShape,
    validateWompiTransactionAgainstOrder,
} from '@/lib/payments/webhook-safety';
import { finalizeWompiPayment } from '@/lib/payments/finalize-payment';
import { getWompiTransactionById } from '@/lib/payments/wompi';
import { supabaseAdmin } from '@/lib/supabase';
import { captureCheckoutIssue } from '@/lib/observability/checkout';
import { logger } from '@/lib/utils/logger';

function getNestedValue(source: unknown, path: string): unknown {
    let current: unknown = source;
    for (const segment of path.split('.')) {
        if (!current || typeof current !== 'object') return undefined;
        current = Reflect.get(current, segment);
    }
    return current;
}

export async function POST(request: Request) {
    try {
        const secret = process.env.WOMPI_EVENTS_SECRET;
        if (!secret) return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
        const { event, data, timestamp, signature } = await request.json();
        if (!isValidWompiSignatureShape(signature)) {
            return NextResponse.json({ error: 'Webhook signature is required' }, { status: 401 });
        }
        const signedValues = signature.properties.map((prop: string) => String(getNestedValue(data, prop) ?? '')).join('');
        const checksum = createHash('sha256').update(signedValues + timestamp + secret).digest('hex');
        if (!timingSafeEqual(Buffer.from(checksum, 'hex'), Buffer.from(signature.checksum, 'hex'))) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
        logger.info('Wompi webhook received', { event, timestamp: formatWebhookTimestampForLog(timestamp) });
        if (event !== 'transaction.updated') return NextResponse.json({ received: true });
        const transaction = data?.transaction;
        if (!transaction || typeof transaction.id !== 'string' || typeof transaction.reference !== 'string'
            || typeof transaction.status !== 'string') {
            return NextResponse.json({ error: 'Payload de transaccion invalido' }, { status: 400 });
        }
        const { data: order, error } = await supabaseAdmin.from('orders').select('*')
            .eq('order_number', transaction.reference).single();
        if (error || !order) {
            captureCheckoutIssue({ area: 'wompi_webhook', name: 'webhook_order_not_found', level: 'warning',
                route: '/api/payments/webhook', orderNumber: transaction.reference, transactionId: transaction.id }, error);
            return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        }
        const mismatch = validateWompiTransactionAgainstOrder({
            orderNumber: order.order_number, orderTotal: Number(order.total),
            transactionReference: transaction.reference,
            transactionAmountInCents: transaction.amount_in_cents ?? transaction.amountInCents,
            transactionCurrency: transaction.currency,
        });
        if (mismatch) {
            captureCheckoutIssue({ area: 'wompi_webhook', name: 'webhook_transaction_order_mismatch', level: 'warning',
                route: '/api/payments/webhook', orderId: order.id, transactionId: transaction.id, reason: mismatch });
            return NextResponse.json({ error: 'La transaccion no coincide con la orden' }, { status: 400 });
        }
        if (!getPaymentStatusForWompiStatus(transaction.status)) {
            return NextResponse.json({ received: true, ignored: true });
        }
        // The checksum need not cover reference/currency. Bind those fields to the provider's record.
        const privateKey = process.env.WOMPI_PRIVATE_KEY;
        if (!privateKey) return NextResponse.json({ error: 'Configuracion de pago incompleta' }, { status: 500 });
        const verified = await getWompiTransactionById({ transactionId: transaction.id, privateKey });
        if (!verified || verified.id !== transaction.id || validateWompiTransactionAgainstOrder({
            orderNumber: order.order_number, orderTotal: Number(order.total),
            transactionReference: verified.reference,
            transactionAmountInCents: verified.amount_in_cents ?? verified.amountInCents,
            transactionCurrency: verified.currency,
        })) return NextResponse.json({ error: 'La transaccion no coincide con la orden' }, { status: 400 });
        const result = await finalizeWompiPayment(supabaseAdmin, order.id, verified);
        if (result.outcome === 'conflict') {
            captureCheckoutIssue({ area: 'wompi_webhook', name: 'webhook_terminal_transaction_conflict',
                route: '/api/payments/webhook', orderId: order.id, transactionId: transaction.id, status: transaction.status });
            return NextResponse.json({ error: 'Conflicto de transaccion terminal' }, { status: 409 });
        }
        if (result.outcome === 'not_found') return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
        if (result.outcome === 'inventory_review') {
            captureCheckoutIssue({ area: 'stock', name: 'stock_confirmation_blocked_paid_order',
                route: '/api/payments/webhook', orderId: order.id, orderNumber: order.order_number,
                transactionId: transaction.id, status: transaction.status, reason: result.reason ?? null });
            return NextResponse.json({ error: 'No se pudo confirmar el inventario de la orden' }, { status: 409 });
        }
        if (result.outcome === 'ignored') return NextResponse.json({ received: true, ignored: true });
        if (!result.changed) return NextResponse.json({ success: true, duplicate: true });
        // Notify only after a newly committed, inventory-confirmed approval.
        if (result.payment_status === 'paid' && result.inventory_status === 'confirmed') {
            try {
                const { data: items } = await supabaseAdmin.from('order_items').select('*').eq('order_id', order.id);
                if (items) {
                    const { sendOrderNotificationToAdmin, sendOrderConfirmationToCustomer } = await import('@/lib/email');
                    await sendOrderNotificationToAdmin(order, items);
                    await sendOrderConfirmationToCustomer(order, items);
                }
            } catch (emailError) {
                captureCheckoutIssue({ area: 'checkout', name: 'order_email_notification_failed', level: 'warning',
                    route: '/api/payments/webhook', orderId: order.id, transactionId: transaction.id }, emailError);
            }
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Webhook processing error', error);
        captureCheckoutIssue({ area: 'wompi_webhook', name: 'webhook_unhandled_exception', route: '/api/payments/webhook' }, error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
