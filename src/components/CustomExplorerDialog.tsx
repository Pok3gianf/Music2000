import React, { useState, useRef } from 'react';
import {
  Folder,
  Music,
  Video,
  FileText,
  FileCode,
  HardDrive,
  Home,
  Monitor,
  DownloadCloud,
  ArrowUp,
  X,
  Upload,
  Check,
  Eye,
} from 'lucide-react';
import { ExplorerFileItem } from '../types';

interface CustomExplorerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFiles: (files: { name: string; url: string; file?: File; duration?: number }[]) => void;
  accentColor: string;
}

const SAMPLE_VIRTUAL_FILES: Record<string, ExplorerFileItem[]> = {
  'C:/Users/Usuario': [
    { name: 'Escritorio', path: 'C:/Users/Usuario/Escritorio', kind: 'folder' },
    { name: 'Musica', path: 'C:/Users/Usuario/Musica', kind: 'folder' },
    { name: 'Descargas', path: 'C:/Users/Usuario/Descargas', kind: 'folder' },
    { name: 'Documentos', path: 'C:/Users/Usuario/Documentos', kind: 'folder' },
  ],
  'C:/Users/Usuario/Musica': [
    {
      name: 'Corporate_Breeze_Lofi.wav',
      path: 'C:/Users/Usuario/Musica/Corporate_Breeze_Lofi.wav',
      kind: 'audio',
      size: 4200000,
    },
    {
      name: 'Memphis_Sessions_Vol1.p2000',
      path: 'C:/Users/Usuario/Musica/Memphis_Sessions_Vol1.p2000',
      kind: 'playlist',
      size: 14200,
    },
    {
      name: 'Neon_Skyline_Synth.mp3',
      path: 'C:/Users/Usuario/Musica/Neon_Skyline_Synth.mp3',
      kind: 'audio',
      size: 8400000,
    },
    {
      name: 'Pastel_Chords_Study.mp3',
      path: 'C:/Users/Usuario/Musica/Pastel_Chords_Study.mp3',
      kind: 'audio',
      size: 6100000,
    },
    {
      name: 'Videoclip_Showcase.mp4',
      path: 'C:/Users/Usuario/Musica/Videoclip_Showcase.mp4',
      kind: 'video',
      size: 18500000,
    },
  ],
  'C:/Users/Usuario/Descargas': [
    {
      name: 'Podcast_OmegaLabs_Ep1.mp3',
      path: 'C:/Users/Usuario/Descargas/Podcast_OmegaLabs_Ep1.mp3',
      kind: 'audio',
      size: 24500000,
    },
    {
      name: 'Classic_Lofi_Track.m3u',
      path: 'C:/Users/Usuario/Descargas/Classic_Lofi_Track.m3u',
      kind: 'playlist',
      size: 1200,
    },
  ],
  'C:/Users/Usuario/Documentos': [
    {
      name: 'Music2000_Config.s2000',
      path: 'C:/Users/Usuario/Documentos/Music2000_Config.s2000',
      kind: 'file',
      size: 3400,
    },
    {
      name: 'Pastel_Theme.t2000',
      path: 'C:/Users/Usuario/Documentos/Pastel_Theme.t2000',
      kind: 'file',
      size: 2100,
    },
  ],
  'C:/Users/Usuario/Escritorio': [
    {
      name: 'Musica_Favorita.p2000',
      path: 'C:/Users/Usuario/Escritorio/Musica_Favorita.p2000',
      kind: 'playlist',
      size: 8900,
    },
  ],
};

export const CustomExplorerDialog: React.FC<CustomExplorerDialogProps> = ({
  isOpen,
  onClose,
  onSelectFiles,
  accentColor,
}) => {
  const [currentPath, setCurrentPath] = useState('C:/Users/Usuario/Musica');
  const [pathInput, setPathInput] = useState('C:/Users/Usuario/Musica');
  const [userFiles, setUserFiles] = useState<Record<string, ExplorerFileItem[]>>({});
  const [selectedItem, setSelectedItem] = useState<ExplorerFileItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Combine virtual files + user uploaded files
  const currentEntries: ExplorerFileItem[] = [
    ...(SAMPLE_VIRTUAL_FILES[currentPath] || []),
    ...(userFiles[currentPath] || []),
  ];

  const handleGoPath = (p: string) => {
    setCurrentPath(p);
    setPathInput(p);
    setSelectedItem(null);
  };

  const handleGoUp = () => {
    const parts = currentPath.split('/');
    if (parts.length > 1) {
      parts.pop();
      const parent = parts.join('/') || 'C:';
      handleGoPath(parent);
    }
  };

  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: ExplorerFileItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
      let kind: ExplorerFileItem['kind'] = 'file';
      if (['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac'].includes(ext)) {
        kind = 'audio';
      } else if (['.mp4', '.webm', '.mkv', '.avi', '.mov'].includes(ext)) {
        kind = 'video';
      } else if (['.p2000', '.m3u', '.m3u8', '.fpl'].includes(ext)) {
        kind = 'playlist';
      }

      newItems.push({
        name: f.name,
        path: `${currentPath}/${f.name}`,
        kind,
        size: f.size,
        fileRef: f,
      });
    }

    setUserFiles((prev) => ({
      ...prev,
      [currentPath]: [...(prev[currentPath] || []), ...newItems],
    }));

    if (newItems.length > 0) {
      setSelectedItem(newItems[0]);
    }
  };

  const handleConfirmSelection = () => {
    if (!selectedItem) {
      alert('Por favor selecciona un archivo o carpeta.');
      return;
    }

    if (selectedItem.kind === 'folder') {
      handleGoPath(selectedItem.path);
      return;
    }

    let url = '';
    if (selectedItem.fileRef) {
      url = URL.createObjectURL(selectedItem.fileRef);
    } else {
      url = selectedItem.path;
    }

    onSelectFiles([
      {
        name: selectedItem.name,
        url,
        file: selectedItem.fileRef,
        duration: 45000,
      },
    ]);
    onClose();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const getKindLabel = (kind: string) => {
    switch (kind) {
      case 'folder':
        return 'Carpeta';
      case 'audio':
        return 'Canción / Audio';
      case 'video':
        return 'Videoclip / Video';
      case 'playlist':
        return 'Playlist';
      default:
        return 'Archivo';
    }
  };

  const getKindIcon = (kind: string) => {
    switch (kind) {
      case 'folder':
        return <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20" />;
      case 'audio':
        return <Music className="w-4 h-4 text-emerald-500" />;
      case 'video':
        return <Video className="w-4 h-4 text-rose-500" />;
      case 'playlist':
        return <FileCode className="w-4 h-4 text-purple-500" />;
      default:
        return <FileText className="w-4 h-4 opacity-60" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div
        className="w-full max-w-4xl h-[580px] rounded-2xl shadow-2xl border flex flex-col overflow-hidden transition-all"
        style={{
          backgroundColor: 'var(--panel-bg)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-color)',
        }}
      >
        {/* Header bar */}
        <div
          className="h-11 px-4 border-b flex items-center justify-between shrink-0"
          style={{
            backgroundColor: 'var(--bg-color)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4" style={{ color: accentColor }} />
            <span className="font-extrabold text-xs tracking-wider uppercase">
              Explorador de Archivos Custom — Music2000
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4 opacity-70" />
          </button>
        </div>

        {/* Path navigation bar */}
        <div
          className="p-2.5 border-b flex items-center gap-2 shrink-0 text-xs"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <input
            type="text"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGoPath(pathInput)}
            className="flex-1 px-3 py-1.5 rounded-lg border font-mono outline-none"
            style={{
              backgroundColor: 'var(--bg-color)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-color)',
            }}
          />
          <button
            onClick={() => handleGoPath(pathInput)}
            className="px-3 py-1.5 rounded-lg font-semibold border hover:bg-black/5 dark:hover:bg-white/10"
            style={{ borderColor: 'var(--border-color)' }}
          >
            Ir
          </button>
          <button
            onClick={handleGoUp}
            className="p-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/10"
            style={{ borderColor: 'var(--border-color)' }}
            title="Subir de nivel"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleGoPath('C:/Users/Usuario')}
            className="px-3 py-1.5 rounded-lg font-semibold border hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Inicio</span>
          </button>

          {/* Subir archivo desde PC real */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg font-bold text-white shadow-xs hover:opacity-90 flex items-center gap-1.5 cursor-pointer ml-1"
            style={{ backgroundColor: accentColor }}
            title="Importar archivos desde tu ordenador"
          >
            <Upload className="w-3.5 h-3.5 text-white" />
            <span>Subir de PC...</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,video/*,.p2000,.m3u,.m3u8,.fpl"
            onChange={handleLocalFileUpload}
            className="hidden"
          />
        </div>

        {/* Body columns: Sidebar, File list, Preview panel */}
        <div className="flex-1 flex min-h-0">
          {/* Quick places sidebar */}
          <div
            className="w-44 border-r p-2 flex flex-col gap-1 shrink-0 text-xs font-semibold overflow-y-auto"
            style={{
              backgroundColor: 'var(--bg-color)',
              borderColor: 'var(--border-color)',
            }}
          >
            <span className="text-[10px] uppercase font-bold opacity-50 px-2 py-1">
              Lugares Rápidos
            </span>
            <button
              onClick={() => handleGoPath('C:/Users/Usuario')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-left"
            >
              <Home className="w-3.5 h-3.5 opacity-70" />
              <span>Inicio</span>
            </button>
            <button
              onClick={() => handleGoPath('C:/Users/Usuario/Escritorio')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-left"
            >
              <Monitor className="w-3.5 h-3.5 opacity-70" />
              <span>Escritorio</span>
            </button>
            <button
              onClick={() => handleGoPath('C:/Users/Usuario/Musica')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-left font-bold"
              style={{ color: accentColor }}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Música</span>
            </button>
            <button
              onClick={() => handleGoPath('C:/Users/Usuario/Descargas')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-left"
            >
              <DownloadCloud className="w-3.5 h-3.5 opacity-70" />
              <span>Descargas</span>
            </button>
            <button
              onClick={() => handleGoPath('C:/Users/Usuario/Documentos')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-left"
            >
              <FileText className="w-3.5 h-3.5 opacity-70" />
              <span>Documentos</span>
            </button>

            <span className="text-[10px] uppercase font-bold opacity-50 px-2 py-1 mt-2">
              Unidades de Disco
            </span>
            <button
              onClick={() => handleGoPath('C:/')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-left"
            >
              <HardDrive className="w-3.5 h-3.5 opacity-70" />
              <span>Disco Local C:/</span>
            </button>
            <button
              onClick={() => handleGoPath('D:/')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-left"
            >
              <HardDrive className="w-3.5 h-3.5 opacity-70" />
              <span>Disco Datos D:/</span>
            </button>
          </div>

          {/* Center File Tree / List */}
          <div className="flex-1 flex flex-col min-w-0 border-r" style={{ borderColor: 'var(--border-color)' }}>
            {/* Column headers */}
            <div
              className="grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wider border-b opacity-60 shrink-0"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="col-span-7">Nombre</div>
              <div className="col-span-3">Tipo</div>
              <div className="col-span-2 text-right">Tamaño</div>
            </div>

            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
              {currentEntries.length === 0 ? (
                <div className="p-8 text-center opacity-50 text-xs">
                  Carpeta vacía. Haz clic en "Subir de PC..." para añadir archivos locales.
                </div>
              ) : (
                currentEntries.map((item) => {
                  const isSelected = selectedItem?.path === item.path;
                  return (
                    <div
                      key={item.path}
                      onClick={() => setSelectedItem(item)}
                      onDoubleClick={() => {
                        if (item.kind === 'folder') {
                          handleGoPath(item.path);
                        } else {
                          handleConfirmSelection();
                        }
                      }}
                      className="grid grid-cols-12 gap-2 px-2.5 py-1.5 rounded-lg text-xs items-center cursor-pointer transition-colors border"
                      style={{
                        backgroundColor: isSelected ? 'var(--bg-color)' : 'transparent',
                        borderColor: isSelected ? accentColor : 'transparent',
                      }}
                    >
                      <div className="col-span-7 flex items-center gap-2 truncate">
                        {getKindIcon(item.kind)}
                        <span className="truncate font-medium">{item.name}</span>
                      </div>
                      <div className="col-span-3 opacity-60 truncate">
                        {getKindLabel(item.kind)}
                      </div>
                      <div className="col-span-2 text-right font-mono opacity-60">
                        {formatFileSize(item.size)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Preview panel */}
          <div
            className="w-56 p-3 flex flex-col items-center text-center shrink-0 overflow-y-auto"
            style={{
              backgroundColor: 'var(--bg-color)',
              color: 'var(--text-color)',
            }}
          >
            <span className="text-[10px] uppercase font-bold opacity-50 mb-3">
              Vista Previa
            </span>

            <div
              className="w-32 h-24 rounded-xl border flex items-center justify-center mb-3 bg-black/5 dark:bg-black/20"
              style={{ borderColor: 'var(--border-color)' }}
            >
              {selectedItem ? (
                getKindIcon(selectedItem.kind)
              ) : (
                <Eye className="w-6 h-6 opacity-30" />
              )}
            </div>

            <p className="font-bold text-xs truncate max-w-[190px] mb-1">
              {selectedItem ? selectedItem.name : 'Ningún archivo seleccionado'}
            </p>

            <p className="text-[11px] opacity-60 mb-2">
              {selectedItem ? getKindLabel(selectedItem.kind) : 'Selecciona un elemento'}
            </p>

            {selectedItem?.size && (
              <span className="text-[11px] font-mono opacity-80 font-semibold px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
                {formatFileSize(selectedItem.size)}
              </span>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div
          className="h-14 px-4 border-t flex items-center justify-between shrink-0"
          style={{
            backgroundColor: 'var(--bg-color)',
            borderColor: 'var(--border-color)',
          }}
        >
          <span className="text-xs opacity-60 truncate max-w-sm">
            {selectedItem ? selectedItem.path : currentPath}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border hover:bg-black/5 dark:hover:bg-white/10"
              style={{ borderColor: 'var(--border-color)' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmSelection}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 active:scale-95 flex items-center gap-1.5"
              style={{ backgroundColor: accentColor }}
            >
              <Check className="w-4 h-4" />
              <span>Aceptar / Abrir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
