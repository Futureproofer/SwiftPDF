import React, { useState } from 'react';
import {
  Cpu,
  HardDrive,
  Cloud,
  Share2,
  FileCode,
  Layers,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface ToolsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ToolsGuideModal: React.FC<ToolsGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Tools' },
    { id: 'pdf', label: 'PDF Compilation' },
    { id: 'storage', label: 'Local File System' },
    { id: 'sync', label: 'Cloud Sync & Daemons' },
    { id: 'compression', label: 'Image Compression' },
    { id: 'crossplatform', label: 'Cross-Platform App Wrappers' },
  ];

  const tools = [
    {
      category: 'pdf',
      name: 'pdf-lib',
      badge: 'Active In This App',
      tagline: 'Zero-server in-browser PDF manipulation and compilation in pure TypeScript.',
      description:
        'Allows creating, modifying, merging, and drawing vector graphics and images into standard PDF documents entirely in the browser without sending data to external backends.',
      compatibility: 'Chrome, Safari, Firefox, Edge, iOS, Android (100% universal)',
      useCase: 'Used in SwiftPDF to merge sequenced photos and existing PDFs into 1 document.',
      link: 'https://github.com/Hopding/pdf-lib',
    },
    {
      category: 'pdf',
      name: 'MuPDF (WebAssembly)',
      badge: 'High Performance',
      tagline: 'Ultra-fast C-compiled PDF rasterization engine packaged as WebAssembly.',
      description:
        'Developed by Artifex, MuPDF compiles to WASM to render, flatten, redact, and verify multi-gigabyte complex PDFs with near-native hardware speed.',
      compatibility: 'Any WebAssembly-compliant browser (Desktop & Mobile)',
      useCase: 'High-throughput enterprise document processing & raster previewing.',
      link: 'https://mupdf.com/',
    },
    {
      category: 'storage',
      name: 'File System Access API',
      badge: 'Active In This App',
      tagline: 'Native desktop folder picker and direct disk read/write capability.',
      description:
        'Standard W3C API allowing web apps to prompt users to choose a custom local directory once, and then write compiled files straight to that folder with zero extra clicks.',
      compatibility: 'Google Chrome, Microsoft Edge, Opera, Brave (Desktop)',
      useCase: 'Powers the "Custom Local Directory" feature to auto-save final PDFs without download prompts.',
      link: 'https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API',
    },
    {
      category: 'storage',
      name: 'Origin Private File System (OPFS)',
      badge: 'W3C Universal Standard',
      tagline: 'Private, ultra-high-speed virtual file system with synchronous access handles.',
      description:
        'Provides an isolated, sandboxed file system optimized for fast bulk writes, SQLite databases, and large media caches that persist across browser restarts.',
      compatibility: 'Chrome, Safari (iOS 15.2+ & macOS), Firefox 111+',
      useCase: 'Zero-latency local persistent document cache for mobile and Safari where full directory picker is restricted.',
      link: 'https://web.dev/articles/origin-private-file-system',
    },
    {
      category: 'storage',
      name: 'IndexedDB + Dexie.js',
      badge: 'Active In This App',
      tagline: 'Structured client-side database storing gigabytes of binary Blobs and metadata.',
      description:
        'Unlike localStorage which is capped at ~5MB of strings, IndexedDB stores full binary documents, PDFs, and high-res photos offline indefinitely.',
      compatibility: 'Every modern browser since 2012 (100% universal)',
      useCase: 'DocFlow Studio stores all uploaded documents and export catalogs locally inside IndexedDB.',
      link: 'https://dexie.org/',
    },
    {
      category: 'sync',
      name: 'rclone',
      badge: 'The Gold Standard CLI',
      tagline: 'Universal sync daemon syncing local directories to 40+ cloud storage backends.',
      description:
        'A command line utility in Go that continuously syncs, mirrors, and backups local directories to Google Drive, Dropbox, Amazon S3, OneDrive, Backblaze B2, Nextcloud, and SFTP.',
      compatibility: 'Windows, macOS, Linux, FreeBSD, Android (via Termux)',
      useCase: 'Point rclone to your custom DocFlow local export folder to automatically mirror every compiled PDF to your cloud provider.',
      link: 'https://rclone.org/',
    },
    {
      category: 'sync',
      name: 'Syncthing',
      badge: 'Decentralized P2P',
      tagline: 'Continuous peer-to-peer file synchronization without 3rd party cloud servers.',
      description:
        'Synchronizes folders in real-time between your desktop laptop, home NAS, and Android phone using end-to-end TLS encryption with zero recurring subscription fees.',
      compatibility: 'Windows, macOS, Linux, Android, iOS (Möbius Sync)',
      useCase: 'Auto-sync your DocFlow exports folder between your computer and mobile phone instantly over LAN or Internet.',
      link: 'https://syncthing.net/',
    },
    {
      category: 'compression',
      name: 'OffscreenCanvas & MozJPEG WASM',
      badge: 'Active In This App',
      tagline: 'High-ratio image downsampling and chroma subsampling prior to PDF packaging.',
      description:
        'Processes high-resolution 20MB phone photos down to ~150-300KB clean document pages using browser canvas workers and optimized JPEG compression.',
      compatibility: 'All modern browsers and web workers',
      useCase: 'Powers the "Compact" and "Extreme Grayscale" presets in DocFlow to achieve 80% file size reductions.',
      link: 'https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas',
    },
    {
      category: 'compression',
      name: 'Tesseract.js (On-Device OCR)',
      badge: 'Searchable PDFs',
      tagline: 'Optical Character Recognition in pure JavaScript and WebAssembly.',
      description:
        'Extracts text from scanned paper receipts and invoices directly on-device in 100+ languages, enabling the compilation of searchable sandwich PDFs.',
      compatibility: 'Universal Web, Node.js, and Mobile browsers',
      useCase: 'Upgrades static photos of contracts into fully searchable text-selectable PDF pages.',
      link: 'https://tesseract.projectnaptha.com/',
    },
    {
      category: 'crossplatform',
      name: 'Capacitor (Ionic)',
      badge: 'Native Mobile Packaging',
      tagline: 'Converts this web application into native iOS App Store and Android Google Play apps.',
      description:
        'Exposes native iOS Files and Android Document Storage APIs with zero rewrite, providing access to the native camera scanner and push notifications.',
      compatibility: 'iOS (Swift/ObjC) & Android (Kotlin/Java)',
      useCase: 'Distribute SwiftPDF as a native app on iPhone, iPad, and Android phones.',
      link: 'https://capacitorjs.com/',
    },
    {
      category: 'crossplatform',
      name: 'Tauri',
      badge: 'Lightweight Desktop App',
      tagline: 'Builds native Windows .exe, macOS .dmg, and Linux apps using web frontends with a tiny Rust core.',
      description:
        'Produces compact ~5MB native desktop installers with direct system file-watcher integration, system tray minimization, and zero Chromium bloat.',
      compatibility: 'Windows 10/11, macOS (Intel & Apple Silicon), Linux',
      useCase: 'Package SwiftPDF into a native desktop utility that monitors designated scanning folders.',
      link: 'https://tauri.app/',
    },
  ];

  const filteredTools =
    activeCategory === 'all'
      ? tools
      : tools.filter((t) => t.category === activeCategory);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-3xl w-full p-5 sm:p-6 space-y-4 animate-in fade-in duration-150 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Recommended Tools & Cross-Platform Architecture Guide
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Effective tools and ecosystems for high-performance PDF management and cloud synchronization
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-semibold">
            ✕
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 text-xs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Tools Grid List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {filteredTools.map((tool) => (
            <div
              key={tool.name}
              className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all space-y-2 shadow-2xs"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{tool.name}</h4>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700">
                      {tool.badge}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">{tool.tagline}</p>
                </div>

                <a
                  href={tool.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 shrink-0"
                >
                  <span>Docs</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{tool.description}</p>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">How to use: </span>
                  <span>{tool.useCase}</span>
                </div>
                <div className="shrink-0 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                  {tool.compatibility}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 dark:text-slate-400">
            Tip: Combine <strong className="text-slate-700 dark:text-slate-200">DocFlow Studio</strong> with <strong className="text-slate-700 dark:text-slate-200">rclone</strong> or <strong className="text-slate-700 dark:text-slate-200">Syncthing</strong> for fully automated continuous local-to-cloud backups.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors shadow-xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
