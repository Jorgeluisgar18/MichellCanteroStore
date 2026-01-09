'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Search, ShoppingBag, User, Heart } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useWishlistStore } from '@/store/wishlistStore';
import Logo from '@/components/common/Logo';

const Header: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    const itemCount = useCartStore((state) => state.getItemCount());
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const wishlistCount = useWishlistStore((state) => state.items.length);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const categories = [
        { name: 'Maquillaje', href: '/tienda/maquillaje' },
        { name: 'Accesorios', href: '/tienda/accesorios' },
        { name: 'Ropa', href: '/tienda/ropa' },
    ];

    return (
        <header className="sticky top-0 z-40 w-full bg-white border-b border-neutral-100 shadow-sm">
            {/* Top Bar */}
            <div className="bg-primary-50 text-primary-600 py-2 border-b border-primary-100">
                <div className="container-custom">
                    <p className="text-center text-xs md:text-sm font-medium tracking-wide font-display">
                        ✨ ENVÍO GRATIS EN COMPRAS SUPERIORES A $200.000 COP ✨
                    </p>
                </div>
            </div>

            {/* Main Header */}
            <div className="container-custom">
                <div className="flex flex-col items-center py-6 md:py-8 gap-6">
                    {/* Logo Centered */}
                    <div className="flex justify-center w-full">
                        <Logo className="scale-125 md:scale-150 transition-transform duration-500" />
                    </div>

                    <div className="flex items-center justify-between w-full">
                        {/* Mobile Menu Button - Left */}
                        <div className="flex items-center md:hidden w-10">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="p-2 text-neutral-600 hover:text-primary-500 transition-colors"
                                aria-label="Toggle menu"
                            >
                                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>

                        {/* Desktop Navigation - Centered */}
                        <nav className="hidden md:flex items-center justify-center flex-1 space-x-12">
                            <Link href="/tienda" className="text-neutral-700 hover:text-primary-600 font-semibold text-sm uppercase tracking-[0.2em] transition-colors">
                                Tienda
                            </Link>
                            {categories.map((category) => (
                                <Link
                                    key={category.href}
                                    href={category.href}
                                    className="text-neutral-700 hover:text-primary-600 font-semibold text-sm uppercase tracking-[0.2em] transition-colors"
                                >
                                    {category.name}
                                </Link>
                            ))}
                            <Link href="/nosotros" className="text-neutral-700 hover:text-primary-600 font-semibold text-sm uppercase tracking-[0.2em] transition-colors">
                                Nosotros
                            </Link>
                            <Link href="/contacto" className="text-neutral-700 hover:text-primary-600 font-semibold text-sm uppercase tracking-[0.2em] transition-colors">
                                Contacto
                            </Link>
                        </nav>

                        {/* Actions - Right */}
                        <div className="flex items-center space-x-2 md:space-x-4">
                            {/* Search */}
                            <button
                                onClick={() => setIsSearchOpen(!isSearchOpen)}
                                className="p-2 text-neutral-600 hover:text-neutral-900 transition-colors"
                                aria-label="Buscar"
                            >
                                <Search className="w-5 h-5" />
                            </button>

                            {/* Wishlist */}
                            <Link
                                href="/cuenta/favoritos"
                                className="hidden sm:block p-2 text-neutral-600 hover:text-neutral-900 transition-colors relative"
                                aria-label="Favoritos"
                            >
                                <Heart className="w-5 h-5" />
                                {isMounted && wishlistCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                        {wishlistCount}
                                    </span>
                                )}
                            </Link>

                            {/* User */}
                            <Link
                                href={isMounted && isAuthenticated ? '/cuenta' : '/cuenta/login'}
                                className="hidden sm:block p-2 text-neutral-600 hover:text-neutral-900 transition-colors"
                                aria-label="Cuenta"
                            >
                                <User className="w-5 h-5" />
                            </Link>

                            {/* Cart */}
                            <Link
                                href="/carrito"
                                className="p-2 text-neutral-600 hover:text-neutral-900 transition-colors relative"
                                aria-label="Carrito"
                            >
                                <ShoppingBag className="w-5 h-5" />
                                {isMounted && itemCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                        {itemCount}
                                    </span>
                                )}
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                {isSearchOpen && (
                    <div className="py-4 border-t border-neutral-200 animate-slide-down">
                        <input
                            type="search"
                            placeholder="Buscar productos..."
                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            autoFocus
                        />
                    </div>
                )}
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-neutral-200 bg-white animate-slide-down shadow-xl">
                    <nav className="container-custom py-8 space-y-4">
                        <Link
                            href="/tienda"
                            className="block text-xl text-neutral-900 hover:text-primary-600 font-display font-medium border-b border-neutral-50 pb-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Tienda
                        </Link>
                        {categories.map((category) => (
                            <Link
                                key={category.href}
                                href={category.href}
                                className="block text-xl text-neutral-900 hover:text-primary-600 font-display font-medium border-b border-neutral-50 pb-2"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {category.name}
                            </Link>
                        ))}
                        <Link
                            href="/nosotros"
                            className="block text-xl text-neutral-900 hover:text-primary-600 font-display font-medium border-b border-neutral-50 pb-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Nosotros
                        </Link>
                        <Link
                            href="/contacto"
                            className="block text-xl text-neutral-900 hover:text-primary-600 font-display font-medium border-b border-neutral-50 pb-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Contacto
                        </Link>
                        <div className="pt-6">
                            <Link
                                href={isMounted && isAuthenticated ? '/cuenta' : '/cuenta/login'}
                                className="inline-block px-6 py-2 bg-neutral-900 text-white rounded-full text-sm font-semibold hover:bg-neutral-800 transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Mi Cuenta
                            </Link>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
};

export default Header;
