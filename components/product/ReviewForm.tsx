'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';

interface ReviewFormProps {
    productId: string;
    onSuccess: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ productId, onSuccess }) => {
    const { user, isAuthenticated } = useAuthStore();
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            setError('Por favor selecciona una calificación');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: productId,
                    user_id: user?.id,
                    full_name: user?.name || 'Cliente',
                    rating,
                    comment
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error al enviar reseña');
            }

            setRating(0);
            setComment('');
            onSuccess();
            alert('¡Gracias por tu reseña!');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al enviar reseña');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <Card className="p-8 text-center bg-neutral-50/50 border-dashed border-2">
                <p className="text-neutral-600 mb-4">Debes iniciar sesión para dejar una reseña.</p>
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/cuenta/login'}>
                    Iniciar Sesión
                </Button>
            </Card>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
            <h3 className="text-xl font-display font-bold text-neutral-900">Deja tu reseña</h3>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700">Calificación</label>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHover(star)}
                            onMouseLeave={() => setHover(0)}
                            className="p-1 transition-transform hover:scale-110"
                        >
                            <Star
                                className={`w-8 h-8 ${(hover || rating) >= star
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-neutral-200'
                                    }`}
                            />
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700">Comentario (opcional)</label>
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none"
                    placeholder="Cuéntanos tu experiencia con el producto..."
                />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isSubmitting}
            >
                Publicar Reseña
            </Button>
        </form>
    );
};

export default ReviewForm;
