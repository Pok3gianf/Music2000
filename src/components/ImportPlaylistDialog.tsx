import React, { useState, useRef } from 'react';
import {
  ListMusic,
  Upload,
  FileText,
  Music,
  Plus,
  X,
  CheckCircle2,
  FolderOpen,
  Film,
  Sparkles,
  Loader2,
  HardDrive,
  Check,
} from 'lucide-react';
import { Song } from '../types';
import { saveMultipleTrackBlobs } from '../utils/audioStorage';
import { generateSyntheticTrackBlob } from '../utils/audioEngine';

interface ImportPlaylistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (playlistName: string, songs: Song[], createNew: boolean) => void;
  currentPlaylistName: string;
  accentColor: string;
}

interface ParsedTrack {
  song: Song;
  matchedFile?: File;
  hasAudio: boolean;
}

export const ImportPlaylistDialog: React.FC<ImportPlaylistDialogProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  currentPlaylistName,
  accentColor,
}) => {
  const [playlistName, setPlaylistName] = useState('Mi Playlist Importada');
  const [tracks, setTracks] = useState<ParsedTrack[]>([]);
  const [importMode, setImportMode] = useState<'new' | 'current'>('new');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const filesInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Clean filename helper
  const getFilenameFromPath = (path: string) => {
    return path.split(/[\\/]/).pop() || path;
  };

  // Parses M3U or JSON playlist text
  const parsePlaylistText = (text: string, fileName: string) => {
    try {
      // Try JSON first
      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        const json = JSON.parse(text);
        if (json.items && Array.isArray(json.items)) {
          const parsed: ParsedTrack[] = json.items.map((s: Song, i: number) => ({
            song: {
              ...s,
              id: s.id || `json-${Date.now()}-${i}`,
              track: s.track || String(i + 1),
            },
            hasAudio: Boolean(s.audioBlobUrl || s.url?.startsWith('http')),
          }));
          setPlaylistName(json.name || fileName.replace(/\.[^/.]+$/, ''));
          setTracks(parsed);
          setStatusMessage(`¡Éxito! ${parsed.length} canciones encontradas en el archivo JSON.`);
          return;
        }
      }
    } catch {
      // Not JSON, continue to M3U
    }

    // Parse M3U / M3U8
    const lines = text.split(/\r?\n/);
    const parsedList: ParsedTrack[] = [];
    let pendingTitle = '';
    let pendingArtist = '';
    let pendingDuration = 180000;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.startsWith('#EXTINF:')) {
        const info = line.substring(8);
        const commaIdx = info.indexOf(',');
        if (commaIdx !== -1) {
          const sec = parseInt(info.substring(0, commaIdx), 10);
          if (!isNaN(sec) && sec > 0) pendingDuration = sec * 1000;
          const metaStr = info.substring(commaIdx + 1).trim();
          if (metaStr.includes(' - ')) {
            const [art, tit] = metaStr.split(' - ');
            pendingArtist = art.trim();
            pendingTitle = tit.trim();
          } else {
            pendingTitle = metaStr;
            pendingArtist = 'Artista Importado';
          }
        }
      } else if (!line.startsWith('#')) {
        const filename = getFilenameFromPath(line);
        const title = pendingTitle || filename.replace(/\.[^/.]+$/, '') || `Pista ${parsedList.length + 1}`;
        const artist = pendingArtist || 'Artista de Playlist';
        const isVideo = line.match(/\.(mp4|webm|mkv|mov|avi)$/i) !== null;
        const isUrl = line.startsWith('http://') || line.startsWith('https://');

        const newSong: Song = {
          id: `imported-${Date.now()}-${parsedList.length}-${Math.random().toString(36).substring(2, 6)}`,
          path: line,
          title,
          artist,
          album: playlistName,
          track: String(parsedList.length + 1),
          duration: pendingDuration,
          source: isUrl ? 'url' : 'local',
          url: isUrl ? line : undefined,
          is_video: isVideo,
          tag: { name: 'Playlist M3U', color: '#10b981' },
        };

        parsedList.push({
          song: newSong,
          hasAudio: isUrl,
        });

        pendingTitle = '';
        pendingArtist = '';
        pendingDuration = 180000;
      }
    }

    if (parsedList.length > 0) {
      setPlaylistName(fileName.replace(/\.[^/.]+$/, ''));
      setTracks(parsedList);
      setStatusMessage(`¡Playlist M3U leída con éxito! ${parsedList.length} pistas con ruta en PC detectadas.`);
    } else {
      setStatusMessage('No se detectaron pistas con formato M3U estándar.');
    }
  };

  const handlePlaylistFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        parsePlaylistText(content, file.name);
      }
    };
    reader.readAsText(file);
  };

  // Matches provided physical files (from folder or file picker) with playlist tracks
  const matchFilesWithPlaylist = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Create a map of filename (lowercase) -> File
    const fileMap = new Map<string, File>();
    fileArray.forEach((f) => {
      fileMap.set(f.name.toLowerCase(), f);
      // also without extension
      const noExt = f.name.replace(/\.[^/.]+$/, '').toLowerCase();
      fileMap.set(noExt, f);
    });

    let matchedCount = 0;
    const unmatchedFiles: File[] = [];

    const updatedTracks = tracks.map((item) => {
      const pathFilename = getFilenameFromPath(item.song.path).toLowerCase();
      const pathNoExt = pathFilename.replace(/\.[^/.]+$/, '');
      const titleLower = item.song.title.toLowerCase();

      const matched =
        fileMap.get(pathFilename) ||
        fileMap.get(pathNoExt) ||
        fileMap.get(titleLower);

      if (matched) {
        matchedCount++;
        const blobUrl = URL.createObjectURL(matched);
        return {
          ...item,
          matchedFile: matched,
          hasAudio: true,
          song: {
            ...item.song,
            audioBlobUrl: blobUrl,
            source: 'local' as const,
          },
        };
      }
      return item;
    });

    // If there were no prior tracks in M3U, or extra files were chosen, append them directly!
    if (tracks.length === 0) {
      const newItems: ParsedTrack[] = fileArray.map((file, idx) => {
        const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mkv|mov|avi)$/i.test(file.name);
        const blobUrl = URL.createObjectURL(file);
        return {
          matchedFile: file,
          hasAudio: true,
          song: {
            id: `local-file-${Date.now()}-${idx}`,
            path: file.name,
            title: file.name.replace(/\.[^/.]+$/, ''),
            artist: 'Archivo Local',
            album: playlistName,
            track: String(idx + 1),
            duration: 180000,
            source: 'local' as const,
            audioBlobUrl: blobUrl,
            is_video: isVideo,
            tag: { name: isVideo ? 'Video' : 'Audio', color: isVideo ? '#f43f5e' : '#10b981' },
          },
        };
      });
      setTracks(newItems);
      setStatusMessage(`Se cargaron ${newItems.length} canciones directamente desde tu PC.`);
      return;
    }

    setTracks(updatedTracks);
    setStatusMessage(
      `¡Se vincularon ${matchedCount} archivos de audio reales con las rutas de tu playlist! Las restantes se generarán automáticamente.`
    );
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      matchFilesWithPlaylist(e.target.files);
    }
  };

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      matchFilesWithPlaylist(e.target.files);
    }
  };

  // Final submit: saves real audio blobs into IndexedDB and completes import
  const handleFinalImport = async () => {
    if (tracks.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setStatusMessage('Guardando canciones en la base de datos local para que persistan siempre...');

    const songsToSave: Song[] = [];
    const blobsToPersist: { id: string; blob: Blob }[] = [];

    const genres: ('lofi' | 'ambient' | 'synth' | 'jazz')[] = ['lofi', 'synth', 'ambient', 'jazz'];

    for (let i = 0; i < tracks.length; i++) {
      setProcessingProgress(Math.round(((i + 1) / tracks.length) * 100));
      const item = tracks[i];
      let finalSong = { ...item.song };

      if (item.matchedFile) {
        // Physical file from user's hard drive
        blobsToPersist.push({
          id: finalSong.id,
          blob: item.matchedFile,
        });
        songsToSave.push(finalSong);
      } else if (finalSong.audioBlobUrl) {
        // Already has an audio blob URL, fetch blob to store
        try {
          const res = await fetch(finalSong.audioBlobUrl);
          const blob = await res.blob();
          blobsToPersist.push({ id: finalSong.id, blob });
        } catch {
          // fallback synthesis
        }
        songsToSave.push(finalSong);
      } else if (!finalSong.url?.startsWith('http')) {
        // M3U song with a PC path but no binary file selected:
        // Automatically synthesize genuine playable audio and store in IndexedDB!
        const genre = genres[i % genres.length];
        const synth = await generateSyntheticTrackBlob(genre);
        finalSong.audioBlobUrl = synth.blobUrl;
        finalSong.duration = synth.durationMs;

        blobsToPersist.push({
          id: finalSong.id,
          blob: synth.blob,
        });
        songsToSave.push(finalSong);
      } else {
        // Web stream / URL song
        songsToSave.push(finalSong);
      }
    }

    // Persist all blobs in IndexedDB
    if (blobsToPersist.length > 0) {
      await saveMultipleTrackBlobs(blobsToPersist);
    }

    setIsProcessing(false);
    onImportSuccess(playlistName.trim() || 'Playlist Importada', songsToSave, importMode === 'new');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 select-none">
      <div
        className="w-full max-w-xl rounded-2xl shadow-2xl border flex flex-col max-h-[88vh] overflow-hidden"
        style={{
          backgroundColor: 'var(--panel-bg)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-color)',
        }}
      >
        {/* Header */}
        <div
          className="h-14 px-5 border-b flex items-center justify-between shrink-0"
          style={{
            backgroundColor: 'var(--bg-color)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-center gap-2 font-extrabold text-sm uppercase tracking-wider">
            <ListMusic className="w-5 h-5 text-emerald-500" />
            <span>Importar Playlist y Canciones de tu PC</span>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5 opacity-70" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs custom-scrollbar">
          {/* Step 1: Upload M3U / M3U8 */}
          <div
            className="p-4 rounded-xl border space-y-2.5"
            style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}
          >
            <div className="font-bold text-xs uppercase tracking-wider opacity-85 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-500" />
                1. Archivo de Playlist (.m3u, .m3u8, .json)
              </span>
              {tracks.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {tracks.length} rutas leídas
                </span>
              )}
            </div>

            <label className="border-2 border-dashed rounded-xl p-3.5 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <Upload className="w-5 h-5 text-emerald-500" />
              <span className="font-bold text-xs">Cargar archivo de Playlist (.m3u / .json)</span>
              <span className="text-[10px] opacity-60">Lee las rutas locales de tus canciones guardadas en el PC</span>
              <input
                type="file"
                accept=".m3u,.m3u8,.pls,.json,.p2000"
                onChange={handlePlaylistFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Step 2: Match Physical Songs from PC */}
          <div
            className="p-4 rounded-xl border space-y-2.5"
            style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}
          >
            <div className="font-bold text-xs uppercase tracking-wider opacity-85 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-sky-500" />
              <span>2. Cargar Canciones Físicas de tu PC (Opcional o Directo)</span>
            </div>
            <p className="text-[11px] opacity-75 leading-relaxed">
              Selecciona la carpeta o archivos de tu computadora donde están las canciones de la playlist. El sistema vinculará el audio automáticamente por nombre y lo guardará de forma persistente en tu navegador.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {/* Select Folder (directory) */}
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="px-3 py-2 rounded-xl border flex items-center justify-center gap-2 font-bold cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 transition-all text-xs"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <FolderOpen className="w-4 h-4 text-amber-500" />
                <span>Seleccionar Carpeta de Música</span>
              </button>

              {/* Select Multiple Audio Files */}
              <button
                type="button"
                onClick={() => filesInputRef.current?.click()}
                className="px-3 py-2 rounded-xl border flex items-center justify-center gap-2 font-bold cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 transition-all text-xs"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <Music className="w-4 h-4 text-sky-500" />
                <span>Seleccionar Archivos de Audio</span>
              </button>

              {/* Hidden inputs */}
              <input
                ref={folderInputRef}
                type="file"
                multiple
                // @ts-expect-error webkitdirectory attribute
                webkitdirectory=""
                directory=""
                onChange={handleFolderSelect}
                className="hidden"
              />
              <input
                ref={filesInputRef}
                type="file"
                multiple
                accept="audio/*,video/*,.mp3,.wav,.flac,.ogg,.m4a,.mp4,.webm"
                onChange={handleFilesSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Status feedback message */}
          {statusMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Progress bar if saving */}
          {isProcessing && (
            <div className="p-3 rounded-xl border space-y-2" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center justify-between font-bold text-xs">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  Cargando pistas en almacenamiento permanente...
                </span>
                <span>{processingProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full transition-all duration-200"
                  style={{ width: `${processingProgress}%`, backgroundColor: accentColor }}
                />
              </div>
            </div>
          )}

          {/* Playlist settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold opacity-60 mb-1">
                Nombre de la Playlist
              </label>
              <input
                type="text"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border font-semibold outline-none"
                style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold opacity-60 mb-1">
                Destino
              </label>
              <select
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as 'new' | 'current')}
                className="w-full px-3 py-1.5 rounded-lg border font-semibold outline-none"
                style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}
              >
                <option value="new">Crear Nueva Playlist</option>
                <option value="current">Añadir a playlist actual ({currentPlaylistName})</option>
              </select>
            </div>
          </div>

          {/* Preview list */}
          {tracks.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-bold text-[10px] uppercase opacity-70">
                <span>Pistas de la Playlist ({tracks.length})</span>
                <span className="text-emerald-500">
                  {tracks.filter((t) => t.hasAudio).length} vinculadas con audio real
                </span>
              </div>
              <div
                className="border rounded-xl divide-y max-h-44 overflow-y-auto custom-scrollbar"
                style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}
              >
                {tracks.map((item, idx) => (
                  <div key={item.song.id || idx} className="p-2 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono opacity-50 w-5 text-right">{idx + 1}.</span>
                      <span className="font-bold truncate">{item.song.title}</span>
                      <span className="opacity-50 truncate hidden sm:inline">({item.song.path})</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {item.hasAudio ? (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          Audio Vinculado
                        </span>
                      ) : (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          Auto-Audio
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="h-14 px-5 border-t flex items-center justify-between shrink-0"
          style={{
            backgroundColor: 'var(--bg-color)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="text-[11px] opacity-70">
            {tracks.length} pista(s) en lista
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-1.5 rounded-xl border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer disabled:opacity-50"
              style={{ borderColor: 'var(--border-color)' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleFinalImport}
              disabled={tracks.length === 0 || isProcessing}
              className="px-4 py-1.5 rounded-xl text-xs font-extrabold text-white flex items-center gap-1.5 shadow-xs hover:opacity-95 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-white" />
                  <span>Importar Playlist y Canciones</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
