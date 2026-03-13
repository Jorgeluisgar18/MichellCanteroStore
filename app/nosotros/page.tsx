'use client';

import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { Card } from '@/components/ui/Card';
import { Heart, Award, Truck, Shield, Instagram } from 'lucide-react';
import { usePageContent } from '@/lib/hooks/usePageContent';

export default function NosotrosPage() {
    const { get, getImage } = usePageContent('nosotros');
    const { get: getGlobal } = usePageContent('global');

    const heroBadge = get('hero', 'badge', 'bienvenida a');
    const heroTitle = get('hero', 'title', 'Nuestra Historia');
    const heroSubtitle = get('hero', 'subtitle', '"Donde la pasión por la belleza se encuentra con la calidez de nuestro servicio."');
    const storyTitle = get('story', 'title', 'Del Sueño a la Realidad:');
    const storyBody1 = get('story', 'body1', '<span>Michell Cantero Store</span> no es solo una boutique de belleza; es el resultado de un compromiso inquebrantable con el empoderamiento femenino.');
    const storyBody2 = get('story', 'body2', 'Lo que comenzó como una visión digital compartida con nuestra comunidad en Instagram, se materializó en una sede física diseñada para ser un santuario de estilo y confianza. Cada detalle de nuestra tienda ha sido pensado para brindarte una experiencia de compra personalizada y exclusiva.');
    const storyQuote = get('story', 'quote', '¡Junto a Dios, viene una nueva temporada!');
    const storyImage = getImage('story', 'image_url', '/nosotros-inauguracion.jpg');
    const founderQuote = get('founder', 'quote', '"Cada mujer merece brillar con luz propia. Mi propósito es brindarles las herramientas para que se sientan seguras y empoderadas en su propia piel."');
    const founderImage = getImage('founder', 'image_url', '/nosotros-collage.jpg');
    const statClients = get('stats', 'clients', '5000+');
    const statProducts = get('stats', 'products', '+200');
    const statSat = get('stats', 'satisfaction', '98%');

    const renderHtml = (text: string) =>
        text.replace(/<span>(.*?)<\/span>/gi, '<span class="font-bold text-primary-500">$1</span>');

    const values = [
        { Icon: Heart, title: 'Pasión', text: 'Amamos lo que hacemos y se refleja en cada producto que ofrecemos' },
        { Icon: Award, title: 'Calidad', text: 'Trabajamos con las mejores marcas y productos de la más alta calidad' },
        { Icon: Truck, title: 'Compromiso', text: 'Entregamos tus pedidos a tiempo y en perfectas condiciones' },
        { Icon: Shield, title: 'Confianza', text: 'Tu satisfacción y seguridad son nuestra prioridad número uno' },
    ];

    const stats = [
        { value: statClients, label: 'Clientas Felices' },
        { value: statProducts, label: 'Productos en Catálogo' },
        { value: statSat, label: 'Satisfacción del Cliente' },
    ];

    return (
        <>
            <Header />
            <main className="min-h-screen bg-white">

                {/* ─── Hero con overlay degradado ─── */}
                <section className="relative overflow-hidden bg-neutral-900 py-24 md:py-36">
                    {/* Background decoration */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-600/80 via-primary-500/60 to-secondary-600/70" />
                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-secondary-400/20 rounded-full blur-3xl" />

                    <div className="relative container-custom text-center text-white space-y-6 z-10">
                        <ScrollReveal>
                            <span className="font-script text-4xl text-primary-200 block mb-2">{heroBadge}</span>
                            <h1 className="text-5xl md:text-6xl font-display font-bold leading-tight drop-shadow-lg">
                                {heroTitle}
                            </h1>
                            <p className="text-lg md:text-xl text-white/80 leading-relaxed italic max-w-2xl mx-auto mt-4">
                                {heroSubtitle}
                            </p>
                        </ScrollReveal>
                    </div>
                </section>

                {/* ─── Story Section ─── */}
                <section className="py-20 md:py-28 bg-white">
                    <div className="container-custom">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            {/* Image */}
                            <ScrollReveal delay={1}>
                                <div className="relative group">
                                    <div className="absolute -inset-4 bg-primary-100 rounded-3xl blur-2xl opacity-40 group-hover:opacity-70 transition-opacity duration-700" />
                                    <div className="relative h-[480px] md:h-[560px] rounded-3xl overflow-hidden shadow-strong border-8 border-white">
                                        <Image
                                            src={storyImage}
                                            alt="Inauguración Michell Cantero Store"
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                                            unoptimized={storyImage.startsWith('https://')}
                                        />
                                        {/* Decorative corner badge */}
                                        <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-sm px-5 py-3 rounded-2xl shadow-lg">
                                            <p className="text-2xl font-display font-bold text-primary-500">Desde 2022</p>
                                            <p className="text-xs text-neutral-500 uppercase tracking-wide">Ciénaga, Magdalena</p>
                                        </div>
                                    </div>
                                </div>
                            </ScrollReveal>

                            {/* Text */}
                            <ScrollReveal delay={2}>
                                <div className="space-y-7">
                                    <div className="inline-block p-3.5 bg-primary-50 rounded-2xl">
                                        <Heart className="w-7 h-7 text-primary-500" />
                                    </div>
                                    <h2 className="text-4xl font-display font-bold text-neutral-900 leading-tight">
                                        {storyTitle}<br />
                                        <span className="text-primary-500">Una Experiencia Única</span>
                                    </h2>
                                    <div className="space-y-5 text-base md:text-lg text-neutral-600 leading-relaxed">
                                        <p dangerouslySetInnerHTML={{ __html: renderHtml(storyBody1) }} />
                                        <p>{storyBody2}</p>
                                        <blockquote className="border-l-4 border-primary-400 pl-5 py-1">
                                            <p className="font-script text-2xl text-primary-500 italic">{storyQuote}</p>
                                        </blockquote>
                                    </div>
                                </div>
                            </ScrollReveal>
                        </div>
                    </div>
                </section>

                {/* ─── Stats Banner ─── */}
                <section className="py-14 bg-primary-500">
                    <div className="container-custom">
                        <div className="grid grid-cols-3 gap-6 text-center text-white">
                            {stats.map(({ value, label }, i) => (
                                <ScrollReveal key={label} delay={(i + 1) as 1 | 2 | 3}>
                                    <p className="text-4xl md:text-5xl font-display font-bold mb-1 drop-shadow">{value}</p>
                                    <p className="text-sm text-white/75 font-medium uppercase tracking-wide">{label}</p>
                                </ScrollReveal>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── Founder Section ─── */}
                <section className="py-20 md:py-28 bg-neutral-50">
                    <div className="container-custom">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            {/* Text */}
                            <ScrollReveal delay={1} className="order-2 md:order-1">
                                <div className="space-y-6">
                                    <div className="inline-block px-4 py-1.5 bg-secondary-100 text-secondary-700 rounded-full text-xs font-bold uppercase tracking-widest">
                                        Sobre la Fundadora
                                    </div>
                                    <h2 className="text-4xl font-display font-bold text-neutral-900 leading-tight">
                                        Nuestra Fundadora:<br />
                                        <span className="text-secondary-500">Michell Cantero</span>
                                    </h2>
                                    <p className="text-lg text-neutral-600 leading-relaxed italic border-l-4 border-secondary-300 pl-5">
                                        {founderQuote}
                                    </p>
                                    <a
                                        href={getGlobal('social', 'instagram_ceo', 'https://www.instagram.com/michellcantero/')}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white font-semibold rounded-full hover:opacity-90 transition-all shadow-lg hover:-translate-y-0.5"
                                    >
                                        <Instagram className="w-4 h-4" /> Sígueme en Instagram
                                    </a>
                                </div>
                            </ScrollReveal>

                            {/* Image */}
                            <ScrollReveal delay={2} className="order-1 md:order-2">
                                <div className="relative group">
                                    <div className="absolute -inset-4 bg-secondary-100 rounded-3xl blur-2xl opacity-40 group-hover:opacity-70 transition-opacity duration-700" />
                                    <div className="relative h-[520px] md:h-[620px] rounded-3xl overflow-hidden shadow-strong border-4 border-white">
                                        <Image
                                            src={founderImage}
                                            alt="Michell Cantero - Fundadora"
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                                            unoptimized={founderImage.startsWith('https://')}
                                        />
                                    </div>
                                </div>
                            </ScrollReveal>
                        </div>
                    </div>
                </section>

                {/* ─── Values ─── */}
                <section className="py-16 md:py-20 bg-white">
                    <div className="container-custom">
                        <ScrollReveal>
                            <div className="text-center mb-12">
                                <h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 mb-3">Nuestros Valores</h2>
                                <p className="text-neutral-500 max-w-xl mx-auto">Los principios que guían cada decisión que tomamos</p>
                            </div>
                        </ScrollReveal>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {values.map(({ Icon, title, text }, i) => (
                                <ScrollReveal key={title} delay={((i % 4) + 1) as 1 | 2 | 3 | 4}>
                                    <Card className="h-full group hover:shadow-medium transition-shadow duration-300">
                                        <div className="p-7 text-center space-y-4">
                                            <div className="w-16 h-16 bg-primary-50 group-hover:bg-primary-100 rounded-2xl flex items-center justify-center mx-auto transition-colors duration-300">
                                                <Icon className="w-7 h-7 text-primary-500" />
                                            </div>
                                            <h3 className="font-display font-bold text-neutral-900 text-lg">{title}</h3>
                                            <p className="text-sm text-neutral-500 leading-relaxed">{text}</p>
                                        </div>
                                    </Card>
                                </ScrollReveal>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}
