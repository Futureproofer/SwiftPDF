import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Download,
  Mail,
  Share2,
  Cloud,
  HardDrive,
  CheckCircle2,
  Sliders,
  Sparkles,
  Copy,
  Check,
  QrCode,
  FileText,
  ArrowRight,
  FolderCheck,
} from 'lucide-react';
import { Folder, DocFile, CompressionPreset, CompressionSettings, ExportHistoryItem, CloudSyncConfig } from '../types';
import { compileFolderToPdf } from '../utils/pdfGenerator';
import { saveFileToLocalDirectory, getSavedDirectoryName } from '../utils/fileSystemAccess';
import { formatBytes } from '../utils/formatters';

interface ExportModalProps {
  folder: Folder;
  filesMap: Map<string, DocFile>;
  cloudConfig: CloudSyncConfig;
  onClose: () => void;
  onExportSuccess: (item: ExportHistoryItem) => void;
  onOpenLocalDirModal: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  folder,
  filesMap,
  cloudConfig,
  onClose,
  onExportSuccess,
  onOpenLocalDirModal,
}) => {
  // Preset definitions
  const [preset, setPreset] = useState<CompressionPreset>('balanced');
  const [quality, setQuality] = useState<number>(0.8);
  const [maxDimension, setMaxDimension] = useState<number>(1600);
  const [colorMode, setColorMode] = useState<'color' | 'grayscale'>('color');
  const [pageSize, setPageSize] = useState<'auto' | 'a4' | 'letter'>('auto');
  const [margins, setMargins] = useState<'none' | 'small' | 'standard'>('small');

  const [fileName, setFileName] = useState<string>(
    `${folder.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
  );

  const [saveToLocalDir, setSaveToLocalDir] = useState<boolean>(true);
  const [autoCloudSync, setAutoCloudSync] = useState<boolean>(cloudConfig.enabled);

  // Export State
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number; message: string }>({
    current: 0,
    total: folder.items.length,
    message: '',
  });

  const [exportResult, setExportResult] = useState<{
    blob: Blob;
    fileSize: number;
    pageCount: number;
    downloadUrl: string;
    savedPath?: string;
    cloudUrl?: string;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showQr, setShowQr] = useState<boolean>(false);

  // Compute original uncompressed size
  const originalBytes = folder.items.reduce((sum, item) => {
    const f = filesMap.get(item.fileId);
    return sum + (f?.size || 0);
  }, 0);

  const handlePresetSelect = (p: CompressionPreset) => {
    setPreset(p);
    if (p === 'max') {
      setQuality(0.95);
      setMaxDimension(2400);
      setColorMode('color');
    } else if (p === 'balanced') {
      setQuality(0.8);
      setMaxDimension(1600);
      setColorMode('color');
    } else if (p === 'compact') {
      setQuality(0.6);
      setMaxDimension(1200);
      setColorMode('color');
    } else if (p === 'extreme') {
      setQuality(0.5);
      setMaxDimension(1000);
      setColorMode('grayscale');
    }
  };

  const handleStartCompile = async () => {
    setIsCompiling(true);
    setProgress({
      current: 0,
      total: folder.items.length,
      message: 'Initializing compilation pipeline...',
    });

    try {
      const settings: CompressionSettings = {
        preset,
        quality,
        maxDimension,
        colorMode,
        pageSize,
        margins,
      };

      const result = await compileFolderToPdf(
        folder,
        filesMap,
        settings,
        (current, total, message) => {
          setProgress({ current, total, message });
        }
      );

      // Handle local directory save
      let localPath = '';
      if (saveToLocalDir) {
        const saveRes = await saveFileToLocalDirectory(fileName, result.blob);
        if (saveRes.success) {
          localPath = saveRes.path;
        }
      }

      // Generate cloud simulation URL
      const mockCloudUrl = `https://docflow-cloud.app/share/${encodeURIComponent(
        fileName
      )}?v=${Date.now()}`;
      const downloadUrl = URL.createObjectURL(result.blob);

      const historyItem: ExportHistoryItem = {
        id: `export_${Date.now()}`,
        folderId: folder.id,
        folderName: folder.name,
        fileName,
        exportedAt: Date.now(),
        fileSize: result.sizeBytes,
        pageCount: result.pageCount,
        compressionPreset: preset,
        savedToLocalDir: saveToLocalDir,
        localPath: localPath || getSavedDirectoryName() || 'Downloads',
        cloudSynced: autoCloudSync,
        cloudUrl: autoCloudSync ? mockCloudUrl : undefined,
        downloadUrl,
        blob: result.blob,
      };

      onExportSuccess(historyItem);

      setExportResult({
        blob: result.blob,
        fileSize: result.sizeBytes,
        pageCount: result.pageCount,
        downloadUrl,
        savedPath: localPath || getSavedDirectoryName() || 'Downloads',
        cloudUrl: mockCloudUrl,
      });

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {
        // Safe ignore
      }
    } catch (err: any) {
      alert(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDirectDownload = () => {
    if (!exportResult) return;
    const a = document.createElement('a');
    a.href = exportResult.downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShareEmail = async () => {
    if (!exportResult) return;

    // Check if Web Share API with files is supported
    if (
      navigator.canShare &&
      navigator.canShare({
        files: [new File([exportResult.blob], fileName, { type: 'application/pdf' })],
      })
    ) {
      try {
        await navigator.share({
          title: `PDF Export: ${folder.name}`,
          text: `Here is the compiled PDF document "${fileName}" with ${exportResult.pageCount} pages.`,
          files: [new File([exportResult.blob], fileName, { type: 'application/pdf' })],
        });
        return;
      } catch (e: any) {
        if (e.name !== 'AbortError') console.warn('Web Share failed', e);
      }
    }

    // Fallback: Mailto draft
    const subject = encodeURIComponent(`Compiled PDF: ${folder.name}`);
    const body = encodeURIComponent(
      `Hello,\n\nPlease find the compiled PDF document "${fileName}" (${formatBytes(
        exportResult.fileSize
      )}, ${exportResult.pageCount} pages).\n\nCloud Backup Link:\n${
        exportResult.cloudUrl || 'Saved to DocFlow Studio local storage'
      }\n\nGenerated with DocFlow Studio.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleCopyCloudLink = () => {
    if (!exportResult?.cloudUrl) return;
    navigator.clipboard.writeText(exportResult.cloudUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-xl w-full p-5 sm:p-6 space-y-5 animate-in fade-in duration-150 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Export Folder as 1 PDF
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Compile {folder.items.length} sequenced documents into a single optimized PDF
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-semibold p-1"
          >
            ✕
          </button>
        </div>

        {!exportResult ? (
          /* Step 1: Configuration Form */
          <div className="space-y-4">
            {/* File Name Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Output PDF Filename
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-900 dark:text-white"
              />
            </div>

            {/* Compression Settings Presets */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Compression & Quality Settings
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  Original: {formatBytes(originalBytes)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  {
                    id: 'max',
                    title: 'High (Archival)',
                    sub: '300 DPI · 95% Q',
                    badge: 'Full Res',
                  },
                  {
                    id: 'balanced',
                    title: 'Balanced',
                    sub: '150 DPI · 80% Q',
                    badge: 'Recommended',
                  },
                  {
                    id: 'compact',
                    title: 'Compact',
                    sub: '96 DPI · 60% Q',
                    badge: 'Small Size',
                  },
                  {
                    id: 'extreme',
                    title: 'Extreme B&W',
                    sub: 'Grayscale · 50% Q',
                    badge: 'Invoices',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handlePresetSelect(item.id as CompressionPreset)}
                    className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                      preset === item.id
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-1 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{item.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Granular Sliders (Customizable) */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Fine-Tune Parameters</span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {colorMode === 'grayscale' ? 'Grayscale' : 'Color'} · {Math.round(quality * 100)}% quality
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                    <span>JPEG Quality:</span>
                    <span className="font-mono tabular-nums">{Math.round(quality * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={quality}
                    onChange={(e) => {
                      setQuality(parseFloat(e.target.value));
                      setPreset('custom');
                    }}
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                    <span>Max Resolution:</span>
                    <span className="font-mono tabular-nums">{maxDimension}px</span>
                  </div>
                  <select
                    value={maxDimension}
                    onChange={(e) => {
                      setMaxDimension(parseInt(e.target.value));
                      setPreset('custom');
                    }}
                    className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none text-slate-900 dark:text-white"
                  >
                    <option value={2400}>2400px (Print / High Res)</option>
                    <option value={1600}>1600px (Balanced / Desktop)</option>
                    <option value={1200}>1200px (Standard / Email)</option>
                    <option value={800}>800px (Compact / Mobile)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Color Mode:</span>
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="colorMode"
                        checked={colorMode === 'color'}
                        onChange={() => {
                          setColorMode('color');
                          setPreset('custom');
                        }}
                        className="accent-indigo-600"
                      />
                      <span>Full Color</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="colorMode"
                        checked={colorMode === 'grayscale'}
                        onChange={() => {
                          setColorMode('grayscale');
                          setPreset('custom');
                        }}
                        className="accent-indigo-600"
                      />
                      <span>Grayscale (Smaller)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <span className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Page Orientation:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as any)}
                    className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:outline-none text-slate-900 dark:text-white"
                  >
                    <option value="auto">Auto (Match Image Aspect)</option>
                    <option value="a4">Standard A4</option>
                    <option value="letter">US Letter</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Target Destinations Checkboxes */}
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
              <label className="flex items-start gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToLocalDir}
                  onChange={(e) => setSaveToLocalDir(e.target.checked)}
                  className="mt-0.5 accent-indigo-600"
                />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Save to Custom Local Directory
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Saves directly to{' '}
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 underline" onClick={(e) => { e.preventDefault(); onOpenLocalDirModal(); }}>
                      {getSavedDirectoryName() || 'Downloads Folder'}
                    </span>{' '}
                    without file prompt.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCloudSync}
                  onChange={(e) => setAutoCloudSync(e.target.checked)}
                  className="mt-0.5 accent-indigo-600"
                />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Backup to Cloud Synchronization
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Syncs backup snapshot to {cloudConfig.provider.replace('_', ' ').toUpperCase()} ({cloudConfig.backupFolder}).
                  </p>
                </div>
              </label>
            </div>

            {/* Progress indicator during compilation */}
            {isCompiling && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200 font-medium">
                  <span>{progress.message}</span>
                  <span className="font-mono tabular-nums">
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <div className="w-full bg-indigo-200 dark:bg-indigo-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 dark:bg-indigo-400 h-full transition-all duration-150"
                    style={{
                      width: `${(progress.current / Math.max(progress.total, 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isCompiling}
                className="px-4 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartCompile}
                disabled={isCompiling}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isCompiling ? 'Compiling PDF...' : 'Compile & Export'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Post-Export Hub & Sharing Destinations */
          <div className="space-y-5 animate-in zoom-in-95 duration-150">
            {/* Success Summary Banner */}
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>PDF Compiled Successfully!</span>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                "{fileName}" is ready. All {exportResult.pageCount} documents have been merged in your specified sequence.
              </p>

              {/* Compression stats */}
              <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                <div className="p-2 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-emerald-100 dark:border-emerald-900">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase block font-semibold">
                    Original
                  </span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                    {formatBytes(originalBytes)}
                  </span>
                </div>
                <div className="p-2 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-emerald-100 dark:border-emerald-900">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase block font-semibold">
                    Final PDF
                  </span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {formatBytes(exportResult.fileSize)}
                  </span>
                </div>
                <div className="p-2 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-emerald-100 dark:border-emerald-900">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase block font-semibold">
                    Pages
                  </span>
                  <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 tabular-nums">
                    {exportResult.pageCount} pages
                  </span>
                </div>
              </div>
            </div>

            {/* Saved Destinations Confirmation */}
            <div className="space-y-2 text-xs">
              {exportResult.savedPath && (
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                  <FolderCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium text-slate-900 dark:text-white">Saved to Local Directory: </span>
                    <span className="font-mono text-slate-600 dark:text-slate-400 truncate">{exportResult.savedPath}</span>
                  </div>
                </div>
              )}

              {autoCloudSync && exportResult.cloudUrl && (
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Cloud className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium text-slate-900 dark:text-white">Cloud Sync Backup: </span>
                    <span className="text-slate-600 dark:text-slate-400">Mirrored to {cloudConfig.backupFolder}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 4 Primary Action Distribution Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleDirectDownload}
                className="w-full flex items-center justify-center gap-2 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Direct PDF Download</span>
              </button>

              <button
                type="button"
                onClick={handleShareEmail}
                className="w-full flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 rounded-lg font-semibold text-xs transition-colors shadow-xs"
              >
                <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Share via Email</span>
              </button>

              <button
                type="button"
                onClick={handleCopyCloudLink}
                className="w-full flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 rounded-lg font-semibold text-xs transition-colors shadow-xs"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-300 font-bold">Cloud Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Copy Cloud Storage Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="w-full flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 rounded-lg font-semibold text-xs transition-colors shadow-xs"
              >
                <QrCode className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>{showQr ? 'Hide QR Code' : 'Cross-Device QR Code'}</span>
              </button>
            </div>

            {/* QR Code expansion */}
            {showQr && exportResult.cloudUrl && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-center space-y-2">
                <div className="w-32 h-32 mx-auto bg-white p-2 rounded-lg border border-slate-300 flex items-center justify-center shadow-xs">
                  {/* Clean SVG QR Code Representation */}
                  <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                    <rect x="10" y="10" width="25" height="25" rx="3" />
                    <rect x="65" y="10" width="25" height="25" rx="3" />
                    <rect x="10" y="65" width="25" height="25" rx="3" />
                    <rect x="17" y="17" width="11" height="11" fill="white" />
                    <rect x="72" y="17" width="11" height="11" fill="white" />
                    <rect x="17" y="72" width="11" height="11" fill="white" />
                    <rect x="45" y="20" width="10" height="20" />
                    <rect x="45" y="55" width="20" height="10" />
                    <rect x="70" y="50" width="15" height="20" />
                    <rect x="50" y="75" width="15" height="15" />
                    <rect x="70" y="75" width="15" height="15" />
                  </svg>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Scan with your mobile camera to open or download directly on your phone.
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
