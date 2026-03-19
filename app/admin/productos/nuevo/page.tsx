'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import {
    Save,
    X,
    Plus,
    Trash2,
    Loader2
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { createBrowserClient } from '@supabase/ssr';
import { fetchWithCsrf } from '@/lib/hooks/useCsrfToken';
import { useToast } from '@/components/ui/Toast';
import Image from 'next/image';

interface Variant {
    id: string;
    name: string;
    type: string;
    value: string;
    stock_quantity: number;
    inStock: boolean;
}

// Utilidad para subir imagen
const uploadImage = async (file: File): Promise<string> => {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipo de archivo no permitido. Usa JPG, PNG, WEBP o GIF.');
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        throw new Error('El archivo supera el límite de 5MB.');
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (uploadError) {
        if (uploadError.message.includes('row-level security')) {
            throw new Error(
                'Sin permisos para subir imágenes. Verifica que el bucket "products" ' +
                'existe en Supabase Storage y tiene políticas de INSERT para usuarios autenticados.'
            );
        }
        throw uploadError;
    }

    const { data } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);

    return data.publicUrl;
};

interface ProductFormData {
    name: string;
    slug: string;
    description: string;
    price: string | number;
    compare_at_price: string | number;
    category: string;
    subcategory: string;
    brand: string;
    stock_quantity: number;
    in_stock: boolean;
    featured: boolean;
    is_new: boolean;
    images: string[];
    variants: Variant[];
}

export default function ProductFormPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params.id;
    const isEditing = !!productId;

    const [loading, setLoading] = useState(isEditing);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        slug: '',
        description: '',
        price: '',
        compare_at_price: '',
        category: '',
        subcategory: '',
        brand: '',
        stock_quantity: 0,
        in_stock: true,
        featured: false,
        is_new: false,
        images: [],
        variants: []
    });
    const { showToast } = useToast();

    useEffect(() => {
        if (isEditing) {
            fetchProduct();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productId, isEditing]);

    const fetchProduct = async () => {
        try {
            const res = await fetch(`/api/products/${productId}`);
            const data = await res.json();
            if (data.data) {
                setFormData({
                    ...data.data,
                    // Asegurar que los arrays existan
                    images: data.data.images || [],
                    variants: data.data.variants || []
                });
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching product:', error);
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked :
            type === 'number' ? parseFloat(value) : value;

        setFormData((prev: ProductFormData) => {
            const updated = { ...prev, [name]: finalValue };

            // Autogenerar slug si el nombre cambia y no estamos editando (o si el slug estaba vacío)
            if (name === 'name' && (!prev.slug || !isEditing)) {
                updated.slug = String(finalValue)
                    .toLowerCase()
                    .replace(/ /g, '-')
                    .replace(/[^\w-]+/g, '');
            }
            return updated;
        });
    };

    const handleImageAdd = () => {
        const url = prompt('Ingresa la URL de la imagen:');
        if (url) {
            setFormData((prev: ProductFormData) => ({
                ...prev,
                images: [...prev.images, url]
            }));
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setLoading(true);
            const publicUrl = await uploadImage(file);

            setFormData((prev: ProductFormData) => ({
                ...prev,
                images: [...prev.images, publicUrl]
            }));

        } catch (error) {
            console.error('Error uploading image:', error);
            showToast('Error al subir imagen', 'error');
        } finally {
            setLoading(false);
            // Reset input
            e.target.value = '';
        }
    };

    const handleImageRemove = (index: number) => {
        setFormData((prev: ProductFormData) => ({
            ...prev,
            images: prev.images.filter((_, i: number) => i !== index)
        }));
    };

    const handleVariantAdd = () => {
        const newVariant = {
            id: Math.random().toString(36).substring(2, 9),
            name: '',
            type: 'color',
            value: '#000000',
            stock_quantity: 0,
            inStock: true
        };
        setFormData(prev => ({
            ...prev,
            variants: [...prev.variants, newVariant]
        }));
    };

    const handleVariantRemove = (id: string) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.filter((v: Variant) => v.id !== id)
        }));
    };

    const handleVariantChange = (id: string, field: string, value: string | number | boolean) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.map((v: Variant) =>
                v.id === id ? { ...v, [field]: value } as Variant : v
            )
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const url = isEditing ? `/api/products/${productId}` : '/api/products';
            const method = isEditing ? 'PUT' : 'POST';

            // Limpiar payload: solo enviar campos permitidos que están en la tabla
            const payload = { ...formData } as unknown as Record<string, unknown>;
            delete payload.id;
            delete payload.created_at;
            delete payload.updated_at;
            delete payload.rating;
            delete payload.review_count;

            // Asegurar tipos correctos para la base de datos
            payload.price = parseFloat(String(payload.price)) || 0;
            payload.compare_at_price = payload.compare_at_price ? parseFloat(String(payload.compare_at_price)) : null;
            payload.stock_quantity = parseInt(String(payload.stock_quantity)) || 0;

            // Limpiar variantes para asegurar que tengan el formato correcto
            if (payload.variants && Array.isArray(payload.variants)) {
                payload.variants = payload.variants.map((v: unknown) => {
                    const variant = v as Variant;
                    return {
                        id: variant.id || Math.random().toString(36).substring(2, 9),
                        name: variant.name || 'Sin nombre',
                        type: variant.type || 'color',
                        value: variant.value || '',
                        stock_quantity: parseInt(String(variant.stock_quantity)) || 0,
                        inStock: (parseInt(String(variant.stock_quantity)) || 0) > 0
                    };
                });
            }

            const res = await fetchWithCsrf(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                router.push('/admin/productos');
            } else {
                const error = await res.json();
                showToast(error.error || 'Error al guardar el producto. Revisa los datos.', 'error');
            }
        } catch (error) {
            console.error('Error saving product:', error);
            showToast('Error de conexión o datos inválidos', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-neutral-900">
                        {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
                    </h1>
                    <p className="text-neutral-500">Completa los detalles para tu catálogo.</p>
                </div>
                <Button variant="outline" onClick={() => router.back()} leftIcon={<X className="w-5 h-5" />}>
                    Cancelar
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Info */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <div className="p-6 space-y-4">
                                <h2 className="text-lg font-bold text-neutral-900 mb-4">Información General</h2>
                                <Input
                                    label="Nombre del Producto"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="Ej. Labial Mate Ruby Glam"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Slug"
                                        name="slug"
                                        value={formData.slug}
                                        onChange={handleChange}
                                        required
                                        placeholder="labial-mate-ruby"
                                    />
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-neutral-700">Categoría</label>
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="maquillaje">Maquillaje</option>
                                            <option value="ropa">Ropa</option>
                                            <option value="accesorios">Accesorios</option>
                                            <option value="skincare">Skincare</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Subcategory dropdown - only show for makeup */}
                                {formData.category === 'maquillaje' && (
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-neutral-700">
                                            Subcategoría de Maquillaje <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="subcategory"
                                            value={formData.subcategory}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                        >
                                            <option value="">Seleccionar tipo de maquillaje...</option>
                                            <optgroup label="Rostro">
                                                <option value="rubores">Rubores</option>
                                                <option value="brochas">Brochas</option>
                                                <option value="piel">Piel</option>
                                                <option value="polvos">Polvos</option>
                                                <option value="contornos">Contornos</option>
                                                <option value="bases">Bases</option>
                                                <option value="correctores">Correctores</option>
                                                <option value="fijadores">Fijadores</option>
                                                <option value="iluminadores">Iluminadores</option>
                                            </optgroup>
                                            <optgroup label="Ojos">
                                                <option value="lapiz-de-ojos">Lápiz de Ojos</option>
                                                <option value="delineadores">Delineadores</option>
                                                <option value="paletas-de-sombras">Paletas de Sombras</option>
                                                <option value="pestanas-y-pestaninas">Pestañas y Pestañinas</option>
                                                <option value="pigmentos">Pigmentos</option>
                                            </optgroup>
                                            <optgroup label="Labios y Cejas">
                                                <option value="labios">Labios</option>
                                                <option value="cejas">Cejas</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-neutral-700">Descripción</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows={4}
                                        className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none"
                                        placeholder="Describe las características y beneficios del producto..."
                                    />
                                </div>
                            </div>
                        </Card>

                        {/* Inventory & Pricing */}
                        <Card>
                            <div className="p-6 space-y-4">
                                <h2 className="text-lg font-bold text-neutral-900 mb-4">Precio e Inventario</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Precio Actual"
                                        name="price"
                                        type="number"
                                        value={formData.price}
                                        onChange={handleChange}
                                        required
                                        placeholder="0.00"
                                    />
                                    <Input
                                        label="Precio Comparación (Opcional)"
                                        name="compare_at_price"
                                        type="number"
                                        value={formData.compare_at_price || ''}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Cantidad en Stock"
                                        name="stock_quantity"
                                        type="number"
                                        value={formData.stock_quantity}
                                        onChange={handleChange}
                                        required
                                        placeholder="0"
                                    />
                                    <div className="space-y-1 flex flex-col justify-end pb-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="in_stock"
                                                checked={formData.in_stock}
                                                onChange={handleChange}
                                                className="w-4 h-4 text-primary-600 rounded"
                                            />
                                            <span className="text-sm font-medium text-neutral-700">Producto disponible</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Variants Management */}
                        <Card>
                            <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-neutral-900">Variantes (Colores, Tonos, Tallas)</h2>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleVariantAdd}
                                        leftIcon={<Plus className="w-4 h-4" />}
                                    >
                                        Agregar Variante
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {formData.variants.length === 0 ? (
                                        <div className="text-center py-8 border-2 border-dashed border-neutral-100 rounded-2xl text-neutral-400">
                                            No hay variantes configuradas para este producto.
                                        </div>
                                    ) : (
                                        formData.variants.map((variant: Variant) => {
                                            return (
                                                <div key={variant.id} className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                                                        <div className="lg:col-span-1">
                                                            <label className="text-xs font-semibold text-neutral-500 uppercase mb-1 block">Tipo</label>
                                                            <select
                                                                value={variant.type}
                                                                onChange={(e) => handleVariantChange(variant.id, 'type', e.target.value)}
                                                                className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                                            >
                                                                <option value="color">Color</option>
                                                                <option value="shade">Tono (Maquillaje)</option>
                                                                <option value="size">Talla</option>
                                                            </select>
                                                        </div>
                                                        <div className="lg:col-span-1">
                                                            <label className="text-xs font-semibold text-neutral-500 uppercase mb-1 block">Nombre</label>
                                                            <input
                                                                type="text"
                                                                value={variant.name}
                                                                onChange={(e) => handleVariantChange(variant.id, 'name', e.target.value)}
                                                                placeholder="Ej. Rojo Pasión"
                                                                className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                                            />
                                                        </div>
                                                        <div className="lg:col-span-1">
                                                            <label className="text-xs font-semibold text-neutral-500 uppercase mb-1 block">
                                                                {(variant.type === 'color' || variant.type === 'shade') ? 'Color' : 'Valor'}
                                                            </label>
                                                            <div className="flex gap-2">
                                                                {(variant.type === 'color' || variant.type === 'shade') ? (
                                                                    <input
                                                                        type="color"
                                                                        value={variant.value}
                                                                        onChange={(e) => handleVariantChange(variant.id, 'value', e.target.value)}
                                                                        className="w-10 h-10 p-1 bg-white border border-neutral-200 rounded-lg cursor-pointer"
                                                                    />
                                                                ) : (
                                                                    <input
                                                                        type="text"
                                                                        value={variant.value}
                                                                        onChange={(e) => handleVariantChange(variant.id, 'value', e.target.value)}
                                                                        placeholder="Ej. L"
                                                                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                                                    />
                                                                )}
                                                                {(variant.type === 'color' || variant.type === 'shade') && (
                                                                    <input
                                                                        type="text"
                                                                        value={variant.value}
                                                                        onChange={(e) => handleVariantChange(variant.id, 'value', e.target.value)}
                                                                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-primary-500 outline-none"
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="lg:col-span-1">
                                                            <label className="text-xs font-semibold text-neutral-500 uppercase mb-1 block">Stock</label>
                                                            <input
                                                                type="number"
                                                                value={variant.stock_quantity}
                                                                onChange={(e) => handleVariantChange(variant.id, 'stock_quantity', parseInt(e.target.value))}
                                                                className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                                            />
                                                        </div>
                                                        <div className="flex justify-end pb-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleVariantRemove(variant.id)}
                                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Media & Settings */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <div className="p-6 space-y-4">
                                <h2 className="text-lg font-bold text-neutral-900 mb-4">Imágenes</h2>
                                <div className="grid grid-cols-2 gap-2">
                                    {formData.images.map((img: string, i: number) => (
                                        <div key={i} className="group relative aspect-square bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200">
                                            <div className="relative w-full h-full">
                                                <Image
                                                    src={img}
                                                    alt={`Product image ${i + 1}`}
                                                    fill
                                                    sizes="(max-width: 768px) 50vw, 33vw"
                                                    className="object-cover"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleImageRemove(i)}
                                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}

                                    {/* Upload Buttons */}
                                    <div className="aspect-square flex flex-col gap-2">
                                        <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 rounded-lg text-neutral-400 hover:border-primary-500 hover:text-primary-500 transition-all cursor-pointer">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleFileUpload}
                                                disabled={loading}
                                            />
                                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                                            <span className="text-xs mt-1">Subir</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleImageAdd}
                                            className="h-8 flex items-center justify-center border border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50 text-xs"
                                        >
                                            URL
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <div className="p-6 space-y-4">
                                <h2 className="text-lg font-bold text-neutral-900 mb-4">Configuración</h2>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 cursor-pointer p-3 border border-neutral-100 rounded-xl hover:bg-neutral-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            name="featured"
                                            checked={formData.featured}
                                            onChange={handleChange}
                                            className="w-4 h-4 text-primary-600 rounded"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-neutral-900">Destacado</p>
                                            <p className="text-xs text-neutral-500">Mostrar en la página de inicio</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer p-3 border border-neutral-100 rounded-xl hover:bg-neutral-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            name="is_new"
                                            checked={formData.is_new}
                                            onChange={handleChange}
                                            className="w-4 h-4 text-primary-600 rounded"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-neutral-900">Nuevo</p>
                                            <p className="text-xs text-neutral-500">Marcar como novedad</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </Card>

                        <div className="sticky top-24 pt-4">
                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                className="w-full h-14"
                                isLoading={isSaving}
                                leftIcon={<Save className="w-6 h-6" />}
                            >
                                {isEditing ? 'Guardar Cambios' : 'Publicar Producto'}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
