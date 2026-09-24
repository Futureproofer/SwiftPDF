import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { DocFile, Folder } from '../types';

/**
 * Creates clean, lightweight vector/canvas mock documents for initial demonstration.
 */
function createSampleInvoiceDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  canvas.height = 1754;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header banner
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(80, 80, canvas.width - 160, 160);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText('INVOICE #INV-2026-089', 120, 175);

  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Date: Sept 18, 2026  |  Due: Oct 18, 2026', 120, 215);

  // Bill To & From
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('BILLED TO:', 120, 320);
  ctx.fillText('ISSUED BY:', 700, 320);

  ctx.font = '22px sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('Apex Global Technologies Inc.', 120, 360);
  ctx.fillText('742 Innovation Way, Suite 400', 120, 395);
  ctx.fillText('San Francisco, CA 94107', 120, 430);

  ctx.fillText('DocFlow Solutions Ltd.', 700, 360);
  ctx.fillText('100 Enterprise Park, Docklands', 700, 395);
  ctx.fillText('London, EC2A 1NT, UK', 700, 430);

  // Line items table
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(120, 500, canvas.width - 240, 60);

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('ITEM DESCRIPTION', 140, 538);
  ctx.fillText('QTY', 680, 538);
  ctx.fillText('RATE', 800, 538);
  ctx.fillText('TOTAL', 940, 538);

  const items = [
    { desc: 'Cloud Infrastructure Migration & Setup', qty: '1', rate: '$4,500.00', total: '$4,500.00' },
    { desc: 'High-Throughput PDF Optimization Engine', qty: '1', rate: '$2,850.00', total: '$2,850.00' },
    { desc: 'Security Auditing & Penetration Verification', qty: '1', rate: '$1,800.00', total: '$1,800.00' },
    { desc: 'Encrypted Cloud Sync Connector Modules', qty: '1', rate: '$1,200.00', total: '$1,200.00' },
  ];

  let y = 610;
  items.forEach((item, idx) => {
    ctx.fillStyle = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
    ctx.fillRect(120, y - 35, canvas.width - 240, 55);

    ctx.fillStyle = '#334155';
    ctx.font = '20px sans-serif';
    ctx.fillText(item.desc, 140, y);
    ctx.fillText(item.qty, 690, y);
    ctx.fillText(item.rate, 800, y);
    ctx.fillText(item.total, 940, y);
    y += 65;
  });

  // Totals box
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(660, 950, 460, 160);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(660, 950, 460, 160);

  ctx.fillStyle = '#475569';
  ctx.font = '22px sans-serif';
  ctx.fillText('Subtotal:', 690, 995);
  ctx.fillText('$10,350.00', 960, 995);

  ctx.fillText('Tax (0.0%):', 690, 1035);
  ctx.fillText('$0.00', 960, 1035);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('Amount Due:', 690, 1085);
  ctx.fillText('$10,350.00', 940, 1085);

  // Footer notes
  ctx.fillStyle = '#64748b';
  ctx.font = '18px sans-serif';
  ctx.fillText('Payment Terms: Wire transfer payable within 30 days. Reference #INV-2026-089.', 120, 1580);
  ctx.fillText('Thank you for choosing DocFlow Studio as your document automation partner.', 120, 1615);

  return canvas.toDataURL('image/jpeg', 0.9);
}

function createSampleBlueprintDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1100;
  const ctx = canvas.getContext('2d')!;

  // Dark blueprint slate
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Blueprint grid
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Header title
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('SYS-ARCH-2026 // CLOUD STORAGE SYNC TOPOLOGY', 80, 100);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '20px monospace';
  ctx.fillText('Client Edge Node -> Multi-Cloud Synchronization Gateway', 80, 140);

  // Draw node boxes
  const drawNode = (x: number, y: number, w: number, h: number, title: string, subtitle: string, color: string) => {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = color;
    ctx.font = 'bold 20px monospace';
    ctx.fillText(title, x + 24, y + 45);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '16px monospace';
    ctx.fillText(subtitle, x + 24, y + 80);
  };

  drawNode(120, 320, 340, 140, 'LOCAL DESKTOP REPO', 'FileSystemAccess API / OPFS', '#38bdf8');
  drawNode(630, 320, 340, 140, 'PDF-LIB COMPILER', 'Client-side WASM engine', '#10b981');
  drawNode(1140, 320, 340, 140, 'CLOUD SYNC DESTINATIONS', 'Google Drive / S3 / WebDAV', '#a855f7');

  // Connecting arrows
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);

  ctx.beginPath();
  ctx.moveTo(460, 390);
  ctx.lineTo(630, 390);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(970, 390);
  ctx.lineTo(1140, 390);
  ctx.stroke();

  ctx.setLineDash([]);

  // Technical stamp
  ctx.strokeStyle = '#38bdf8';
  ctx.strokeRect(1250, 920, 270, 110);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('APPROVED FOR EXPORT', 1270, 955);
  ctx.font = '14px monospace';
  ctx.fillText('SPECIFICATION v2.4', 1270, 985);
  ctx.fillText('STATUS: VERIFIED', 1270, 1010);

  return canvas.toDataURL('image/png');
}

function createSampleReceiptDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1400;
  const ctx = canvas.getContext('2d')!;

  // Thermal paper receipt look
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#171717';
  ctx.textAlign = 'center';

  ctx.font = 'bold 36px monospace';
  ctx.fillText('METRO ELECTRONICS HUB', canvas.width / 2, 90);

  ctx.font = '18px monospace';
  ctx.fillText('Store #4029 - 88 Market St', canvas.width / 2, 130);
  ctx.fillText('Tel: (555) 019-2834', canvas.width / 2, 160);
  ctx.fillText('------------------------------------------', canvas.width / 2, 200);

  ctx.textAlign = 'left';
  ctx.font = '18px monospace';
  ctx.fillText('DATE: 2026-09-21 14:32:05', 80, 240);
  ctx.fillText('CASHIER: Marcus T. (#12)', 80, 270);
  ctx.fillText('TRANSACTION: #9042-8812', 80, 300);
  ctx.fillText('------------------------------------------', 80, 340);

  const receiptItems = [
    { name: '4TB NVMe SSD Backup Drive', price: '289.99' },
    { name: 'USB-C Ultra 10Gbps Cable (2m)', price: '24.50' },
    { name: '100W GaN Desktop Charger Hub', price: '69.00' },
    { name: 'Document Scanner Calibration Kit', price: '34.99' },
  ];

  let y = 390;
  receiptItems.forEach((item) => {
    ctx.fillText(item.name, 80, y);
    ctx.textAlign = 'right';
    ctx.fillText('$' + item.price, 720, y);
    ctx.textAlign = 'left';
    y += 50;
  });

  ctx.fillText('------------------------------------------', 80, y);
  y += 40;

  ctx.fillText('SUBTOTAL:', 80, y);
  ctx.textAlign = 'right';
  ctx.fillText('$418.48', 720, y);
  ctx.textAlign = 'left';
  y += 40;

  ctx.fillText('SALES TAX (8.5%):', 80, y);
  ctx.textAlign = 'right';
  ctx.fillText('$35.57', 720, y);
  ctx.textAlign = 'left';
  y += 50;

  ctx.font = 'bold 24px monospace';
  ctx.fillText('TOTAL PAID:', 80, y);
  ctx.textAlign = 'right';
  ctx.fillText('$454.05', 720, y);
  ctx.textAlign = 'left';
  y += 60;

  ctx.font = '18px monospace';
  ctx.fillText('PAYMENT METHOD: Visa Contactless *4920', 80, y);
  ctx.fillText('AUTH CODE: 088219', 80, y + 30);

  ctx.textAlign = 'center';
  ctx.fillText('*** THANK YOU FOR YOUR BUSINESS ***', canvas.width / 2, y + 120);
  ctx.fillText('Retain receipt for expense reimbursement', canvas.width / 2, y + 160);

  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Creates a sample PDF file using pdf-lib.
 */
async function createSamplePdfDocument(): Promise<{ dataUrl: string; size: number }> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { height } = page.getSize();

  page.drawText('PROJECT ALPHA: EXECUTIVE REPORT', {
    x: 50,
    y: height - 80,
    size: 20,
    font: boldFont,
    color: rgb(0.06, 0.09, 0.16),
  });

  page.drawText('Prepared for Quarterly Review  ·  September 2026', {
    x: 50,
    y: height - 105,
    size: 11,
    font: font,
    color: rgb(0.39, 0.45, 0.55),
  });

  page.drawLine({
    start: { x: 50, y: height - 120 },
    end: { x: 545, y: height - 120 },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  });

  const bodyParagraphs = [
    '1. Project Objectives & Scope Summary',
    'During the past quarter, our team executed the automated document archiving and compilation pipeline. The primary objective was achieving low-latency document reorganization, supporting both desktop and mobile clients without requiring persistent server computation.',
    '2. Key Architectural Deliverables',
    '· Zero-latency client-side PDF synthesis with dynamic page scaling and margin compensation.',
    '· User-defined custom local directory routing using the File System Access API.',
    '· Continuous cloud synchronization framework with backup redundancy and cross-device sharing.',
    '· Drag-and-drop sequencing enabling exact multi-document ordering prior to batch export.',
    '3. Concluding Remarks',
    'All benchmarks have been met with over 45% reduction in compiled file size while preserving high visual legibility across all embedded receipts and invoices.',
  ];

  let currentY = height - 160;
  for (let i = 0; i < bodyParagraphs.length; i++) {
    const text = bodyParagraphs[i];
    const isHeader = text.startsWith('1.') || text.startsWith('2.') || text.startsWith('3.');
    page.drawText(text, {
      x: 50,
      y: currentY,
      size: isHeader ? 14 : 11,
      font: isHeader ? boldFont : font,
      color: isHeader ? rgb(0.09, 0.13, 0.24) : rgb(0.2, 0.25, 0.35),
    });
    currentY -= isHeader ? 30 : 24;
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
  const dataUrl = URL.createObjectURL(blob);

  return {
    dataUrl,
    size: blob.size,
  };
}

export async function generateInitialSampleData(): Promise<{
  files: DocFile[];
  folders: Folder[];
}> {
  const invoiceDataUrl = createSampleInvoiceDataUrl();
  const blueprintDataUrl = createSampleBlueprintDataUrl();
  const receiptDataUrl = createSampleReceiptDataUrl();
  const pdfSample = await createSamplePdfDocument();

  const file1: DocFile = {
    id: 'sample_doc_1',
    name: 'Invoice_ApexTech_Sept2026.jpg',
    type: 'image/jpeg',
    size: 245800,
    uploadedAt: Date.now() - 3600000 * 24 * 2, // 2 days ago
    dataUrl: invoiceDataUrl,
    width: 1240,
    height: 1754,
    pageCount: 1,
    assignedFolderIds: ['folder_finance_q3'],
  };

  const file2: DocFile = {
    id: 'sample_doc_2',
    name: 'Hardware_Store_Receipt.jpg',
    type: 'image/jpeg',
    size: 142100,
    uploadedAt: Date.now() - 3600000 * 18,
    dataUrl: receiptDataUrl,
    width: 800,
    height: 1400,
    pageCount: 1,
    assignedFolderIds: ['folder_finance_q3'],
  };

  const file3: DocFile = {
    id: 'sample_doc_3',
    name: 'Cloud_Storage_Topology_Blueprint.png',
    type: 'image/png',
    size: 382400,
    uploadedAt: Date.now() - 3600000 * 8,
    dataUrl: blueprintDataUrl,
    width: 1600,
    height: 1100,
    pageCount: 1,
    assignedFolderIds: ['folder_project_alpha'],
  };

  const file4: DocFile = {
    id: 'sample_doc_4',
    name: 'Project_Alpha_Summary_Report.pdf',
    type: 'application/pdf',
    size: pdfSample.size,
    uploadedAt: Date.now() - 3600000 * 2,
    dataUrl: pdfSample.dataUrl,
    pageCount: 1,
    assignedFolderIds: ['folder_project_alpha'],
  };

  const folder1: Folder = {
    id: 'folder_finance_q3',
    name: 'Q3 Financial Receipts & Invoices',
    category: 'Finance',
    description: 'Itemized vendor receipts and consultancy billing for Q3 2026 accounts.',
    createdAt: Date.now() - 3600000 * 24 * 3,
    updatedAt: Date.now() - 3600000 * 12,
    color: '#0284c7', // Sky blue
    items: [
      { fileId: 'sample_doc_1', order: 0 },
      { fileId: 'sample_doc_2', order: 1 },
    ],
  };

  const folder2: Folder = {
    id: 'folder_project_alpha',
    name: 'Project Alpha Blueprint & Overview',
    category: 'Project',
    description: 'System architecture topology and executive sign-off summary report.',
    createdAt: Date.now() - 3600000 * 24 * 4,
    updatedAt: Date.now() - 3600000 * 2,
    color: '#10b981', // Emerald
    items: [
      { fileId: 'sample_doc_4', order: 0 },
      { fileId: 'sample_doc_3', order: 1 },
    ],
  };

  const folder3: Folder = {
    id: 'folder_tax_2026',
    name: 'Tax Audit Records 2026',
    category: 'Date',
    description: 'Consolidated records for annual corporate tax filing.',
    createdAt: Date.now() - 3600000 * 24 * 10,
    updatedAt: Date.now() - 3600000 * 24 * 2,
    color: '#f59e0b', // Amber
    items: [],
  };

  return {
    files: [file1, file2, file3, file4],
    folders: [folder1, folder2, folder3],
  };
}
