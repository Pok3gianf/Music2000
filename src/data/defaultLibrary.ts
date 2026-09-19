import { LibraryState, Song } from '../types';

export const DEFAULT_TAGS = [
  { name: 'Favoritos', color: '#10b981' },
  { name: 'Chill & Lo-Fi', color: '#8b5cf6' },
  { name: 'Corporate Work', color: '#0284c7' },
  { name: 'Energía', color: '#f97316' },
  { name: 'Podcast / Demo', color: '#ec4899' },
];

export const INITIAL_DEMO_TRACKS: Song[] = [
  {
    id: 'demo-track-1',
    path: 'C:/Users/Usuario/Musica/OmegaLabs/Corporate_Breeze.wav',
    title: 'Corporate Breeze (Lo-Fi)',
    artist: 'Omega Labs',
    album: 'Memphis Sessions 2000',
    track: '1',
    duration: 45000,
    source: 'local',
    tag: { name: 'Chill & Lo-Fi', color: '#8b5cf6' },
    is_video: false,
    service: 'local',
  },
  {
    id: 'demo-track-2',
    path: 'C:/Users/Usuario/Musica/OmegaLabs/Pastel_Chords.wav',
    title: 'Pastel Chords & Coffee',
    artist: 'Antigravity Ensemble',
    album: 'Memphis Sessions 2000',
    track: '2',
    duration: 45000,
    source: 'local',
    tag: { name: 'Corporate Work', color: '#0284c7' },
    is_video: false,
    service: 'local',
  },
  {
    id: 'demo-track-3',
    path: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    title: 'Warm Sunlight in the Studio',
    artist: 'DeepMind Soundlab',
    album: 'Pastel Horizons',
    track: '3',
    duration: 142000,
    source: 'url',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    tag: { name: 'Favoritos', color: '#10b981' },
    is_video: false,
    service: 'generic',
  },
  {
    id: 'demo-track-4',
    path: 'C:/Users/Usuario/Musica/OmegaLabs/Neon_Corporate.wav',
    title: 'Synthwave Skyline (90s Retro)',
    artist: 'Omega Labs Inc',
    album: 'Music2000 OST',
    track: '4',
    duration: 45000,
    source: 'local',
    tag: { name: 'Energía', color: '#f97316' },
    is_video: false,
    service: 'local',
  },
  {
    id: 'demo-track-5',
    path: 'https://www.w3schools.com/html/mov_bbb.mp4',
    title: 'Videoclip Animado Pastel',
    artist: 'Corporate Memphis Studios',
    album: 'Visual Showcase',
    track: '5',
    duration: 10000,
    source: 'url',
    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    tag: { name: 'Podcast / Demo', color: '#ec4899' },
    is_video: true,
    service: 'generic',
  },
];

export const INITIAL_LIBRARY_STATE: LibraryState = {
  playlists: {
    Library: {
      items: [...INITIAL_DEMO_TRACKS],
    },
    'Favoritos Memphis': {
      items: [INITIAL_DEMO_TRACKS[0], INITIAL_DEMO_TRACKS[2]],
    },
    'Lo-Fi Corporate': {
      items: [INITIAL_DEMO_TRACKS[0], INITIAL_DEMO_TRACKS[1]],
    },
  },
};
