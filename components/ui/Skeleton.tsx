import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'text' | 'circular' | 'rectangular';
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
    ({ className, variant = 'rectangular', ...props }, ref) => {
        const variants = {
            text: 'h-4 w-full rounded',
            circular: 'rounded-full',
            rectangular: 'rounded-lg',
        };

        return (
            <div
                ref={ref}
                className={cn('shimmer', variants[variant], className)}
                {...props}
            />
        );
    }
);

Skeleton.displayName = 'Skeleton';

export default Skeleton;
