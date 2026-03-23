'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ShoppingCart, Heart, Minus, Plus, Star, Truck, Shield, ChevronRight } from 'lucide-react';
import { STORE_CONFIG } from '@/lib/config';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
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

type ProductProfile = 'simple' | 'shade' | 'apparel';

type ApparelColorOption = {
    key: string;
    label: string;
    hex: string;
    image?: string;
};

function getProductProfile(product: Product): ProductProfile {
    if (product.category === 'ropa' || product.variants?.some((variant) => variant.type === 'color_size')) {
        return 'apparel';
    }

    if (product.variants?.some((variant) => variant.type === 'shade')) {
        return 'shade';
    }

    return 'simple';
}

function getInitialVariant(product: Product): ProductVariant | undefined {
    if (!product.variants || product.variants.length === 0) {
        return undefined;
    }

    return product.variants.find((variant) => variant.inStock) ?? product.variants.at(0);
}

function getVariantImage(product: Product, variant?: ProductVariant): string | undefined {
    return variant?.image || product.images?.at(0);
}

function getVariantColorKey(variant?: ProductVariant): string | undefined {
    if (!variant) {
        return undefined;
    }

    return `${variant.colorName || variant.name}-${variant.colorHex || variant.value}`;
}

function getVariantLabel(profile: ProductProfile): string {
    if (profile === 'apparel') {
        return 'Selecciona color y talla';
    }

    if (profile === 'shade') {
        return 'Selecciona un tono';
    }

    return 'Selecciona una opción';
}

export default function ProductClient({ initialProduct, relatedProducts, initialReviews }: ProductClientProps) {
    const [product] = useState<Product>(initialProduct);
    const [reviews, setReviews] = useState<Review[]>(initialReviews);
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(() => getInitialVariant(initialProduct));
    const [selectedImageUrl, setSelectedImageUrl] = useState<string | undefined>(() => getVariantImage(initialProduct, getInitialVariant(initialProduct)));
    const [selectedColorKey, setSelectedColorKey] = useState<string | undefined>(() => getVariantColorKey(getInitialVariant(initialProduct)));
    const [quantity, setQuantity] = useState(1);

    const addItem = useCartStore((state) => state.addItem);
    const { isInWishlist, toggleItem } = useWishlistStore();
    const { showToast } = useToast();

    const profile = getProductProfile(product);
    const inWishlist = isInWishlist(product.id);
    const discount = product.compare_at_price
        ? calculateDiscount(product.price, product.compare_at_price)
        : 0;
    const variantLabel = getVariantLabel(profile);
    const apparelVariants = product.variants?.filter((variant) => variant.type === 'color_size') ?? [];
    const shadeVariants = product.variants?.filter((variant) => variant.type === 'shade') ?? [];
    const simpleVariants = product.variants?.filter((variant) => variant.type !== 'color_size') ?? [];

    const apparelColorOptions = apparelVariants.reduce<ApparelColorOption[]>((options, variant) => {
        const key = getVariantColorKey(variant);

        if (!key || options.some((option) => option.key === key)) {
            return options;
        }

        return [
            ...options,
            {
                key,
                label: variant.colorName || variant.name,
                hex: variant.colorHex || '#d4a373',
                ...(variant.image ? { image: variant.image } : {}),
            },
        ];
    }, []);

    const activeColorKey = selectedColorKey || apparelColorOptions.at(0)?.key;
    const sizeOptions = activeColorKey
        ? apparelVariants.filter((variant) => getVariantColorKey(variant) === activeColorKey)
        : apparelVariants;

    useEffect(() => {
        if (profile !== 'apparel' || selectedVariant) {
            return;
        }

        const nextApparelVariants = product.variants?.filter((variant) => variant.type === 'color_size') ?? [];
        const nextVariant = nextApparelVariants.find((variant) => variant.inStock) ?? nextApparelVariants.at(0);

        if (!nextVariant) {
            return;
        }

        setSelectedVariant(nextVariant);
        setSelectedColorKey(getVariantColorKey(nextVariant));
        setSelectedImageUrl(getVariantImage(product, nextVariant));
    }, [product, profile, selectedVariant]);

    useEffect(() => {
        if (profile !== 'apparel' || !selectedVariant) {
            return;
        }

        setSelectedColorKey(getVariantColorKey(selectedVariant));
    }, [profile, selectedVariant]);

    useEffect(() => {
        if (!selectedVariant) {
            setQuantity(1);
            return;
        }

        setSelectedImageUrl(getVariantImage(product, selectedVariant));
        setQuantity((currentQuantity) => Math.min(Math.max(1, currentQuantity), selectedVariant.stock_quantity || 1));
    }, [product, selectedVariant]);

    const displayedImage = selectedImageUrl || product.images?.at(0);

    const handleAddToCart = () => {
        if (product.variants && product.variants.length > 0 && !selectedVariant) {
            showToast('Por favor selecciona una opción', 'error');
            return;
        }

        addItem(product, quantity, selectedVariant);
        showToast('Producto agregado al carrito');
    };

    const handleColorSelect = (colorKey: string) => {
        setSelectedColorKey(colorKey);
        const nextVariant = apparelVariants.find((variant) => getVariantColorKey(variant) === colorKey && variant.inStock)
            ?? apparelVariants.find((variant) => getVariantColorKey(variant) === colorKey);

        if (!nextVariant) {
            return;
        }

        setSelectedVariant(nextVariant);
        setSelectedImageUrl(getVariantImage(product, nextVariant));
    };

    const handleVariantSelect = (variant: ProductVariant) => {
        setSelectedVariant(variant);
        setSelectedImageUrl(getVariantImage(product, variant));
    };

    const maxAvailableQuantity = selectedVariant?.stock_quantity || product.stock_quantity;

    return (
        <>
            <Header />
            <main className="min-h-screen bg-neutral-50">
                <div className="container-custom py-8">
                    <nav className="mb-8 flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-2 text-sm text-neutral-500 md:pb-0">
                        <Link href="/" className="hover:text-primary-600 transition-colors">Inicio</Link>
                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                        <Link href="/tienda" className="hover:text-primary-600 transition-colors">Tienda</Link>
                        {product.category && (
                            <>
                                <ChevronRight className="w-4 h-4 flex-shrink-0" />
                                <Link
                                    href={`/tienda/${product.category}`}
                                    className="hover:text-primary-600 transition-colors whitespace-nowrap"
                                >
                                    {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
                                </Link>
                            </>
                        )}
                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate font-medium text-neutral-900">{product.name}</span>
                    </nav>

                    <div className="mb-16 grid gap-8 md:grid-cols-2 md:gap-12">
                        <div className="space-y-4">
                            <div className="relative aspect-square overflow-hidden rounded-2xl bg-white">
                                {displayedImage ? (
                                    <ProductImage
                                        src={displayedImage}
                                        alt={product.name}
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-300">
                                        No image
                                    </div>
                                )}
                                {discount > 0 && (
                                    <Badge variant="danger" className="absolute left-4 top-4">
                                        -{discount}%
                                    </Badge>
                                )}
                            </div>
                            {product.images && product.images.length > 1 && (
                                <div className="grid grid-cols-4 gap-4">
                                    {product.images.map((image, index) => (
                                        <button
                                            key={`${image}-${index}`}
                                            onClick={() => setSelectedImageUrl(image)}
                                            className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-colors ${displayedImage === image
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

                        <div className="space-y-6">
                            {product.brand && (
                                <p className="text-sm uppercase tracking-wide text-neutral-500">
                                    {product.brand}
                                </p>
                            )}

                            <h1 className="text-3xl font-bold text-neutral-900 md:text-4xl">
                                {product.name}
                            </h1>

                            {(product.rating !== undefined && product.rating !== null) && (
                                <div className="flex items-center gap-2">
                                    <div className="flex">
                                        {[...Array(5)].map((_, index) => (
                                            <Star
                                                key={index}
                                                className={`w-5 h-5 ${index < Math.floor(product.rating!)
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

                            <p className="whitespace-pre-line leading-relaxed text-neutral-600">
                                {product.description}
                            </p>

                            {product.variants && product.variants.length > 0 && (
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-900">
                                            {variantLabel}
                                        </label>
                                        {profile === 'apparel' && selectedVariant && (
                                            <p className="mt-1 text-sm text-neutral-500">
                                                Color: {selectedVariant.colorName || selectedVariant.name} | Talla: {selectedVariant.size || selectedVariant.value}
                                            </p>
                                        )}
                                        {profile === 'shade' && selectedVariant && (
                                            <p className="mt-1 text-sm text-neutral-500">
                                                Tono elegido: {selectedVariant.name}
                                            </p>
                                        )}
                                    </div>

                                    {profile === 'apparel' && (
                                        <div className="space-y-4">
                                            <div className="flex flex-wrap gap-3">
                                                {apparelColorOptions.map((colorOption) => (
                                                    <button
                                                        key={colorOption.key}
                                                        type="button"
                                                        onClick={() => handleColorSelect(colorOption.key)}
                                                        className={`flex items-center gap-3 rounded-full border px-4 py-2 text-sm transition-all ${activeColorKey === colorOption.key
                                                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                                                            : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                                                            }`}
                                                    >
                                                        <span
                                                            className="h-5 w-5 rounded-full border border-black/10"
                                                            style={{ backgroundColor: colorOption.hex }}
                                                        />
                                                        <span>{colorOption.label}</span>
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex flex-wrap gap-3">
                                                {sizeOptions.map((variant) => {
                                                    const isSelected = selectedVariant?.id === variant.id;

                                                    return (
                                                        <button
                                                            key={variant.id}
                                                            type="button"
                                                            onClick={() => handleVariantSelect(variant)}
                                                            className={`rounded-xl border-2 px-5 py-2.5 font-medium transition-all ${isSelected
                                                                ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                                                                : 'border-neutral-200 text-neutral-700 hover:border-neutral-300'
                                                                } ${(!variant.inStock || variant.stock_quantity === 0) ? 'opacity-60 border-dashed' : ''}`}
                                                        >
                                                            {variant.size || variant.value}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {profile === 'shade' && (
                                        <div className="flex flex-wrap gap-3">
                                            {shadeVariants.map((variant) => {
                                                const isSelected = selectedVariant?.id === variant.id;

                                                return (
                                                    <button
                                                        key={variant.id}
                                                        type="button"
                                                        onClick={() => handleVariantSelect(variant)}
                                                        className={`flex items-center gap-3 rounded-full border px-4 py-2 text-sm transition-all ${isSelected
                                                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                                                            : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                                                            } ${(!variant.inStock || variant.stock_quantity === 0) ? 'opacity-60 border-dashed' : ''}`}
                                                    >
                                                        <span
                                                            className="h-5 w-5 rounded-full border border-black/10"
                                                            style={{ backgroundColor: variant.colorHex || '#d4a373' }}
                                                        />
                                                        <span>{variant.name}</span>
                                                        {(!variant.inStock || variant.stock_quantity === 0) && (
                                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                                                                Agotado
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {profile === 'simple' && (
                                        <div className="flex flex-wrap gap-3">
                                            {simpleVariants.map((variant) => {
                                                const isColor = variant.type === 'color' || variant.type === 'shade';
                                                const isSelected = selectedVariant?.id === variant.id;

                                                if (isColor) {
                                                    return (
                                                        <button
                                                            key={variant.id}
                                                            type="button"
                                                            onClick={() => handleVariantSelect(variant)}
                                                            className={`relative h-10 w-10 rounded-full border-2 transition-all ${isSelected
                                                                ? 'scale-110 border-primary-600 ring-2 ring-primary-100 ring-offset-2'
                                                                : 'border-neutral-200 hover:border-neutral-400'
                                                                } ${(!variant.inStock || variant.stock_quantity === 0) ? 'opacity-40 grayscale' : ''}`}
                                                        >
                                                            <span
                                                                className="absolute inset-1 rounded-full shadow-inner"
                                                                style={{ backgroundColor: variant.colorHex || variant.value }}
                                                            />
                                                        </button>
                                                    );
                                                }

                                                return (
                                                    <button
                                                        key={variant.id}
                                                        type="button"
                                                        onClick={() => handleVariantSelect(variant)}
                                                        className={`rounded-xl border-2 px-5 py-2.5 font-medium transition-all ${isSelected
                                                            ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                                                            : 'border-neutral-200 text-neutral-700 hover:border-neutral-300'
                                                            } ${(!variant.inStock || variant.stock_quantity === 0) ? 'opacity-60 border-dashed' : ''}`}
                                                    >
                                                        {variant.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                </div>
                            )}

                            <div>
                                <label className="mb-3 block text-sm font-medium text-neutral-900">
                                    Cantidad
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        disabled={!product.in_stock || (selectedVariant && selectedVariant.stock_quantity === 0)}
                                        className="rounded-lg border border-neutral-300 p-2 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-12 text-center font-medium">{quantity}</span>
                                    <button
                                        type="button"
                                        onClick={() => setQuantity(Math.min(maxAvailableQuantity, quantity + 1))}
                                        disabled={!product.in_stock || (selectedVariant && selectedVariant.stock_quantity === 0) || quantity >= maxAvailableQuantity}
                                        className="rounded-lg border border-neutral-300 p-2 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="primary"
                                    size="lg"
                                    className="flex-1"
                                    leftIcon={<ShoppingCart className="w-5 h-5" />}
                                    onClick={handleAddToCart}
                                    disabled={!product.in_stock || (selectedVariant && selectedVariant.stock_quantity === 0)}
                                >
                                    {(!product.in_stock || (selectedVariant && selectedVariant.stock_quantity === 0)) ? 'Agotado' : 'Agregar al carrito'}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    onClick={() => toggleItem(product.id)}
                                >
                                    <Heart className={`w-5 h-5 ${inWishlist ? 'fill-primary-600 text-primary-600' : ''}`} />
                                </Button>
                            </div>

                            <div className="space-y-3 border-t border-neutral-200 pt-6">
                                <div className="flex items-center gap-3 text-sm text-neutral-600">
                                    <Truck className="w-5 h-5 text-primary-600" />
                                    <span>Envío gratis en compras superiores a {formatPrice(STORE_CONFIG.FREE_SHIPPING_THRESHOLD)}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-neutral-600">
                                    <Shield className="w-5 h-5 text-primary-600" />
                                    <span>Compra 100% segura y protegida</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-16">
                        <div className="flex flex-col gap-12 md:flex-row">
                            <div className="md:w-1/3">
                                <ReviewForm
                                    productId={product.id}
                                    onSuccess={() => {
                                        fetch(`/api/reviews?product_id=${product.id}`)
                                            .then((response) => response.json())
                                            .then((data) => setReviews(data.data || []));
                                    }}
                                />
                            </div>
                            <div className="md:w-2/3">
                                <h2 className="mb-8 text-2xl font-bold text-neutral-900">Opiniones de clientes</h2>
                                <ReviewList reviews={reviews} />
                            </div>
                        </div>
                    </div>

                    {relatedProducts.length > 0 && (
                        <div>
                            <h2 className="mb-8 text-2xl font-bold text-neutral-900 md:text-3xl">
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
