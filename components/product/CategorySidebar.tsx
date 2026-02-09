'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import type { Subcategory } from '@/types';

interface CategorySidebarProps {
    subcategories: Subcategory[];
    categorySlug: string;
}

export default function CategorySidebar({ subcategories, categorySlug }: CategorySidebarProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentSubcategory = searchParams.get('subcategory');

    const handleSubcategoryClick = (subcategorySlug: string) => {
        if (currentSubcategory === subcategorySlug) {
            // Si ya está seleccionada, la deseleccionamos
            router.push(`/tienda/${categorySlug}`);
        } else {
            router.push(`/tienda/${categorySlug}?subcategory=${subcategorySlug}`);
        }
    };

    const handleClearFilter = () => {
        router.push(`/tienda/${categorySlug}`);
    };

    return (
        <Card className="sticky top-24 h-fit max-h-[calc(100vh-7rem)]">
            <div className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h3 className="text-lg font-display font-bold text-neutral-900">
                        Maquillaje ({subcategories.length})
                    </h3>
                    {currentSubcategory && (
                        <button
                            onClick={handleClearFilter}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
                        >
                            Limpiar
                        </button>
                    )}
                </div>

                <div className="space-y-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-neutral-100 max-h-[calc(100vh-14rem)]">
                    {subcategories.map((subcategory) => {
                        const isActive = currentSubcategory === subcategory.slug;
                        return (
                            <button
                                key={subcategory.id}
                                onClick={() => handleSubcategoryClick(subcategory.slug)}
                                className={`w-full text-left px-4 py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-primary-500 text-white font-semibold shadow-md'
                                    : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100 font-medium'
                                    }`}
                            >
                                {subcategory.name}
                            </button>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
}
