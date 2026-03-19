'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductGrid from '@/components/product/ProductGrid';
import { Heart, Loader2 } from 'lucide-react';
import { useWishlistStore } from '@/store/wishlistStore';
import type { Product } from '@/types';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function FavoritosPage() {
    const wishlistItems = useWishlistStore((state) => state.items);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;

        const fetchWishlistProducts = async () => {
            if (wishlistItems.length === 0) {
                setLoading(false);
                return;
            }

            try {
                // Fetch all products and filter by wishlist IDs
                const res = await fetch('/api/products');
                const data = await res.json();
                const wishlistProducts = data.data.products?.filter((p: Product) =>
                    wishlistItems.includes(p.id)
                ) || [];
                setProducts(wishlistProducts);
            } catch (error) {
                console.error('Error fetching wishlist products:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchWishlistProducts();
    }, [wishlistItems, isMounted]);

    return (
        <>
            <Header />
            <main className="min-h-screen bg-neutral-50">
                {/* Page Header */}
                <div className="bg-white border-b border-neutral-200">
                    <div className="container-custom py-8">
                        <div className="flex items-center gap-3 mb-2">
                            <Heart className="w-8 h-8 text-primary-600 fill-primary-600" />
                            <h1 className="text-3xl md:text-4xl font-display font-bold text-neutral-900">
                                Mis Favoritos
                            </h1>
                        </div>
                        <p className="text-neutral-600">
                            {wishlistItems.length === 0
                                ? 'Aún no tienes productos favoritos'
                                : `${wishlistItems.length} producto${wishlistItems.length !== 1 ? 's' : ''} guardado${wishlistItems.length !== 1 ? 's' : ''}`
                            }
                        </p>
                    </div>
                </div>

                <div className="container-custom py-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-12 h-12 animate-spin text-primary-600 mb-4" />
                            <p className="text-neutral-500">Cargando favoritos...</p>
                        </div>
                    ) : wishlistItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <Heart className="w-20 h-20 text-neutral-300 mb-6" />
                            <h3 className="text-2xl font-bold text-neutral-900 mb-2">
                                No tienes favoritos aún
                            </h3>
                            <p className="text-neutral-600 mb-8 max-w-md">
                                Explora nuestra tienda y guarda tus productos favoritos haciendo clic en el corazón
                            </p>
                            <Link href="/tienda">
                                <Button variant="primary" size="lg">
                                    Explorar Productos
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <ProductGrid products={products} />
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}
