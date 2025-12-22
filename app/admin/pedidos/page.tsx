'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import {
    Search,
    Filter,
    Download,
    Eye,
    MoreVertical,
    ShoppingBag
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface AdminOrder {
    id: string;
    order_number: string;
    shipping_name: string;
    shipping_email: string;
    created_at: string;
    total: number;
    payment_status: string;
    status: string;
}

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/orders');
            const data = await res.json();
            setOrders(data.data || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching orders:', error);
            setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                fetchOrders();
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const filteredOrders = orders.filter(order =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.shipping_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-neutral-900">Gestión de Pedidos</h1>
                    <p className="text-neutral-500 text-sm">Administra y haz seguimiento a todas las órdenes de tus clientes.</p>
                </div>
                <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>
                    Exportar
                </Button>
            </div>

            {/* Filters and Search */}
            <Card>
                <div className="p-4 flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Buscar por número de orden o cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            leftIcon={<Search className="w-5 h-5 text-neutral-400" />}
                        />
                    </div>
                    <div className="flex gap-2">
                        <select className="px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                            <option value="">Todos los estados</option>
                            <option value="pending">Pendiente</option>
                            <option value="paid">Pagado</option>
                            <option value="processing">En proceso</option>
                            <option value="shipped">Enviado</option>
                            <option value="delivered">Entregado</option>
                        </select>
                        <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />}>
                            Filtros
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Orders Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-neutral-50 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Orden</th>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Pago</th>
                                <th className="px-6 py-4">Envío</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {filteredOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-neutral-900">{order.order_number}</p>
                                        <p className="text-xs text-neutral-500">{order.id.slice(0, 8)}...</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-medium text-neutral-900">{order.shipping_name}</p>
                                        <p className="text-xs text-neutral-500">{order.shipping_email}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-neutral-600">
                                        {new Date(order.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-neutral-900">
                                        {formatPrice(order.total)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                                            order.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {order.payment_status === 'paid' ? 'Pagado' :
                                                order.payment_status === 'failed' ? 'Fallido' : 'Pendiente'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={order.status}
                                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                            className="text-xs font-medium bg-neutral-100 border-none rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-neutral-200 transition-colors"
                                        >
                                            <option value="pending">Pendiente</option>
                                            <option value="processing">Confirmado</option>
                                            <option value="shipped">Despachado</option>
                                            <option value="delivered">Entregado</option>
                                            <option value="cancelled">Cancelado</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button className="p-2 hover:bg-primary-50 text-neutral-400 hover:text-primary-600 rounded-lg transition-colors">
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button className="p-2 hover:bg-neutral-100 text-neutral-400 rounded-lg transition-colors">
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredOrders.length === 0 && (
                        <div className="p-12 text-center">
                            <ShoppingBag className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                            <p className="text-neutral-500">No se encontraron pedidos que coincidan con la búsqueda.</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
