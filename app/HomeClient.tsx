'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Truck, Shield, ShoppingBag, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import ProductGrid from '@/components/product/ProductGrid';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HeroCarousel from '@/components/ui/HeroCarousel';
import BrandsMarquee, { Brand, DEFAULT_BRANDS } from '@/components/ui/BrandsMarquee';
import ScrollReveal from '@/components/ui/ScrollReveal';
import categoriesData from '@/data/categories.json';
import type { Product, Category, PageContent } from '@/types';
import { usePageContent } from '@/lib/hooks/usePageContent';

const categories = categoriesData as Category[];

interface HomeClientProps {
    initialHomeContent: PageContent[];
    initialCategoriesContent: PageContent[];
    initialProducts: Product[];
    initialCounts: Record<string, number>;
}

export default function HomeClient({ initialHomeContent, initialCategoriesContent, initialProducts, initialCounts }: HomeClientProps) {
    const [products] = useState<Product[]>(initialProducts);
    const [categoryCounts] = useState<Record<string, number>>(initialCounts);
    const { items, loading: contentLoading, get, getImage } = usePageContent('home', initialHomeContent);
    const { getImage: getCategoryImg } = usePageContent('categorias', initialCategoriesContent);

    const featuredProducts = products.filter((p) => p.featured).slice(0, 4);
    const newProducts = products.filter((p) => p.is_new).slice(0, 4);
 
    // Extract dynamic brands from CMS
    const brandItems = items.filter((i) => i.section.startsWith('brand_'));
    const cmsBrands: Brand[] = Array.from(new Set(brandItems.map((i) => i.section)))
        .map((section) => {
            const logo = brandItems.find((i) => i.section === section && i.key === 'logo_url')?.value || '';
            const name = brandItems.find((i) => i.section === section && i.key === 'name')?.value || section.replace('brand_', 'Marca ');
            return { name, logo };
        })
        .filter((b) => b.logo);

    // CMS values - consolidated
    // Categories section (moved assignments below for clarity)

    // Hero slides from CMS (with fallbacks)
    const heroSlides = [
        {
            image: getImage('hero_slide_1', 'image_url', '/hero-michell.jpg'),
            title: get('hero_slide_1', 'title', 'Eleva tu\nbelleza única'),
            subtitle: get('hero_slide_1', 'subtitle', 'En Michell Cantero Store fusionamos la sofisticación con el estilo para que te sientas empoderada y radiante.'),
            ctaText: get('hero_slide_1', 'cta_text', 'Comprar Ahora'),
            ctaHref: '/tienda',
        },
        {
            image: getImage('hero_slide_2', 'image_url', '/hero-michell.jpg'),
            title: get('hero_slide_2', 'title', 'Nueva\nColección'),
            subtitle: get('hero_slide_2', 'subtitle', 'Descubre los productos más exclusivos. Tendencias que se convierten en tu sello personal.'),
            ctaText: get('hero_slide_2', 'cta_text', 'Ver Colección'),
            ctaHref: '/tienda?filter=new',
        },
        {
            image: getImage('hero_slide_3', 'image_url', '/hero-michell.jpg'),
            title: get('hero_slide_3', 'title', 'Maquillaje\nde élite'),
            subtitle: get('hero_slide_3', 'subtitle', 'Las mejores marcas del mundo, reunidas en un solo lugar para ti.'),
            ctaText: get('hero_slide_3', 'cta_text', 'Explorar Marcas'),
            ctaHref: '/tienda/maquillaje',
        },
    ];

    // Welcome section CMS
    const welcomeTitle = get('welcome', 'title', 'Todo lo que amas, unido por primera vez.');
    const welcomeSubtitle = get('welcome', 'subtitle', 'Una colección exclusiva de tus marcas favoritas en un solo lugar. con envíos a toda Colombia.');
    const promiseBadge = get('welcome', 'badge', 'Nuestra Promesa');
    const buttonDiscover = get('welcome', 'button', 'Descubrir Ahora');

    const catTitle = get('categories', 'title', 'Explora por Categoría');
    const catBadge = get('categories', 'badge', 'Colecciones Exclusivas');
    const catDesc = get('categories', 'description', 'Una selección curada de lo mejor en maquillaje, accesorios y moda femenina. Calidad premium en cada detalle.');

    return (
        <>
            <Header />
            <main>
                {/* ─── Hero Carousel ─── */}
                <HeroCarousel slides={heroSlides} />

                {/* ─── Trust Badges ─── */}
                <section className="border-b border-neutral-100 bg-white">
                    <div className="container-custom py-8 md:py-10">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                            {[
                                { Icon: Truck, color: 'primary', title: 'Envío Gratis', sub: 'En compras mayores a $200k' },
                                { Icon: ShoppingBag, color: 'secondary', title: 'Nuevas Marcas', sub: 'Originales y Garantizadas' },
                                { Icon: Shield, color: 'primary', title: 'Pagos Seguros', sub: 'Wompi, PSE, Nequi y más' },
                                { Icon: CheckCircle, color: 'secondary', title: 'Garantía', sub: '100% Calidad Asegurada' },
                            ].map(({ Icon, color, title, sub }, i) => (
                                <ScrollReveal key={title} delay={(i + 1) as 1 | 2 | 3 | 4}>
                                    <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-3">
                                        <div className={`p-3.5 bg-${color}-50 rounded-xl shadow-sm flex-shrink-0`}>
                                            <Icon className={`w-5 h-5 text-${color}-500`} />
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="font-display font-bold text-neutral-900 text-sm">{title}</p>
                                            <p className="text-xs text-neutral-500">{sub}</p>
                                        </div>
                                    </div>
                                </ScrollReveal>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── Brands Marquee ─── */}
                {contentLoading ? (
                    <div className="py-20 border-y border-neutral-100 bg-white">
                        <div className="container-custom flex justify-center gap-12 overflow-hidden opacity-20">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="h-10 w-28 bg-neutral-200 rounded-lg animate-pulse" />
                            ))}
                        </div>
                    </div>
                ) : (
                    <BrandsMarquee 
                        brands={cmsBrands.length > 0 ? cmsBrands : DEFAULT_BRANDS.slice(0, 10)} 
                    />
                )}

                {/* ─── Welcome / Value Proposition Section ─── */}
                <section className="py-16 md:py-20 bg-gradient-to-br from-primary-50 via-white to-secondary-50 overflow-hidden">
                    <div className="container-custom">
                        <ScrollReveal>
                            <div className="max-w-3xl mx-auto text-center space-y-6">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-600 text-xs font-bold tracking-widest uppercase mb-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                                    {promiseBadge}
                                </div>
                                <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-neutral-900 leading-tight">
                                    {welcomeTitle}
                                </h2>
                                <p className="text-lg md:text-xl text-neutral-600 leading-relaxed max-w-2xl mx-auto">
                                    {welcomeSubtitle}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                                    <Link href="/tienda">
                                        <Button variant="primary" size="lg" className="rounded-full px-10 shadow-coral" rightIcon={<ArrowRight className="w-4 h-4" />}>
                                            {buttonDiscover}
                                        </Button>
                                    </Link>
                                    <Link href="/nosotros">
                                        <Button variant="outline" size="lg" className="rounded-full px-10 border-neutral-300">
                                            Quiénes Somos
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </ScrollReveal>
                    </div>
                </section>

                {/* ─── Categories — Editorial Chic ─── */}
                <section className="py-20 md:py-32 bg-white overflow-hidden">
                    <div className="container-custom">
                        <ScrollReveal>
                            <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-5">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <span className="w-12 h-[1px] bg-primary-300" />
                                        <p className="text-[11px] font-bold tracking-[0.4em] text-primary-500 uppercase">{catBadge}</p>
                                    </div>
                                    <h2 className="text-4xl md:text-6xl font-display font-bold text-neutral-900 leading-none">
                                        {catTitle}
                                    </h2>
                                </div>
                                <p className="text-neutral-500 text-sm max-w-xs md:text-right leading-relaxed font-light italic">
                                    &ldquo;{catDesc}&rdquo;
                                </p>
                            </div>
                        </ScrollReveal>

                        {/* Asymmetric Category Grid */}
                        <div className="grid md:grid-cols-12 md:grid-rows-2 gap-4 md:gap-6 h-auto md:h-[700px]">
                            {categories.slice(0, 4).map((category, i) => {
                                // i=0: Maquillaje (Large, left)
                                // i=1: Accesorios (Top right)
                                // i=2: Ropa (Bottom middle)
                                // i=3: Corporal (Bottom right)
                                const gridClass = i === 0
                                    ? "md:col-span-8 md:row-span-2 h-[450px] md:h-full"
                                    : i === 1
                                        ? "md:col-span-4 md:row-span-1 h-[250px] md:h-full"
                                        : "md:col-span-2 md:row-span-1 h-[250px] md:h-full";

                                return (
                                    <ScrollReveal
                                        key={category.id}
                                        delay={(i + 1) as 1 | 2 | 3}
                                        className={gridClass}
                                    >
                                        <Link href={`/tienda/${category.slug}`} className="group relative block h-full w-full overflow-hidden rounded-3xl bg-neutral-100 shadow-sm transition-all duration-500 hover:shadow-xl">
                                            <Image
                                                src={getCategoryImg(`cat_${category.slug}`, 'image_url', category.image)}
                                                alt={category.name}
                                                fill
                                                className="object-cover object-center transition-transform duration-[1200ms] ease-out group-hover:scale-110"
                                                priority={i === 0}
                                            />

                                            {/* Overlays */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-90" />
                                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary-900/40 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

                                            {/* Content */}
                                            <div className="absolute inset-0 p-8 md:p-10 flex flex-col justify-between z-10">
                                                <div className="flex justify-between items-start">
                                                    <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                                                        <span className="text-[10px] font-bold text-white tracking-widest uppercase">0{i + 1}</span>
                                                    </div>
                                                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 -translate-y-4 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
                                                        <ArrowRight className="w-5 h-5 text-white" />
                                                    </div>
                                                </div>

                                                <div className="space-y-2 md:space-y-4 translate-y-4 transition-transform duration-500 group-hover:translate-y-0">
                                                    <p className="text-primary-300 text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase">Explorar</p>
                                                    <h3 className={`font-display font-bold text-white transition-all duration-500 group-hover:text-primary-100 ${i === 0 ? 'text-4xl md:text-6xl' : 'text-2xl md:text-4xl'}`}>
                                                        {category.name}
                                                    </h3>
                                                    {i === 0 && (
                                                        <p className="text-white/70 text-sm max-w-md hidden md:block font-light leading-relaxed">
                                                            {category.description}
                                                        </p>
                                                    )}
                                                    <div className="pt-2 flex items-center gap-2">
                                                        <div className="h-[1px] w-0 bg-primary-400 transition-all duration-700 group-hover:w-12" />
                                                        <span className="text-white/60 text-[10px] font-medium opacity-0 transition-opacity duration-700 group-hover:opacity-100 uppercase tracking-widest">
                                                            {categoryCounts[category.slug] || 0} Artículos
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Decorative Border on Hover */}
                                            <div className="absolute inset-4 border border-white/0 rounded-2xl transition-all duration-700 group-hover:border-white/20" />
                                        </Link>
                                    </ScrollReveal>
                                );
                            })}
                        </div>

                        {/* Store CTA */}
                        <ScrollReveal>
                            <div className="mt-16 text-center">
                                <Link href="/tienda" className="group relative inline-flex items-center gap-4 px-10 py-5 overflow-hidden rounded-full text-sm font-bold tracking-widest uppercase transition-all duration-500 shadow-coral active:scale-95 text-white">
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 transition-transform duration-500 group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-black/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                    <span className="relative z-10 flex items-center gap-3">
                                        Quiero verlo todo
                                        <ArrowRight className="w-5 h-5 transition-transform duration-500 group-hover:translate-x-2" />
                                    </span>
                                </Link>
                            </div>
                        </ScrollReveal>
                    </div>
                </section>

                {/* ─── Featured Products ─── */}
                <section className="py-16 md:py-20 bg-neutral-50">
                    <div className="container-custom">
                        <ScrollReveal>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-4">
                                <div>
                                    <h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 mb-1">Productos Destacados</h2>
                                    <p className="text-neutral-500">Los favoritos de nuestras clientas</p>
                                </div>
                                <Link href="/tienda">
                                    <Button variant="outline" className="rounded-full border-neutral-300">
                                        Ver Todos <ArrowRight className="w-4 h-4 ml-1.5" />
                                    </Button>
                                </Link>
                            </div>
                        </ScrollReveal>

                        <ProductGrid products={featuredProducts} />
                    </div>
                </section>

                {/* ─── New Arrivals ─── */}
                <section className="py-16 md:py-20 bg-white">
                    <div className="container-custom">
                        <ScrollReveal>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-4">
                                <div>
                                    <h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 mb-1">Recién Llegados</h2>
                                    <p className="text-neutral-500">Las últimas novedades en maquillaje y moda</p>
                                </div>
                                <Link href="/tienda?filter=new">
                                    <Button variant="outline" className="rounded-full border-neutral-300">
                                        Ver Todos <ArrowRight className="w-4 h-4 ml-1.5" />
                                    </Button>
                                </Link>
                            </div>
                        </ScrollReveal>

                        <ProductGrid products={newProducts} />
                    </div>
                </section>

                {/* ─── Scrolling Benefits Banner ─── */}
                <section className="py-5 bg-[#f47eab] overflow-hidden border-y border-[#e56d9a]">
                    <div className="marquee-track gap-0 items-center">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex shrink-0 items-center">
                                {[
                                    { Icon: CheckCircle, text: 'Excelente calidad' },
                                    { Icon: ShoppingBag, text: 'Asesoría personalizada' },
                                    { Icon: Truck, text: 'Envíos a nivel nacional' },
                                    { Icon: Shield, text: 'Compra 100% segura' },
                                ].map(({ Icon, text }) => (
                                    <div key={text} className="flex items-center gap-3 px-10 text-black">
                                        <Icon className="w-4 h-4 opacity-80 flex-shrink-0" />
                                        <span className="text-sm font-semibold tracking-wide uppercase whitespace-nowrap">{text}</span>
                                        <span className="mx-4 text-black/20 select-none">✦</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}
