import type { ReactNode } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { assertAdminPageAccess } from '@/lib/page-auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
    children,
}: {
    children: ReactNode;
}) {
    await assertAdminPageAccess();

    return <AdminShell>{children}</AdminShell>;
}
