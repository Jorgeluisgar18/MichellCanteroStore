'use client';

import { Suspense } from 'react';
import ProductFormPage from '../../nuevo/page';

export default function EditProductPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <ProductFormPage />
        </Suspense>
    );
}
