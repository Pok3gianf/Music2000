import React, { useState } from 'react';
import {
  Settings,
  Palette,
  Cookie,
  Shield,
  Trash2,
  FileDown,
  FileUp,
  X,
  Check,
  Sparkles,
} from 'lucide-react';
import { AppConfig, ThemePreset } from '../types';
import { PRESET_THEMES } from '../data/themes';
import { getAllM2KCookies, clearAllMusic2000Cookies } from '../utils/cookieStorage';
import { downloadTextFile } from '../utils/desktopPackage';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSaveConfig: (newConfig: AppConfig) => void;
  onSelectPresetTheme: (preset: ThemePreset) => void;
  accentColor: string;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onSelectPresetTheme,
  accentColor,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'visual'>('general');
  const [tempConfig, setTempConfig] = useState<AppConfig>({ ...config });
  const [activeCookies, setActiveCookies] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen) {
      setTempConfig({ ...config });
      setActiveCookies(getAllM2KCookies());
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: ThemePreset) => {
    setTempConfig((prev) => ({
      ...prev,
      themePresetName: preset.name,
      theme_mode: preset.theme_mode,
      accent: preset.colors.accent,
      contrast_a: preset.contrast_a,
      contrast_b: preset.contrast_b,
      animated_accent: preset.animated_accent,
      colors: { ...preset.colors },
    }));
    onSelectPresetTheme(preset);
  };

  const handleColorChange = (key: keyof AppConfig['colors'], hex: string) => {
    setTempConfig((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        [key]: hex,
      },
      accent: key === 'accent' ? hex : prev.accent,
    }));
  };

  const handleClearCookies = () => {
    if (window.confirm('¿Seguro que deseas borrar todas las cookies y datos locales de Music2000? Se restablecerá la biblioteca al estado inicial.')) {
      clearAllMusic2000Cookies();
      setActiveCookies({});
      window.location.reload();
    }
  };

  const handleExportConfig = () => {
    const data = {
      format: 'settings2000',
      app: 'Music2000',
      version: '0.3.6',
      config: tempConfig,
    };
    downloadTextFile('Music2000_Ajustes.s2000', JSON.stringify(data, null, 2), 'application/json');
  };

  const handleExportTheme = () => {
    const data = {
      format: 'theme2000',
      app: 'Music2000',
      version: '0.3.6',
      name: tempConfig.themePresetName || 'Custom Theme',
      colors: tempConfig.colors,
      contrast_a: tempConfig.contrast_a,
      contrast_b: tempConfig.contrast_b,
      animated_accent: tempConfig.animated_accent,
    };
    downloadTextFile('Music2000_Tema.t2000', JSON.stringify(data, null, 2), 'application/json');
  };

  const handleImportThemeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.colors) {
          setTempConfig((prev) => ({
            ...prev,
            colors: { ...prev.colors, ...parsed.colors },
            contrast_a: parsed.contrast_a || prev.contrast_a,
            contrast_b: parsed.contrast_b || prev.contrast_b,
            animated_accent: parsed.animated_accent ?? prev.animated_accent,
          }));
          alert('Tema importado con éxito.');
        }
      } catch (err) {
        alert('Error al leer el archivo de tema.');
      }
    };
    reader.readAsText(file);
  };

  const handleSaveAndClose = () => {
    onSaveConfig(tempConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div
        className="w-full max-w-2xl rounded-2xl shadow-2xl border flex flex-col max-h-[85vh] overflow-hidden transition-all"
        style={{
          backgroundColor: 'var(--panel-bg)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-color)',
        }}
      >
        {/* Header */}
        <div
          className="h-12 px-5 border-b flex items-center justify-between shrink-0"
          style={{
            backgroundColor: 'var(--bg-color)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-center gap-2 font-extrabold text-sm uppercase tracking-wider">
            <Settings className="w-4 h-4" style={{ color: accentColor }} />
            <span>Ajustes & Personalización</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4 opacity-70" />
          </button>
        </div>

        {/* Tab switcher */}
        <div
          className="flex border-b px-5 pt-3 gap-2 shrink-0 text-xs font-bold"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <button
            onClick={() => setActiveTab('general')}
            className="flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-all cursor-pointer"
            style={{
              borderColor: activeTab === 'general' ? accentColor : 'transparent',
              color: activeTab === 'general' ? accentColor : 'var(--text-color)',
              opacity: activeTab === 'general' ? 1 : 0.6,
            }}
          >
            <Shield className="w-4 h-4" />
            <span>General & Cookies</span>
          </button>

          <button
            onClick={() => setActiveTab('visual')}
            className="flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-all cursor-pointer"
            style={{
              borderColor: activeTab === 'visual' ? accentColor : 'transparent',
              color: activeTab === 'visual' ? accentColor : 'var(--text-color)',
              opacity: activeTab === 'visual' ? 1 : 0.6,
            }}
          >
            <Palette className="w-4 h-4" />
            <span>Visual & Temas Pastel</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 custom-scrollbar text-xs">
          {activeTab === 'general' ? (
            <>
              {/* System & Window Behavior */}
              <div
                className="p-4 rounded-xl border space-y-3"
                style={{
                  backgroundColor: 'var(--bg-color)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <div className="font-bold text-xs uppercase tracking-wider opacity-75">
                  Comportamiento del Sistema
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempConfig.minimize_to_tray}
                    onChange={(e) =>
                      setTempConfig((prev) => ({
                        ...prev,
                        minimize_to_tray: e.target.checked,
                      }))
                    }
                    className="accent-emerald-500 rounded"
                  />
                  <span>Minimizar a la bandeja del sistema (Desktop)</span>
                </label>
              </div>

              {/* Privacy & Networking */}
              <div
                className="p-4 rounded-xl border space-y-3"
                style={{
                  backgroundColor: 'var(--bg-color)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <div className="font-bold text-xs uppercase tracking-wider opacity-75">
                  Privacidad & Datos
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempConfig.privacy_local_only}
                    onChange={(e) =>
                      setTempConfig((prev) => ({
                        ...prev,
                        privacy_local_only: e.target.checked,
                      }))
                    }
                    className="accent-emerald-500 rounded"
                  />
                  <span>Modo local estricto (bloquear peticiones de red externas)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempConfig.privacy_no_extra_recent}
                    onChange={(e) =>
                      setTempConfig((prev) => ({
                        ...prev,
                        privacy_no_extra_recent: e.target.checked,
                      }))
                    }
                    className="accent-emerald-500 rounded"
                  />
                  <span>No mantener listas recientes adicionales en disco</span>
                </label>
              </div>

              {/* Cookie Storage Inspector */}
              <div
                className="p-4 rounded-xl border space-y-3"
                style={{
                  backgroundColor: 'var(--bg-color)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider opacity-75">
                    <Cookie className="w-4 h-4 text-emerald-500" />
                    <span>Sistema de Guardado en Cookies</span>
                  </div>
                  <span className="font-mono text-[11px] opacity-70">
                    {Object.keys(activeCookies).length} cookies almacenadas
                  </span>
                </div>

                <p className="text-[11px] opacity-70">
                  Music2000 guarda automáticamente tu biblioteca, canciones, playlists,
                  tags y configuración de ecualizador en las cookies del navegador con validez de 365 días.
                </p>

                {/* Cookie list preview */}
                <div
                  className="rounded-lg border p-2.5 font-mono text-[11px] max-h-32 overflow-y-auto space-y-1.5"
                  style={{
                    backgroundColor: 'var(--panel-bg)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  {Object.entries(activeCookies).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center opacity-80">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {k}
                      </span>
                      <span className="opacity-50">{v.length} bytes</span>
                    </div>
                  ))}
                  {Object.keys(activeCookies).length === 0 && (
                    <div className="opacity-50 text-center py-2">
                      Sin cookies personalizadas aún.
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleClearCookies}
                    className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 flex items-center gap-1.5 font-semibold transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Borrar Cookies & Datos Locales</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportConfig}
                    className="px-3 py-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1.5 font-semibold transition-all"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Exportar Config (.s2000)</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Preset Themes */}
              <div
                className="p-4 rounded-xl border space-y-3"
                style={{
                  backgroundColor: 'var(--bg-color)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider opacity-75">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Temas Preestablecidos (Corporate Memphis)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRESET_THEMES.map((preset) => {
                    const isSelected = tempConfig.themePresetName === preset.name;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleApplyPreset(preset)}
                        className="p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between"
                        style={{
                          backgroundColor: 'var(--panel-bg)',
                          borderColor: isSelected ? accentColor : 'var(--border-color)',
                          boxShadow: isSelected ? `0 0 0 2px ${accentColor}` : undefined,
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs">{preset.name}</span>
                          <div className="flex gap-1">
                            <div
                              className="w-3.5 h-3.5 rounded-full border border-black/20"
                              style={{ backgroundColor: preset.colors.accent }}
                            />
                            <div
                              className="w-3.5 h-3.5 rounded-full border border-black/20"
                              style={{ backgroundColor: preset.contrast_a }}
                            />
                            <div
                              className="w-3.5 h-3.5 rounded-full border border-black/20"
                              style={{ backgroundColor: preset.contrast_b }}
                            />
                          </div>
                        </div>
                        <p className="text-[11px] opacity-70 line-clamp-2">
                          {preset.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Advanced Color Customization */}
              <div
                className="p-4 rounded-xl border space-y-3"
                style={{
                  backgroundColor: 'var(--bg-color)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <div className="font-bold text-xs uppercase tracking-wider opacity-75">
                  Personalización Avanzada de Colores
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="flex items-center justify-between p-2 rounded-lg border bg-white/5">
                    <span className="font-medium opacity-80">Acento Principal</span>
                    <input
                      type="color"
                      value={tempConfig.colors.accent}
                      onChange={(e) => handleColorChange('accent', e.target.value)}
                      className="w-7 h-7 rounded border-none cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg border bg-white/5">
                    <span className="font-medium opacity-80">Fondo General</span>
                    <input
                      type="color"
                      value={tempConfig.colors.bg}
                      onChange={(e) => handleColorChange('bg', e.target.value)}
                      className="w-7 h-7 rounded border-none cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg border bg-white/5">
                    <span className="font-medium opacity-80">Fondo Panel</span>
                    <input
                      type="color"
                      value={tempConfig.colors.panel}
                      onChange={(e) => handleColorChange('panel', e.target.value)}
                      className="w-7 h-7 rounded border-none cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg border bg-white/5">
                    <span className="font-medium opacity-80">Fondo Ecualizador</span>
                    <input
                      type="color"
                      value={tempConfig.colors.eq_bg}
                      onChange={(e) => handleColorChange('eq_bg', e.target.value)}
                      className="w-7 h-7 rounded border-none cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg border bg-white/5">
                    <span className="font-medium opacity-80">Texto Principal</span>
                    <input
                      type="color"
                      value={tempConfig.colors.text}
                      onChange={(e) => handleColorChange('text', e.target.value)}
                      className="w-7 h-7 rounded border-none cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg border bg-white/5">
                    <span className="font-medium opacity-80">Fondo Video</span>
                    <input
                      type="color"
                      value={tempConfig.colors.video_bg}
                      onChange={(e) => handleColorChange('video_bg', e.target.value)}
                      className="w-7 h-7 rounded border-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t mt-3 flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-medium opacity-80">Contraste A:</span>
                    <input
                      type="color"
                      value={tempConfig.contrast_a}
                      onChange={(e) =>
                        setTempConfig((prev) => ({ ...prev, contrast_a: e.target.value }))
                      }
                      className="w-6 h-6 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-medium opacity-80">Contraste B:</span>
                    <input
                      type="color"
                      value={tempConfig.contrast_b}
                      onChange={(e) =>
                        setTempConfig((prev) => ({ ...prev, contrast_b: e.target.value }))
                      }
                      className="w-6 h-6 rounded cursor-pointer"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={tempConfig.animated_accent}
                      onChange={(e) =>
                        setTempConfig((prev) => ({
                          ...prev,
                          animated_accent: e.target.checked,
                        }))
                      }
                      className="accent-emerald-500 rounded"
                    />
                    <span>Animar Contraste Dinámico (A ↔ B)</span>
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleExportTheme}
                    className="px-3 py-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1.5 font-semibold"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Exportar Tema (.t2000)</span>
                  </button>

                  <label
                    className="px-3 py-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1.5 font-semibold cursor-pointer"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Importar Tema (.t2000)</span>
                    <input
                      type="file"
                      accept=".t2000,.json"
                      onChange={handleImportThemeFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="h-14 px-5 border-t flex items-center justify-end gap-2 shrink-0"
          style={{
            backgroundColor: 'var(--bg-color)',
            borderColor: 'var(--border-color)',
          }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold border hover:bg-black/5 dark:hover:bg-white/10"
            style={{ borderColor: 'var(--border-color)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveAndClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 active:scale-95 flex items-center gap-1.5"
            style={{ backgroundColor: accentColor }}
          >
            <Check className="w-4 h-4" />
            <span>Guardar Ajustes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
