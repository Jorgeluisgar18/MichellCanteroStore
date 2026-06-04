type StockConfirmationResult = {
    success?: boolean;
    error?: string;
    reservations_confirmed?: number;
} | null | undefined;

type RpcError = {
    message?: string;
} | null | undefined;

type PaymentStatus = string | null | undefined;

export interface WompiTransactionValidationInput {
    orderNumber: string;
    orderTotal: number;
    transactionReference: string | null | undefined;
    transactionAmountInCents: number | null | undefined;
    transactionCurrency: string | null | undefined;
}

export interface TerminalTransactionInput {
    wompiStatus: string;
    currentPaymentStatus: PaymentStatus;
    currentTransactionId?: string | null;
    incomingTransactionId?: string | null;
}

export function formatWebhookTimestampForLog(timestamp: unknown): string {
    const parsedTimestamp =
        typeof timestamp === 'string' || typeof timestamp === 'number'
            ? new Date(timestamp)
            : null;

    if (!parsedTimestamp || Number.isNaN(parsedTimestamp.getTime())) {
        return new Date().toISOString();
    }

    return parsedTimestamp.toISOString();
}

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
    currentPaymentStatus: PaymentStatus,
    currentTransactionId?: string | null,
    incomingTransactionId?: string | null
): boolean {
    const nextPaymentStatus = getPaymentStatusForWompiStatus(wompiStatus);

    return (
        nextPaymentStatus !== null &&
        nextPaymentStatus === currentPaymentStatus &&
        (!currentTransactionId || !incomingTransactionId || currentTransactionId === incomingTransactionId)
    );
}

export function getPaymentStatusForWompiStatus(wompiStatus: string): 'paid' | 'failed' | null {
    if (wompiStatus === 'APPROVED') return 'paid';
    if (wompiStatus === 'DECLINED' || wompiStatus === 'ERROR' || wompiStatus === 'VOIDED') return 'failed';

    return null;
}

export function getOrderStatusForWompiStatus(wompiStatus: string): 'paid' | null {
    return wompiStatus === 'APPROVED' ? 'paid' : null;
}

export function getTerminalTransactionConflict(input: TerminalTransactionInput): string | null {
    const nextPaymentStatus = getPaymentStatusForWompiStatus(input.wompiStatus);

    if (!nextPaymentStatus) {
        return null;
    }

    if (!['paid', 'failed', 'refunded'].includes(input.currentPaymentStatus ?? '')) {
        return null;
    }

    if (isDuplicateTransactionWebhook(
        input.wompiStatus,
        input.currentPaymentStatus,
        input.currentTransactionId,
        input.incomingTransactionId
    )) {
        return null;
    }

    return 'Order already has a terminal payment transaction';
}

export function validateWompiTransactionAgainstOrder(input: WompiTransactionValidationInput): string | null {
    if (input.transactionReference !== input.orderNumber) {
        return 'Transaction reference does not match order';
    }

    if (input.transactionCurrency !== 'COP') {
        return 'Transaction currency does not match order currency';
    }

    const expectedAmountInCents = Math.round(input.orderTotal * 100);

    const transactionAmountInCents = input.transactionAmountInCents;

    if (
        typeof transactionAmountInCents !== 'number' ||
        !Number.isInteger(transactionAmountInCents) ||
        transactionAmountInCents < 1
    ) {
        return 'Transaction amount is missing or invalid';
    }

    if (transactionAmountInCents !== expectedAmountInCents) {
        return 'Transaction amount does not match order total';
    }

    return null;
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
