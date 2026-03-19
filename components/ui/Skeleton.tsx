import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'text' | 'circular' | 'rectangular';
}

function getVariantClasses(variant: NonNullable<SkeletonProps['variant']>): string {
    switch (variant) {
        case 'text':
            return 'h-4 w-full rounded';
        case 'circular':
            return 'rounded-full';
        case 'rectangular':
        default:
            return 'rounded-lg';
    }
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
    ({ className, variant = 'rectangular', ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn('shimmer', getVariantClasses(variant), className)}
                {...props}
            />
        );
    }
);

Skeleton.displayName = 'Skeleton';

export default Skeleton;
