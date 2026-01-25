import { supabaseAdmin } from '@/lib/supabase';

/**
 * Audit logging helper functions
 */

export interface AuditLogEntry {
    entity_type: 'order' | 'product' | 'user' | 'profile';
    entity_id: string;
    action: 'create' | 'update' | 'delete';
    actor_id?: string;
    actor_role?: string;
    changes?: unknown;
    ip_address?: string;
    user_agent?: string;
}

/**
 * Log an action to the audit log
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
    try {
        const { error } = await supabaseAdmin
            .from('audit_log')
            .insert([{
                entity_type: entry.entity_type,
                entity_id: entry.entity_id,
                action: entry.action,
                actor_id: entry.actor_id || null,
                actor_role: entry.actor_role || null,
                changes: entry.changes || null,
                ip_address: entry.ip_address || null,
                user_agent: entry.user_agent || null,
            }]);

        if (error) {
            console.error('Failed to write audit log:', error);
        }
    } catch (error) {
        console.error('Audit logging error:', error);
    }
}

/**
 * Get audit logs for an entity
 */
export async function getAuditLogs(
    entityType: string,
    entityId: string,
    limit: number = 50
) {
    const { data, error } = await supabaseAdmin
        .from('audit_log')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Failed to fetch audit logs:', error);
        return [];
    }

    return data || [];
}

/**
 * Get recent audit logs (admin only)
 */
export async function getRecentAuditLogs(limit: number = 100) {
    const { data, error } = await supabaseAdmin
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Failed to fetch recent audit logs:', error);
        return [];
    }

    return data || [];
}
