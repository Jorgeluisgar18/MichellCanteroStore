'use client';

import React from 'react';
import { Star, User } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export interface Review {
    id: string;
    full_name: string;
    rating: number;
    comment: string;
    created_at: string;
}

interface ReviewListProps {
    reviews: Review[];
}

const ReviewList: React.FC<ReviewListProps> = ({ reviews }) => {
    if (reviews.length === 0) {
        return (
            <div className="text-center py-12 bg-neutral-50/50 rounded-3xl border-2 border-dashed border-neutral-100">
                <p className="text-neutral-500 font-medium italic">Aún no hay reseñas para este producto. ¡Sé el primero en dejar una!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {reviews.map((review) => (
                <div key={review.id} className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                            <p className="font-bold text-neutral-900">{review.full_name}</p>
                            <div className="flex items-center gap-2">
                                <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`w-4 h-4 ${i < review.rating
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-neutral-200'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-xs text-neutral-400 font-medium">
                                    {formatDate(review.created_at)}
                                </span>
                            </div>
                        </div>
                        <p className="text-neutral-600 leading-relaxed italic">
                            &quot;{review.comment || 'Sin comentario'}&quot;
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ReviewList;
