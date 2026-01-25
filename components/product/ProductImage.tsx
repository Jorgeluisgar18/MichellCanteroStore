'use client';

import React, { useState, useEffect } from 'react';
import Image, { ImageProps } from 'next/image';
import { ImageIcon } from 'lucide-react';

interface ProductImageProps extends Omit<ImageProps, 'onError'> {
    fallbackSrc?: string;
}

const ProductImage: React.FC<ProductImageProps> = ({
    src,
    alt,
    fallbackSrc = 'https://placehold.co/600x600/f5f5f5/a3a3a3?text=Sin+Imagen',
    className,
    ...props
}) => {
    const [imgSrc, setImgSrc] = useState(src);
    const [hasError, setHasError] = useState(false);

    // Update internal state if external src changes
    useEffect(() => {
        setImgSrc(src);
        setHasError(false);
    }, [src]);

    const handleError = () => {
        if (!hasError) {
            setImgSrc(fallbackSrc);
            setHasError(true);
        }
    };

    // If both original and fallback fail, show a generic placeholder
    if (hasError && (imgSrc === fallbackSrc || !imgSrc)) {
        return (
            <div
                className={`w-full h-full flex flex-col items-center justify-center bg-neutral-100 text-neutral-400 gap-2 ${className}`}
            >
                <ImageIcon className="w-8 h-8 opacity-20" />
                <span className="text-xs font-medium opacity-40">Imagen no disponible</span>
            </div>
        );
    }

    return (
        <Image
            {...props}
            src={imgSrc || fallbackSrc}
            alt={alt}
            className={className}
            onError={handleError}
        />
    );
};

export default ProductImage;
