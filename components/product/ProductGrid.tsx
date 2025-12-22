'use client';

import React from 'react';
import type { Product } from '@/types';
import ProductCard from './ProductCard';
import Skeleton from '@/components/ui/Skeleton';

interface ProductGridProps {
    products: Product[];
    isLoading?: boolean;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, isLoading = false }) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="space-y-3">
                        <Skeleton className="aspect-square w-full" />
                        <Skeleton variant="text" className="h-4 w-3/4" />
                        <Skeleton variant="text" className="h-4 w-1/2" />
                    </div>
                ))}
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-neutral-500 text-lg">No se encontraron productos</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
                <ProductCard key={product.id} product={product} />
            ))}
        </div>
    );
};

export default ProductGrid;
