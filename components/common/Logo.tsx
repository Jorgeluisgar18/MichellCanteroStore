import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
    className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "" }) => {
    return (
        <Link
            href="/"
            className={`flex items-center gap-2 group transition-opacity hover:opacity-90 ${className}`}
        >
            <div className="relative w-48 h-12 md:w-64 md:h-16">
                <Image
                    src="/logo.jpg"
                    alt="Michell Cantero Store"
                    fill
                    className="object-contain"
                    priority
                />
            </div>
        </Link>
    );
};

export default Logo;
