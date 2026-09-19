import React, { useState } from 'react';
import { FileEdit, X, Check } from 'lucide-react';
import { Song } from '../types';

interface MetadataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song | null;
  onSave: (updatedSong: Song) => void;
  accentColor: string;
}

export const MetadataDialog: React.FC<MetadataDialogProps> = ({
  isOpen,
  onClose,
  song,
  onSave,
  accentColor,
}) => {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [track, setTrack] = useState('');

  React.useEffect(() => {
    if (song) {
      setTitle(song.title || '');
      setArtist(song.artist || '');
      setAlbum(song.album || '');
      setTrack(song.track || '');
    }
  }, [song]);

  if (!isOpen || !song) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...song,
      title: title.trim() || song.title,
      artist: artist.trim(),
      album: album.trim(),
      track: track.trim(),
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
            <FileEdit className="w-4 h-4" style={{ color: accentColor }} />
            <span>Music2000 — Editar Metadatos</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4 opacity-70" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-[11px] font-bold uppercase opacity-60 mb-1">
              Título de la Pista
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border font-semibold outline-none"
              style={{
                backgroundColor: 'var(--bg-color)',
                borderColor: 'var(--border-color)',
              }}
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase opacity-60 mb-1">
              Artista / Banda
            </label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border font-semibold outline-none"
              style={{
                backgroundColor: 'var(--bg-color)',
                borderColor: 'var(--border-color)',
              }}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase opacity-60 mb-1">
              Álbum
            </label>
            <input
              type="text"
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border font-semibold outline-none"
              style={{
                backgroundColor: 'var(--bg-color)',
                borderColor: 'var(--border-color)',
              }}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase opacity-60 mb-1">
              Número de Pista (#)
            </label>
            <input
              type="text"
              value={track}
              onChange={(e) => setTrack(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border font-mono outline-none"
              style={{
                backgroundColor: 'var(--bg-color)',
                borderColor: 'var(--border-color)',
              }}
            />
          </div>

          <div className="pt-1 opacity-60">
            <span className="font-semibold block mb-0.5">Ruta de origen:</span>
            <p className="font-mono text-[10px] break-all truncate">{song.path || song.url}</p>
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
              <span>Guardar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
