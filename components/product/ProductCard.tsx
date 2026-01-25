'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingCart, Heart } from 'lucide-react';
import type { Product } from '@/types';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import ProductImage from '@/components/product/ProductImage';

interface ProductCardProps {
    product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
    const addItem = useCartStore((state) => state.addItem);
    const { isInWishlist, toggleItem } = useWishlistStore();
    const inWishlist = isInWishlist(product.id);

    const discount = product.compare_at_price
        ? calculateDiscount(product.price, product.compare_at_price)
        : 0;

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        addItem(product, 1);
    };

    const handleToggleWishlist = (e: React.MouseEvent) => {
        e.preventDefault();
        toggleItem(product.id);
    };

    return (
        <Link href={`/producto/${product.slug}`}>
            <Card hover className="group h-full">
                <div className="relative aspect-square overflow-hidden">
                    <ProductImage
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />

                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                        {product.is_new && (
                            <Badge variant="primary" size="sm">
                                Nuevo
                            </Badge>
                        )}
                        {discount > 0 && (
                            <Badge variant="danger" size="sm">
                                -{discount}%
                            </Badge>
                        )}
                        {!product.in_stock && (
                            <Badge variant="default" size="sm">
                                Agotado
                            </Badge>
                        )}
                    </div>

                    {/* Wishlist Button */}
                    <button
                        onClick={handleToggleWishlist}
                        className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={inWishlist ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                    >
                        <Heart
                            className={`w-5 h-5 ${inWishlist ? 'fill-primary-600 text-primary-600' : 'text-neutral-600'
                                }`}
                        />
                    </button>

                    {/* Quick Add Button */}
                    {product.in_stock && (
                        <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                onClick={handleAddToCart}
                                variant="primary"
                                size="sm"
                                className="w-full"
                                leftIcon={<ShoppingCart className="w-4 h-4" />}
                            >
                                Agregar al Carrito
                            </Button>
                        </div>
                    )}
                </div>

                <div className="p-4">
                    {/* Brand */}
                    {product.brand && (
                        <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
                            {product.brand}
                        </p>
                    )}

                    {/* Product Name */}
                    <h3 className="font-semibold text-neutral-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                        {product.name}
                    </h3>

                    {/* Rating */}
                    {product.rating && (
                        <div className="flex items-center gap-1 mb-2">
                            <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                    <span
                                        key={i}
                                        className={`text-sm ${i < Math.floor(product.rating!)
                                            ? 'text-yellow-400'
                                            : 'text-neutral-300'
                                            }`}
                                    >
                                        ★
                                    </span>
                                ))}
                            </div>
                            <span className="text-xs text-neutral-500">
                                ({product.review_count})
                            </span>
                        </div>
                    )}

                    {/* Price */}
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-neutral-900">
                            {formatPrice(product.price)}
                        </span>
                        {product.compare_at_price && (
                            <span className="text-sm text-neutral-500 line-through">
                                {formatPrice(product.compare_at_price)}
                            </span>
                        )}
                    </div>

                    {/* Stock Status */}
                    {product.in_stock && product.stock_quantity < 10 && (
                        <p className="text-xs text-orange-600 mt-2">
                            ¡Solo quedan {product.stock_quantity}!
                        </p>
                    )}
                </div>
            </Card>
        </Link>
    );
};

export default ProductCard;
