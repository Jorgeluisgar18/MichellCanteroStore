import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { captureCheckoutIssue } from '@/lib/observability/checkout';
import { logger } from '@/lib/utils/logger';
import { getSuccessfulWompiReconciliationTransaction } from '@/lib/payments/webhook-safety';
import { finalizeWompiPayment } from '@/lib/payments/finalize-payment';
import { getWompiTransactionById, getWompiTransactionsByReference } from '@/lib/payments/wompi';

const AUDIT_LIMIT = 25;
type PendingOrder = { id: string; order_number: string; total: number | string; wompi_transaction_id: string | null };

async function auditPendingOrder(order: PendingOrder, privateKey: string): Promise<'reconciled' | 'manual_review' | 'unchanged'> {
    const transaction = order.wompi_transaction_id
        ? await getWompiTransactionById({ transactionId: order.wompi_transaction_id, privateKey }) : null;
    let approved = getSuccessfulWompiReconciliationTransaction({ orderNumber: order.order_number,
        orderTotal: Number(order.total), transactions: transaction ? [transaction] : [] });
    if (!approved) {
        approved = getSuccessfulWompiReconciliationTransaction({ orderNumber: order.order_number,
            orderTotal: Number(order.total), transactions: await getWompiTransactionsByReference({ reference: order.order_number, privateKey }) });
    }
    if (!approved) return 'unchanged';
    const result = await finalizeWompiPayment(supabaseAdmin, order.id, approved);
    if (result.outcome === 'inventory_review') {
        captureCheckoutIssue({ area: 'stock', name: 'stock_confirmation_blocked_pending_payment_audit',
            route: '/api/cron/audit-pending-payments', orderId: order.id, orderNumber: order.order_number,
            transactionId: approved.id, status: approved.status ?? null, reason: result.reason ?? null });
        return 'manual_review';
    }
    if (result.outcome === 'conflict' || result.outcome === 'not_found') throw new Error('Payment finalization conflict');
    if (!result.changed || result.outcome !== 'finalized') return 'unchanged';
    try {
        const { data: paidOrder, error: orderError } = await supabaseAdmin.from('orders').select('*').eq('id', order.id).single();
        const { data: items, error: itemsError } = await supabaseAdmin.from('order_items').select('*').eq('order_id', order.id);
        if (orderError || itemsError || !paidOrder || !items) throw new Error('Could not load finalized order notification');
        const { sendOrderNotificationToAdmin, sendOrderConfirmationToCustomer } = await import('@/lib/email');
        await sendOrderNotificationToAdmin(paidOrder, items);
        await sendOrderConfirmationToCustomer(paidOrder, items);
    } catch (emailError) {
        captureCheckoutIssue({ area: 'checkout', name: 'pending_payment_audit_email_notification_failed', level: 'warning',
            route: '/api/cron/audit-pending-payments', orderId: order.id, transactionId: approved.id }, emailError);
    }
    return 'reconciled';
}

export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const privateKey = process.env.WOMPI_PRIVATE_KEY;
    if (!privateKey) {
        captureCheckoutIssue({ area: 'wompi_reconciliation', name: 'pending_payment_audit_wompi_private_key_missing',
            level: 'fatal', route: '/api/cron/audit-pending-payments' });
        return NextResponse.json({ error: 'Payment configuration unavailable' }, { status: 503 });
    }
    const auditBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const auditAfter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: orders, error } = await supabaseAdmin.from('orders')
        .select('id, order_number, total, status, payment_status, wompi_transaction_id')
        .or('payment_status.eq.pending,and(payment_status.eq.paid,inventory_status.eq.review_required)')
        .lt('created_at', auditBefore).gte('created_at', auditAfter)
        .order('created_at', { ascending: true }).limit(AUDIT_LIMIT);
    if (error) {
        captureCheckoutIssue({ area: 'wompi_reconciliation', name: 'pending_payment_audit_order_lookup_failed',
            route: '/api/cron/audit-pending-payments', metadata: { ordersError: error } }, error);
        return NextResponse.json({ error: 'Could not load pending orders' }, { status: 500 });
    }
    const summary = { scanned: orders?.length ?? 0, reconciled: 0, manualReview: 0, unchanged: 0, failed: 0 };
    for (const order of orders ?? []) {
        try {
            const result = await auditPendingOrder(order, privateKey);
            if (result === 'reconciled') summary.reconciled += 1;
            if (result === 'manual_review') summary.manualReview += 1;
            if (result === 'unchanged') summary.unchanged += 1;
        } catch (error) {
            summary.failed += 1;
            captureCheckoutIssue({ area: 'wompi_reconciliation', name: 'pending_payment_audit_order_failed',
                route: '/api/cron/audit-pending-payments', orderId: order.id, orderNumber: order.order_number }, error);
        }
    }
    logger.info('[pending-payment-audit] Auditoria finalizada', summary);
    return NextResponse.json({ success: true, ...summary });
}

export async function POST(request: Request) { return GET(request); }
