'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface HeroSlide {
    image: string;
    title: string;
    subtitle: string;
    ctaText?: string;
    ctaHref?: string;
}

const DEFAULT_SLIDES: HeroSlide[] = [
    {
        image: '/hero-michell.jpg',
        title: 'Eleva tu\nbelleza única',
        subtitle: 'En Michell Cantero Store fusionamos la sofisticación con el estilo para que te sientas empoderada y radiante.',
        ctaText: 'Comprar Ahora',
        ctaHref: '/tienda',
    },
    {
        image: '/hero-michell.jpg',
        title: 'Nueva\nColección',
        subtitle: 'Descubre los productos más exclusivos. Tendencias que se convierten en tu sello personal.',
        ctaText: 'Ver Colección',
        ctaHref: '/tienda?filter=new',
    },
    {
        image: '/hero-michell.jpg',
        title: 'Maquillaje\nde élite',
        subtitle: 'Las mejores marcas del mundo, reunidas en un solo lugar para ti.',
        ctaText: 'Explorar Marcas',
        ctaHref: '/tienda/maquillaje',
    },
];

interface HeroCarouselProps {
    slides?: HeroSlide[];
    autoPlayInterval?: number;
}

export default function HeroCarousel({ slides = DEFAULT_SLIDES, autoPlayInterval = 5000 }: HeroCarouselProps) {
    const [current, setCurrent] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const goToSlide = useCallback((index: number) => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrent(index);
            setIsTransitioning(false);
        }, 100);
    }, [isTransitioning]);

    const next = useCallback(() => {
        goToSlide((current + 1) % slides.length);
    }, [current, slides.length, goToSlide]);

    const prev = useCallback(() => {
        goToSlide((current - 1 + slides.length) % slides.length);
    }, [current, slides.length, goToSlide]);

    useEffect(() => {
        const timer = setInterval(next, autoPlayInterval);
        return () => clearInterval(timer);
    }, [next, autoPlayInterval]);

    const slide = slides[current];

    return (
        <section className="relative w-full overflow-hidden" style={{ height: 'min(90vh, 720px)' }}>
            {/* Slides */}
            {slides.map((s, i) => (
                <div
                    key={i}
                    className={`absolute inset-0 transition-opacity duration-900 ease-in-out ${i === current ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                >
                    <Image
                        src={s.image}
                        alt={s.title}
                        fill
                        priority={i === 0}
                        className={`object-cover object-center transition-transform duration-[7000ms] ease-linear ${i === current ? 'scale-105' : 'scale-100'}`}
                        unoptimized={s.image.startsWith('https://')}
                    />
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                </div>
            ))}

            {/* Content */}
            <div className="relative z-20 h-full container-custom flex items-center">
                <div
                    key={current}
                    className="max-w-xl text-white space-y-6 animate-fade-up"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/20 backdrop-blur-sm border border-primary-400/40 text-primary-200 text-xs font-bold tracking-widest uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse-slow" />
                        Michell Cantero Store
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold leading-[1.1] whitespace-pre-line drop-shadow-lg">
                        {slide.title}
                    </h1>
                    <p className="text-base sm:text-lg text-white/85 leading-relaxed max-w-lg drop-shadow">
                        {slide.subtitle}
                    </p>
                    <div className="flex flex-wrap gap-4 pt-2">
                        <Link
                            href={slide.ctaHref || '/tienda'}
                            className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-full transition-all duration-300 shadow-coral hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
                        >
                            {slide.ctaText || 'Comprar Ahora'}
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href="/nosotros"
                            className="inline-flex items-center gap-2 px-8 py-3.5 border-2 border-white/50 hover:border-white text-white font-semibold rounded-full transition-all duration-300 hover:bg-white/10 backdrop-blur-sm"
                        >
                            Nuestra Historia
                        </Link>
                    </div>
                </div>
            </div>

            {/* Navigation Arrows */}
            <button
                onClick={prev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2.5 bg-white/10 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white rounded-full transition-all duration-200 hover:scale-110"
                aria-label="Anterior"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <button
                onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2.5 bg-white/10 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white rounded-full transition-all duration-200 hover:scale-110"
                aria-label="Siguiente"
            >
                <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => goToSlide(i)}
                        className={`rounded-full transition-all duration-300 ${i === current ? 'w-7 h-2 bg-primary-400' : 'w-2 h-2 bg-white/50 hover:bg-white/80'}`}
                        aria-label={`Slide ${i + 1}`}
                    />
                ))}
            </div>
        </section>
    );
}
