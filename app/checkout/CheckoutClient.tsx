'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';
import { CreditCard, CheckCircle } from 'lucide-react';

export default function CheckoutClient() {
    const router = useRouter();
    const { items, getSubtotal, getShipping, getTotal, clearCart } = useCartStore();
    const [isProcessing, setIsProcessing] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        name: '',
        phone: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        paymentMethod: 'card',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        try {
            // 1. Crear la orden en la base de datos a través de la API
            const orderResponse = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shipping_name: formData.name,
                    shipping_email: formData.email,
                    shipping_phone: formData.phone,
                    shipping_address: formData.street,
                    shipping_city: formData.city,
                    shipping_state: formData.state,
                    shipping_zip_code: formData.zipCode,
                    payment_method: 'wompi',
                    items: items.map(item => ({
                        product_id: item.product.id,
                        product_name: item.product.name,
                        product_price: item.product.price,
                        product_image: item.product.images[0],
                        quantity: item.quantity,
                        variant_name: item.selectedVariant?.name,
                        variant_id: item.selectedVariant?.id,
                        subtotal: item.product.price * item.quantity
                    }))
                }),
            });

            const { data: order, error: orderError } = await orderResponse.json();

            if (orderError || !order) {
                throw new Error(orderError || 'Error al crear la orden');
            }

            // 2. Obtener parámetros de Wompi
            const paramsResponse = await fetch('/api/payments/checkout-params', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: order.id,
                    orderNumber: order.order_number,
                    amount: getTotal(),
                    email: formData.email
                }),
            });

            const { data: params, error: paramsError } = await paramsResponse.json();

            if (paramsError || !params) {
                throw new Error(paramsError || 'Error al obtener parámetros de pago');
            }

            // 3. Abrir el Widget de Wompi
            // @ts-expect-error Wompi widget is a global script
            const checkout = new WidgetCheckout({
                currency: params.currency,
                amountInCents: params.amountInCents,
                reference: params.reference,
                publicKey: params.publicKey,
                redirectUrl: params.redirectUrl,
                customerEmail: params.customerEmail
            });

            checkout.open((result: { transaction: { status: string } }) => {
                const transaction = result.transaction;
                if (transaction.status === 'APPROVED') {
                    clearCart();
                    router.push(`/checkout/confirmacion?orderId=${order.id}&status=success`);
                } else {
                    // El webhook se encargará de actualizar el estado, 
                    // pero podemos redirigir al usuario
                    router.push(`/checkout/confirmacion?orderId=${order.id}&status=${transaction.status.toLowerCase()}`);
                }
            });

        } catch (error) {
            console.error('Checkout error:', error);
            const message = error instanceof Error ? error.message : 'Hubo un error al procesar tu pedido. Por favor intenta de nuevo.';
            alert(message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    if (items.length === 0) {
        router.push('/carrito');
        return null;
    }

    return (
        <>
            <Header />
            {/* Cargar script de Wompi */}
            <script
                src="https://checkout.wompi.co/widget.js"
                async
            ></script>

            <main className="min-h-screen bg-neutral-50 text-neutral-900">
                <div className="container-custom py-8">
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 mb-8">
                        Finalizar Compra
                    </h1>

                    <form onSubmit={handleSubmit}>
                        <div className="grid lg:grid-cols-3 gap-8">
                            {/* Checkout Form */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Contact Information */}
                                <Card>
                                    <div className="p-6">
                                        <h2 className="text-xl font-display font-bold mb-6">
                                            Información de Contacto
                                        </h2>
                                        <div className="space-y-4">
                                            <Input
                                                label="Correo Electrónico"
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                required
                                                placeholder="tu@email.com"
                                            />
                                        </div>
                                    </div>
                                </Card>

                                {/* Shipping Address */}
                                <Card>
                                    <div className="p-6">
                                        <h2 className="text-xl font-display font-bold mb-6">
                                            Dirección de Envío
                                        </h2>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <Input
                                                label="Nombre Completo"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required
                                                placeholder="Juan Pérez"
                                            />
                                            <Input
                                                label="Teléfono"
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                required
                                                placeholder="300 123 4567"
                                            />
                                            <div className="md:col-span-2">
                                                <Input
                                                    label="Dirección"
                                                    name="street"
                                                    value={formData.street}
                                                    onChange={handleChange}
                                                    required
                                                    placeholder="Calle 123 #45-67"
                                                />
                                            </div>
                                            <Input
                                                label="Ciudad"
                                                name="city"
                                                value={formData.city}
                                                onChange={handleChange}
                                                required
                                                placeholder="Bogotá"
                                            />
                                            <Input
                                                label="Departamento"
                                                name="state"
                                                value={formData.state}
                                                onChange={handleChange}
                                                required
                                                placeholder="Cundinamarca"
                                            />
                                            <Input
                                                label="Código Postal"
                                                name="zipCode"
                                                value={formData.zipCode}
                                                onChange={handleChange}
                                                required
                                                placeholder="110111"
                                            />
                                        </div>
                                    </div>
                                </Card>

                                {/* Payment Method */}
                                <Card>
                                    <div className="p-6">
                                        <h2 className="text-xl font-display font-bold mb-6">
                                            Método de Pago
                                        </h2>
                                        <div className="space-y-3">
                                            <label className="flex items-center p-4 border-2 border-primary-500 bg-primary-50 rounded-lg cursor-pointer transition-colors">
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value="card"
                                                    checked={true}
                                                    readOnly
                                                    className="mr-3 text-primary-600 focus:ring-primary-500"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center">
                                                        <CreditCard className="w-5 h-5 mr-2 text-primary-600" />
                                                        <span className="font-medium text-neutral-900">Pago Seguro con Wompi</span>
                                                    </div>
                                                    <p className="text-sm text-neutral-600 mt-1">
                                                        Tarjeta de crédito, débito (PSE), Nequi o Corresponsal Bancario
                                                    </p>
                                                </div>
                                            </label>
                                        </div>
                                        <p className="text-xs text-neutral-500 mt-4 italic">
                                            * Serás redirigido de forma segura a la pasarela de pagos Wompi para completar tu transacción.
                                        </p>
                                    </div>
                                </Card>
                            </div>

                            {/* Order Summary */}
                            <div className="lg:col-span-1">
                                <Card className="sticky top-24">
                                    <div className="p-6">
                                        <h2 className="text-xl font-display font-bold mb-6">
                                            Resumen del Pedido
                                        </h2>

                                        {/* Items */}
                                        <div className="space-y-3 mb-6 max-h-64 overflow-y-auto scrollbar-thin">
                                            {items.map((item) => (
                                                <div
                                                    key={`${item.product.id}-${item.selectedVariant?.id || 'default'}`}
                                                    className="flex justify-between text-sm"
                                                >
                                                    <span className="text-neutral-600">
                                                        {item.product.name} x {item.quantity}
                                                    </span>
                                                    <span className="font-medium">
                                                        {formatPrice(item.product.price * item.quantity)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-3 mb-6 border-t border-neutral-200 pt-4">
                                            <div className="flex justify-between text-neutral-600">
                                                <span>Subtotal</span>
                                                <span>{formatPrice(getSubtotal())}</span>
                                            </div>
                                            <div className="flex justify-between text-neutral-600">
                                                <span>Envío</span>
                                                <span>
                                                    {getShipping() === 0 ? 'Gratis' : formatPrice(getShipping())}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="border-t border-neutral-200 pt-4 mb-6">
                                            <div className="flex justify-between items-center">
                                                <span className="text-lg font-bold">Total</span>
                                                <span className="text-2xl font-bold font-display text-primary-600">
                                                    {formatPrice(getTotal())}
                                                </span>
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            variant="primary"
                                            size="lg"
                                            className="w-full h-14 text-lg"
                                            isLoading={isProcessing}
                                            leftIcon={<CheckCircle className="w-6 h-6" />}
                                        >
                                            Pagar Ahora con Wompi
                                        </Button>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </form>
                </div>
            </main>
            <Footer />
        </>
    );
}
