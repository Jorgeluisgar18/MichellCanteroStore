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
    X,
} from 'lucide-react';
import type { PageContent, PageName } from '@/types';

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
        { section: 'hero', key: 'badge', label: 'Badge (ej. "Nueva Colección")', type: 'text', placeholder: 'Nueva Colección', maxLength: 60 },
        { section: 'hero', key: 'title', label: 'Título principal (línea 1)', type: 'text', placeholder: 'Eleva tu', maxLength: 80 },
        { section: 'hero', key: 'subtitle', label: 'Título principal (línea 2)', type: 'text', placeholder: 'belleza única', maxLength: 80 },
        { section: 'hero', key: 'body', label: 'Descripción del hero', type: 'textarea', placeholder: 'En Michell Cantero Store…', maxLength: 300 },
        { section: 'hero', key: 'image_url', label: 'Imagen principal del hero', type: 'image' },
        { section: 'categories', key: 'title', label: 'Título sección categorías', type: 'text', placeholder: 'Explora por Categoría', maxLength: 80 },
        { section: 'categories', key: 'description', label: 'Descripción sección categorías', type: 'textarea', placeholder: 'Encuentra exactamente…', maxLength: 300 },
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
};

const PAGES: { key: PageName; label: string; icon: React.ElementType }[] = [
    { key: 'home', label: 'Inicio', icon: Home },
    { key: 'nosotros', label: 'Nosotros', icon: Users },
    { key: 'tienda', label: 'Tienda', icon: ShoppingBag },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function getContentValue(items: PageContent[], section: string, key: string): string {
    const row = items.find((i) => i.section === section && i.key === key);
    if (key === 'image_url') return row?.image_url ?? '';
    return row?.value ?? '';
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

            const res = await fetch('/api/admin/content/upload', { method: 'POST', body: fd });
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

    const fieldKey = (section: string, key: string) => `${section}::${key}`;

    const getValue = (section: string, key: string) => {
        const fk = fieldKey(section, key);
        return fk in edits ? edits[fk] : getContentValue(items, section, key);
    };

    const handleChange = (section: string, key: string, value: string) => {
        setEdits((prev) => ({ ...prev, [fieldKey(section, key)]: value }));
    };

    const handleImageUploaded = (field: FieldDef, url: string) => {
        handleChange(field.section, field.key, url);
    };

    // Save all dirty fields
    const handleSave = async () => {
        const dirtyKeys = Object.keys(edits);
        if (dirtyKeys.length === 0) {
            setFeedback({ type: 'success', message: 'No hay cambios pendientes.' });
            return;
        }
        setSaving(true);
        setFeedback(null);
        const errors: string[] = [];

        for (const fk of dirtyKeys) {
            const [section, key] = fk.split('::');
            const value = edits[fk];
            const isImage = key === 'image_url';

            const payload = {
                page: activePage,
                section,
                key,
                ...(isImage ? { image_url: value, value: null } : { value, image_url: null }),
            };

            try {
                const res = await fetch('/api/admin/content', {
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
            // Refresh stored items
            await loadContent(activePage);
        }
    };

    const currentFields = PAGE_FIELDS[activePage];
    const dirtyCount = Object.keys(edits).length;

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
                                        const isDirty = fieldKey(field.section, field.key) in edits;

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
