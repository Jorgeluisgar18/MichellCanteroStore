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
import ProductImage from '@/components/product/ProductImage';
import { useAuthStore } from '@/store/authStore';

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

interface DashboardProduct {
    id: string;
    name: string;
    category: string;
    price: number;
    images: string[];
}

interface ApiSuccessResponse<T> {
    data: T;
    success: boolean;
}

interface ProductsPayload {
    products: DashboardProduct[];
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentOrders, setRecentOrders] = useState<SimpleOrder[]>([]);
    const [featuredProducts, setFeaturedProducts] = useState<DashboardProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const user = useAuthStore((state) => state.user);

    useEffect(() => {
        // En una implementación real, esto vendría de un endpoint de estadísticas
        // /api/admin/stats
        Promise.all([
            fetch('/api/orders?limit=5').then(res => res.json() as Promise<ApiSuccessResponse<SimpleOrder[]>>),
            fetch('/api/products?featured=true&limit=3').then(res => res.json() as Promise<ApiSuccessResponse<ProductsPayload>>),
            fetch('/api/admin/stats').then(res => res.json() as Promise<ApiSuccessResponse<DashboardStats>>),
        ]).then(([ordersData, productsData, statsData]) => {
            setRecentOrders(ordersData.data || []);
            setFeaturedProducts(productsData.data?.products || []);
            setStats(statsData.data || null);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);


    const downloadGeneralReport = () => {
        if (!stats) return;

        // Headers profesionales para el reporte
        const rows = [
            ['REPORTE GENERAL DE TIENDA - MICHELL CANTERO STORE'],
            [`Fecha del reporte: ${new Date().toLocaleString()}`],
            [''],
            ['RESUMEN DE ESTADÍSTICAS'],
            ['Métrica', 'Valor', 'Tendencia'],
            ['Ingresos Totales', stats.totalRevenue, `${stats.revenueTrend}%`],
            ['Pedidos Totales', stats.totalOrders, `${stats.ordersTrend}%`],
            ['Clientes Totales', stats.totalCustomers, `${stats.customersTrend}%`],
            ['Valor Promedio del Pedido', (stats.totalRevenue / stats.totalOrders).toFixed(2), '2.4%'],
            [''],
            ['ÚLTIMOS PEDIDOS'],
            ['N° Orden', 'Cliente', 'Estado', 'Total', 'Fecha']
        ];

        // Añadir pedidos recientes
        recentOrders.forEach(order => {
            rows.push([
                order.order_number,
                order.shipping_name,
                order.status,
                order.total.toString(),
                new Date(order.created_at).toLocaleDateString()
            ]);
        });

        // Formatear como CSV profesional (Punto y coma para Excel ES)
        const formatField = (field: string | number | boolean | null | undefined) => `"${String(field || '').replace(/"/g, '""')}"`;
        const csvContent = '\uFEFF' + rows.map(r => r.map(formatField).join(';')).join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `reporte_general_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading || !stats) {
        return (
            <div className="flex items-center justify-center p-12 min-h-[60vh]">
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
            trendLabel: 'vs el mes pasado',
            color: 'bg-green-50 text-green-600'
        },
        {
            name: 'Pedidos Realizados',
            value: stats.totalOrders,
            icon: ShoppingBag,
            trend: stats.ordersTrend,
            trendLabel: 'vs el mes pasado',
            color: 'bg-blue-50 text-blue-600'
        },
        {
            name: 'Clientes Nuevos',
            value: stats.totalCustomers,
            icon: Users,
            trend: stats.customersTrend,
            trendLabel: 'vs el mes pasado',
            color: 'bg-purple-50 text-purple-600'
        },
        {
            name: 'Valor Promedio',
            value: formatPrice(stats.totalRevenue / stats.totalOrders),
            icon: TrendingUp,
            trend: 2.4,
            trendLabel: 'vs el mes pasado',
            color: 'bg-orange-50 text-orange-600'
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-display font-bold text-neutral-900 tracking-tight">Vista General</h1>
                    <p className="text-neutral-500 text-sm mt-1">Bienvenido/a de nuevo{user?.name ? `, ${user.name.split(' ')[0]}` : ''}. Esto es lo que está pasando en tu tienda.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        leftIcon={<Filter className="w-4 h-4" />}
                        className="bg-white"
                    >
                        Filtrar
                    </Button>
                    <Button
                        variant="primary"
                        leftIcon={<ArrowDownRight className="w-4 h-4 rotate-180" />}
                        onClick={downloadGeneralReport}
                        className="shadow-lg shadow-primary-200"
                    >
                        Descargar Reporte
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <Card
                        key={stat.name}
                        className={`overflow-hidden border-none shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 delay-[${index * 100}ms] group`}
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 ${stat.color} rounded-2xl group-hover:scale-110 transition-transform duration-300`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <div className={`flex items-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${stat.trend > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                    {stat.trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                                    {Math.abs(stat.trend)}%
                                </div>
                            </div>
                            <div>
                                <h3 className="text-neutral-500 text-xs font-bold uppercase tracking-widest leading-none">{stat.name}</h3>
                                <p className="text-2xl font-black text-neutral-900 mt-2 tracking-tight group-hover:text-primary-600 transition-colors">{stat.value}</p>
                                <p className="text-[10px] text-neutral-400 mt-1 font-medium italic">{stat.trendLabel}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Orders Table */}
                <div className="lg:col-span-2">
                    <Card className="h-full border-none shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-white">
                            <h2 className="font-display font-bold text-lg text-neutral-900 flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5 text-primary-600" />
                                Pedidos Recientes
                            </h2>
                            <Link href="/admin/pedidos">
                                <Button variant="outline" size="sm" className="text-xs font-bold uppercase tracking-wider">
                                    Ver todos
                                </Button>
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-neutral-50 text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">
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
                                        <tr key={order.id} className="hover:bg-neutral-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-bold text-neutral-900 group-hover:text-primary-600 transition-colors uppercase">{order.order_number}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-neutral-600">
                                                {order.shipping_name}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${order.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-neutral-100 text-neutral-800'
                                                    }`}>
                                                    {order.status === 'paid' ? 'Pagado' :
                                                        order.status === 'pending' ? 'Pendiente' :
                                                            order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-black text-neutral-900">
                                                {formatPrice(order.total)}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-neutral-400 italic">
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {recentOrders.length === 0 && (
                                <div className="p-12 text-center text-neutral-400 text-sm font-medium italic">
                                    No hay pedidos recientes para mostrar.
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Popular Products Sidebar */}
                <div className="lg:col-span-1">
                    <Card className="h-full border-none shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-neutral-100 bg-white">
                            <h2 className="font-display font-bold text-lg text-neutral-900 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary-600" />
                                Productos Destacados
                            </h2>
                        </div>
                        <div className="p-6 space-y-6">
                            {featuredProducts.length > 0 ? (
                                featuredProducts.map((product) => (
                                    <div key={product.id} className="flex items-center gap-4 group">
                                        <div className="w-14 h-14 bg-neutral-100 rounded-xl overflow-hidden flex-shrink-0 relative ring-1 ring-neutral-100 group-hover:ring-primary-100 transition-all shadow-sm">
                                            {product.images?.[0] ? (
                                                <ProductImage
                                                    src={product.images[0]}
                                                    alt={product.name}
                                                    fill
                                                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                            ) : (
                                                <ShoppingBag className="w-6 h-6 text-neutral-300 absolute inset-0 m-auto" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-neutral-900 truncate group-hover:text-primary-600 transition-colors uppercase tracking-tight">{product.name}</p>
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{product.category}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-primary-600">{formatPrice(product.price)}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-neutral-400 text-sm font-medium italic">
                                    Aún no tienes productos destacados.
                                </div>
                            )}
                            <Link href="/admin/productos" className="block">
                                <Button
                                    variant="outline"
                                    className="w-full mt-4 text-xs font-bold uppercase tracking-widest hover:bg-primary-50 hover:text-primary-600 border-neutral-100"
                                >
                                    Gestionar Inventario
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
