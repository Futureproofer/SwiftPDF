/**
 * File System Access API helper for user-defined local directories.
 * Provides native folder write support in Chromium browsers (Chrome, Edge, Opera, Brave)
 * with robust fallbacks for other environments.
 */

let activeDirectoryHandle: FileSystemDirectoryHandle | null = null;
let activeDirectoryName: string = '';

export const isFileSystemAccessSupported = (): boolean => {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
};

export const getSavedDirectoryName = (): string => {
  if (activeDirectoryName) return activeDirectoryName;
  try {
    return localStorage.getItem('docflow_custom_local_dir_name') || '';
  } catch {
    return '';
  }
};

export const setSavedDirectoryName = (name: string): void => {
  activeDirectoryName = name;
  try {
    localStorage.setItem('docflow_custom_local_dir_name', name);
  } catch (e) {
    console.error('Failed to save directory name to localStorage', e);
  }
};

export const requestUserLocalDirectory = async (): Promise<{
  success: boolean;
  name: string;
  error?: string;
}> => {
  if (!isFileSystemAccessSupported()) {
    return {
      success: false,
      name: '',
      error: 'File System Access API is not natively supported in this browser. You can still set a target custom path.',
    };
  }

  try {
    const handle = await (window as any).showDirectoryPicker({
      id: 'docflow_export_directory',
      mode: 'readwrite',
      startIn: 'documents',
    });

    activeDirectoryHandle = handle;
    const name = handle.name || 'DocFlow_Exports';
    setSavedDirectoryName(name);

    return { success: true, name };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, name: '', error: 'Selection cancelled' };
    }
    return { success: false, name: '', error: err.message || 'Failed to select directory' };
  }
};

export const saveFileToLocalDirectory = async (
  fileName: string,
  blob: Blob
): Promise<{ success: boolean; path: string; error?: string }> => {
  if (activeDirectoryHandle) {
    try {
      // Check or request permission if needed
      const opts = { mode: 'readwrite' as const };
      if (
        (await (activeDirectoryHandle as any).queryPermission(opts)) !== 'granted' &&
        (await (activeDirectoryHandle as any).requestPermission(opts)) !== 'granted'
      ) {
        throw new Error('Permission to write to directory was denied');
      }

      const fileHandle = await activeDirectoryHandle.getFileHandle(fileName, { create: true });
      const writable = await (fileHandle as any).createWritable();
      await writable.write(blob);
      await writable.close();

      const dirName = getSavedDirectoryName() || 'Selected Directory';
      return {
        success: true,
        path: `${dirName}/${fileName}`,
      };
    } catch (err: any) {
      console.warn('Native directory save failed, falling back to download:', err);
    }
  }

  // Fallback: Trigger standard browser download
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 4000);

    const targetDir = getSavedDirectoryName() || 'Downloads';
    return {
      success: true,
      path: `${targetDir}/${fileName}`,
    };
  } catch (err: any) {
    return {
      success: false,
      path: '',
      error: err.message || 'Failed to save file',
    };
  }
};
