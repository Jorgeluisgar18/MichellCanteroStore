import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { captureCheckoutIssue } from '@/lib/observability/checkout';
import { logger } from '@/lib/utils/logger';
import {
    getStockConfirmationFailure,
    getSuccessfulWompiReconciliationTransaction,
} from '@/lib/payments/webhook-safety';
import {
    getWompiTransactionById,
    getWompiTransactionsByReference,
} from '@/lib/payments/wompi';

const AUDIT_LIMIT = 25;
const WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY;

type PendingOrder = {
    id: string;
    order_number: string;
    total: number | string;
    status: string | null;
    payment_status: string | null;
    wompi_transaction_id: string | null;
};

async function sendReconciledOrderEmails(orderId: string): Promise<void> {
    const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('id, order_number, total, shipping_name, shipping_email, shipping_phone, shipping_address, shipping_city')
        .eq('id', orderId)
        .single();

    if (orderError || !order) {
        throw orderError || new Error('Reconciled order not found for email notification');
    }

    const { data: orderItems, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select('product_name, quantity, product_price')
        .eq('order_id', orderId);

    if (itemsError || !orderItems) {
        throw itemsError || new Error('Reconciled order items not found for email notification');
    }

    const { sendOrderNotificationToAdmin, sendOrderConfirmationToCustomer } = await import('@/lib/email');
    await sendOrderNotificationToAdmin(order, orderItems);
    await sendOrderConfirmationToCustomer(order, orderItems);
}

async function auditPendingOrder(order: PendingOrder): Promise<'reconciled' | 'manual_review' | 'unchanged'> {
    if (!WOMPI_PRIVATE_KEY) {
        throw new Error('WOMPI_PRIVATE_KEY is not configured');
    }

    const transactionById = order.wompi_transaction_id
        ? await getWompiTransactionById({
            transactionId: order.wompi_transaction_id,
            privateKey: WOMPI_PRIVATE_KEY,
        })
        : null;

    const transactions = transactionById
        ? [transactionById]
        : await getWompiTransactionsByReference({
            reference: order.order_number,
            privateKey: WOMPI_PRIVATE_KEY,
        });

    const approvedTransaction = getSuccessfulWompiReconciliationTransaction({
        orderNumber: order.order_number,
        orderTotal: Number(order.total),
        transactions,
    });

    if (!approvedTransaction) {
        return 'unchanged';
    }

    const { data: confirmResult, error: confirmError } = await supabaseAdmin
        .rpc('confirm_stock_reservation', {
            order_id_param: order.id,
        });

    const stockFailure = getStockConfirmationFailure(confirmResult, confirmError);

    if (stockFailure) {
        logger.error('[pending-payment-audit] Pago aprobado bloqueado por inventario', confirmError, {
            orderId: order.id,
            orderNumber: order.order_number,
            transactionId: approvedTransaction.id,
            stockFailure,
            confirmResult,
        });
        captureCheckoutIssue({
            area: 'stock',
            name: 'stock_confirmation_blocked_pending_payment_audit',
            route: '/api/cron/audit-pending-payments',
            orderId: order.id,
            orderNumber: order.order_number,
            transactionId: approvedTransaction.id,
            status: approvedTransaction.status ?? null,
            reason: stockFailure,
            metadata: { confirmResult, confirmError },
        }, confirmError);
        return 'manual_review';
    }

    const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
            status: 'paid',
            payment_status: 'paid',
            wompi_transaction_id: approvedTransaction.id,
            payment_id: approvedTransaction.id,
            updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .eq('payment_status', 'pending');

    if (updateError) {
        captureCheckoutIssue({
            area: 'wompi_reconciliation',
            name: 'pending_payment_audit_order_update_failed',
            route: '/api/cron/audit-pending-payments',
            orderId: order.id,
            orderNumber: order.order_number,
            transactionId: approvedTransaction.id,
            status: approvedTransaction.status ?? null,
            paymentStatus: 'paid',
            metadata: { updateError },
        }, updateError);
        throw updateError;
    }

    try {
        await sendReconciledOrderEmails(order.id);
    } catch (emailError) {
        logger.error('[pending-payment-audit] Error enviando emails de orden reconciliada', emailError as Error, {
            orderId: order.id,
            orderNumber: order.order_number,
            transactionId: approvedTransaction.id,
        });
        captureCheckoutIssue({
            area: 'checkout',
            name: 'pending_payment_audit_email_notification_failed',
            level: 'warning',
            route: '/api/cron/audit-pending-payments',
            orderId: order.id,
            orderNumber: order.order_number,
            transactionId: approvedTransaction.id,
            status: approvedTransaction.status ?? null,
        }, emailError);
    }

    return 'reconciled';
}

export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        logger.error('[pending-payment-audit] CRON_SECRET no configurado');
        return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
        logger.warn('[pending-payment-audit] Intento de acceso no autorizado');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!WOMPI_PRIVATE_KEY) {
        captureCheckoutIssue({
            area: 'wompi_reconciliation',
            name: 'pending_payment_audit_wompi_private_key_missing',
            level: 'fatal',
            route: '/api/cron/audit-pending-payments',
        });
        return NextResponse.json({ error: 'Payment configuration unavailable' }, { status: 503 });
    }

    const auditBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const auditAfter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: orders, error: ordersError } = await supabaseAdmin
        .from('orders')
        .select('id, order_number, total, status, payment_status, wompi_transaction_id')
        .eq('payment_status', 'pending')
        .lt('created_at', auditBefore)
        .gte('created_at', auditAfter)
        .order('created_at', { ascending: true })
        .limit(AUDIT_LIMIT);

    if (ordersError) {
        captureCheckoutIssue({
            area: 'wompi_reconciliation',
            name: 'pending_payment_audit_order_lookup_failed',
            route: '/api/cron/audit-pending-payments',
            metadata: { ordersError },
        }, ordersError);
        return NextResponse.json({ error: 'Could not load pending orders' }, { status: 500 });
    }

    const summary = {
        scanned: orders?.length ?? 0,
        reconciled: 0,
        manualReview: 0,
        unchanged: 0,
        failed: 0,
    };

    for (const order of orders ?? []) {
        try {
            const result = await auditPendingOrder(order as PendingOrder);
            if (result === 'reconciled') summary.reconciled += 1;
            if (result === 'manual_review') summary.manualReview += 1;
            if (result === 'unchanged') summary.unchanged += 1;
        } catch (error) {
            summary.failed += 1;
            logger.error('[pending-payment-audit] Error auditando orden pendiente', error, {
                orderId: order.id,
                orderNumber: order.order_number,
            });
            captureCheckoutIssue({
                area: 'wompi_reconciliation',
                name: 'pending_payment_audit_order_failed',
                route: '/api/cron/audit-pending-payments',
                orderId: order.id,
                orderNumber: order.order_number,
            }, error);
        }
    }

    logger.info('[pending-payment-audit] Auditoria finalizada', summary);

    return NextResponse.json({ success: true, ...summary });
}

export async function POST(request: Request) {
    return GET(request);
}
