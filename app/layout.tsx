import type { Metadata } from 'next';
import { Jost, Cabin, Great_Vibes } from 'next/font/google';
import './globals.css';

const jost = Jost({
    subsets: ['latin'],
    variable: '--font-jost',
    display: 'swap',
});

const cabin = Cabin({
    subsets: ['latin'],
    variable: '--font-cabin',
    display: 'swap',
});

const greatVibes = Great_Vibes({
    weight: '400',
    subsets: ['latin'],
    variable: '--font-script',
    display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://michell-cantero-store.vercel.app';
const ogImageUrl = `${siteUrl}/og-image.jpg`;

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: 'Michell Cantero Store - Maquillaje, Accesorios y Ropa Femenina',
        template: '%s | Michell Cantero Store',
    },
    description: 'Descubre las últimas tendencias en maquillaje, accesorios y ropa femenina. Envíos a toda Colombia. Calidad y estilo garantizados.',
    keywords: ['maquillaje', 'accesorios', 'ropa femenina', 'belleza', 'moda', 'Colombia', 'Ciénaga', 'Magdalena'],
    authors: [{ name: 'Michell Cantero Store' }],
    openGraph: {
        type: 'website',
        locale: 'es_CO',
        url: siteUrl,
        siteName: 'Michell Cantero Store',
        title: 'Michell Cantero Store - Maquillaje, Accesorios y Ropa Femenina',
        description: 'Descubre las últimas tendencias en maquillaje, accesorios y ropa femenina.',
        images: [
            {
                url: ogImageUrl,
                width: 1200,
                height: 630,
                alt: 'Michell Cantero Store',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Michell Cantero Store',
        description: 'Maquillaje, Accesorios y Ropa Femenina',
        images: [ogImageUrl],
    },
    robots: {
        index: true,
        follow: true,
    },
    alternates: {
        canonical: './',
    },
};

import ErrorBoundary from '@/components/common/ErrorBoundary';
import { ToastProvider } from '@/components/ui/Toast';

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" className={`${jost.variable} ${cabin.variable} ${greatVibes.variable}`}>
            <body className="font-sans">
                <ToastProvider>
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
                </ToastProvider>
            </body>
        </html>
    );
}
