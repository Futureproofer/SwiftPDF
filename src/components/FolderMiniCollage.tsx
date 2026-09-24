/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FileText, Image as ImageIcon, Layers } from 'lucide-react';
import { Folder, DocFile } from '../types';

interface FolderMiniCollageProps {
  folder: Folder;
  filesMap: Map<string, DocFile>;
  maxPreviews?: number;
  className?: string;
}

/**
 * Dynamic folder preview thumbnail collage.
 * Displays a multi-document collage for instant visual identification of folder contents.
 */
export const FolderMiniCollage: React.FC<FolderMiniCollageProps> = ({
  folder,
  filesMap,
  maxPreviews = 4,
  className = '',
}) => {
  const sortedItems = [...folder.items].sort((a, b) => a.order - b.order);
  const totalItems = sortedItems.length;

  if (totalItems === 0) {
    return (
      <div
        className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-slate-100/70 dark:bg-slate-800/40 text-[10px] text-slate-400 dark:text-slate-500 font-medium border border-dashed border-slate-200 dark:border-slate-800 ${className}`}
      >
        <FileText className="w-3 h-3 text-slate-400 shrink-0" />
        <span className="truncate">Empty folder · Ready for documents</span>
      </div>
    );
  }

  // Get preview documents
  const previewDocs: DocFile[] = [];
  for (const item of sortedItems) {
    const doc = filesMap.get(item.fileId);
    if (doc) {
      previewDocs.push(doc);
      if (previewDocs.length >= maxPreviews) break;
    }
  }

  const remainingCount = totalItems - previewDocs.length;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Mini Collage Grid */}
      <div className="grid grid-cols-4 gap-1.5 h-12 w-full">
        {previewDocs.map((doc, idx) => {
          const isLastWithMore = idx === maxPreviews - 1 && remainingCount > 0;
          const isPdf = doc.type === 'application/pdf' || doc.name.toLowerCase().endsWith('.pdf');
          const thumbnailSrc = doc.dataUrl;

          return (
            <div
              key={doc.id || idx}
              className="relative rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs group/thumb flex items-center justify-center h-full"
              title={`${doc.name} (${isPdf ? `${doc.pageCount || 1} pages` : 'Image'})`}
            >
              {thumbnailSrc ? (
                <img
                  src={thumbnailSrc}
                  alt={doc.name}
                  className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-150"
                  loading="lazy"
                />
              ) : isPdf ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-gradient-to-b from-rose-50 to-rose-100/60 dark:from-rose-950/40 dark:to-rose-900/30 text-rose-600 dark:text-rose-400">
                  <FileText className="w-4 h-4 mb-0.5 text-rose-500" />
                  <span className="text-[8px] font-mono font-bold leading-none uppercase">
                    {doc.pageCount ? `${doc.pageCount}p` : 'PDF'}
                  </span>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-gradient-to-b from-emerald-50 to-emerald-100/60 dark:from-emerald-950/40 dark:to-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  <ImageIcon className="w-4 h-4 text-emerald-500" />
                  <span className="text-[8px] font-mono font-bold leading-none uppercase">IMG</span>
                </div>
              )}

              {/* Format tag badge */}
              <span className="absolute bottom-0.5 left-0.5 px-0.5 py-0.2 rounded text-[7px] font-mono font-black bg-black/60 text-white backdrop-blur-xs leading-none">
                {isPdf ? 'PDF' : 'IMG'}
              </span>

              {/* Overlay on the last thumbnail if more items exist */}
              {isLastWithMore && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xs flex items-center justify-center text-white font-mono font-bold text-[10px] tracking-tight border border-indigo-500/50">
                  <span>+{remainingCount + 1}</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Fill empty slots with subtle dashed outlines if fewer than 4 items */}
        {previewDocs.length < maxPreviews &&
          Array.from({ length: maxPreviews - previewDocs.length }).map((_, slotIdx) => (
            <div
              key={`empty-${slotIdx}`}
              className="rounded-md border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-center h-full text-slate-300 dark:text-slate-700"
            >
              <span className="text-[9px] font-mono select-none">·</span>
            </div>
          ))}
      </div>
    </div>
  );
};
