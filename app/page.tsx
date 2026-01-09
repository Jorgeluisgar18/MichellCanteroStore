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
                <section className="relative min-h-[80vh] flex items-center bg-gradient-soft overflow-hidden">
                    <div className="container-custom py-12 md:py-20 lg:py-24">
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div className="space-y-8 animate-slide-up z-10">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 text-primary-600 text-xs font-bold tracking-widest uppercase">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                                    </span>
                                    Nueva Colección
                                </div>
                                <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-medium text-neutral-900 leading-[1.1]">
                                    Eleva tu <br />
                                    <span className="font-script text-primary-500 italic lowercase block -mt-2">belleza única</span>
                                </h1>
                                <p className="text-lg md:text-xl text-neutral-600 max-w-lg leading-relaxed">
                                    En <span className="font-semibold text-primary-400">Michell Cantero Store</span> fusionamos la sofisticación con el estilo para que te sientas empoderada y radiante en cada ocasión.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                    <Link href="/tienda">
                                        <Button
                                            variant="primary"
                                            size="lg"
                                            className="px-10 rounded-full shadow-lg shadow-primary-200"
                                            rightIcon={<ArrowRight className="w-5 h-5" />}
                                        >
                                            Comprar Ahora
                                        </Button>
                                    </Link>
                                    <Link href="/nosotros">
                                        <Button variant="outline" size="lg" className="px-10 rounded-full border-neutral-200">
                                            Nuestra Historia
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                            <div className="relative h-[500px] md:h-[650px] lg:h-[750px] animate-fade-in group">
                                <div className="absolute -inset-4 bg-gradient-to-tr from-primary-200/50 to-secondary-200/50 rounded-3xl blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
                                <div className="relative h-full w-full overflow-hidden rounded-3xl border-8 border-white shadow-strong">
                                    <Image
                                        src="https://scontent.cdninstagram.com/v/t39.30808-6/470116934_18118764886414234_8392932795780468143_n.jpg?stp=dst-jpg_e35_tt6&_nc_cat=107&ig_cache_key=MzE5MDI5NTU3NjM3MzExNTY0OQ%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjE0NDB4MTQ0MC5zZHIuQzMifQ%3D%3D&_nc_ohc=EEm8C2eXm3IQ7kNvwEI9kzU&_nc_oc=AdnMC6fh5qFBLRK_qB_dHiTxhC-e4hdhbdNsuENWKM-jJKSHDNIRU1CPDkSQ88W4TbA&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=4c_pffenDcMUTR1_h0Q-BQ&oh=00_AfpBITSVKLHDNQN1ybYkAJ5uy9hz6KtGeVaH-uIfsFGbzA&oe=69675E67"
                                        alt="Michell Cantero - Fundadora"
                                        fill
                                        className="object-cover object-center group-hover:scale-105 transition-transform duration-1000"
                                        priority
                                    />
                                </div>
                                {/* Floating elements */}
                                <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-strong animate-slide-up delay-300 hidden md:block">
                                    <p className="text-3xl font-display font-bold text-primary-500 italic">100%</p>
                                    <p className="text-xs text-neutral-500 uppercase tracking-tighter">Calidad Garantizada</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary-50/50 to-transparent -z-10" />
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-100 rounded-full filter blur-3xl opacity-30 animate-pulse" />
                    <div className="absolute top-1/2 left-0 w-64 h-64 bg-secondary-100 rounded-full filter blur-3xl opacity-30 animate-pulse delay-1000" />
                </section>

                {/* Trust Badges */}
                <section className="border-y border-neutral-100 bg-white">
                    <div className="container-custom py-10">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-4">
                                <div className="p-4 bg-primary-50 rounded-2xl shadow-sm">
                                    <Truck className="w-6 h-6 text-primary-500" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-display font-bold text-neutral-900">Envío Gratis</p>
                                    <p className="text-xs text-neutral-500">En compras mayores a $200k</p>
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-4">
                                <div className="p-4 bg-secondary-50 rounded-2xl shadow-sm">
                                    <Shield className="w-6 h-6 text-secondary-500" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-display font-bold text-neutral-900">Pago Seguro</p>
                                    <p className="text-xs text-neutral-500">Pasarela 100% confiable</p>
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-4">
                                <div className="p-4 bg-primary-50 rounded-2xl shadow-sm">
                                    <RefreshCw className="w-6 h-6 text-primary-500" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-display font-bold text-neutral-900">Cambios</p>
                                    <p className="text-xs text-neutral-500">Hasta 30 días de garantía</p>
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-4">
                                <div className="p-4 bg-secondary-50 rounded-2xl shadow-sm">
                                    <Instagram className="w-6 h-6 text-secondary-500" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-display font-bold text-neutral-900">Soporte 1:1</p>
                                    <p className="text-xs text-neutral-500">Asesoría personalizada</p>
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
                            href="https://www.instagram.com/michellcantero.store/"
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
                                @michellcantero.store
                            </Button>
                        </a>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}
