import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Gauge,
  Link2,
  Video,
  Volume2,
  Activity,
  BarChart3,
  Plus,
  Maximize2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Song, AudioAnalysisMeta } from '../types';
import { audioEngine } from '../utils/audioEngine';
import { MemphisMusicCharacter } from './MemphisIllustrations';

interface MediaAndAnalysisPanelProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (ms: number) => void;
  currentTimeMs: number;
  durationMs: number;
  speed: number;
  onCycleSpeed: () => void;
  onAddUrl: (url: string) => void;
  accentColor: string;
  isLiteMode?: boolean;
}

function formatTime(ms: number): string {
  if (!ms || ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function extractYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

export function extractSpotifyId(url?: string | null): { type: 'track' | 'album' | 'playlist'; id: string } | null {
  if (!url) return null;
  const match = url.match(/spotify(?:\.com)?\/(track|album|playlist|intl-[a-z]{2}\/track)\/([a-zA-Z0-9]+)/);
  if (match) {
    const rawType = match[1].includes('track') ? 'track' : (match[1] as 'album' | 'playlist');
    return { type: rawType, id: match[2] };
  }
  if (url.startsWith('spotify:track:')) {
    return { type: 'track', id: url.split(':')[2] };
  }
  return null;
}

export const MediaAndAnalysisPanel: React.FC<MediaAndAnalysisPanelProps> = ({
  currentSong,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrevious,
  onSeek,
  currentTimeMs,
  durationMs,
  speed,
  onCycleSpeed,
  onAddUrl,
  accentColor,
  isLiteMode = false,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isFullscreenStage, setIsFullscreenStage] = useState(false);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);

  const spectrumCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [analysisMeta, setAnalysisMeta] = useState<AudioAnalysisMeta>({
    duration: 0,
    sample_rate: 44100,
    bitrate: 320,
    codec: 'AAC / PCM',
    channels: 2,
    peak: '-12.0 dB',
    lufs: '-14.5 LUFS',
    bpm: '124 BPM',
  });

  // Canvas visualizer animation loop (Disabled in Lite Mode to guarantee 0% CPU overhead)
  useEffect(() => {
    if (isLiteMode) return;

    let animId: number;
    const freqData = new Uint8Array(32);
    const timeData = new Uint8Array(64);

    const render = () => {
      // 1. Spectrum visualizer
      const sCanvas = spectrumCanvasRef.current;
      if (sCanvas) {
        const sCtx = sCanvas.getContext('2d');
        if (sCtx) {
          const w = sCanvas.width;
          const h = sCanvas.height;
          sCtx.clearRect(0, 0, w, h);

          if (isPlaying) {
            audioEngine.getFrequencyData(freqData);
          } else {
            for (let i = 0; i < freqData.length; i++) {
              freqData[i] = Math.max(8, freqData[i] * 0.9);
            }
          }

          const numBars = 32;
          const gap = 2;
          const barWidth = Math.max(2, (w - (numBars + 1) * gap) / numBars);

          for (let i = 0; i < numBars; i++) {
            const val = isPlaying ? freqData[i] / 255 : 0.08;
            const barHeight = Math.max(3, val * (h - 6));
            const x = gap + i * (barWidth + gap);
            const y = h - barHeight - 2;

            const grad = sCtx.createLinearGradient(x, y, x, h);
            grad.addColorStop(0, accentColor);
            grad.addColorStop(1, '#a855f7');

            sCtx.fillStyle = grad;
            sCtx.beginPath();
            sCtx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
            sCtx.fill();
          }
        }
      }

      // 2. Waveform oscilloscope
      const wCanvas = waveformCanvasRef.current;
      if (wCanvas) {
        const wCtx = wCanvas.getContext('2d');
        if (wCtx) {
          const w = wCanvas.width;
          const h = wCanvas.height;
          wCtx.clearRect(0, 0, w, h);

          wCtx.lineWidth = 2;
          wCtx.strokeStyle = accentColor;
          wCtx.beginPath();

          if (isPlaying) {
            audioEngine.getTimeDomainData(timeData);
            const sliceWidth = w / timeData.length;
            let x = 0;

            for (let i = 0; i < timeData.length; i++) {
              const v = timeData[i] / 128.0;
              const y = (v * h) / 2;

              if (i === 0) {
                wCtx.moveTo(x, y);
              } else {
                wCtx.lineTo(x, y);
              }
              x += sliceWidth;
            }
          } else {
            wCtx.moveTo(0, h / 2);
            wCtx.lineTo(w, h / 2);
          }
          wCtx.stroke();
        }
      }

      // Update analysis metrics
      const metrics = audioEngine.getAnalysisMetrics(isPlaying, durationMs);
      setAnalysisMeta(metrics);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, accentColor, durationMs, isLiteMode]);

  const handleAddUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    onAddUrl(urlInput.trim());
    setUrlInput('');
  };

  const handleToggleFullscreen = () => {
    if (!stageContainerRef.current) return;
    if (!document.fullscreenElement) {
      stageContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreenStage(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreenStage(false);
    }
  };

  const ytId = extractYouTubeId(currentSong?.url);
  const spotifyData = extractSpotifyId(currentSong?.url);
  const isVideoFile =
    currentSong?.is_video ||
    (currentSong?.path && /\.(mp4|webm|mkv|mov|avi)$/i.test(currentSong.path)) ||
    (currentSong?.url && /\.(mp4|webm|mkv|mov|avi)$/i.test(currentSong.url));

  const mediaSource = currentSong?.audioBlobUrl || currentSong?.url;

  return (
    <div
      className="w-full lg:w-80 shrink-0 flex flex-col p-3 overflow-y-auto custom-scrollbar select-none transition-colors duration-200"
      style={{
        backgroundColor: 'var(--panel-bg)',
        color: 'var(--text-color)',
      }}
    >
      {/* Visual media / Album stage */}
      <div
        ref={stageContainerRef}
        className="w-full aspect-video rounded-xl border flex flex-col items-center justify-center relative overflow-hidden mb-3 shadow-2xs group"
        style={{
          backgroundColor: 'var(--video-bg)',
          borderColor: 'var(--border-color)',
        }}
      >
        {/* Fullscreen button */}
        <button
          onClick={handleToggleFullscreen}
          className="absolute top-2 right-2 z-20 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          title="Pantalla completa"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* 1. YouTube Player */}
        {ytId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=${isPlaying ? '1' : '0'}&rel=0&enablejsapi=1`}
            title={currentSong?.title || 'YouTube Player'}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : spotifyData ? (
          /* 2. Spotify Player Embed */
          <iframe
            src={`https://open.spotify.com/embed/${spotifyData.type}/${spotifyData.id}?utm_source=generator&theme=0`}
            title={currentSong?.title || 'Spotify Player'}
            className="w-full h-full border-0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        ) : isVideoFile && mediaSource ? (
          /* 3. Real HTML5 Local/Remote Video Player */
          <video
            key={currentSong?.id}
            src={mediaSource}
            className="w-full h-full object-contain bg-black"
            controls
            autoPlay={isPlaying}
            playsInline
          />
        ) : (
          /* 4. Corporate Memphis Dynamic Stage Character */
          <div className="flex flex-col items-center justify-center p-2 text-center">
            <MemphisMusicCharacter size={120} />
            <div className="mt-1 px-2">
              <p className="font-bold text-xs truncate max-w-[220px]">
                {currentSong ? currentSong.title : 'Music2000 Studio'}
              </p>
              <p className="text-[10px] opacity-60 truncate max-w-[200px]">
                {currentSong?.artist || 'Omega Labs Inc'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Visualizers or Lite Indicator */}
      {isLiteMode ? (
        <div
          className="rounded-xl border p-2.5 mb-3 flex items-center gap-2"
          style={{ backgroundColor: 'var(--eq-bg)', borderColor: 'var(--border-color)' }}
        >
          <Zap className="w-4 h-4 text-sky-500 shrink-0" />
          <div className="text-[11px] leading-tight">
            <span className="font-bold text-sky-600 dark:text-sky-400">Modo Ligero Activo</span>
            <p className="text-[10px] opacity-60">Visualizadores FFT pausados para ahorrar 100% de CPU.</p>
          </div>
        </div>
      ) : (
        /* Real-time Spectrum & Waveform Visualizers */
        <div
          className="rounded-xl border p-2.5 mb-3"
          style={{
            backgroundColor: 'var(--eq-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="flex items-center justify-between mb-1.5 px-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider opacity-70">
              <BarChart3 className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span>Espectro de Frecuencias</span>
            </div>
            <span className="text-[10px] font-mono opacity-50">32 Bandas</span>
          </div>

          {/* Spectrum Canvas */}
          <div className="h-14 w-full rounded-lg overflow-hidden bg-black/5 dark:bg-black/40 mb-2">
            <canvas
              ref={spectrumCanvasRef}
              width={280}
              height={56}
              className="w-full h-full block"
            />
          </div>

          {/* Waveform Canvas */}
          <div className="flex items-center justify-between mb-1 px-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider opacity-70">
              <Activity className="w-3.5 h-3.5" style={{ color: accentColor }} />
              <span>Osciloscopio / Onda</span>
            </div>
          </div>
          <div className="h-8 w-full rounded-lg overflow-hidden bg-black/5 dark:bg-black/40">
            <canvas
              ref={waveformCanvasRef}
              width={280}
              height={32}
              className="w-full h-full block"
            />
          </div>
        </div>
      )}

      {/* Audio Analysis Metadata Grid (Only in standard mode) */}
      {!isLiteMode && (
        <div
          className="rounded-xl border p-2.5 mb-3 text-[11px]"
          style={{
            backgroundColor: 'var(--eq-bg)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2 px-1">
            Análisis Técnico de Audio
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
            <div className="flex justify-between px-1">
              <span className="opacity-60">Duración:</span>
              <span className="font-mono font-semibold">{formatTime(durationMs)}</span>
            </div>
            <div className="flex justify-between px-1">
              <span className="opacity-60">Muestreo:</span>
              <span className="font-mono font-semibold">{analysisMeta.sample_rate} Hz</span>
            </div>
            <div className="flex justify-between px-1">
              <span className="opacity-60">Bitrate:</span>
              <span className="font-mono font-semibold">{analysisMeta.bitrate} kbps</span>
            </div>
            <div className="flex justify-between px-1">
              <span className="opacity-60">Códec:</span>
              <span className="font-mono font-semibold truncate max-w-[80px]">
                {analysisMeta.codec}
              </span>
            </div>
            <div className="flex justify-between px-1">
              <span className="opacity-60">Peak:</span>
              <span className="font-mono font-semibold" style={{ color: accentColor }}>
                {analysisMeta.peak}
              </span>
            </div>
            <div className="flex justify-between px-1">
              <span className="opacity-60">LUFS:</span>
              <span className="font-mono font-semibold">{analysisMeta.lufs}</span>
            </div>
          </div>
        </div>
      )}

      {/* Transport controls */}
      <div className="mb-3">
        {/* Scrubber slider */}
        <div className="flex items-center gap-2 mb-2 text-[11px] font-mono opacity-80">
          <span className="w-10 text-right">{formatTime(currentTimeMs)}</span>
          <input
            type="range"
            min={0}
            max={durationMs || 100}
            value={currentTimeMs}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="flex-1 accent-emerald-500 cursor-pointer h-1.5 rounded-lg"
          />
          <span className="w-10">{formatTime(durationMs)}</span>
        </div>

        {/* Buttons row */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onPrevious}
            className="w-10 h-10 rounded-xl border flex items-center justify-center transition-transform active:scale-90 hover:opacity-90 cursor-pointer"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--panel-bg)',
            }}
            title="Pista anterior / Rebobinar"
            aria-label="Pista anterior"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-transform active:scale-95 hover:opacity-95 cursor-pointer text-white"
            style={{ backgroundColor: accentColor }}
            title={isPlaying ? 'Pausar' : 'Reproducir'}
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            className="w-10 h-10 rounded-xl border flex items-center justify-center transition-transform active:scale-90 hover:opacity-90 cursor-pointer"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--panel-bg)',
            }}
            title="Siguiente pista"
            aria-label="Siguiente pista"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={onCycleSpeed}
            className="h-10 px-2.5 rounded-xl border flex items-center gap-1 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--panel-bg)',
            }}
            title="Cambiar velocidad de reproducción"
          >
            <Gauge className="w-3.5 h-3.5 opacity-60" />
            <span>x{speed}</span>
          </button>
        </div>
      </div>

      {/* URL Adder form (YouTube, Spotify, Web Streams) */}
      <form onSubmit={handleAddUrlSubmit} className="mt-auto pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold opacity-75">
          <Link2 className="w-3.5 h-3.5" style={{ color: accentColor }} />
          <span>Añadir Canción / Video desde URL</span>
        </div>
        <div className="flex gap-1.5">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Pega URL de YouTube, Spotify o MP3..."
            className="flex-1 px-2.5 py-1.5 rounded-lg border text-xs outline-none transition-all focus:ring-1 focus:ring-emerald-500"
            style={{
              backgroundColor: 'var(--bg-color)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-color)',
            }}
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition-all hover:opacity-90 active:scale-95 cursor-pointer flex items-center gap-1"
            style={{ backgroundColor: accentColor }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir</span>
          </button>
        </div>
      </form>
    </div>
  );
};
