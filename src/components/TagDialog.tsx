import React, { useState } from 'react';
import { Tag as TagIcon, X, Check, Star, Heart, Flame, Headphones, Zap, Radio, Sparkles, Coffee } from 'lucide-react';
import { Tag } from '../types';

interface TagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentTag: Tag | null;
  onSaveTag: (tag: Tag) => void;
  accentColor: string;
}

const PRESET_PASTEL_COLORS = [
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#0284c7', // sky
  '#f97316', // orange
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#eab308', // yellow
  '#f43f5e', // rose
  '#64748b', // slate
];

const PRESET_TAG_ICONS = [
  { id: 'star', label: 'Estrella', Icon: Star },
  { id: 'heart', label: 'Corazón', Icon: Heart },
  { id: 'flame', label: 'Fuego', Icon: Flame },
  { id: 'headphones', label: 'Auriculares', Icon: Headphones },
  { id: 'zap', label: 'Energía', Icon: Zap },
  { id: 'radio', label: 'Radio', Icon: Radio },
  { id: 'sparkles', label: 'Especial', Icon: Sparkles },
  { id: 'coffee', label: 'Chill', Icon: Coffee },
];

export const TagDialog: React.FC<TagDialogProps> = ({
  isOpen,
  onClose,
  currentTag,
  onSaveTag,
  accentColor,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_PASTEL_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState('star');

  React.useEffect(() => {
    if (currentTag) {
      setName(currentTag.name);
      setColor(currentTag.color || PRESET_PASTEL_COLORS[0]);
      setSelectedIcon(currentTag.icon || 'star');
    } else {
      setName('');
      setColor(PRESET_PASTEL_COLORS[0]);
      setSelectedIcon('star');
    }
  }, [currentTag, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor ingresa un nombre para la tag.');
      return;
    }
    onSaveTag({
      name: name.trim(),
      color,
      icon: selectedIcon,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl border flex flex-col overflow-hidden transition-all text-xs"
        style={{
          backgroundColor: 'var(--panel-bg)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-color)',
        }}
      >
        <div
          className="h-11 px-4 border-b flex items-center justify-between shrink-0"
          style={{
            backgroundColor: 'var(--bg-color)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-center gap-2 font-extrabold text-xs uppercase tracking-wider">
            <TagIcon className="w-4 h-4" style={{ color: accentColor }} />
            <span>Music2000 — Configurar Tag</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4 opacity-70" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase opacity-60 mb-1">
              Nombre de la Tag
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Favoritos, Chill Lo-Fi, Trabajo..."
              className="w-full px-3 py-1.5 rounded-lg border font-semibold outline-none"
              style={{
                backgroundColor: 'var(--bg-color)',
                borderColor: 'var(--border-color)',
              }}
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase opacity-60 mb-1.5">
              Color Pastel
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              {PRESET_PASTEL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full border border-black/20 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                  style={{
                    backgroundColor: c,
                    boxShadow: color === c ? '0 0 0 2px white, 0 0 0 4px #10b981' : undefined,
                  }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}

              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 rounded-full border-none cursor-pointer"
                title="Color personalizado"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase opacity-60 mb-1.5">
              Icono de Categoría
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_TAG_ICONS.map(({ id, label, Icon }) => {
                const isSelected = selectedIcon === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedIcon(id)}
                    className="p-2 rounded-lg border flex flex-col items-center gap-1 hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
                    style={{
                      borderColor: isSelected ? accentColor : 'var(--border-color)',
                      backgroundColor: isSelected ? `${color}20` : 'transparent',
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: isSelected ? color : undefined }} />
                    <span className="text-[10px] font-medium opacity-70 truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tag preview pill */}
          <div className="pt-2">
            <span className="text-[10px] uppercase font-bold opacity-50 block mb-1">
              Vista previa:
            </span>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
              style={{
                backgroundColor: `${color}25`,
                color: color,
              }}
            >
              <TagIcon className="w-3 h-3" />
              <span>{name || 'Nueva Tag'}</span>
            </span>
          </div>

          <div className="pt-3 border-t flex justify-end gap-2" style={{ borderColor: 'var(--border-color)' }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-semibold border hover:bg-black/5 dark:hover:bg-white/10"
              style={{ borderColor: 'var(--border-color)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl font-bold text-white shadow-xs hover:opacity-95 active:scale-95 flex items-center gap-1.5"
              style={{ backgroundColor: accentColor }}
            >
              <Check className="w-4 h-4" />
              <span>Guardar Tag</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
