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
    fallbackSrc,
    className,
    ...props
}) => {
    const initialSrc = src || fallbackSrc;
    const [imgSrc, setImgSrc] = useState(initialSrc);

    // Update internal state if external src changes
    useEffect(() => {
        setImgSrc(initialSrc);
    }, [initialSrc]);

    const handleError = () => {
        setImgSrc((failedSrc) => failedSrc !== fallbackSrc ? fallbackSrc : undefined);
    };

    if (!imgSrc) {
        return (
            <div
                className={`w-full h-full flex flex-col items-center justify-center bg-neutral-100 text-neutral-400 gap-2 ${className ?? ''}`}
            >
                <ImageIcon className="w-8 h-8 opacity-20" />
                <span className="text-xs font-medium opacity-40">Imagen no disponible</span>
            </div>
        );
    }

    return (
        <Image
            {...props}
            src={imgSrc}
            alt={alt}
            className={className}
            onError={handleError}
        />
    );
};

export default ProductImage;
