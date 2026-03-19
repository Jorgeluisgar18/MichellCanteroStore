'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface ScrollRevealProps {
    children: ReactNode;
    className?: string;
    delay?: 0 | 1 | 2 | 3 | 4 | 5;
    threshold?: number;
}

function getDelayClass(delay: ScrollRevealProps['delay']): string {
    switch (delay) {
        case 1:
            return 'reveal-delay-1';
        case 2:
            return 'reveal-delay-2';
        case 3:
            return 'reveal-delay-3';
        case 4:
            return 'reveal-delay-4';
        case 5:
            return 'reveal-delay-5';
        case 0:
        default:
            return '';
    }
}

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
                if (entry && entry.isIntersecting) {
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
            className={`reveal ${getDelayClass(delay)} ${className}`}
        >
            {children}
        </div>
    );
}
