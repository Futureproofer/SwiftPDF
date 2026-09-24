/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useId } from 'react';
import {
  FileArchive,
  Upload,
  Zap,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  Sliders,
  ChevronDown,
  Cloud,
  Eye,
  Check,
  HardDrive,
  X,
} from 'lucide-react';
import { DocFile, ExportHistoryItem, CloudSyncConfig } from '../types';
import { formatBytes } from '../utils/formatters';
import {
  compressStandalonePdf,
  estimateCompressedPdfSize,
  CompressionLevel,
  StandaloneCompressionResult,
} from '../utils/pdfGenerator';
import { SwiftIcon } from './SwiftIcon';

interface PDFCompressorWidgetProps {
  files: DocFile[];
  onExportSuccess?: (item: ExportHistoryItem) => Promise<void> | void;
  cloudConfig?: CloudSyncConfig;
  onSyncSingleItem?: (item: ExportHistoryItem) => Promise<void>;
  onPreviewFile?: (file: DocFile) => void;
  className?: string;
}

interface LoadedPdfSource {
  name: string;
  size: number;
  blob: Blob;
  pageCount?: number;
  sourceDocId?: string;
}

export const PDFCompressorWidget: React.FC<PDFCompressorWidgetProps> = ({
  files,
  onExportSuccess,
  cloudConfig,
  onSyncSingleItem,
  onPreviewFile,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const [selectedPdf, setSelectedPdf] = useState<LoadedPdfSource | null>(null);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('balanced');
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ percent: number; message: string }>({
    percent: 0,
    message: '',
  });
  const [result, setResult] = useState<StandaloneCompressionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState<boolean>(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState<boolean>(false);
  const [driveSynced, setDriveSynced] = useState<boolean>(false);

  // Filter existing uploaded PDF documents in the library
  const galleryPdfFiles = files.filter(
    (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
  );

  // Handle direct file upload
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('Please select a valid PDF file (.pdf)');
      return;
    }

    setErrorMessage(null);
    setResult(null);
    setDriveSynced(false);

    setSelectedPdf({
      name: file.name,
      size: file.size,
      blob: file,
      pageCount: undefined,
    });

    if (e.target) e.target.value = '';
  };

  // Drag and Drop handling (files from OS or dragged elements from gallery)
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // 1. Check for files dragged from desktop
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        setErrorMessage(null);
        setResult(null);
        setDriveSynced(false);
        setSelectedPdf({
          name: file.name,
          size: file.size,
          blob: file,
        });
        return;
      } else {
        setErrorMessage('Only PDF documents are supported in the PDF Compressor.');
        return;
      }
    }

    // 2. Check for dragged file from the gallery
    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const parsed = JSON.parse(jsonData);
        if (parsed.fileId) {
          const doc = files.find((f) => f.id === parsed.fileId);
          if (doc && (doc.type === 'application/pdf' || doc.name.toLowerCase().endsWith('.pdf'))) {
            handleSelectGalleryDoc(doc);
            return;
          }
        }
      }
    } catch {}

    const docflowId = e.dataTransfer.getData('application/docflow-file-id');
    if (docflowId) {
      const doc = files.find((f) => f.id === docflowId);
      if (doc && (doc.type === 'application/pdf' || doc.name.toLowerCase().endsWith('.pdf'))) {
        handleSelectGalleryDoc(doc);
        return;
      }
    }

    const textData = e.dataTransfer.getData('text/plain');
    if (textData) {
      const doc = files.find((f) => f.id === textData);
      if (doc && (doc.type === 'application/pdf' || doc.name.toLowerCase().endsWith('.pdf'))) {
        handleSelectGalleryDoc(doc);
      }
    }
  };

  // Pick PDF from gallery
  const handleSelectGalleryDoc = async (doc: DocFile) => {
    setShowGalleryPicker(false);
    setErrorMessage(null);
    setResult(null);
    setDriveSynced(false);

    let blob: Blob | null = doc.blob || null;
    if (!blob && doc.dataUrl) {
      try {
        const resp = await fetch(doc.dataUrl);
        blob = await resp.blob();
      } catch (err) {
        console.error('Failed to read document blob from gallery:', err);
      }
    }

    if (!blob) {
      setErrorMessage(`Unable to access binary data for "${doc.name}".`);
      return;
    }

    setSelectedPdf({
      name: doc.name,
      size: doc.size || blob.size,
      blob,
      pageCount: doc.pageCount,
      sourceDocId: doc.id,
    });
  };

  // Execute compression
  const handleCompress = async () => {
    if (!selectedPdf) return;

    setIsCompressing(true);
    setErrorMessage(null);
    setProgress({ percent: 5, message: 'Initiating compression engine...' });

    try {
      const compressionResult = await compressStandalonePdf(
        selectedPdf.blob,
        selectedPdf.name,
        compressionLevel,
        (percent, message) => {
          setProgress({ percent, message });
        }
      );

      setResult(compressionResult);

      // Automatically register into Export History so it appears in "Recent PDF Exports" widget
      if (onExportSuccess) {
        const exportItem: ExportHistoryItem = {
          id: `compress-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          folderId: 'direct-compress',
          folderName: 'Direct PDF Compression',
          fileName: compressionResult.fileName,
          exportedAt: Date.now(),
          fileSize: compressionResult.compressedBytes,
          pageCount: compressionResult.pageCount || selectedPdf.pageCount || 1,
          compressionPreset: compressionLevel === 'maximum' ? 'extreme' : compressionLevel === 'light' ? 'max' : 'balanced',
          savedToLocalDir: false,
          downloadUrl: compressionResult.downloadUrl,
          blob: compressionResult.blob,
          cloudSynced: false,
        };
        await onExportSuccess(exportItem);
      }
    } catch (err: any) {
      console.error('PDF compression failed:', err);
      setErrorMessage(err?.message || 'Failed to compress PDF. The document may be password-protected.');
    } finally {
      setIsCompressing(false);
    }
  };

  // Download compressed file
  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.downloadUrl;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Sync to Google Drive
  const handleSyncToDrive = async () => {
    if (!result || !onSyncSingleItem) return;
    setIsSyncingDrive(true);
    try {
      const item: ExportHistoryItem = {
        id: `compress-${Date.now()}`,
        folderId: 'direct-compress',
        folderName: 'Direct PDF Compression',
        fileName: result.fileName,
        exportedAt: Date.now(),
        pageCount: result.pageCount || 1,
        fileSize: result.compressedBytes,
        compressionPreset: compressionLevel === 'maximum' ? 'extreme' : compressionLevel === 'light' ? 'max' : 'balanced',
        savedToLocalDir: false,
        downloadUrl: result.downloadUrl,
        blob: result.blob,
        cloudSynced: false,
      };
      await onSyncSingleItem(item);
      setDriveSynced(true);
    } catch (err) {
      console.error('Failed to sync compressed PDF to Google Drive:', err);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setSelectedPdf(null);
    setResult(null);
    setErrorMessage(null);
    setDriveSynced(false);
    setProgress({ percent: 0, message: '' });
  };

  // Pre-compression size calculation
  const estimate = selectedPdf
    ? estimateCompressedPdfSize(selectedPdf.size, compressionLevel)
    : null;

  return (
    <div
      className={`bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col transition-all ${className}`}
    >
      {/* Widget Header Ribbon */}
      <div className="bg-slate-50 dark:bg-slate-800/80 px-4 sm:px-5 py-3.5 border-b-2 border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <FileArchive className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                PDF Compressor
              </h3>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/90 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                SWIFT
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Direct upload & instant size reduction
            </p>
          </div>
        </div>

        {selectedPdf && !result && (
          <button
            onClick={handleReset}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
            title="Clear and choose another PDF"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Widget Body - Resizes to free space with dark theme slider */}
      <div className="p-4 space-y-4 max-h-[480px] sm:max-h-[540px] overflow-y-auto dark-slider">
        {/* Hidden Native File Input */}
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* State 1: No PDF Selected - Drop Zone & Gallery Selector */}
        {!selectedPdf && (
          <div className="space-y-3">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-150 ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/60 scale-[0.99]'
                  : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-850/50'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2 shadow-2xs">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Drop PDF here or Browse
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Upload a single PDF to compress directly
              </p>
            </div>

            {/* Quick Select from Gallery Button */}
            {galleryPdfFiles.length > 0 && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowGalleryPicker(!showGalleryPicker)}
                  className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all shadow-2xs cursor-pointer ${
                    showGalleryPicker
                      ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Select from Gallery ({galleryPdfFiles.length} PDFs)</span>
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      showGalleryPicker ? 'rotate-180 text-indigo-500' : ''
                    }`}
                  />
                </button>

                {/* Expandable Gallery PDF Drawer with Dark Theme Slider - Never cut off */}
                {showGalleryPicker && (
                  <div className="bg-slate-50 dark:bg-slate-950/80 border-2 border-indigo-200 dark:border-indigo-900/60 rounded-xl p-3 space-y-2 shadow-inner animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 pb-1 border-b border-slate-200/80 dark:border-slate-800">
                      <span>Choose a PDF from your library ({galleryPdfFiles.length}):</span>
                      <button
                        type="button"
                        onClick={() => setShowGalleryPicker(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                        title="Close gallery picker"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Scrollable PDF List with Dark Slider */}
                    <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 dark-slider">
                      {galleryPdfFiles.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => handleSelectGalleryDoc(doc)}
                          className="w-full text-left px-2.5 py-2 text-xs rounded-lg flex items-center justify-between bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800/90 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group cursor-pointer shadow-2xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                              {doc.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                              {formatBytes(doc.size)}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              Select
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* State 2: PDF Selected - Pre-Compression Size Inspection & Mode Picker */}
        {selectedPdf && !result && (
          <div className="space-y-4">
            {/* Selected Document Info Bar */}
            <div className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {selectedPdf.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Original Size:{' '}
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                      {formatBytes(selectedPdf.size)}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 font-medium"
              >
                Change
              </button>
            </div>

            {/* PRE-COMPRESSION FILESIZE ESTIMATION (User Request) */}
            {estimate && (
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/70 via-white to-emerald-50/60 dark:from-indigo-950/40 dark:via-slate-900 dark:to-emerald-950/30 border-2 border-indigo-200/80 dark:border-indigo-900/60 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Estimated Output Size</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    -{estimate.estimatedReductionPercent}% estimated
                  </span>
                </div>

                {/* Prominent Before vs. Estimated After Comparison */}
                <div className="grid grid-cols-2 gap-2 text-center pt-1">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-medium text-slate-400 block uppercase tracking-wider">
                      Current Size
                    </span>
                    <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                      {formatBytes(estimate.originalBytes)}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block uppercase tracking-wider">
                      Output Size
                    </span>
                    <span className="text-sm font-mono font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
                      ~{formatBytes(estimate.estimatedBytes)}
                    </span>
                  </div>
                </div>

                {/* Progress bar visual comparison */}
                <div className="space-y-1 pt-1">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${100 - estimate.estimatedReductionPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Compressed Stream</span>
                    <span>Saved ~{formatBytes(estimate.originalBytes - estimate.estimatedBytes)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Compression Level Selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Compression Level
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setCompressionLevel('light')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border-2 transition-all cursor-pointer ${
                    compressionLevel === 'light'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div>Light</div>
                  <div className="text-[9px] font-normal text-slate-400">~25% off</div>
                </button>

                <button
                  type="button"
                  onClick={() => setCompressionLevel('balanced')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border-2 transition-all cursor-pointer ${
                    compressionLevel === 'balanced'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div>Balanced</div>
                  <div className="text-[9px] font-normal text-slate-400">~50% off</div>
                </button>

                <button
                  type="button"
                  onClick={() => setCompressionLevel('maximum')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold border-2 transition-all cursor-pointer ${
                    compressionLevel === 'maximum'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div>Maximum</div>
                  <div className="text-[9px] font-normal text-slate-400">~70% off</div>
                </button>
              </div>
            </div>

            {/* Action Button */}
            <button
              type="button"
              disabled={isCompressing}
              onClick={handleCompress}
              className={`w-full py-2.5 px-4 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                isCompressing
                  ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] shadow-indigo-600/20'
              }`}
            >
              {isCompressing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{progress.message || 'Compressing PDF...'}</span>
                </>
              ) : (
                <>
                  <SwiftIcon className="w-4 h-4 text-cyan-300" />
                  <span>Compress & Output PDF</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* State 3: Compression Result Output */}
        {result && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Success Card */}
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 text-center space-y-2">
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>

              <div>
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Compression Successful!
                </h4>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate max-w-[240px] mx-auto mt-0.5">
                  {result.fileName}
                </p>
              </div>

              {/* Verified File Size Metrics */}
              <div className="grid grid-cols-2 gap-2 pt-2 text-left">
                <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800/60">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">
                    Original
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {formatBytes(result.originalBytes)}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-800/60">
                  <span className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                    Compressed
                  </span>
                  <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-300">
                    {formatBytes(result.compressedBytes)}
                  </span>
                </div>
              </div>

              {/* Space Savings Badge */}
              <div className="py-1 px-2 rounded-md bg-emerald-100/90 dark:bg-emerald-900/50 text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-center gap-1.5">
                <span>Reduced by {result.reductionPercent}%</span>
                <span>·</span>
                <span>Saved {formatBytes(result.savedBytes)}</span>
              </div>
            </div>

            {/* Output Actions */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleDownload}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Compressed PDF</span>
              </button>

              {/* Sync to Google Drive Button if connected */}
              {cloudConfig?.googleConnected && onSyncSingleItem && (
                <button
                  type="button"
                  disabled={isSyncingDrive || driveSynced}
                  onClick={handleSyncToDrive}
                  className={`w-full py-2 px-3 border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    driveSynced
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    {driveSynced
                      ? 'Backed up to Google Drive'
                      : isSyncingDrive
                      ? 'Backing up to Drive...'
                      : 'Backup to Google Drive'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2 px-3 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-medium text-center transition-colors"
              >
                Compress Another PDF
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
