'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductGrid from '@/components/product/ProductGrid';
import Button from '@/components/ui/Button';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { SlidersHorizontal, X, ChevronDown, Loader2, Search as SearchIcon, ArrowRight } from 'lucide-react';
import type { Product } from '@/types';
import { usePageContent } from '@/lib/hooks/usePageContent';

function TiendaContent() {
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get('search') || '';
    const filterParam = searchParams.get('filter') || '';
    const categoryParam = searchParams.get('category') || '';

    const [sortBy, setSortBy] = useState<string>('featured');
    const [showFilters, setShowFilters] = useState(false);
    const [priceMin] = useState<number>(0);
    const [priceMax, setPriceMax] = useState<number>(500000);
    const [activeMax, setActiveMax] = useState<number>(500000);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { get, getImage } = usePageContent('tienda');

    const bannerTitle = get('banner', 'title', 'Nuestra Tienda');
    const bannerDesc = get('banner', 'description', 'Descubre todos nuestros productos exclusivos');
    const bannerImage = getImage('banner', 'image_url', '');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await fetch('/api/products');
                const data = await res.json();
                const all: Product[] = data.data || [];
                setProducts(all);
                const prices = all.map((p) => p.price).filter(Boolean);
                if (prices.length) {
                    const max = Math.ceil(Math.max(...prices) / 10000) * 10000;
                    setPriceMax(max);
                    setActiveMax(max);
                }
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    // Filter + search + sort
    const filtered = products
        .filter((p) => {
            if (filterParam === 'new') return p.is_new;
            if (categoryParam) return p.category?.toLowerCase() === categoryParam.toLowerCase();
            return true;
        })
        .filter((p) => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (
                p.name.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q) ||
                p.category?.toLowerCase().includes(q) ||
                p.brand?.toLowerCase().includes(q)
            );
        })
        .filter((p) => p.price >= priceMin && p.price <= activeMax);

    const sorted = [...filtered].sort((a, b) => {
        switch (sortBy) {
            case 'price-asc': return a.price - b.price;
            case 'price-desc': return b.price - a.price;
            case 'newest': return (b.is_new ? 1 : 0) - (a.is_new ? 1 : 0);
            default: return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
        }
    });

    const formatPrice = (v: number) =>
        '$' + v.toLocaleString('es-CO', { maximumFractionDigits: 0 });

    return (
        <>
            {/* Banner */}
            <div
                className="relative bg-neutral-900 overflow-hidden"
                style={{
                    minHeight: 220,
                    ...(bannerImage ? { backgroundImage: `url(${bannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
                }}
            >
                <div className={`absolute inset-0 ${bannerImage ? 'bg-black/50' : 'bg-gradient-to-br from-primary-600 via-primary-500 to-secondary-500'}`} />
                <div className="relative container-custom py-16 text-center text-white z-10">
                    <ScrollReveal>
                        <p className="text-xs font-bold tracking-[0.3em] text-primary-200 uppercase mb-3">Catálogo</p>
                        <h1 className="text-3xl md:text-5xl font-display font-bold mb-3">
                            {searchQuery ? `Resultados para "${searchQuery}"` : bannerTitle}
                        </h1>
                        <p className="text-white/75 text-base max-w-lg mx-auto">{bannerDesc}</p>
                    </ScrollReveal>
                </div>
            </div>

            <div className="container-custom py-8">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${showFilters ? 'bg-primary-500 text-white border-primary-500' : 'border-neutral-300 text-neutral-700 hover:border-primary-400 hover:text-primary-600'}`}
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            Filtros
                            {showFilters ? <X className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        <span className="text-sm text-neutral-500">
                            <span className="font-semibold text-neutral-800">{sorted.length}</span> productos
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <label htmlFor="sort" className="text-sm text-neutral-600 font-medium">Ordenar:</label>
                        <select
                            id="sort"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-3 py-2 border border-neutral-300 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer bg-white text-neutral-800"
                        >
                            <option value="featured">Destacados</option>
                            <option value="newest">Más Recientes</option>
                            <option value="price-asc">Precio: Menor a Mayor</option>
                            <option value="price-desc">Precio: Mayor a Menor</option>
                        </select>
                    </div>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="mb-8 p-6 bg-neutral-50 rounded-2xl border border-neutral-200 animate-slide-down">
                        <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-widest mb-5">Filtrar por Precio</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm font-semibold text-neutral-700">
                                <span>{formatPrice(priceMin)}</span>
                                <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs">{formatPrice(activeMax)}</span>
                            </div>
                            <input
                                type="range"
                                min={priceMin}
                                max={priceMax}
                                step={5000}
                                value={activeMax}
                                onChange={(e) => setActiveMax(Number(e.target.value))}
                                className="w-full h-2 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-500"
                            />
                            <div className="flex justify-between text-xs text-neutral-400">
                                <span>{formatPrice(priceMin)}</span>
                                <span>{formatPrice(priceMax)}</span>
                            </div>
                            <button
                                onClick={() => setActiveMax(priceMax)}
                                className="text-xs text-primary-500 hover:text-primary-700 font-semibold underline"
                            >
                                Restablecer
                            </button>
                        </div>
                    </div>
                )}

                {/* Products Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <Loader2 className="w-12 h-12 animate-spin text-primary-500 mb-4" />
                        <p className="text-neutral-400 text-sm">Cargando catálogo...</p>
                    </div>
                ) : sorted.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <SearchIcon className="w-16 h-16 text-neutral-200 mb-4" />
                        <h3 className="text-xl font-display font-bold text-neutral-800 mb-2">Sin resultados</h3>
                        <p className="text-neutral-500 mb-6">Intenta ajustar los filtros o el término de búsqueda</p>
                        <Button variant="primary" onClick={() => { setActiveMax(priceMax); }} className="rounded-full">
                            Limpiar filtros <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                ) : (
                    <ProductGrid products={sorted} />
                )}
            </div>
        </>
    );
}

export default function TiendaPage() {
    return (
        <>
            <Header />
            <main className="min-h-screen bg-white">
                <Suspense fallback={
                    <div className="container-custom py-24 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 animate-spin text-primary-500 mb-4" />
                        <p className="text-neutral-400 text-sm">Cargando tienda...</p>
                    </div>
                }>
                    <TiendaContent />
                </Suspense>
            </main>
            <Footer />
        </>
    );
}
