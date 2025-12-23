import { useState } from 'react';
import { Palette, RotateCcw } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { Button } from '../ui/button';
import { useUserKanbanColors } from '../../../hooks/useUserKanbanColors';
import { toast } from 'sonner';

interface KanbanColumnColorPickerProps {
  role: 'dev' | 'pm';
  status: string;
}

const COLOR_OPTIONS = [
  { label: 'Blanco', value: 'bg-white border-gray-300', preview: '#ffffff', hasBorder: true },
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

export function KanbanColumnColorPicker({ role, status }: KanbanColumnColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [customColorValue, setCustomColorValue] = useState('#ffffff');
  const { setColorForStatus, hasCustomColor, getColorForStatus, adminColors } = useUserKanbanColors();
  const currentColor = getColorForStatus(role, status);
  const isCustomized = hasCustomColor(role, status);

  const handleColorSelect = (color: string) => {
    setColorForStatus(role, status, color);
    setOpen(false);
    toast.success('Color personalizado aplicado');
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColorValue(e.target.value);
  };

  const handleCustomColorApply = () => {
    // Guardar el color hex directamente con un prefijo especial para identificarlo
    const customClass = `custom-${customColorValue}`;
    setColorForStatus(role, status, customClass);
    setOpen(false);
    toast.success('Color personalizado aplicado');
  };

  const handleReset = () => {
    // Solo resetear el color de esta columna específica al color del admin
    const adminColor = adminColors[role][status as keyof typeof adminColors[typeof role]];
    setColorForStatus(role, status, adminColor);
    setOpen(false);
    toast.success('Color reseteado al predeterminado');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="p-1.5 rounded-md bg-white/80 hover:bg-white shadow-sm border border-gray-200 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
          title="Personalizar color"
        >
          <Palette className="h-4 w-4 text-gray-600" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Personalizar Color</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Solo para ti
              </p>
            </div>
            {isCustomized && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-7 text-xs gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Resetear
              </Button>
            )}
          </div>

          <div className="grid grid-cols-5 gap-2">
            {COLOR_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleColorSelect(option.value)}
                className={`p-3 rounded border-2 transition-all cursor-pointer ${
                  currentColor === option.value
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

          <div className="pt-2 border-t">
            <p className="text-xs text-gray-700 font-medium mb-2">
              Color personalizado
            </p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customColorValue}
                onChange={handleCustomColorChange}
                className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <Button
                onClick={handleCustomColorApply}
                size="sm"
                className="flex-1"
              >
                Aplicar color
              </Button>
            </div>
          </div>

          {isCustomized && (
            <div className="pt-2 border-t">
              <p className="text-xs text-blue-600 flex items-center gap-1">
                <Palette className="h-3 w-3" />
                Color personalizado activo
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}