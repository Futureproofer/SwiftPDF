import React, { useState } from 'react';
import { UserAccount, DocFile } from '../types';
import {
  isImageExpired,
  formatTimeUntilPurge,
  isImageFile,
} from '../utils/purgeService';
import {
  X,
  User,
  Shield,
  Clock,
  Trash2,
  CheckCircle2,
  LogIn,
  LogOut,
  Sparkles,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: UserAccount;
  files: DocFile[];
  onLogin: (name: string, email: string) => void;
  onLogout: () => void;
  onToggleAutoPurge: (enabled: boolean) => void;
  onManualPurgeNow: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  account,
  files,
  onLogin,
  onLogout,
  onToggleAutoPurge,
  onManualPurgeNow,
}) => {
  const [nameInput, setNameInput] = useState<string>('Doc Member');
  const [emailInput, setEmailInput] = useState<string>('themopixel@gmail.com');
  const [purgeFeedback, setPurgeFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const imageFiles = files.filter(isImageFile);
  const expiredImages = imageFiles.filter((f) => isImageExpired(f));

  const handleManualPurge = () => {
    onManualPurgeNow();
    setPurgeFeedback(`Purged ${expiredImages.length} image(s) older than 24 hours.`);
    setTimeout(() => setPurgeFeedback(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden text-slate-900 dark:text-white transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {account.isLoggedIn ? 'Account & Privacy Settings' : 'Member Account Sign In'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {account.isLoggedIn
                  ? 'Manage your session and automatic 24-hour image purge'
                  : 'Log in to retain image uploads and disable public auto-purge'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Status Banner */}
          {account.isLoggedIn ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    Logged In as {account.name || 'Member'}
                  </p>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-200/80 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300">
                    ACTIVE
                  </span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5 truncate">
                  {account.email}
                </p>
                <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/90 mt-1 font-medium">
                  {account.autoPurgeImages
                    ? '24-Hour Purge Toggle is ON: Uploaded images will clear after 24 hours.'
                    : '24-Hour Purge is OFF by default: Your image uploads are kept indefinitely.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    Public Guest Mode Active
                  </p>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900 text-amber-800 dark:text-amber-300">
                    24H PURGE ON
                  </span>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                  In public mode, uploaded images are <strong>automatically purged every 24 hours</strong>{' '}
                  to keep anything mistakenly uploaded safely removed. Sign in to prevent automatic deletion.
                </p>
              </div>
            </div>
          )}

          {/* If Logged In: Purge Toggle and Controls */}
          {account.isLoggedIn ? (
            <div className="space-y-4">
              {/* Purge Toggle Switch */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label
                      htmlFor="purge-toggle"
                      className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-indigo-500" />
                      <span>24-Hour Image Auto-Purge Toggle</span>
                    </label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Automatically purge uploaded images after 24 hours while logged in.
                    </p>
                  </div>

                  {/* Switch component */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      id="purge-toggle"
                      type="checkbox"
                      checked={account.autoPurgeImages}
                      onChange={(e) => onToggleAutoPurge(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600 rounded-full" />
                  </label>
                </div>

                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-200/80 dark:border-slate-800/80 pt-2.5">
                  <span>Current Setting:</span>
                  <span
                    className={`font-bold ${
                      account.autoPurgeImages
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {account.autoPurgeImages ? 'AUTO-PURGE ENABLED (24h)' : 'AUTO-PURGE DISABLED (Retain Forever)'}
                  </span>
                </div>
              </div>

              {/* Instant Manual Purge Option */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Uploaded Images Status
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {imageFiles.length} total image(s) in library ·{' '}
                      <span className="font-semibold text-rose-500">
                        {expiredImages.length} image(s) older than 24h
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleManualPurge}
                    disabled={expiredImages.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg border border-rose-200 dark:border-rose-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Purge Older Images Now</span>
                  </button>
                </div>

                {purgeFeedback && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-fade-in">
                    {purgeFeedback}
                  </p>
                )}
              </div>

              {/* Sign Out Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out (Return to Public 24h Purge Mode)</span>
                </button>
              </div>
            </div>
          ) : (
            /* Sign In Form */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onLogin(nameInput.trim() || 'Member', emailInput.trim() || 'user@example.com');
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Full Name / Display Name
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="e.g. themopixel@gmail.com"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Account Benefits:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-indigo-800 dark:text-indigo-300">
                  <li>Automatic 24-hour purge is turned <strong>OFF</strong> by default</li>
                  <li>Uploaded images are preserved indefinitely</li>
                  <li>Access to user-controlled 24-hour Purge Toggle anytime</li>
                </ul>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to Account</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>SwiftPDF · Privacy Guarantee</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
