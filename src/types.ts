export type FileCategory = 'all' | 'pdf' | 'image';

export interface DocFile {
  id: string;
  name: string;
  type: string; // 'application/pdf' | 'image/png' | 'image/jpeg' | etc.
  size: number;
  uploadedAt: number;
  dataUrl?: string; // For images and PDF thumbnails
  blob?: Blob;
  width?: number;
  height?: number;
  pageCount?: number;
  assignedFolderIds: string[];
}

export interface FolderItem {
  fileId: string;
  order: number;
  rotation?: number; // 0, 90, 180, 270
}

export interface Folder {
  id: string;
  name: string;
  category: string; // 'Project' | 'Date' | 'Finance' | 'Legal' | 'General'
  description?: string;
  createdAt: number;
  updatedAt: number;
  color: string;
  items: FolderItem[];
}

export type CompressionPreset = 'max' | 'balanced' | 'compact' | 'extreme' | 'custom';

export interface CompressionSettings {
  preset: CompressionPreset;
  quality: number; // 0.1 to 1.0
  maxDimension: number; // e.g. 2400, 1600, 1200, 800
  colorMode: 'color' | 'grayscale';
  pageSize: 'auto' | 'a4' | 'letter';
  margins: 'none' | 'small' | 'standard';
}

export interface ExportHistoryItem {
  id: string;
  folderId: string;
  folderName: string;
  fileName: string;
  exportedAt: number;
  fileSize: number;
  pageCount: number;
  compressionPreset: CompressionPreset;
  savedToLocalDir: boolean;
  localPath?: string;
  cloudSynced: boolean;
  cloudUrl?: string;
  driveFileId?: string;
  downloadUrl?: string;
  blob?: Blob;
}

export type CloudProvider = 'google_drive' | 'dropbox' | 'onedrive' | 'webdav' | 'local_mirror';

export interface CloudSyncConfig {
  enabled: boolean;
  autoSync: boolean;
  provider: CloudProvider;
  accountEmail: string;
  backupFolder: string;
  lastSyncedAt?: number;
  totalBackedUpBytes: number;
  googleConnected?: boolean;
  googleUserEmail?: string;
  googleUserName?: string;
  googleUserPhoto?: string;
  driveFolderId?: string;
}

export interface UserAccount {
  isLoggedIn: boolean;
  id?: string;
  email?: string;
  name?: string;
  avatar?: string;
  loggedInAt?: number;
  // If true while logged in, the 24h purge also runs for this account; defaults to false!
  autoPurgeImages: boolean;
}

export interface PurgeStatus {
  lastPurgedAt?: number;
  lastPurgedCount: number;
  eligibleCount: number;
}
