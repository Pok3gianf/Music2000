import React, { useState } from 'react';
import {
  ListMusic,
  Plus,
  FileDown,
  Disc,
  MoreVertical,
  Edit2,
  Trash2,
  Music,
} from 'lucide-react';
import { LibraryState } from '../types';
import { downloadTextFile } from '../utils/desktopPackage';

interface PlaylistsSidebarProps {
  library: LibraryState;
  currentPlaylist: string;
  onSelectPlaylist: (name: string) => void;
  onNewPlaylist: () => void;
  onImportPlaylist: () => void;
  onImportCd: () => void;
  onRenamePlaylist: (oldName: string) => void;
  onDeletePlaylist: (name: string) => void;
  accentColor: string;
}

export const PlaylistsSidebar: React.FC<PlaylistsSidebarProps> = ({
  library,
  currentPlaylist,
  onSelectPlaylist,
  onNewPlaylist,
  onImportPlaylist,
  onImportCd,
  onRenamePlaylist,
  onDeletePlaylist,
  accentColor,
}) => {
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  const playlistNames = Object.keys(library.playlists || {});

  const handleExportPlaylist = (name: string, format: 'p2000' | 'm3u') => {
    const pl = library.playlists[name];
    if (!pl) return;

    if (format === 'p2000') {
      const data = {
        format: 'playlist2000',
        app: 'Music2000',
        version: '0.3.6',
        name,
        items: pl.items,
      };
      downloadTextFile(`${name}.p2000`, JSON.stringify(data, null, 2), 'application/json');
    } else {
      const lines = ['#EXTM3U'];
      pl.items.forEach((song) => {
        const sec = Math.floor((song.duration || 0) / 1000);
        const label = song.artist ? `${song.artist} - ${song.title}` : song.title;
        lines.push(`#EXTINF:${sec},${label}`);
        lines.push(song.path || song.url || '');
      });
      downloadTextFile(`${name}.m3u`, lines.join('\n'), 'audio/x-mpegurl');
    }
    setMenuOpenFor(null);
  };

  return (
    <aside
      className="w-56 shrink-0 border-r flex flex-col justify-between p-3 select-none transition-colors duration-200"
      style={{
        backgroundColor: 'var(--panel-bg)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-color)',
      }}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Section Title */}
        <div className="flex items-center gap-2 mb-3 px-1">
          <ListMusic className="w-4 h-4" style={{ color: accentColor }} />
          <h2 className="text-xs font-bold uppercase tracking-wider opacity-70">
            Tu Música
          </h2>
        </div>

        {/* Playlists List */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {playlistNames.map((name) => {
            const isSelected = currentPlaylist === name;
            const count = library.playlists[name]?.items?.length || 0;

            return (
              <div
                key={name}
                className="relative group flex items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium transition-all cursor-pointer border"
                style={{
                  backgroundColor: isSelected ? 'var(--bg-color)' : 'transparent',
                  borderColor: isSelected ? accentColor : 'transparent',
                  color: isSelected ? accentColor : 'var(--text-color)',
                }}
                onClick={() => onSelectPlaylist(name)}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Music
                    className="w-3.5 h-3.5 shrink-0 opacity-60"
                    style={{ color: isSelected ? accentColor : undefined }}
                  />
                  <span className="truncate font-semibold text-xs">{name}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-mono opacity-60 bg-black/5 dark:bg-white/10"
                  >
                    {count}
                  </span>

                  {/* Kebab menu trigger */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenFor(menuOpenFor === name ? null : name);
                    }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-opacity"
                    aria-label="Opciones de playlist"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Dropdown Menu */}
                {menuOpenFor === name && (
                  <div
                    className="absolute right-0 top-full mt-1 z-30 w-44 rounded-lg shadow-lg border p-1 text-xs"
                    style={{
                      backgroundColor: 'var(--panel-bg)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-color)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {name !== 'Library' && (
                      <button
                        onClick={() => {
                          setMenuOpenFor(null);
                          onRenamePlaylist(name);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-left font-medium"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Renombrar</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleExportPlaylist(name, 'p2000')}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-left font-medium"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Exportar .p2000</span>
                    </button>

                    <button
                      onClick={() => handleExportPlaylist(name, 'm3u')}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-left font-medium"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Exportar .m3u</span>
                    </button>

                    {name !== 'Library' && (
                      <button
                        onClick={() => {
                          setMenuOpenFor(null);
                          onDeletePlaylist(name);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-red-500/10 text-red-500 text-left font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t mt-2 space-y-1.5" style={{ borderColor: 'var(--border-color)' }}>
        <button
          onClick={onNewPlaylist}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold border transition-all hover:opacity-90 active:scale-98 shadow-2xs"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--bg-color)',
            color: 'var(--text-color)',
          }}
        >
          <Plus className="w-3.5 h-3.5" style={{ color: accentColor }} />
          <span>Nueva Playlist</span>
        </button>

        <button
          onClick={onImportPlaylist}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all hover:opacity-90 active:scale-98"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--bg-color)',
            color: 'var(--text-color)',
          }}
        >
          <FileDown className="w-3.5 h-3.5 opacity-70" />
          <span>Importar Playlist</span>
        </button>

        <button
          onClick={onImportCd}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold border transition-all hover:opacity-90 active:scale-98"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--bg-color)',
            color: 'var(--text-color)',
          }}
        >
          <Disc className="w-3.5 h-3.5 opacity-70" />
          <span>Importar CD / Carpeta</span>
        </button>
      </div>
    </aside>
  );
};
