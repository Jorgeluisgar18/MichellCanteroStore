'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductGrid from '@/components/product/ProductGrid';
import Button from '@/components/ui/Button';
import { SlidersHorizontal, Loader2, Search as SearchIcon } from 'lucide-react';
import type { Product } from '@/types';

function TiendaContent() {
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get('search') || '';
    const [sortBy, setSortBy] = useState<string>('featured');
    const [showFilters, setShowFilters] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await fetch('/api/products');
                const data = await res.json();
                setProducts(data.data || []);
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    // Filter products by search query
    const filteredProducts = products.filter(product => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            product.name.toLowerCase().includes(query) ||
            product.description?.toLowerCase().includes(query) ||
            product.category?.toLowerCase().includes(query) ||
            product.brand?.toLowerCase().includes(query)
        );
    });

    const sortedProducts = [...filteredProducts].sort((a, b) => {
        switch (sortBy) {
            case 'price-asc':
                return a.price - b.price;
            case 'price-desc':
                return b.price - a.price;
            case 'newest':
                return (b.is_new ? 1 : 0) - (a.is_new ? 1 : 0);
            default:
                return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
        }
    });

    return (
        <div className="container-custom py-8">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 mb-2">
                    {searchQuery ? `Resultados para "${searchQuery}"` : 'Todos los Productos'}
                </h1>
                <p className="text-neutral-600">
                    {searchQuery
                        ? `Encontramos ${sortedProducts.length} producto${sortedProducts.length !== 1 ? 's' : ''} que coinciden con tu búsqueda`
                        : 'Descubre nuestra colección completa de maquillaje, accesorios y ropa'
                    }
                </p>
            </div>

            {/* Filters and Sort */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<SlidersHorizontal className="w-4 h-4" />}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        Filtros
                    </Button>
                    <p className="text-sm text-neutral-600">
                        {sortedProducts.length} productos
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <label htmlFor="sort" className="text-sm text-neutral-700">
                        Ordenar por:
                    </label>
                    <select
                        id="sort"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="featured">Destacados</option>
                        <option value="newest">Más Recientes</option>
                        <option value="price-asc">Precio: Menor a Mayor</option>
                        <option value="price-desc">Precio: Mayor a Menor</option>
                    </select>
                </div>
            </div>

            {/* Products Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-12 h-12 animate-spin text-primary-600 mb-4" />
                    <p className="text-neutral-500">Cargando catálogo...</p>
                </div>
            ) : sortedProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <SearchIcon className="w-16 h-16 text-neutral-300 mb-4" />
                    <h3 className="text-xl font-bold text-neutral-900 mb-2">No encontramos resultados</h3>
                    <p className="text-neutral-600 mb-6">Intenta con otros términos de búsqueda</p>
                </div>
            ) : (
                <ProductGrid products={sortedProducts} />
            )}
        </div>
    );
}

export default function TiendaPage() {
    return (
        <>
            <Header />
            <main className="min-h-screen bg-neutral-50">
                <Suspense fallback={
                    <div className="container-custom py-20 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 animate-spin text-primary-600 mb-4" />
                        <p className="text-neutral-500">Cargando tienda...</p>
                    </div>
                }>
                    <TiendaContent />
                </Suspense>
            </main>
            <Footer />
        </>
    );
}
