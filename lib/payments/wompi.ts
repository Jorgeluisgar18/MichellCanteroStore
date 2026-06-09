import type { WompiReconciliationTransaction } from '@/lib/payments/webhook-safety';

const WOMPI_BASE_URL = 'https://production.wompi.co/v1';

interface WompiTransactionResponse {
    data?: WompiReconciliationTransaction | null;
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

    return payload.data ?? null;
}
