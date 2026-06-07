import { supabaseAdmin } from '@/lib/supabase';
import { getCatalogCategories } from '@/lib/catalog/taxonomy';
import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://michell-cantero-store.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticPages: MetadataRoute.Sitemap = [
        { url: siteUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
        { url: `${siteUrl}/tienda`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
        { url: `${siteUrl}/nosotros`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
        { url: `${siteUrl}/contacto`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ];

    const categoryPages: MetadataRoute.Sitemap = getCatalogCategories().map((category) => ({
        url: `${siteUrl}/tienda/${category.slug}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
    }));

    const { data: products } = await supabaseAdmin
        .from('products')
        .select('slug, updated_at')
        .eq('in_stock', true);

    const productPages: MetadataRoute.Sitemap = (products ?? []).map((product) => ({
        url: `${siteUrl}/producto/${product.slug}`,
        lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
    }));

    return [...staticPages, ...categoryPages, ...productPages];
}
