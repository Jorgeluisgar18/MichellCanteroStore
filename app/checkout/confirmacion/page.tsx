'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CheckCircle, XCircle, Clock, ArrowRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { fetchWithCsrf } from '@/lib/hooks/useCsrfToken';
import { cartContentsFingerprint, readReturnContext, saveReturnContext, verifyCheckoutReturn, type ReturnState } from '@/lib/checkout/wompi-checkout-web';
import { synchronizeCartStorage } from '@/lib/checkout/cart-session';
import { useCartSession } from '@/lib/checkout/use-cart-session';

interface Order {
    id: string;
    order_number: string;
    total: number;
    payment_status: string;
    inventory_status: string;
}

function ConfirmacionContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const transactionId = searchParams.get('id');
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [verification, setVerification] = useState<ReturnState>('unverified');
    const [retry, setRetry] = useState(0);
    const hydrated = useCartSession();

    useEffect(() => {
        if (!hydrated) return;
        let active = true;
        setLoading(true);
        setOrder(null);
        setVerification('unverified');
        void (async () => {
            let context = null;
            try { context = orderId ? readReturnContext(window.sessionStorage, orderId) : null; } catch { /* Storage may be disabled. */ }
            let result: ReturnState = context
                ? await verifyCheckoutReturn(context, transactionId ?? '', fetchWithCsrf) : 'unverified';
            if (!active) return;
            let receipt: Order | null = null;
            if (orderId) {
                try {
                    synchronizeCartStorage(window.localStorage, useCartStore);
                    const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: 'no-store' });
                    const payload = response.ok ? await response.json() : null;
                    if (payload?.data?.id === orderId && typeof payload.data.payment_status === 'string') receipt = payload.data;
                } catch { /* A guest cannot read the protected order endpoint. */ }
            }
            if (!active) return;
            if (receipt?.payment_status === 'paid' && result !== 'review') {
                result = receipt.inventory_status === 'confirmed' ? 'verified' : 'review';
            } else if (receipt) {
                result = receipt.payment_status === 'pending' ? 'pending' : 'review';
            }
            if (result === 'verified' && context && !context.cartHandled) {
                try {
                    // Consume cleanup before applying it; a later visit must preserve a new cart.
                    saveReturnContext(window.sessionStorage, { ...context, cartHandled: true });
                    const current = useCartStore.getState().items;
                    const sameCycle = (useCartStore.getState().cartId ?? null) === (context.cartId ?? null);
                    if (sameCycle && cartContentsFingerprint(current) === context.cartFingerprint) useCartStore.getState().replaceSnapshot(current, []);
                } catch { /* A damaged local cart must not invalidate a verified server result. */ }
            }
            setOrder(receipt);
            setVerification(result);
            setLoading(false);
        })();
        return () => { active = false; };
    }, [orderId, transactionId, retry, hydrated]);

    useEffect(() => {
        if (loading || !['pending', 'unverified'].includes(verification) || retry >= 5) return;
        const timer = setTimeout(() => setRetry(value => value + 1), 5000);
        return () => clearTimeout(timer);
    }, [loading, verification, retry]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                <p className="text-neutral-600">Verificando tu pedido...</p>
            </div>
        );
    }

    const isSuccess = verification === 'verified';
    const isPending = verification === 'pending';
    const isReview = verification === 'review';

    if (verification === 'unverified') {
        return (
            <div className="text-center py-12">
                <p className="text-neutral-600">
                    No pudimos confirmar el pago todavía. Si ya pagaste, no lo repitas y contacta soporte.
                </p>
                <Button type="button" className="mt-6" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={() => setRetry(value => value + 1)}>
                    Volver a verificar
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-12 px-4">
            <Card>
                <div className="p-8 text-center">
                    {isSuccess && (
                        <>
                            <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-12 h-12 text-green-600" />
                            </div>
                            <h1 className="text-3xl font-display font-bold text-neutral-900 mb-4">
                                ¡Pago Confirmado!
                            </h1>
                            <p className="text-neutral-600 mb-8">
                                Gracias por tu compra. Tu pago fue confirmado y tu pedido quedó registrado.
                            </p>
                        </>
                    )}
                    {isPending && (
                        <>
                            <div className="bg-yellow-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Clock className="w-12 h-12 text-yellow-600" />
                            </div>
                            <h1 className="text-3xl font-display font-bold text-neutral-900 mb-4">
                                Verificando tu pago
                            </h1>
                            <p className="text-neutral-600 mb-8">
                                Estamos consultando el estado de tu pedido y todavía no confirmamos el pago. Si ya pagaste, no lo repitas. Puedes volver a verificar desde esta página.
                            </p>
                        </>
                    )}
                    {isReview && (
                        <>
                            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <XCircle className="w-12 h-12 text-red-600" />
                            </div>
                            <h1 className="text-3xl font-display font-bold text-neutral-900 mb-4">
                                Pago por verificar
                            </h1>
                            <p className="text-neutral-600 mb-8">
                                Tu pedido necesita una revisión antes de continuar. Si ya pagaste, no repitas el pago y contacta soporte.
                            </p>
                        </>
                    )}

                    {order && (
                        <div className="bg-neutral-50 rounded-xl p-6 mb-8 text-left border border-neutral-100">
                            <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4">
                                Resumen de la Orden
                            </h2>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-neutral-600">Número de Orden:</span>
                                    <span className="font-bold text-neutral-900">{order.order_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-neutral-600">Total:</span>
                                    <span className="font-bold text-neutral-900">${order.total.toLocaleString()} COP</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-neutral-600">Estado:</span>
                                    <span className={`font-bold ${isSuccess ? 'text-green-600' : isPending ? 'text-yellow-600' : 'text-red-600'}`}>
                                        {isSuccess ? 'Pagado' : isPending ? 'Pendiente' : 'En revisión'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isSuccess && (
                        <Button type="button" variant="secondary" className="mb-4" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={() => setRetry(value => value + 1)}>
                            Volver a verificar
                        </Button>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link href="/tienda" className="flex-1">
                            <Button variant="secondary" className="w-full">
                                Seguir Comprando
                            </Button>
                        </Link>
                        <Link href="/cuenta" className="flex-1">
                            <Button variant="primary" className="w-full" rightIcon={<ArrowRight className="w-5 h-5" />}>
                                Ver mi Pedido
                            </Button>
                        </Link>
                    </div>
                </div>
            </Card>
        </div>
    );
}

export default function ConfirmacionPage() {
    return (
        <>
            <Header />
            <main className="min-h-screen bg-neutral-50">
                <Suspense fallback={
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                    </div>
                }>
                    <ConfirmacionContent />
                </Suspense>
            </main>
            <Footer />
        </>
    );
}
