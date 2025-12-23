import { useState } from 'react';
import { useUsers, useUpdateUserProfile } from '../../../hooks/useUsers';
import { UserProfile } from '../../../lib/supabase';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Plus, Search, Edit, UserCheck, UserX, Shield } from 'lucide-react';
import Swal from 'sweetalert2';
import { UserForm } from './UserForm';
import { LoadingSpinner } from '../ui/loading-spinner';

const roleColors = {
  admin: 'bg-red-100 text-red-800',
  pm: 'bg-blue-100 text-blue-800',
  dev: 'bg-green-100 text-green-800',
  advisor: 'bg-purple-100 text-purple-800',
};

const roleLabels = {
  admin: 'Administrador',
  pm: 'Project Manager',
  dev: 'Developer',
  advisor: 'Asesor Financiero',
};

export function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const updateUser = useUpdateUserProfile();
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const filteredUsers = users?.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (user: UserProfile) => {
    setSelectedUser(user);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setSelectedUser(null);
  };

  const toggleUserStatus = async (user: UserProfile) => {
    const action = user.is_active ? 'desactivar' : 'activar';
    const result = await Swal.fire({
      title: `¿${action.charAt(0).toUpperCase() + action.slice(1)} usuario?`,
      text: `¿Estás seguro de ${action} a "${user.full_name}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: user.is_active ? '#ef4444' : '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Sí, ${action}`,
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      updateUser.mutate({
        id: user.id,
        is_active: !user.is_active,
      });
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-zinc-600 mt-1">Administra los miembros del equipo y sus roles</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Buscar usuarios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredUsers?.map((user) => (
          <Card key={user.id} className={`hover:shadow-lg transition-shadow ${!user.is_active ? 'opacity-60' : ''}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="text-lg">
                      {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{user.full_name}</CardTitle>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={roleColors[user.role]}>
                    <Shield className="h-3 w-3 mr-1" />
                    {roleLabels[user.role]}
                  </Badge>
                  {user.is_active ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      <UserCheck className="h-3 w-3 mr-1" />
                      Activo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50 text-red-700">
                      <UserX className="h-3 w-3 mr-1" />
                      Inactivo
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-gray-500">
                  <p>Creado: {new Date(user.created_at).toLocaleDateString('es-ES')}</p>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(user)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleUserStatus(user)}
                    className={user.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                  >
                    {user.is_active ? (
                      <UserX className="h-4 w-4" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No se encontraron usuarios</p>
        </div>
      )}

      <UserForm open={formOpen} onClose={handleClose} user={selectedUser} />
    </div>
  );
}