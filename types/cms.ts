/**
 * CMS - Page Content types
 */

export type PageName = 'home' | 'nosotros' | 'tienda' | 'categorias' | 'global' | 'contacto';

export interface PageContent {
    id: string;
    page: PageName;
    section: string;
    key: string;
    value: string | null;
    image_url: string | null;
    updated_at: string;
}

/**
 * Helper map: { [section_key]: PageContent }
 */
export type PageContentMap = Record<string, PageContent>;

/**
 * Shape of the content editor fields used in the admin UI
 */
export interface ContentField {
    section: string;
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'image';
    placeholder?: string;
}
