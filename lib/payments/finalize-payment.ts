import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { WompiReconciliationTransaction } from './webhook-safety';

export type PaymentFinalizationResult = {
    outcome: 'finalized' | 'already_finalized' | 'inventory_review' | 'conflict' | 'ignored' | 'not_found';
    changed: boolean;
    payment_status?: string;
    inventory_status?: 'unverified' | 'confirmed' | 'review_required';
    reason?: string | null;
};

export async function finalizeWompiPayment(
    client: SupabaseClient<Database>, orderId: string, transaction: WompiReconciliationTransaction
): Promise<PaymentFinalizationResult> {
    const amount = transaction.amount_in_cents ?? transaction.amountInCents;
    if (typeof amount !== 'number' || !Number.isSafeInteger(amount) || !transaction.reference || !transaction.status || !transaction.currency) {
        throw new Error('Incomplete verified Wompi transaction');
    }
    const { data, error } = await client.rpc('finalize_wompi_payment', {
        order_id_param: orderId, transaction_id_param: transaction.id,
        transaction_status_param: transaction.status, reference_param: transaction.reference,
        amount_in_cents_param: amount, currency_param: transaction.currency,
    });
    if (error) throw error;
    if (!data || !['finalized', 'already_finalized', 'inventory_review', 'conflict', 'ignored', 'not_found'].includes(data.outcome)
        || typeof data.changed !== 'boolean') throw new Error('Invalid payment finalization result');
    return data;
}
