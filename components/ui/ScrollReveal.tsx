'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface ScrollRevealProps {
    children: ReactNode;
    className?: string;
    delay?: 0 | 1 | 2 | 3 | 4 | 5;
    threshold?: number;
}

const DELAY_CLASS: Record<number, string> = {
    0: '',
    1: 'reveal-delay-1',
    2: 'reveal-delay-2',
    3: 'reveal-delay-3',
    4: 'reveal-delay-4',
    5: 'reveal-delay-5',
};

export default function ScrollReveal({
    children,
    className = '',
    delay = 0,
    threshold = 0.15,
}: ScrollRevealProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.classList.add('visible');
                    observer.unobserve(el);
                }
            },
            { threshold }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold]);

    return (
        <div
            ref={ref}
            className={`reveal ${DELAY_CLASS[delay]} ${className}`}
        >
            {children}
        </div>
    );
}
