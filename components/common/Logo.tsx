import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePageContent } from '@/lib/hooks/usePageContent';



interface LogoProps {
    className?: string;
    size?: 'small' | 'base';
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 'base' }) => {
    const { getImage } = usePageContent('global');
    const dimensions = size === 'small'
        ? "w-32 h-8 md:w-40 md:h-10"
        : "w-48 h-12 md:w-64 md:h-16";

    const logoUrl = getImage('header', 'logo_url', '/logo.jpg');

    return (
        <Link
            href="/"
            className={`flex items-center gap-2 group transition-opacity hover:opacity-90 ${className}`}
        >
            <div className={`relative ${dimensions}`}>
                <Image
                    src={logoUrl}
                    alt="Michell Cantero Store"
                    fill
                    className="object-contain"
                    priority
                    unoptimized={logoUrl.startsWith('https://')}
                />
            </div>
        </Link>
    );
};

export default Logo;
