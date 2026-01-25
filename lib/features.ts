/**
 * Context-Aware Feature Flags System
 * Supports user-based, role-based, and percentage-based rollouts
 */

export interface User {
    id: string;
    email?: string;
    role?: 'admin' | 'customer';
}

export interface FeatureContext {
    user?: User;
    environment?: 'development' | 'production';
}

/**
 * Feature flag definitions with context-aware logic
 */
export const features = {
    /**
     * New checkout flow
     * Rollout: Admin only initially, then gradual rollout
     */
    newCheckoutFlow: (context?: FeatureContext): boolean => {
        const enabled = process.env.NEXT_PUBLIC_ENABLE_NEW_CHECKOUT === 'true';
        if (!enabled) return false;

        // Admin always gets new features
        if (context?.user?.role === 'admin') return true;

        // Gradual rollout: 10% of users
        if (context?.user?.id) {
            const hash = hashString(context.user.id);
            return hash % 100 < 10; // 10% rollout
        }

        return false;
    },

    /**
     * Enhanced product search
     * Rollout: All users
     */
    enhancedSearch: (): boolean => {
        return process.env.NEXT_PUBLIC_ENABLE_ENHANCED_SEARCH === 'true';
    },

    /**
     * New payment provider
     * Rollout: Admin only for testing
     */
    newPaymentProvider: (context?: FeatureContext): boolean => {
        const enabled = process.env.NEXT_PUBLIC_ENABLE_NEW_PAYMENT === 'true';
        if (!enabled) return false;

        // Only for admins during testing
        return context?.user?.role === 'admin';
    },

    /**
     * Beta features
     * Rollout: Specific user IDs only
     */
    betaFeatures: (context?: FeatureContext): boolean => {
        const enabled = process.env.NEXT_PUBLIC_ENABLE_BETA === 'true';
        if (!enabled) return false;

        // Whitelist of beta testers
        const betaUserIds = (process.env.NEXT_PUBLIC_BETA_USER_IDS || '').split(',');
        return context?.user?.id ? betaUserIds.includes(context.user.id) : false;
    },
} as const;

/**
 * Simple hash function for consistent user-based rollouts
 */
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

/**
 * Check if a feature is enabled for a given context
 */
export function isFeatureEnabled(
    feature: keyof typeof features,
    context?: FeatureContext
): boolean {
    return features[feature](context);
}

/**
 * Usage examples:
 * 
 * // Simple check (no context)
 * if (isFeatureEnabled('enhancedSearch')) { ... }
 * 
 * // With user context
 * if (isFeatureEnabled('newCheckoutFlow', { user })) { ... }
 * 
 * // Direct access
 * if (features.newPaymentProvider({ user })) { ... }
 * 
 * // In component
 * const user = useAuthStore(state => state.user);
 * const showNewCheckout = features.newCheckoutFlow({ user });
 */
