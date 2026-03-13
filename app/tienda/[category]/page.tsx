'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, SlidersHorizontal, X, ChevronDown, ArrowRight, Search as SearchIcon } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductGrid from '@/components/product/ProductGrid';
import ScrollReveal from '@/components/ui/ScrollReveal';
import categoriesData from '@/data/categories.json';
import type { Product, Category } from '@/types';
import { usePageContent } from '@/lib/hooks/usePageContent';

const categories = categoriesData as Category[];

// Premium color palette per category
const CATEGORY_THEMES: Record<string, { from: string; to: string; badge: string; dot: string }> = {
    maquillaje: {
        from: 'from-[#2d1b1f]',
        to: 'to-[#6b2c3e]',
        badge: 'bg-rose-900/40 text-rose-200 border-rose-700/40',
        dot: 'bg-rose-400',
    },
    accesorios: {
        from: 'from-[#1a1a2e]',
        to: 'to-[#4a3728]',
        badge: 'bg-amber-900/40 text-amber-200 border-amber-700/40',
        dot: 'bg-amber-400',
    },
    ropa: {
        from: 'from-[#1c1c2e]',
        to: 'to-[#3d2c5e]',
        badge: 'bg-violet-900/40 text-violet-200 border-violet-700/40',
        dot: 'bg-violet-400',
    },
};

function CategoryContent() {
    const params = useParams();
    const searchParams = useSearchParams();


    const categorySlug = params.category as string;
    const subcategoryParam = searchParams.get('subcategory') || '';

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('featured');
    const [showFilters, setShowFilters] = useState(false);
    const [priceMax, setPriceMax] = useState(500000);
    const [activeMax, setActiveMax] = useState(500000);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSubcat, setActiveSubcat] = useState(subcategoryParam);

    const { getImage, get } = usePageContent('categorias');
    const category = categories.find((c) => c.slug === categorySlug);
    const theme = CATEGORY_THEMES[categorySlug] ?? CATEGORY_THEMES['maquillaje'];

    const bannerTitle = get(`cat_${categorySlug}`, 'title', category?.name || '');
    const bannerDesc = get(`cat_${categorySlug}`, 'description', category?.description || '');
    const bannerImage = getImage(`cat_${categorySlug}`, 'image_url', category?.image || '');

    useEffect(() => {
        if (!category) { setLoading(false); return; }
        fetch(`/api/products?category=${categorySlug}`)
            .then((r) => r.json())
            .then((d) => {
                const all: Product[] = d.data || [];
                setProducts(all);
                const prices = all.map((p) => p.price).filter(Boolean);
                if (prices.length) {
                    const max = Math.ceil(Math.max(...prices) / 10000) * 10000;
                    setPriceMax(max);
                    setActiveMax(max);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [categorySlug, category]);

    // Filter pipeline
    const filtered = products
        .filter((p) => {
            if (!activeSubcat) return true;
            if (p.subcategory === activeSubcat) return true;
            const sub = category?.subcategories?.find((s) => s.slug === activeSubcat) as
                | { slug: string; name: string; keywords?: string[] }
                | undefined;
            if (sub?.keywords) {
                const name = p.name.toLowerCase();
                return sub.keywords.some((k) => name.includes(k.toLowerCase()));
            }
            return false;
        })
        .filter((p) => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .filter((p) => p.price <= activeMax);

    const sorted = [...filtered].sort((a, b) => {
        switch (sortBy) {
            case 'price-asc': return a.price - b.price;
            case 'price-desc': return b.price - a.price;
            case 'newest': return (b.is_new ? 1 : 0) - (a.is_new ? 1 : 0);
            default: return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
        }
    });

    const fmt = (v: number) => '$' + v.toLocaleString('es-CO', { maximumFractionDigits: 0 });

    if (loading) return (
        <>
            <Header />
            <main className="min-h-screen flex flex-col items-center justify-center bg-white">
                <Loader2 className="w-12 h-12 animate-spin text-primary-500 mb-4" />
                <p className="text-neutral-400 text-sm">Cargando catálogo...</p>
            </main>
            <Footer />
        </>
    );

    if (!category) return (
        <>
            <Header />
            <main className="min-h-screen bg-white container-custom py-24 text-center">
                <h1 className="text-2xl font-display font-bold text-neutral-900 mb-3">Categoría no encontrada</h1>
                <Link href="/tienda" className="text-primary-500 hover:underline">Volver a la tienda</Link>
            </main>
            <Footer />
        </>
    );

    return (
        <>
            <Header />
            <main className="min-h-screen bg-white">

                {/* ─── Cinematic Hero Banner ─── */}
                <div className={`relative overflow-hidden bg-gradient-to-br ${theme.from} ${theme.to}`} style={{ minHeight: 340 }}>
                    {/* Background image */}
                    {bannerImage && (
                        <Image
                            src={bannerImage}
                            alt={category.name}
                            fill
                            className="object-cover object-center opacity-30 scale-105"
                            priority
                            unoptimized={bannerImage.startsWith('https://')}
                        />
                    )}

                    {/* Decorative grain */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'1\'/%3E%3C/svg%3E")' }} />

                    {/* Bottom fade */}
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />

                    {/* Content */}
                    <div className="relative container-custom flex flex-col items-center justify-center text-center text-white py-16 md:py-24 z-10">
                        <ScrollReveal>
                            <h1 className="text-5xl md:text-7xl font-display font-bold mb-4 leading-none tracking-tight drop-shadow-xl">
                                {bannerTitle}
                            </h1>
                            <p className="text-white/70 text-base md:text-lg max-w-lg mx-auto leading-relaxed">
                                {bannerDesc}
                            </p>

                            {/* Breadcrumb */}
                            <div className="flex items-center gap-2 mt-6 text-xs text-white/50">
                                <Link href="/" className="hover:text-white/80 transition-colors">Inicio</Link>
                                <span>/</span>
                                <Link href="/tienda" className="hover:text-white/80 transition-colors">Tienda</Link>
                                <span>/</span>
                                <span className="text-white/80">{category.name}</span>
                            </div>
                        </ScrollReveal>
                    </div>
                </div>


                {/* ─── Subcategory Pills (if any) ─── */}
                {category.subcategories && category.subcategories.length > 0 && (
                    <div className="border-b border-neutral-100 bg-white sticky top-[72px] z-20 shadow-sm">
                        <div className="container-custom py-3 flex items-center gap-2 overflow-x-auto">
                            <button
                                onClick={() => setActiveSubcat('')}
                                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${activeSubcat === '' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
                            >
                                Todos
                            </button>
                            {category.subcategories.map((sub) => (
                                <button
                                    key={sub.slug}
                                    onClick={() => setActiveSubcat(sub.slug)}
                                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap ${activeSubcat === sub.slug ? 'bg-primary-500 text-white shadow-coral' : 'text-neutral-600 hover:bg-neutral-100'}`}
                                >
                                    {sub.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="container-custom py-8 md:py-12">
                    {/* ─── Toolbar ─── */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Search in category */}
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                                <input
                                    type="search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={`Buscar en ${category.name}...`}
                                    className="pl-8 pr-4 py-2 text-sm border border-neutral-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 w-52"
                                />
                            </div>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 ${showFilters ? 'bg-primary-500 text-white border-primary-500' : 'border-neutral-300 text-neutral-700 hover:border-primary-400 hover:text-primary-600'}`}
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                Filtros
                                {showFilters ? <X className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            <span className="text-sm text-neutral-500">
                                <span className="font-bold text-neutral-800">{sorted.length}</span> productos
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <label htmlFor="cat-sort" className="text-xs text-neutral-500 font-medium">Ordenar:</label>
                            <select
                                id="cat-sort"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-3 py-2 border border-neutral-300 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer bg-white"
                            >
                                <option value="featured">Destacados</option>
                                <option value="newest">Más Recientes</option>
                                <option value="price-asc">Precio ↑</option>
                                <option value="price-desc">Precio ↓</option>
                            </select>
                        </div>
                    </div>

                    {/* ─── Price Filter Panel ─── */}
                    {showFilters && (
                        <div className="mb-8 p-5 bg-neutral-50 rounded-2xl border border-neutral-200 animate-slide-down">
                            <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-widest mb-4">Rango de Precio</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm font-semibold text-neutral-700">
                                    <span>{fmt(0)}</span>
                                    <span className="px-3 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs">{fmt(activeMax)}</span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={priceMax}
                                    step={5000}
                                    value={activeMax}
                                    onChange={(e) => setActiveMax(Number(e.target.value))}
                                    className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-500"
                                />
                                <div className="flex justify-between text-xs text-neutral-400">
                                    <span>{fmt(0)}</span>
                                    <span>{fmt(priceMax)}</span>
                                </div>
                                <button
                                    onClick={() => setActiveMax(priceMax)}
                                    className="text-xs text-primary-500 hover:text-primary-700 font-semibold"
                                >
                                    Restablecer
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ─── Products ─── */}
                    {sorted.length === 0 ? (
                        <ScrollReveal>
                            <div className="flex flex-col items-center justify-center py-28 text-center">
                                <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                                    <SearchIcon className="w-8 h-8 text-neutral-300" />
                                </div>
                                <h3 className="text-xl font-display font-bold text-neutral-800 mb-2">Sin resultados</h3>
                                <p className="text-neutral-500 text-sm mb-6">Intenta ajustar los filtros o el término de búsqueda</p>
                                <button
                                    onClick={() => { setActiveMax(priceMax); setSearchQuery(''); setActiveSubcat(''); }}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white rounded-full text-sm font-semibold hover:bg-primary-600 transition-colors"
                                >
                                    Limpiar filtros <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </ScrollReveal>
                    ) : (
                        <ProductGrid products={sorted} />
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}

export default function CategoryPage() {
    return (
        <Suspense fallback={
            <>
                <Header />
                <main className="min-h-screen flex items-center justify-center bg-white">
                    <Loader2 className="w-12 h-12 animate-spin text-primary-500" />
                </main>
                <Footer />
            </>
        }>
            <CategoryContent />
        </Suspense>
    );
}
