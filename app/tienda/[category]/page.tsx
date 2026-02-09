'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductGrid from '@/components/product/ProductGrid';
import CategorySidebar from '@/components/product/CategorySidebar';
import categoriesData from '@/data/categories.json';
import type { Product, Category } from '@/types';

const categories = categoriesData as Category[];
console.log('Categories loaded:', categories.find(c => c.slug === 'maquillaje')?.subcategories?.length);

export default function CategoryPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const categorySlug = params.category as string;
    const subcategorySlug = searchParams.get('subcategory');

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const category = categories.find((c) => c.slug === categorySlug);

    useEffect(() => {
        const fetchProducts = async () => {
            if (!category) {
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`/api/products?category=${categorySlug}`);
                const data = await res.json();
                setProducts(data.data || []);
            } catch (error) {
                console.error('Error fetching products by category:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [categorySlug, category]);

    // Smart filter: match products to subcategories using keywords
    const filteredProducts = subcategorySlug
        ? products.filter((p) => {
            // Direct match - if product already has this exact subcategory
            if (p.subcategory === subcategorySlug) {
                return true;
            }

            // Find the selected subcategory definition
            const selectedSubcategory = category?.subcategories?.find(
                (sub) => sub.slug === subcategorySlug
            );

            if (!selectedSubcategory) return false;

            // Check if subcategory has keywords for intelligent matching
            const subcatWithKeywords = selectedSubcategory as any;
            if (subcatWithKeywords.keywords && Array.isArray(subcatWithKeywords.keywords)) {
                const keywords = subcatWithKeywords.keywords as string[];
                const productName = p.name.toLowerCase();

                // Match if product name contains any of the keywords
                return keywords.some(keyword => productName.includes(keyword.toLowerCase()));
            }

            return false;
        })
        : products;

    const isMakeupCategory = categorySlug === 'maquillaje';
    const hasSubcategories = category?.subcategories && category.subcategories.length > 0;

    if (loading) {
        return (
            <>
                <Header />
                <main className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary-600 mb-4" />
                    <p className="text-neutral-500 font-medium">Cargando categoría...</p>
                </main>
                <Footer />
            </>
        );
    }

    if (!category) {
        return (
            <>
                <Header />
                <main className="min-h-screen bg-neutral-50">
                    <div className="container-custom py-16 text-center">
                        <h1 className="text-2xl font-bold text-neutral-900 mb-4">
                            Categoría no encontrada
                        </h1>
                        <p className="text-neutral-600">
                            La categoría que buscas no existe
                        </p>
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
                {/* Category Header */}
                <div className="bg-white border-b border-neutral-200">
                    <div className="container-custom py-8">
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 mb-2">
                            {category.name}
                        </h1>
                        <p className="text-neutral-600 max-w-2xl">
                            {category.description}
                        </p>
                    </div>
                </div>

                <div className="container-custom py-8">
                    {isMakeupCategory && hasSubcategories ? (
                        <div className="grid lg:grid-cols-4 gap-8">
                            {/* Sidebar */}
                            <div className="lg:col-span-1">
                                <CategorySidebar
                                    subcategories={category.subcategories!}
                                    categorySlug={categorySlug}
                                />
                            </div>

                            {/* Products */}
                            <div className="lg:col-span-3">
                                <div className="mb-6">
                                    <p className="text-sm text-neutral-600">
                                        {filteredProducts.length} productos encontrados
                                        {subcategorySlug && (
                                            <span className="ml-2 text-primary-600 font-medium">
                                                en {category.subcategories?.find(s => s.slug === subcategorySlug)?.name}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <ProductGrid products={filteredProducts} />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6">
                                <p className="text-sm text-neutral-600">
                                    {filteredProducts.length} productos encontrados
                                </p>
                            </div>
                            <ProductGrid products={filteredProducts} />
                        </>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}
