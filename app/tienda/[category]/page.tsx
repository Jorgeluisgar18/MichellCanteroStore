import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import categoriesData from '@/data/categories.json';
import CategoryClient from './CategoryClient';
import type { Category, Product } from '@/types';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ category: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
    const { category: slug } = await params;
    const category = (categoriesData as Category[]).find(c => c.slug === slug);
    
    if (!category) return { title: 'Categoría no encontrada' };

    return {
        title: `${category.name} | Michell Cantero Store`,
        description: category.description || `Explora nuestra colección de ${category.name}`,
        openGraph: {
            title: `${category.name} | Michell Cantero Store`,
            description: category.description,
            images: [category.image || '/og-image.jpg'],
        }
    };
}

async function getProducts(category: string) {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .ilike('category', category)
        .order('created_at', { ascending: false })
        .limit(2000);

    if (error) {
        console.error('Error fetching products:', error);
        return [];
    }
    return data as Product[];
}

export default async function CategoryPage({ params }: Omit<PageProps, 'searchParams'>) {
    const { category: categorySlug } = await params;
    const category = (categoriesData as Category[]).find(c => c.slug === categorySlug);

    if (!category) {
        notFound();
    }

    const initialProducts = await getProducts(categorySlug);

    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
            <CategoryClient 
                category={category} 
                initialProducts={initialProducts} 
                categorySlug={categorySlug} 
            />
        </Suspense>
    );
}
