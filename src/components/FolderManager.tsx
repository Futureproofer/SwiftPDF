import React, { useState } from 'react';
import {
  Folder as FolderIcon,
  Plus,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  Download,
  Eye,
  Trash2,
  FolderPlus,
  Check,
  Edit2,
  FolderKanban,
} from 'lucide-react';
import { Folder, DocFile, FolderItem } from '../types';
import { ReorderSequence } from './ReorderSequence';
import { FolderMiniCollage } from './FolderMiniCollage';
import { formatBytes, formatDate } from '../utils/formatters';

interface FolderManagerProps {
  folders: Folder[];
  files: DocFile[];
  filesMap: Map<string, DocFile>;
  selectedFolderId: string;
  onSelectFolder: (id: string) => void;
  onCreateFolder: (name: string, category: string, description: string, color: string) => void;
  onUpdateFolderItems: (folderId: string, items: FolderItem[]) => void;
  onDeleteFolder: (folderId: string) => void;
  onPreviewFile: (file: DocFile) => void;
  onPreviewSequence: (folder: Folder) => void;
  onOpenExportModal: (folder: Folder) => void;
}

export const FolderManager: React.FC<FolderManagerProps> = ({
  folders,
  files,
  filesMap,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onUpdateFolderItems,
  onDeleteFolder,
  onPreviewFile,
  onPreviewSequence,
  onOpenExportModal,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddDocsModal, setShowAddDocsModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderCategory, setNewFolderCategory] = useState<'Project' | 'Date' | 'Finance' | 'Legal' | 'General'>('Project');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#0284c7');

  const activeFolder = folders.find((f) => f.id === selectedFolderId) || folders[0];

  // Calculate folder statistics
  const activeFolderFiles = (activeFolder?.items || [])
    .map((item) => filesMap.get(item.fileId))
    .filter(Boolean) as DocFile[];

  const activeFolderBytes = activeFolderFiles.reduce((sum, f) => sum + (f.size || 0), 0);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim(), newFolderCategory, newFolderDesc.trim(), newFolderColor);
    setNewFolderName('');
    setNewFolderDesc('');
    setShowCreateModal(false);
  };

  const handleToggleFileInFolder = (fileId: string) => {
    if (!activeFolder) return;
    const exists = activeFolder.items.some((i) => i.fileId === fileId);
    let updated: FolderItem[];
    if (exists) {
      updated = activeFolder.items
        .filter((i) => i.fileId !== fileId)
        .map((item, idx) => ({ ...item, order: idx }));
    } else {
      updated = [
        ...activeFolder.items,
        {
          fileId,
          order: activeFolder.items.length,
          rotation: 0,
        },
      ];
    }
    onUpdateFolderItems(activeFolder.id, updated);
  };

  const categoryPresets = [
    { label: 'Project Deliverable', cat: 'Project', color: '#10b981' },
    { label: 'Q3 Tax & Receipts', cat: 'Finance', color: '#0284c7' },
    { label: 'Monthly Archive (Sept 2026)', cat: 'Date', color: '#f59e0b' },
    { label: 'Contracts & NDA Bundle', cat: 'Legal', color: '#8b5cf6' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Sidebar: Folder Catalog Widget (4 cols) */}
      <div className="lg:col-span-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
        {/* Widget Header Banner */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-3.5 border-b-2 border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <FolderKanban className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Document Folders
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Categorized projects & dates
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
            title="Create Folder"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Folders List */}
        <div className="p-4 space-y-2">
          {folders.map((folder) => {
            const isSelected = activeFolder?.id === folder.id;
            return (
              <div
                key={folder.id}
                onClick={() => onSelectFolder(folder.id)}
                className={`w-full text-left p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-1 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: folder.color || '#6366f1' }}
                    />
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-indigo-950 dark:text-indigo-200' : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {folder.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-medium text-slate-600 dark:text-slate-300">{folder.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{folder.items.length} items</span>
                      </div>
                    </div>
                  </div>

                  {folders.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete folder "${folder.name}"? (Files remain in uploads)`)) {
                          onDeleteFolder(folder.id);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
                      title="Delete folder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dynamic folder preview thumbnails mini-collage */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <FolderMiniCollage folder={folder} filesMap={filesMap} />
                </div>
              </div>
            );
          })}

          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full py-2.5 px-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center gap-1.5 transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Project / Date Folder</span>
          </button>
        </div>
      </div>

      {/* Right Content: Active Folder Sequencer & PDF Compiler Widget (8 cols) */}
      <div className="lg:col-span-8 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
        {activeFolder ? (
          <>
            {/* Widget Header Banner */}
            <div className="bg-slate-50 dark:bg-slate-800/80 px-5 py-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: activeFolder.color || '#6366f1' }}
                  />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    {activeFolder.name}
                  </h2>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pl-5.5">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{activeFolder.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{activeFolder.items.length} documents</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{formatBytes(activeFolderBytes)}</span>
                </div>

                {activeFolder.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 pl-5.5 pt-0.5">
                    {activeFolder.description}
                  </p>
                )}
              </div>

              {/* Action Buttons: Preview & Export as 1 PDF */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={activeFolder.items.length === 0}
                  onClick={() => onPreviewSequence(activeFolder)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-colors ${
                    activeFolder.items.length === 0
                      ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Preview documents in order before compiling"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Sequence</span>
                </button>

                <button
                  type="button"
                  disabled={activeFolder.items.length === 0}
                  onClick={() => onOpenExportModal(activeFolder)}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-colors ${
                    activeFolder.items.length === 0
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Merged PDF</span>
                </button>
              </div>
            </div>

            {/* Reorder Interface */}
            <div className="p-5">
              <ReorderSequence
                folder={activeFolder}
                filesMap={filesMap}
                onUpdateItems={(items) => onUpdateFolderItems(activeFolder.id, items)}
                onPreviewFile={onPreviewFile}
                onOpenAddDocumentsModal={() => setShowAddDocsModal(true)}
              />
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500">
            <FolderIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No folder selected</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Select or create a folder to begin organizing.</p>
          </div>
        )}
      </div>

      {/* Create New Folder Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create Folder</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Presets */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Quick Suggested Templates:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {categoryPresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setNewFolderName(preset.label);
                      setNewFolderCategory(preset.cat as any);
                      setNewFolderColor(preset.color);
                    }}
                    className="text-left p-1.5 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-md text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors truncate"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Q3 Project Alpha Deliverables"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category Tag
                  </label>
                  <select
                    value={newFolderCategory}
                    onChange={(e) => setNewFolderCategory(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  >
                    <option value="Project">Project</option>
                    <option value="Date">Date Archive</option>
                    <option value="Finance">Finance / Invoices</option>
                    <option value="Legal">Legal & Contracts</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Folder Color
                  </label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0f172a'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewFolderColor(c)}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          newFolderColor === c ? 'scale-110 ring-2 ring-offset-1 ring-slate-400' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Client sign-off and receipt receipts"
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Documents from Library Modal */}
      {showAddDocsModal && activeFolder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Select Documents for "{activeFolder.name}"
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click documents to include or exclude from this compilation sequence
                </p>
              </div>
              <button
                onClick={() => setShowAddDocsModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 py-1">
              {files.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
                  No documents in library. Upload files first.
                </p>
              ) : (
                files.map((file) => {
                  const isInFolder = activeFolder.items.some((i) => i.fileId === file.id);
                  return (
                    <div
                      key={file.id}
                      onClick={() => handleToggleFileInFolder(file.id)}
                      className={`p-2.5 rounded-lg border-2 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                        isInFolder
                          ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          {file.type === 'application/pdf' ? (
                            <FileText className="w-4 h-4 text-rose-500" />
                          ) : (
                            <FileText className="w-4 h-4 text-indigo-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {file.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                            {formatBytes(file.size)}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isInFolder ? (
                          <span className="w-5 h-5 rounded bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold">
                            + Add
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowAddDocsModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
