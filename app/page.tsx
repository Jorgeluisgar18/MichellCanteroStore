'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Truck, Shield, RefreshCw, Instagram, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import ProductGrid from '@/components/product/ProductGrid';
import { Card } from '@/components/ui/Card';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import categoriesData from '@/data/categories.json';
import type { Product, Category } from '@/types';

const categories = categoriesData as Category[];

export default function HomePage() {
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

    const featuredProducts = products.filter((p) => p.featured).slice(0, 4);
    const newProducts = products.filter((p) => p.is_new).slice(0, 4);

    return (
        <>
            <Header />
            <main>
                {/* Hero Section */}
                <section className="relative bg-gradient-soft overflow-hidden">
                    <div className="container-custom py-16 md:py-24">
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div className="space-y-6 animate-slide-up">
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-neutral-900 leading-tight">
                                    Descubre tu
                                    <span className="text-gradient block">Belleza Natural</span>
                                </h1>
                                <p className="text-lg text-neutral-600 max-w-lg">
                                    Maquillaje, accesorios y ropa femenina de alta calidad.
                                    Encuentra todo lo que necesitas para lucir radiante cada día.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Link href="/tienda">
                                        <Button
                                            variant="primary"
                                            size="lg"
                                            rightIcon={<ArrowRight className="w-5 h-5" />}
                                        >
                                            Explorar Tienda
                                        </Button>
                                    </Link>
                                    <Link href="/nosotros">
                                        <Button variant="outline" size="lg">
                                            Conocer Más
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                            <div className="relative h-[400px] md:h-[500px] animate-fade-in">
                                <Image
                                    src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800"
                                    alt="Hero Image"
                                    fill
                                    className="object-cover rounded-2xl shadow-strong"
                                    priority
                                />
                            </div>
                        </div>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute top-20 right-10 w-72 h-72 bg-primary-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse" />
                    <div className="absolute bottom-20 left-10 w-72 h-72 bg-secondary-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse" />
                </section>

                {/* Trust Badges */}
                <section className="border-y border-neutral-200 bg-white">
                    <div className="container-custom py-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary-50 rounded-lg">
                                    <Truck className="w-6 h-6 text-primary-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-neutral-900 text-sm">Envío Gratis</p>
                                    <p className="text-xs text-neutral-600">Compras +$150.000</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary-50 rounded-lg">
                                    <Shield className="w-6 h-6 text-primary-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-neutral-900 text-sm">Pago Seguro</p>
                                    <p className="text-xs text-neutral-600">100% Protegido</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary-50 rounded-lg">
                                    <RefreshCw className="w-6 h-6 text-primary-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-neutral-900 text-sm">Devoluciones</p>
                                    <p className="text-xs text-neutral-600">30 días</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary-50 rounded-lg">
                                    <Instagram className="w-6 h-6 text-primary-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-neutral-900 text-sm">Síguenos</p>
                                    <p className="text-xs text-neutral-600">@michellcantero</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Categories */}
                <section className="py-16 md:py-20 bg-white">
                    <div className="container-custom">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 mb-4">
                                Explora por Categoría
                            </h2>
                            <p className="text-neutral-600 max-w-2xl mx-auto">
                                Encuentra exactamente lo que buscas en nuestras categorías cuidadosamente seleccionadas
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {categories.map((category) => (
                                <Link key={category.id} href={`/tienda/${category.slug}`}>
                                    <Card hover className="group overflow-hidden">
                                        <div className="relative h-64">
                                            <Image
                                                src={category.image}
                                                alt={category.name}
                                                fill
                                                className="object-cover transition-transform duration-300 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                                                <h3 className="text-2xl font-display font-bold mb-2">
                                                    {category.name}
                                                </h3>
                                                <p className="text-sm text-white/90 mb-3">
                                                    {category.productCount} productos
                                                </p>
                                                <span className="inline-flex items-center text-sm font-medium group-hover:gap-2 transition-all">
                                                    Ver más <ArrowRight className="w-4 h-4 ml-1" />
                                                </span>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Featured Products */}
                <section className="py-16 md:py-20 bg-neutral-50">
                    <div className="container-custom">
                        <div className="flex items-center justify-between mb-12">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 mb-2">
                                    Productos Destacados
                                </h2>
                                <p className="text-neutral-600">
                                    Los favoritos de nuestras clientas
                                </p>
                            </div>
                            <Link href="/tienda">
                                <Button variant="outline">
                                    Ver Todos
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
                            </div>
                        ) : (
                            <ProductGrid products={featuredProducts} />
                        )}
                    </div>
                </section>

                {/* New Arrivals */}
                <section className="py-16 md:py-20 bg-white">
                    <div className="container-custom">
                        <div className="flex items-center justify-between mb-12">
                            <div>
                                <h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 mb-2">
                                    Recién Llegados
                                </h2>
                                <p className="text-neutral-600">
                                    Las últimas novedades en maquillaje y moda
                                </p>
                            </div>
                            <Link href="/tienda?filter=new">
                                <Button variant="outline">
                                    Ver Todos
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
                            </div>
                        ) : (
                            <ProductGrid products={newProducts} />
                        )}
                    </div>
                </section>

                {/* Instagram Feed CTA */}
                <section className="py-16 md:py-20 bg-gradient-primary text-white">
                    <div className="container-custom text-center">
                        <Instagram className="w-16 h-16 mx-auto mb-6" />
                        <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                            Síguenos en Instagram
                        </h2>
                        <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
                            Inspírate con nuestras clientas y descubre tips de belleza,
                            tutoriales y ofertas exclusivas
                        </p>
                        <a
                            href="https://instagram.com/michellcantero"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block"
                        >
                            <Button
                                variant="secondary"
                                size="lg"
                                className="bg-white text-primary-600 hover:bg-neutral-100"
                                rightIcon={<ArrowRight className="w-5 h-5" />}
                            >
                                @michellcantero
                            </Button>
                        </a>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}
