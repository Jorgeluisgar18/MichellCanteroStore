'use client';

// Force dynamic rendering to prevent SSR issues with Zustand stores
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Heart, Minus, Plus, Star, Truck, Shield, Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ProductGrid from '@/components/product/ProductGrid';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import type { Product, ProductVariant } from '@/types';

export default function ProductPage() {
    const params = useParams();
    const slug = params.slug as string;

    const [product, setProduct] = useState<Product | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>();
    const [quantity, setQuantity] = useState(1);

    const addItem = useCartStore((state) => state.addItem);
    const { isInWishlist, toggleItem } = useWishlistStore();

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                // Fetch product by slug
                const res = await fetch(`/api/products?slug=${slug}`);
                const data = await res.json();

                if (data.data && data.data.length > 0) {
                    const foundProduct = data.data[0];
                    setProduct(foundProduct);

                    // Auto-select first in-stock variant if none selected
                    if (foundProduct.variants && foundProduct.variants.length > 0) {
                        const firstInStock = foundProduct.variants.find((v: ProductVariant) => v.inStock);
                        if (firstInStock) {
                            setSelectedVariant(firstInStock);
                        } else {
                            // If none in stock, select the first one anyway so the user sees something
                            setSelectedVariant(foundProduct.variants[0]);
                        }
                    }

                    // Fetch related products
                    const relatedRes = await fetch(`/api/products?category=${foundProduct.category}&limit=5`);
                    const relatedData = await relatedRes.json();
                    setRelatedProducts(relatedData.data?.filter((p: Product) => p.id !== foundProduct.id).slice(0, 4) || []);
                }
            } catch (error) {
                console.error('Error fetching product:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [slug]);

    if (loading) {
        return (
            <>
                <Header />
                <main className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary-600 mb-4" />
                    <p className="text-neutral-500 font-medium">Cargando producto...</p>
                </main>
                <Footer />
            </>
        );
    }

    if (!product) {
        return (
            <>
                <Header />
                <main className="min-h-screen bg-neutral-50">
                    <div className="container-custom py-16 text-center">
                        <h1 className="text-2xl font-bold text-neutral-900 mb-4">
                            Producto no encontrado
                        </h1>
                        <Link href="/tienda">
                            <Button variant="outline">Volver a la Tienda</Button>
                        </Link>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    const inWishlist = isInWishlist(product.id);
    const discount = product.compare_at_price
        ? calculateDiscount(product.price, product.compare_at_price)
        : 0;

    const handleAddToCart = () => {
        if (product && product.variants && product.variants.length > 0 && !selectedVariant) {
            alert('Por favor selecciona una opción');
            return;
        }

        if (product) {
            addItem(product, quantity, selectedVariant);
            alert('Producto agregado al carrito');
        }
    };

    return (
        <>
            <Header />
            <main className="min-h-screen bg-neutral-50">
                <div className="container-custom py-8">
                    {/* Product Details */}
                    <div className="grid md:grid-cols-2 gap-8 md:gap-12 mb-16">
                        {/* Images */}
                        <div className="space-y-4">
                            <div className="relative aspect-square bg-white rounded-2xl overflow-hidden">
                                {product.images?.[selectedImage] ? (
                                    <Image
                                        src={product.images[selectedImage]}
                                        alt={product.name}
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-300">
                                        No image
                                    </div>
                                )}
                                {discount > 0 && (
                                    <Badge variant="danger" className="absolute top-4 left-4">
                                        -{discount}%
                                    </Badge>
                                )}
                            </div>
                            {product.images && product.images.length > 1 && (
                                <div className="grid grid-cols-4 gap-4">
                                    {product.images.map((image, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedImage(index)}
                                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === index
                                                ? 'border-primary-600'
                                                : 'border-transparent hover:border-neutral-300'
                                                }`}
                                        >
                                            <Image
                                                src={image}
                                                alt={`${product.name} ${index + 1}`}
                                                fill
                                                className="object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Product Info */}
                        <div className="space-y-6">
                            {product.brand && (
                                <p className="text-sm text-neutral-500 uppercase tracking-wide">
                                    {product.brand}
                                </p>
                            )}

                            <h1 className="text-3xl md:text-4xl font-display font-bold text-neutral-900">
                                {product.name}
                            </h1>

                            {/* Rating */}
                            {(product.rating !== undefined && product.rating !== null) && (
                                <div className="flex items-center gap-2">
                                    <div className="flex">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`w-5 h-5 ${i < Math.floor(product.rating!)
                                                    ? 'fill-yellow-400 text-yellow-400'
                                                    : 'text-neutral-300'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-sm text-neutral-600">
                                        {product.rating} ({product.review_count} reseñas)
                                    </span>
                                </div>
                            )}

                            {/* Price */}
                            <div className="flex items-center gap-3">
                                <span className="text-3xl font-bold text-neutral-900">
                                    {formatPrice(product.price)}
                                </span>
                                {product.compare_at_price && (
                                    <span className="text-xl text-neutral-500 line-through">
                                        {formatPrice(product.compare_at_price)}
                                    </span>
                                )}
                            </div>

                            {/* Description */}
                            <p className="text-neutral-600 leading-relaxed whitespace-pre-line">
                                {product.description}
                            </p>

                            {/* Variants */}
                            {product.variants && product.variants.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-neutral-900 mb-3">
                                        {product.variants[0].type === 'color' ? 'Color' :
                                            product.variants[0].type === 'size' ? 'Talla' : 'Tono'}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {product.variants.map((variant) => (
                                            <button
                                                key={variant.id}
                                                onClick={() => setSelectedVariant(variant)}
                                                disabled={!variant.inStock}
                                                className={`px-4 py-2 rounded-lg border-2 transition-colors ${selectedVariant?.id === variant.id
                                                    ? 'border-primary-600 bg-primary-50'
                                                    : 'border-neutral-300 hover:border-neutral-400'
                                                    } ${!variant.inStock && 'opacity-50 cursor-not-allowed'}`}
                                            >
                                                {variant.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quantity */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-900 mb-3">
                                    Cantidad
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="p-2 border border-neutral-300 rounded-lg hover:bg-neutral-100"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-12 text-center font-medium">{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                                        className="p-2 border border-neutral-300 rounded-lg hover:bg-neutral-100"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <Button
                                    variant="primary"
                                    size="lg"
                                    className="flex-1"
                                    leftIcon={<ShoppingCart className="w-5 h-5" />}
                                    onClick={handleAddToCart}
                                    disabled={!product.in_stock}
                                >
                                    {product.in_stock ? 'Agregar al Carrito' : 'Agotado'}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={() => toggleItem(product.id)}
                                >
                                    <Heart
                                        className={`w-5 h-5 ${inWishlist ? 'fill-primary-600 text-primary-600' : ''
                                            }`}
                                    />
                                </Button>
                            </div>

                            {/* Trust Badges */}
                            <div className="border-t border-neutral-200 pt-6 space-y-3">
                                <div className="flex items-center gap-3 text-sm text-neutral-600">
                                    <Truck className="w-5 h-5 text-primary-600" />
                                    <span>Envío gratis en compras superiores a $200.000</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-neutral-600">
                                    <Shield className="w-5 h-5 text-primary-600" />
                                    <span>Compra 100% segura y protegida</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Related Products */}
                    {relatedProducts.length > 0 && (
                        <div>
                            <h2 className="text-2xl md:text-3xl font-display font-bold text-neutral-900 mb-8">
                                Productos Relacionados
                            </h2>
                            <ProductGrid products={relatedProducts} />
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}
