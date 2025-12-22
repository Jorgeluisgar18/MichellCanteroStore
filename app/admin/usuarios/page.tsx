'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import {
    Search,
    Shield,
    Mail,
    Phone,
    Calendar,
    MoreVertical
} from 'lucide-react';
import Input from '@/components/ui/Input';

interface UserProfile {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    role: string;
    created_at: string;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // En una aplicación real, esto vendría de una API de administración
        // Para este MVP, lo simulamos o intentamos obtener perfiles si el RLS lo permite
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        // Nota: El listado de usuarios de Auth es restringido, 
        // pero podemos listar la tabla public.profiles
        try {
            // Asumimos que tenemos un endpoint o usamos el cliente de supabase directamente si estamos logueados como admin
            const res = await fetch('/api/admin/users'); // Tendríamos que crear este endpoint
            if (res.ok) {
                const data = await res.json();
                setUsers(data.data || []);
            } else {
                // Mock data para demostración si el endpoint no existe aún
                setUsers([
                    { id: '1', full_name: 'Michell Cantero', email: 'admin@michellcantero.com', role: 'admin', created_at: '2025-01-01', phone: '3000000000' },
                    { id: '2', full_name: 'Juan Pérez', email: 'juan@gmail.com', role: 'customer', created_at: '2025-12-15', phone: '3112223344' },
                    { id: '3', full_name: 'María García', email: 'maria@outlook.com', role: 'customer', created_at: '2025-12-20', phone: '3225556677' }
                ]);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-neutral-900">Gestión de Usuarios</h1>
                    <p className="text-neutral-500 text-sm">Administra los accesos y perfiles de tus clientes.</p>
                </div>
            </div>

            {/* Search */}
            <Card>
                <div className="p-4">
                    <Input
                        placeholder="Buscar por nombre o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        leftIcon={<Search className="w-5 h-5 text-neutral-400" />}
                    />
                </div>
            </Card>

            {/* Users Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-neutral-50 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Usuario</th>
                                <th className="px-6 py-4">Contacto</th>
                                <th className="px-6 py-4 text-center">Rol</th>
                                <th className="px-6 py-4">Registrado</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-neutral-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 font-bold">
                                                {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-neutral-900">{user.full_name || 'Sin nombre'}</p>
                                                <p className="text-xs text-neutral-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-xs text-neutral-600">
                                                <Mail className="w-3 h-3" /> {user.email}
                                            </div>
                                            {user.phone && (
                                                <div className="flex items-center gap-2 text-xs text-neutral-600">
                                                    <Phone className="w-3 h-3" /> {user.phone}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-600'
                                            }`}>
                                            {user.role === 'admin' && <Shield className="w-3 h-3" />}
                                            {user.role === 'admin' ? 'Admin' : 'Cliente'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                                            <Calendar className="w-3 h-3" /> {new Date(user.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button className="p-2 hover:bg-neutral-100 text-neutral-400 rounded-lg transition-colors">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
