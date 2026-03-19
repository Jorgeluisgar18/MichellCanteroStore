'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, Search, ShoppingBag, User, Heart } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useWishlistStore } from '@/store/wishlistStore';
import Logo from '@/components/common/Logo';
import ProductImage from '@/components/product/ProductImage';
import { usePageContent } from '@/lib/hooks/usePageContent';

interface ProductSuggestion {
    id: string;
    name: string;
    slug: string;
    category: string;
    brand?: string;
    price: number;
    images: string[];
}

const Header: React.FC = () => {
    const { get } = usePageContent('global');
    const headerBg = get('header', 'bg_color', '#ffffff');
    const headerText = get('header', 'text_color', '#000000'); // Negro por defecto
    const topBarBg = get('header', 'top_bar_bg', '#F1C3D5'); // primary-600 (Header pink)
    const topBarText = get('header', 'top_bar_text', '#000000'); // Negro por defecto

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchSuggestions, setSearchSuggestions] = useState<ProductSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const router = useRouter();
    const searchRef = useRef<HTMLDivElement>(null);

    // Scroll-aware sticky header
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const itemCount = useCartStore((state) => state.getItemCount());
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const user = useAuthStore((state) => state.user);
    const wishlistCount = useWishlistStore((state) => state.items.length);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch search suggestions with debounce
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (searchQuery.trim().length < 2) {
                setSearchSuggestions([]);
                setShowSuggestions(false);
                return;
            }

            try {
                const res = await fetch('/api/products');
                const data = await res.json();
                const query = searchQuery.toLowerCase();
                const filtered = data.data?.filter((p: ProductSuggestion) =>
                    p.name.toLowerCase().includes(query) ||
                    p.category?.toLowerCase().includes(query) ||
                    p.brand?.toLowerCase().includes(query)
                ).slice(0, 5) || [];
                setSearchSuggestions(filtered);
                setShowSuggestions(filtered.length > 0);
            } catch (error) {
                console.error('Error fetching suggestions:', error);
            }
        };

        const debounceTimer = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchQuery]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/tienda?search=${encodeURIComponent(searchQuery.trim())}`);
            setSearchQuery('');
            setIsSearchOpen(false);
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (slug: string) => {
        router.push(`/producto/${slug}`);
        setSearchQuery('');
        setIsSearchOpen(false);
        setShowSuggestions(false);
    };

    const categories = [
        { name: 'Maquillaje', href: '/tienda/maquillaje' },
        { name: 'Accesorios', href: '/tienda/accesorios' },
        { name: 'Ropa', href: '/tienda/ropa' },
    ];

    return (
        <header 
            className={`sticky top-0 z-40 w-full border-b transition-all duration-300 ${isScrolled ? 'header-scrolled border-neutral-100/50' : 'border-neutral-100 shadow-sm'}`}
            style={{ backgroundColor: isScrolled ? `${headerBg}F9` : headerBg }}
        >
            <div 
                className="py-2 border-b border-primary-100"
                style={{ backgroundColor: topBarBg, color: topBarText }}
            >
                <div className="container-custom">
                    <p className="text-center text-xs md:text-sm font-medium tracking-wide font-display uppercase">
                        {get('header', 'top_bar', '✨ ENVÍO GRATIS EN COMPRAS SUPERIORES A $200.000 COP ✨')}
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
                            <Link 
                                href="/tienda" 
                                className="hover:opacity-75 font-semibold text-sm uppercase tracking-[0.2em] transition-all"
                                style={{ color: headerText }}
                            >
                                Tienda
                            </Link>
                            {categories.map((category) => (
                                <Link
                                    key={category.href}
                                    href={category.href}
                                    className="hover:opacity-75 font-semibold text-sm uppercase tracking-[0.2em] transition-all"
                                    style={{ color: headerText }}
                                >
                                    {category.name}
                                </Link>
                            ))}
                            <Link 
                                href="/nosotros" 
                                className="hover:opacity-75 font-semibold text-sm uppercase tracking-[0.2em] transition-all"
                                style={{ color: headerText }}
                            >
                                Nosotros
                            </Link>
                            <Link 
                                href="/contacto" 
                                className="hover:opacity-75 font-semibold text-sm uppercase tracking-[0.2em] transition-all"
                                style={{ color: headerText }}
                            >
                                Contacto
                            </Link>
                        </nav>

                        {/* Actions - Right */}
                        <div className="flex items-center space-x-2 md:space-x-4">
                            {/* Search */}
                            <button
                                onClick={() => setIsSearchOpen(!isSearchOpen)}
                                className="p-2 hover:opacity-75 transition-all"
                                style={{ color: headerText }}
                                aria-label="Buscar"
                            >
                                <Search className="w-5 h-5" />
                            </button>

                            {/* Wishlist */}
                            <Link
                                href="/favoritos"
                                className="hidden sm:block p-2 hover:opacity-75 transition-all relative"
                                style={{ color: headerText }}
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
                                className="hidden sm:flex items-center gap-2 p-2 hover:opacity-75 transition-all"
                                style={{ color: headerText }}
                                aria-label="Cuenta"
                            >
                                <div className="flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    {isMounted && isAuthenticated && user?.name && (
                                        <span className="text-xs font-semibold hidden lg:block max-w-[100px] truncate uppercase tracking-wider">
                                            {user.name.split(' ')[0]}
                                        </span>
                                    )}
                                </div>
                            </Link>

                            {/* Cart */}
                            <Link
                                href="/carrito"
                                className="p-2 hover:opacity-75 transition-all relative"
                                style={{ color: headerText }}
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
                    <div className="py-4 border-t border-neutral-200 animate-slide-down" ref={searchRef}>
                        <form onSubmit={handleSearch} className="flex gap-2 relative">
                            <input
                                type="search"
                                placeholder="Buscar productos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => searchSuggestions.length > 0 && setShowSuggestions(true)}
                                className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                autoFocus
                            />
                            <button
                                type="submit"
                                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                            >
                                Buscar
                            </button>

                            {/* Search Suggestions Dropdown */}
                            {showSuggestions && searchSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                                    {searchSuggestions.map((product) => (
                                        <button
                                            key={product.id}
                                            type="button"
                                            onClick={() => handleSuggestionClick(product.slug)}
                                            className="w-full flex items-center gap-4 p-3 hover:bg-neutral-50 transition-colors text-left border-b border-neutral-100 last:border-0"
                                        >
                                            <div className="w-16 h-16 bg-neutral-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                                                {product.images?.[0] ? (
                                                    <ProductImage
                                                        src={product.images[0]}
                                                        alt={product.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                                                        Sin imagen
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-neutral-900 truncate">{product.name}</p>
                                                <p className="text-sm text-neutral-500 capitalize">{product.category}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-primary-600">${product.price.toLocaleString('es-CO')}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </form>
                    </div>
                )}
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div 
                    className="md:hidden border-t border-neutral-200 animate-slide-down shadow-xl"
                    style={{ backgroundColor: headerBg }}
                >
                    <nav className="container-custom py-8 space-y-4">
                        <Link
                            href="/tienda"
                            className="block text-xl font-display font-medium border-b border-neutral-50 pb-2 transition-colors"
                            style={{ color: headerText }}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Tienda
                        </Link>
                        {categories.map((category) => (
                            <Link
                                key={category.href}
                                href={category.href}
                                className="block text-xl font-display font-medium border-b border-neutral-50 pb-2 transition-colors"
                                style={{ color: headerText }}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {category.name}
                            </Link>
                        ))}
                        <Link
                            href="/nosotros"
                            className="block text-xl font-display font-medium border-b border-neutral-50 pb-2 transition-colors"
                            style={{ color: headerText }}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Nosotros
                        </Link>
                        <Link
                            href="/contacto"
                            className="block text-xl font-display font-medium border-b border-neutral-50 pb-2 transition-colors"
                            style={{ color: headerText }}
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
