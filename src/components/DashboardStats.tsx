import React, { useState, useRef } from 'react';
import {
  FileText,
  Folder as FolderIcon,
  HardDrive,
  Cloud,
  ArrowUpRight,
  RefreshCw,
  FolderPlus,
  Upload,
  CheckCircle2,
  Clock,
  Download,
  Activity,
  Layers,
  ChevronDown,
  GripVertical,
  ChevronUp,
  RotateCw,
  Eye,
  Trash2,
  Plus,
  Sparkles,
  Check,
  X,
  Image as ImageIcon,
  ArrowDown,
} from 'lucide-react';
import { DocFile, Folder, FolderItem, ExportHistoryItem, CloudSyncConfig } from '../types';
import { formatBytes, formatTimeAgo } from '../utils/formatters';
import { PDFCompressorWidget } from './PDFCompressorWidget';

interface DashboardStatsProps {
  files: DocFile[];
  folders: Folder[];
  exports: ExportHistoryItem[];
  cloudConfig: CloudSyncConfig;
  localDirName: string;
  selectedFolderId: string;
  filesMap: Map<string, DocFile>;
  onSelectFolder: (folderId: string) => void;
  onCreateFolder: (name: string, category: string, description: string, color: string) => void;
  onUpdateFolderItems: (folderId: string, items: FolderItem[]) => void;
  onAddFilesToFolder: (fileIds: string[], folderId: string) => void;
  onUploadToFolder: (folderId: string, fileList: FileList | File[]) => Promise<void>;
  onOpenExportModal: (folder: Folder) => void;
  onPreviewFile: (file: DocFile) => void;
  onOpenUpload: () => void;
  onOpenNewFolder: () => void;
  onOpenLocalDirModal: () => void;
  onOpenCloudSync: () => void;
  onDownloadExport: (item: ExportHistoryItem) => void;
  onExportSuccess?: (item: ExportHistoryItem) => Promise<void> | void;
  onSyncSingleItem?: (item: ExportHistoryItem) => Promise<void>;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  files,
  folders,
  exports,
  cloudConfig,
  localDirName,
  selectedFolderId,
  filesMap,
  onSelectFolder,
  onCreateFolder,
  onUpdateFolderItems,
  onAddFilesToFolder,
  onUploadToFolder,
  onOpenExportModal,
  onPreviewFile,
  onOpenUpload,
  onOpenNewFolder,
  onOpenLocalDirModal,
  onOpenCloudSync,
  onDownloadExport,
  onExportSuccess,
  onSyncSingleItem,
}) => {
  // Compute storage statistics
  const totalFileBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const pdfCount = files.filter((f) => f.type === 'application/pdf').length;
  const imageCount = files.length - pdfCount;

  // Folder statistics
  const totalOrganizedItems = folders.reduce((acc, f) => acc + f.items.length, 0);

  // Export statistics
  const totalExportedBytes = exports.reduce((acc, e) => acc + (e.fileSize || 0), 0);
  const cloudSyncedExports = exports.filter((e) => e.cloudSynced).length;

  // Active folder for main screen workspace
  const activeFolder = folders.find((f) => f.id === selectedFolderId) || folders[0];
  const activeFolderItems = activeFolder ? [...activeFolder.items].sort((a, b) => a.order - b.order) : [];
  const activeFolderFiles = activeFolderItems
    .map((item) => filesMap.get(item.fileId))
    .filter(Boolean) as DocFile[];
  const activeFolderBytes = activeFolderFiles.reduce((sum, f) => sum + (f.size || 0), 0);

  // Workspace UI states
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [isDragOverFolder, setIsDragOverFolder] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Quick inline folder creation state
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderCat, setNewFolderCat] = useState<'Project' | 'Date' | 'Finance' | 'Legal' | 'General'>('Project');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#4f46e5');

  const folderFileInputRef = useRef<HTMLInputElement>(null);

  // Handle reordering within the active folder
  const handleMoveItem = (fromIdx: number, toIdx: number) => {
    if (!activeFolder || toIdx < 0 || toIdx >= activeFolderItems.length) return;
    const reordered = [...activeFolderItems];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const updated = reordered.map((item, idx) => ({ ...item, order: idx }));
    onUpdateFolderItems(activeFolder.id, updated);
  };

  const handleRotateItem = (idx: number) => {
    if (!activeFolder) return;
    const reordered = [...activeFolderItems];
    const currentRot = reordered[idx].rotation || 0;
    reordered[idx] = {
      ...reordered[idx],
      rotation: (currentRot + 90) % 360,
    };
    onUpdateFolderItems(activeFolder.id, reordered);
  };

  const handleRemoveItem = (fileId: string) => {
    if (!activeFolder) return;
    const filtered = activeFolderItems
      .filter((i) => i.fileId !== fileId)
      .map((item, idx) => ({ ...item, order: idx }));
    onUpdateFolderItems(activeFolder.id, filtered);
  };

  const handleDragStartItem = (idx: number, e: React.DragEvent) => {
    setDraggedIdx(idx);
    e.dataTransfer.setData('application/docflow-reorder-idx', idx.toString());
    e.dataTransfer.setData('text/plain', idx.toString());
    e.dataTransfer.effectAllowed = 'move';
    setIsDragOverFolder(false);
  };

  const handleDragOverItem = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIdx === null) {
      if (dragOverIdx !== idx) setDragOverIdx(idx);
      return;
    }
    if (dragOverIdx !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDropOnItem = (toIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const reorderIdxStr =
      e.dataTransfer.getData('application/docflow-reorder-idx') || e.dataTransfer.getData('text/plain');
    const sourceIdx =
      draggedIdx !== null ? draggedIdx : reorderIdxStr ? parseInt(reorderIdxStr, 10) : null;

    if (sourceIdx !== null && !isNaN(sourceIdx)) {
      if (sourceIdx !== toIdx) {
        handleMoveItem(sourceIdx, toIdx);
      }
    } else {
      // Document dragged from gallery or external files onto this specific row
      let fileIds: string[] = [];
      const multiJson = e.dataTransfer.getData('application/docflow-file-ids');
      if (multiJson) {
        try {
          fileIds = JSON.parse(multiJson);
        } catch {}
      }
      if (fileIds.length === 0) {
        const singleId = e.dataTransfer.getData('application/docflow-file-id');
        if (singleId && !singleId.startsWith('{')) fileIds = [singleId];
      }
      if (fileIds.length > 0 && activeFolder) {
        onAddFilesToFolder(fileIds, activeFolder.id);
      }
    }

    setDraggedIdx(null);
    setDragOverIdx(null);
    setIsDragOverFolder(false);
  };

  const handleDragEndItem = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
    setIsDragOverFolder(false);
  };

  // Drag & drop into active folder from Gallery or Desktop
  const handleWorkspaceDragOver = (e: React.DragEvent) => {
    // If actively reordering within the folder, NEVER display the workspace overlay
    if (draggedIdx !== null || e.dataTransfer.types.includes('application/docflow-reorder-idx')) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOverFolder) {
      setIsDragOverFolder(true);
    }
  };

  const handleWorkspaceDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOverFolder(false);
    }
  };

  const handleWorkspaceDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverFolder(false);
    if (!activeFolder) return;

    // Check if reordering within this folder
    const reorderIdxStr =
      e.dataTransfer.getData('application/docflow-reorder-idx') || e.dataTransfer.getData('text/plain');
    if (draggedIdx !== null || (reorderIdxStr && !isNaN(parseInt(reorderIdxStr, 10)))) {
      const fromIdx = draggedIdx !== null ? draggedIdx : parseInt(reorderIdxStr, 10);
      if (dragOverIdx !== null && fromIdx !== dragOverIdx) {
        handleMoveItem(fromIdx, dragOverIdx);
      }
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    // 1. Dropped real files from desktop
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await onUploadToFolder(activeFolder.id, e.dataTransfer.files);
      return;
    }

    // 2. Dropped documents from gallery below
    let fileIds: string[] = [];
    const multiJson = e.dataTransfer.getData('application/docflow-file-ids');
    if (multiJson) {
      try {
        fileIds = JSON.parse(multiJson);
      } catch {}
    }
    if (fileIds.length === 0) {
      const singleId =
        e.dataTransfer.getData('application/docflow-file-id');
      if (singleId && !singleId.startsWith('{')) fileIds = [singleId];
    }

    if (fileIds.length > 0) {
      onAddFilesToFolder(fileIds, activeFolder.id);
    }
  };

  // Upload file directly to active folder
  const handleFolderFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && activeFolder) {
      await onUploadToFolder(activeFolder.id, e.target.files);
      e.target.value = '';
    }
  };

  // Handle inline quick folder creation
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim(), newFolderCat, newFolderDesc.trim(), newFolderColor);
    setNewFolderName('');
    setNewFolderDesc('');
    setShowCreateFolderModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards Grid - Distinct Widget Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Uploads & Library */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Document Library
            </span>
            <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {files.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              ({formatBytes(totalFileBytes)})
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{pdfCount}</span> PDFs
            <span aria-hidden="true">·</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{imageCount}</span> Images
          </div>
        </div>

        {/* Metric 2: Folders & Projects */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Active Folders
            </span>
            <div className="w-7 h-7 rounded-md bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FolderIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {folders.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">folders</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="font-mono tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
              {totalOrganizedItems}
            </span>{' '}
            documents sequenced
          </div>
        </div>

        {/* Metric 3: Merged PDF Exports */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Compiled PDF Exports
            </span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {exports.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              ({formatBytes(totalExportedBytes)})
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Fast local compile</span>
          </div>
        </div>

        {/* Metric 4: Cloud & Local Storage Status */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Cloud Sync & Storage
            </span>
            <div className="w-7 h-7 rounded-md bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Cloud className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {cloudConfig.provider === 'google_drive'
                ? 'Google Drive'
                : cloudConfig.provider === 'dropbox'
                ? 'Dropbox'
                : cloudConfig.provider === 'onedrive'
                ? 'OneDrive'
                : 'WebDAV Cloud'}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
            <span className="font-mono tabular-nums font-semibold text-sky-600 dark:text-sky-400">
              {cloudSyncedExports}
            </span>
            /
            <span className="font-mono tabular-nums">{exports.length}</span> backed up
            <span aria-hidden="true">·</span>
            <button
              type="button"
              className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline cursor-pointer"
              onClick={onOpenCloudSync}
            >
              Manage
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Ribbon & Target Local Directory Bar */}
      <div className="bg-slate-100 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 min-w-0">
          <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
            <HardDrive className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
          </div>
          <span className="font-semibold shrink-0">Local Directory:</span>
          <span className="font-mono font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 truncate max-w-[180px] sm:max-w-xs shadow-2xs">
            {localDirName || 'Downloads (Default Browser Folder)'}
          </span>
          <button
            onClick={onOpenLocalDirModal}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold underline underline-offset-2 shrink-0 ml-1"
          >
            Change
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setShowCreateFolderModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium shadow-2xs"
          >
            <FolderPlus className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Create Folder</span>
          </button>
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Add Documents</span>
          </button>
          <button
            onClick={onOpenCloudSync}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors font-medium shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Sync Cloud</span>
          </button>
        </div>
      </div>

      {/* Main Screen Active Workspace: Folder Builder (Left 2 Cols) & Recent PDF Exports (Right 1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT 2 COLUMNS: ACTIVE FOLDER WORKSPACE & REORDER SEQUENCER */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col transition-all">
          {/* Header Ribbon with Folder Picker, Quick Upload & Export Action */}
          <div className="bg-slate-50 dark:bg-slate-800/80 px-4 sm:px-5 py-3.5 border-b-2 border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-2xs border"
                style={{
                  backgroundColor: activeFolder ? `${activeFolder.color || '#4f46e5'}20` : '#4f46e520',
                  color: activeFolder ? activeFolder.color || '#4f46e5' : '#4f46e5',
                  borderColor: activeFolder ? `${activeFolder.color || '#4f46e5'}40` : '#4f46e540',
                }}
              >
                <FolderIcon className="w-4 h-4" />
              </div>

              {/* Interactive Folder Picker Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-500 dark:hover:border-indigo-400 text-slate-900 dark:text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: activeFolder?.color || '#4f46e5' }}
                  />
                  <span className="truncate max-w-[130px] sm:max-w-[200px] text-slate-900 dark:text-white">
                    {activeFolder ? activeFolder.name : 'Select Folder'}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
                    {activeFolder?.category || 'General'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {/* Dropdown Menu */}
                {showFolderDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setShowFolderDropdown(false)}
                    />
                    <div className="absolute top-full left-0 mt-1.5 z-30 w-72 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                      <div className="p-2.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        Select Working Folder
                      </div>
                      <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
                        {folders.map((folder) => {
                          const isSelected = folder.id === activeFolder?.id;
                          return (
                            <button
                              key={folder.id}
                              onClick={() => {
                                onSelectFolder(folder.id);
                                setShowFolderDropdown(false);
                              }}
                              className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: folder.color || '#4f46e5' }}
                                />
                                <span className={`truncate font-medium ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                  {folder.name}
                                </span>
                              </div>
                              <div className={`flex items-center gap-1 text-[10px] font-mono ${isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                <span>{folder.items.length} files</span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-white ml-1" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="p-1.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => {
                            setShowFolderDropdown(false);
                            setShowCreateFolderModal(true);
                          }}
                          className="w-full py-1.5 px-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg text-left font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create New Folder...</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Item Count & Total Size Badge */}
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold rounded-md bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white tabular-nums shadow-2xs">
                {activeFolderItems.length} {activeFolderItems.length === 1 ? 'doc' : 'docs'}
                {activeFolderBytes > 0 && ` (${formatBytes(activeFolderBytes)})`}
              </span>
            </div>

            {/* Folder Actions: Direct Upload & 1-Click Export */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Hidden file input for uploading directly to this folder */}
              <input
                ref={folderFileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFolderFileInputChange}
              />

              <button
                type="button"
                onClick={() => folderFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border-2 border-indigo-400 dark:border-indigo-500/80 text-slate-900 dark:text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Upload image or PDF directly into this folder"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="font-bold text-slate-900 dark:text-white">Upload to Folder</span>
              </button>

              {activeFolder && (
                <button
                  type="button"
                  disabled={activeFolderItems.length === 0}
                  onClick={() => onOpenExportModal(activeFolder)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer ${
                    activeFolderItems.length > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                  title="Export this folder as a single combined PDF document"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Compile & Export PDF</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Drag & Drop Workspace Body */}
          <div
            onDragOver={handleWorkspaceDragOver}
            onDragLeave={handleWorkspaceDragLeave}
            onDrop={handleWorkspaceDrop}
            className={`relative p-4 sm:p-5 flex-1 min-h-[300px] transition-all ${
              isDragOverFolder
                ? 'bg-indigo-50/80 dark:bg-indigo-950/40 ring-4 ring-indigo-500/30'
                : ''
            }`}
          >
            {/* Drag Hover Banner Indicator */}
            {isDragOverFolder && (
              <div className="absolute inset-0 z-30 bg-indigo-600/10 dark:bg-indigo-900/40 backdrop-blur-2xs border-3 border-dashed border-indigo-500 rounded-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-3 shadow-lg animate-bounce">
                  <ArrowDown className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-indigo-950 dark:text-indigo-100">
                  Drop into &quot;{activeFolder?.name}&quot;
                </h4>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium mt-1">
                  Release to instantly append document(s) to this folder&apos;s page sequence!
                </p>
              </div>
            )}

            {!activeFolder ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                <FolderIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No active folder selected
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Create a folder to start organizing documents.
                </p>
                <button
                  onClick={() => setShowCreateFolderModal(true)}
                  className="mt-3 px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                >
                  Create Folder
                </button>
              </div>
            ) : activeFolderItems.length === 0 ? (
              /* Empty Folder State: Drag from Gallery or Upload Directly */
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 sm:p-12 text-center bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                  <FolderPlus className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    &quot;{activeFolder.name}&quot; is currently empty
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    Drag and drop any document cards from the <strong>Uploaded Documents Gallery</strong> below, or click <strong>Upload to Folder</strong> to add files directly from your computer.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => folderFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Document to this Folder</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenUpload}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs transition-colors"
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
                    <span>Browse Gallery Below</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Populated Folder: Document Sequence with Drag Reordering */
              <div className="space-y-3">
                {/* Drag Guidance Banner */}
                <div className="p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-300">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>
                      Drag handles to reorder page sequence in compiled PDF. Drag more documents from gallery below anytime.
                    </span>
                  </span>
                  <span className="font-mono font-bold shrink-0 hidden sm:inline">
                    {activeFolderItems.length} Pages
                  </span>
                </div>

                {/* Sequenced Items List */}
                <div className="divide-y divide-slate-200 dark:divide-slate-800 border-2 border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  {activeFolderItems.map((item, idx) => {
                    const doc = filesMap.get(item.fileId);
                    if (!doc) return null;
                    const isPdf = doc.type === 'application/pdf';
                    const isBeingDragged = draggedIdx === idx;
                    const isBeingOver = dragOverIdx === idx;

                    return (
                      <div
                        key={`${item.fileId}_${idx}`}
                        draggable={true}
                        onDragStart={(e) => handleDragStartItem(idx, e)}
                        onDragOver={(e) => handleDragOverItem(idx, e)}
                        onDrop={(e) => handleDropOnItem(idx, e)}
                        onDragEnd={handleDragEndItem}
                        className={`p-3 flex items-center justify-between gap-3 transition-all duration-150 select-none ${
                          isBeingDragged
                            ? 'opacity-30 bg-indigo-50/50 dark:bg-indigo-950/40 border-2 border-dashed border-indigo-500 scale-[0.99]'
                            : isBeingOver
                            ? 'bg-indigo-100/80 dark:bg-indigo-950/80 border-2 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Drag Reorder Grip Handle */}
                          <div
                            draggable={true}
                            onDragStart={(e) => {
                              e.stopPropagation();
                              handleDragStartItem(idx, e);
                            }}
                            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 touch-none select-none transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                            title="Drag handle to reorder page position"
                          >
                            <GripVertical className="w-4 h-4 pointer-events-none select-none" />
                          </div>

                          {/* Page Number Badge Stamp */}
                          <span className="w-6 h-6 rounded-md bg-slate-900 text-white dark:bg-indigo-600 flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-2xs">
                            {idx + 1}
                          </span>

                          {/* Thumbnail with rotation */}
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden relative">
                            {doc.dataUrl ? (
                              <img
                                src={doc.dataUrl}
                                alt={doc.name}
                                referrerPolicy="no-referrer"
                                style={{ transform: `rotate(${item.rotation || 0}deg)` }}
                                className="w-full h-full object-cover transition-transform duration-200 pointer-events-none select-none"
                              />
                            ) : isPdf ? (
                              <FileText className="w-5 h-5 text-rose-500 pointer-events-none" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-indigo-500 pointer-events-none" />
                            )}
                          </div>

                          {/* Document Metadata */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {doc.name}
                              </p>
                              {isBeingOver && draggedIdx !== null && draggedIdx !== idx && (
                                <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/80 px-2 py-0.5 rounded-full border border-indigo-300 dark:border-indigo-700 animate-pulse shrink-0">
                                  Place at Page {idx + 1}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              <span>{isPdf ? 'PDF' : doc.type.split('/')[1]?.toUpperCase() || 'IMG'}</span>
                              <span aria-hidden="true">·</span>
                              <span>{formatBytes(doc.size)}</span>
                              {item.rotation && item.rotation > 0 ? (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                    {item.rotation}° Rotated
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Page Sequence Controls: Move, Rotate, Preview, Remove */}
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            draggable={false}
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveItem(idx, idx - 1);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-25 transition-colors cursor-pointer"
                            title="Move Page Up"
                          >
                            <ChevronUp className="w-4 h-4 pointer-events-none" />
                          </button>
                          <button
                            type="button"
                            draggable={false}
                            disabled={idx === activeFolderItems.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveItem(idx, idx + 1);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-25 transition-colors cursor-pointer"
                            title="Move Page Down"
                          >
                            <ChevronDown className="w-4 h-4 pointer-events-none" />
                          </button>
                          <button
                            type="button"
                            draggable={false}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRotateItem(idx);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                            title="Rotate 90° Clockwise"
                          >
                            <RotateCw className="w-4 h-4 pointer-events-none" />
                          </button>
                          <button
                            type="button"
                            draggable={false}
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreviewFile(doc);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                            title="Preview Document"
                          >
                            <Eye className="w-4 h-4 pointer-events-none" />
                          </button>
                          <button
                            type="button"
                            draggable={false}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveItem(item.fileId);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title="Remove from this folder"
                          >
                            <Trash2 className="w-4 h-4 pointer-events-none" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Dedicated End-of-List Drop Slot during dragging */}
                {draggedIdx !== null && draggedIdx !== activeFolderItems.length - 1 && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverIdx(activeFolderItems.length - 1);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (draggedIdx !== null) {
                        handleMoveItem(draggedIdx, activeFolderItems.length - 1);
                      }
                      setDraggedIdx(null);
                      setDragOverIdx(null);
                    }}
                    className="p-2.5 text-center text-xs font-semibold font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/50 border-2 border-dashed border-indigo-400 dark:border-indigo-600 rounded-xl animate-pulse cursor-pointer"
                  >
                    Drop here to move to the end of sequence (Page {activeFolderItems.length})
                  </div>
                )}

                {/* Bottom Compilation Action Bar */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Total Sequence: <strong>{activeFolderItems.length}</strong> pages (
                    {formatBytes(activeFolderBytes)})
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenExportModal(activeFolder)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Compile & Export Folder as 1 PDF</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT 1 COLUMN: RECENT PDF EXPORTS & PDF COMPRESSOR */}
        <div className="lg:col-span-1 space-y-6 flex flex-col min-w-0">
          {/* Recent PDF Exports Widget */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col">
            {/* Widget Header Ribbon */}
            <div className="bg-slate-50 dark:bg-slate-800/80 px-4 sm:px-5 py-3.5 border-b-2 border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                      Recent PDF Exports
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      OUTPUTS
                    </span>
                  </div>
                </div>
              </div>

              <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 tabular-nums shadow-2xs">
                {exports.length} Total
              </span>
            </div>

            {/* Widget Body - Resizes to free space with dark theme slider */}
            <div className="p-3 sm:p-4 flex-1 flex flex-col min-h-0">
              {exports.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                  <HardDrive className="w-9 h-9 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No exported PDFs yet
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Build and arrange your folder on the left, then click <strong>Compile & Export PDF</strong> to produce your unified document!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[220px] sm:max-h-[260px] overflow-y-auto pr-1 dark-slider">
                  {exports.map((item) => (
                    <div
                      key={item.id}
                      className="py-2.5 flex items-center justify-between gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg px-2 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {item.fileName}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[80px]">
                              {item.folderName}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{item.pageCount}p</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{formatBytes(item.fileSize)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.cloudSynced ? (
                          <span
                            className="p-1 text-emerald-600 dark:text-emerald-400"
                            title="Synced to cloud backup"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span
                            className="p-1 text-amber-600 dark:text-amber-400"
                            title="Saved locally"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </span>
                        )}

                        <button
                          onClick={() => onDownloadExport(item)}
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-md transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Widget 2: PDF Compressor (Direct Upload & Gallery Drag) */}
          <PDFCompressorWidget
            files={files}
            onExportSuccess={onExportSuccess}
            cloudConfig={cloudConfig}
            onSyncSingleItem={onSyncSingleItem}
            onPreviewFile={onPreviewFile}
          />
        </div>
      </div>

      {/* Quick Inline Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create New Folder</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Organize documents for combined PDF export
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateFolderModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Q3 Project Report, Sept Scans, Tax Receipts"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 shadow-2xs"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newFolderCat}
                    onChange={(e) =>
                      setNewFolderCat(
                        e.target.value as 'Project' | 'Date' | 'Finance' | 'Legal' | 'General'
                      )
                    }
                    className="w-full px-2.5 py-2 text-xs rounded-lg border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Project">Project</option>
                    <option value="Date">Date / Monthly</option>
                    <option value="Finance">Finance / Taxes</option>
                    <option value="Legal">Legal / Contracts</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Color Tag
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    {['#4f46e5', '#0284c7', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'].map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setNewFolderColor(col)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          newFolderColor === col
                            ? 'border-slate-900 dark:border-white scale-110 shadow-xs'
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Short note about the contents"
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateFolderModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                >
                  Create & Set Working Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
