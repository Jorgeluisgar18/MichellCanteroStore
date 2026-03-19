'use client';

import React, { useState, createContext, useContext, useCallback } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error';
}

interface ToastContextValue {
    showToast: (message: string, type?: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextValue>({
    showToast: () => { },
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        const id = crypto.randomUUID();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Portal de toasts: Esquina inferior derecha en Desktop, centro-arriba en Móvil */}
            <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] 
                            backdrop-blur-md border animate-in fade-in slide-in-from-bottom-5 duration-300
                            ${toast.type === 'success' 
                                ? 'bg-neutral-900/95 border-neutral-800 text-white' 
                                : 'bg-white border-red-100 text-red-600'}`}
                    >
                        {toast.type === 'success' ? (
                            <CheckCircle className="w-5 h-5 flex-shrink-0 text-green-400" />
                        ) : (
                            <XCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
                        )}
                        <span className="flex-1 text-sm font-medium leading-tight">{toast.message}</span>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className={`p-1 rounded-full transition-colors ${toast.type === 'success' ? 'hover:bg-white/10 text-white/40 hover:text-white' : 'hover:bg-red-50 text-red-300 hover:text-red-500'}`}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);
