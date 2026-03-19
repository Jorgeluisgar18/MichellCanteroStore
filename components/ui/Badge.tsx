import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
    size?: 'sm' | 'md';
}

function getVariantClasses(variant: NonNullable<BadgeProps['variant']>): string {
    switch (variant) {
        case 'primary':
            return 'bg-primary-100 text-primary-800';
        case 'secondary':
            return 'bg-secondary-100 text-secondary-800';
        case 'success':
            return 'bg-green-100 text-green-800';
        case 'warning':
            return 'bg-yellow-100 text-yellow-800';
        case 'danger':
            return 'bg-red-100 text-red-800';
        case 'default':
        default:
            return 'bg-neutral-100 text-neutral-800';
    }
}

function getSizeClasses(size: NonNullable<BadgeProps['size']>): string {
    switch (size) {
        case 'sm':
            return 'px-2 py-0.5 text-xs';
        case 'md':
        default:
            return 'px-2.5 py-1 text-sm';
    }
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant = 'default', size = 'md', ...props }, ref) => {
        return (
            <span
                ref={ref}
                className={cn(
                    'inline-flex items-center rounded-full font-medium',
                    getVariantClasses(variant),
                    getSizeClasses(size),
                    className
                )}
                {...props}
            />
        );
    }
);

Badge.displayName = 'Badge';

export default Badge;
