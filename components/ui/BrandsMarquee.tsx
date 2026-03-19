'use client';

import Image from 'next/image';

export interface Brand {
    name: string;
    logo: string;
}

// Note: Images must exist in public/brands/ if used.
// If using CMS, pass as prop.
export const DEFAULT_BRANDS: Brand[] = [
    { name: 'Maybelline', logo: '/brands/maybelline.png' },
    { name: 'L\'Oréal', logo: '/brands/loreal.png' },
    { name: 'MAC', logo: '/brands/mac.png' },
    { name: 'NYX', logo: '/brands/nyx.png' },
    { name: 'Revlon', logo: '/brands/revlon.png' },
    { name: 'Essence', logo: '/brands/essence.png' },
    { name: 'e.l.f.', logo: '/brands/elf.png' },
    { name: 'Sheglam', logo: '/brands/sheglam.png' },
    { name: 'Rimmel', logo: '/brands/rimmel.png' },
    { name: 'CoverGirl', logo: '/brands/covergirl.png' },
    { name: 'Neutrogena', logo: '/brands/neutrogena.png' },
    { name: 'Milani', logo: '/brands/milani.png' },
    { name: 'Wet n Wild', logo: '/brands/wetnwild.png' },
    { name: 'Elf', logo: '/brands/elf2.png' },
    { name: 'Rhode', logo: '/brands/rhode.png' },
    { name: 'Mixsoon', logo: '/brands/mixsoon.png' },
];

export interface BrandsMarqueeProps {
    brands?: Brand[];
    label?: string;
}

export default function BrandsMarquee({ brands = [], label = 'Nuestras Marcas' }: BrandsMarqueeProps) {
    if (!brands || brands.length === 0) return null;
    
    // Duplicate brands to create seamless infinite loop
    const doubled = [...brands, ...brands];

    return (
        <section className="py-12 bg-white border-y border-neutral-100 overflow-hidden">
            {/* Subtle label */}
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400 mb-8">
                {label}
            </p>

            {/* Marquee */}
            <div className="relative flex overflow-hidden">
                {/* Left fade */}
                <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-white to-transparent pointer-events-none" />

                <div className="marquee-track gap-16 items-center">
                    {doubled.map((brand, i) => (
                        <BrandLogo key={`${brand.name}-${i}`} brand={brand} />
                    ))}
                </div>

                {/* Right fade */}
                <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-white to-transparent pointer-events-none" />
            </div>
        </section>
    );
}

function BrandLogo({ brand }: { brand: Brand }) {
    return (
        <div className="flex-shrink-0 flex items-center justify-center px-10">
            <div className="relative h-16 w-36 grayscale-[0.5] opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500 hover:scale-110">
                <Image
                    src={brand.logo}
                    alt={brand.name}
                    fill
                    className="object-contain"
                    unoptimized={brand.logo.startsWith('https://')}
                    onError={(e) => {
                        // Fallback to brand name text if image fails
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('span')) {
                            const span = document.createElement('span');
                            span.className = 'text-sm font-bold tracking-wider text-neutral-600 uppercase whitespace-nowrap';
                            span.textContent = brand.name;
                            parent.appendChild(span);
                        }
                    }}
                />
            </div>
        </div>
    );
}
