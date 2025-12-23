import { useState, useRef, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { X, Tag, Plus } from 'lucide-react';

interface TaskTagsInputProps {
  tags?: string[];
  onTagsChange?: (tags: string[]) => void;
  value?: string[];
  onValueChange?: (value: string[]) => void;
  readOnly?: boolean;
  suggestions?: string[];
}

export function TaskTagsInput({
  tags: tagsProp,
  onTagsChange,
  value: valueProp,
  onValueChange,
  readOnly = false,
  suggestions = [],
}: TaskTagsInputProps) {
  const initialTags = tagsProp !== undefined ? tagsProp : (valueProp || []);
  const handleTagsChange = onTagsChange || onValueChange || (() => {});

  // Estado local optimista para cambios instantáneos
  const [localTags, setLocalTags] = useState<string[]>(initialTags);
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar estado local cuando cambien las props externas
  useEffect(() => {
    setLocalTags(initialTags);
  }, [JSON.stringify(initialTags)]);

  const tags = localTags;

  const filteredSuggestions = suggestions.filter(
    (suggestion) =>
      !tags.includes(suggestion) &&
      suggestion.toLowerCase().includes(inputValue.toLowerCase())
  );

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      const newTags = [...tags, trimmedTag];
      // Actualizar estado local inmediatamente (optimista)
      setLocalTags(newTags);
      // Enviar al servidor en background
      handleTagsChange(newTags);
    }
    setInputValue('');
    setIsAdding(false);
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    // Actualizar estado local inmediatamente (optimista)
    setLocalTags(newTags);
    // Enviar al servidor en background
    handleTagsChange(newTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Escape') {
      setInputValue('');
      setIsAdding(false);
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  // Version compacta para el detalle del modal
  if (tagsProp !== undefined) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-gray-700">
          <Tag className="h-3.5 w-3.5" />
          <h3 className="text-sm font-medium">Etiquetas</h3>
        </div>

        <div className="pl-5 space-y-2">
          {/* Etiquetas existentes */}
          <div className="flex items-center gap-1.5 flex-wrap min-h-[24px]">
            {tags.length === 0 && !isAdding && (
              <span className="text-xs text-gray-500">Sin etiquetas</span>
            )}
            {tags.map((tag) => {
              // Generar color consistente basado en el texto de la etiqueta
              const getTagColor = (text: string) => {
                const colors = [
                  { bg: 'bg-blue-100', text: 'text-blue-800', hover: 'hover:bg-blue-200', border: 'border-blue-200' },
                  { bg: 'bg-purple-100', text: 'text-purple-800', hover: 'hover:bg-purple-200', border: 'border-purple-200' },
                  { bg: 'bg-green-100', text: 'text-green-800', hover: 'hover:bg-green-200', border: 'border-green-200' },
                  { bg: 'bg-orange-100', text: 'text-orange-800', hover: 'hover:bg-orange-200', border: 'border-orange-200' },
                  { bg: 'bg-pink-100', text: 'text-pink-800', hover: 'hover:bg-pink-200', border: 'border-pink-200' },
                  { bg: 'bg-cyan-100', text: 'text-cyan-800', hover: 'hover:bg-cyan-200', border: 'border-cyan-200' },
                  { bg: 'bg-indigo-100', text: 'text-indigo-800', hover: 'hover:bg-indigo-200', border: 'border-indigo-200' },
                  { bg: 'bg-emerald-100', text: 'text-emerald-800', hover: 'hover:bg-emerald-200', border: 'border-emerald-200' },
                ];
                let hash = 0;
                for (let i = 0; i < text.length; i++) {
                  hash = text.charCodeAt(i) + ((hash << 5) - hash);
                }
                return colors[Math.abs(hash) % colors.length];
              };
              
              const color = getTagColor(tag);
              
              return (
                <Badge
                  key={tag}
                  variant="secondary"
                  className={`text-xs px-2.5 py-1 ${color.bg} ${color.text} ${color.hover} border ${color.border} shadow-sm transition-all duration-200 font-medium`}
                >
                  {tag}
                  {!readOnly && (
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1.5 hover:opacity-70 transition-opacity cursor-pointer h-4 w-4 flex items-center justify-center"
                      aria-label={`Eliminar etiqueta ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              );
            })}

            {/* Input para agregar */}
            {!readOnly && isAdding && (
              <div className="relative">
                <Input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setShowSuggestions(e.target.value.length > 0);
                  }}
                  onKeyDown={handleKeyDown}
                  onBlur={() => {
                    setTimeout(() => {
                      if (inputValue.trim()) {
                        addTag(inputValue);
                      } else {
                        setIsAdding(false);
                      }
                      setShowSuggestions(false);
                    }, 200);
                  }}
                  placeholder="Escribe una etiqueta..."
                  className="h-7 text-xs w-32 px-2 border-dashed"
                />

                {/* Sugerencias */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                    {filteredSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => addTag(suggestion)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Botón para agregar */}
            {!readOnly && !isAdding && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAdding(true)}
                className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-dashed border-blue-300 hover:border-blue-400 transition-all"
              >
                <Plus className="h-3 w-3 mr-1" />
                Agregar
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Version para formulario
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap min-h-[32px] p-2 border rounded-md">
        {tags.length === 0 && !isAdding && (
          <span className="text-sm text-gray-500">Agregar etiquetas...</span>
        )}
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="text-xs px-2 py-1 bg-blue-100 text-blue-800"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1.5 hover:text-blue-900 cursor-pointer"
              aria-label={`Eliminar etiqueta ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        {/* Input para agregar */}
        {isAdding ? (
          <div className="relative flex-1 min-w-[120px]">
            <Input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                setTimeout(() => {
                  if (inputValue.trim()) {
                    addTag(inputValue);
                  } else {
                    setIsAdding(false);
                  }
                  setShowSuggestions(false);
                }, 200);
              }}
              placeholder="Escribe y presiona Enter..."
              className="h-7 text-sm border-0 shadow-none px-1 focus-visible:ring-0"
            />

            {/* Sugerencias */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => addTag(suggestion)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-7 px-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Agregar etiqueta
          </Button>
        )}
      </div>
    </div>
  );
}