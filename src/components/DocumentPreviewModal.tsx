import React, { useState, useEffect } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Download,
  FileText,
} from 'lucide-react';
import { DocFile, Folder } from '../types';
import { formatBytes } from '../utils/formatters';

interface DocumentPreviewModalProps {
  file: DocFile | null;
  folderSequence?: Folder | null;
  filesMap: Map<string, DocFile>;
  onClose: () => void;
  onSelectFile?: (file: DocFile) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  file,
  folderSequence,
  filesMap,
  onClose,
  onSelectFile,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // If viewing a sequence inside a folder
  const sequenceItems = folderSequence
    ? [...folderSequence.items].sort((a, b) => a.order - b.order)
    : [];
  const currentSequenceIndex = sequenceItems.findIndex((i) => i.fileId === file?.id);

  useEffect(() => {
    // Reset zoom and rotation on file change
    setZoom(1);
    setRotation(0);
  }, [file?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && currentSequenceIndex < sequenceItems.length - 1) {
        goToNext();
      }
      if (e.key === 'ArrowLeft' && currentSequenceIndex > 0) {
        goToPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSequenceIndex, sequenceItems.length]);

  if (!file) return null;

  const isPdf = file.type === 'application/pdf';

  const goToPrev = () => {
    if (currentSequenceIndex > 0) {
      const prevItem = sequenceItems[currentSequenceIndex - 1];
      const prevFile = filesMap.get(prevItem.fileId);
      if (prevFile && onSelectFile) onSelectFile(prevFile);
    }
  };

  const goToNext = () => {
    if (currentSequenceIndex < sequenceItems.length - 1) {
      const nextItem = sequenceItems[currentSequenceIndex + 1];
      const nextFile = filesMap.get(nextItem.fileId);
      if (nextFile && onSelectFile) onSelectFile(nextFile);
    }
  };

  const handleDownloadOriginal = () => {
    if (!file.dataUrl) return;
    const a = document.createElement('a');
    a.href = file.dataUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-2 sm:p-4">
      {/* Top Header Bar */}
      <div className="w-full max-w-5xl bg-slate-900/90 text-white rounded-t-xl px-4 py-3 flex items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          {folderSequence && currentSequenceIndex !== -1 && (
            <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-mono text-xs font-bold">
              Page {currentSequenceIndex + 1} of {sequenceItems.length}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-slate-100 truncate max-w-sm sm:max-w-md">
              {file.name}
            </h3>
            <p className="text-[11px] text-slate-400 font-mono tabular-nums">
              {formatBytes(file.size)} · {isPdf ? 'PDF' : file.type.split('/')[1]?.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Zoom, Rotation, Download, Close Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-400 w-12 text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-xs font-mono"
            title="Reset Zoom"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownloadOriginal}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Download document"
          >
            <Download className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-700 mx-1" />
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-rose-600 text-slate-300 hover:text-white transition-colors"
            title="Close Preview (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Preview Viewport */}
      <div className="w-full max-w-5xl flex-1 bg-slate-950/95 overflow-auto flex items-center justify-center p-4 relative select-none">
        {/* Sequence Prev Button */}
        {folderSequence && currentSequenceIndex > 0 && (
          <button
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white shadow-lg transition-colors z-20"
            title="Previous Document (Left Arrow)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Sequence Next Button */}
        {folderSequence && currentSequenceIndex < sequenceItems.length - 1 && (
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white shadow-lg transition-colors z-20"
            title="Next Document (Right Arrow)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Display Canvas or Embedded Content */}
        <div
          className="transition-transform duration-150 origin-center max-w-full max-h-full flex items-center justify-center"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
        >
          {file.dataUrl ? (
            isPdf ? (
              <iframe
                src={`${file.dataUrl}#toolbar=0`}
                className="w-[700px] h-[800px] max-w-full bg-white rounded shadow-2xl border-0"
                title={file.name}
              />
            ) : (
              <img
                src={file.dataUrl}
                alt={file.name}
                referrerPolicy="no-referrer"
                className="max-h-[75vh] max-w-[85vw] object-contain rounded shadow-2xl bg-white"
              />
            )
          ) : (
            <div className="text-center text-slate-400 p-12 bg-slate-900 rounded-xl">
              <FileText className="w-16 h-16 mx-auto mb-3 text-indigo-400 opacity-60" />
              <p className="text-sm font-medium text-slate-200">{file.name}</p>
              <p className="text-xs text-slate-500 mt-1">Binary document cached in database</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom sequence thumbnails bar if viewing folder */}
      {folderSequence && sequenceItems.length > 1 && (
        <div className="w-full max-w-5xl bg-slate-900 px-4 py-2 rounded-b-xl border-t border-slate-800 flex items-center justify-center gap-2 overflow-x-auto">
          {sequenceItems.map((item, idx) => {
            const f = filesMap.get(item.fileId);
            if (!f) return null;
            const isCur = f.id === file.id;
            return (
              <button
                key={item.fileId}
                onClick={() => onSelectFile && onSelectFile(f)}
                className={`relative w-10 h-10 rounded border transition-all shrink-0 overflow-hidden ${
                  isCur
                    ? 'border-indigo-500 ring-2 ring-indigo-500/50 scale-105'
                    : 'border-slate-700 opacity-60 hover:opacity-100'
                }`}
                title={`#${idx + 1}: ${f.name}`}
              >
                {f.dataUrl ? (
                  <img
                    src={f.dataUrl}
                    alt={f.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-mono">
                    #{idx + 1}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 bg-black/70 text-white font-mono text-[9px] px-1">
                  {idx + 1}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
