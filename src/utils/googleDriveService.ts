/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App and Auth once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({
  prompt: 'select_account',
});

export interface GoogleDriveUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// In-memory access token & user state per security requirements (never in localStorage)
let cachedAccessToken: string | null = null;
let cachedGoogleUser: GoogleDriveUser | null = null;
let isSigningIn = false;

/**
 * Initialize Google Auth listener to track session changes
 */
export const initGoogleAuth = (
  onStateChange?: (user: GoogleDriveUser | null, token: string | null) => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      cachedGoogleUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      };
      if (onStateChange) onStateChange(cachedGoogleUser, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      cachedGoogleUser = null;
      if (onStateChange) onStateChange(null, null);
    }
  });
};

/**
 * Sign in using Google OAuth popup with Drive scope
 */
export const signInWithGoogleDrive = async (): Promise<{
  user: GoogleDriveUser;
  accessToken: string;
}> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error(
        'Google Drive authorization was not granted. Please accept Google Drive permissions to enable cloud sync.'
      );
    }
    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
    };
    return {
      user: cachedGoogleUser,
      accessToken: cachedAccessToken,
    };
  } finally {
    isSigningIn = false;
  }
};

/**
 * Sign out and clear cached in-memory token
 */
export const signOutGoogleDrive = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedGoogleUser = null;
};

export const getCachedAccessToken = () => cachedAccessToken;
export const getCachedGoogleUser = () => cachedGoogleUser;

/**
 * Find or create designated backup folder in Google Drive
 */
export const findOrCreateDriveFolder = async (
  accessToken: string,
  folderName: string = 'SwiftPDF_Backups'
): Promise<string> => {
  const safeName = folderName.trim() || 'SwiftPDF_Backups';
  const query = `name = '${safeName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name)&spaces=drive`;

  const res = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Failed to search Google Drive folders (HTTP ${res.status})`
    );
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Folder does not exist, create it
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: safeName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Failed to create folder in Google Drive (HTTP ${createRes.status})`
    );
  }

  const created = await createRes.json();
  return created.id;
};

/**
 * Upload a compiled PDF Blob directly to Google Drive
 */
export const uploadPdfBlobToGoogleDrive = async (
  accessToken: string,
  pdfBlob: Blob,
  fileName: string,
  folderId?: string
): Promise<{ id: string; name: string; webViewLink: string; webContentLink?: string }> => {
  const boundary = '-------SwiftPdfBoundary' + Math.random().toString(36).substring(2);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const safeFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const metadata: Record<string, any> = {
    name: safeFileName,
    mimeType: 'application/pdf',
    description: 'Exported from SwiftPDF',
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const metadataPart = new Blob([
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    JSON.stringify(metadata),
    delimiter,
    'Content-Type: application/pdf\r\n\r\n',
  ]);

  const endPart = new Blob([closeDelim]);
  const multipartBody = new Blob([metadataPart, pdfBlob, endPart], {
    type: `multipart/related; boundary=${boundary}`,
  });

  const uploadUrl =
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,size';

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: multipartBody,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.error?.message || `Failed to upload PDF to Google Drive (HTTP ${res.status})`
    );
  }

  const result = await res.json();
  return {
    id: result.id,
    name: result.name,
    webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
    webContentLink: result.webContentLink,
  };
};
