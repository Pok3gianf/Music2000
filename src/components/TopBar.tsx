import React from 'react';
import {
  Minus,
  Square,
  X,
  Settings,
  Download,
  Terminal,
  FolderPlus,
  Cookie,
  Layers,
  Disc,
  ListMusic,
  Zap,
  Smartphone,
  Tablet,
  Tv,
  Monitor,
} from 'lucide-react';
import { AppConfig, DeviceMode } from '../types';

interface TopBarProps {
  config: AppConfig;
  accentColor: string;
  onOpenSettings: () => void;
  onOpenDeveloper: () => void;
  onOpenDesktopDownload: () => void;
  onOpenExplorer: () => void;
  onOpenCdImport: () => void;
  onOpenPlaylistImport: () => void;
  onToggleLiteMode: () => void;
  onSelectDeviceMode: (mode: DeviceMode) => void;
  onToggleMaximize: () => void;
  onMinimize: () => void;
  isMaximized: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  config,
  accentColor,
  onOpenSettings,
  onOpenDeveloper,
  onOpenDesktopDownload,
  onOpenExplorer,
  onOpenCdImport,
  onOpenPlaylistImport,
  onToggleLiteMode,
  onSelectDeviceMode,
  onToggleMaximize,
  onMinimize,
  isMaximized,
}) => {
  const currentDevice = config.device_mode || 'desktop';
  const isLite = config.is_lite_mode || false;

  return (
    <header
      className="h-12 border-b flex items-center justify-between px-3 select-none transition-colors duration-200 gap-2 overflow-x-auto"
      style={{
        backgroundColor: 'var(--panel-bg)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-color)',
      }}
    >
      {/* Brand & Memphis Logo */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white shadow-xs transition-transform hover:scale-105"
          style={{ backgroundColor: accentColor }}
        >
          <Layers className="w-4 h-4 text-white" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className="font-extrabold text-sm sm:text-base tracking-wider transition-colors duration-300"
            style={{ color: accentColor }}
          >
            MUSIC2000
          </span>
          <span className="hidden sm:inline text-[9px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 opacity-75">
            Memphis Edition
          </span>
        </div>
      </div>

      {/* Responsive Device Mode Switcher (Escritorio, Móvil, Tablet, TV) */}
      <div
        className="hidden md:flex items-center rounded-lg border p-0.5 text-xs shrink-0"
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-color)' }}
      >
        <button
          onClick={() => onSelectDeviceMode('desktop')}
          className={`px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${
            currentDevice === 'desktop' ? 'shadow-xs font-bold text-white' : 'opacity-60 hover:opacity-100'
          }`}
          style={{ backgroundColor: currentDevice === 'desktop' ? accentColor : 'transparent' }}
          title="Modo Escritorio (Layout de 3 columnas completo)"
        >
          <Monitor className="w-3 h-3" />
          <span>PC</span>
        </button>

        <button
          onClick={() => onSelectDeviceMode('mobile')}
          className={`px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${
            currentDevice === 'mobile' ? 'shadow-xs font-bold text-white' : 'opacity-60 hover:opacity-100'
          }`}
          style={{ backgroundColor: currentDevice === 'mobile' ? accentColor : 'transparent' }}
          title="Modo Móvil (Vista compacta táctil)"
        >
          <Smartphone className="w-3 h-3" />
          <span>Celular</span>
        </button>

        <button
          onClick={() => onSelectDeviceMode('tablet')}
          className={`px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${
            currentDevice === 'tablet' ? 'shadow-xs font-bold text-white' : 'opacity-60 hover:opacity-100'
          }`}
          style={{ backgroundColor: currentDevice === 'tablet' ? accentColor : 'transparent' }}
          title="Modo Tablet (Layout dual balanceado)"
        >
          <Tablet className="w-3 h-3" />
          <span>Tablet</span>
        </button>

        <button
          onClick={() => onSelectDeviceMode('tv')}
          className={`px-2 py-0.5 rounded-md flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer ${
            currentDevice === 'tv' ? 'shadow-xs font-bold text-white' : 'opacity-60 hover:opacity-100'
          }`}
          style={{ backgroundColor: currentDevice === 'tv' ? accentColor : 'transparent' }}
          title="Modo AndroidTV (Controles de alto contraste y letras grandes para control remoto)"
        >
          <Tv className="w-3 h-3" />
          <span>TV</span>
        </button>
      </div>

      {/* Action shortcuts */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Lite Mode Toggle */}
        <button
          onClick={onToggleLiteMode}
          className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md border transition-all cursor-pointer ${
            isLite ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'opacity-70 hover:opacity-100'
          }`}
          style={{ borderColor: isLite ? undefined : 'var(--border-color)' }}
          title={isLite ? 'Modo Ligero ACTIVO: Mínimo consumo de RAM y 0% CPU' : 'Activar Modo Ligero (Súper eficiente)'}
        >
          <Zap className={`w-3.5 h-3.5 ${isLite ? 'text-sky-500 fill-sky-500' : ''}`} />
          <span className="hidden sm:inline">{isLite ? 'Ligero ON' : 'Ligero'}</span>
        </button>

        {/* Import CD shortcut */}
        <button
          onClick={onOpenCdImport}
          className="hidden md:flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md border transition-all hover:opacity-90 cursor-pointer"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--bg-color)',
          }}
          title="Importar pistas de Audio CD"
        >
          <Disc className="w-3.5 h-3.5 text-sky-500" />
          <span>CD</span>
        </button>

        {/* Import Playlist shortcut */}
        <button
          onClick={onOpenPlaylistImport}
          className="hidden md:flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md border transition-all hover:opacity-90 cursor-pointer"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--bg-color)',
          }}
          title="Importar Playlist M3U, M3U8 o JSON con canciones"
        >
          <ListMusic className="w-3.5 h-3.5 text-emerald-500" />
          <span>Importar Playlist</span>
        </button>

        {/* Custom Explorer Button */}
        <button
          onClick={onOpenExplorer}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md border transition-all hover:opacity-90 active:scale-95 cursor-pointer"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--bg-color)',
          }}
          title="Abrir Explorador de Archivos Custom"
        >
          <FolderPlus className="w-3.5 h-3.5" style={{ color: accentColor }} />
          <span className="hidden sm:inline">Explorador</span>
        </button>

        {/* Desktop & Android Download Button */}
        <button
          onClick={onOpenDesktopDownload}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-md shadow-xs transition-all hover:opacity-95 active:scale-95 cursor-pointer"
          style={{
            backgroundColor: accentColor,
            color: '#ffffff',
          }}
          title="Descargar versión de escritorio Windows (.exe / .bat) o Android / AndroidTV"
        >
          <Download className="w-3.5 h-3.5 text-white" />
          <span>Instalador</span>
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Ajustes, Temas Pastel y Ecualizador"
          aria-label="Ajustes"
        >
          <Settings className="w-4 h-4 opacity-75" />
        </button>

        {/* Dev Mode Button */}
        <button
          onClick={onOpenDeveloper}
          className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Modo Desarrollador & Compilador"
          aria-label="Modo Desarrollador"
        >
          <Terminal className="w-4 h-4 opacity-75" />
        </button>

        {/* Window controls (Desktop simulation) */}
        <div className="hidden sm:flex items-center gap-1 ml-1 pl-1.5 border-l" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={onMinimize}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Minimizar"
          >
            <Minus className="w-3 h-3 opacity-60" />
          </button>
          <button
            onClick={onToggleMaximize}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title={isMaximized ? 'Restaurar' : 'Maximizar'}
          >
            <Square className="w-3 h-3 opacity-60" />
          </button>
          <button
            onClick={() => {
              if (confirm('¿Cerrar sesión de Music2000? La reproducción se detendrá.')) {
                window.location.reload();
              }
            }}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-3 h-3 opacity-60" />
          </button>
        </div>
      </div>
    </header>
  );
};
