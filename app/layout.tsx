import type { Metadata } from 'next';
import { Inter, Playfair_Display, Great_Vibes } from 'next/font/google';
import './globals.css';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
});

const playfair = Playfair_Display({
    subsets: ['latin'],
    variable: '--font-playfair',
    display: 'swap',
});

const greatVibes = Great_Vibes({
    weight: '400',
    subsets: ['latin'],
    variable: '--font-script',
    display: 'swap',
});


export const metadata: Metadata = {
    title: 'Michell Cantero Store - Maquillaje, Accesorios y Ropa Femenina',
    description: 'Descubre las últimas tendencias en maquillaje, accesorios y ropa femenina. Envíos a toda Colombia. Calidad y estilo garantizados.',
    keywords: ['maquillaje', 'accesorios', 'ropa femenina', 'belleza', 'moda', 'Colombia'],
    authors: [{ name: 'Michell Cantero Store' }],
    openGraph: {
        type: 'website',
        locale: 'es_CO',
        url: 'https://michellcanterostore.com',
        siteName: 'Michell Cantero Store',
        title: 'Michell Cantero Store - Maquillaje, Accesorios y Ropa Femenina',
        description: 'Descubre las últimas tendencias en maquillaje, accesorios y ropa femenina.',
        images: [
            {
                url: '/og-image.jpg',
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
    },
    robots: {
        index: true,
        follow: true,
    },
};

import ErrorBoundary from '@/components/common/ErrorBoundary';

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" className={`${inter.variable} ${playfair.variable} ${greatVibes.variable}`}>
            <body className="font-sans">
                <ErrorBoundary>
                    {children}
                </ErrorBoundary>
            </body>
        </html>
    );
}
