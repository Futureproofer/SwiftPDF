import React from 'react';
import { Upload, Plus, Sun, Moon, User, Clock } from 'lucide-react';
import { UserAccount } from '../types';
import { SwiftLogoBadge } from './SwiftIcon';

export type NavTab = 'dashboard' | 'folders' | 'uploads' | 'sync' | 'tools';

interface TopBarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenUpload: () => void;
  onOpenNewFolder: () => void;
  syncCount: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  account: UserAccount;
  onOpenAccount: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenUpload,
  onOpenNewFolder,
  syncCount,
  darkMode,
  onToggleDarkMode,
  account,
  onOpenAccount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('dashboard');
          }}
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shrink-0 group"
        >
          <SwiftLogoBadge size="md" className="group-hover:scale-105 transition-transform" />
          <div className="flex items-baseline gap-1.5">
            <span className="font-black tracking-tight text-slate-900 dark:text-white text-lg">
              Swift<span className="text-indigo-600 dark:text-indigo-400 font-extrabold">PDF</span>
            </span>
            <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              PRO
            </span>
          </div>
        </a>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`transition-colors whitespace-nowrap pb-1 ${
              activeTab === 'dashboard'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onSelectTab('folders')}
            className={`transition-colors whitespace-nowrap pb-1 ${
              activeTab === 'folders'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Folders & Export
          </button>
          <button
            onClick={() => onSelectTab('uploads')}
            className={`transition-colors whitespace-nowrap pb-1 ${
              activeTab === 'uploads'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Uploads Gallery
          </button>
          <button
            onClick={() => onSelectTab('sync')}
            className={`transition-colors whitespace-nowrap pb-1 flex items-center gap-1.5 ${
              activeTab === 'sync'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Cloud Sync</span>
            {syncCount > 0 && (
              <span className="text-xs font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                ({syncCount})
              </span>
            )}
          </button>
          <button
            onClick={() => onSelectTab('tools')}
            className={`transition-colors whitespace-nowrap pb-1 ${
              activeTab === 'tools'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tools Guide
          </button>
        </nav>

        {/* Zone 3: Actions + Account / 24h Purge Status + Dark Mode Toggle */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Account & 24h Purge Status Button */}
          <button
            type="button"
            onClick={onOpenAccount}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              account.isLoggedIn
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/60'
            }`}
            title={
              account.isLoggedIn
                ? account.autoPurgeImages
                  ? 'Account: 24h Image Purge Toggle is ON'
                  : 'Account: Uploads Kept Indefinitely (Purge OFF)'
                : 'Public Mode: 24-Hour Image Auto-Purge is ACTIVE by default'
            }
          >
            {account.isLoggedIn ? (
              <>
                <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline font-medium max-w-[100px] truncate">
                  {account.name || 'Account'}
                </span>
                {account.autoPurgeImages ? (
                  <span className="px-1 py-0.2 rounded text-[10px] bg-amber-500 text-white font-mono">
                    24h Purge
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">24h Purge (Public)</span>
                <span className="sm:hidden font-mono text-[10px]">24h</span>
              </>
            )}
          </button>

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenNewFolder}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap"
            title="Create a new project or date folder"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Folder</span>
          </button>
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Upload Documents</span>
            <span className="xs:hidden">Upload</span>
          </button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex items-center justify-around px-2 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 text-xs font-medium text-slate-600 dark:text-slate-300">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`py-1 px-2 ${activeTab === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}
        >
          Dashboard
        </button>
        <button
          onClick={() => onSelectTab('folders')}
          className={`py-1 px-2 ${activeTab === 'folders' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}
        >
          Folders
        </button>
        <button
          onClick={() => onSelectTab('uploads')}
          className={`py-1 px-2 ${activeTab === 'uploads' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}
        >
          Uploads
        </button>
        <button
          onClick={() => onSelectTab('sync')}
          className={`py-1 px-2 ${activeTab === 'sync' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}
        >
          Cloud Sync
        </button>
        <button
          onClick={() => onSelectTab('tools')}
          className={`py-1 px-2 ${activeTab === 'tools' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}
        >
          Guide
        </button>
      </div>
    </header>
  );
};

