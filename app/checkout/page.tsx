// Server Component wrapper - this enables dynamic rendering
export const dynamic = 'force-dynamic';

import CheckoutClient from './CheckoutClient';

export default function CheckoutPage() {
    return <CheckoutClient />;
}
