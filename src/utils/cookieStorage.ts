import { AppConfig, LibraryState } from '../types';

/**
 * Cookie storage utility for Music2000.
 * Saves user configuration, playlists, and equalizers using document.cookie.
 */

const COOKIE_PREFIX = 'm2k_';
const MAX_COOKIE_CHUNK_SIZE = 3600; // safe margin below 4096 bytes

export function setCookie(name: string, value: string, days = 365): void {
  try {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    const securePart = window.location.protocol === 'https:' ? ';Secure' : '';
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax${securePart}`;
  } catch (err) {
    console.warn('Cookie write error:', err);
  }
}

export function getCookie(name: string): string | null {
  try {
    const encodedName = encodeURIComponent(name) + '=';
    const decodedCookie = document.cookie;
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(encodedName) === 0) {
        return decodeURIComponent(c.substring(encodedName.length, c.length));
      }
    }
  } catch (err) {
    console.warn('Cookie read error:', err);
  }
  return null;
}

export function deleteCookie(name: string): void {
  document.cookie = `${encodeURIComponent(name)}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Lax`;
}

export function getAllM2KCookies(): Record<string, string> {
  const result: Record<string, string> = {};
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    const part = ca[i].trim();
    if (!part) continue;
    const eqIdx = part.indexOf('=');
    if (eqIdx > 0) {
      const k = decodeURIComponent(part.substring(0, eqIdx));
      const v = decodeURIComponent(part.substring(eqIdx + 1));
      if (k.startsWith(COOKIE_PREFIX)) {
        result[k] = v;
      }
    }
  }
  return result;
}

/**
 * Save chunked large data into cookies
 */
export function setChunkedCookie(baseKey: string, rawData: string): void {
  // First clear old chunks
  let idx = 0;
  while (getCookie(`${baseKey}_${idx}`) !== null) {
    deleteCookie(`${baseKey}_${idx}`);
    idx++;
  }

  // Split into chunks
  const numChunks = Math.ceil(rawData.length / MAX_COOKIE_CHUNK_SIZE);
  setCookie(`${baseKey}_count`, String(numChunks));

  for (let i = 0; i < numChunks; i++) {
    const chunk = rawData.substring(i * MAX_COOKIE_CHUNK_SIZE, (i + 1) * MAX_COOKIE_CHUNK_SIZE);
    setCookie(`${baseKey}_${i}`, chunk);
  }
}

/**
 * Read chunked large data from cookies
 */
export function getChunkedCookie(baseKey: string): string | null {
  const countStr = getCookie(`${baseKey}_count`);
  if (!countStr) {
    // Try reading single unchunked cookie
    return getCookie(baseKey);
  }
  const count = parseInt(countStr, 10);
  if (isNaN(count) || count <= 0) return null;

  let combined = '';
  for (let i = 0; i < count; i++) {
    const chunk = getCookie(`${baseKey}_${i}`);
    if (chunk === null) return null;
    combined += chunk;
  }
  return combined;
}

/**
 * Persist Library state to cookies (with local storage backup)
 */
export function saveLibraryToCookies(library: LibraryState): void {
  try {
    const json = JSON.stringify(library);
    setChunkedCookie(`${COOKIE_PREFIX}lib`, json);
    // Also sync to localStorage as redundant safe fallback
    localStorage.setItem('music2000_library_backup', json);
  } catch (err) {
    console.warn('Error saving library to cookies:', err);
  }
}

/**
 * Load Library state from cookies (falling back to backup)
 */
export function loadLibraryFromCookies(): LibraryState | null {
  try {
    const chunked = getChunkedCookie(`${COOKIE_PREFIX}lib`);
    if (chunked) {
      const parsed = JSON.parse(chunked) as LibraryState;
      if (parsed && parsed.playlists) {
        return parsed;
      }
    }
    // Fallback to localStorage backup
    const backup = localStorage.getItem('music2000_library_backup');
    if (backup) {
      const parsed = JSON.parse(backup) as LibraryState;
      if (parsed && parsed.playlists) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error loading library from cookies:', err);
  }
  return null;
}

/**
 * Persist App config to cookies
 */
export function saveConfigToCookies(config: AppConfig): void {
  try {
    const json = JSON.stringify(config);
    setCookie(`${COOKIE_PREFIX}cfg`, json);
    localStorage.setItem('music2000_config_backup', json);
  } catch (err) {
    console.warn('Error saving config to cookies:', err);
  }
}

/**
 * Load App config from cookies
 */
export function loadConfigFromCookies(): AppConfig | null {
  try {
    const val = getCookie(`${COOKIE_PREFIX}cfg`);
    if (val) {
      return JSON.parse(val) as AppConfig;
    }
    const backup = localStorage.getItem('music2000_config_backup');
    if (backup) {
      return JSON.parse(backup) as AppConfig;
    }
  } catch (err) {
    console.warn('Error loading config from cookies:', err);
  }
  return null;
}

/**
 * Persist Equalizer bands to cookies
 */
export function saveEqToCookies(bands: number[], volume: number, balance: number, pitch: number): void {
  try {
    const data = { bands, volume, balance, pitch };
    setCookie(`${COOKIE_PREFIX}eq`, JSON.stringify(data));
  } catch (err) {
    console.warn('Error saving EQ to cookies:', err);
  }
}

/**
 * Load Equalizer bands from cookies
 */
export function loadEqFromCookies(): { bands: number[]; volume: number; balance: number; pitch: number } | null {
  try {
    const val = getCookie(`${COOKIE_PREFIX}eq`);
    if (val) {
      return JSON.parse(val);
    }
  } catch (err) {
    console.warn('Error loading EQ from cookies:', err);
  }
  return null;
}

/**
 * Clear all Music2000 cookies
 */
export function clearAllMusic2000Cookies(): void {
  const cookies = getAllM2KCookies();
  for (const k of Object.keys(cookies)) {
    deleteCookie(k);
  }
  localStorage.removeItem('music2000_library_backup');
  localStorage.removeItem('music2000_config_backup');
}
