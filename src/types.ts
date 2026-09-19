export interface Tag {
  name: string;
  color: string;
  icon?: string | null;
}

export interface Song {
  id: string;
  path: string;
  title: string;
  artist: string;
  album: string;
  track: string;
  duration: number; // in milliseconds
  source: 'local' | 'url';
  url?: string | null;
  tag?: Tag | null;
  is_video?: boolean;
  service?: 'youtube' | 'ytmusic' | 'spotify' | 'apple' | 'generic' | 'local';
  audioBlobUrl?: string; // for uploaded or synthesized audio
  thumbnail?: string | null;
}

export interface Playlist {
  name: string;
  items: Song[];
}

export interface LibraryState {
  playlists: Record<string, { items: Song[] }>;
}

export type DeviceMode = 'auto' | 'mobile' | 'tablet' | 'desktop' | 'tv';

export interface AppColors {
  text: string;
  bg: string;
  panel: string;
  eq_bg: string;
  slider_groove: string;
  slider_handle: string;
  video_bg: string;
  accent: string;
  dynamic_a?: string;
  dynamic_b?: string;
}

export interface AppConfig {
  minimize_to_tray: boolean;
  privacy_local_only: boolean;
  privacy_no_extra_recent: boolean;
  accent: string;
  animated_accent: boolean;
  last_explorer_path: string;
  theme_mode: 'light' | 'dark' | 'memphis';
  advanced_themes: boolean;
  contrast_a: string;
  contrast_b: string;
  colors: AppColors;
  themePresetName: string;
  is_lite_mode?: boolean;
  device_mode?: 'auto' | 'mobile' | 'tablet' | 'desktop' | 'tv';
}

export interface CDTrack {
  trackNumber: number;
  title: string;
  durationSec: number;
  sizeBytes: number;
}

export interface AudioAnalysisMeta {
  duration: number;
  sample_rate: number | null;
  bitrate: number | null;
  codec: string | null;
  channels: number | null;
  peak: string;
  lufs: string;
  bpm: string;
}

export interface ExplorerFileItem {
  name: string;
  path: string;
  kind: 'folder' | 'audio' | 'video' | 'image' | 'playlist' | 'file';
  size?: number; // bytes
  fileRef?: File;
  content?: string;
  items?: ExplorerFileItem[];
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  theme_mode: 'light' | 'dark' | 'memphis';
  colors: AppColors;
  contrast_a: string;
  contrast_b: string;
  animated_accent: boolean;
}
