import React, { useState, useRef, useMemo } from 'react';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Search,
  Eye,
  Trash2,
  FolderPlus,
  CheckSquare,
  Square,
  LayoutGrid,
  List,
  Sparkles,
  Check,
  X,
  Filter,
  Tag,
  Folder as FolderIcon,
  RotateCcw,
  GripVertical,
  ArrowUpDown,
  ChevronDown,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { DocFile, Folder, UserAccount } from '../types';
import { formatBytes, formatDate } from '../utils/formatters';

interface UploadSectionProps {
  files: DocFile[];
  folders: Folder[];
  onUploadFiles: (fileList: FileList | File[]) => Promise<void>;
  onDeleteFile: (fileId: string) => void;
  onDeleteBatch: (fileIds: string[]) => void;
  onAssignToFolder: (fileIds: string[], folderId: string) => void;
  onPreviewFile: (file: DocFile) => void;
  isProcessingBatch: boolean;
  batchProgress: { current: number; total: number; filename: string };
  account?: UserAccount;
  onOpenAccount?: () => void;
}

type FileTypeTag = 'all' | 'pdf' | 'png' | 'jpg' | 'other';
type FileSizeTag = 'all' | 'small' | 'medium' | 'large';
type AssignmentTag = 'all' | 'assigned' | 'unassigned';
export type SortOption =
  | 'date-desc'
  | 'date-asc'
  | 'name-asc'
  | 'name-desc'
  | 'size-desc'
  | 'size-asc'
  | 'type-pdf-first'
  | 'type-img-first'
  | 'pages-desc'
  | 'pages-asc';

export const UploadSection: React.FC<UploadSectionProps> = ({
  files,
  folders,
  onUploadFiles,
  onDeleteFile,
  onDeleteBatch,
  onAssignToFolder,
  onPreviewFile,
  isProcessingBatch,
  batchProgress,
  account,
  onOpenAccount,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeTag, setSelectedTypeTag] = useState<FileTypeTag>('all');
  const [selectedSizeTag, setSelectedSizeTag] = useState<FileSizeTag>('all');
  const [selectedAssignTag, setSelectedAssignTag] = useState<AssignmentTag>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [selectedLetter, setSelectedLetter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);
  const [showFolderAssignModal, setShowFolderAssignModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute tag counts and alphabet distribution
  const counts = useMemo(() => {
    let pdf = 0;
    let png = 0;
    let jpg = 0;
    let other = 0;
    let small = 0;
    let medium = 0;
    let large = 0;
    let assigned = 0;
    let unassigned = 0;

    files.forEach((f) => {
      const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
      const isPng = f.type === 'image/png' || f.name.toLowerCase().endsWith('.png');
      const isJpg =
        f.type === 'image/jpeg' ||
        f.type === 'image/jpg' ||
        f.name.toLowerCase().endsWith('.jpg') ||
        f.name.toLowerCase().endsWith('.jpeg');

      if (isPdf) pdf++;
      else if (isPng) png++;
      else if (isJpg) jpg++;
      else other++;

      if (f.size < 500 * 1024) small++;
      else if (f.size <= 2 * 1024 * 1024) medium++;
      else large++;

      if (f.assignedFolderIds.length > 0) assigned++;
      else unassigned++;
    });

    return { pdf, png, jpg, other, small, medium, large, assigned, unassigned };
  }, [files]);

  // Compute alphabet counts for quick A-Z jumps
  const alphabetData = useMemo(() => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const letterCounts: Record<string, number> = {};
    letters.forEach((l) => (letterCounts[l] = 0));
    let hashCount = 0;

    files.forEach((f) => {
      const firstChar = f.name.trim()[0]?.toUpperCase() || '';
      if (letters.includes(firstChar)) {
        letterCounts[firstChar] = (letterCounts[firstChar] || 0) + 1;
      } else {
        hashCount++;
      }
    });

    return { letters, letterCounts, hashCount };
  }, [files]);

  // Filter files based on search + all tag-based filters + letter filter
  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
      const isPng = f.type === 'image/png' || f.name.toLowerCase().endsWith('.png');
      const isJpg =
        f.type === 'image/jpeg' ||
        f.type === 'image/jpg' ||
        f.name.toLowerCase().endsWith('.jpg') ||
        f.name.toLowerCase().endsWith('.jpeg');

      // 1. File Type Tag Filter
      if (selectedTypeTag === 'pdf' && !isPdf) return false;
      if (selectedTypeTag === 'png' && !isPng) return false;
      if (selectedTypeTag === 'jpg' && !isJpg) return false;
      if (selectedTypeTag === 'other' && (isPdf || isPng || isJpg)) return false;

      // 2. File Size Tag Filter
      if (selectedSizeTag === 'small' && f.size >= 500 * 1024) return false;
      if (selectedSizeTag === 'medium' && (f.size < 500 * 1024 || f.size > 2 * 1024 * 1024))
        return false;
      if (selectedSizeTag === 'large' && f.size <= 2 * 1024 * 1024) return false;

      // 3. Assignment Tag Filter
      if (selectedAssignTag === 'assigned' && f.assignedFolderIds.length === 0) return false;
      if (selectedAssignTag === 'unassigned' && f.assignedFolderIds.length > 0) return false;

      // 4. Letter Quick Filter (A-Z or #)
      if (selectedLetter !== 'all') {
        const firstChar = f.name.trim()[0]?.toUpperCase() || '';
        if (selectedLetter === '#') {
          if (/[A-Z]/.test(firstChar)) return false;
        } else {
          if (firstChar !== selectedLetter) return false;
        }
      }

      // 5. Search Query Filter (name or extension)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = f.name.toLowerCase().includes(query);
        const matchesType = f.type.toLowerCase().includes(query);
        if (!matchesName && !matchesType) return false;
      }

      return true;
    });
  }, [files, selectedTypeTag, selectedSizeTag, selectedAssignTag, selectedLetter, searchQuery]);

  // Apply Sorting (A-Z, Z-A, Date, Size, Type)
  const sortedAndFilteredFiles = useMemo(() => {
    const list = [...filteredFiles];
    list.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return b.uploadedAt - a.uploadedAt;
        case 'date-asc':
          return a.uploadedAt - b.uploadedAt;
        case 'name-asc':
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        case 'name-desc':
          return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' });
        case 'size-desc':
          return b.size - a.size;
        case 'size-asc':
          return a.size - b.size;
        case 'type-pdf-first': {
          const aPdf = a.type === 'application/pdf' ? 1 : 0;
          const bPdf = b.type === 'application/pdf' ? 1 : 0;
          if (aPdf !== bPdf) return bPdf - aPdf;
          return b.uploadedAt - a.uploadedAt;
        }
        case 'type-img-first': {
          const aImg = a.type.startsWith('image/') ? 1 : 0;
          const bImg = b.type.startsWith('image/') ? 1 : 0;
          if (aImg !== bImg) return bImg - aImg;
          return b.uploadedAt - a.uploadedAt;
        }
        case 'pages-desc':
          return (b.pageCount || 1) - (a.pageCount || 1);
        case 'pages-asc':
          return (a.pageCount || 1) - (b.pageCount || 1);
        default:
          return b.uploadedAt - a.uploadedAt;
      }
    });
    return list;
  }, [filteredFiles, sortBy]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedTypeTag !== 'all' ||
    selectedSizeTag !== 'all' ||
    selectedAssignTag !== 'all' ||
    selectedLetter !== 'all' ||
    sortBy !== 'date-desc';

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedTypeTag('all');
    setSelectedSizeTag('all');
    setSelectedAssignTag('all');
    setSelectedLetter('all');
    setSortBy('date-desc');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await onUploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await onUploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  const toggleSelectAll = () => {
    if (selectedFileIds.size === sortedAndFilteredFiles.length && sortedAndFilteredFiles.length > 0) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(sortedAndFilteredFiles.map((f) => f.id)));
    }
  };

  const toggleSelectOne = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(selectedFileIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedFileIds(next);
  };

  const handleBatchAssign = (folderId: string) => {
    if (selectedFileIds.size > 0) {
      onAssignToFolder(Array.from(selectedFileIds), folderId);
      setShowFolderAssignModal(false);
      setSelectedFileIds(new Set());
    }
  };

  const handleBatchDelete = () => {
    if (selectedFileIds.size > 0) {
      if (confirm(`Delete ${selectedFileIds.size} selected documents?`)) {
        onDeleteBatch(Array.from(selectedFileIds));
        setSelectedFileIds(new Set());
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col space-y-0">
      {/* 1. Prominent Widget Header Banner */}
      <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                Uploaded Documents Gallery
              </h2>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/90 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                WIDGET
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Filter, search, organize, and inspect source documents for PDF bundling
            </p>
          </div>
        </div>

        {/* Right side stats badge & clear filters button */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-md border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}

          <span className="px-2.5 py-1 text-xs font-mono font-semibold rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 tabular-nums shadow-2xs">
            {sortedAndFilteredFiles.length} of {files.length} Docs
          </span>
        </div>
      </div>

      {/* 24-Hour Image Purge Mode Notification Banner */}
      <div
        className={`px-5 py-2.5 border-b text-xs flex flex-wrap items-center justify-between gap-2 transition-colors ${
          account?.isLoggedIn
            ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
            : 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-500/20 text-amber-800 dark:text-amber-300'
        }`}
      >
        <div className="flex items-center gap-2">
          {account?.isLoggedIn ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <span>
            {account?.isLoggedIn ? (
              <>
                <strong>Member Session ({account.name || 'Active'}):</strong> Uploads kept indefinitely.{' '}
                {account.autoPurgeImages ? (
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    (24h Purge Toggle is ON)
                  </span>
                ) : (
                  <span className="text-emerald-700 dark:text-emerald-400">
                    (24h Auto-Purge is disabled)
                  </span>
                )}
              </>
            ) : (
              <>
                <strong>Public Guest Session:</strong> Uploaded images are automatically purged after 24
                hours to keep temporary uploads clean.
              </>
            )}
          </span>
        </div>

        {onOpenAccount && (
          <button
            type="button"
            onClick={onOpenAccount}
            className="font-bold underline hover:opacity-80 transition-opacity cursor-pointer shrink-0"
          >
            {account?.isLoggedIn ? 'Manage Purge Toggle' : 'Log In to Retain Uploads'}
          </button>
        )}
      </div>

      {/* 2. Drag & Drop Upload Zone - Sleek Dark Theme with Animated Floating Files Illustration */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-slate-950 text-white relative overflow-hidden">
        {/* Ambient Glowing Gradients in Background */}
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 overflow-hidden ${
            isDragOver
              ? 'border-indigo-400 bg-indigo-950/70 shadow-[0_0_35px_rgba(99,102,241,0.35)] scale-[0.995]'
              : 'border-slate-700/80 hover:border-indigo-500/80 bg-slate-850/80 hover:bg-slate-800/80 shadow-inner'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.bmp,.tiff"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Animated Floating Document Icons Scene */}
          <div className="relative max-w-lg mx-auto py-2">
            {/* Floating File 1: PDF (Red Accent) */}
            <div className="absolute left-4 sm:left-10 -top-2 hidden xs:flex flex-col items-center pointer-events-none select-none">
              <div className="w-12 h-14 rounded-lg bg-slate-900 border-2 border-rose-500/60 shadow-lg shadow-rose-950/50 p-1.5 flex flex-col justify-between transform -rotate-6">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-black text-rose-400 bg-rose-950/80 px-1 rounded">
                    PDF
                  </span>
                  <FileText className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="space-y-1">
                  <div className="h-1 bg-rose-500/40 rounded-full w-full" />
                  <div className="h-1 bg-rose-500/30 rounded-full w-3/4" />
                </div>
              </div>
            </div>

            {/* Floating File 2: PNG / Image (Emerald Accent) */}
            <div className="absolute right-4 sm:right-10 -top-1 hidden xs:flex flex-col items-center pointer-events-none select-none">
              <div className="w-12 h-14 rounded-lg bg-slate-900 border-2 border-emerald-500/60 shadow-lg shadow-emerald-950/50 p-1.5 flex flex-col justify-between transform rotate-6">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-black text-emerald-400 bg-emerald-950/80 px-1 rounded">
                    PNG
                  </span>
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="w-full h-5 rounded bg-emerald-950/60 flex items-center justify-center border border-emerald-500/30">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/50" />
                </div>
              </div>
            </div>

            {/* Central Pulsing Upload Action Target */}
            <div className="relative z-10 space-y-3">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 mx-auto flex items-center justify-center">
                {/* Animated pulsing outer halo ring */}
                <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 animate-ping opacity-35" />
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-b from-indigo-500 to-indigo-700 border-2 border-indigo-400/50 text-white flex items-center justify-center shadow-lg shadow-indigo-600/35 group-hover:scale-105 transition-transform duration-200">
                  <Upload className="w-6 h-6 sm:w-7 sm:h-7 text-white animate-pulse-subtle" />
                </div>
              </div>

              <div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  {isDragOver ? 'Release files here to import now' : 'Drag & drop documents here or Browse Files'}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Bulk upload supported: multi-page PDFs, scans, photos & screenshots
                </p>
              </div>

              {/* Format Badges Row with glowing accents */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs">
                  .PDF
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs">
                  .PNG
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs">
                  .JPG / JPEG
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs">
                  .WEBP
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs">
                  .TIFF / BMP
                </span>
                <span className="text-[11px] text-slate-400 ml-1">· Up to 50MB per file</span>
              </div>
            </div>
          </div>

          {/* Real-time batch progress indicator */}
          {isProcessingBatch && (
            <div className="mt-4 max-w-sm mx-auto p-3 bg-slate-900 border border-indigo-500/50 rounded-lg text-left animate-in fade-in">
              <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold mb-1">
                <span className="truncate max-w-[200px]">Importing {batchProgress.filename}...</span>
                <span className="font-mono tabular-nums">
                  {batchProgress.current} / {batchProgress.total}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full transition-all duration-150"
                  style={{
                    width: `${(batchProgress.current / Math.max(batchProgress.total, 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Search Bar, Sorting, Alphabet Bar & Tag-Based Filter Hub */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3.5">
        {/* Row 1: Search Bar + Sort Selector + View Mode Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Prominent Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by document name or type (e.g., 'invoice', 'report', 'pdf', 'png')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none pl-8 pr-7 py-2 text-xs bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer shadow-2xs transition-colors"
                title="Sort documents in gallery"
              >
                <option value="date-desc">Date: Newest First</option>
                <option value="date-asc">Date: Oldest First</option>
                <option value="name-asc">Alphabetical: A → Z</option>
                <option value="name-desc">Alphabetical: Z → A</option>
                <option value="size-desc">File Size: Largest First</option>
                <option value="size-asc">File Size: Smallest First</option>
                <option value="type-pdf-first">Format: PDFs First</option>
                <option value="type-img-first">Format: Images First</option>
                <option value="pages-desc">Page Count: Most Pages</option>
                <option value="pages-asc">Page Count: Fewest Pages</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Sort One-Click Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
            Quick Sort:
          </span>
          {[
            { id: 'date-desc', label: 'Newest' },
            { id: 'date-asc', label: 'Oldest' },
            { id: 'name-asc', label: 'A → Z' },
            { id: 'name-desc', label: 'Z → A' },
            { id: 'size-desc', label: 'Largest' },
            { id: 'size-asc', label: 'Smallest' },
            { id: 'type-pdf-first', label: 'PDFs First' },
            { id: 'type-img-first', label: 'Images First' },
            { id: 'pages-desc', label: 'Most Pages' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setSortBy(pill.id as SortOption)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                sortBy === pill.id
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Row 2: Alphabet Quick-Filter Strip (A-Z) */}
        <div className="space-y-1 pt-0.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700 dark:text-slate-300">Letter Filter (A-Z):</span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Jump directly to documents starting with any letter
              </span>
            </div>
            {selectedLetter !== 'all' && (
              <button
                onClick={() => setSelectedLetter('all')}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-bold"
              >
                Clear letter filter ({selectedLetter})
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedLetter('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold shrink-0 transition-colors cursor-pointer ${
                selectedLetter === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All
            </button>
            {alphabetData.letters.map((letter) => {
              const count = alphabetData.letterCounts[letter] || 0;
              const isSelected = selectedLetter === letter;
              const hasFiles = count > 0;

              return (
                <button
                  key={letter}
                  type="button"
                  disabled={!hasFiles && !isSelected}
                  onClick={() => setSelectedLetter(isSelected ? 'all' : letter)}
                  className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-mono font-bold shrink-0 transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs scale-105 cursor-pointer'
                      : hasFiles
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-indigo-50 dark:hover:bg-indigo-950/80 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 cursor-pointer'
                      : 'text-slate-300 dark:text-slate-600 opacity-40 cursor-default'
                  }`}
                  title={
                    hasFiles
                      ? `${count} document${count > 1 ? 's' : ''} starting with '${letter}'`
                      : `No documents starting with '${letter}'`
                  }
                >
                  {letter}
                </button>
              );
            })}
            {alphabetData.hashCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedLetter(selectedLetter === '#' ? 'all' : '#')}
                className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-mono font-bold shrink-0 transition-all cursor-pointer ${
                  selectedLetter === '#'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-indigo-50 dark:hover:bg-indigo-950/80 border border-slate-200 dark:border-slate-700'
                }`}
                title={`${alphabetData.hashCount} files starting with numbers or symbols`}
              >
                #
              </button>
            )}
          </div>
        </div>

        {/* Row 3: Tag-Based Filters (Interactive Chips) */}
        <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Tag className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Quick Filter Tags:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Tag: All Formats */}
            <button
              type="button"
              onClick={() => setSelectedTypeTag('all')}
              className={`px-3 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                selectedTypeTag === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              All Types ({files.length})
            </button>

            {/* Tag: PDFs */}
            <button
              type="button"
              onClick={() => setSelectedTypeTag(selectedTypeTag === 'pdf' ? 'all' : 'pdf')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                selectedTypeTag === 'pdf'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>PDFs ({counts.pdf})</span>
            </button>

            {/* Tag: PNG */}
            <button
              type="button"
              onClick={() => setSelectedTypeTag(selectedTypeTag === 'png' ? 'all' : 'png')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                selectedTypeTag === 'png'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>PNGs ({counts.png})</span>
            </button>

            {/* Tag: JPG/JPEG */}
            <button
              type="button"
              onClick={() => setSelectedTypeTag(selectedTypeTag === 'jpg' ? 'all' : 'jpg')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                selectedTypeTag === 'jpg'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>JPG / JPEG ({counts.jpg})</span>
            </button>

            {/* Tag: Other (WebP/TIFF) */}
            {counts.other > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTypeTag(selectedTypeTag === 'other' ? 'all' : 'other')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                  selectedTypeTag === 'other'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>Other ({counts.other})</span>
              </button>
            )}

            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block" />

            {/* Size Tags */}
            <button
              type="button"
              onClick={() => setSelectedSizeTag(selectedSizeTag === 'small' ? 'all' : 'small')}
              className={`px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                selectedSizeTag === 'small'
                  ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              &lt; 500 KB ({counts.small})
            </button>

            <button
              type="button"
              onClick={() => setSelectedSizeTag(selectedSizeTag === 'large' ? 'all' : 'large')}
              className={`px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                selectedSizeTag === 'large'
                  ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              &gt; 2 MB ({counts.large})
            </button>

            <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block" />

            {/* Assignment Tags */}
            <button
              type="button"
              onClick={() =>
                setSelectedAssignTag(selectedAssignTag === 'unassigned' ? 'all' : 'unassigned')
              }
              className={`px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                selectedAssignTag === 'unassigned'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Unassigned ({counts.unassigned})
            </button>
          </div>
        </div>

        {/* Row 4: Multi-Selection & Batch Toolbar */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold cursor-pointer"
            >
              {selectedFileIds.size === sortedAndFilteredFiles.length && sortedAndFilteredFiles.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              )}
              <span>
                {selectedFileIds.size > 0
                  ? `${selectedFileIds.size} of ${sortedAndFilteredFiles.length} selected`
                  : 'Select All Displayed'}
              </span>
            </button>
          </div>

          {selectedFileIds.size > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in duration-150">
              <button
                onClick={() => setShowFolderAssignModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Add {selectedFileIds.size} to Folder...</span>
              </button>
              <button
                onClick={handleBatchDelete}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg font-semibold transition-colors border border-rose-200 dark:border-rose-900 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete ({selectedFileIds.size})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Document Gallery View (Grid / List) */}
      <div className="p-4 sm:p-5 flex-1">
        {sortedAndFilteredFiles.length === 0 ? (
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-12 text-center text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50 text-indigo-500" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No documents match your current search, sort, or filters.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Try clicking &quot;Reset Filters&quot; above or drop new files into the upload box.
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View - Strong borders and high-contrast cards */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {sortedAndFilteredFiles.map((file) => {
              const isSelected = selectedFileIds.has(file.id);
              const isPdf = file.type === 'application/pdf';

              return (
                <div
                  key={file.id}
                  draggable={true}
                  onDragStart={(e) => {
                    const ids =
                      selectedFileIds.has(file.id) && selectedFileIds.size > 1
                        ? Array.from(selectedFileIds)
                        : [file.id];
                    e.dataTransfer.setData('text/plain', file.id);
                    e.dataTransfer.setData('application/docflow-file-id', file.id);
                    e.dataTransfer.setData('application/docflow-file-ids', JSON.stringify(ids));
                    e.dataTransfer.effectAllowed = 'copyMove';
                  }}
                  onClick={() => toggleSelectOne(file.id)}
                  className={`group relative bg-white dark:bg-slate-900 border-2 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-150 flex flex-col shadow-xs ${
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => toggleSelectOne(file.id, e)}
                    className="absolute top-2 left-2 z-10 p-1 rounded-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-xs border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                    )}
                  </button>

                  {/* Quick Preview Hover Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewFile(file);
                    }}
                    className="absolute top-2 right-2 z-10 p-1 rounded-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity shadow-xs border border-slate-200 dark:border-slate-700 cursor-pointer"
                    title="Quick Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Thumbnail / PDF Preview Banner */}
                  <div className="h-32 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden relative select-none">
                    {isPdf ? (
                      <div className="flex flex-col items-center justify-center p-2 text-rose-500">
                        <FileText className="w-10 h-10 mb-1" />
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded">
                          PDF Document
                        </span>
                      </div>
                    ) : (
                      <img
                        src={file.dataUrl}
                        alt={file.name}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105 pointer-events-none"
                        loading="lazy"
                      />
                    )}

                    {/* Page count pill for PDFs */}
                    {file.pageCount && file.pageCount > 1 && (
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/75 text-white backdrop-blur-xs">
                        {file.pageCount} pages
                      </span>
                    )}
                  </div>

                  {/* Card Content & Metadata */}
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <p
                        className="text-xs font-bold text-slate-900 dark:text-white truncate"
                        title={file.name}
                      >
                        {file.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                        <span>{formatBytes(file.size)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDate(file.uploadedAt)}</span>
                        {!isPdf && (
                          <>
                            <span aria-hidden="true">·</span>
                            {account?.isLoggedIn && !account.autoPurgeImages ? (
                              <span
                                className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded"
                                title="Safely stored indefinitely in your member account"
                              >
                                <ShieldCheck className="w-3 h-3" />
                                <span>Saved</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded"
                                title="24-hour auto-purge clears this image after 24h"
                              >
                                <Clock className="w-3 h-3" />
                                <span>24h Purge</span>
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Assigned Folders Badge & Drag Handle */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                      {file.assignedFolderIds.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold truncate max-w-[110px]">
                          <FolderIcon className="w-3 h-3 shrink-0" />
                          <span>
                            {file.assignedFolderIds.length}{' '}
                            {file.assignedFolderIds.length === 1 ? 'folder' : 'folders'}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic">Unassigned</span>
                      )}

                      <div className="flex items-center gap-1">
                        <span
                          className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-medium px-1 rounded bg-slate-100 dark:bg-slate-800 transition-colors"
                          title="Drag this document into the active folder above"
                        >
                          <GripVertical className="w-3 h-3" />
                          <span className="hidden sm:inline">Drag</span>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFile(file.id);
                          }}
                          className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 transition-colors cursor-pointer"
                          title="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View - High contrast with explicit row borders */
          <div className="border-2 border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/90 border-b-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <button
                      onClick={toggleSelectAll}
                      className="block text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                    >
                      {selectedFileIds.size === sortedAndFilteredFiles.length && sortedAndFilteredFiles.length > 0 ? (
                        <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3">Document Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Size</th>
                  <th className="py-2.5 px-3">Uploaded</th>
                  <th className="py-2.5 px-3">Folder Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sortedAndFilteredFiles.map((file) => {
                  const isSelected = selectedFileIds.has(file.id);
                  const isPdf = file.type === 'application/pdf';

                  return (
                    <tr
                      key={file.id}
                      draggable={true}
                      onDragStart={(e) => {
                        const ids =
                          selectedFileIds.has(file.id) && selectedFileIds.size > 1
                            ? Array.from(selectedFileIds)
                            : [file.id];
                        e.dataTransfer.setData('text/plain', file.id);
                        e.dataTransfer.setData('application/docflow-file-id', file.id);
                        e.dataTransfer.setData('application/docflow-file-ids', JSON.stringify(ids));
                        e.dataTransfer.effectAllowed = 'copyMove';
                      }}
                      onClick={() => toggleSelectOne(file.id)}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-grab active:cursor-grabbing transition-colors ${
                        isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <button
                          onClick={(e) => toggleSelectOne(file.id, e)}
                          className="block text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <Square className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        {isPdf ? (
                          <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                        )}
                        <span className="truncate max-w-xs">{file.name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span>{isPdf ? 'PDF' : file.type.split('/')[1]?.toUpperCase() || 'IMAGE'}</span>
                          {!isPdf && (
                            account?.isLoggedIn && !account.autoPurgeImages ? (
                              <span
                                className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded font-sans font-semibold"
                                title="Saved to account indefinitely"
                              >
                                Saved
                              </span>
                            ) : (
                              <span
                                className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded font-sans font-semibold"
                                title="Auto-purged after 24 hours"
                              >
                                24h
                              </span>
                            )
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 font-mono tabular-nums font-medium">
                        {formatBytes(file.size)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {formatDate(file.uploadedAt)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {file.assignedFolderIds.length > 0 ? (
                          <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                            {file.assignedFolderIds.length}{' '}
                            {file.assignedFolderIds.length === 1 ? 'folder' : 'folders'}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPreviewFile(file);
                            }}
                            className="p-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors cursor-pointer"
                            title="Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteFile(file.id);
                            }}
                            className="p-1 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Add To Folder Batch Modal */}
      {showFolderAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in duration-150">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Add {selectedFileIds.size} Documents to Folder
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Choose a project or date category folder for compilation
              </p>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 py-1">
              {folders.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
                  No folders created yet.
                </p>
              ) : (
                folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleBatchAssign(folder.id)}
                    className="w-full text-left p-2.5 rounded-lg border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{folder.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {folder.category} · {folder.items.length} current documents
                      </p>
                    </div>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">Select</span>
                  </button>
                ))
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowFolderAssignModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
