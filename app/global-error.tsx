'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to Sentry
        Sentry.captureException(error);
    }, [error]);

    return (
        <html>
            <body>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    padding: '20px',
                    fontFamily: 'system-ui, sans-serif'
                }}>
                    <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>
                        ¡Algo salió mal!
                    </h2>
                    <p style={{ color: '#666', marginBottom: '24px' }}>
                        Lo sentimos, ha ocurrido un error inesperado.
                    </p>
                    <button
                        onClick={reset}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#000',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                    >
                        Intentar de nuevo
                    </button>
                </div>
            </body>
        </html>
    );
}
