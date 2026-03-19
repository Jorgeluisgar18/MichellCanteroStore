import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://michell-cantero-store.vercel.app';
    
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/api/', '/cuenta/', '/checkout/confirmacion'],
        },
        sitemap: `${siteUrl}/sitemap.xml`,
    };
}
