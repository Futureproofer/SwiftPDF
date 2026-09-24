import { DocFile, Folder, UserAccount } from '../types';
import { deleteFileFromDB, saveFolder } from './storage';

export const IMAGE_PURGE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours in milliseconds

const USER_ACCOUNT_STORAGE_KEY = 'ai_pdf_user_account';
const PURGE_HISTORY_STORAGE_KEY = 'ai_pdf_purge_history';

/**
 * Returns true if the file is an image upload (PNG, JPG, WEBP, etc.)
 */
export function isImageFile(file: DocFile): boolean {
  if (file.type && file.type.startsWith('image/')) return true;
  return /\.(png|jpe?g|webp|bmp|tiff|gif|svg)$/i.test(file.name);
}

/**
 * Returns true if an image was uploaded more than 24 hours ago
 */
export function isImageExpired(file: DocFile, ttlMs = IMAGE_PURGE_TTL_MS): boolean {
  if (!isImageFile(file)) return false;
  return Date.now() - file.uploadedAt > ttlMs;
}

/**
 * Computes human-readable remaining time until 24-hour auto-purge for an image
 */
export function formatTimeUntilPurge(uploadedAt: number, ttlMs = IMAGE_PURGE_TTL_MS): string {
  const expiresAt = uploadedAt + ttlMs;
  const remainingMs = expiresAt - Date.now();
  if (remainingMs <= 0) return 'Purge pending';

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }
  return `${minutes}m left`;
}

/**
 * Gets count of images currently eligible for 24-hour purge
 */
export function getExpiredImagesCount(files: DocFile[], ttlMs = IMAGE_PURGE_TTL_MS): number {
  return files.filter((f) => isImageExpired(f, ttlMs)).length;
}

/**
 * Load persisted UserAccount state
 */
export function getStoredUserAccount(): UserAccount {
  if (typeof window === 'undefined') {
    return { isLoggedIn: false, autoPurgeImages: false };
  }
  try {
    const raw = localStorage.getItem(USER_ACCOUNT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        isLoggedIn: Boolean(parsed.isLoggedIn),
        id: parsed.id,
        email: parsed.email,
        name: parsed.name,
        avatar: parsed.avatar,
        loggedInAt: parsed.loggedInAt,
        // When logged in, default is explicitly FALSE (do not automatically purge)
        autoPurgeImages: Boolean(parsed.autoPurgeImages),
      };
    }
  } catch (err) {
    console.error('Failed to read user account', err);
  }
  return { isLoggedIn: false, autoPurgeImages: false };
}

/**
 * Save UserAccount state
 */
export function saveStoredUserAccount(account: UserAccount): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USER_ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  } catch (err) {
    console.error('Failed to persist user account', err);
  }
}

/**
 * Get purge activity metadata
 */
export function getPurgeHistory(): { lastPurgedAt: number | null; totalPurged: number } {
  if (typeof window === 'undefined') return { lastPurgedAt: null, totalPurged: 0 };
  try {
    const raw = localStorage.getItem(PURGE_HISTORY_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { lastPurgedAt: null, totalPurged: 0 };
}

/**
 * Record a successful purge
 */
function recordPurgeHistory(count: number): void {
  if (typeof window === 'undefined' || count <= 0) return;
  try {
    const current = getPurgeHistory();
    const updated = {
      lastPurgedAt: Date.now(),
      totalPurged: (current.totalPurged || 0) + count,
    };
    localStorage.setItem(PURGE_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export interface PurgeResult {
  purgedFileIds: string[];
  updatedFiles: DocFile[];
  updatedFolders: Folder[];
  purgedCount: number;
}

/**
 * Executes 24-hour image purge:
 * - Public version: always purges images older than 24 hours
 * - Logged-in version: DO NOT purge UNLESS autoPurgeImages is toggled ON or forceManual is true
 */
export async function executeImagePurge(
  files: DocFile[],
  folders: Folder[],
  account: UserAccount,
  forceManual: boolean = false
): Promise<PurgeResult> {
  const isPublic = !account.isLoggedIn;
  const shouldPurge = forceManual || isPublic || (account.isLoggedIn && account.autoPurgeImages);

  if (!shouldPurge) {
    return {
      purgedFileIds: [],
      updatedFiles: files,
      updatedFolders: folders,
      purgedCount: 0,
    };
  }

  const expiredImages = files.filter((f) => isImageExpired(f));
  if (expiredImages.length === 0) {
    return {
      purgedFileIds: [],
      updatedFiles: files,
      updatedFolders: folders,
      purgedCount: 0,
    };
  }

  const expiredIds = new Set(expiredImages.map((f) => f.id));

  // 1. Delete expired images from IndexedDB
  for (const doc of expiredImages) {
    try {
      await deleteFileFromDB(doc.id);
    } catch (err) {
      console.warn(`Failed to delete expired image ${doc.id} from DB:`, err);
    }
  }

  // 2. Clean up folder sequence references
  const updatedFolders = folders.map((folder) => {
    const originalCount = folder.items.length;
    const remainingItems = folder.items.filter((item) => !expiredIds.has(item.fileId));
    if (remainingItems.length !== originalCount) {
      const updatedFolder: Folder = {
        ...folder,
        items: remainingItems.map((item, idx) => ({ ...item, order: idx })),
        updatedAt: Date.now(),
      };
      saveFolder(updatedFolder).catch((e) =>
        console.error('Failed to update folder after purge', e)
      );
      return updatedFolder;
    }
    return folder;
  });

  const updatedFiles = files.filter((f) => !expiredIds.has(f.id));

  recordPurgeHistory(expiredImages.length);

  return {
    purgedFileIds: Array.from(expiredIds),
    updatedFiles,
    updatedFolders,
    purgedCount: expiredImages.length,
  };
}
