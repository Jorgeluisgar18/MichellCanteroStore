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
                    50: '#fdf2f4',
                    100: '#fce6ea',
                    200: '#f9d1d8',
                    300: '#f4b5b5',
                    400: '#ec8c9a',
                    500: '#f4b5b5', // Main Pink
                    600: '#d12d74',
                    700: '#b31f5c',
                    800: '#941d4d',
                    900: '#7c1d43',
                    950: '#4b0b25',
                },
                secondary: {
                    50: '#f8f7fb',
                    100: '#f1f0f7',
                    200: '#e3e1f0',
                    300: '#cfcae6',
                    400: '#bface0', // Main Lavender
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
                    blue: '#ADD8E6', // Heart blue
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
                    900: '#171717',
                    950: '#0a0a0a',
                },
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
                display: ['var(--font-playfair)', 'serif'],
                script: ['var(--font-script)', 'cursive'],
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-in-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
                'scale-in': 'scaleIn 0.3s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
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
            },
            boxShadow: {
                'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
                'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 30px -5px rgba(0, 0, 0, 0.08)',
                'strong': '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 20px 50px -10px rgba(0, 0, 0, 0.12)',
            },
        },
    },
    plugins: [],
};

export default config;
