import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import ProductClient from './ProductClient';
import type { Product } from '@/types';

interface Props {
    params: { slug: string };
}

// Generar Metadatos Dinámicos para SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { data: product } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('slug', params.slug)
        .single();

    if (!product) {
        return {
            title: 'Producto no encontrado | Michell Cantero Store',
        };
    }

    const title = `${product.name} | Michell Cantero Store`;
    const description = product.description || `Compra ${product.name} al mejor precio en Michell Cantero Store.`;
    const image = product.images?.[0] || '/og-image.jpg';

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: [image],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [image],
        },
    };
}

export default async function ProductPage({ params }: Props) {
    // Fetch product
    const { data: product } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('slug', params.slug)
        .single();

    if (!product) {
        notFound();
    }

    // Fetch related products
    const { data: relatedProducts } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('category', product.category)
        .neq('id', product.id)
        .limit(4);

    // Fetch reviews
    const { data: reviews } = await supabaseAdmin
        .from('reviews')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false });

    return (
        <ProductClient
            initialProduct={product as Product}
            relatedProducts={(relatedProducts || []) as Product[]}
            initialReviews={reviews || []}
        />
    );
}
