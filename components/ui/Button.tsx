import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

function getVariantClasses(variant: NonNullable<ButtonProps['variant']>): string {
    switch (variant) {
        case 'secondary':
            return 'bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-secondary-500';
        case 'outline':
            return 'border-2 border-primary-600 text-primary-700 hover:bg-primary-50 focus:ring-primary-500';
        case 'ghost':
            return 'text-primary-700 hover:bg-primary-50 focus:ring-primary-500';
        case 'danger':
            return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
        case 'primary':
        default:
            return 'bg-primary-600 text-neutral-900 font-semibold hover:bg-primary-700 focus:ring-primary-500';
    }
}

function getSizeClasses(size: NonNullable<ButtonProps['size']>): string {
    switch (size) {
        case 'sm':
            return 'px-3 py-1.5 text-sm';
        case 'lg':
            return 'px-6 py-3 text-lg';
        case 'md':
        default:
            return 'px-4 py-2.5 text-base';
    }
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = 'primary',
            size = 'md',
            isLoading = false,
            leftIcon,
            rightIcon,
            children,
            disabled,
            ...props
        },
        ref
    ) => {
        return (
            <button
                ref={ref}
                className={cn(
                    'btn-base',
                    getVariantClasses(variant),
                    getSizeClasses(size),
                    isLoading && 'cursor-wait',
                    className
                )}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <>
                        <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        Cargando...
                    </>
                ) : (
                    <>
                        {leftIcon && <span className="mr-2">{leftIcon}</span>}
                        {children}
                        {rightIcon && <span className="ml-2">{rightIcon}</span>}
                    </>
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
