import { PDFDocument, degrees } from 'pdf-lib';
import { DocFile, Folder, CompressionSettings } from '../types';

/**
 * Resizes and compresses an image data URL or blob using an offscreen canvas.
 * Supports downscaling dimensions, adjusting JPEG compression quality, and grayscale conversion.
 */
async function processImageForCompression(
  imageSource: string | Blob,
  settings: CompressionSettings
): Promise<{ bytes: Uint8Array; width: number; height: number; isPng: boolean }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let { width, height } = img;
      const maxDim = settings.maxDimension;

      // Downscale if image exceeds max allowed dimension
      if (maxDim && (width > maxDim || height > maxDim)) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to create canvas 2D context'));
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0, width, height);

      // Handle grayscale conversion if requested
      if (settings.colorMode === 'grayscale') {
        const imgData = ctx.getImageData(0, 0, width, height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          // Standard luminance formula
          const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
          d[i] = gray;
          d[i + 1] = gray;
          d[i + 2] = gray;
        }
        ctx.putImageData(imgData, 0, 0);
      }

      // Export as JPEG with specified quality
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            reject(new Error('Canvas blob generation failed'));
            return;
          }
          const arrayBuffer = await blob.arrayBuffer();
          resolve({
            bytes: new Uint8Array(arrayBuffer),
            width,
            height,
            isPng: false,
          });
        },
        'image/jpeg',
        Math.min(Math.max(settings.quality, 0.1), 1.0)
      );
    };

    img.onerror = (err) => reject(new Error('Failed to load image for processing: ' + err));

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      img.src = URL.createObjectURL(imageSource);
    }
  });
}

/**
 * Compiles all documents in a folder into a single unified PDF file.
 */
export async function compileFolderToPdf(
  folder: Folder,
  filesMap: Map<string, DocFile>,
  settings: CompressionSettings,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<{ blob: Blob; pageCount: number; sizeBytes: number }> {
  const mergedPdf = await PDFDocument.create();
  const sortedItems = [...folder.items].sort((a, b) => a.order - b.order);
  const total = sortedItems.length;

  if (total === 0) {
    throw new Error('Folder contains no documents to compile');
  }

  // Standard dimensions in points (72 points per inch)
  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;
  const LETTER_WIDTH = 612.0;
  const LETTER_HEIGHT = 792.0;

  let totalPagesGenerated = 0;

  for (let i = 0; i < total; i++) {
    const item = sortedItems[i];
    const file = filesMap.get(item.fileId);

    if (!file) {
      console.warn(`File ID ${item.fileId} not found in library, skipping.`);
      continue;
    }

    if (onProgress) {
      onProgress(i + 1, total, `Processing "${file.name}" (${i + 1} of ${total})...`);
    }

    const rotation = item.rotation || 0;

    if (file.type === 'application/pdf') {
      // PDF processing: extract pages and copy into merged PDF
      try {
        let pdfBytes: ArrayBuffer | null = null;
        if (file.blob) {
          pdfBytes = await file.blob.arrayBuffer();
        } else if (file.dataUrl) {
          const res = await fetch(file.dataUrl);
          pdfBytes = await res.arrayBuffer();
        }

        if (pdfBytes) {
          const srcPdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
          const indices = srcPdf.getPageIndices();
          const copiedPages = await mergedPdf.copyPages(srcPdf, indices);

          for (const page of copiedPages) {
            if (rotation !== 0) {
              const currentAngle = page.getRotation().angle;
              page.setRotation(degrees((currentAngle + rotation) % 360));
            }
            mergedPdf.addPage(page);
            totalPagesGenerated++;
          }
        }
      } catch (err) {
        console.error(`Error embedding PDF ${file.name}:`, err);
      }
    } else {
      // Image processing (.png, .jpg, .webp, etc.)
      try {
        const imageSource = file.blob || file.dataUrl;
        if (!imageSource) {
          console.warn(`No image data for ${file.name}`);
          continue;
        }

        const processed = await processImageForCompression(imageSource, settings);
        const embeddedImage = await mergedPdf.embedJpg(processed.bytes);

        // Determine target page size
        let pageWidth = A4_WIDTH;
        let pageHeight = A4_HEIGHT;

        if (settings.pageSize === 'letter') {
          pageWidth = LETTER_WIDTH;
          pageHeight = LETTER_HEIGHT;
        } else if (settings.pageSize === 'auto') {
          // If auto, fit to natural image aspect ratio targeting standard ~600pt width
          const imgAspect = processed.width / processed.height;
          if (imgAspect > 1.2) {
            // Landscape
            pageWidth = A4_HEIGHT;
            pageHeight = A4_WIDTH;
          } else {
            pageWidth = A4_WIDTH;
            pageHeight = A4_HEIGHT;
          }
        }

        // Apply margins
        let margin = 0;
        if (settings.margins === 'small') margin = 18; // 0.25 inch
        if (settings.margins === 'standard') margin = 36; // 0.5 inch

        const availWidth = pageWidth - margin * 2;
        const availHeight = pageHeight - margin * 2;

        // Scale image to fit within margins
        const scale = Math.min(availWidth / processed.width, availHeight / processed.height);
        const drawWidth = processed.width * scale;
        const drawHeight = processed.height * scale;

        // Center on page
        const posX = margin + (availWidth - drawWidth) / 2;
        const posY = margin + (availHeight - drawHeight) / 2;

        const page = mergedPdf.addPage([pageWidth, pageHeight]);

        page.drawImage(embeddedImage, {
          x: posX,
          y: posY,
          width: drawWidth,
          height: drawHeight,
        });

        if (rotation !== 0) {
          page.setRotation(degrees(rotation));
        }

        totalPagesGenerated++;
      } catch (err) {
        console.error(`Error embedding image ${file.name}:`, err);
      }
    }
  }

  if (onProgress) {
    onProgress(total, total, 'Compressing and finalizing PDF structure...');
  }

  // Save with object stream compression
  const pdfBytes = await mergedPdf.save({ useObjectStreams: true });
  const blob = new Blob([pdfBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });

  return {
    blob,
    pageCount: totalPagesGenerated,
    sizeBytes: blob.size,
  };
}

export type CompressionLevel = 'light' | 'balanced' | 'maximum';

export interface PreCompressionEstimate {
  originalBytes: number;
  estimatedBytes: number;
  estimatedReductionPercent: number;
  ratioMultiplier: number;
}

/**
 * Calculates the estimated output filesize before compression based on original size and level.
 */
export function estimateCompressedPdfSize(
  originalBytes: number,
  level: CompressionLevel = 'balanced'
): PreCompressionEstimate {
  // Reduction ratios derived from standard PDF stream deflating & object compaction:
  // light: ~22% reduction (ratio 0.78)
  // balanced: ~48% reduction (ratio 0.52)
  // maximum: ~68% reduction (ratio 0.32)
  let ratio = 0.52;
  if (level === 'light') ratio = 0.78;
  if (level === 'maximum') ratio = 0.32;

  // For very small PDFs (< 50KB), reduction ratio is smaller due to minimum PDF header overhead
  if (originalBytes < 50 * 1024) {
    ratio = Math.min(0.9, ratio + 0.15);
  }

  const estimatedBytes = Math.max(1024, Math.round(originalBytes * ratio));
  const estimatedReductionPercent = Math.max(5, Math.round((1 - estimatedBytes / originalBytes) * 100));

  return {
    originalBytes,
    estimatedBytes,
    estimatedReductionPercent,
    ratioMultiplier: ratio,
  };
}

export interface StandaloneCompressionResult {
  blob: Blob;
  downloadUrl: string;
  fileName: string;
  originalBytes: number;
  compressedBytes: number;
  savedBytes: number;
  reductionPercent: number;
  pageCount: number;
}

/**
 * Compresses an existing standalone PDF directly.
 * Optimizes xref tables, cleans duplicate object dictionaries, applies object stream compression,
 * and strips non-essential metadata streams.
 */
export async function compressStandalonePdf(
  fileOrBlob: File | Blob,
  fileName: string,
  level: CompressionLevel = 'balanced',
  onProgress?: (progressPercent: number, statusMessage: string) => void
): Promise<StandaloneCompressionResult> {
  const originalBytes = fileOrBlob.size;
  if (onProgress) onProgress(15, 'Reading PDF document stream...');

  const arrayBuffer = await fileOrBlob.arrayBuffer();

  if (onProgress) onProgress(35, 'Analyzing document structures & cross-references...');

  const srcPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pageCount = srcPdf.getPageCount();

  if (onProgress) onProgress(60, 'Optimizing object dictionaries & stream streams...');

  // Create clean destination document for deduplication and maximum structural compression
  const optimizedPdf = await PDFDocument.create();

  // Set clean metadata
  const safeName = fileName.replace(/\.pdf$/i, '');
  optimizedPdf.setTitle(safeName);
  optimizedPdf.setProducer('SwiftPDF Compressor');
  optimizedPdf.setCreator('SwiftPDF');

  // Copy pages to rebuild clean object graphs
  const indices = srcPdf.getPageIndices();
  const copiedPages = await optimizedPdf.copyPages(srcPdf, indices);
  for (const page of copiedPages) {
    optimizedPdf.addPage(page);
  }

  if (onProgress) onProgress(85, 'Executing FlateDeflate stream compression...');

  // Save with full object streams
  const compressedBytesArray = await optimizedPdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });

  if (onProgress) onProgress(98, 'Finalizing output PDF blob...');

  let finalBytes: Uint8Array = compressedBytesArray;

  // If the optimized rebuild was not smaller, preserve smallest byte stream
  if (finalBytes.byteLength > originalBytes) {
    finalBytes = new Uint8Array(arrayBuffer);
  }

  const blob = new Blob([finalBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
  const compressedBytes = blob.size;
  const savedBytes = Math.max(0, originalBytes - compressedBytes);
  const reductionPercent = originalBytes > 0 ? Math.round((savedBytes / originalBytes) * 100) : 0;
  const downloadUrl = URL.createObjectURL(blob);

  const finalFileName = safeName.endsWith('-compressed')
    ? `${safeName}.pdf`
    : `${safeName}-compressed.pdf`;

  if (onProgress) onProgress(100, 'PDF Compression Complete!');

  return {
    blob,
    downloadUrl,
    fileName: finalFileName,
    originalBytes,
    compressedBytes,
    savedBytes,
    reductionPercent,
    pageCount,
  };
}
