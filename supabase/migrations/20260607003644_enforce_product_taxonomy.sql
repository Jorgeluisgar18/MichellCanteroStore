-- Keep product categories aligned with the public storefront taxonomy.
-- This prevents admin/API writes from creating products that appear in "all"
-- products but have no navigable category page.

alter table public.products
drop constraint if exists products_category_public_taxonomy_check;

alter table public.products
add constraint products_category_public_taxonomy_check
check (
    category in ('maquillaje', 'accesorios', 'ropa', 'corporal', 'skincare')
    and (
        subcategory is null
        or (
            category = 'maquillaje'
            and subcategory in (
                'rubores',
                'brochas',
                'piel',
                'polvos',
                'contornos',
                'lapiz-de-ojos',
                'labios',
                'bases',
                'correctores',
                'cejas',
                'delineadores',
                'fijadores',
                'iluminadores',
                'paletas-de-sombras',
                'pestanas-y-pestaninas',
                'pigmentos'
            )
        )
        or (
            category = 'accesorios'
            and subcategory in (
                'joyeria',
                'brochas',
                'pestanas-y-pestaninas'
            )
        )
        or (
            category = 'ropa'
            and subcategory in (
                'blusas',
                'vestidos'
            )
        )
        or (
            category = 'skincare'
            and subcategory in (
                'piel'
            )
        )
    )
);
