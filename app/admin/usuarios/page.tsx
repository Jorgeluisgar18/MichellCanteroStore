'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import {
    Search,
    Shield,
    Mail,
    Phone,
    Calendar,
    User,
    Edit,
    Trash2,
    X,
    CheckCircle
} from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

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
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        full_name: '',
        role: '',
        phone: ''
    });

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        try {
            const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });

            if (res.ok) {
                setIsEditModalOpen(false);
                fetchProfiles();
            } else {
                alert('Error al actualizar el usuario');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Error al actualizar el usuario');
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este perfil? Esto no eliminará la cuenta de acceso, solo los datos del perfil.')) return;

        try {
            const res = await fetch(`/api/admin/users/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                fetchProfiles();
            }
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    const openEditModal = (user: UserProfile) => {
        setSelectedUser(user);
        setEditForm({
            full_name: user.full_name || '',
            role: user.role,
            phone: user.phone || ''
        });
        setIsEditModalOpen(true);
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesRole = roleFilter === '' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-neutral-900">Gestión de Usuarios</h1>
                    <p className="text-neutral-500 text-sm">Administra los roles y perfiles de los usuarios registrados.</p>
                </div>
                <Button
                    variant="outline"
                    leftIcon={<Calendar className="w-4 h-4" />}
                    onClick={() => {
                        const headers = ['ID', 'Nombre', 'Email', 'Teléfono', 'Rol', 'Registrado'];
                        const formatField = (field: string | number | boolean | null | undefined) => `"${String(field || '').replace(/"/g, '""')}"`;
                        const csvRows = [
                            headers.join(';'),
                            ...filteredUsers.map(u => [
                                formatField(u.id),
                                formatField(u.full_name),
                                formatField(u.email),
                                formatField(u.phone),
                                formatField(u.role === 'admin' ? 'Administrador' : 'Cliente'),
                                formatField(new Date(u.created_at).toLocaleDateString())
                            ].join(';'))
                        ];
                        const BOM = '\uFEFF';
                        const csvContent = BOM + csvRows.join('\r\n');
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = `reporte_usuarios_${new Date().toISOString().split('T')[0]}.csv`;
                        link.click();
                    }}
                >
                    Exportar Usuarios
                </Button>
            </div>

            {/* User Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-4 border-l-4 border-l-primary-600">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary-100 rounded-xl">
                            <User className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Total Usuarios</p>
                            <h3 className="text-2xl font-bold text-neutral-900">{users.length}</h3>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-amber-500">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-100 rounded-xl">
                            <Shield className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Administradores</p>
                            <h3 className="text-2xl font-bold text-neutral-900">{users.filter(u => u.role === 'admin').length}</h3>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <Calendar className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Nuevos hoy</p>
                            <h3 className="text-2xl font-bold text-neutral-900">
                                {users.filter(u => new Date(u.created_at).toDateString() === new Date().toDateString()).length}
                            </h3>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters and Search */}
            <Card>
                <div className="p-4 flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Buscar por nombre o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            leftIcon={<Search className="w-5 h-5 text-neutral-400" />}
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        >
                            <option value="">Todos los roles</option>
                            <option value="admin">Administradores</option>
                            <option value="customer">Clientes</option>
                        </select>
                    </div>
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
                                            <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 font-bold overflow-hidden">
                                                <User className="w-5 h-5 text-neutral-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-neutral-900">{user.full_name || 'Sin nombre'}</p>
                                                <p className="text-xs text-neutral-500">ID: {user.id.slice(0, 8)}...</p>
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
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-600'
                                            }`}>
                                            {user.role === 'admin' && <Shield className="w-3 h-3" />}
                                            {user.role === 'admin' ? 'Administrador' : 'Cliente'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                                            <Calendar className="w-3 h-3" /> {new Date(user.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="p-2 hover:bg-neutral-100 text-neutral-400 hover:text-primary-600 rounded-lg transition-colors"
                                                title="Editar perfil"
                                            >
                                                <Edit className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="p-2 hover:bg-red-50 text-neutral-400 hover:text-red-600 rounded-lg transition-colors"
                                                title="Eliminar perfil"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Edit User Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                            <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                                <Edit className="w-5 h-5 text-primary-600" />
                                Editar Usuario
                            </h2>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-neutral-400" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-neutral-700">Nombre Completo</label>
                                <Input
                                    value={editForm.full_name}
                                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                    leftIcon={<User className="w-5 h-5" />}
                                    placeholder="Nombre del usuario"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-neutral-700">Teléfono</label>
                                <Input
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    leftIcon={<Phone className="w-5 h-5" />}
                                    placeholder="Número de contacto"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-neutral-700">Rol del Usuario</label>
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditForm({ ...editForm, role: 'customer' })}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${editForm.role === 'customer'
                                            ? 'border-primary-600 bg-primary-50'
                                            : 'border-neutral-100 hover:border-neutral-200'}`}
                                    >
                                        <User className={`w-6 h-6 ${editForm.role === 'customer' ? 'text-primary-600' : 'text-neutral-400'}`} />
                                        <span className={`text-xs font-bold ${editForm.role === 'customer' ? 'text-primary-700' : 'text-neutral-500'}`}>CLIENTE</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditForm({ ...editForm, role: 'admin' })}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${editForm.role === 'admin'
                                            ? 'border-primary-600 bg-primary-50'
                                            : 'border-neutral-100 hover:border-neutral-200'}`}
                                    >
                                        <Shield className={`w-6 h-6 ${editForm.role === 'admin' ? 'text-primary-600' : 'text-neutral-400'}`} />
                                        <span className={`text-xs font-bold ${editForm.role === 'admin' ? 'text-primary-700' : 'text-neutral-500'}`}>ADMIN</span>
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button
                                    className="flex-1"
                                    type="submit"
                                    leftIcon={<CheckCircle className="w-4 h-4" />}
                                >
                                    Guardar Cambios
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
