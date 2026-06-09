import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase-server';
import { canAccessCheckoutParams } from '@/lib/checkout/safety';
import { captureCheckoutIssue } from '@/lib/observability/checkout';
import { logger } from '@/lib/utils/logger';
import { getWompiTransactionById } from '@/lib/payments/wompi';
import {
    getOrderStatusForWompiStatus,
    getPaymentStatusForWompiStatus,
    getStockConfirmationFailure,
    getSuccessfulWompiReconciliationTransaction,
    getTerminalTransactionConflict,
    isDuplicateTransactionWebhook,
} from '@/lib/payments/webhook-safety';

const WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { orderId, email, transactionId } = body;

        if (!orderId || !email || !transactionId) {
            return NextResponse.json(
                { error: 'Faltan parametros: orderId, email y transactionId son requeridos' },
                { status: 400 }
            );
        }

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const authenticatedUserId = user?.id ?? null;

        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .select('id, total, order_number, user_id, payment_status, shipping_email, shipping_name, shipping_phone, shipping_address, shipping_city, wompi_transaction_id, status')
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
            return NextResponse.json({ error: 'No tienes permiso para reconciliar esta orden' }, { status: 403 });
        }

        if (order.payment_status === 'paid') {
            return NextResponse.json({ data: { status: 'already_paid', orderId: order.id } });
        }

        if (!WOMPI_PRIVATE_KEY) {
            logger.error('[reconcile] WOMPI_PRIVATE_KEY no esta configurada');
            captureCheckoutIssue({
                area: 'wompi_reconciliation',
                name: 'wompi_private_key_missing',
                level: 'fatal',
                route: '/api/payments/reconcile',
                orderId: order.id,
                orderNumber: order.order_number,
                transactionId,
            });
            return NextResponse.json({ error: 'Configuracion de pago incompleta' }, { status: 500 });
        }

        const wompiTransaction = await getWompiTransactionById({
            transactionId,
            privateKey: WOMPI_PRIVATE_KEY,
        });

        const approvedTransaction = getSuccessfulWompiReconciliationTransaction({
            orderNumber: order.order_number,
            orderTotal: Number(order.total),
            transactions: wompiTransaction ? [wompiTransaction] : [],
        });

        if (!approvedTransaction) {
            const status = wompiTransaction?.status ?? null;
            const paymentStatus = status ? getPaymentStatusForWompiStatus(status) : null;

            logger.warn('[reconcile] No hay transaccion aprobada compatible con la orden', {
                orderId: order.id,
                orderNumber: order.order_number,
                transactionId,
                status,
            });
            captureCheckoutIssue({
                area: 'wompi_reconciliation',
                name: 'approved_transaction_not_found',
                level: paymentStatus === 'failed' ? 'warning' : 'error',
                route: '/api/payments/reconcile',
                orderId: order.id,
                orderNumber: order.order_number,
                transactionId,
                status,
            });

            return NextResponse.json(
                { error: 'La transaccion aun no aparece aprobada en Wompi' },
                { status: paymentStatus === 'failed' ? 409 : 202 }
            );
        }

        const approvedStatus = approvedTransaction.status ?? null;

        const terminalConflict = getTerminalTransactionConflict({
            wompiStatus: approvedStatus ?? '',
            currentPaymentStatus: order.payment_status,
            currentTransactionId: order.wompi_transaction_id,
            incomingTransactionId: approvedTransaction.id,
        });

        if (terminalConflict) {
            captureCheckoutIssue({
                area: 'wompi_reconciliation',
                name: 'terminal_transaction_conflict',
                route: '/api/payments/reconcile',
                orderId: order.id,
                orderNumber: order.order_number,
                transactionId: approvedTransaction.id,
                status: approvedStatus,
                paymentStatus: order.payment_status,
                reason: terminalConflict,
                metadata: { currentTransactionId: order.wompi_transaction_id },
            });
            return NextResponse.json({ error: 'Conflicto de transaccion terminal' }, { status: 409 });
        }

        if (isDuplicateTransactionWebhook(
            approvedStatus ?? '',
            order.payment_status,
            order.wompi_transaction_id,
            approvedTransaction.id
        )) {
            return NextResponse.json({ data: { status: 'already_paid', orderId: order.id } });
        }

        const { data: confirmResult, error: confirmError } = await supabaseAdmin
            .rpc('confirm_stock_reservation', {
                order_id_param: order.id,
            });

        const stockFailure = getStockConfirmationFailure(confirmResult, confirmError);

        if (stockFailure) {
            logger.error('[reconcile] Confirmacion de stock bloqueo orden pagada', confirmError, {
                orderId: order.id,
                orderNumber: order.order_number,
                transactionId: approvedTransaction.id,
                stockFailure,
                confirmResult,
            });
            captureCheckoutIssue({
                area: 'stock',
                name: 'stock_confirmation_blocked_paid_reconciliation',
                route: '/api/payments/reconcile',
                orderId: order.id,
                orderNumber: order.order_number,
                transactionId: approvedTransaction.id,
                status: approvedStatus,
                reason: stockFailure,
                metadata: { confirmResult, confirmError },
            }, confirmError);
            return NextResponse.json(
                { error: 'Pago aprobado, pero el inventario requiere revision manual' },
                { status: 409 }
            );
        }

        const orderStatus = getOrderStatusForWompiStatus(approvedStatus ?? '') ?? order.status;

        const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({
                status: orderStatus,
                payment_status: 'paid',
                wompi_transaction_id: approvedTransaction.id,
                payment_id: approvedTransaction.id,
                updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

        if (updateError) {
            logger.error('[reconcile] Error actualizando orden reconciliada', updateError, {
                orderId: order.id,
                orderNumber: order.order_number,
                transactionId: approvedTransaction.id,
            });
            captureCheckoutIssue({
                area: 'wompi_reconciliation',
                name: 'order_update_failed',
                route: '/api/payments/reconcile',
                orderId: order.id,
                orderNumber: order.order_number,
                transactionId: approvedTransaction.id,
                status: approvedStatus,
                paymentStatus: 'paid',
                metadata: { updateError },
            }, updateError);
            return NextResponse.json({ error: 'Error al actualizar orden' }, { status: 500 });
        }

        try {
            const { data: orderItems } = await supabaseAdmin
                .from('order_items')
                .select('*')
                .eq('order_id', order.id);

            if (orderItems) {
                const { sendOrderNotificationToAdmin, sendOrderConfirmationToCustomer } = await import('@/lib/email');
                await sendOrderNotificationToAdmin(order, orderItems);
                await sendOrderConfirmationToCustomer(order, orderItems);
            }
        } catch (emailError) {
            logger.error('[reconcile] Error enviando emails de orden reconciliada', emailError as Error);
            captureCheckoutIssue({
                area: 'checkout',
                name: 'reconciled_order_email_notification_failed',
                level: 'warning',
                route: '/api/payments/reconcile',
                orderId: order.id,
                orderNumber: order.order_number,
                transactionId: approvedTransaction.id,
                status: approvedStatus,
            }, emailError);
        }

        logger.info('[reconcile] Orden reconciliada correctamente', {
            orderId: order.id,
            orderNumber: order.order_number,
            transactionId: approvedTransaction.id,
        });

        return NextResponse.json({
            data: {
                status: 'reconciled',
                orderId: order.id,
                orderNumber: order.order_number,
            },
        });
    } catch (error) {
        logger.error('[reconcile] Error inesperado', error);
        captureCheckoutIssue({
            area: 'wompi_reconciliation',
            name: 'unhandled_exception',
            route: '/api/payments/reconcile',
        }, error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
