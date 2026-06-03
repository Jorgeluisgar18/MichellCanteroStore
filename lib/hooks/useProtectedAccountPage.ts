'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export function useProtectedAccountPage(redirectPath: string) {
    const router = useRouter();
    const { user, isAuthenticated, checkSession } = useAuthStore();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const verifySession = async () => {
            await checkSession();
            if (isMounted) {
                setIsCheckingAuth(false);
            }
        };

        verifySession();

        return () => {
            isMounted = false;
        };
    }, [checkSession]);

    useEffect(() => {
        if (!isCheckingAuth && (!isAuthenticated || !user)) {
            router.replace(`/cuenta/login?redirect=${encodeURIComponent(redirectPath)}`);
        }
    }, [isCheckingAuth, isAuthenticated, redirectPath, router, user]);

    return {
        user,
        isAuthenticated,
        isCheckingAuth,
    };
}
