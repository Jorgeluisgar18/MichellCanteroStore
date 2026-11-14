'use client';

import { useEffect, useState } from 'react';
import { useCartStore } from '../../store/cartStore';
import { CART_STORAGE_KEY, synchronizeCartStorage } from './cart-session';

export function useCartSession(onError?: (message: string) => void): boolean {
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => {
        const persistence = useCartStore.persist;
        if (!persistence) {
            onError?.('El almacenamiento del navegador no está disponible. No se iniciará el pago.');
            setHydrated(true);
            return;
        }
        let active = true;
        const refresh = () => {
            if (!active || !persistence.hasHydrated()) return;
            try { synchronizeCartStorage(window.localStorage, useCartStore); }
            catch (error) { onError?.(error instanceof Error ? error.message : 'No pudimos verificar el carrito.'); }
            setHydrated(true);
        };
        const stopHydrating = persistence.onHydrate(() => { if (active) setHydrated(false); });
        const stopHydrated = persistence.onFinishHydration(refresh);
        const storage = (event: StorageEvent) => { if (event.key === CART_STORAGE_KEY || event.key === null) refresh(); };
        window.addEventListener('storage', storage);
        window.addEventListener('pageshow', refresh);
        refresh();
        if (!persistence.hasHydrated()) {
            const failed = () => {
                if (!active) return;
                onError?.('No pudimos cargar el carrito guardado. No se iniciará el pago hasta verificarlo.');
                setHydrated(true);
            };
            Promise.resolve(persistence.rehydrate()).then(() => {
                if (!active) return;
                if (persistence.hasHydrated()) refresh(); else failed();
            }, failed);
        }
        return () => {
            active = false; stopHydrating(); stopHydrated();
            window.removeEventListener('storage', storage);
            window.removeEventListener('pageshow', refresh);
        };
    }, [onError]);
    return hydrated;
}
