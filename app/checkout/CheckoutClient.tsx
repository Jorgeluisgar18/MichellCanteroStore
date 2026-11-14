'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';
import { CreditCard, CheckCircle, Truck, MapPin, AlertCircle, X } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/hooks/useCsrfToken';
import { STORE_CONFIG } from '@/lib/config';
import { calculateCheckoutShippingCost } from '@/lib/checkout/safety';
import { deriveCheckoutAttempt } from '@/lib/checkout/idempotency';
import { synchronizeCartStorage } from '@/lib/checkout/cart-session';
import { useCartSession } from '@/lib/checkout/use-cart-session';
import { cartLineTotal, refreshCartCatalog } from '@/lib/checkout/cart-freshness';
import { buildWompiWebFields, cartContentsFingerprint, saveReturnContext, submitWompiWeb } from '@/lib/checkout/wompi-checkout-web';

export default function CheckoutClient() {
    const router = useRouter();
    const { items, getSubtotal } = useCartStore();
    const [isProcessing, setIsProcessing] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const submissionInFlight = useRef(false);
    const handoffStarted = useRef(false);
    const mounted = useRef(true);
    const hydrated = useCartSession(setCheckoutError);

    useEffect(() => {
        mounted.current = true;
        const restore = () => {
            submissionInFlight.current = false;
            handoffStarted.current = false;
            setIsProcessing(false);
        };
        window.addEventListener('pageshow', restore);
        return () => { mounted.current = false; window.removeEventListener('pageshow', restore); };
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

    const [errors, setErrors] = useState<Record<string, string>>({});

    const [termsAccepted, setTermsAccepted] = useState({
        terms: false,
        privacy: false,
    });

    // Calculate shipping cost based on method and location
    // Rates are read from STORE_CONFIG — single source of truth
    const getShippingCost = (): number => {
        return calculateCheckoutShippingCost({
            subtotal,
            shippingMethod: formData.shippingMethod,
            shippingLocation: formData.shippingLocation,
        });
    };

    const subtotal = getSubtotal();
    const shipping = getShippingCost();
    const total = subtotal + shipping;

    useEffect(() => {
        if (hydrated && items.length === 0) {
            router.replace('/carrito');
        }
    }, [hydrated, items.length, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hydrated || submissionInFlight.current || handoffStarted.current || !mounted.current) return;
        submissionInFlight.current = true;
        setIsProcessing(true);
        setCheckoutError(null);

        try {
            synchronizeCartStorage(window.localStorage, useCartStore);
            const snapshot = useCartStore.getState().items;
            const cartId = useCartStore.getState().cartId ?? null;
            if (snapshot !== items) throw new Error('El carrito cambió. Revisa el resumen e intenta nuevamente.');
            const fresh = await refreshCartCatalog(snapshot);
            if (!mounted.current) return;
            synchronizeCartStorage(window.localStorage, useCartStore);
            if (!useCartStore.getState().replaceSnapshot(snapshot, fresh.items)) {
                throw new Error('El carrito cambió durante la verificación. Revisa el resumen e intenta nuevamente.');
            }
            if (fresh.priceChanged) {
                throw new Error('Actualizamos los precios de tu carrito. Revisa el nuevo total y confirma nuevamente para continuar.');
            }
            const reviewedSubtotal = fresh.items.reduce((sum, item) => sum + cartLineTotal(item), 0);
            const reviewedTotal = reviewedSubtotal + calculateCheckoutShippingCost({
                subtotal: reviewedSubtotal, shippingMethod: formData.shippingMethod, shippingLocation: formData.shippingLocation,
            });
            const reviewedCents = Math.round(reviewedTotal * 100);
            const assertCurrentCart = () => {
                synchronizeCartStorage(window.localStorage, useCartStore);
                const current = useCartStore.getState();
                if (current.items !== fresh.items || (current.cartId ?? null) !== cartId) {
                    throw new Error('El carrito cambió en otra pestaña o durante la verificación. Revisa el resumen antes de continuar.');
                }
            };

            const orderRequest = {
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
                items: fresh.items.map(item => ({
                    product_id: item.product.id,
                    product_name: item.product.name,
                    product_price: item.product.price,
                    product_image: item.product.images[0],
                    quantity: item.quantity,
                    variant_name: item.selectedVariant?.name,
                    variant_id: item.selectedVariant?.id,
                    subtotal: cartLineTotal(item),
                })),
            };
            const attempt = await deriveCheckoutAttempt(cartId, orderRequest);
            if (!mounted.current) return;
            assertCurrentCart();

            // 1. Crear la orden en la base de datos a través de la API
            const orderResponse = await fetchWithCsrf('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...orderRequest, idempotency_key: attempt.key }),
            });

            const { data: order, error: orderError } = await orderResponse.json();
            if (!mounted.current) return;
            assertCurrentCart();

            if (orderError || !order) {
                throw new Error(orderError || 'Error al crear la orden');
            }
            if (!Number.isFinite(Number(order.total)) || Math.round(Number(order.total) * 100) !== reviewedCents) {
                throw new Error('El total de la orden cambió. No se abrió el pago. Revisa tu pedido antes de continuar.');
            }

            // 2. Obtener parámetros de Wompi
            saveReturnContext(window.sessionStorage, { orderId: order.id, email: formData.email,
                cartFingerprint: cartContentsFingerprint(fresh.items), cartId, createdAt: Date.now() });
            let paramsResponse: Response;
            try { paramsResponse = await fetchWithCsrf('/api/payments/checkout-params', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: order.id,
                    amount: reviewedTotal,
                    email: formData.email,
                    reference: order.order_number,
                }),
            }); } catch {
                router.push(`/checkout/confirmacion?orderId=${encodeURIComponent(order.id)}`);
                return;
            }

            if (paramsResponse.status === 202) {
                router.push(`/checkout/confirmacion?orderId=${encodeURIComponent(order.id)}`);
                return;
            }

            const { data: params, error: paramsError } = await paramsResponse.json();
            if (!mounted.current) return;
            assertCurrentCart();

            if (paramsError || !params) {
                throw new Error(paramsError || 'Error al obtener parámetros de pago');
            }
            if (params.amountInCents !== reviewedCents || useCartStore.getState().items !== fresh.items) {
                throw new Error('El pedido cambió antes de abrir el pago. Revisa el resumen e intenta nuevamente.');
            }

            if (params.reference !== order.order_number) throw new Error('La referencia de pago no coincide con tu orden.');
            const fields = buildWompiWebFields(params, window.location.origin, order.id);
            saveReturnContext(window.sessionStorage, { orderId: order.id, email: formData.email,
                cartFingerprint: cartContentsFingerprint(fresh.items), cartId, createdAt: Date.now() });
            handoffStarted.current = true;
            try { submitWompiWeb(fields); } catch (error) { handoffStarted.current = false; throw error; }

        } catch (error) {
            console.error('Checkout error:', error);
            const message = error instanceof Error ? error.message : 'Hubo un error al procesar tu pedido. Por favor intenta de nuevo.';
            if (mounted.current) setCheckoutError(message);
        } finally {
            if (!handoffStarted.current) {
                submissionInFlight.current = false;
                if (mounted.current) setIsProcessing(false);
            }
        }
    };

    const validateField = (name: string, value: string) => {
        let error = '';
        switch (name) {
            case 'email':
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Email inválido';
                break;
            case 'phone':
                if (!/^\d{10,}$/.test(value.replace(/\s/g, ''))) error = 'Mínimo 10 dígitos';
                break;
            case 'name':
                if (value.length < 3) error = 'Nombre demasiado corto';
                break;
            case 'street':
                if (value.length < 5) error = 'Dirección incompleta';
                break;
        }
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name in formData) validateField(name, value);
    };

    if (!hydrated) {
        return <><Header /><main className="min-h-screen bg-neutral-50 flex items-center justify-center"><p>Cargando carrito...</p></main><Footer /></>;
    }
    if (items.length === 0) {
        return null;
    }

    return (
        <>
            <Header />
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
                                                error={errors.email}
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
                                                    {/* Locations and prices read from STORE_CONFIG — no hardcoded values */}
                                                    {STORE_CONFIG.SHIPPING_LOCATIONS.map((loc) => (
                                                        <button
                                                            key={loc.id}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, shippingLocation: loc.id })}
                                                            className={`w-full p-4 border-2 rounded-xl flex items-center justify-between transition-all ${
                                                                formData.shippingLocation === loc.id
                                                                    ? 'border-primary-500 bg-white ring-2 ring-primary-500/20'
                                                                    : 'border-neutral-100 bg-neutral-50/50 hover:border-neutral-200'
                                                            }`}
                                                        >
                                                            <div className="flex items-center">
                                                                <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                                                                    formData.shippingLocation === loc.id
                                                                        ? 'border-primary-500 bg-primary-500'
                                                                        : 'border-neutral-300'
                                                                }`}>
                                                                    {formData.shippingLocation === loc.id && <div className="w-2 h-2 bg-white rounded-full" />}
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="font-semibold text-neutral-900">{loc.name}</div>
                                                                    <div className="text-xs text-neutral-500">{loc.note}</div>
                                                                </div>
                                                            </div>
                                                            <div className="font-bold text-primary-600">
                                                                {formatPrice(STORE_CONFIG.SHIPPING_RATES[loc.id] ?? 0)}
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
                                                error={errors.name}
                                            />
                                            <Input
                                                label="Teléfono"
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                required
                                                placeholder="300 123 4567"
                                                error={errors.phone}
                                            />
                                            <div className="md:col-span-2">
                                                <Input
                                                    label="Dirección"
                                                    name="street"
                                                    value={formData.street}
                                                    onChange={handleChange}
                                                    required={formData.shippingMethod === 'delivery'}
                                                    placeholder="Calle 123 #45-67"
                                                    error={errors.street}
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
                                                        {formatPrice(cartLineTotal(item))}
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

                                        {/* Checkout error banner */}
                                        {checkoutError && (
                                            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
                                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                                <span className="flex-1">{checkoutError}</span>
                                                <button type="button" aria-label="Cerrar mensaje de error" onClick={() => setCheckoutError(null)} className="opacity-60 hover:opacity-100">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
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
