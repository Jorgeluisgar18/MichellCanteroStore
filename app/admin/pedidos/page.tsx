'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import {
    Search,
    Download,
    Eye,
    Trash2,
    ShoppingBag
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { OrderDetailsModal } from '@/components/admin/OrderDetailsModal';

interface OrderItem {
    id: string;
    product_name: string;
    product_price: number;
    product_image: string;
    quantity: number;
    variant_name?: string;
    subtotal: number;
}

interface AdminOrder {
    id: string;
    order_number: string;
    shipping_name: string;
    shipping_email: string;
    shipping_phone: string;
    shipping_address: string;
    shipping_city: string;
    shipping_state: string;
    shipping_zip_code: string;
    created_at: string;
    total: number;
    subtotal: number;
    shipping: number;
    payment_status: string;
    payment_method: string;
    status: string;
    customer_notes?: string;
    order_items: OrderItem[];
}

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/orders');
            const data = await res.json();
            setOrders(data.data || []);
            setLoading(false);
        } catch (error: unknown) {
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
                if (selectedOrder?.id === orderId) {
                    setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
                }
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };


    const deleteOrder = async (orderId: string) => {
        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                fetchOrders();
                setSelectedOrder(null);
            } else {
                alert('Error al eliminar la orden');
            }
        } catch (error) {
            console.error('Error deleting order:', error);
            alert('Error al eliminar la orden');
        }
    };

    const exportToCSV = () => {
        // Headers profesionales
        const headers = [
            'N° Pedido',
            'Fecha',
            'Hora',
            'Cliente',
            'Email',
            'Teléfono',
            'Ciudad',
            'Estado',
            'Subtotal',
            'Envío',
            'Total',
            'Estado de Pago',
            'Estado de Entrega'
        ];

        // Función para limpiar y escapar campos (prevenir inyección CSV y errores de formato)
        const formatField = (field: string | number | boolean | null | undefined) => {
            const content = field === null || field === undefined ? '' : String(field);
            // Escapar comillas dobles
            const escaped = content.replace(/"/g, '""');
            // Envolver en comillas dobles
            return `"${escaped}"`;
        };

        // Generar contenido con delimitador de punto y coma (estándar para Excel en ES)
        const csvRows = [
            headers.join(';'),
            ...filteredOrders.map(order => {
                const date = new Date(order.created_at);
                return [
                    formatField(order.order_number),
                    formatField(date.toLocaleDateString()),
                    formatField(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
                    formatField(order.shipping_name),
                    formatField(order.shipping_email),
                    formatField(order.shipping_phone),
                    formatField(order.shipping_city),
                    formatField(order.shipping_state),
                    formatField(order.subtotal),
                    formatField(order.shipping),
                    formatField(order.total),
                    formatField(order.payment_status === 'paid' ? 'Pagado' : 'Pendiente'),
                    formatField(order.status)
                ].join(';');
            })
        ];

        // UTF-8 BOM para soporte de caracteres especiales en Excel
        const BOM = '\uFEFF';
        const csvContent = BOM + csvRows.join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `reporte_pedidos_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.shipping_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.shipping_email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === '' || order.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const formatTableDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return (
            <div className="flex flex-col">
                <span className="font-medium text-neutral-900">{date.toLocaleDateString()}</span>
                <span className="text-[10px] text-neutral-500">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-neutral-900">Gestión de Pedidos</h1>
                    <p className="text-neutral-500 text-sm">Administra y haz seguimiento a todas las órdenes de tus clientes.</p>
                </div>
                <Button
                    variant="outline"
                    leftIcon={<Download className="w-4 h-4" />}
                    onClick={exportToCSV}
                >
                    Exportar
                </Button>
            </div>

            {/* Filters and Search */}
            <Card>
                <div className="p-4 flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Buscar por número de orden, cliente o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            leftIcon={<Search className="w-5 h-5 text-neutral-400" />}
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        >
                            <option value="">Todos los estados</option>
                            <option value="pending">Pendiente</option>
                            <option value="processing">Confirmado</option>
                            <option value="shipped">Despachado</option>
                            <option value="delivered">Entregado</option>
                            <option value="cancelled">Cancelado</option>
                        </select>
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
                                        {formatTableDate(order.created_at)}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-neutral-900">
                                        {formatPrice(order.total || 0)}
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
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className="p-2 hover:bg-primary-50 text-neutral-400 hover:text-primary-600 rounded-lg transition-colors"
                                                title="Ver detalles"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('¿Eliminar pedido?')) deleteOrder(order.id);
                                                }}
                                                className="p-2 hover:bg-red-50 text-neutral-400 hover:text-red-600 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-5 h-5" />
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
                            <p className="text-neutral-500">No se encontraron pedidos que coincidan con los criterios.</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Order Details Modal */}
            {selectedOrder && (
                <OrderDetailsModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onUpdateStatus={updateOrderStatus}
                    onDeleteOrder={deleteOrder}
                />
            )}
        </div>
    );
}
