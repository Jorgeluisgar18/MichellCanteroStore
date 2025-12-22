'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ShoppingBag, ArrowLeft, Loader2, ChevronRight, Clock, CheckCircle2, Truck, XCircle } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import Link from 'next/link';
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
                setError('No se pudieron cargar tus pedidos');
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
            case 'processing': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
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
                        onClick={() => router.back()}
                        className="flex items-center text-neutral-600 hover:text-primary-600 mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver
                    </button>

                    <h1 className="text-3xl font-display font-bold text-neutral-900 mb-8">
                        Mis Pedidos
                    </h1>

                    {error ? (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-8">
                            {error}
                        </div>
                    ) : orders.length === 0 ? (
                        <Card className="p-12 text-center">
                            <ShoppingBag className="w-16 h-16 mx-auto text-neutral-300 mb-4" />
                            <h2 className="text-xl font-bold text-neutral-900 mb-2">Aún no tienes pedidos</h2>
                            <p className="text-neutral-600 mb-8">Tus compras aparecerán aquí para que puedas hacerles seguimiento.</p>
                            <Link href="/tienda">
                                <Button variant="primary">Ir a la tienda</Button>
                            </Link>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            {orders.map((order) => (
                                <Card key={order.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="p-4 md:p-6">
                                        {/* Header de la orden */}
                                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-neutral-100 pb-4">
                                            <div className="space-y-1">
                                                <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Número de orden</p>
                                                <p className="font-bold text-neutral-900">{order.order_number}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Fecha</p>
                                                <p className="text-sm text-neutral-700">{formatDate(order.created_at)}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Total</p>
                                                <p className="font-bold text-primary-600">{formatPrice(order.total)}</p>
                                            </div>
                                            <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border", getStatusColorClass(order.status))}>
                                                {getStatusIcon(order.status)}
                                                {getStatusText(order.status)}
                                            </div>
                                        </div>

                                        {/* Items de la orden (resumen) */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-3 overflow-hidden">
                                                    {order.order_items.map((item, idx) => (
                                                        idx < 3 && (
                                                            <div key={item.id} className="relative w-10 h-10 rounded-lg border-2 border-white bg-neutral-100 overflow-hidden shadow-sm">
                                                                <Image
                                                                    src={item.product_image}
                                                                    alt={item.product_name}
                                                                    fill
                                                                    sizes="40px"
                                                                    className="object-cover"
                                                                />
                                                            </div>
                                                        )
                                                    ))}
                                                    {order.order_items.length > 3 && (
                                                        <div className="w-10 h-10 rounded-lg border-2 border-white bg-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-600 shadow-sm">
                                                            +{order.order_items.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-neutral-900 truncate">
                                                        {order.order_items.length === 1
                                                            ? order.order_items[0].product_name
                                                            : `${order.order_items[0].product_name} y ${order.order_items.length - 1} productos más`}
                                                    </p>
                                                    <p className="text-xs text-neutral-500">
                                                        {order.order_items.reduce((acc, item) => acc + item.quantity, 0)} artículos en total
                                                    </p>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-neutral-300" />
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}

// Helper simple pq formatDate ya está en utils pero cn no se si funca igual
function cn(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
}
