'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Search, ShoppingBag, User, Heart } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useWishlistStore } from '@/store/wishlistStore';

const Header: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const itemCount = useCartStore((state) => state.getItemCount());
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const wishlistCount = useWishlistStore((state) => state.items.length);

    const categories = [
        { name: 'Maquillaje', href: '/tienda/maquillaje' },
        { name: 'Accesorios', href: '/tienda/accesorios' },
        { name: 'Ropa', href: '/tienda/ropa' },
    ];

    return (
        <header className="sticky top-0 z-40 w-full bg-white border-b border-neutral-200 shadow-sm">
            {/* Top Bar */}
            <div className="bg-gradient-primary text-white py-2">
                <div className="container-custom">
                    <p className="text-center text-sm font-medium">
                        ✨ Envío gratis en compras superiores a $150.000 COP
                    </p>
                </div>
            </div>

            {/* Main Header */}
            <div className="container-custom">
                <div className="flex items-center justify-between h-16 md:h-20">
                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-2 text-neutral-600 hover:text-neutral-900"
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>

                    {/* Logo */}
                    <Link href="/" className="flex items-center">
                        <h1 className="text-2xl md:text-3xl font-display font-bold text-gradient">
                            Michell Cantero
                        </h1>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-8">
                        <Link href="/tienda" className="text-neutral-700 hover:text-primary-600 font-medium transition-colors">
                            Tienda
                        </Link>
                        {categories.map((category) => (
                            <Link
                                key={category.href}
                                href={category.href}
                                className="text-neutral-700 hover:text-primary-600 font-medium transition-colors"
                            >
                                {category.name}
                            </Link>
                        ))}
                        <Link href="/nosotros" className="text-neutral-700 hover:text-primary-600 font-medium transition-colors">
                            Nosotros
                        </Link>
                        <Link href="/contacto" className="text-neutral-700 hover:text-primary-600 font-medium transition-colors">
                            Contacto
                        </Link>
                    </nav>

                    {/* Actions */}
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
                            {wishlistCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {wishlistCount}
                                </span>
                            )}
                        </Link>

                        {/* User */}
                        <Link
                            href={isAuthenticated ? '/cuenta' : '/cuenta/login'}
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
                            {itemCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {itemCount}
                                </span>
                            )}
                        </Link>
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
                <div className="md:hidden border-t border-neutral-200 bg-white animate-slide-down">
                    <nav className="container-custom py-4 space-y-2">
                        <Link
                            href="/tienda"
                            className="block py-2 text-neutral-700 hover:text-primary-600 font-medium"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Tienda
                        </Link>
                        {categories.map((category) => (
                            <Link
                                key={category.href}
                                href={category.href}
                                className="block py-2 text-neutral-700 hover:text-primary-600 font-medium"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {category.name}
                            </Link>
                        ))}
                        <Link
                            href="/nosotros"
                            className="block py-2 text-neutral-700 hover:text-primary-600 font-medium"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Nosotros
                        </Link>
                        <Link
                            href="/contacto"
                            className="block py-2 text-neutral-700 hover:text-primary-600 font-medium"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Contacto
                        </Link>
                        <div className="pt-4 border-t border-neutral-200">
                            <Link
                                href={isAuthenticated ? '/cuenta' : '/cuenta/login'}
                                className="block py-2 text-neutral-700 hover:text-primary-600 font-medium"
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
