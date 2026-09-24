/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TopBar, NavTab } from './components/TopBar';
import { DashboardStats } from './components/DashboardStats';
import { UploadSection } from './components/UploadSection';
import { FolderManager } from './components/FolderManager';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { ExportModal } from './components/ExportModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { LocalDirectoryModal } from './components/LocalDirectoryModal';
import { ToolsGuideModal } from './components/ToolsGuideModal';
import { AccountModal } from './components/AccountModal';
import {
  DocFile,
  Folder,
  ExportHistoryItem,
  CloudSyncConfig,
  FolderItem,
  UserAccount,
} from './types';
import {
  getAllFiles,
  saveFile,
  saveFilesBatch,
  deleteFileFromDB,
  getAllFolders,
  saveFolder,
  deleteFolderFromDB,
  getAllExports,
  saveExportItem,
  getCloudConfig,
  saveCloudConfig,
} from './utils/storage';
import {
  getStoredUserAccount,
  saveStoredUserAccount,
  executeImagePurge,
} from './utils/purgeService';
import { generateInitialSampleData } from './utils/sampleData';
import { getSavedDirectoryName } from './utils/fileSystemAccess';
import {
  initGoogleAuth,
  signInWithGoogleDrive,
  signOutGoogleDrive,
  findOrCreateDriveFolder,
  uploadPdfBlobToGoogleDrive,
  getCachedAccessToken,
  getCachedGoogleUser,
  GoogleDriveUser,
} from './utils/googleDriveService';
import { SwiftIcon } from './components/SwiftIcon';
import { FolderPlus, Upload, ShieldCheck, Sparkles, AlertCircle, Clock } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [files, setFiles] = useState<DocFile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [exports, setExports] = useState<ExportHistoryItem[]>([]);
  const [cloudConfig, setCloudConfig] = useState<CloudSyncConfig>({
    enabled: true,
    autoSync: false,
    provider: 'google_drive',
    accountEmail: 'user@gmail.com',
    backupFolder: 'SwiftPDF_Backups',
    totalBackedUpBytes: 0,
  });
  const [googleUser, setGoogleUser] = useState<GoogleDriveUser | null>(() => getCachedGoogleUser());
  const [localDirName, setLocalDirName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [account, setAccount] = useState<UserAccount>(() => getStoredUserAccount());
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);

  // Dark mode state with system preference & local persistence
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('docflow_dark_mode');
      if (saved !== null) return saved === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('docflow_dark_mode', darkMode.toString());
  }, [darkMode]);

  const handleToggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  // Active folder selection
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');

  // Modals state
  const [previewFile, setPreviewFile] = useState<DocFile | null>(null);
  const [previewFolderSequence, setPreviewFolderSequence] = useState<Folder | null>(null);
  const [exportingFolder, setExportingFolder] = useState<Folder | null>(null);
  const [showLocalDirModal, setShowLocalDirModal] = useState<boolean>(false);
  const [showCloudSyncModal, setShowCloudSyncModal] = useState<boolean>(false);
  const [showToolsGuideModal, setShowToolsGuideModal] = useState<boolean>(false);

  // Batch upload state
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    filename: string;
  }>({ current: 0, total: 0, filename: '' });

  const filesMap = useMemo(() => {
    const map = new Map<string, DocFile>();
    files.forEach((f) => map.set(f.id, f));
    return map;
  }, [files]);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const storedFiles = await getAllFiles();
        const storedFolders = await getAllFolders();
        const storedExports = await getAllExports();
        const storedConfig = await getCloudConfig();
        const savedDir = getSavedDirectoryName();

        if (storedFiles.length === 0 && storedFolders.length === 0) {
          // Initialize with realistic starter sample documents
          const sample = await generateInitialSampleData();
          await saveFilesBatch(sample.files);
          for (const f of sample.folders) {
            await saveFolder(f);
          }
          setFiles(sample.files);
          setFolders(sample.folders);
          setSelectedFolderId(sample.folders[0]?.id || '');
        } else {
          setFiles(storedFiles);
          setFolders(storedFolders);
          if (storedFolders.length > 0) {
            setSelectedFolderId(storedFolders[0].id);
          }
        }

        setExports(storedExports);
        setCloudConfig(storedConfig);
        setLocalDirName(savedDir);
      } catch (err) {
        console.error('Failed to initialize local data', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Listen for Google Auth state changes
  useEffect(() => {
    const unsubscribe = initGoogleAuth((user) => {
      setGoogleUser(user);
      if (user) {
        setCloudConfig((prev) => ({
          ...prev,
          googleConnected: true,
          googleUserEmail: user.email || undefined,
          googleUserName: user.displayName || undefined,
          googleUserPhoto: user.photoURL || undefined,
        }));
      } else {
        setCloudConfig((prev) => ({
          ...prev,
          googleConnected: false,
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  // Automatic 24-hour purge runner:
  // - Public version: purges uploaded images older than 24 hours automatically
  // - Logged-in version: DO NOT automatically purge UNLESS the user enabled the autoPurgeImages toggle
  useEffect(() => {
    if (isLoading || files.length === 0) return;

    let isMounted = true;
    const runPurge = async () => {
      try {
        const res = await executeImagePurge(files, folders, account, false);
        if (isMounted && res.purgedCount > 0) {
          setFiles(res.updatedFiles);
          setFolders(res.updatedFolders);
        }
      } catch (e) {
        console.error('Auto purge check failed:', e);
      }
    };

    runPurge();
    const purgeInterval = setInterval(runPurge, 5 * 60 * 1000); // Check every 5 minutes
    return () => {
      isMounted = false;
      clearInterval(purgeInterval);
    };
  }, [isLoading, files, folders, account.isLoggedIn, account.autoPurgeImages]);

  // Account login handler
  const handleLogin = (name: string, email: string) => {
    const updated: UserAccount = {
      isLoggedIn: true,
      id: `usr_${Date.now()}`,
      name,
      email,
      loggedInAt: Date.now(),
      autoPurgeImages: false, // Default for logged-in accounts: DO NOT purge automatically!
    };
    setAccount(updated);
    saveStoredUserAccount(updated);
  };

  // Account logout handler (reverts to public mode)
  const handleLogout = () => {
    const updated: UserAccount = {
      isLoggedIn: false,
      autoPurgeImages: false,
    };
    setAccount(updated);
    saveStoredUserAccount(updated);
  };

  // User-controlled 24-hour purge toggle for logged-in accounts
  const handleToggleAutoPurge = (enabled: boolean) => {
    const updated: UserAccount = {
      ...account,
      autoPurgeImages: enabled,
    };
    setAccount(updated);
    saveStoredUserAccount(updated);

    if (enabled) {
      executeImagePurge(files, folders, updated, false).then((res) => {
        if (res.purgedCount > 0) {
          setFiles(res.updatedFiles);
          setFolders(res.updatedFolders);
        }
      });
    }
  };

  // Immediate manual purge of expired images
  const handleManualPurgeNow = async () => {
    const res = await executeImagePurge(files, folders, account, true);
    if (res.purgedCount > 0) {
      setFiles(res.updatedFiles);
      setFolders(res.updatedFolders);
    }
  };

  // Handle uploading documents (bulk support + direct folder assignment)
  const handleUploadFiles = async (fileList: FileList | File[], targetFolderId?: string) => {
    const rawFiles = Array.from(fileList);
    if (rawFiles.length === 0) return;

    setIsProcessingBatch(true);
    const newDocFiles: DocFile[] = [];

    for (let i = 0; i < rawFiles.length; i++) {
      const f = rawFiles[i];
      setBatchProgress({
        current: i + 1,
        total: rawFiles.length,
        filename: f.name,
      });

      try {
        const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
        let dataUrl: string | undefined = undefined;

        if (isPdf) {
          // Create object URL for PDF preview
          dataUrl = URL.createObjectURL(f);
        } else {
          // Image file - read as data URL for canvas thumbnail
          dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(f);
          });
        }

        const doc: DocFile = {
          id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: f.name,
          type: f.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
          size: f.size,
          uploadedAt: Date.now(),
          dataUrl,
          blob: f,
          assignedFolderIds: targetFolderId ? [targetFolderId] : [],
        };

        newDocFiles.push(doc);
      } catch (err) {
        console.error(`Error reading ${f.name}:`, err);
      }
    }

    // Save batch to IndexedDB
    await saveFilesBatch(newDocFiles);
    setFiles((prev) => [...newDocFiles, ...prev]);

    // If targetFolderId provided, also assign directly to that folder
    if (targetFolderId) {
      setFolders((prevFolders) => {
        const targetFolder = prevFolders.find((f) => f.id === targetFolderId);
        if (!targetFolder) return prevFolders;
        const startIndex = targetFolder.items.length;
        const newItems: FolderItem[] = [
          ...targetFolder.items,
          ...newDocFiles.map((doc, idx) => ({
            fileId: doc.id,
            order: startIndex + idx,
            rotation: 0,
          })),
        ];
        const updatedFolder: Folder = {
          ...targetFolder,
          items: newItems,
          updatedAt: Date.now(),
        };
        saveFolder(updatedFolder);
        return prevFolders.map((f) => (f.id === targetFolderId ? updatedFolder : f));
      });
    }

    setIsProcessingBatch(false);
  };

  // Delete single file
  const handleDeleteFile = async (fileId: string) => {
    await deleteFileFromDB(fileId);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));

    // Remove from folders
    const updatedFolders = folders.map((folder) => {
      const filtered = folder.items
        .filter((i) => i.fileId !== fileId)
        .map((item, idx) => ({ ...item, order: idx }));
      if (filtered.length !== folder.items.length) {
        saveFolder({ ...folder, items: filtered });
      }
      return { ...folder, items: filtered };
    });
    setFolders(updatedFolders);
  };

  // Delete batch of files
  const handleDeleteBatch = async (fileIds: string[]) => {
    const idSet = new Set(fileIds);
    for (const id of fileIds) {
      await deleteFileFromDB(id);
    }
    setFiles((prev) => prev.filter((f) => !idSet.has(f.id)));

    // Clean up folder references
    const updatedFolders = folders.map((folder) => {
      const filtered = folder.items
        .filter((i) => !idSet.has(i.fileId))
        .map((item, idx) => ({ ...item, order: idx }));
      if (filtered.length !== folder.items.length) {
        saveFolder({ ...folder, items: filtered });
      }
      return { ...folder, items: filtered };
    });
    setFolders(updatedFolders);
  };

  // Assign multiple files to folder
  const handleAssignToFolder = async (fileIds: string[], folderId: string) => {
    const targetFolder = folders.find((f) => f.id === folderId);
    if (!targetFolder) return;

    const existingFileIds = new Set(targetFolder.items.map((i) => i.fileId));
    const newItems: FolderItem[] = [...targetFolder.items];

    fileIds.forEach((id) => {
      if (!existingFileIds.has(id)) {
        newItems.push({
          fileId: id,
          order: newItems.length,
          rotation: 0,
        });
      }
    });

    const updatedFolder: Folder = {
      ...targetFolder,
      items: newItems,
      updatedAt: Date.now(),
    };

    await saveFolder(updatedFolder);
    setFolders((prev) => prev.map((f) => (f.id === folderId ? updatedFolder : f)));

    // Update files' assignedFolderIds
    const updatedFiles = files.map((file) => {
      if (fileIds.includes(file.id) && !file.assignedFolderIds.includes(folderId)) {
        const next = { ...file, assignedFolderIds: [...file.assignedFolderIds, folderId] };
        saveFile(next);
        return next;
      }
      return file;
    });
    setFiles(updatedFiles);
  };

  // Create new folder
  const handleCreateFolder = async (
    name: string,
    category: string,
    description: string,
    color: string
  ) => {
    const newFolder: Folder = {
      id: `folder_${Date.now()}`,
      name,
      category,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color,
      items: [],
    };
    await saveFolder(newFolder);
    setFolders((prev) => [newFolder, ...prev]);
    setSelectedFolderId(newFolder.id);
  };

  // Update items inside folder (reordering/rotation/removal)
  const handleUpdateFolderItems = async (folderId: string, items: FolderItem[]) => {
    const target = folders.find((f) => f.id === folderId);
    if (!target) return;

    const updated: Folder = {
      ...target,
      items,
      updatedAt: Date.now(),
    };

    await saveFolder(updated);
    setFolders((prev) => prev.map((f) => (f.id === folderId ? updated : f)));
  };

  // Delete folder
  const handleDeleteFolder = async (folderId: string) => {
    await deleteFolderFromDB(folderId);
    const remaining = folders.filter((f) => f.id !== folderId);
    setFolders(remaining);
    if (selectedFolderId === folderId) {
      setSelectedFolderId(remaining[0]?.id || '');
    }

    // Unassign folder id from files
    const updatedFiles = files.map((f) => {
      if (f.assignedFolderIds.includes(folderId)) {
        const next = { ...f, assignedFolderIds: f.assignedFolderIds.filter((id) => id !== folderId) };
        saveFile(next);
        return next;
      }
      return f;
    });
    setFiles(updatedFiles);
  };

  // Google Auth Handlers
  const handleGoogleSignIn = async () => {
    const { user } = await signInWithGoogleDrive();
    setGoogleUser(user);
    const updatedConfig: CloudSyncConfig = {
      ...cloudConfig,
      googleConnected: true,
      accountEmail: user.email || cloudConfig.accountEmail,
      googleUserEmail: user.email || undefined,
      googleUserName: user.displayName || undefined,
      googleUserPhoto: user.photoURL || undefined,
    };
    setCloudConfig(updatedConfig);
    await saveCloudConfig(updatedConfig);

    // Sync app member session as well
    const acc: UserAccount = {
      isLoggedIn: true,
      id: user.uid,
      email: user.email || undefined,
      name: user.displayName || undefined,
      avatar: user.photoURL || undefined,
      loggedInAt: Date.now(),
      autoPurgeImages: false,
    };
    setAccount(acc);
    saveStoredUserAccount(acc);
  };

  const handleGoogleSignOut = async () => {
    await signOutGoogleDrive();
    setGoogleUser(null);
    const updatedConfig: CloudSyncConfig = {
      ...cloudConfig,
      googleConnected: false,
      googleUserEmail: undefined,
      googleUserName: undefined,
      googleUserPhoto: undefined,
    };
    setCloudConfig(updatedConfig);
    await saveCloudConfig(updatedConfig);
  };

  // Synchronize a single export item to Google Drive
  const handleSyncSingleItem = async (item: ExportHistoryItem) => {
    let token = getCachedAccessToken();
    if (!token) {
      const res = await signInWithGoogleDrive();
      token = res.accessToken;
      setGoogleUser(res.user);
    }

    const folderName = cloudConfig.backupFolder || 'SwiftPDF_Backups';
    const folderId = await findOrCreateDriveFolder(token, folderName);

    let blob = item.blob;
    if (!blob && item.downloadUrl) {
      const response = await fetch(item.downloadUrl);
      blob = await response.blob();
    }

    if (!blob) {
      throw new Error(`PDF data for "${item.fileName}" could not be retrieved.`);
    }

    const driveResult = await uploadPdfBlobToGoogleDrive(token, blob, item.fileName, folderId);

    const updatedItem: ExportHistoryItem = {
      ...item,
      cloudSynced: true,
      cloudUrl: driveResult.webViewLink,
      driveFileId: driveResult.id,
    };

    await saveExportItem(updatedItem);
    setExports((prev) => prev.map((e) => (e.id === item.id ? updatedItem : e)));

    const updatedConfig: CloudSyncConfig = {
      ...cloudConfig,
      lastSyncedAt: Date.now(),
      driveFolderId: folderId,
      googleConnected: true,
      accountEmail: googleUser?.email || cloudConfig.accountEmail,
    };
    await saveCloudConfig(updatedConfig);
    setCloudConfig(updatedConfig);
  };

  // Google Drive bulk sync trigger
  const handleSyncAll = async () => {
    let token = getCachedAccessToken();
    if (!token) {
      const res = await signInWithGoogleDrive();
      token = res.accessToken;
      setGoogleUser(res.user);
    }

    const folderName = cloudConfig.backupFolder || 'SwiftPDF_Backups';
    const folderId = await findOrCreateDriveFolder(token, folderName);

    const updatedExports = [...exports];
    for (let i = 0; i < updatedExports.length; i++) {
      const item = updatedExports[i];
      if (!item.cloudSynced || !item.cloudUrl?.includes('drive.google.com')) {
        let blob = item.blob;
        if (!blob && item.downloadUrl) {
          try {
            const resp = await fetch(item.downloadUrl);
            blob = await resp.blob();
          } catch {}
        }
        if (blob) {
          try {
            const driveResult = await uploadPdfBlobToGoogleDrive(
              token,
              blob,
              item.fileName,
              folderId
            );
            const syncedItem: ExportHistoryItem = {
              ...item,
              cloudSynced: true,
              cloudUrl: driveResult.webViewLink,
              driveFileId: driveResult.id,
            };
            updatedExports[i] = syncedItem;
            await saveExportItem(syncedItem);
          } catch (uploadErr) {
            console.error(`Failed to upload ${item.fileName} to Google Drive:`, uploadErr);
          }
        }
      }
    }

    setExports(updatedExports);

    const totalBytes = updatedExports.reduce((acc, e) => acc + (e.fileSize || 0), 0);
    const updatedConfig: CloudSyncConfig = {
      ...cloudConfig,
      lastSyncedAt: Date.now(),
      totalBackedUpBytes: totalBytes,
      driveFolderId: folderId,
      googleConnected: true,
      accountEmail: googleUser?.email || cloudConfig.accountEmail,
    };
    await saveCloudConfig(updatedConfig);
    setCloudConfig(updatedConfig);
  };

  // Export success handler with optional automatic background Google Drive sync
  const handleExportSuccess = async (item: ExportHistoryItem) => {
    await saveExportItem(item);
    let finalItem = item;

    const token = getCachedAccessToken();
    if (cloudConfig.autoSync && token && item.blob) {
      try {
        const folderName = cloudConfig.backupFolder || 'SwiftPDF_Backups';
        const folderId = await findOrCreateDriveFolder(token, folderName);
        const driveResult = await uploadPdfBlobToGoogleDrive(
          token,
          item.blob,
          item.fileName,
          folderId
        );
        finalItem = {
          ...item,
          cloudSynced: true,
          cloudUrl: driveResult.webViewLink,
          driveFileId: driveResult.id,
        };
        await saveExportItem(finalItem);
      } catch (autoSyncErr) {
        console.warn('Auto-sync to Google Drive failed:', autoSyncErr);
      }
    }

    setExports((prev) => [finalItem, ...prev]);
  };

  // Download export helper
  const handleDownloadExport = (item: ExportHistoryItem) => {
    if (item.downloadUrl) {
      const a = document.createElement('a');
      a.href = item.downloadUrl;
      a.download = item.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (item.blob) {
      const url = URL.createObjectURL(item.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* 1. Universal Top Navigation Bar */}
      <TopBar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'sync') {
            setShowCloudSyncModal(true);
          } else if (tab === 'tools') {
            setShowToolsGuideModal(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenUpload={() => {
          setActiveTab('uploads');
        }}
        onOpenNewFolder={() => {
          setActiveTab('folders');
        }}
        syncCount={exports.filter((e) => e.cloudSynced).length}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        account={account}
        onOpenAccount={() => setShowAccountModal(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {isLoading ? (
          <div className="py-20 text-center text-slate-500 dark:text-slate-400">
            <div className="w-8 h-8 mx-auto border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-medium">Loading document catalog & local storage...</p>
          </div>
        ) : (
          <>
            {/* View: Dashboard */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                {/* Storage & Activity Dashboard with Folder Workspace */}
                <DashboardStats
                  files={files}
                  folders={folders}
                  exports={exports}
                  cloudConfig={cloudConfig}
                  localDirName={localDirName}
                  selectedFolderId={selectedFolderId}
                  filesMap={filesMap}
                  onSelectFolder={(folderId) => setSelectedFolderId(folderId)}
                  onCreateFolder={handleCreateFolder}
                  onUpdateFolderItems={handleUpdateFolderItems}
                  onAddFilesToFolder={handleAssignToFolder}
                  onUploadToFolder={(folderId, fileList) => handleUploadFiles(fileList, folderId)}
                  onOpenExportModal={(folder) => setExportingFolder(folder)}
                  onPreviewFile={(f) => {
                    setPreviewFile(f);
                    setPreviewFolderSequence(null);
                  }}
                  onOpenUpload={() => {
                    const el = document.getElementById('uploaded-gallery-container');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  onOpenNewFolder={() => setActiveTab('folders')}
                  onOpenLocalDirModal={() => setShowLocalDirModal(true)}
                  onOpenCloudSync={() => setShowCloudSyncModal(true)}
                  onDownloadExport={handleDownloadExport}
                  onExportSuccess={handleExportSuccess}
                  onSyncSingleItem={handleSyncSingleItem}
                />

                {/* Upload Gallery below Dashboard */}
                <div id="uploaded-gallery-container">
                  <UploadSection
                    files={files}
                    folders={folders}
                    onUploadFiles={handleUploadFiles}
                    onDeleteFile={handleDeleteFile}
                    onDeleteBatch={handleDeleteBatch}
                    onAssignToFolder={handleAssignToFolder}
                    onPreviewFile={(f) => {
                      setPreviewFile(f);
                      setPreviewFolderSequence(null);
                    }}
                    isProcessingBatch={isProcessingBatch}
                    batchProgress={batchProgress}
                    account={account}
                    onOpenAccount={() => setShowAccountModal(true)}
                  />
                </div>
              </div>
            )}

            {/* View: Folders & Export Sequencer */}
            {activeTab === 'folders' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Folder Management & Compilation
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Organize documents into project or date folders, reorder page sequence with drag & drop, and export as 1 unified PDF.
                  </p>
                </div>

                <FolderManager
                  folders={folders}
                  files={files}
                  filesMap={filesMap}
                  selectedFolderId={selectedFolderId}
                  onSelectFolder={(id) => setSelectedFolderId(id)}
                  onCreateFolder={handleCreateFolder}
                  onUpdateFolderItems={handleUpdateFolderItems}
                  onDeleteFolder={handleDeleteFolder}
                  onPreviewFile={(f) => {
                    setPreviewFile(f);
                    setPreviewFolderSequence(null);
                  }}
                  onPreviewSequence={(folder) => {
                    const firstItem = [...folder.items].sort((a, b) => a.order - b.order)[0];
                    if (firstItem) {
                      const f = filesMap.get(firstItem.fileId);
                      if (f) {
                        setPreviewFile(f);
                        setPreviewFolderSequence(folder);
                      }
                    }
                  }}
                  onOpenExportModal={(folder) => setExportingFolder(folder)}
                />
              </div>
            )}

            {/* View: Uploads Gallery Standalone */}
            {activeTab === 'uploads' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Document Uploads & Library
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Upload images, scans, and PDFs. Multi-select items to add directly to project folders.
                  </p>
                </div>

                <UploadSection
                  files={files}
                  folders={folders}
                  onUploadFiles={handleUploadFiles}
                  onDeleteFile={handleDeleteFile}
                  onDeleteBatch={handleDeleteBatch}
                  onAssignToFolder={handleAssignToFolder}
                  onPreviewFile={(f) => {
                    setPreviewFile(f);
                    setPreviewFolderSequence(null);
                  }}
                  isProcessingBatch={isProcessingBatch}
                  batchProgress={batchProgress}
                  account={account}
                  onOpenAccount={() => setShowAccountModal(true)}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Global Modals */}

      {/* Document Full Preview Modal */}
      {previewFile && (
        <DocumentPreviewModal
          file={previewFile}
          folderSequence={previewFolderSequence}
          filesMap={filesMap}
          onClose={() => {
            setPreviewFile(null);
            setPreviewFolderSequence(null);
          }}
          onSelectFile={(f) => setPreviewFile(f)}
        />
      )}

      {/* Export Merged PDF Modal */}
      {exportingFolder && (
        <ExportModal
          folder={exportingFolder}
          filesMap={filesMap}
          cloudConfig={cloudConfig}
          onClose={() => setExportingFolder(null)}
          onExportSuccess={handleExportSuccess}
          onOpenLocalDirModal={() => {
            setExportingFolder(null);
            setShowLocalDirModal(true);
          }}
        />
      )}

      {/* Cloud Sync Configuration Modal */}
      {showCloudSyncModal && (
        <CloudSyncModal
          config={cloudConfig}
          exports={exports}
          googleUser={googleUser}
          onGoogleSignIn={handleGoogleSignIn}
          onGoogleSignOut={handleGoogleSignOut}
          onSaveConfig={async (newConfig) => {
            await saveCloudConfig(newConfig);
            setCloudConfig(newConfig);
          }}
          onSyncAll={handleSyncAll}
          onSyncSingleItem={handleSyncSingleItem}
          onClose={() => setShowCloudSyncModal(false)}
        />
      )}

      {/* Custom Local Directory Modal */}
      {showLocalDirModal && (
        <LocalDirectoryModal
          currentDirName={localDirName}
          onUpdateDirName={(name) => setLocalDirName(name)}
          onClose={() => setShowLocalDirModal(false)}
        />
      )}

      {/* Cross-Platform Tools & Architecture Guide Modal */}
      <ToolsGuideModal
        isOpen={showToolsGuideModal}
        onClose={() => setShowToolsGuideModal(false)}
      />

      {/* Account & 24-Hour Purge Privacy Settings Modal */}
      <AccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        account={account}
        files={files}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onToggleAutoPurge={handleToggleAutoPurge}
        onManualPurgeNow={handleManualPurgeNow}
      />

      {/* Dark Theme Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-5 mt-auto text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="font-bold text-white tracking-tight flex items-center gap-1.5">
              <SwiftIcon className="w-4 h-4 text-cyan-400" />
              SwiftPDF
            </span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="text-slate-400">High-Speed Client-Side PDF Studio</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="font-mono tabular-nums text-slate-300">{files.length} documents cached</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            {account.isLoggedIn ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Member Session ({account.autoPurgeImages ? '24h Purge ON' : 'Retain Indefinitely'})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                <Clock className="w-3 h-3 text-amber-400" />
                Public Session (24h Auto-Purge Active)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
            <button
              onClick={() => setShowAccountModal(true)}
              className="text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              {account.isLoggedIn ? 'Account & Purge Toggle' : 'Member Sign In'}
            </button>
            <button
              onClick={() => setShowToolsGuideModal(true)}
              className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Recommended Tools Guide
            </button>
            <button
              onClick={() => setShowLocalDirModal(true)}
              className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Custom Local Directory
            </button>
            <button
              onClick={() => setShowCloudSyncModal(true)}
              className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Cloud Backup Status
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
