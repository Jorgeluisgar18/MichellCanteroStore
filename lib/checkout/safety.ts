import { STORE_CONFIG } from '@/lib/config';

export interface ShippingFieldsInput {
    shipping_address: string | null | undefined;
    shipping_city: string | null | undefined;
    shipping_state: string | null | undefined;
    shipping_zip_code: string | null | undefined;
}

export interface CheckoutAccessInput {
    orderUserId: string | null;
    authenticatedUserId: string | null;
    orderEmail: string | null;
    requestEmail: string | null;
}

export interface IdempotencyReuseInput {
    existingOrderUserId: string | null;
    authenticatedUserId: string | null;
    existingOrderEmail: string | null;
    requestEmail: string | null;
}

export interface ReservationAttemptResult {
    productName: string;
    success: boolean;
    error?: string;
}

export interface CheckoutReservationInput {
    activeReservationCount: number | null | undefined;
}

export interface CheckoutShippingInput {
    subtotal: number;
    shippingMethod: string;
    shippingLocation?: string | null | undefined;
}

function normalizeNullableText(value: string | null | undefined): string {
    return value?.trim() ?? '';
}

export function normalizeOrderShippingFields(input: ShippingFieldsInput) {
    return {
        shipping_address: normalizeNullableText(input.shipping_address),
        shipping_city: normalizeNullableText(input.shipping_city),
        shipping_state: normalizeNullableText(input.shipping_state),
        shipping_zip_code: normalizeNullableText(input.shipping_zip_code),
    };
}

export function normalizeEmail(value: string | null | undefined): string {
    return value?.trim().toLowerCase() ?? '';
}

export function canAccessCheckoutParams(input: CheckoutAccessInput): boolean {
    if (input.orderUserId) {
        return input.authenticatedUserId === input.orderUserId;
    }

    const orderEmail = normalizeEmail(input.orderEmail);
    const requestEmail = normalizeEmail(input.requestEmail);

    return orderEmail.length > 0 && orderEmail === requestEmail;
}

export function canReuseExistingOrderForIdempotency(input: IdempotencyReuseInput): boolean {
    if (input.existingOrderUserId) {
        return input.authenticatedUserId === input.existingOrderUserId;
    }

    const existingOrderEmail = normalizeEmail(input.existingOrderEmail);
    const requestEmail = normalizeEmail(input.requestEmail);

    return existingOrderEmail.length > 0 && existingOrderEmail === requestEmail;
}

export function canRequestCheckoutParamsForReservation(input: CheckoutReservationInput): boolean {
    return (input.activeReservationCount ?? 0) > 0;
}

export function calculateCheckoutShippingCost(input: CheckoutShippingInput): number {
    if (input.shippingMethod === 'pickup') return 0;
    if (input.subtotal >= STORE_CONFIG.FREE_SHIPPING_THRESHOLD) return 0;

    return (
        STORE_CONFIG.SHIPPING_RATES[input.shippingLocation ?? ''] ??
        STORE_CONFIG.SHIPPING_RATES['resto-colombia'] ??
        0
    );
}

export function getReservationFailureMessage(results: ReservationAttemptResult[]): string | null {
    const failedProducts = results
        .filter((result) => !result.success)
        .map((result) => result.productName);

    if (failedProducts.length === 0) {
        return null;
    }

    return `No pudimos reservar stock para: ${failedProducts.join(', ')}. Actualiza tu carrito e intentalo de nuevo.`;
}
