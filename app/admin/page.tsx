'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import {
    TrendingUp,
    ShoppingBag,
    Users,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Filter
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';
import Button from '@/components/ui/Button';

interface DashboardStats {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    averageOrderValue: number;
    revenueTrend: number;
    ordersTrend: number;
    customersTrend: number;
}

interface SimpleOrder {
    id: string;
    order_number: string;
    shipping_name: string;
    status: string;
    total: number;
    created_at: string;
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentOrders, setRecentOrders] = useState<SimpleOrder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // En una implementación real, esto vendría de un endpoint de estadísticas
        // /api/admin/stats
        Promise.all([
            fetch('/api/orders?limit=5').then(res => res.json()),
            // Simulamos estadísticas para el MVP
            Promise.resolve({
                totalRevenue: 2450000,
                totalOrders: 156,
                totalCustomers: 89,
                averageOrderValue: 15700,
                revenueTrend: 12.5,
                ordersTrend: 8.2,
                customersTrend: -3.1
            })
        ]).then(([ordersData, statsData]: [{ data: SimpleOrder[] }, DashboardStats]) => {
            setRecentOrders(ordersData.data || []);
            setStats(statsData);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    if (loading || !stats) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const statCards = [
        {
            name: 'Ingresos Totales',
            value: formatPrice(stats.totalRevenue),
            icon: DollarSign,
            trend: stats.revenueTrend,
            trendLabel: 'vs el mes pasado'
        },
        {
            name: 'Pedidos Realizados',
            value: stats.totalOrders,
            icon: ShoppingBag,
            trend: stats.ordersTrend,
            trendLabel: 'vs el mes pasado'
        },
        {
            name: 'Clientes Nuevos',
            value: stats.totalCustomers,
            icon: Users,
            trend: stats.customersTrend,
            trendLabel: 'vs el mes pasado'
        },
        {
            name: 'Valor Promedio',
            value: formatPrice(stats.totalRevenue / stats.totalOrders),
            icon: TrendingUp,
            trend: 2.4,
            trendLabel: 'vs el mes pasado'
        },
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-neutral-900">Vista General</h1>
                    <p className="text-neutral-500 text-sm">Bienvenida de nuevo, Michell. Esto es lo que está pasando en tu tienda.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" leftIcon={<Filter className="w-4 h-4" />}>
                        Filtrar
                    </Button>
                    <Button variant="primary" size="sm">
                        Descargar Reporte
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat) => (
                    <Card key={stat.name} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-2 bg-primary-50 rounded-lg">
                                    <stat.icon className="w-6 h-6 text-primary-600" />
                                </div>
                                <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${stat.trend > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                    }`}>
                                    {stat.trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                                    {Math.abs(stat.trend)}%
                                </div>
                            </div>
                            <div>
                                <h3 className="text-neutral-500 text-sm font-medium">{stat.name}</h3>
                                <p className="text-2xl font-bold text-neutral-900 mt-1">{stat.value}</p>
                                <p className="text-xs text-neutral-400 mt-1">{stat.trendLabel}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Orders Table */}
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                            <h2 className="font-display font-bold text-neutral-900">Pedidos Recientes</h2>
                            <Link href="/admin/pedidos" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                                Ver todos
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-neutral-50 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Orden</th>
                                        <th className="px-6 py-4">Cliente</th>
                                        <th className="px-6 py-4">Estado</th>
                                        <th className="px-6 py-4">Total</th>
                                        <th className="px-6 py-4">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {recentOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-medium text-neutral-900">{order.order_number}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-neutral-600">
                                                {order.shipping_name}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-neutral-100 text-neutral-800'
                                                    }`}>
                                                    {order.status === 'paid' ? 'Pagado' :
                                                        order.status === 'pending' ? 'Pendiente' :
                                                            order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-neutral-900">
                                                {formatPrice(order.total)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-neutral-500">
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {recentOrders.length === 0 && (
                                <div className="p-12 text-center text-neutral-500">
                                    No hay pedidos recientes.
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Popular Products Sidebar */}
                <div className="lg:col-span-1">
                    <Card className="h-full">
                        <div className="p-6 border-b border-neutral-100">
                            <h2 className="font-display font-bold text-neutral-900">Productos Destacados</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Placeholder for top products */}
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-neutral-200 rounded-lg flex-shrink-0"></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-neutral-900 truncate">Producto Populares {i}</p>
                                        <p className="text-xs text-neutral-500">12 ventas este mes</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-neutral-900">$45.000</p>
                                    </div>
                                </div>
                            ))}
                            <Button variant="outline" className="w-full">
                                Ver Inventario
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
