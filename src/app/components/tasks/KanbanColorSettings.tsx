import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { useKanbanColors, KanbanColors } from '../../../hooks/useKanbanColors';
import Swal from 'sweetalert2';

interface KanbanColorSettingsProps {
  open: boolean;
  onClose: () => void;
}

const COLOR_OPTIONS = [
  { label: 'Gris Claro', value: 'bg-gray-100', preview: '#f3f4f6' },
  { label: 'Gris', value: 'bg-gray-200', preview: '#e5e7eb' },
  { label: 'Azul Claro', value: 'bg-blue-100', preview: '#dbeafe' },
  { label: 'Azul', value: 'bg-blue-200', preview: '#bfdbfe' },
  { label: 'Verde Claro', value: 'bg-green-100', preview: '#dcfce7' },
  { label: 'Verde', value: 'bg-green-200', preview: '#bbf7d0' },
  { label: 'Amarillo Claro', value: 'bg-yellow-100', preview: '#fef9c3' },
  { label: 'Amarillo', value: 'bg-yellow-200', preview: '#fef08a' },
  { label: 'Naranja Claro', value: 'bg-orange-100', preview: '#ffedd5' },
  { label: 'Naranja', value: 'bg-orange-200', preview: '#fed7aa' },
  { label: 'Rojo Claro', value: 'bg-red-100', preview: '#fee2e2' },
  { label: 'Rojo', value: 'bg-red-200', preview: '#fecaca' },
  { label: 'Púrpura Claro', value: 'bg-purple-100', preview: '#f3e8ff' },
  { label: 'Púrpura', value: 'bg-purple-200', preview: '#e9d5ff' },
  { label: 'Rosa Claro', value: 'bg-pink-100', preview: '#fce7f3' },
  { label: 'Rosa', value: 'bg-pink-200', preview: '#fbcfe8' },
  { label: 'Índigo Claro', value: 'bg-indigo-100', preview: '#e0e7ff' },
  { label: 'Índigo', value: 'bg-indigo-200', preview: '#c7d2fe' },
  { label: 'Cyan Claro', value: 'bg-cyan-100', preview: '#cffafe' },
  { label: 'Cyan', value: 'bg-cyan-200', preview: '#a5f3fc' },
];

export function KanbanColorSettings({ open, onClose }: KanbanColorSettingsProps) {
  const { colors, updateColors } = useKanbanColors();
  const [localColors, setLocalColors] = useState<KanbanColors>(colors);

  useEffect(() => {
    setLocalColors(colors);
  }, [colors]);

  const handleColorChange = (role: 'dev' | 'pm', status: string, color: string) => {
    setLocalColors((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [status]: color,
      },
    }));
  };

  const handleSave = async () => {
    try {
      await updateColors.mutateAsync(localColors);
      await Swal.fire({
        title: 'Colores actualizados',
        text: 'Los colores del Kanban se han actualizado correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
      });
      onClose();
    } catch (error) {
      await Swal.fire({
        title: 'Error',
        text: 'No se pudieron actualizar los colores',
        icon: 'error',
        confirmButtonText: 'OK',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Colores del Kanban</DialogTitle>
          <DialogDescription>
            Personaliza los colores de los contenedores de estados para cada rol
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Colores para Developers */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-4 text-lg">Developers</h3>
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Por Hacer</Label>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_OPTIONS.map((option) => (
                    <button
                      key={`dev-todo-${option.value}`}
                      type="button"
                      onClick={() => handleColorChange('dev', 'todo', option.value)}
                      className={`p-3 rounded border-2 transition-all cursor-pointer ${
                        localColors.dev.todo === option.value
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{ backgroundColor: option.color }}
                    >
                      <span className="sr-only">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">En Progreso</Label>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_OPTIONS.map((option) => (
                    <button
                      key={`dev-in_progress-${option.value}`}
                      type="button"
                      onClick={() => handleColorChange('dev', 'in_progress', option.value)}
                      className={`p-3 rounded border-2 transition-all cursor-pointer ${
                        localColors.dev.in_progress === option.value
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: option.preview }}
                      title={option.label}
                    >
                      <span className="sr-only">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Listo para Revisar</Label>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_OPTIONS.map((option) => (
                    <button
                      key={`dev-review-${option.value}`}
                      type="button"
                      onClick={() => handleColorChange('dev', 'review', option.value)}
                      className={`p-3 rounded border-2 transition-all cursor-pointer ${
                        localColors.dev.review === option.value
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: option.preview }}
                      title={option.label}
                    >
                      <span className="sr-only">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Colores para Product Managers */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-4 text-lg">Product Managers</h3>
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Asignadas</Label>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_OPTIONS.map((option) => (
                    <button
                      key={`pm-todo-${option.value}`}
                      type="button"
                      onClick={() => handleColorChange('pm', 'todo', option.value)}
                      className={`p-3 rounded border-2 transition-all cursor-pointer ${
                        localColors.pm.todo === option.value
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: option.preview }}
                      title={option.label}
                    >
                      <span className="sr-only">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Por Revisar</Label>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_OPTIONS.map((option) => (
                    <button
                      key={`pm-review-${option.value}`}
                      type="button"
                      onClick={() => handleColorChange('pm', 'review', option.value)}
                      className={`p-3 rounded border-2 transition-all cursor-pointer ${
                        localColors.pm.review === option.value
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: option.preview }}
                      title={option.label}
                    >
                      <span className="sr-only">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Completadas</Label>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_OPTIONS.map((option) => (
                    <button
                      key={`pm-done-${option.value}`}
                      type="button"
                      onClick={() => handleColorChange('pm', 'done', option.value)}
                      className={`p-3 rounded border-2 transition-all cursor-pointer ${
                        localColors.pm.done === option.value
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: option.preview }}
                      title={option.label}
                    >
                      <span className="sr-only">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateColors.isPending}>
            {updateColors.isPending ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}