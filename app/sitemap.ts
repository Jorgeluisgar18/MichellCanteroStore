import { supabaseAdmin } from '@/lib/supabase';
import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://michell-cantero-store.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Páginas estáticas
    const staticPages: MetadataRoute.Sitemap = [
        { url: siteUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
        { url: `${siteUrl}/tienda`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
        { url: `${siteUrl}/tienda/maquillaje`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
        { url: `${siteUrl}/tienda/accesorios`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
        { url: `${siteUrl}/tienda/ropa`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
        { url: `${siteUrl}/nosotros`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
        { url: `${siteUrl}/contacto`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ];

    // Páginas de productos (dinámicas desde la BD)
    const { data: products } = await supabaseAdmin
        .from('products')
        .select('slug, updated_at')
        .eq('in_stock', true);

    const productPages: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
        url: `${siteUrl}/producto/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
    }));

    return [...staticPages, ...productPages];
}
