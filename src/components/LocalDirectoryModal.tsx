import React, { useState } from 'react';
import {
  FolderOpen,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  FolderCheck,
  Info,
} from 'lucide-react';
import {
  isFileSystemAccessSupported,
  requestUserLocalDirectory,
  getSavedDirectoryName,
  setSavedDirectoryName,
} from '../utils/fileSystemAccess';

interface LocalDirectoryModalProps {
  currentDirName: string;
  onUpdateDirName: (name: string) => void;
  onClose: () => void;
}

export const LocalDirectoryModal: React.FC<LocalDirectoryModalProps> = ({
  currentDirName,
  onUpdateDirName,
  onClose,
}) => {
  const supported = isFileSystemAccessSupported();
  const [customPath, setCustomPath] = useState(currentDirName || 'DocFlow_Exports');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [isPicking, setIsPicking] = useState(false);

  const handlePickDirectory = async () => {
    setIsPicking(true);
    setFeedback(null);
    try {
      const result = await requestUserLocalDirectory();
      if (result.success) {
        setCustomPath(result.name);
        onUpdateDirName(result.name);
        setFeedback({
          type: 'success',
          message: `Local directory connected: "${result.name}". Future PDF exports will write directly to this folder.`,
        });
      } else if (result.error && result.error !== 'Selection cancelled') {
        setFeedback({ type: 'error', message: result.error });
      }
    } finally {
      setIsPicking(false);
    }
  };

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPath.trim()) return;
    setSavedDirectoryName(customPath.trim());
    onUpdateDirName(customPath.trim());
    setFeedback({
      type: 'success',
      message: `Default export directory path set to "${customPath.trim()}".`,
    });
    setTimeout(() => onClose(), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in duration-150 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Custom Local Directory</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure where final compiled PDFs are saved</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-semibold">
            ✕
          </button>
        </div>

        {/* Current status */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Active Save Destination
          </span>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-900 dark:text-white truncate">
            <FolderCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{currentDirName || 'Downloads (Default Browser Folder)'}</span>
          </div>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Option A: System Native Folder Picker */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Native System Folder Picker (Chromium & Desktop)
          </label>
          <button
            type="button"
            onClick={handlePickDirectory}
            disabled={isPicking}
            className="w-full py-2.5 px-4 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            <span>{isPicking ? 'Selecting Folder...' : 'Choose Native Local Folder...'}</span>
          </button>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Leverages File System Access API to stream output PDFs straight into your computer's selected directory.
          </p>
        </div>

        {/* Option B: Manual Target Directory Name */}
        <form onSubmit={handleManualSave} className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Custom Subfolder Name / Path
            </label>
            <input
              type="text"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="e.g. DocFlow_Projects"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Used as the suggested subfolder name on mobile and browsers with standard download prompting.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium"
            >
              Close
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
            >
              Save Preference
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
