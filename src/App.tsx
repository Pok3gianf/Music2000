import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  LibraryState,
  Song,
  AppConfig,
  Tag,
  ThemePreset,
  DeviceMode,
  Playlist,
} from './types';
import { DEFAULT_CONFIG, PRESET_THEMES } from './data/themes';
import { INITIAL_LIBRARY_STATE, DEFAULT_TAGS } from './data/defaultLibrary';
import {
  loadLibraryFromCookies,
  saveLibraryToCookies,
  loadConfigFromCookies,
  saveConfigToCookies,
  loadEqFromCookies,
  saveEqToCookies,
} from './utils/cookieStorage';
import { audioEngine, EQ_PRESETS, generateSyntheticTrackBlob } from './utils/audioEngine';
import {
  saveTrackAudioBlob,
  getTrackAudioBlob,
  saveMultipleTrackBlobs,
  loadAllTrackBlobs,
} from './utils/audioStorage';

import { TopBar } from './components/TopBar';
import { PlaylistsSidebar } from './components/PlaylistsSidebar';
import { TrackList } from './components/TrackList';
import { MediaAndAnalysisPanel, extractYouTubeId, extractSpotifyId } from './components/MediaAndAnalysisPanel';
import { EqualizerPanel } from './components/EqualizerPanel';
import { SettingsDialog } from './components/SettingsDialog';
import { CustomExplorerDialog } from './components/CustomExplorerDialog';
import { CompileAndDesktopDialog } from './components/CompileAndDesktopDialog';
import { MetadataDialog } from './components/MetadataDialog';
import { TagDialog } from './components/TagDialog';
import { ImportPlaylistDialog } from './components/ImportPlaylistDialog';
import { AudioCDDialog } from './components/AudioCDDialog';

import { ListMusic, Music, Radio } from 'lucide-react';

export default function App() {
  // Audio element reference
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // App Configuration (initialized from Cookies or Default)
  const [config, setConfig] = useState<AppConfig>(() => {
    return loadConfigFromCookies() || DEFAULT_CONFIG;
  });

  // Library State (initialized from Cookies or Default)
  const [library, setLibrary] = useState<LibraryState>(() => {
    return loadLibraryFromCookies() || INITIAL_LIBRARY_STATE;
  });

  // Equalizer State (initialized from Cookies or Default)
  const [eqBands, setEqBands] = useState<number[]>(() => {
    const saved = loadEqFromCookies();
    return saved?.bands || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  });
  const [volume, setVolume] = useState<number>(() => {
    const saved = loadEqFromCookies();
    return saved?.volume !== undefined ? saved.volume : 80;
  });
  const [balance, setBalance] = useState<number>(() => {
    const saved = loadEqFromCookies();
    return saved?.balance !== undefined ? saved.balance : 0;
  });
  const [pitch, setPitch] = useState<number>(() => {
    const saved = loadEqFromCookies();
    return saved?.pitch !== undefined ? saved.pitch : 0;
  });

  // Playback state
  const [currentPlaylistName, setCurrentPlaylistName] = useState('Library');
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [continueAlways, setContinueAlways] = useState(true);
  const [isDetachedEq, setIsDetachedEq] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Dynamic animated accent calculation (A ↔ B sine wave morphing)
  const [dynamicAccent, setDynamicAccent] = useState(config.colors.accent);

  // Playlists and Import state
  const [isPlaylistImportOpen, setIsPlaylistImportOpen] = useState(false);
  const [isCdImportOpen, setIsCdImportOpen] = useState(false);

  // Responsive / Mobile active tab
  const [mobileTab, setMobileTab] = useState<'playlists' | 'tracks' | 'player'>('tracks');

  // Dialogs state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [compileModalMode, setCompileModalMode] = useState<'download' | 'developer' | null>(null);
  const [editingMetadataSong, setEditingMetadataSong] = useState<Song | null>(null);
  const [editingTagSong, setEditingTagSong] = useState<Song | null>(null);

  // Synthetic demo track blobs cache
  const syntheticBlobsRef = useRef<Record<string, string>>({});

  // Sync Library to Cookies on change
  useEffect(() => {
    saveLibraryToCookies(library);
  }, [library]);

  // Sync Config to Cookies on change
  useEffect(() => {
    saveConfigToCookies(config);
  }, [config]);

  // Sync Equalizer to Cookies on change
  useEffect(() => {
    saveEqToCookies(eqBands, volume, balance, pitch);
    audioEngine.setAllFilterGains(eqBands);
    audioEngine.setVolume(volume);
    audioEngine.setBalance(balance);
    audioEngine.setPitch(pitch);
  }, [eqBands, volume, balance, pitch]);

  // Connect audio engine once audio element is mounted
  useEffect(() => {
    if (audioRef.current) {
      audioEngine.init(audioRef.current);
    }
  }, []);

  // Rehydrate all track audios from IndexedDB as soon as page loads or is restored ("apenas se reestablezca / abra la pagina")
  useEffect(() => {
    let isCancelled = false;

    async function rehydrateAllAudios() {
      const allSongs: Song[] = [];
      Object.values(library.playlists).forEach((pl) => {
        if (pl?.items) allSongs.push(...pl.items);
      });
      if (allSongs.length === 0) return;

      const ids = allSongs.map((s) => s.id);
      const blobsMap = await loadAllTrackBlobs(ids);

      let anyChange = false;
      const nextPlaylists = { ...library.playlists };

      for (const [plName, pl] of Object.entries(nextPlaylists)) {
        let plChanged = false;
        const newItems: Song[] = [];

        for (const s of pl.items) {
          const storedBlob = blobsMap.get(s.id);
          if (storedBlob) {
            const freshUrl = URL.createObjectURL(storedBlob);
            syntheticBlobsRef.current[s.id] = freshUrl;
            if (s.audioBlobUrl !== freshUrl) {
              plChanged = true;
              newItems.push({ ...s, audioBlobUrl: freshUrl });
              continue;
            }
          }
          newItems.push(s);
        }

        if (plChanged) {
          anyChange = true;
          nextPlaylists[plName] = { ...pl, items: newItems };
        }
      }

      if (anyChange && !isCancelled) {
        setLibrary((prev) => ({ ...prev, playlists: nextPlaylists }));
      }
    }

    rehydrateAllAudios();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Update speed in audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  // Dynamic animated accent loop
  useEffect(() => {
    if (config.accent !== 'dynamic') {
      setDynamicAccent(config.colors.accent);
      return;
    }

    let frameId: number;
    let start = performance.now();

    const hexToRgb = (hex: string) => {
      const clean = hex.replace('#', '');
      return [
        parseInt(clean.substring(0, 2), 16),
        parseInt(clean.substring(2, 4), 16),
        parseInt(clean.substring(4, 6), 16),
      ];
    };

    const rgbToHex = (r: number, g: number, b: number) => {
      const toHex = (n: number) =>
        Math.round(Math.min(255, Math.max(0, n)))
          .toString(16)
          .padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    const rgbA = hexToRgb(config.colors.dynamic_a || '#10b981');
    const rgbB = hexToRgb(config.colors.dynamic_b || '#f43f5e');

    const animate = (now: number) => {
      const elapsed = (now - start) / 1000;
      const t = (Math.sin(elapsed * 1.5) + 1) / 2;

      const r = rgbA[0] + (rgbB[0] - rgbA[0]) * t;
      const g = rgbA[1] + (rgbB[1] - rgbA[1]) * t;
      const b = rgbA[2] + (rgbB[2] - rgbA[2]) * t;

      setDynamicAccent(rgbToHex(r, g, b));
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [config.accent, config.colors.accent, config.colors.dynamic_a, config.colors.dynamic_b]);

  // Current playlist songs
  const currentPlaylistSongs = useMemo(() => {
    const pl = library.playlists[currentPlaylistName];
    return pl ? pl.items : [];
  }, [library, currentPlaylistName]);

  // All available unique tags in library
  const allAvailableTags = useMemo(() => {
    const map = new Map<string, Tag>();
    DEFAULT_TAGS.forEach((t) => map.set(t.name, t));
    Object.values(library.playlists).forEach((pl) => {
      pl.items.forEach((s) => {
        if (s.tag && s.tag.name) {
          map.set(s.tag.name, s.tag);
        }
      });
    });
    return Array.from(map.values());
  }, [library]);

  // Audio event handlers
  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTimeMs(audioRef.current.currentTime * 1000);
    }
  };

  const handleAudioDurationChange = () => {
    if (audioRef.current && audioRef.current.duration) {
      const dur = audioRef.current.duration * 1000;
      setDurationMs(dur);
      if (currentSong && (!currentSong.duration || currentSong.duration <= 0)) {
        updateSongData(currentSong.id, { duration: dur });
      }
    }
  };

  const handleAudioEnded = () => {
    if (continueAlways) {
      handleNextTrack();
    } else {
      setIsPlaying(false);
    }
  };

  const handleAudioError = () => {
    console.warn('Audio playback error on source:', audioRef.current?.src);
    setIsPlaying(false);
  };

  // Play a specific song
  const handlePlaySong = (song: Song) => {
    audioEngine.ensureContext();
    const songs = currentPlaylistSongs;
    const idx = songs.findIndex((s) => s.id === song.id);
    setCurrentIndex(idx !== -1 ? idx : 0);
    setCurrentSong(song);

    // If it's a YouTube or Spotify link, the embedded player in MediaAndAnalysisPanel handles it
    const yt = extractYouTubeId(song.url);
    const sp = extractSpotifyId(song.url);
    if (yt || sp) {
      setIsPlaying(true);
      return;
    }

    let src = song.audioBlobUrl || song.url || song.path || '';

    // If it is a mock/synthetic path, retrieve from IndexedDB or generate Web Audio synthetic waveform
    if (!song.audioBlobUrl && (!src.startsWith('blob:') && !src.startsWith('http://') && !src.startsWith('https://'))) {
      if (syntheticBlobsRef.current[song.id]) {
        src = syntheticBlobsRef.current[song.id];
      } else {
        getTrackAudioBlob(song.id).then((storedBlob) => {
          if (storedBlob) {
            const freshUrl = URL.createObjectURL(storedBlob);
            syntheticBlobsRef.current[song.id] = freshUrl;
            if (audioRef.current && currentSong?.id === song.id) {
              audioRef.current.src = freshUrl;
              audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
            }
          } else {
            generateSyntheticTrackBlob('lofi').then((res) => {
              saveTrackAudioBlob(song.id, res.blob);
              syntheticBlobsRef.current[song.id] = res.blobUrl;
              if (audioRef.current && currentSong?.id === song.id) {
                audioRef.current.src = res.blobUrl;
                audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
              }
            });
          }
        });
        return;
      }
    }

    if (audioRef.current) {
      audioRef.current.src = src;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Playback autoplay promise note:', err);
          setIsPlaying(false);
        });
    }
  };

  const handleTogglePlay = () => {
    audioEngine.ensureContext();
    if (!currentSong) {
      if (currentPlaylistSongs.length > 0) {
        handlePlaySong(currentPlaylistSongs[0]);
      }
      return;
    }

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        ?.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleNextTrack = () => {
    if (currentPlaylistSongs.length === 0) return;
    const nextIdx = (currentIndex + 1) % currentPlaylistSongs.length;
    handlePlaySong(currentPlaylistSongs[nextIdx]);
  };

  const handlePreviousTrack = () => {
    if (currentPlaylistSongs.length === 0) return;
    const prevIdx =
      (currentIndex - 1 + currentPlaylistSongs.length) % currentPlaylistSongs.length;
    handlePlaySong(currentPlaylistSongs[prevIdx]);
  };

  const handleSeek = (ms: number) => {
    setCurrentTimeMs(ms);
    if (audioRef.current) {
      audioRef.current.currentTime = ms / 1000;
    }
  };

  const handleCycleSpeed = () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const currIdx = speeds.indexOf(speed);
    const nextSpeed = speeds[(currIdx + 1) % speeds.length];
    setSpeed(nextSpeed);
  };

  // Add song from URL (YouTube, Spotify, Apple, Web MP3/MP4)
  const handleAddUrl = (url: string) => {
    if (config.privacy_local_only) {
      alert('El Modo Local Estricto está activo. Desactívalo en Ajustes para añadir URLs.');
      return;
    }

    let service: Song['service'] = 'generic';
    let title = url;
    let isVideo = false;

    const ytId = extractYouTubeId(url);
    const spData = extractSpotifyId(url);

    if (ytId) {
      service = 'youtube';
      title = `YouTube Video (${ytId})`;
      isVideo = true;
    } else if (spData) {
      service = 'spotify';
      title = `Spotify ${spData.type.toUpperCase()} (${spData.id})`;
    } else if (url.includes('apple.com')) {
      service = 'apple';
      title = 'Apple Music Stream';
    } else {
      const filename = url.split('/').pop()?.split('?')[0] || 'Pista de Audio Web';
      title = filename;
      isVideo = /\.(mp4|webm|mkv|mov|avi)$/i.test(url);
    }

    const newSong: Song = {
      id: `url-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      path: '',
      title,
      artist: service.toUpperCase(),
      album: 'Web Streams',
      track: String(currentPlaylistSongs.length + 1),
      duration: 180000,
      source: 'url',
      url,
      service,
      is_video: isVideo,
      tag: {
        name: service === 'youtube' ? 'YouTube' : service === 'spotify' ? 'Spotify' : 'Web Stream',
        color: service === 'youtube' ? '#f43f5e' : service === 'spotify' ? '#10b981' : '#0284c7',
      },
    };

    setLibrary((prev) => {
      const pl = prev.playlists[currentPlaylistName] || { items: [] };
      return {
        ...prev,
        playlists: {
          ...prev.playlists,
          [currentPlaylistName]: {
            ...pl,
            items: [...pl.items, newSong],
          },
        },
      };
    });
  };

  // Add local files / videos (from Drag-and-Drop or File Pickers)
  const handleAddLocalFiles = (files: File[]) => {
    const newSongs: Song[] = files.map((file, idx) => {
      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mkv|mov|avi)$/i.test(file.name);
      const blobUrl = URL.createObjectURL(file);
      return {
        id: `local-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        path: file.name,
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Archivo Local',
        album: currentPlaylistName,
        track: String(currentPlaylistSongs.length + idx + 1),
        duration: 180000,
        source: 'local',
        audioBlobUrl: blobUrl,
        is_video: isVideo,
        tag: { name: isVideo ? 'Video' : 'Local', color: isVideo ? '#f43f5e' : '#10b981' },
      };
    });

    // Save audio files to persistent IndexedDB
    const blobsToSave = files.map((file, idx) => ({
      id: newSongs[idx].id,
      blob: file,
    }));
    saveMultipleTrackBlobs(blobsToSave);

    setLibrary((prev) => {
      const pl = prev.playlists[currentPlaylistName] || { items: [] };
      return {
        ...prev,
        playlists: {
          ...prev.playlists,
          [currentPlaylistName]: {
            ...pl,
            items: [...pl.items, ...newSongs],
          },
        },
      };
    });
  };

  // Add files from Custom Explorer
  const handleFilesFromExplorer = (
    files: { name: string; url: string; file?: File; duration?: number }[]
  ) => {
    const newSongs: Song[] = files.map((f, i) => {
      const isVideo = f.name.match(/\.(mp4|webm|mkv|mov|avi)$/i) !== null;
      return {
        id: `file-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        path: f.name,
        title: f.name.replace(/\.[^/.]+$/, ''),
        artist: 'Colección Local',
        album: 'Explorador Custom',
        track: String(currentPlaylistSongs.length + i + 1),
        duration: f.duration || 45000,
        source: 'local',
        url: f.url,
        is_video: isVideo,
        audioBlobUrl: f.url,
      };
    });

    setLibrary((prev) => {
      const pl = prev.playlists[currentPlaylistName] || { items: [] };
      return {
        ...prev,
        playlists: {
          ...prev.playlists,
          [currentPlaylistName]: {
            ...pl,
            items: [...pl.items, ...newSongs],
          },
        },
      };
    });
  };

  // Playlist Import Success handler
  const handleImportPlaylistSuccess = (playlistName: string, songs: Song[], createNew: boolean) => {
    // Cache any existing blob URLs in syntheticBlobsRef
    songs.forEach((s) => {
      if (s.audioBlobUrl) {
        syntheticBlobsRef.current[s.id] = s.audioBlobUrl;
      }
    });

    setLibrary((prev) => {
      const targetName = createNew ? playlistName : currentPlaylistName;
      const existing = prev.playlists[targetName] || { items: [] };
      return {
        ...prev,
        playlists: {
          ...prev.playlists,
          [targetName]: {
            items: createNew ? songs : [...existing.items, ...songs],
          },
        },
      };
    });
    if (createNew) {
      setCurrentPlaylistName(playlistName);
      if (songs.length > 0) {
        setCurrentSong(songs[0]);
        setCurrentIndex(0);
      }
    }
  };

  // Audio CD Import handler
  const handleImportCDTracks = (tracks: Song[], albumTitle: string) => {
    const plName = albumTitle ? `CD: ${albumTitle}` : 'Álbum CD Extraído';
    setLibrary((prev) => ({
      ...prev,
      playlists: {
        ...prev.playlists,
        [plName]: { items: tracks },
      },
    }));
    setCurrentPlaylistName(plName);
  };

  // Update song data (e.g. metadata or tags)
  const updateSongData = (songId: string, partial: Partial<Song>) => {
    setLibrary((prev) => {
      const updatedPlaylists = { ...prev.playlists };
      Object.keys(updatedPlaylists).forEach((plName) => {
        updatedPlaylists[plName] = {
          ...updatedPlaylists[plName],
          items: updatedPlaylists[plName].items.map((s) =>
            s.id === songId ? { ...s, ...partial } : s
          ),
        };
      });
      return { ...prev, playlists: updatedPlaylists };
    });
  };

  // Playlist management
  const handleCreateNewPlaylist = () => {
    const name = prompt('Nombre de la nueva playlist:');
    if (!name || !name.trim()) return;
    const cleanName = name.trim();
    if (library.playlists[cleanName]) {
      alert('Ya existe una playlist con ese nombre.');
      return;
    }
    setLibrary((prev) => ({
      ...prev,
      playlists: {
        ...prev.playlists,
        [cleanName]: { items: [] },
      },
    }));
    setCurrentPlaylistName(cleanName);
  };

  const handleRenamePlaylist = (oldName: string) => {
    if (oldName === 'Library') {
      alert('No se puede renombrar la playlist principal "Library".');
      return;
    }
    const newName = prompt('Nuevo nombre para la playlist:', oldName);
    if (!newName || !newName.trim() || newName === oldName) return;
    const cleanName = newName.trim();

    setLibrary((prev) => {
      const copy = { ...prev.playlists };
      const data = copy[oldName];
      delete copy[oldName];
      copy[cleanName] = data;
      return { ...prev, playlists: copy };
    });
    if (currentPlaylistName === oldName) {
      setCurrentPlaylistName(cleanName);
    }
  };

  const handleDeletePlaylist = (name: string) => {
    if (name === 'Library') {
      alert('No se puede eliminar la playlist "Library".');
      return;
    }
    if (!confirm(`¿Eliminar la playlist "${name}"?`)) return;

    setLibrary((prev) => {
      const copy = { ...prev.playlists };
      delete copy[name];
      return { ...prev, playlists: copy };
    });
    if (currentPlaylistName === name) {
      setCurrentPlaylistName('Library');
    }
  };

  const handleReorderSongs = (newSongs: Song[]) => {
    setLibrary((prev) => ({
      ...prev,
      playlists: {
        ...prev.playlists,
        [currentPlaylistName]: {
          ...prev.playlists[currentPlaylistName],
          items: newSongs,
        },
      },
    }));
  };

  const handleRemoveSongs = (songIds: string[]) => {
    const set = new Set(songIds);
    setLibrary((prev) => ({
      ...prev,
      playlists: {
        ...prev.playlists,
        [currentPlaylistName]: {
          ...prev.playlists[currentPlaylistName],
          items: prev.playlists[currentPlaylistName].items.filter((s) => !set.has(s.id)),
        },
      },
    }));
  };

  // Developer mode fake tracks
  const handleAddFakeTracks = () => {
    const fakeTracks: Song[] = Array.from({ length: 5 }).map((_, i) => ({
      id: `dev-fake-${Date.now()}-${i}`,
      path: `C:/Users/Usuario/Musica/Dev_Track_${i + 1}.mp3`,
      title: `Pista de Prueba ${i + 1}`,
      artist: 'Omega Dev Lab',
      album: 'Developer Test Suite',
      track: String(currentPlaylistSongs.length + i + 1),
      duration: (120 + i * 25) * 1000,
      source: 'local',
      tag: { name: 'Favoritos', color: '#10b981' },
    }));

    setLibrary((prev) => ({
      ...prev,
      playlists: {
        ...prev.playlists,
        [currentPlaylistName]: {
          ...prev.playlists[currentPlaylistName],
          items: [...prev.playlists[currentPlaylistName].items, ...fakeTracks],
        },
      },
    }));
  };

  const handleClearCurrentTracks = () => {
    setLibrary((prev) => ({
      ...prev,
      playlists: {
        ...prev.playlists,
        [currentPlaylistName]: {
          ...prev.playlists[currentPlaylistName],
          items: [],
        },
      },
    }));
  };

  // Preset themes
  const handleSelectPresetTheme = (preset: ThemePreset) => {
    setConfig((prev) => ({
      ...prev,
      theme_mode: preset.theme_mode,
      themePresetName: preset.name,
      colors: { ...preset.colors },
      accent: preset.colors.accent,
    }));
  };

  // Equalizer handlers
  const handleChangeEqBand = (index: number, val: number) => {
    setEqBands((prev) => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  };

  const handleApplyEqPreset = (presetName: string) => {
    const preset = EQ_PRESETS[presetName];
    if (preset) {
      setEqBands([...preset]);
    }
  };

  // Toggle Lite Mode
  const handleToggleLiteMode = () => {
    setConfig((prev) => ({
      ...prev,
      is_lite_mode: !prev.is_lite_mode,
    }));
  };

  // Select Device Mode
  const handleSelectDeviceMode = (mode: DeviceMode) => {
    setConfig((prev) => ({
      ...prev,
      device_mode: mode,
    }));
  };

  // Build dynamic CSS variables for theme styling
  const themeStyles = useMemo(() => {
    const isDark = config.theme_mode === 'dark';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)';

    return {
      '--bg-color': config.colors.bg,
      '--panel-bg': config.colors.panel,
      '--text-color': config.colors.text,
      '--eq-bg': config.colors.eq_bg,
      '--slider-groove': config.colors.slider_groove,
      '--slider-handle': config.colors.slider_handle,
      '--video-bg': config.colors.video_bg,
      '--border-color': borderColor,
      '--accent-color': dynamicAccent,
      fontFamily: '"Plus Jakarta Sans", "Outfit", system-ui, sans-serif',
    } as React.CSSProperties;
  }, [config, dynamicAccent]);

  const deviceMode = config.device_mode || 'desktop';
  const isTvMode = deviceMode === 'tv';
  const isMobileMode = deviceMode === 'mobile';

  return (
    <div
      style={themeStyles}
      className={`min-h-screen w-full flex flex-col overflow-hidden transition-colors duration-200 ${
        isTvMode ? 'text-base sm:text-lg tracking-wide scale-[1.02]' : ''
      }`}
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onTimeUpdate={handleAudioTimeUpdate}
        onDurationChange={handleAudioDurationChange}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Top Application Bar */}
      <TopBar
        config={config}
        accentColor={dynamicAccent}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDeveloper={() => setCompileModalMode('developer')}
        onOpenDesktopDownload={() => setCompileModalMode('download')}
        onOpenExplorer={() => setIsExplorerOpen(true)}
        onOpenCdImport={() => setIsCdImportOpen(true)}
        onOpenPlaylistImport={() => setIsPlaylistImportOpen(true)}
        onToggleLiteMode={handleToggleLiteMode}
        onSelectDeviceMode={handleSelectDeviceMode}
        onToggleMaximize={() => setIsMaximized(!isMaximized)}
        onMinimize={() => alert('Aplicación minimizada a la bandeja de sistema.')}
        isMaximized={isMaximized}
      />

      {/* Mobile view tab switcher */}
      {(isMobileMode || window.innerWidth < 768) && (
        <div
          className="flex md:hidden h-10 border-b shrink-0 text-xs font-bold"
          style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}
        >
          <button
            onClick={() => setMobileTab('playlists')}
            className={`flex-1 flex items-center justify-center gap-1.5 border-r ${
              mobileTab === 'playlists' ? 'text-white' : 'opacity-70'
            }`}
            style={{
              backgroundColor: mobileTab === 'playlists' ? dynamicAccent : 'transparent',
              borderColor: 'var(--border-color)',
            }}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Playlists</span>
          </button>

          <button
            onClick={() => setMobileTab('tracks')}
            className={`flex-1 flex items-center justify-center gap-1.5 border-r ${
              mobileTab === 'tracks' ? 'text-white' : 'opacity-70'
            }`}
            style={{
              backgroundColor: mobileTab === 'tracks' ? dynamicAccent : 'transparent',
              borderColor: 'var(--border-color)',
            }}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Canciones ({currentPlaylistSongs.length})</span>
          </button>

          <button
            onClick={() => setMobileTab('player')}
            className={`flex-1 flex items-center justify-center gap-1.5 ${
              mobileTab === 'player' ? 'text-white' : 'opacity-70'
            }`}
            style={{
              backgroundColor: mobileTab === 'player' ? dynamicAccent : 'transparent',
            }}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Reproductor</span>
          </button>
        </div>
      )}

      {/* Main Studio Workspace */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left Column: Playlists Sidebar */}
        <div
          className={`shrink-0 ${
            isMobileMode
              ? mobileTab === 'playlists'
                ? 'flex flex-1 w-full'
                : 'hidden'
              : 'hidden md:flex'
          }`}
        >
          <PlaylistsSidebar
            library={library}
            currentPlaylist={currentPlaylistName}
            onSelectPlaylist={(plName) => {
              setCurrentPlaylistName(plName);
              if (isMobileMode) setMobileTab('tracks');
            }}
            onNewPlaylist={handleCreateNewPlaylist}
            onImportPlaylist={() => setIsPlaylistImportOpen(true)}
            onImportCd={() => setIsCdImportOpen(true)}
            onRenamePlaylist={handleRenamePlaylist}
            onDeletePlaylist={handleDeletePlaylist}
            accentColor={dynamicAccent}
          />
        </div>

        {/* Center Column: Track List & Library Table */}
        <div
          className={`flex-1 flex min-w-0 ${
            isMobileMode
              ? mobileTab === 'tracks'
                ? 'flex w-full'
                : 'hidden'
              : 'flex'
          }`}
        >
          <TrackList
            songs={currentPlaylistSongs}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onPlaySong={handlePlaySong}
            onEditMetadata={(s) => setEditingMetadataSong(s)}
            onAssignTag={(s) => setEditingTagSong(s)}
            onSetExistingTag={(songId, tag) => updateSongData(songId, { tag })}
            onRemoveSongs={handleRemoveSongs}
            onReorderSongs={handleReorderSongs}
            allAvailableTags={allAvailableTags}
            accentColor={dynamicAccent}
            onAddFiles={handleAddLocalFiles}
          />
        </div>

        {/* Right Column: Visual Stage, Spectrum & Waveform, Controls, URL Adder */}
        <div
          className={`shrink-0 ${
            isMobileMode
              ? mobileTab === 'player'
                ? 'flex flex-1 w-full'
                : 'hidden'
              : 'hidden lg:flex'
          }`}
        >
          <MediaAndAnalysisPanel
            currentSong={currentSong}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onNext={handleNextTrack}
            onPrevious={handlePreviousTrack}
            onSeek={handleSeek}
            currentTimeMs={currentTimeMs}
            durationMs={durationMs}
            speed={speed}
            onCycleSpeed={handleCycleSpeed}
            onAddUrl={handleAddUrl}
            accentColor={dynamicAccent}
            isLiteMode={config.is_lite_mode}
          />
        </div>
      </div>

      {/* Bottom Panel: 10-Band Graphic Equalizer (Hidden in Lite Mode if desired) */}
      {!config.is_lite_mode && (
        <EqualizerPanel
          eqBands={eqBands}
          onChangeBand={handleChangeEqBand}
          onApplyPreset={handleApplyEqPreset}
          volume={volume}
          onChangeVolume={setVolume}
          balance={balance}
          onChangeBalance={setBalance}
          pitch={pitch}
          onChangePitch={setPitch}
          continueAlways={continueAlways}
          onToggleContinueAlways={() => setContinueAlways(!continueAlways)}
          isDetached={isDetachedEq}
          onToggleDetach={() => setIsDetachedEq(!isDetachedEq)}
          accentColor={dynamicAccent}
        />
      )}

      {/* Modals and Dialogs */}
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={setConfig}
        onSelectPresetTheme={handleSelectPresetTheme}
        accentColor={dynamicAccent}
      />

      <CustomExplorerDialog
        isOpen={isExplorerOpen}
        onClose={() => setIsExplorerOpen(false)}
        onSelectFiles={handleFilesFromExplorer}
        accentColor={dynamicAccent}
      />

      <CompileAndDesktopDialog
        isOpen={compileModalMode !== null}
        onClose={() => setCompileModalMode(null)}
        mode={compileModalMode || 'download'}
        onAddFakeTracks={handleAddFakeTracks}
        onClearTracks={handleClearCurrentTracks}
        accentColor={dynamicAccent}
      />

      <MetadataDialog
        isOpen={editingMetadataSong !== null}
        onClose={() => setEditingMetadataSong(null)}
        song={editingMetadataSong}
        onSave={(updated) => updateSongData(updated.id, updated)}
        accentColor={dynamicAccent}
      />

      <TagDialog
        isOpen={editingTagSong !== null}
        onClose={() => setEditingTagSong(null)}
        currentTag={editingTagSong?.tag || null}
        onSaveTag={(tag) => {
          if (editingTagSong) {
            updateSongData(editingTagSong.id, { tag });
          }
        }}
        accentColor={dynamicAccent}
      />

      {/* Import Playlist Modal */}
      <ImportPlaylistDialog
        isOpen={isPlaylistImportOpen}
        onClose={() => setIsPlaylistImportOpen(false)}
        onImportSuccess={handleImportPlaylistSuccess}
        currentPlaylistName={currentPlaylistName}
        accentColor={dynamicAccent}
      />

      {/* Audio CD Modal */}
      <AudioCDDialog
        isOpen={isCdImportOpen}
        onClose={() => setIsCdImportOpen(false)}
        onImportCDTracks={handleImportCDTracks}
        accentColor={dynamicAccent}
      />
    </div>
  );
}
