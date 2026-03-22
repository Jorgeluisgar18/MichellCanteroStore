'use client';

import { useState } from 'react';
import { X, Package, Truck, User, CreditCard, FileText, Trash2, Printer } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Image from 'next/image';

interface OrderItem {
    id: string;
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
    created_at: string;
    status: string;
    payment_status: string;
    payment_method: string;
    subtotal: number;
    shipping: number;
    total: number;
    shipping_name: string;
    shipping_email: string;
    shipping_phone: string;
    shipping_address: string;
    shipping_city: string;
    shipping_state: string;
    shipping_zip_code: string;
    customer_notes?: string;
    order_items: OrderItem[];
}

interface OrderDetailsModalProps {
    order: Order | null;
    onClose: () => void;
    onUpdateStatus: (id: string, status: string) => void;
    onDeleteOrder: (id: string) => void;
}

export function OrderDetailsModal({ order, onClose, onUpdateStatus, onDeleteOrder }: OrderDetailsModalProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    if (!order) return null;

    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800',
        processing: 'bg-blue-100 text-blue-800',
        shipped: 'bg-purple-100 text-purple-800',
        delivered: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
    };

    const paymentStatusColors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800',
        paid: 'bg-green-100 text-green-800',
        failed: 'bg-red-100 text-red-800',
    };

    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    const handleDelete = () => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer.')) {
            setIsDeleting(true);
            onDeleteOrder(order.id);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-area, .print-area * {
                        visibility: visible;
                    }
                    .print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white !important;
                        color: black !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .print-shadow-none {
                        box-shadow: none !important;
                    }
                    .print-border {
                        border: 1px solid #e5e7eb !important;
                    }
                }
            `}</style>

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col print-area">
                {/* Header */}
                <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50 no-print">
                    <div>
                        <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary-600" />
                            Pedido {order.order_number}
                        </h2>
                        <p className="text-sm text-neutral-500">ID: {order.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="p-2 hover:bg-red-50 text-neutral-400 hover:text-red-600 rounded-lg transition-colors"
                            title="Eliminar pedido"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-neutral-400" />
                        </button>
                    </div>
                </div>

                {/* Print Header (Only visible on print) */}
                <div className="hidden print:block p-8 border-b-2 border-primary-600">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-neutral-900">Michell Cantero Store</h1>
                            <p className="text-sm text-neutral-500 mt-1">Factura de Venta</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold text-primary-600">{order.order_number}</p>
                            <p className="text-sm text-neutral-500">{formatDateTime(order.created_at)}</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Info Cards */}
                        <div className="p-4 rounded-xl bg-neutral-50/50 border border-neutral-100 print-border">
                            <div className="flex items-center gap-3 mb-3 no-print">
                                <div className="p-2 bg-primary-100 rounded-lg">
                                    <User className="w-5 h-5 text-primary-600" />
                                </div>
                                <h3 className="font-bold text-neutral-900">Cliente</h3>
                            </div>
                            <h3 className="hidden print:block font-bold text-neutral-900 mb-2 uppercase text-xs tracking-widest text-neutral-400">Cliente</h3>
                            <div className="space-y-1 text-sm">
                                <p className="font-medium text-neutral-900">{order.shipping_name}</p>
                                <p className="text-neutral-600">{order.shipping_email}</p>
                                <p className="text-neutral-600">{order.shipping_phone}</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-neutral-50/50 border border-neutral-100 print-border">
                            <div className="flex items-center gap-3 mb-3 no-print">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Truck className="w-5 h-5 text-blue-600" />
                                </div>
                                <h3 className="font-bold text-neutral-900">Envío</h3>
                            </div>
                            <h3 className="hidden print:block font-bold text-neutral-900 mb-2 uppercase text-xs tracking-widest text-neutral-400">Dirección de Envío</h3>
                            <div className="space-y-1 text-sm">
                                <p className="text-neutral-600">{order.shipping_address}</p>
                                <p className="text-neutral-600">{order.shipping_city}, {order.shipping_state}</p>
                                <p className="text-neutral-600">{order.shipping_zip_code}</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-neutral-50/50 border border-neutral-100 print-border">
                            <div className="flex items-center gap-3 mb-3 no-print">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <CreditCard className="w-5 h-5 text-purple-600" />
                                </div>
                                <h3 className="font-bold text-neutral-900">Pago</h3>
                            </div>
                            <h3 className="hidden print:block font-bold text-neutral-900 mb-2 uppercase text-xs tracking-widest text-neutral-400">Información de Pago</h3>
                            <div className="space-y-1 text-sm">
                                <p className="flex justify-between">
                                    <span className="text-neutral-500">Método:</span>
                                    <span className="font-medium capitalize">{order.payment_method}</span>
                                </p>
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-500">Estado:</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${paymentStatusColors[order.payment_status] || 'bg-neutral-100'}`}>
                                        {order.payment_status === 'paid' ? 'Pagado' : order.payment_status === 'failed' ? 'Fallido' : 'Pendiente'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order Meta (Print only) */}
                    <div className="hidden print:grid grid-cols-2 gap-4 py-4 border-y border-neutral-100">
                        <div>
                            <p className="text-xs text-neutral-400 uppercase tracking-widest">Fecha y Hora de Emisión</p>
                            <p className="text-sm font-medium">{formatDateTime(order.created_at)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-neutral-400 uppercase tracking-widest">Número de Pedido</p>
                            <p className="text-sm font-medium">{order.order_number}</p>
                        </div>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2 no-print">
                            <Package className="w-5 h-5" />
                            Productos ({order.order_items.length})
                        </h3>
                        <div className="border border-neutral-100 rounded-xl overflow-hidden print:border-none">
                            <table className="w-full text-left">
                                <thead className="bg-neutral-50 text-xs font-semibold text-neutral-500 uppercase print:bg-white print:border-b-2 print:border-neutral-100">
                                    <tr>
                                        <th className="px-4 py-3">Producto</th>
                                        <th className="px-4 py-3 text-center">Cant.</th>
                                        <th className="px-4 py-3 text-right">Precio</th>
                                        <th className="px-4 py-3 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {order.order_items.map((item) => (
                                        <tr key={item.id} className="text-sm">
                                            <td className="px-4 py-3 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded overflow-hidden bg-neutral-100 flex-shrink-0 no-print relative">
                                                    {item.product_image ? (
                                                        <Image
                                                            src={item.product_image}
                                                            alt={item.product_name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <Package className="w-5 h-5 text-neutral-300 absolute inset-0 m-auto" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-neutral-900">{item.product_name}</p>
                                                    {item.variant_name && (
                                                        <p className="text-xs text-neutral-500 italic">Var: {item.variant_name}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-neutral-600 font-medium">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right text-neutral-600">{formatPrice(item.product_price)}</td>
                                            <td className="px-4 py-3 text-right font-bold text-neutral-900">{formatPrice(item.subtotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary and Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        <div>
                            <h3 className="font-bold text-neutral-900 mb-2 uppercase text-xs tracking-widest text-neutral-400">Notas del cliente</h3>
                            <div className="bg-neutral-50 p-4 rounded-xl text-sm text-neutral-600 min-h-[60px] border border-neutral-100 print:bg-white print:border-none print:p-0">
                                {order.customer_notes || 'Sin notas adicionales.'}
                            </div>
                        </div>
                        <div className="bg-neutral-900 text-white p-6 rounded-2xl space-y-3 print:bg-white print:text-black print:border-2 print:border-neutral-900 print:shadow-none">
                            <div className="flex justify-between text-sm opacity-70 print:opacity-100">
                                <span>Subtotal</span>
                                <span>{formatPrice(order.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm opacity-70 print:opacity-100">
                                <span>Costo de Envío</span>
                                <span>{formatPrice(order.shipping)}</span>
                            </div>
                            <div className="pt-3 border-t border-white/10 print:border-neutral-900 flex justify-between font-bold text-xl">
                                <span>Total a Pagar</span>
                                <span className="text-primary-400 print:text-black">{formatPrice(order.total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer (Print only) */}
                    <div className="hidden print:block pt-12 text-center">
                        <p className="text-sm font-bold text-neutral-900">¡Gracias por tu compra en Michell Cantero Store!</p>
                        <p className="text-xs text-neutral-500 mt-1">Si tienes alguna duda sobre tu pedido, contáctanos vía WhatsApp.</p>
                        <div className="mt-8 pt-4 border-t border-neutral-100 flex justify-between items-center opacity-50">
                            <p className="text-[10px]">Factura generada automáticamente por Michell Cantero Store</p>
                            <p className="text-[10px]">{new Date().toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="pt-6 border-t border-neutral-100 flex flex-wrap gap-4 items-center justify-between no-print">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-neutral-700">Estado del pedido:</span>
                            <select
                                value={order.status}
                                onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                                className={`text-sm font-bold px-4 py-2 rounded-xl outline-none border-none cursor-pointer transition-all ${statusColors[order.status] || 'bg-neutral-100'}`}
                            >
                                <option value="pending">Pendiente</option>
                                <option value="processing">Confirmado / En Proceso</option>
                                <option value="shipped">Despachado</option>
                                <option value="delivered">Entregado</option>
                                <option value="cancelled">Cancelado</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={onClose}>
                                Cerrar
                            </Button>
                            <Button
                                size="sm"
                                leftIcon={<Printer className="w-4 h-4" />}
                                onClick={() => window.print()}
                            >
                                Imprimir Factura
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
