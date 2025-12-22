'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import {
    Search,
    Filter,
    Plus,
    Edit,
    Trash2,
    Eye,
    ImageIcon,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types';

export default function AdminProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/products');
            const data = await res.json();
            setProducts(data.data || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching products:', error);
            setLoading(false);
        }
    };

    const deleteProduct = async (id: string) => {
        if (!confirm('¿Estás segura de que deseas eliminar este producto?')) return;

        try {
            const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchProducts();
            }
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-neutral-900">Inventario de Productos</h1>
                    <p className="text-neutral-500 text-sm">Gestiona tu catálogo, precios y niveles de stock.</p>
                </div>
                <Link href="/admin/productos/nuevo">
                    <Button variant="primary" leftIcon={<Plus className="w-5 h-5" />}>
                        Nuevo Producto
                    </Button>
                </Link>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Card>
                    <div className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                            <Plus className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Total Productos</p>
                            <p className="text-xl font-bold text-neutral-900">{products.length}</p>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-red-50 rounded-xl text-red-600">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Bajo Stock</p>
                            <p className="text-xl font-bold text-neutral-900">
                                {products.filter(p => p.stock_quantity < 5).length}
                            </p>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-green-50 rounded-xl text-green-600">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Categorías</p>
                            <p className="text-xl font-bold text-neutral-900">
                                {new Set(products.map(p => p.category)).size}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters and Search */}
            <Card>
                <div className="p-4 flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Buscar por nombre o categoría..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            leftIcon={<Search className="w-5 h-5 text-neutral-400" />}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />}>
                            Categorías
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Products Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-neutral-50 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Producto</th>
                                <th className="px-6 py-4">Categoría</th>
                                <th className="px-6 py-4">Precio</th>
                                <th className="px-6 py-4 text-center">Stock</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {filteredProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-neutral-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-neutral-100 rounded-lg overflow-hidden flex-shrink-0">
                                                {product.images?.[0] ? (
                                                    <div className="relative w-full h-full">
                                                        <Image
                                                            src={product.images[0]}
                                                            alt={product.name}
                                                            fill
                                                            sizes="48px"
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <ImageIcon className="w-full h-full p-3 text-neutral-300" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-neutral-900 truncate">{product.name}</p>
                                                <p className="text-xs text-neutral-500 truncate">{product.slug}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-medium px-2.5 py-1 bg-neutral-100 text-neutral-600 rounded-full capitalize">
                                            {product.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-neutral-900">{formatPrice(product.price)}</p>
                                        {product.compare_at_price && (
                                            <p className="text-xs text-neutral-400 line-through">{formatPrice(product.compare_at_price)}</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-sm font-bold ${product.stock_quantity === 0 ? 'text-red-500' :
                                            product.stock_quantity < 5 ? 'text-yellow-500' :
                                                'text-neutral-900'
                                            }`}>
                                            {product.stock_quantity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <Link href={`/producto/${product.slug}`} target="_blank">
                                                <button className="p-2 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 rounded-lg transition-colors">
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                            </Link>
                                            <Link href={`/admin/productos/editar/${product.id}`}>
                                                <button className="p-2 hover:bg-primary-50 text-neutral-400 hover:text-primary-600 rounded-lg transition-colors">
                                                    <Edit className="w-5 h-5" />
                                                </button>
                                            </Link>
                                            <button
                                                onClick={() => deleteProduct(product.id)}
                                                className="p-2 hover:bg-red-50 text-neutral-400 hover:text-red-600 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

