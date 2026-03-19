/**
 * Centralized business configuration for Michell Cantero Store
 */
export const STORE_CONFIG = {
    // Threshold for free shipping in COP
    FREE_SHIPPING_THRESHOLD: 200_000,
    
    // Default shipping costs
    DEFAULT_SHIPPING_COST: 12_000,
    
    // Specific rates by location
    SHIPPING_RATES: {
        'cienaga': 5_000,
        'santa-marta': 10_000,
        'resto-colombia': 16_000,
    } as Record<string, number>,
    
    // Localization
    CURRENCY: 'COP',
    LOCALE: 'es-CO',
    
    // Contact information
    STORE_WHATSAPP: '+573113633618',
    STORE_INSTAGRAM: 'michellcanterostore',
    
    // SEO Defaults
    SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://michell-cantero-store.vercel.app',
} as const;
