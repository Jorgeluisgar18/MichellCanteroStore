import * as Sentry from '@sentry/nextjs';
import { sanitizeObservabilityContext } from '@/lib/observability/sanitize';

export type CheckoutIssueArea = 'checkout' | 'checkout_params' | 'wompi_webhook' | 'wompi_reconciliation' | 'stock' | 'health';
export type CheckoutIssueLevel = 'warning' | 'error' | 'fatal';

export interface CheckoutIssueContext {
    area: CheckoutIssueArea;
    name: string;
    level?: CheckoutIssueLevel;
    route?: string;
    orderId?: string | null;
    orderNumber?: string | null;
    productId?: string | null;
    transactionId?: string | null;
    status?: string | null;
    paymentStatus?: string | null;
    reason?: string | null;
    metadata?: Record<string, unknown>;
}

export function getCheckoutIssueFingerprint(context: CheckoutIssueContext): string[] {
    return ['checkout-flow', context.area, context.name];
}

export function captureCheckoutIssue(context: CheckoutIssueContext, error?: unknown): void {
    const level = context.level ?? 'error';
    const sanitizedContext = sanitizeObservabilityContext(context) as CheckoutIssueContext;

    Sentry.withScope((scope) => {
        scope.setLevel(level);
        scope.setTag('area', context.area);
        scope.setTag('workflow', 'checkout');
        scope.setTag('issue', context.name);

        if (context.route) scope.setTag('route', context.route);
        if (context.status) scope.setTag('status', context.status);
        if (context.paymentStatus) scope.setTag('payment_status', context.paymentStatus);

        scope.setFingerprint(getCheckoutIssueFingerprint(context));
        scope.setExtras({
            checkoutIssue: sanitizedContext,
        });

        if (error instanceof Error) {
            Sentry.captureException(error);
            return;
        }

        Sentry.captureMessage(`Checkout issue: ${context.area}.${context.name}`, level);
    });
}
