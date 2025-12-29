// Server Component wrapper - this enables dynamic rendering
export const dynamic = 'force-dynamic';

import CarritoClient from './CarritoClient';

export default function CarritoPage() {
    return <CarritoClient />;
}
