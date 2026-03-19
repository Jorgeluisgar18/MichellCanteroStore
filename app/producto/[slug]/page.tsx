import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import ProductClient from './ProductClient';
import type { Product } from '@/types';

interface Props {
    params: { slug: string };
}

import { cache } from 'react';

// ✅ Cache data fetch to prevent double queries (generateMetadata + ProductPage)
const getProduct = cache(async (slug: string) => {
    const { data } = await supabaseAdmin
        .from('products')
        .select('id, name, slug, description, price, compare_at_price, images, category, subcategory, brand, in_stock, stock_quantity, variants, tags, featured, is_new, rating, review_count')
        .eq('slug', slug)
        .single();
    return data as Product | null;
});

// Generar Metadatos Dinámicos para SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const product = await getProduct(params.slug);

    if (!product) {
        return {
            title: 'Producto no encontrado | Michell Cantero Store',
        };
    }

    const title = `${product.name} | Michell Cantero Store`;
    const description = product.description 
        ? product.description.slice(0, 160) 
        : `Compra ${product.name} al mejor precio en Michell Cantero Store.`;
    
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://michell-cantero-store.vercel.app';
    const image = product.images?.[0] || `${siteUrl}/og-image.jpg`;

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
    const product = await getProduct(params.slug);

    if (!product) {
        notFound();
    }

    // Fetch related products and reviews in parallel
    const [relatedResult, reviewsResult] = await Promise.all([
        supabaseAdmin
            .from('products')
            .select('id, name, slug, price, images, category, in_stock, stock_quantity, rating, review_count')
            .eq('category', product.category)
            .neq('id', product.id)
            .limit(4),
        supabaseAdmin
            .from('reviews')
            .select('*')
            .eq('product_id', product.id)
            .order('created_at', { ascending: false })
    ]);

    // ✅ Schema.org Product for Rich Results
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        image: product.images ?? [],
        brand: { '@type': 'Brand', name: product.brand || 'Michell Cantero Store' },
        offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: 'COP',
            availability: product.in_stock
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            seller: { '@type': 'Organization', name: 'Michell Cantero Store' },
            url: `${process.env.NEXT_PUBLIC_SITE_URL}/producto/${product.slug}`,
        },
        ...(product.rating && {
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: product.rating,
                reviewCount: product.review_count || 0,
                bestRating: 5,
                worstRating: 1,
            },
        }),
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ProductClient
                initialProduct={product}
                relatedProducts={(relatedResult.data || []) as Product[]}
                initialReviews={reviewsResult.data || []}
            />
        </>
    );
}
