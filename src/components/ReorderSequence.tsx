import React, { useState } from 'react';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  RotateCw,
  Eye,
  Trash2,
  Plus,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { DocFile, Folder, FolderItem } from '../types';
import { formatBytes } from '../utils/formatters';

interface ReorderSequenceProps {
  folder: Folder;
  filesMap: Map<string, DocFile>;
  onUpdateItems: (newItems: FolderItem[]) => void;
  onPreviewFile: (file: DocFile) => void;
  onOpenAddDocumentsModal: () => void;
}

export const ReorderSequence: React.FC<ReorderSequenceProps> = ({
  folder,
  filesMap,
  onUpdateItems,
  onPreviewFile,
  onOpenAddDocumentsModal,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const items = [...folder.items].sort((a, b) => a.order - b.order);

  const moveItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= items.length) return;
    const reordered = [...items];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    // Re-index orders
    const updated = reordered.map((item, idx) => ({
      ...item,
      order: idx,
    }));
    onUpdateItems(updated);
  };

  const rotateItem = (idx: number) => {
    const reordered = [...items];
    const currentRot = reordered[idx].rotation || 0;
    reordered[idx] = {
      ...reordered[idx],
      rotation: (currentRot + 90) % 360,
    };
    onUpdateItems(reordered);
  };

  const removeItem = (idx: number) => {
    const reordered = [...items];
    reordered.splice(idx, 1);
    const updated = reordered.map((item, i) => ({
      ...item,
      order: i,
    }));
    onUpdateItems(updated);
  };

  const handleDragStart = (idx: number, e: React.DragEvent) => {
    setDraggedIndex(idx);
    e.dataTransfer.setData('text/plain', idx.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex === null || draggedIndex === idx) return;
    setDragOverIndex(idx);
  };

  const handleDrop = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex !== null && draggedIndex !== idx) {
      moveItem(draggedIndex, idx);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  if (items.length === 0) {
    return (
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-8 text-center bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
        <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
          <FileText className="w-5 h-5 text-indigo-500" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">This folder has no documents yet</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Add documents from your uploads gallery to sequence and compile into a single PDF.
          </p>
        </div>
        <button
          onClick={onOpenAddDocumentsModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Documents from Library</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 pb-1">
        <span>
          Drag handles or use arrows to organize page order in the compiled PDF:
        </span>
        <button
          onClick={onOpenAddDocumentsModal}
          className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold inline-flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add More Documents</span>
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => {
          const file = filesMap.get(item.fileId);
          if (!file) return null;
          const isPdf = file.type === 'application/pdf';
          const isDragged = draggedIndex === idx;
          const isDragOver = dragOverIndex === idx;
          const rotation = item.rotation || 0;

          return (
            <div
              key={`${item.fileId}_${idx}`}
              draggable
              onDragStart={(e) => handleDragStart(idx, e)}
              onDragOver={(e) => handleDragOver(idx, e)}
              onDrop={(e) => handleDrop(idx, e)}
              onDragEnd={handleDragEnd}
              className={`bg-white dark:bg-slate-850 border-2 rounded-xl p-3 flex items-center justify-between gap-3 transition-all duration-150 ${
                isDragged
                  ? 'opacity-40 border-indigo-400'
                  : isDragOver
                  ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50 scale-[1.01]'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
              }`}
            >
              {/* Left Zone: Drag handle + Order sequence number */}
              <div className="flex items-center gap-2 shrink-0">
                <div
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    handleDragStart(idx, e);
                  }}
                  className="cursor-grab active:cursor-grabbing text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 touch-none select-none transition-colors"
                  title="Drag handle to reorder"
                >
                  <GripVertical className="w-4 h-4 pointer-events-none select-none" />
                </div>
                <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700">
                  #{idx + 1}
                </span>
              </div>

              {/* Middle Zone: Thumbnail & Document Meta */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0 relative transition-transform duration-200"
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  {file.dataUrl ? (
                    <img
                      src={file.dataUrl}
                      alt={file.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : isPdf ? (
                    <FileText className="w-5 h-5 text-rose-500" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-indigo-500" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={file.name}>
                    {file.name}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                    <span>{isPdf ? 'PDF' : file.type.split('/')[1]?.toUpperCase()}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatBytes(file.size)}</span>
                    {rotation > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-600 dark:text-amber-400 font-sans font-medium">Rotated {rotation}°</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Zone: Reorder Arrows, Rotate, Preview, Remove */}
              <div
                className="flex items-center gap-1 shrink-0"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* Move Up */}
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveItem(idx, idx - 1)}
                  className={`p-1.5 rounded-md transition-colors ${
                    idx === 0
                      ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Move document up"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>

                {/* Move Down */}
                <button
                  type="button"
                  disabled={idx === items.length - 1}
                  onClick={() => moveItem(idx, idx + 1)}
                  className={`p-1.5 rounded-md transition-colors ${
                    idx === items.length - 1
                      ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Move document down"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {/* Rotate 90° */}
                <button
                  type="button"
                  onClick={() => rotateItem(idx)}
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-md transition-colors"
                  title="Rotate page 90 degrees clockwise"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>

                {/* Inspect Preview */}
                <button
                  type="button"
                  onClick={() => onPreviewFile(file)}
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-md transition-colors"
                  title="Inspect document"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>

                {/* Remove from folder sequence */}
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors"
                  title="Remove from folder sequence"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
