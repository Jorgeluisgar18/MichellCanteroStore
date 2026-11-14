import type { WompiReconciliationTransaction } from '@/lib/payments/webhook-safety';

const WOMPI_BASE_URL = 'https://production.wompi.co/v1';

interface WompiTransactionResponse {
    data?: WompiReconciliationTransaction | null;
}

interface WompiTransactionsResponse {
    data?: WompiReconciliationTransaction[] | null;
}

function checkedTransaction(value: unknown): WompiReconciliationTransaction {
    const row = value as WompiReconciliationTransaction | null;
    if (!row || typeof row.id !== 'string' || !row.id || row.id.length > 200
        || typeof row.reference !== 'string' || !row.reference || row.reference.length > 200
        || !['APPROVED', 'DECLINED', 'PENDING', 'VOIDED', 'ERROR'].includes(row.status ?? '')
        || row.currency !== 'COP' || !Number.isSafeInteger(row.amount_in_cents) || Number(row.amount_in_cents) <= 0) {
        throw new Error('Invalid Wompi transaction response');
    }
    return row;
}

export async function getWompiTransactionById(input: {
    transactionId: string;
    privateKey: string;
}): Promise<WompiReconciliationTransaction | null> {
    const response = await fetch(`${WOMPI_BASE_URL}/transactions/${encodeURIComponent(input.transactionId)}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${input.privateKey}`,
            Accept: 'application/json',
        },
        cache: 'no-store',
    });

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error(`Wompi transaction lookup failed with status ${response.status}`);
    }

    const payload = await response.json() as WompiTransactionResponse;

    const transaction = checkedTransaction(payload.data);
    if (transaction.id !== input.transactionId) throw new Error('Wompi transaction ID mismatch');
    return transaction;
}

export async function getWompiTransactionsByReference(input: {
    reference: string;
    privateKey: string;
}): Promise<WompiReconciliationTransaction[]> {
    const url = new URL(`${WOMPI_BASE_URL}/transactions`);
    url.searchParams.set('reference', input.reference);

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${input.privateKey}`,
            Accept: 'application/json',
        },
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(`Wompi transaction reference lookup failed with status ${response.status}`);
    }

    const payload = await response.json() as WompiTransactionsResponse;

    if (!Array.isArray(payload.data)) throw new Error('Invalid Wompi reference response');
    const rows = payload.data.map(checkedTransaction);
    if (rows.some(row => row.reference !== input.reference) || new Set(rows.map(row => row.id)).size !== rows.length) {
        throw new Error('Wompi reference response mismatch');
    }
    return rows;
}
