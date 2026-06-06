import crypto from 'crypto';

export interface WompiCheckoutParamsInput {
    publicKey: string;
    integritySecret: string;
    siteUrl: string;
    orderId: string;
    orderNumber: string;
    orderTotal: number;
    customerEmail: string;
    currency?: 'COP';
}

export interface WompiCheckoutParams {
    publicKey: string;
    currency: 'COP';
    amountInCents: number;
    reference: string;
    signature: string;
    redirectUrl: string;
    customerEmail: string;
}

export function getWompiAmountInCents(orderTotal: number): number {
    return Math.round(orderTotal * 100);
}

export function createWompiIntegritySignature(input: {
    orderNumber: string;
    amountInCents: number;
    currency?: 'COP';
    integritySecret: string;
}): string {
    const currency = input.currency ?? 'COP';
    const concatenation = `${input.orderNumber}${input.amountInCents}${currency}${input.integritySecret}`;

    return crypto.createHash('sha256').update(concatenation).digest('hex');
}

export function buildWompiCheckoutParams(input: WompiCheckoutParamsInput): WompiCheckoutParams {
    const currency = input.currency ?? 'COP';
    const amountInCents = getWompiAmountInCents(input.orderTotal);
    const signature = createWompiIntegritySignature({
        orderNumber: input.orderNumber,
        amountInCents,
        currency,
        integritySecret: input.integritySecret,
    });

    return {
        publicKey: input.publicKey,
        currency,
        amountInCents,
        reference: input.orderNumber,
        signature,
        redirectUrl: `${input.siteUrl}/checkout/confirmacion?orderId=${input.orderId}`,
        customerEmail: input.customerEmail,
    };
}
