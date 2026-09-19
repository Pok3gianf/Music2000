import React, { useState, useEffect } from 'react';
import {
  Play,
  Grid,
  List,
  Layers,
  ArrowUp,
  ArrowDown,
  Tag as TagIcon,
  Trash2,
  FileEdit,
  Music2,
  Volume2,
  Plus,
  UploadCloud,
  Film,
} from 'lucide-react';
import { Song, Tag } from '../types';

interface TrackListProps {
  songs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song) => void;
  onEditMetadata: (song: Song) => void;
  onAssignTag: (song: Song) => void;
  onSetExistingTag: (songId: string, tag: Tag | null) => void;
  onRemoveSongs: (songIds: string[]) => void;
  onReorderSongs: (newSongs: Song[]) => void;
  allAvailableTags: Tag[];
  accentColor: string;
  onAddFiles?: (files: File[]) => void;
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const TrackList: React.FC<TrackListProps> = ({
  songs,
  currentSong,
  isPlaying,
  onPlaySong,
  onEditMetadata,
  onAssignTag,
  onSetExistingTag,
  onRemoveSongs,
  onReorderSongs,
  allAvailableTags,
  accentColor,
  onAddFiles,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [categoryMode, setCategoryMode] = useState<'simple' | 'categorized'>('simple');
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    song: Song;
  } | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Drag & drop external files listener
  const handleExternalFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleExternalFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleExternalFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onAddFiles) {
      onAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Calculate total duration
  const totalMs = songs.reduce((acc, s) => acc + (s.duration || 0), 0);

  // Keyboard shortcut listener for Ctrl+Up / Ctrl+Down
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.altKey) && selectedSongIds.length > 0 && categoryMode === 'simple') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          moveSelectedSongs(-1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          moveSelectedSongs(1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSongIds, songs, categoryMode]);

  // Close context menu on global click
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const moveSelectedSongs = (direction: -1 | 1) => {
    if (categoryMode !== 'simple') return;
    const items = [...songs];
    const idMap = new Map(items.map((s, idx) => [s.id, idx]));
    const selectedIndices = selectedSongIds
      .map((id) => idMap.get(id))
      .filter((idx): idx is number => idx !== undefined)
      .sort((a, b) => (direction < 0 ? a - b : b - a));

    if (selectedIndices.length === 0) return;

    for (const idx of selectedIndices) {
      const targetIdx = idx + direction;
      if (targetIdx >= 0 && targetIdx < items.length) {
        const temp = items[idx];
        items[idx] = items[targetIdx];
        items[targetIdx] = temp;
      }
    }
    onReorderSongs(items);
  };

  const handleSelectSong = (songId: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedSongIds((prev) =>
        prev.includes(songId) ? prev.filter((id) => id !== songId) : [...prev, songId]
      );
    } else if (e.shiftKey && selectedSongIds.length > 0) {
      const lastSelectedId = selectedSongIds[selectedSongIds.length - 1];
      const lastIdx = songs.findIndex((s) => s.id === lastSelectedId);
      const currIdx = songs.findIndex((s) => s.id === songId);
      if (lastIdx !== -1 && currIdx !== -1) {
        const start = Math.min(lastIdx, currIdx);
        const end = Math.max(lastIdx, currIdx);
        const rangeIds = songs.slice(start, end + 1).map((s) => s.id);
        setSelectedSongIds(Array.from(new Set([...selectedSongIds, ...rangeIds])));
      }
    } else {
      setSelectedSongIds([songId]);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, song: Song) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedSongIds.includes(song.id)) {
      setSelectedSongIds([song.id]);
    }
    setContextMenu({ x: e.clientX, y: e.clientY, song });
  };

  // Drag and drop in simple mode
  const handleDragStart = (idx: number) => {
    if (categoryMode !== 'simple') return;
    setDraggedIndex(idx);
  };

  const handleDragOver = (e: React.DragEvent, targetIdx: number) => {
    if (categoryMode !== 'simple' || draggedIndex === null || draggedIndex === targetIdx) return;
    e.preventDefault();
  };

  const handleDrop = (targetIdx: number) => {
    if (categoryMode !== 'simple' || draggedIndex === null || draggedIndex === targetIdx) return;
    const newItems = [...songs];
    const [moved] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIdx, 0, moved);
    setDraggedIndex(null);
    onReorderSongs(newItems);
  };

  // Group songs by tag if in categorized mode
  const groupedSongs: Record<string, Song[]> = {};
  if (categoryMode === 'categorized') {
    songs.forEach((s) => {
      const groupKey = s.tag?.name || 'Sin Categoría';
      if (!groupedSongs[groupKey]) groupedSongs[groupKey] = [];
      groupedSongs[groupKey].push(s);
    });
  }

  return (
    <section
      onDragOver={handleExternalFileDragOver}
      onDragLeave={handleExternalFileDragLeave}
      onDrop={handleExternalFileDrop}
      className="flex-1 flex flex-col min-w-0 border-r overflow-hidden transition-colors duration-200 relative"
      style={{
        backgroundColor: 'var(--bg-color)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-color)',
      }}
    >
      {/* Drop Zone Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-40 bg-emerald-500/15 backdrop-blur-xs border-4 border-dashed border-emerald-500 rounded-xl flex flex-col items-center justify-center p-6 text-center animate-pulse pointer-events-none">
          <UploadCloud className="w-16 h-16 text-emerald-600 dark:text-emerald-400 mb-2" />
          <h3 className="font-extrabold text-base text-emerald-800 dark:text-emerald-200">
            ¡Suelta tus archivos de Audio o Video aquí!
          </h3>
          <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
            Se importarán y añadirán inmediatamente a la playlist actual.
          </p>
        </div>
      )}
      {/* Header controls bar */}
      <div
        className="h-11 px-4 border-b flex items-center justify-between shrink-0"
        style={{
          backgroundColor: 'var(--panel-bg)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="opacity-70">Colección de Pistas</span>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 opacity-80">
            {songs.length} pistas
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Add audio/video files directly button */}
          <label
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border transition-all hover:opacity-90 active:scale-95 cursor-pointer shadow-2xs"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--bg-color)',
              color: accentColor,
            }}
            title="Añadir canciones o videos locales (.mp3, .wav, .mp4, etc.)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Añadir Archivo/Video</span>
            <input
              type="file"
              multiple
              accept="audio/*,video/*,.mp3,.wav,.flac,.ogg,.m4a,.aac,.mp4,.webm,.mkv,.mov,.avi"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0 && onAddFiles) {
                  onAddFiles(Array.from(e.target.files));
                }
              }}
              className="hidden"
            />
          </label>

          {/* View mode toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all hover:opacity-90 active:scale-95 cursor-pointer"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--bg-color)',
            }}
            title="Alternar entre lista detallada y cuadrícula"
          >
            {viewMode === 'list' ? (
              <>
                <List className="w-3.5 h-3.5" style={{ color: accentColor }} />
                <span>Vista: Lista</span>
              </>
            ) : (
              <>
                <Grid className="w-3.5 h-3.5" style={{ color: accentColor }} />
                <span>Vista: Cuadrícula</span>
              </>
            )}
          </button>

          {/* Category mode toggle */}
          <button
            onClick={() =>
              setCategoryMode(categoryMode === 'simple' ? 'categorized' : 'simple')
            }
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all hover:opacity-90 active:scale-95 cursor-pointer"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--bg-color)',
            }}
            title="Alternar entre lista secuencial y agrupada por tags"
          >
            <Layers className="w-3.5 h-3.5 opacity-70" />
            <span>
              {categoryMode === 'simple' ? 'Modo: Simple' : 'Modo: Categorizado'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Track View Area */}
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {songs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-60">
            <Music2 className="w-12 h-12 mb-3 stroke-[1.5]" />
            <p className="font-semibold text-sm">Esta playlist no contiene pistas</p>
            <p className="text-xs mt-1">
              Añade canciones desde el Explorador o pega un enlace de audio/video.
            </p>
          </div>
        ) : viewMode === 'list' ? (
          // TABLE LIST VIEW
          <div className="w-full">
            {/* Table Header */}
            <div
              className="grid grid-cols-12 gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wider border-b opacity-60"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-4">Título</div>
              <div className="col-span-3">Artista</div>
              <div className="col-span-2">Álbum</div>
              <div className="col-span-1">Tag</div>
              <div className="col-span-1 text-right">Duración</div>
            </div>

            {/* List Rows */}
            {categoryMode === 'categorized' ? (
              Object.entries(groupedSongs).map(([groupName, groupItems]) => {
                const groupColor = groupItems[0]?.tag?.color || '#94a3b8';
                return (
                  <div key={groupName} className="mb-4">
                    <div
                      className="px-3 py-1.5 rounded-md my-1 font-bold text-xs flex items-center gap-2"
                      style={{
                        backgroundColor: `${groupColor}25`,
                        color: groupColor,
                        borderLeft: `3px solid ${groupColor}`,
                      }}
                    >
                      <TagIcon className="w-3 h-3" />
                      <span>
                        {groupName} ({groupItems.length})
                      </span>
                    </div>

                    {groupItems.map((song, idx) =>
                      renderListRow(song, idx + 1, false)
                    )}
                  </div>
                );
              })
            ) : (
              songs.map((song, idx) => renderListRow(song, idx + 1, true, idx))
            )}
          </div>
        ) : (
          // GRID VIEW
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-1">
            {songs.map((song, idx) => {
              const isSelected = selectedSongIds.includes(song.id);
              const isThisPlaying = currentSong?.id === song.id && isPlaying;
              const tagColor = song.tag?.color || '#94a3b8';

              return (
                <div
                  key={song.id}
                  onClick={(e) => handleSelectSong(song.id, e)}
                  onDoubleClick={() => onPlaySong(song)}
                  onContextMenu={(e) => handleContextMenu(e, song)}
                  className="group relative flex flex-col p-3 rounded-xl border transition-all cursor-pointer select-none"
                  style={{
                    backgroundColor: isSelected ? 'var(--panel-bg)' : 'var(--panel-bg)',
                    borderColor: isSelected ? accentColor : 'var(--border-color)',
                    boxShadow: isSelected ? `0 0 0 1px ${accentColor}` : undefined,
                  }}
                >
                  {/* Card Art block */}
                  <div
                    className="w-full aspect-square rounded-lg flex items-center justify-center relative overflow-hidden mb-2.5 transition-transform group-hover:scale-102"
                    style={{ backgroundColor: `${tagColor}22` }}
                  >
                    <Music2 className="w-10 h-10" style={{ color: tagColor }} />

                    {isThisPlaying && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Volume2 className="w-8 h-8 text-white animate-pulse" />
                      </div>
                    )}

                    <div
                      className="absolute bottom-1.5 right-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-white font-medium"
                    >
                      {formatDuration(song.duration)}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="font-bold text-xs truncate" title={song.title}>
                      #{idx + 1} {song.title}
                    </p>
                    <p className="text-[11px] opacity-60 truncate mt-0.5">{song.artist || 'Artista Desconocido'}</p>
                  </div>

                  {song.tag && (
                    <span
                      className="mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block truncate w-fit"
                      style={{
                        backgroundColor: `${song.tag.color}25`,
                        color: song.tag.color,
                      }}
                    >
                      {song.tag.name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer info label */}
      <div
        className="h-8 px-4 border-t flex items-center justify-between text-xs opacity-75 select-none shrink-0"
        style={{
          backgroundColor: 'var(--panel-bg)',
          borderColor: 'var(--border-color)',
        }}
      >
        <span className="font-semibold">{songs.length} pistas en total</span>
        <span className="font-mono text-[11px]">Duración total: {formatDuration(totalMs)}</span>
      </div>

      {/* Custom Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 w-52 rounded-xl shadow-xl border p-1 text-xs select-none"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 220),
            top: Math.min(contextMenu.y, window.innerHeight - 300),
            backgroundColor: 'var(--panel-bg)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-color)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onPlaySong(contextMenu.song);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-left font-medium"
          >
            <Play className="w-3.5 h-3.5" style={{ color: accentColor }} />
            <span>Reproducir</span>
          </button>

          <button
            onClick={() => {
              onEditMetadata(contextMenu.song);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-left font-medium"
          >
            <FileEdit className="w-3.5 h-3.5 opacity-70" />
            <span>Editar Metadatos</span>
          </button>

          <div className="h-px my-1 bg-black/10 dark:bg-white/10" />

          {/* Submenu for Tags */}
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase opacity-50">
            Categorías / Tags
          </div>

          <button
            onClick={() => {
              onAssignTag(contextMenu.song);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-left font-medium"
          >
            <TagIcon className="w-3.5 h-3.5" style={{ color: accentColor }} />
            <span>Crear Nueva Tag...</span>
          </button>

          {allAvailableTags.map((tag) => (
            <button
              key={tag.name}
              onClick={() => {
                onSetExistingTag(contextMenu.song.id, tag);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-left font-medium"
            >
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              <span className="truncate">{tag.name}</span>
            </button>
          ))}

          {contextMenu.song.tag && (
            <button
              onClick={() => {
                onSetExistingTag(contextMenu.song.id, null);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-left font-medium opacity-80"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Quitar Tag</span>
            </button>
          )}

          {categoryMode === 'simple' && (
            <>
              <div className="h-px my-1 bg-black/10 dark:bg-white/10" />
              <button
                onClick={() => {
                  moveSelectedSongs(-1);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-left font-medium"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Subir (Ctrl+↑)</span>
              </button>
              <button
                onClick={() => {
                  moveSelectedSongs(1);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-left font-medium"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Bajar (Ctrl+↓)</span>
              </button>
            </>
          )}

          <div className="h-px my-1 bg-black/10 dark:bg-white/10" />

          <button
            onClick={() => {
              onRemoveSongs(selectedSongIds);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-red-500 text-left font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Quitar ({selectedSongIds.length})</span>
          </button>
        </div>
      )}
    </section>
  );

  function renderListRow(
    song: Song,
    displayNum: number,
    canDrag: boolean,
    itemIdx = 0
  ) {
    const isSelected = selectedSongIds.includes(song.id);
    const isThisPlaying = currentSong?.id === song.id && isPlaying;
    const tag = song.tag;

    return (
      <div
        key={song.id}
        draggable={canDrag}
        onDragStart={() => canDrag && handleDragStart(itemIdx)}
        onDragOver={(e) => canDrag && handleDragOver(e, itemIdx)}
        onDrop={() => canDrag && handleDrop(itemIdx)}
        onClick={(e) => handleSelectSong(song.id, e)}
        onDoubleClick={() => onPlaySong(song)}
        onContextMenu={(e) => handleContextMenu(e, song)}
        className="grid grid-cols-12 gap-2 px-3 py-2 rounded-lg text-xs items-center transition-all cursor-pointer select-none my-0.5 border"
        style={{
          backgroundColor: isSelected
            ? 'var(--panel-bg)'
            : tag?.color
            ? `${tag.color}15`
            : 'transparent',
          borderColor: isSelected
            ? accentColor
            : 'transparent',
          borderLeft: isSelected ? `3px solid ${accentColor}` : undefined,
        }}
      >
        {/* Track # & Playing icon */}
        <div className="col-span-1 text-center font-mono opacity-60 flex items-center justify-center">
          {isThisPlaying ? (
            <Volume2 className="w-3.5 h-3.5 animate-pulse" style={{ color: accentColor }} />
          ) : (
            displayNum
          )}
        </div>

        {/* Title */}
        <div className="col-span-4 font-semibold truncate flex items-center gap-1.5">
          <span className="truncate">{song.title}</span>
        </div>

        {/* Artist */}
        <div className="col-span-3 opacity-80 truncate">
          {song.artist || 'Desconocido'}
        </div>

        {/* Album */}
        <div className="col-span-2 opacity-60 truncate">
          {song.album || '—'}
        </div>

        {/* Tag badge */}
        <div className="col-span-1 truncate">
          {tag ? (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block truncate max-w-full"
              style={{
                backgroundColor: `${tag.color}30`,
                color: tag.color,
              }}
            >
              {tag.name}
            </span>
          ) : (
            <span className="opacity-30">—</span>
          )}
        </div>

        {/* Duration */}
        <div className="col-span-1 text-right font-mono opacity-60">
          {formatDuration(song.duration)}
        </div>
      </div>
    );
  }
};
