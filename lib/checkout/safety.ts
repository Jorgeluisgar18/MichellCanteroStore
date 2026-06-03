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

export interface ReservationAttemptResult {
    productName: string;
    success: boolean;
    error?: string;
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

export function getReservationFailureMessage(results: ReservationAttemptResult[]): string | null {
    const failedProducts = results
        .filter((result) => !result.success)
        .map((result) => result.productName);

    if (failedProducts.length === 0) {
        return null;
    }

    return `No pudimos reservar stock para: ${failedProducts.join(', ')}. Actualiza tu carrito e intentalo de nuevo.`;
}
