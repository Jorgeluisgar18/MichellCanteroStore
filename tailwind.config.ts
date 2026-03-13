import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#fdf2f8',
                    100: '#fce7f3',
                    200: '#fbcfe8',
                    300: '#f9a8d4',
                    400: '#f472b6',
                    500: '#E8558A', // Rosa principal
                    600: '#db2777',
                    700: '#be185d',
                    800: '#9d174d',
                    900: '#831843',
                    950: '#500724',
                },
                secondary: {
                    50: '#f8f7fb',
                    100: '#f1f0f7',
                    200: '#e3e1f0',
                    300: '#cfcae6',
                    400: '#bface0', // Lavanda principal
                    500: '#9b8bcb',
                    600: '#7d6ba9',
                    700: '#625189',
                    800: '#4a3d69',
                    900: '#352c4a',
                    950: '#1d1929',
                },
                accent: {
                    gold: '#D4AF37',
                    light: '#E5D5B0',
                    rose: '#E4777C',
                },
                neutral: {
                    50: '#fafafa',
                    100: '#f5f5f5',
                    200: '#e5e5e5',
                    300: '#d4d4d4',
                    400: '#a3a3a3',
                    500: '#737373',
                    600: '#525252',
                    700: '#404040',
                    800: '#262626',
                    900: '#212326', // Gris oscuro principal
                    950: '#0a0a0a',
                },
            },
            fontFamily: {
                sans: ['var(--font-jost)', 'system-ui', 'sans-serif'],
                display: ['var(--font-cabin)', 'system-ui', 'sans-serif'],
                script: ['var(--font-script)', 'cursive'],
            },
            animation: {
                'fade-in': 'fadeIn 0.6s ease-in-out',
                'fade-up': 'fadeUp 0.6s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
                'scale-in': 'scaleIn 0.3s ease-out',
                'scroll': 'marqueeScroll 35s linear infinite',
                'scroll-reverse': 'marqueeScrollReverse 35s linear infinite',
                'hero-fade': 'heroFade 0.9s ease-in-out',
                'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                'float': 'float 3s ease-in-out infinite',
                'gradient-shift': 'gradientShift 6s ease infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeUp: {
                    '0%': { opacity: '0', transform: 'translateY(30px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.95)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                heroFade: {
                    '0%': { opacity: '0', transform: 'scale(1.04)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                marqueeScroll: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                marqueeScrollReverse: {
                    '0%': { transform: 'translateX(-50%)' },
                    '100%': { transform: 'translateX(0)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                gradientShift: {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                },
            },
            boxShadow: {
                'soft': '0 2px 15px -3px rgba(0,0,0,0.07), 0 10px 20px -2px rgba(0,0,0,0.04)',
                'medium': '0 4px 25px -5px rgba(0,0,0,0.1),  0 10px 30px -5px rgba(0,0,0,0.08)',
                'strong': '0 10px 40px -10px rgba(0,0,0,0.15), 0 20px 50px -10px rgba(0,0,0,0.12)',
                'coral': '0 8px 30px -5px rgba(232,85,138,0.35)',
            },
            transitionTimingFunction: {
                'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
            },
        },
    },
    plugins: [],
};

export default config;
