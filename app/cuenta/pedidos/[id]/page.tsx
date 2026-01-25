'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
    ArrowLeft, Loader2, Clock, CheckCircle2, Truck, XCircle,
    Package, MapPin, CreditCard, ShoppingBag,
    AlertCircle, FileText
} from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import Image from 'next/image';

interface OrderItem {
    id: string;
    product_id: string;
    product_name: string;
    product_price: number;
    product_image: string;
    quantity: number;
    variant_name?: string;
    subtotal: number;
}

interface Order {
    id: string;
    order_number: string;
    status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    shipping_name: string;
    shipping_address: string;
    shipping_city: string;
    shipping_state: string;
    shipping_zip_code: string;
    shipping_phone: string;
    payment_method: string;
    customer_notes?: string;
    created_at: string;
    order_items: OrderItem[];
}

export default function OrderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrderDetails = async () => {
            if (!params.id) return;

            try {
                const res = await fetch(`/api/orders/${params.id}`);
                const { data, error: apiError } = await res.json();

                if (apiError) throw new Error(apiError);
                setOrder(data);
            } catch (err: unknown) {
                console.error('Error loading order details:', err);
                const message = err instanceof Error ? err.message : 'No se pudo cargar la información del pedido';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetails();
    }, [params.id]);

    const getStatusInfo = (status: Order['status']) => {
        switch (status) {
            case 'pending': return { label: 'Pendiente de pago', icon: <Clock className="w-5 h-5" />, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' };
            case 'paid': return { label: 'Pagado', icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' };
            case 'processing': return { label: 'En preparación', icon: <Package className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' };
            case 'shipped': return { label: 'En camino', icon: <Truck className="w-5 h-5" />, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' };
            case 'delivered': return { label: 'Entregado', icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-100' };
            case 'cancelled': return { label: 'Cancelado', icon: <XCircle className="w-5 h-5" />, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' };
        }
    };

    if (loading) {
        return (
            <>
                <Header />
                <main className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary-600 mb-4" />
                    <p className="text-neutral-500 font-medium">Cargando detalle del pedido...</p>
                </main>
                <Footer />
            </>
        );
    }

    if (error || !order) {
        return (
            <>
                <Header />
                <main className="min-h-screen bg-neutral-50 py-12">
                    <div className="container-custom max-w-2xl mx-auto text-center">
                        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
                        <h1 className="text-2xl font-bold text-neutral-900 mb-4">¡Ups! Algo salió mal</h1>
                        <p className="text-neutral-600 mb-8">{error || 'El pedido solicitado no existe o no tienes acceso.'}</p>
                        <Button variant="primary" onClick={() => router.push('/cuenta/pedidos')}>
                            Volver a Mis Pedidos
                        </Button>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    const statusInfo = getStatusInfo(order.status);

    return (
        <>
            <Header />
            <main className="min-h-screen bg-neutral-50 py-12">
                <div className="container-custom max-w-5xl mx-auto">
                    {/* Breadcrumbs & Title */}
                    <div className="mb-8">
                        <button
                            onClick={() => router.push('/cuenta/pedidos')}
                            className="flex items-center text-neutral-600 hover:text-primary-600 mb-4 transition-colors group"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Volver a Mis Pedidos
                        </button>

                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-display font-bold text-neutral-900 mb-2">
                                    Pedido {order.order_number}
                                </h1>
                                <p className="text-neutral-500 font-medium">
                                    Realizado el {formatDate(order.created_at)}
                                </p>
                            </div>
                            <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 font-bold ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}>
                                {statusInfo.icon}
                                <span className="uppercase tracking-wider text-sm">{statusInfo.label}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Info - Left 2/3 */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Products List */}
                            <Card className="rounded-3xl overflow-hidden border-neutral-100 shadow-sm">
                                <div className="p-6 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-bold text-neutral-900 uppercase tracking-widest text-xs">
                                        <ShoppingBag className="w-4 h-4 text-primary-600" />
                                        Productos ({order.order_items.length})
                                    </div>
                                </div>
                                <div className="divide-y divide-neutral-100">
                                    {order.order_items.map((item) => (
                                        <div key={item.id} className="p-6 flex gap-4 md:gap-6 group">
                                            <div className="relative w-20 h-24 md:w-24 md:h-32 rounded-2xl bg-neutral-100 overflow-hidden flex-shrink-0 border border-neutral-100">
                                                <Image
                                                    src={item.product_image}
                                                    alt={item.product_name}
                                                    fill
                                                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                            </div>
                                            <div className="flex-1 flex flex-col justify-between py-1">
                                                <div>
                                                    <h3 className="font-bold text-neutral-900 md:text-lg mb-1">{item.product_name}</h3>
                                                    {item.variant_name && (
                                                        <p className="text-sm text-neutral-500 font-medium mb-1">
                                                            Variante: <span className="text-neutral-900">{item.variant_name}</span>
                                                        </p>
                                                    )}
                                                    <p className="text-sm text-neutral-500 font-medium">
                                                        Cantidad: <span className="text-neutral-900 font-bold">{item.quantity}</span>
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <p className="text-sm text-neutral-400 font-medium">
                                                        {formatPrice(item.product_price)} c/u
                                                    </p>
                                                    <p className="font-bold text-primary-600 md:text-lg">
                                                        {formatPrice(item.subtotal)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Customer Notes */}
                            {order.customer_notes && (
                                <Card className="rounded-3xl p-6 border-neutral-100 bg-primary-50/30 border-dashed border-2">
                                    <div className="flex items-center gap-2 font-bold text-primary-900 uppercase tracking-widest text-[10px] mb-3">
                                        <FileText className="w-4 h-4" />
                                        Notas del cliente
                                    </div>
                                    <p className="text-neutral-700 italic text-sm">&quot;{order.customer_notes}&quot;</p>
                                </Card>
                            )}
                        </div>

                        {/* Sidebar - Right 1/3 */}
                        <div className="space-y-8">
                            {/* Summary Card */}
                            <Card className="rounded-3xl p-8 border-neutral-100 shadow-md bg-white sticky top-32">
                                <h3 className="font-bold text-neutral-900 uppercase tracking-widest text-xs mb-6 text-center">Resumen del Pedido</h3>

                                <div className="space-y-4 mb-8">
                                    <div className="flex justify-between text-neutral-600 font-medium italic">
                                        <span>Subtotal</span>
                                        <span>{formatPrice(order.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-neutral-600 font-medium italic">
                                        <span>Envío</span>
                                        <span>{order.shipping === 0 ? '¡Gratis!' : formatPrice(order.shipping)}</span>
                                    </div>
                                    {order.tax > 0 && (
                                        <div className="flex justify-between text-neutral-600 font-medium italic">
                                            <span>Impuestos</span>
                                            <span>{formatPrice(order.tax)}</span>
                                        </div>
                                    )}
                                    <div className="pt-4 border-t border-neutral-100 flex justify-between items-center mt-4">
                                        <span className="font-black text-neutral-900 text-lg uppercase">Total</span>
                                        <span className="font-black text-primary-600 text-2xl">{formatPrice(order.total)}</span>
                                    </div>
                                </div>

                                <div className="space-y-6 pt-6 border-t border-neutral-100">
                                    {/* Shipping Info */}
                                    <div>
                                        <div className="flex items-center gap-2 font-bold text-neutral-900 uppercase tracking-widest text-[10px] mb-3">
                                            <MapPin className="w-3 h-3 text-primary-600" />
                                            Dirección de Envío
                                        </div>
                                        <div className="text-sm text-neutral-700 space-y-1">
                                            <p className="font-bold text-neutral-900">{order.shipping_name}</p>
                                            <p>{order.shipping_address}</p>
                                            <p>{order.shipping_city}, {order.shipping_state}</p>
                                            <p className="text-neutral-500 pt-1 font-medium">{order.shipping_phone}</p>
                                        </div>
                                    </div>

                                    {/* Payment Info */}
                                    <div>
                                        <div className="flex items-center gap-2 font-bold text-neutral-900 uppercase tracking-widest text-[10px] mb-3">
                                            <CreditCard className="w-3 h-3 text-primary-600" />
                                            Método de Pago
                                        </div>
                                        <div className="text-sm text-neutral-700">
                                            <p className="capitalize font-bold text-neutral-900">{order.payment_method}</p>
                                            <p className="text-xs text-neutral-500 mt-1">Estado: {
                                                order.payment_status === 'paid' ? 'Completado' :
                                                    order.payment_status === 'failed' ? 'Fallido' : 'Pendiente'
                                            }</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}


