'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';

export default function CarritoClient() {
    const [isMounted, setIsMounted] = useState(false);

    const {
        items,
        updateQuantity,
        removeItem,
        getSubtotal,
        getTax,
        getShipping,
        getTotal,
    } = useCartStore();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return (
            <>
                <Header />
                <main className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center">
                    <p className="text-neutral-500 font-medium">Cargando carrito...</p>
                </main>
                <Footer />
            </>
        );
    }

    const subtotal = getSubtotal();
    const shipping = getShipping();
    const total = getTotal();

    if (items.length === 0) {
        return (
            <>
                <Header />
                <main className="min-h-screen bg-neutral-50">
                    <div className="container-custom py-16">
                        <Card className="max-w-lg mx-auto text-center p-12">
                            <ShoppingBag className="w-16 h-16 mx-auto text-neutral-400 mb-4" />
                            <h1 className="text-2xl font-display font-bold text-neutral-900 mb-2">
                                Tu carrito está vacío
                            </h1>
                            <p className="text-neutral-600 mb-6">
                                Agrega productos para comenzar tu compra
                            </p>
                            <Link href="/tienda">
                                <Button variant="primary" size="lg">
                                    Explorar Productos
                                </Button>
                            </Link>
                        </Card>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Header />
            <main className="min-h-screen bg-neutral-50">
                <div className="container-custom py-8">
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 mb-8">
                        Carrito de Compras
                    </h1>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Cart Items */}
                        <div className="lg:col-span-2 space-y-4">
                            {items.map((item) => (
                                <Card key={`${item.product.id}-${item.selectedVariant?.id || 'default'}`}>
                                    <div className="p-4 md:p-6">
                                        <div className="flex gap-4">
                                            {/* Product Image */}
                                            <div className="relative w-24 h-24 md:w-32 md:h-32 flex-shrink-0 bg-neutral-100 rounded-lg overflow-hidden">
                                                <Image
                                                    src={item.product.images[0]}
                                                    alt={item.product.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>

                                            {/* Product Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between gap-4 mb-2">
                                                    <div>
                                                        <Link
                                                            href={`/producto/${item.product.slug}`}
                                                            className="font-semibold text-neutral-900 hover:text-primary-600 transition-colors line-clamp-2"
                                                        >
                                                            {item.product.name}
                                                        </Link>
                                                        {item.selectedVariant && (
                                                            <p className="text-sm text-neutral-600 mt-1">
                                                                {item.selectedVariant.name}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => removeItem(item.product.id, item.selectedVariant?.id)}
                                                        className="text-neutral-400 hover:text-red-600 transition-colors"
                                                        aria-label="Eliminar producto"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between mt-4">
                                                    {/* Quantity Controls */}
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() =>
                                                                updateQuantity(
                                                                    item.product.id,
                                                                    item.quantity - 1,
                                                                    item.selectedVariant?.id
                                                                )
                                                            }
                                                            className="p-1.5 border border-neutral-300 rounded-lg hover:bg-neutral-100"
                                                            aria-label="Disminuir cantidad"
                                                        >
                                                            <Minus className="w-4 h-4" />
                                                        </button>
                                                        <span className="w-8 text-center font-medium">
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() =>
                                                                updateQuantity(
                                                                    item.product.id,
                                                                    item.quantity + 1,
                                                                    item.selectedVariant?.id
                                                                )
                                                            }
                                                            className="p-1.5 border border-neutral-300 rounded-lg hover:bg-neutral-100"
                                                            disabled={item.quantity >= item.product.stock_quantity}
                                                            aria-label="Aumentar cantidad"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    {/* Price */}
                                                    <div className="text-right">
                                                        <p className="font-bold text-neutral-900">
                                                            {formatPrice(
                                                                (item.product.price + (item.selectedVariant?.priceModifier || 0)) *
                                                                item.quantity
                                                            )}
                                                        </p>
                                                        <p className="text-sm text-neutral-600">
                                                            {formatPrice(item.product.price + (item.selectedVariant?.priceModifier || 0))} c/u
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Order Summary */}
                        <div className="lg:col-span-1">
                            <Card className="sticky top-24">
                                <div className="p-6">
                                    <h2 className="text-xl font-display font-bold text-neutral-900 mb-6">
                                        Resumen del Pedido
                                    </h2>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex justify-between text-neutral-600">
                                            <span>Subtotal</span>
                                            <span>{formatPrice(subtotal)}</span>
                                        </div>
                                        <div className="flex justify-between text-neutral-600">
                                            <span>Envío</span>
                                            <span>{shipping === 0 ? 'Gratis' : formatPrice(shipping)}</span>
                                        </div>
                                        {shipping > 0 && (
                                            <p className="text-xs text-primary-600">
                                                Agrega {formatPrice(200000 - subtotal)} más para envío gratis
                                            </p>
                                        )}
                                    </div>

                                    <div className="border-t border-neutral-200 pt-4 mb-6">
                                        <div className="flex justify-between items-center">
                                            <span className="text-lg font-bold text-neutral-900">Total</span>
                                            <span className="text-2xl font-bold text-neutral-900">
                                                {formatPrice(total)}
                                            </span>
                                        </div>
                                    </div>

                                    <Link href="/checkout">
                                        <Button variant="primary" size="lg" className="w-full mb-3">
                                            Proceder al Pago
                                        </Button>
                                    </Link>

                                    <Link href="/tienda">
                                        <Button variant="outline" size="lg" className="w-full">
                                            Continuar Comprando
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
