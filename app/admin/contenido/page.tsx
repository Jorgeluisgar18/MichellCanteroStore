'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Image from 'next/image';
import {
    ImageIcon,
    Type,
    Save,
    Upload,
    CheckCircle,
    AlertCircle,
    Loader2,
    Globe,
    Home,
    Users,
    ShoppingBag,
    Mail,
    X,
} from 'lucide-react';
import type { PageContent, PageName } from '@/types';
import { fetchWithCsrf } from '@/lib/hooks/useCsrfToken';

// ─────────────────────────────────────────────
// Content schema — defines every editable field
// ─────────────────────────────────────────────
interface FieldDef {
    section: string;
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'image';
    placeholder?: string;
    maxLength?: number;
}

const PAGE_FIELDS: Record<PageName, FieldDef[]> = {
    home: [
        // ── Hero Slide 1 ──
        { section: 'hero_slide_1', key: 'image_url', label: 'Hero Slide 1 – Imagen', type: 'image' },
        { section: 'hero_slide_1', key: 'title', label: 'Hero Slide 1 – Título', type: 'text', placeholder: 'Eleva tu\nbelleza única', maxLength: 60 },
        { section: 'hero_slide_1', key: 'subtitle', label: 'Hero Slide 1 – Subtítulo', type: 'textarea', placeholder: 'En Michell Cantero Store...', maxLength: 180 },
        { section: 'hero_slide_1', key: 'cta_text', label: 'Hero Slide 1 – Texto botón', type: 'text', placeholder: 'Comprar Ahora', maxLength: 40 },

        // ── Hero Slide 2 ──
        { section: 'hero_slide_2', key: 'image_url', label: 'Hero Slide 2 – Imagen', type: 'image' },
        { section: 'hero_slide_2', key: 'title', label: 'Hero Slide 2 – Título', type: 'text', placeholder: 'Nueva\nColección', maxLength: 60 },
        { section: 'hero_slide_2', key: 'subtitle', label: 'Hero Slide 2 – Subtítulo', type: 'textarea', placeholder: 'Descubre los últimos productos...', maxLength: 180 },
        { section: 'hero_slide_2', key: 'cta_text', label: 'Hero Slide 2 – Texto botón', type: 'text', placeholder: 'Ver Colección', maxLength: 40 },

        // ── Hero Slide 3 ──
        { section: 'hero_slide_3', key: 'image_url', label: 'Hero Slide 3 – Imagen', type: 'image' },
        { section: 'hero_slide_3', key: 'title', label: 'Hero Slide 3 – Título', type: 'text', placeholder: 'Maquillaje\nde élite', maxLength: 60 },
        { section: 'hero_slide_3', key: 'subtitle', label: 'Hero Slide 3 – Subtítulo', type: 'textarea', placeholder: 'Las mejores marcas...', maxLength: 180 },
        { section: 'hero_slide_3', key: 'cta_text', label: 'Slide 3 – Texto Botón', type: 'text', placeholder: 'Explorar Marcas', maxLength: 40 },

        { section: 'welcome', key: 'badge', label: 'Sección Bienvenida – Badge', type: 'text', placeholder: 'Nuestra Promesa', maxLength: 40 },
        { section: 'welcome', key: 'title', label: 'Sección Bienvenida – Título', type: 'text', placeholder: 'Todo lo que amas...', maxLength: 100 },
        { section: 'welcome', key: 'subtitle', label: 'Sección Bienvenida – Subtítulo', type: 'textarea', placeholder: 'Una colección exclusiva...', maxLength: 300 },
        { section: 'welcome', key: 'button', label: 'Sección Bienvenida – Texto Botón', type: 'text', placeholder: 'Descubrir Ahora', maxLength: 40 },

        { section: 'categories', key: 'badge', label: 'Sección Categorías – Badge', type: 'text', placeholder: 'Colecciones Exclusivas', maxLength: 40 },
        { section: 'categories', key: 'title', label: 'Sección Categorías – Título', type: 'text', placeholder: 'Explora por Categoría', maxLength: 80 },
        { section: 'categories', key: 'description', label: 'Sección Categorías – Descripción', type: 'textarea', placeholder: 'Una selección curada...', maxLength: 300 },

        // ── 16 Brands ──
        ...Array.from({ length: 16 }, (_, i) => ({
            section: `brand_${i + 1}`,
            key: 'logo_url',
            label: `Marca #${i + 1} – Logo`,
            type: 'image' as const,
        })),
    ],
    nosotros: [
        { section: 'hero', key: 'badge', label: 'Texto decorativo (bienvenida)', type: 'text', placeholder: 'bienvenida a', maxLength: 60 },
        { section: 'hero', key: 'title', label: 'Título principal', type: 'text', placeholder: 'Nuestra Historia', maxLength: 80 },
        { section: 'hero', key: 'subtitle', label: 'Subtítulo (cita)', type: 'textarea', placeholder: '"Donde la pasión…"', maxLength: 300 },
        { section: 'story', key: 'title', label: 'Título sección historia', type: 'text', placeholder: 'Del Sueño a la Realidad:', maxLength: 100 },
        { section: 'story', key: 'body1', label: 'Párrafo 1 historia', type: 'textarea', placeholder: 'Michell Cantero Store…', maxLength: 800 },
        { section: 'story', key: 'body2', label: 'Párrafo 2 historia', type: 'textarea', placeholder: 'Lo que comenzó como…', maxLength: 800 },
        { section: 'story', key: 'quote', label: 'Frase inspiracional', type: 'text', placeholder: '¡Junto a Dios…!', maxLength: 200 },
        { section: 'story', key: 'image_url', label: 'Imagen inauguración', type: 'image' },
        { section: 'founder', key: 'quote', label: 'Cita de la fundadora', type: 'textarea', placeholder: '"Cada mujer merece…"', maxLength: 400 },
        { section: 'founder', key: 'image_url', label: 'Imagen de la fundadora', type: 'image' },
        { section: 'stats', key: 'clients', label: 'Estadística: Clientas', type: 'text', placeholder: '5000+', maxLength: 20 },
        { section: 'stats', key: 'products', label: 'Estadística: Productos', type: 'text', placeholder: '+200', maxLength: 20 },
        { section: 'stats', key: 'satisfaction', label: 'Estadística: Satisfacción', type: 'text', placeholder: '98%', maxLength: 20 },
    ],
    tienda: [
        { section: 'banner', key: 'title', label: 'Título del banner de tienda', type: 'text', placeholder: 'Nuestra Tienda', maxLength: 80 },
        { section: 'banner', key: 'description', label: 'Descripción del banner', type: 'textarea', placeholder: 'Descubre todos…', maxLength: 300 },
        { section: 'banner', key: 'image_url', label: 'Imagen del banner', type: 'image' },
    ],
    categorias: [
        { section: 'cat_maquillaje', key: 'title', label: 'Maquillaje – Título banner', type: 'text', placeholder: 'Maquillaje', maxLength: 80 },
        { section: 'cat_maquillaje', key: 'description', label: 'Maquillaje – Descripción', type: 'textarea', placeholder: 'Descubre nuestra colección...', maxLength: 300 },
        { section: 'cat_maquillaje', key: 'image_url', label: 'Maquillaje – Imagen banner', type: 'image' },

        { section: 'cat_accesorios', key: 'title', label: 'Accesorios – Título banner', type: 'text', placeholder: 'Accesorios', maxLength: 80 },
        { section: 'cat_accesorios', key: 'description', label: 'Accesorios – Descripción', type: 'textarea', placeholder: 'Complementa tu look...', maxLength: 300 },
        { section: 'cat_accesorios', key: 'image_url', label: 'Accesorios – Imagen banner', type: 'image' },

        { section: 'cat_ropa', key: 'title', label: 'Ropa – Título banner', type: 'text', placeholder: 'Ropa', maxLength: 80 },
        { section: 'cat_ropa', key: 'description', label: 'Ropa – Descripción', type: 'textarea', placeholder: 'Ropa femenina elegante...', maxLength: 300 },
        { section: 'cat_ropa', key: 'image_url', label: 'Ropa – Imagen banner', type: 'image' },

        { section: 'cat_corporal', key: 'title', label: 'Corporal – Título banner', type: 'text', placeholder: 'Corporal', maxLength: 80 },
        { section: 'cat_corporal', key: 'description', label: 'Corporal – Descripción', type: 'textarea', placeholder: 'Cremas, aceites y tratamientos...', maxLength: 300 },
        { section: 'cat_corporal', key: 'image_url', label: 'Corporal – Imagen banner', type: 'image' },
    ],
    global: [
        { section: 'info', key: 'address', label: 'Dirección física', type: 'text', placeholder: 'Calle 9 #22-51, Ciénaga', maxLength: 100 },
        { section: 'info', key: 'phone', label: 'Teléfono / WhatsApp', type: 'text', placeholder: '311 363 3618', maxLength: 20 },
        { section: 'info', key: 'email', label: 'Email de contacto', type: 'text', placeholder: 'mcanterostore@gmail.com', maxLength: 60 },

        { section: 'header', key: 'top_bar', label: 'Header – Texto Barra Superior', type: 'text', placeholder: '✨ ENVÍO GRATIS... ✨', maxLength: 100 },
        { section: 'header', key: 'logo_url', label: 'Branding – Logo Principal', type: 'image' },
        { section: 'header', key: 'bg_color', label: 'Header – Color de Fondo (Hex)', type: 'text', placeholder: '#ffffff', maxLength: 7 },
        { section: 'header', key: 'text_color', label: 'Header – Color de Texto (Hex)', type: 'text', placeholder: '#333333', maxLength: 7 },
        { section: 'header', key: 'top_bar_bg', label: 'Barra Superior – Fondo (Hex)', type: 'text', placeholder: '#F1C3D5', maxLength: 7 },
        { section: 'header', key: 'top_bar_text', label: 'Barra Superior – Texto (Hex)', type: 'text', placeholder: '#333333', maxLength: 7 },

        { section: 'social', key: 'instagram_store', label: 'Instagram (Tienda) - Link', type: 'text', placeholder: 'https://...', maxLength: 200 },
        { section: 'social', key: 'instagram_ceo', label: 'Instagram (CEO) - Link', type: 'text', placeholder: 'https://...', maxLength: 200 },
        { section: 'social', key: 'tiktok', label: 'TikTok - Link', type: 'text', placeholder: 'https://...', maxLength: 200 },
        { section: 'social', key: 'facebook', label: 'Facebook - Link', type: 'text', placeholder: 'https://...', maxLength: 200 },

        { section: 'footer', key: 'pay_subtitle', label: 'Footer – Texto Métodos Pago', type: 'text', placeholder: 'Wompi, PSE, Nequi...', maxLength: 100 },
        { section: 'footer', key: 'shipping_text', label: 'Footer – Texto Envíos', type: 'text', placeholder: 'Envíos a todo Colombia', maxLength: 100 },
    ],
    contacto: [
        { section: 'hero', key: 'badge', label: 'Badge Hero', type: 'text', placeholder: 'Estamos aquí para ti', maxLength: 60 },
        { section: 'hero', key: 'title', label: 'Título Hero', type: 'text', placeholder: 'Contáctanos', maxLength: 80 },
        { section: 'hero', key: 'subtitle', label: 'Subtítulo Hero', type: 'textarea', placeholder: '¿Tienes alguna pregunta?', maxLength: 300 },

        { section: 'whatsapp', key: 'title', label: 'WhatsApp Box – Título', type: 'text', placeholder: '¿Prefieres WhatsApp?', maxLength: 60 },
        { section: 'whatsapp', key: 'description', label: 'WhatsApp Box – Texto', type: 'textarea', placeholder: 'Chatea con nosotros...', maxLength: 200 },
    ],
};

const PAGES: { key: PageName; label: string; icon: React.ElementType }[] = [
    { key: 'home', label: 'Inicio', icon: Home },
    { key: 'nosotros', label: 'Nosotros', icon: Users },
    { key: 'tienda', label: 'Tienda', icon: ShoppingBag },
    { key: 'categorias', label: 'Categorías', icon: ImageIcon },
    { key: 'contacto', label: 'Contacto', icon: Mail },
    { key: 'global', label: 'Config Global', icon: Globe },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function getContentValue(items: PageContent[], section: string, key: string): string {
    const row = items.find((i) => i.section === section && i.key === key);
    if (key === 'image_url') return row?.image_url ?? '';
    return row?.value ?? '';
}

function hasOwnEdit(edits: Record<string, string>, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(edits, key);
}

function getEditValue(edits: Record<string, string>, key: string): string | undefined {
    if (!hasOwnEdit(edits, key)) {
        return undefined;
    }

    const value = Reflect.get(edits, key);
    return typeof value === 'string' ? value : undefined;
}

function omitKeys(source: Record<string, string>, keysToRemove: string[]): Record<string, string> {
    const blocked = new Set(keysToRemove);
    return Object.fromEntries(
        Object.entries(source).filter(([key]) => !blocked.has(key))
    );
}

function getPageFields(page: PageName): FieldDef[] {
    switch (page) {
        case 'home':
            return PAGE_FIELDS.home;
        case 'nosotros':
            return PAGE_FIELDS.nosotros;
        case 'tienda':
            return PAGE_FIELDS.tienda;
        case 'categorias':
            return PAGE_FIELDS.categorias;
        case 'global':
            return PAGE_FIELDS.global;
        case 'contacto':
            return PAGE_FIELDS.contacto;
        default:
            return [];
    }
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────
interface FeedbackProps { type: 'success' | 'error'; message: string; onClose: () => void; }
function Feedback({ type, message, onClose }: FeedbackProps) {
    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 ${type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span className="flex-1">{message}</span>
            <button onClick={onClose} className="opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
    );
}

// Image upload field
interface ImageFieldProps {
    field: FieldDef;
    currentUrl: string;
    page: PageName;
    onUploaded: (url: string) => void;
}
function ImageField({ field, currentUrl, page, onUploaded }: ImageFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(currentUrl);

    useEffect(() => { setPreview(currentUrl); }, [currentUrl]);

    const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    const MAX_MB = 5;

    const handleFile = async (file: File) => {
        setError('');
        if (!ALLOWED.includes(file.type)) {
            setError('Formato no permitido. Usa JPG, PNG, WebP o AVIF.');
            return;
        }
        if (file.size > MAX_MB * 1024 * 1024) {
            setError(`El archivo supera ${MAX_MB} MB.`);
            return;
        }

        // Local preview
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        setUploading(true);

        try {
            const ext = file.name.split('.').pop() ?? 'jpg';
            const storagePath = `${page}/${field.section}-${field.key}-${Date.now()}.${ext}`;
            const fd = new FormData();
            fd.append('file', file);
            fd.append('path', storagePath);

            const res = await fetchWithCsrf('/api/admin/content/upload', { method: 'POST', body: fd });
            const json = await res.json();

            if (!res.ok) {
                setError(json.error ?? 'Error al subir la imagen.');
                setPreview(currentUrl);
                return;
            }
            onUploaded(json.url);
        } catch {
            setError('Error de conexión al subir la imagen.');
            setPreview(currentUrl);
        } finally {
            setUploading(false);
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    return (
        <div className="space-y-3">
            <label className="block text-sm font-semibold text-neutral-700 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary-500" />
                {field.label}
            </label>

            {/* Preview */}
            {preview && (
                <div className="relative h-40 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50">
                    <Image src={preview} alt="preview" fill className="object-cover" unoptimized />
                    {uploading && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                        </div>
                    )}
                </div>
            )}

            {/* Drop zone */}
            <div
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-neutral-200 hover:border-primary-300 rounded-xl p-6 text-center cursor-pointer transition-colors group"
            >
                <Upload className="w-8 h-8 text-neutral-300 group-hover:text-primary-400 mx-auto mb-2 transition-colors" />
                <p className="text-sm text-neutral-500 group-hover:text-primary-600 transition-colors">
                    {uploading ? 'Subiendo…' : 'Clic o arrastra una imagen aquí'}
                </p>
                <p className="text-xs text-neutral-400 mt-1">JPG, PNG, WebP, AVIF · Máx {MAX_MB} MB</p>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
            </div>

            {error && (
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </p>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
export default function ContentAdminPage() {
    const [activePage, setActivePage] = useState<PageName>('home');
    const [items, setItems] = useState<PageContent[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    // Edited values: { "section::key": value }
    const [edits, setEdits] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Load content for active page
    const loadContent = useCallback(async (page: PageName) => {
        setLoadingData(true);
        setEdits({});
        setFeedback(null);
        try {
            const res = await fetch(`/api/admin/content?page=${page}`);
            const json = await res.json();
            setItems(json.data ?? []);
        } catch {
            setItems([]);
        } finally {
            setLoadingData(false);
        }
    }, []);

    useEffect(() => { loadContent(activePage); }, [activePage, loadContent]);

    const fieldKey = (page: string, section: string, key: string) => `${page}::${section}::${key}`;

    const getValue = (section: string, key: string): string => {
        const fk = fieldKey(activePage, section, key);
        return getEditValue(edits, fk) ?? getContentValue(items, section, key);
    };

    const handleChange = (section: string, key: string, value: string) => {
        setEdits((prev) => ({ ...prev, [fieldKey(activePage, section, key)]: value }));
    };

    const handleImageUploaded = (field: FieldDef, url: string) => {
        handleChange(field.section, field.key, url);
    };

    // Save all dirty fields
    const handleSave = async () => {
        const dirtyKeys = Object.keys(edits).filter(k => k.startsWith(`${activePage}::`));
        if (dirtyKeys.length === 0) {
            setFeedback({ type: 'success', message: 'No hay cambios pendientes para esta página.' });
            return;
        }
        setSaving(true);
        setFeedback(null);
        const errors: string[] = [];

        for (const fk of dirtyKeys) {
            const [, section, key] = fk.split('::');
            const value = getEditValue(edits, fk) ?? '';
            const field = getPageFields(activePage).find(f => f.section === section && f.key === key);
            const isImage = field?.type === 'image';

            const payload = {
                page: activePage,
                section,
                key,
                ...(isImage ? { image_url: value, value: null } : { value, image_url: null }),
            };

            try {
                const res = await fetchWithCsrf('/api/admin/content', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const json = await res.json();
                if (!res.ok) {
                    errors.push(`${section}/${key}: ${json.error}`);
                }
            } catch {
                errors.push(`${section}/${key}: Error de conexión`);
            }
        }

        setSaving(false);
        if (errors.length > 0) {
            setFeedback({ type: 'error', message: `Algunos campos no se guardaron: ${errors.join('; ')}` });
        } else {
            setFeedback({ type: 'success', message: `¡Cambios guardados exitosamente! (${dirtyKeys.length} campo${dirtyKeys.length > 1 ? 's' : ''})` });
            // Clear edits for this page
            setEdits(prev => omitKeys(prev, dirtyKeys));
            // Refresh stored items
            await loadContent(activePage);
        }
    };

    const currentFields = getPageFields(activePage);
    const dirtyCount = Object.keys(edits).filter(k => k.startsWith(`${activePage}::`)).length;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-neutral-900 tracking-tight flex items-center gap-3">
                        <Globe className="w-7 h-7 text-primary-500" />
                        Contenido del Sitio
                    </h1>
                    <p className="text-neutral-500 text-sm mt-1">
                        Edita textos e imágenes de las páginas públicas sin tocar código.
                    </p>
                </div>
                <Button
                    variant="primary"
                    leftIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    onClick={handleSave}
                    disabled={saving || dirtyCount === 0}
                    className="shadow-lg shadow-primary-200 shrink-0"
                >
                    {saving ? 'Guardando…' : `Guardar cambios${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
                </Button>
            </div>

            {/* Feedback */}
            {feedback && (
                <Feedback
                    type={feedback.type}
                    message={feedback.message}
                    onClose={() => setFeedback(null)}
                />
            )}

            {/* Page Tabs */}
            <div className="flex gap-2 border-b border-neutral-200 overflow-x-auto pb-px">
                {PAGES.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setActivePage(key)}
                        className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${activePage === key
                            ? 'border-primary-500 text-primary-600 bg-primary-50'
                            : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50'}`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Fields */}
            {loadingData ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
                </div>
            ) : (
                <div className="grid gap-6">
                    {/* Group by section */}
                    {Array.from(new Set(currentFields.map((f) => f.section))).map((section) => {
                        const sectionFields = currentFields.filter((f) => f.section === section);
                        return (
                            <Card key={section} className="border-none shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
                                    <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                                        Sección: {section}
                                    </h2>
                                </div>
                                <div className="p-6 grid gap-6">
                                    {sectionFields.map((field) => {
                                        const val = getValue(field.section, field.key);
                                        const fk = fieldKey(activePage, field.section, field.key);
                                        const isDirty = fk in edits;

                                        if (field.type === 'image') {
                                            return (
                                                <ImageField
                                                    key={`${field.section}-${field.key}`}
                                                    field={field}
                                                    page={activePage}
                                                    currentUrl={val}
                                                    onUploaded={(url) => handleImageUploaded(field, url)}
                                                />
                                            );
                                        }

                                        return (
                                            <div key={`${field.section}-${field.key}`} className="space-y-2">
                                                <label className="block text-sm font-semibold text-neutral-700 flex items-center gap-2">
                                                    <Type className="w-4 h-4 text-primary-500" />
                                                    {field.label}
                                                    {isDirty && (
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                            Modificado
                                                        </span>
                                                    )}
                                                </label>
                                                {field.type === 'textarea' ? (
                                                    <textarea
                                                        value={val}
                                                        onChange={(e) => handleChange(field.section, field.key, e.target.value)}
                                                        placeholder={field.placeholder}
                                                        rows={4}
                                                        maxLength={field.maxLength}
                                                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent text-sm text-neutral-800 placeholder-neutral-400 resize-y transition-shadow"
                                                    />
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={val}
                                                        onChange={(e) => handleChange(field.section, field.key, e.target.value)}
                                                        placeholder={field.placeholder}
                                                        maxLength={field.maxLength}
                                                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent text-sm text-neutral-800 placeholder-neutral-400 transition-shadow"
                                                    />
                                                )}
                                                {field.maxLength && (
                                                    <p className="text-xs text-neutral-400 text-right">
                                                        {val.length}/{field.maxLength}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
