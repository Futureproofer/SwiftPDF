import { DocFile, Folder, ExportHistoryItem, CloudSyncConfig } from '../types';

const DB_NAME = 'DocFlow_Studio_DB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('folders')) {
          db.createObjectStore('folders', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('exports')) {
          db.createObjectStore('exports', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

export async function getAllFiles(): Promise<DocFile[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error reading files from DB:', err);
    return [];
  }
}

export async function saveFile(file: DocFile): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    const req = store.put(file);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function saveFilesBatch(files: DocFile[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    files.forEach((file) => store.put(file));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteFileFromDB(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllFolders(): Promise<Folder[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('folders', 'readonly');
      const store = tx.objectStore('folders');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error reading folders from DB:', err);
    return [];
  }
}

export async function saveFolder(folder: Folder): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('folders', 'readwrite');
    const store = tx.objectStore('folders');
    const req = store.put(folder);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteFolderFromDB(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('folders', 'readwrite');
    const store = tx.objectStore('folders');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllExports(): Promise<ExportHistoryItem[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('exports', 'readonly');
      const store = tx.objectStore('exports');
      const req = store.getAll();
      req.onsuccess = () => {
        const items: ExportHistoryItem[] = (req.result || []).sort(
          (a: ExportHistoryItem, b: ExportHistoryItem) => b.exportedAt - a.exportedAt
        );
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error reading exports from DB:', err);
    return [];
  }
}

export async function saveExportItem(item: ExportHistoryItem): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('exports', 'readwrite');
    const store = tx.objectStore('exports');
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getCloudConfig(): Promise<CloudSyncConfig> {
  const defaultConfig: CloudSyncConfig = {
    enabled: true,
    autoSync: false,
    provider: 'google_drive',
    accountEmail: 'user@gmail.com',
    backupFolder: 'DocFlow_Backups',
    totalBackedUpBytes: 0,
  };
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get('cloud_sync_config');
      req.onsuccess = () => resolve(req.result ? req.result.value : defaultConfig);
      req.onerror = () => resolve(defaultConfig);
    });
  } catch {
    return defaultConfig;
  }
}

export async function saveCloudConfig(config: CloudSyncConfig): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const req = store.put({ key: 'cloud_sync_config', value: config });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
