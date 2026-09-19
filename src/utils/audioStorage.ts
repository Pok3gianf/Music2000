/**
 * IndexedDB Persistent Audio Storage for Music2000
 * Stores audio Blobs so that imported playlists and tracks
 * survive page reloads and re-opening the application.
 */

const DB_NAME = 'music2000_audio_db';
const DB_VERSION = 1;
const STORE_NAME = 'audio_blobs';

let dbPromise: Promise<IDBDatabase> | null = null;

export function getAudioDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = (e) => {
      console.warn('Failed to open IndexedDB for audio:', e);
      reject(request.error);
    };
  });

  return dbPromise;
}

export async function saveTrackAudioBlob(songId: string, blob: Blob): Promise<void> {
  try {
    const db = await getAudioDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, songId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error saving track audio blob in IndexedDB:', err);
  }
}

export async function getTrackAudioBlob(songId: string): Promise<Blob | null> {
  try {
    const db = await getAudioDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(songId);
      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveMultipleTrackBlobs(entries: { id: string; blob: Blob }[]): Promise<void> {
  if (entries.length === 0) return;
  try {
    const db = await getAudioDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      entries.forEach(({ id, blob }) => {
        store.put(blob, id);
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Error saving multiple track blobs:', err);
  }
}

export async function loadAllTrackBlobs(ids: string[]): Promise<Map<string, Blob>> {
  const result = new Map<string, Blob>();
  if (ids.length === 0) return result;

  try {
    const db = await getAudioDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      let count = 0;

      ids.forEach((id) => {
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result) {
            result.set(id, req.result);
          }
          count++;
          if (count === ids.length) {
            resolve(result);
          }
        };
        req.onerror = () => {
          count++;
          if (count === ids.length) {
            resolve(result);
          }
        };
      });
    });
  } catch {
    return result;
  }
}

export async function deleteTrackAudioBlob(songId: string): Promise<void> {
  try {
    const db = await getAudioDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(songId);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}
