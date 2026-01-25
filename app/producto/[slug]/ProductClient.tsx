'use client';

import { useState } from 'react';
import { ShoppingCart, Heart, Minus, Plus, Star, Truck, Shield } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ProductGrid from '@/components/product/ProductGrid';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import type { Product, ProductVariant } from '@/types';
import ReviewForm from '@/components/product/ReviewForm';
import ReviewList, { Review } from '@/components/product/ReviewList';
import ProductImage from '@/components/product/ProductImage';

interface ProductClientProps {
    initialProduct: Product;
    relatedProducts: Product[];
    initialReviews: Review[];
}

export default function ProductClient({ initialProduct, relatedProducts, initialReviews }: ProductClientProps) {
    const [product] = useState<Product>(initialProduct);
    const [reviews, setReviews] = useState<Review[]>(initialReviews);
    const [selectedImage, setSelectedImage] = useState(0);
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(() => {
        if (initialProduct.variants && initialProduct.variants.length > 0) {
            return initialProduct.variants.find((v: ProductVariant) => v.inStock) || initialProduct.variants[0];
        }
        return undefined;
    });
    const [quantity, setQuantity] = useState(1);

    const addItem = useCartStore((state) => state.addItem);
    const { isInWishlist, toggleItem } = useWishlistStore();

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
                                    <ProductImage
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
                                            <ProductImage
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
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-neutral-900">
                                        {product.variants[0].type === 'color' ? 'Selecciona un Color' :
                                            product.variants[0].type === 'size' ? 'Selecciona tu Talla' : 'Selecciona un Tono'}
                                    </label>
                                    <div className="flex flex-wrap gap-3">
                                        {product.variants.map((variant) => {
                                            const isColor = variant.type === 'color' || variant.type === 'shade';
                                            const isSelected = selectedVariant?.id === variant.id;

                                            if (isColor) {
                                                return (
                                                    <button
                                                        key={variant.id}
                                                        onClick={() => setSelectedVariant(variant)}
                                                        disabled={!variant.inStock || variant.stock_quantity === 0}
                                                        className={`relative w-10 h-10 rounded-full border-2 transition-all ${isSelected
                                                            ? 'border-primary-600 scale-110 ring-2 ring-primary-100 ring-offset-2'
                                                            : 'border-neutral-200 hover:border-neutral-400'
                                                            } ${(!variant.inStock || variant.stock_quantity === 0) ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
                                                        title={`${variant.name} (${variant.stock_quantity} disp.)`}
                                                    >
                                                        <span
                                                            className="absolute inset-1 rounded-full shadow-inner"
                                                            style={{ backgroundColor: variant.value }}
                                                        />
                                                        {isSelected && (
                                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary-600 rounded-full flex items-center justify-center border border-white">
                                                                <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            }

                                            return (
                                                <button
                                                    key={variant.id}
                                                    onClick={() => setSelectedVariant(variant)}
                                                    disabled={!variant.inStock || variant.stock_quantity === 0}
                                                    className={`px-5 py-2.5 rounded-xl border-2 font-medium transition-all ${isSelected
                                                        ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                                                        : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                                                        } ${(!variant.inStock || variant.stock_quantity === 0) ? 'opacity-40 cursor-not-allowed' : ''}`}
                                                >
                                                    {variant.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {selectedVariant && (
                                        <p className="text-sm font-medium text-neutral-500 animate-in fade-in slide-in-from-top-1">
                                            {selectedVariant.stock_quantity > 0
                                                ? `${selectedVariant.stock_quantity} unidades disponibles de ${selectedVariant.name}`
                                                : `Agotado: ${selectedVariant.name}`}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Quantity Picker */}
                            <div>
                                <label className="block text-sm font-medium text-neutral-900 mb-3">
                                    Cantidad
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        disabled={!product.in_stock || (selectedVariant && selectedVariant.stock_quantity === 0)}
                                        className="p-2 border border-neutral-300 rounded-lg hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-12 text-center font-medium">{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(Math.min(selectedVariant?.stock_quantity || product.stock_quantity, quantity + 1))}
                                        disabled={!product.in_stock || (selectedVariant && selectedVariant.stock_quantity === 0) || quantity >= (selectedVariant?.stock_quantity || product.stock_quantity)}
                                        className="p-2 border border-neutral-300 rounded-lg hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
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
                                    disabled={!product.in_stock || (selectedVariant && selectedVariant.stock_quantity === 0)}
                                >
                                    {(!product.in_stock || (selectedVariant && selectedVariant.stock_quantity === 0)) ? 'Agotado' : 'Agregar al Carrito'}
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

                    {/* Reviews Section */}
                    <div className="mb-16">
                        <div className="flex flex-col md:flex-row gap-12">
                            <div className="md:w-1/3">
                                <ReviewForm
                                    productId={product.id}
                                    onSuccess={() => {
                                        fetch(`/api/reviews?product_id=${product.id}`)
                                            .then(res => res.json())
                                            .then(data => setReviews(data.data || []));
                                    }}
                                />
                            </div>
                            <div className="md:w-2/3">
                                <h2 className="text-2xl font-display font-bold text-neutral-900 mb-8">Opiniones de clientes</h2>
                                <ReviewList reviews={reviews} />
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
