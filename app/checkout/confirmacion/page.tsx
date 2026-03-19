'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Order {
    id: string;
    order_number: string;
    total: number;
    payment_status: string;
}

function ConfirmacionContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);

    useEffect(() => {
        if (orderId) {
            fetch(`/api/orders/${orderId}`)
                .then(res => {
                    if (!res.ok) throw new Error('Error al obtener la orden');
                    return res.json();
                })
                .then(data => {
                    setOrder(data.data);
                    setLoading(false);
                })
                .catch(() => {
                    setFetchError(true);
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, [orderId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                <p className="text-neutral-600">Verificando tu pedido...</p>
            </div>
        );
    }

    const isSuccess = order?.payment_status === 'paid';
    const isPending = order?.payment_status === 'pending';
    const isFailed = !loading && !isSuccess && !isPending;

    if (fetchError || !order) {
        return (
            <div className="text-center py-12">
                <p className="text-neutral-600">
                    No pudimos cargar los detalles de tu orden.
                    Por favor revisa tu correo o contacta soporte.
                </p>
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
                                ¡Pedido Confirmado!
                            </h1>
                            <p className="text-neutral-600 mb-8">
                                Gracias por tu compra. Hemos recibido tu pedido y estamos preparando todo para el envío.
                            </p>
                        </>
                    )}
                    {isPending && (
                        <>
                            <div className="bg-yellow-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Clock className="w-12 h-12 text-yellow-600" />
                            </div>
                            <h1 className="text-3xl font-display font-bold text-neutral-900 mb-4">
                                Pago en Proceso
                            </h1>
                            <p className="text-neutral-600 mb-8">
                                Tu pago está siendo procesado por la entidad financiera. Te notificaremos por correo electrónico una vez se confirme.
                            </p>
                        </>
                    )}
                    {isFailed && (
                        <>
                            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <XCircle className="w-12 h-12 text-red-600" />
                            </div>
                            <h1 className="text-3xl font-display font-bold text-neutral-900 mb-4">
                                Hubo un Problema
                            </h1>
                            <p className="text-neutral-600 mb-8">
                                No pudimos confirmar tu pago. Por favor intenta de nuevo o contacta a soporte si crees que es un error.
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
                                        {isSuccess ? 'Pagado' : isPending ? 'Pendiente' : 'Fallido'}
                                    </span>
                                </div>
                            </div>
                        </div>
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
