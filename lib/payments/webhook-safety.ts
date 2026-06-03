type StockConfirmationResult = {
    success?: boolean;
    error?: string;
    reservations_confirmed?: number;
} | null | undefined;

type RpcError = {
    message?: string;
} | null | undefined;

export function getStockConfirmationFailure(
    result: StockConfirmationResult,
    rpcError?: RpcError
): string | null {
    if (rpcError) {
        return rpcError.message || 'Stock confirmation RPC failed';
    }

    if (!result || result.success !== true) {
        return result?.error || 'Stock confirmation failed';
    }

    if ((result.reservations_confirmed ?? 0) < 1) {
        return 'No active stock reservation was confirmed for this order';
    }

    return null;
}

export function isDuplicateTransactionWebhook(
    wompiStatus: string,
    currentPaymentStatus: string | null | undefined
): boolean {
    return (
        (wompiStatus === 'APPROVED' && currentPaymentStatus === 'paid') ||
        ((wompiStatus === 'DECLINED' || wompiStatus === 'ERROR') && currentPaymentStatus === 'failed')
    );
}

export function isValidWompiSignatureShape(signature: unknown): signature is {
    checksum: string;
    properties: string[];
} {
    if (!signature || typeof signature !== 'object') {
        return false;
    }

    const checksum = Reflect.get(signature, 'checksum');
    const properties = Reflect.get(signature, 'properties');

    return (
        typeof checksum === 'string' &&
        /^[a-f0-9]{64}$/i.test(checksum) &&
        Array.isArray(properties) &&
        properties.every((property) => typeof property === 'string' && property.length > 0)
    );
}
