'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public static getDerivedStateFromError(_: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col bg-neutral-50">
                    <Header />
                    <main className="flex-1 flex items-center justify-center p-6">
                        <div className="max-w-md w-full text-center space-y-6">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                                <AlertTriangle className="w-10 h-10 text-red-600" />
                            </div>

                            <div className="space-y-2">
                                <h1 className="text-3xl font-display font-bold text-neutral-900">
                                    ¡Ups! Algo salió mal
                                </h1>
                                <p className="text-neutral-600">
                                    Lo sentimos, ha ocurrido un error inesperado. Estamos trabajando para solucionarlo.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button
                                    variant="primary"
                                    onClick={() => window.location.reload()}
                                    leftIcon={<RefreshCw className="w-4 h-4" />}
                                >
                                    Recargar página
                                </Button>
                                <Link href="/" className="w-full sm:w-auto">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        leftIcon={<Home className="w-4 h-4" />}
                                    >
                                        Ir al Inicio
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </main>
                    <Footer />
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
