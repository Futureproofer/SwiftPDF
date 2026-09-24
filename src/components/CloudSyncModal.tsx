/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  RefreshCw,
  FolderSync,
  ExternalLink,
  ShieldCheck,
  Check,
  HardDrive,
  LogOut,
  AlertCircle,
  Folder,
  FileText,
} from 'lucide-react';
import { CloudSyncConfig, CloudProvider, ExportHistoryItem } from '../types';
import { GoogleDriveUser } from '../utils/googleDriveService';
import { formatBytes, formatTimeAgo, formatDateTime } from '../utils/formatters';

interface CloudSyncModalProps {
  config: CloudSyncConfig;
  exports: ExportHistoryItem[];
  googleUser: GoogleDriveUser | null;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  onSaveConfig: (newConfig: CloudSyncConfig) => void;
  onSyncAll: () => Promise<void>;
  onSyncSingleItem?: (item: ExportHistoryItem) => Promise<void>;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  config,
  exports,
  googleUser,
  onGoogleSignIn,
  onGoogleSignOut,
  onSaveConfig,
  onSyncAll,
  onSyncSingleItem,
  onClose,
}) => {
  const [provider, setProvider] = useState<CloudProvider>(config.provider || 'google_drive');
  const [backupFolder, setBackupFolder] = useState<string>(
    config.backupFolder || 'SwiftPDF_Backups'
  );
  const [syncEnabled, setSyncEnabled] = useState<boolean>(config.enabled ?? true);
  const [autoSync, setAutoSync] = useState<boolean>(config.autoSync ?? false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncingItemId, setSyncingItemId] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);

  const isConnected = !!googleUser;

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      await onGoogleSignIn();
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setErrorMessage(err?.message || 'Failed to authenticate with Google. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await onGoogleSignOut();
      setSyncEnabled(false);
    } catch (err: any) {
      console.error('Google sign-out error:', err);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      ...config,
      provider,
      backupFolder: backupFolder.trim() || 'SwiftPDF_Backups',
      enabled: syncEnabled,
      autoSync,
      accountEmail: googleUser?.email || config.accountEmail || '',
      googleConnected: isConnected,
      googleUserEmail: googleUser?.email || undefined,
      googleUserName: googleUser?.displayName || undefined,
      googleUserPhoto: googleUser?.photoURL || undefined,
    });
    onClose();
  };

  const handleTriggerSync = async () => {
    if (!isConnected) {
      // Need login first
      await handleSignIn();
      return;
    }
    setIsSyncing(true);
    setSyncSuccess(false);
    setErrorMessage(null);
    try {
      await onSyncAll();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4000);
    } catch (err: any) {
      console.error('Sync failed:', err);
      setErrorMessage(err?.message || 'Failed to sync to Google Drive. Check permissions.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTriggerSingleSync = async (item: ExportHistoryItem) => {
    if (!onSyncSingleItem) return;
    if (!isConnected) {
      await handleSignIn();
      return;
    }
    setSyncingItemId(item.id);
    setErrorMessage(null);
    try {
      await onSyncSingleItem(item);
    } catch (err: any) {
      console.error('Single sync failed:', err);
      setErrorMessage(err?.message || 'Failed to sync document to Google Drive.');
    } finally {
      setSyncingItemId(null);
    }
  };

  const syncedCount = exports.filter((e) => e.cloudSynced).length;
  const pendingCount = exports.length - syncedCount;

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-xl w-full p-5 sm:p-6 space-y-5 animate-in fade-in duration-150 my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Cloud Synchronization Hub
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authenticate and synchronize your compiled PDFs directly to Google Drive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-semibold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto space-y-4 pr-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-lg text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold">Sync Notice:</span>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {syncSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                All documents successfully uploaded and synchronized with your Google Drive!
              </span>
            </div>
          )}

          {/* SECTION 1: Google Account Authentication & Active Status */}
          <div className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Google Account Authorization
              </span>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                  Not Signed In
                </span>
              )}
            </div>

            {isConnected ? (
              /* Connected Account Display Card & Sync Toggle */
              <div className="space-y-3">
                <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {googleUser?.photoURL ? (
                      <img
                        src={googleUser.photoURL}
                        alt={googleUser.displayName || 'Google Account'}
                        className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                        {googleUser?.displayName?.[0]?.toUpperCase() ||
                          googleUser?.email?.[0]?.toUpperCase() ||
                          'G'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {googleUser?.displayName || 'Google Drive User'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                        {googleUser?.email}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-800"
                    title="Disconnect this Google account"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                </div>

                {/* Account Sync Toggle (Shows the account name so user knows they are logged in) */}
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                        Google Drive Sync Active for{' '}
                        <span className="underline decoration-indigo-400">
                          {googleUser?.displayName || googleUser?.email}
                        </span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      Exported PDFs will sync directly to your personal Google Drive in the{' '}
                      <span className="font-mono font-medium">/{backupFolder}</span> folder.
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={syncEnabled}
                      onChange={(e) => setSyncEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            ) : (
              /* Official Google Sign-In Button */
              <div className="space-y-2">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  To sync your compiled PDF documents to Google Drive, sign in with your Google
                  account. This grants permission for this app to create and manage your backup
                  folder.
                </p>

                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isLoggingIn}
                  className="w-full inline-flex items-center justify-center gap-3 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border-2 border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27a7.14 7.14 0 0 1 0-4.54V6.58H1.25a11.96 11.96 0 0 0 0 10.84l4.03-3.15Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                    />
                  </svg>
                  <span>
                    {isLoggingIn
                      ? 'Authenticating with Google...'
                      : 'Sign in with Google to Connect Drive'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: Sync Status & Trigger */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {syncedCount} of {exports.length} Exports Synchronized
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {config.lastSyncedAt
                  ? `Last synced ${formatTimeAgo(config.lastSyncedAt)}`
                  : 'No sync executed yet'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleTriggerSync}
              disabled={isSyncing || exports.length === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold shadow-xs transition-colors shrink-0 cursor-pointer ${
                exports.length === 0
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : isConnected
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>
                {isSyncing
                  ? 'Syncing to Drive...'
                  : !isConnected
                  ? 'Sign In & Sync'
                  : 'Sync All to Drive'}
              </span>
            </button>
          </div>

          {/* SECTION 3: Recent Exports & Sync Links */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Exported PDF Documents ({exports.length})</span>
              <span className="text-[11px] text-slate-400">
                {syncedCount} synced · {pendingCount} pending
              </span>
            </div>

            {exports.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
                No compiled PDFs exported yet. Create a folder and click "Compile & Export PDF" to
                generate documents for synchronization.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50/50 dark:bg-slate-900">
                {exports.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {item.fileName}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {formatBytes(item.fileSize)} · {item.pageCount} pages ·{' '}
                          {formatTimeAgo(item.exportedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.cloudSynced && item.cloudUrl ? (
                        <a
                          href={item.cloudUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>In Google Drive</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleTriggerSingleSync(item)}
                          disabled={syncingItemId === item.id || isSyncing}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded border border-indigo-200 dark:border-indigo-800 font-medium cursor-pointer"
                        >
                          {syncingItemId === item.id ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Cloud className="w-3 h-3" />
                              <span>Sync to Drive</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 4: Sync Configuration Settings */}
          <form onSubmit={handleSave} className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Google Drive Backup Folder Name
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Folder className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={backupFolder}
                    onChange={(e) => setBackupFolder(e.target.value)}
                    placeholder="SwiftPDF_Backups"
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                This folder will be automatically created in your Google Drive root if it doesn't
                exist.
              </p>
            </div>

            {/* Auto-sync Switch */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Automatic Sync on PDF Export
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Automatically upload newly compiled PDFs straight to Google Drive when you export.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded cursor-pointer shrink-0"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
