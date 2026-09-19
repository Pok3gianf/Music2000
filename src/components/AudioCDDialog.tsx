import React, { useState } from 'react';
import { Disc, X, Play, Plus, Upload, Folder, CheckCircle, Radio, Sparkles } from 'lucide-react';
import { Song } from '../types';

interface AudioCDDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCDTracks: (tracks: Song[], albumTitle: string) => void;
  accentColor: string;
}

export const AudioCDDialog: React.FC<AudioCDDialogProps> = ({
  isOpen,
  onClose,
  onImportCDTracks,
  accentColor,
}) => {
  const [cdDrive, setCdDrive] = useState('D:\\ (Unidad Óptica CD-ROM)');
  const [albumTitle, setAlbumTitle] = useState('Mi Disco Compacto');
  const [artistName, setArtistName] = useState('Artista de CD');
  const [selectedTracks, setSelectedTracks] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8]);
  const [isReadingCD, setIsReadingCD] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Virtual CD track list
  const cdTrackList = [
    { trackNum: 1, title: 'Pista de Audio 01', duration: 215000, size: '36.2 MB', format: 'PCM Audio / WAV' },
    { trackNum: 2, title: 'Pista de Audio 02', duration: 198000, size: '33.4 MB', format: 'PCM Audio / WAV' },
    { trackNum: 3, title: 'Pista de Audio 03', duration: 245000, size: '41.1 MB', format: 'PCM Audio / WAV' },
    { trackNum: 4, title: 'Pista de Audio 04', duration: 180000, size: '30.3 MB', format: 'PCM Audio / WAV' },
    { trackNum: 5, title: 'Pista de Audio 05', duration: 260000, size: '43.8 MB', format: 'PCM Audio / WAV' },
    { trackNum: 6, title: 'Pista de Audio 06', duration: 210000, size: '35.4 MB', format: 'PCM Audio / WAV' },
    { trackNum: 7, title: 'Pista de Audio 07', duration: 195000, size: '32.8 MB', format: 'PCM Audio / WAV' },
    { trackNum: 8, title: 'Pista de Audio 08', duration: 310000, size: '52.1 MB', format: 'PCM Audio / WAV' },
  ];

  if (!isOpen) return null;

  const toggleSelectTrack = (num: number) => {
    setSelectedTracks((prev) =>
      prev.includes(num) ? prev.filter((t) => t !== num) : [...prev, num]
    );
  };

  const handleSelectAll = () => {
    if (selectedTracks.length === cdTrackList.length) {
      setSelectedTracks([]);
    } else {
      setSelectedTracks(cdTrackList.map((t) => t.trackNum));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newSongs: Song[] = Array.from(files).map((file, idx) => {
      const blobUrl = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mkv|mov|avi)$/i.test(file.name);
      return {
        id: `cd-track-${Date.now()}-${idx}`,
        path: file.name,
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: artistName || 'Disco de Audio',
        album: albumTitle || 'CD Extraído',
        track: (idx + 1).toString(),
        duration: 180000,
        source: 'local',
        audioBlobUrl: blobUrl,
        is_video: isVideo,
        tag: { name: 'Audio CD', color: '#0284c7' },
      };
    });

    onImportCDTracks(newSongs, albumTitle);
    onClose();
  };

  const handleRipAndImport = () => {
    setIsReadingCD(true);
    setTimeout(() => {
      const tracksToImport: Song[] = cdTrackList
        .filter((t) => selectedTracks.includes(t.trackNum))
        .map((t) => ({
          id: `cd-${Date.now()}-${t.trackNum}`,
          path: `${cdDrive}\\Track0${t.trackNum}.cda`,
          title: t.title,
          artist: artistName,
          album: albumTitle,
          track: t.trackNum.toString(),
          duration: t.duration,
          source: 'local',
          tag: { name: 'Audio CD', color: '#10b981' },
        }));

      setIsReadingCD(false);
      setIsDone(true);
      onImportCDTracks(tracksToImport, albumTitle);
      setTimeout(() => {
        onClose();
      }, 600);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 select-none">
      <div
        className="w-full max-w-xl rounded-2xl shadow-2xl border flex flex-col max-h-[85vh] overflow-hidden"
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
            <Disc className="w-5 h-5 text-sky-500 animate-spin-slow" />
            <span>Importar Disco de Audio (CD / DVD / Rips)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5 opacity-70" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs custom-scrollbar">
          {/* Drive & Album details */}
          <div
            className="p-4 rounded-xl border space-y-3"
            style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold opacity-60 mb-1">
                  Unidad Óptica / Lector
                </label>
                <select
                  value={cdDrive}
                  onChange={(e) => setCdDrive(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border font-semibold outline-none"
                  style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}
                >
                  <option value="D:\ (Unidad Óptica CD-ROM)">D:\ (Unidad CD-ROM)</option>
                  <option value="E:\ (Lector DVD/BluRay)">E:\ (Lector DVD/BluRay)</option>
                  <option value="F:\ (Unidad Virtual ISO)">F:\ (Unidad Virtual ISO)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold opacity-60 mb-1">
                  Título del Álbum
                </label>
                <input
                  type="text"
                  value={albumTitle}
                  onChange={(e) => setAlbumTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border font-semibold outline-none"
                  style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold opacity-60 mb-1">
                  Artista
                </label>
                <input
                  type="text"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border font-semibold outline-none"
                  style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}
                />
              </div>
            </div>
          </div>

          {/* Local files from CD folder */}
          <div
            className="p-3.5 rounded-xl border border-dashed flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-color)' }}
          >
            <div className="space-y-0.5">
              <div className="font-bold text-xs flex items-center justify-center sm:justify-start gap-1.5">
                <Folder className="w-4 h-4 text-amber-500" />
                <span>¿Tienes archivos ripeados de un CD en tu disco duro?</span>
              </div>
              <p className="text-[11px] opacity-70">
                Selecciona pistas .cda, .wav, .mp3 o .flac directamente de tu carpeta de CD
              </p>
            </div>
            <label
              className="px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer border hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <Upload className="w-3.5 h-3.5 inline mr-1" />
              Explorar Carpeta CD
              <input
                type="file"
                multiple
                accept="audio/*,.cda,.wav,.mp3,.flac"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Track selection table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-[10px] opacity-70">
                Pistas Detectadas en el Disco ({selectedTracks.length}/{cdTrackList.length} seleccionadas)
              </span>
              <button
                onClick={handleSelectAll}
                className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                {selectedTracks.length === cdTrackList.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
              </button>
            </div>

            <div
              className="border rounded-xl divide-y max-h-56 overflow-y-auto custom-scrollbar"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-color)' }}
            >
              {cdTrackList.map((tr) => {
                const isChecked = selectedTracks.includes(tr.trackNum);
                return (
                  <div
                    key={tr.trackNum}
                    onClick={() => toggleSelectTrack(tr.trackNum)}
                    className="p-2.5 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded accent-emerald-500 cursor-pointer"
                      />
                      <span className="font-mono text-[11px] opacity-60 w-6">0{tr.trackNum}</span>
                      <span className="font-semibold text-xs">{tr.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] opacity-70 font-mono">
                      <span>{tr.format}</span>
                      <span>{tr.size}</span>
                      <span className="font-bold">
                        {Math.floor(tr.duration / 60000)}:{((tr.duration % 60000) / 1000).toFixed(0).padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
            {selectedTracks.length} pistas seleccionadas para extraer
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              style={{ borderColor: 'var(--border-color)' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleRipAndImport}
              disabled={isReadingCD || selectedTracks.length === 0}
              className="px-4 py-1.5 rounded-xl text-xs font-extrabold text-white flex items-center gap-1.5 shadow-xs hover:opacity-95 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              {isReadingCD ? (
                <>
                  <Disc className="w-4 h-4 animate-spin text-white" />
                  <span>Leyendo Pistas del CD...</span>
                </>
              ) : isDone ? (
                <>
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span>¡Importado con éxito!</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-white" />
                  <span>Extraer y Añadir a Biblioteca</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
