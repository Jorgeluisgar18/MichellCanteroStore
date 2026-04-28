'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { PageContent } from '@/types';

interface ContentContextType {
    globalContent: PageContent[];
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export function ContentProvider({ 
    children, 
    initialGlobalContent 
}: { 
    children: ReactNode; 
    initialGlobalContent: PageContent[];
}) {
    return (
        <ContentContext.Provider value={{ globalContent: initialGlobalContent }}>
            {children}
        </ContentContext.Provider>
    );
}

export function useGlobalContent() {
    const context = useContext(ContentContext);
    return context?.globalContent || [];
}
