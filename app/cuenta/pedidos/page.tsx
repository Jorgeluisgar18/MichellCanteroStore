'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ShoppingBag, ArrowLeft, Loader2, ChevronRight, Clock, CheckCircle2, Truck, XCircle, Package } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import Image from 'next/image';

interface OrderItem {
    id: string;
    product_name: string;
    product_price: number;
    product_image: string;
    quantity: number;
    variant_name?: string;
}

interface Order {
    id: string;
    order_number: string;
    status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    total: number;
    created_at: string;
    order_items: OrderItem[];
}

export default function PedidosPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await fetch('/api/orders');
                const { data, error: ordersError } = await res.json();

                if (ordersError) throw new Error(ordersError);

                setOrders(data || []);
            } catch (err) {
                console.error('Error loading orders:', err);
                setError('No se pudieron cargar tus pedidos. Por favor, intenta de nuevo más tarde.');
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    const getStatusIcon = (status: Order['status']) => {
        switch (status) {
            case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
            case 'paid': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'processing': return <Package className="w-4 h-4 text-blue-500" />;
            case 'shipped': return <Truck className="w-4 h-4 text-purple-500" />;
            case 'delivered': return <CheckCircle2 className="w-4 h-4 text-primary-600" />;
            case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
        }
    };

    const getStatusText = (status: Order['status']) => {
        switch (status) {
            case 'pending': return 'Pendiente de pago';
            case 'paid': return 'Pagado';
            case 'processing': return 'En preparación';
            case 'shipped': return 'En camino';
            case 'delivered': return 'Entregado';
            case 'cancelled': return 'Cancelado';
        }
    };

    const getStatusColorClass = (status: Order['status']) => {
        switch (status) {
            case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
            case 'paid': return 'bg-green-50 text-green-700 border-green-100';
            case 'processing': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'shipped': return 'bg-purple-50 text-purple-700 border-purple-100';
            case 'delivered': return 'bg-primary-50 text-primary-700 border-primary-100';
            case 'cancelled': return 'bg-red-50 text-red-700 border-red-100';
        }
    };

    if (loading) {
        return (
            <>
                <Header />
                <main className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary-600 mb-4" />
                    <p className="text-neutral-500 font-medium">Cargando tus pedidos...</p>
                </main>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Header />
            <main className="min-h-screen bg-neutral-50 py-12">
                <div className="container-custom max-w-4xl mx-auto">
                    <button
                        onClick={() => router.push('/cuenta')}
                        className="flex items-center text-neutral-600 hover:text-primary-600 mb-6 transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Volver a Mi Cuenta
                    </button>

                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-3xl font-display font-bold text-neutral-900">
                            Mis Pedidos
                        </h1>
                    </div>

                    {error ? (
                        <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 text-center">
                            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                            <p className="font-medium mb-4">{error}</p>
                            <Button variant="outline" onClick={() => window.location.reload()}>
                                Reintentar
                            </Button>
                        </div>
                    ) : orders.length === 0 ? (
                        <Card className="p-16 text-center shadow-sm border-neutral-100 rounded-2xl">
                            <ShoppingBag className="w-20 h-20 mx-auto text-neutral-200 mb-6" />
                            <h2 className="text-2xl font-bold text-neutral-900 mb-3">Aún no tienes pedidos</h2>
                            <p className="text-neutral-600 mb-10 max-w-md mx-auto">Tus compras aparecerán aquí para que puedas hacerles seguimiento y ver el detalle de cada una.</p>
                            <Link href="/tienda">
                                <Button variant="primary" size="lg" className="rounded-full px-10">
                                    Ir a la tienda
                                </Button>
                            </Link>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            {orders.map((order) => (
                                <Link key={order.id} href={`/cuenta/pedidos/${order.id}`}>
                                    <Card className="overflow-hidden hover:shadow-lg transition-all border-neutral-100 group mb-6 cursor-pointer rounded-2xl">
                                        <div className="p-5 md:p-8">
                                            {/* Header de la orden */}
                                            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                                                <div className="flex gap-8">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.1em]">Orden</p>
                                                        <p className="font-bold text-neutral-900 text-lg">{order.order_number}</p>
                                                    </div>
                                                    <div className="space-y-1 hidden sm:block">
                                                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.1em]">Fecha</p>
                                                        <p className="text-sm font-medium text-neutral-700">{formatDate(order.created_at)}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-[0.1em]">Total</p>
                                                        <p className="font-bold text-primary-600 text-lg">{formatPrice(order.total)}</p>
                                                    </div>
                                                </div>
                                                <div className={cn("flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border-2", getStatusColorClass(order.status))}>
                                                    {getStatusIcon(order.status)}
                                                    {getStatusText(order.status)}
                                                </div>
                                            </div>

                                            {/* Items de la orden (resumen) */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-6">
                                                    <div className="flex -space-x-4 overflow-hidden">
                                                        {order.order_items.map((item, idx) => (
                                                            idx < 4 && (
                                                                <div key={item.id} className="relative w-14 h-14 rounded-xl border-4 border-white bg-neutral-100 overflow-hidden shadow-sm group-hover:scale-110 transition-transform duration-500" style={{ zIndex: 10 - idx }}>
                                                                    <Image
                                                                        src={item.product_image}
                                                                        alt={item.product_name}
                                                                        fill
                                                                        sizes="56px"
                                                                        className="object-cover"
                                                                    />
                                                                </div>
                                                            )
                                                        ))}
                                                        {order.order_items.length > 4 && (
                                                            <div className="w-14 h-14 rounded-xl border-4 border-white bg-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-600 shadow-sm relative z-0">
                                                                +{order.order_items.length - 4}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="hidden md:block">
                                                        <p className="text-sm font-bold text-neutral-900 mb-0.5">
                                                            {order.order_items.length === 1
                                                                ? order.order_items[0]?.product_name ?? 'Producto'
                                                                : `${order.order_items[0]?.product_name ?? 'Producto'} y ${order.order_items.length - 1} más`}
                                                        </p>
                                                        <p className="text-xs text-neutral-500 font-medium">
                                                            {order.order_items.reduce((acc, item) => acc + item.quantity, 0)} artículos • Haz clic para ver detalle
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-300 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                                    <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
    return classes.filter(Boolean).join(' ');
}
