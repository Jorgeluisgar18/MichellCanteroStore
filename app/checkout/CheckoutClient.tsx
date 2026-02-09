'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';
import { CreditCard, CheckCircle, Truck, MapPin } from 'lucide-react';

// Declare Wompi WidgetCheckout global type
declare global {
    interface Window {
        WidgetCheckout: unknown;
    }
}

export default function CheckoutClient() {
    const router = useRouter();
    const { items, getSubtotal, clearCart } = useCartStore();
    const [isProcessing, setIsProcessing] = useState(false);
    const [wompiLoaded, setWompiLoaded] = useState(false);

    // Efecto para verificar si Wompi ya está cargado (por si el script termina antes del onLoad)
    useEffect(() => {
        if (typeof window !== 'undefined' && window.WidgetCheckout) {
            setWompiLoaded(true);
        }
    }, []);

    const [formData, setFormData] = useState({
        email: '',
        name: '',
        phone: '',
        street: '',
        city: '',
        state: '',
        paymentMethod: 'card',
        shippingMethod: 'delivery' as 'delivery' | 'pickup',
        shippingLocation: 'cienaga' as string,
    });

    const [termsAccepted, setTermsAccepted] = useState({
        terms: false,
        privacy: false,
    });

    // Calculate shipping cost based on method and location
    const getShippingCost = (): number => {
        if (formData.shippingMethod === 'pickup') {
            return 0;
        }

        const shippingCosts: Record<string, number> = {
            'cienaga': 5000,
            'santa-marta': 10000,
            'resto-colombia': 16000,
        };

        return shippingCosts[formData.shippingLocation] || 0;
    };

    const subtotal = getSubtotal();
    const shipping = getShippingCost();
    const total = subtotal + shipping;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        try {
            // Verificar que Wompi esté cargado
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (!wompiLoaded || typeof window === 'undefined' || !(window as any).WidgetCheckout) {
                throw new Error('El sistema de pagos aún no está listo. Por favor, intenta de nuevo en un momento.');
            }

            // ✅ SECURITY: Generate idempotency key to prevent duplicate orders
            const idempotencyKey = crypto.randomUUID();

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
                    shipping_zip_code: null,
                    shipping_method: formData.shippingMethod,
                    shipping_location: formData.shippingMethod === 'delivery' ? formData.shippingLocation : null,
                    payment_method: 'wompi',
                    idempotency_key: idempotencyKey,
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
                    amount: total, // Use local total calculation
                    email: formData.email,
                    reference: order.order_number,
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
                signature: {
                    integrity: params.signature
                },
                redirectUrl: params.redirectUrl,
                customerData: {
                    email: params.customerEmail
                }
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
            {/* Cargar script de Wompi con Next.js Script */}
            <Script
                src="https://checkout.wompi.co/widget.js"
                strategy="afterInteractive"
                onLoad={() => {
                    console.log('Wompi widget script loaded successfully via onLoad');
                    setWompiLoaded(true);
                }}
                onError={() => {
                    console.error('Failed to load Wompi widget script');
                    alert('Error al cargar el sistema de pagos. Por favor, recarga la página.');
                }}
            />

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

                                {/* Shipping Method */}
                                <Card>
                                    <div className="p-6">
                                        <h2 className="text-xl font-display font-bold mb-6">
                                            Método de Envío
                                        </h2>
                                        <div className="space-y-6">
                                            {/* Level 1: Delivery vs Pickup */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, shippingMethod: 'delivery' })}
                                                    className={`p-4 border-2 rounded-xl transition-all text-left ${formData.shippingMethod === 'delivery'
                                                        ? 'border-primary-500 bg-primary-50 shadow-sm'
                                                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                                                        }`}
                                                >
                                                    <Truck className={`w-6 h-6 mb-2 ${formData.shippingMethod === 'delivery' ? 'text-primary-600' : 'text-neutral-400'}`} />
                                                    <div className="font-bold text-neutral-900">Envío a Domicilio</div>
                                                    <div className="text-xs text-neutral-500 mt-1">Recibe en tu dirección</div>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, shippingMethod: 'pickup' })}
                                                    className={`p-4 border-2 rounded-xl transition-all text-left ${formData.shippingMethod === 'pickup'
                                                        ? 'border-primary-500 bg-primary-50 shadow-sm'
                                                        : 'border-neutral-200 bg-white hover:border-neutral-300'
                                                        }`}
                                                >
                                                    <CheckCircle className={`w-6 h-6 mb-2 ${formData.shippingMethod === 'pickup' ? 'text-primary-600' : 'text-neutral-400'}`} />
                                                    <div className="font-bold text-neutral-900">Retiro en Tienda</div>
                                                    <div className="text-xs text-neutral-500 mt-1">Gratis en Ciénaga</div>
                                                </button>
                                            </div>

                                            {/* Level 2: Delivery Locations (only if delivery selected) */}
                                            {formData.shippingMethod === 'delivery' && (
                                                <div className="space-y-3 pt-2">
                                                    <p className="text-sm font-semibold text-neutral-700 mb-3">Selecciona tu ubicación:</p>
                                                    {[
                                                        { id: 'cienaga', name: 'Ciénaga', price: 5000, note: 'Precio puede variar según distancia' },
                                                        { id: 'santa-marta', name: 'Santa Marta', price: 10000, note: 'Entrega en el casco urbano' },
                                                        { id: 'resto-colombia', name: 'Resto de Colombia', price: 16000, note: 'Envíos nacionales' }
                                                    ].map((loc) => (
                                                        <button
                                                            key={loc.id}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, shippingLocation: loc.id })}
                                                            className={`w-full p-4 border-2 rounded-xl flex items-center justify-between transition-all ${formData.shippingLocation === loc.id
                                                                ? 'border-primary-500 bg-white ring-2 ring-primary-500/20'
                                                                : 'border-neutral-100 bg-neutral-50/50 hover:border-neutral-200'
                                                                }`}
                                                        >
                                                            <div className="flex items-center">
                                                                <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${formData.shippingLocation === loc.id ? 'border-primary-500 bg-primary-500' : 'border-neutral-300'}`}>
                                                                    {formData.shippingLocation === loc.id && <div className="w-2 h-2 bg-white rounded-full" />}
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="font-semibold text-neutral-900">{loc.name}</div>
                                                                    <div className="text-xs text-neutral-500">{loc.note}</div>
                                                                </div>
                                                            </div>
                                                            <div className="font-bold text-primary-600">
                                                                {formatPrice(loc.price)}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Level 2: Pickup Details (only if pickup selected) */}
                                            {formData.shippingMethod === 'pickup' && (
                                                <div className="p-5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-4">
                                                    <div className="flex items-start space-x-3">
                                                        <MapPin className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                                                        <div>
                                                            <p className="font-bold text-neutral-900">Ubicación de la tienda:</p>
                                                            <p className="text-neutral-600">Calle 9 #22-51, Ciénaga, Magdalena</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start space-x-3">
                                                        <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                                                        <div>
                                                            <p className="font-bold text-neutral-900">Tiempo de preparación:</p>
                                                            <p className="text-neutral-600">Normalmente el pedido está listo en 30 minutos.</p>
                                                        </div>
                                                    </div>
                                                    <div className="pt-2 border-t border-neutral-200 flex justify-between items-center">
                                                        <span className="text-sm font-medium text-neutral-500">Costo de retiro:</span>
                                                        <span className="font-bold text-green-600 uppercase tracking-wider">Gratis</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>

                                {/* Shipping Address */}
                                <Card>
                                    <div className="p-6">
                                        <h2 className="text-xl font-display font-bold mb-6">
                                            {formData.shippingMethod === 'delivery' ? 'Dirección de Envío' : 'Información de Contacto'}
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
                                                    required={formData.shippingMethod === 'delivery'}
                                                    placeholder="Calle 123 #45-67"
                                                />
                                            </div>
                                            <Input
                                                label="Ciudad"
                                                name="city"
                                                value={formData.city}
                                                onChange={handleChange}
                                                required={formData.shippingMethod === 'delivery'}
                                                placeholder="Ciénaga"
                                            />
                                            <Input
                                                label="Departamento"
                                                name="state"
                                                value={formData.state}
                                                onChange={handleChange}
                                                required={formData.shippingMethod === 'delivery'}
                                                placeholder="Magdalena"
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
                                                <span>{formatPrice(subtotal)}</span>
                                            </div>
                                            <div className="flex justify-between text-neutral-600">
                                                <span>Envío</span>
                                                <span>
                                                    {shipping === 0 ? 'Gratis' : formatPrice(shipping)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="border-t border-neutral-200 pt-4 mb-6">
                                            <div className="flex justify-between items-center">
                                                <span className="text-lg font-bold">Total</span>
                                                <span className="text-2xl font-bold font-display text-primary-600">
                                                    {formatPrice(total)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Terms and Conditions */}
                                        <div className="space-y-3 mb-6 border-t border-neutral-200 pt-4">
                                            <label className="flex items-start cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={termsAccepted.terms}
                                                    onChange={(e) => setTermsAccepted({ ...termsAccepted, terms: e.target.checked })}
                                                    className="mt-1 mr-3 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                />
                                                <span className="text-sm text-neutral-600 group-hover:text-neutral-900 transition-colors">
                                                    Acepto los{' '}
                                                    <a
                                                        href="/politicas/terminos"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary-600 hover:text-primary-700 underline font-medium"
                                                    >
                                                        Términos y Condiciones
                                                    </a>
                                                </span>
                                            </label>
                                            <label className="flex items-start cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={termsAccepted.privacy}
                                                    onChange={(e) => setTermsAccepted({ ...termsAccepted, privacy: e.target.checked })}
                                                    className="mt-1 mr-3 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                />
                                                <span className="text-sm text-neutral-600 group-hover:text-neutral-900 transition-colors">
                                                    Acepto la{' '}
                                                    <a
                                                        href="/politicas/privacidad"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary-600 hover:text-primary-700 underline font-medium"
                                                    >
                                                        Política de Privacidad
                                                    </a>
                                                </span>
                                            </label>
                                        </div>

                                        <Button
                                            type="submit"
                                            variant="primary"
                                            size="lg"
                                            className="w-full h-14 text-lg"
                                            isLoading={isProcessing}
                                            disabled={!termsAccepted.terms || !termsAccepted.privacy || isProcessing}
                                            leftIcon={<CheckCircle className="w-6 h-6" />}
                                        >
                                            Finalizar Compra
                                        </Button>
                                        {(!termsAccepted.terms || !termsAccepted.privacy) && (
                                            <p className="text-xs text-center text-neutral-500 mt-2">
                                                Debes aceptar los términos y condiciones para continuar
                                            </p>
                                        )}
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
