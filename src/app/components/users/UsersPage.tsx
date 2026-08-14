import { useEffect, useMemo, useState } from 'react';
import { useUsers, useUpdateUserProfile } from '../../../hooks/useUsers';
import { UserProfile, UserRole } from '../../../lib/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Plus, Search, Edit, UserCheck, UserX, Shield } from 'lucide-react';
import Swal from 'sweetalert2';
import { UserForm } from './UserForm';
import { LoadingSpinner } from '../ui/loading-spinner';
import { Pagination } from '../ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

const roleColors: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-800',
  pm: 'bg-blue-100 text-blue-800',
  dev: 'bg-green-100 text-green-800',
  advisor: 'bg-purple-100 text-purple-800',
};

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  pm: 'Project Manager',
  dev: 'Developer',
  advisor: 'Asesor Financiero',
};

const getUserInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const updateUser = useUpdateUserProfile();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const filteredUsers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!users) return [];
    if (!search) return users;

    return users.filter((user) =>
      user.full_name.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      roleLabels[user.role].toLowerCase().includes(search)
    );
  }, [searchTerm, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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

      <div className="rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="w-[180px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.map((user) => (
              <TableRow key={user.id} className={!user.is_active ? 'opacity-60' : ''}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{getUserInitials(user.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-950">{user.full_name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={roleColors[user.role]}>
                    <Shield className="h-3 w-3 mr-1" />
                    {roleLabels[user.role]}
                  </Badge>
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell className="text-gray-600">
                  {new Date(user.created_at).toLocaleDateString('es-ES')}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
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
                      title={user.is_active ? 'Desactivar usuario' : 'Activar usuario'}
                    >
                      {user.is_active ? (
                        <UserX className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredUsers.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">No se encontraron usuarios</p>
          </div>
        ) : (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredUsers.length}
            onItemsPerPageChange={setItemsPerPage}
          />
        )}
      </div>

      {users?.length === 0 && !searchTerm && (
        <div className="text-center py-12">
          <p className="text-gray-500">No hay usuarios registrados</p>
        </div>
      )}

      <UserForm open={formOpen} onClose={handleClose} user={selectedUser} />
    </div>
  );
}
