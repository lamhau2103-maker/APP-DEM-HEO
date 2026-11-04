import { BatchRecord } from '../types';

/**
 * Loads an image from URL into an HTMLImageElement safely
 */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * High-resolution canvas exporter for PHIẾU GHI NHẬN KIỂM ĐẾM
 * Replaces html2canvas to eliminate modern CSS color parse errors (e.g. oklch)
 * and outputs a crystal-clear 1200px wide PNG directly.
 */
export async function exportDocketToImage(record: BatchRecord): Promise<void> {
  // Pre-load assets
  const [logoImg, snapshotImg] = await Promise.all([
    loadImage('/assets/aistudio/23-logo-thai-viet-corporation_c66d41c5.jpeg'),
    record.snapshotUrl ? loadImage(record.snapshotUrl) : Promise.resolve(null),
  ]);

  const canvas = document.createElement('canvas');
  const w = 1200;
  
  // Calculate height depending on whether snapshot exists
  const snapshotBoxHeight = snapshotImg ? 440 : 120;
  const h = 820 + snapshotBoxHeight;

  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // 1. White Background with subtle outer border
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);

  const marginX = 60;
  let currentY = 55;

  // 2. HEADER
  // Draw Logo
  if (logoImg) {
    // White background box for logo
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(marginX, currentY, 95, 95, 12);
    ctx.fill();
    ctx.stroke();

    // Draw logo image
    ctx.drawImage(logoImg, marginX + 6, currentY + 6, 83, 83);
  }

  // Header Title & Info
  const textLeftX = marginX + (logoImg ? 115 : 0);
  ctx.fillStyle = '#dc2626'; // Brand Red
  ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THAI VIET CORPORATION', textLeftX, currentY + 28);

  ctx.fillStyle = '#475569'; // Slate-600
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('HỆ THỐNG KIỂM ĐẾM GIA SÚC TỰ ĐỘNG AI', textLeftX, currentY + 50);

  ctx.fillStyle = '#334155'; // Slate-700
  ctx.font = 'normal 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    'Địa chỉ: Số 36 Nguyễn Chánh , Khu Phố Phú Cường , Phường Bình Phước , Thành Phố Đồng Nai , Việt Nam',
    textLeftX,
    currentY + 76
  );

  // Header Right: Mã Phiếu Badge
  const rightX = w - marginX;
  const badgeWidth = 190;
  const badgeHeight = 42;
  const badgeX = rightX - badgeWidth;

  ctx.fillStyle = '#eff6ff'; // blue-50
  ctx.strokeStyle = '#2563eb'; // blue-600
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(badgeX, currentY + 12, badgeWidth, badgeHeight, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1e40af';
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(record.code, badgeX + badgeWidth / 2, currentY + 38);

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('LineZone AI Vision', badgeX + badgeWidth / 2, currentY + 72);

  // Horizontal Header Divider
  currentY += 115;
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(marginX, currentY);
  ctx.lineTo(w - marginX, currentY);
  ctx.stroke();

  // 3. DOCUMENT TITLE: PHIẾU GHI NHẬN KIỂM ĐẾM
  currentY += 45;
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PHIẾU GHI NHẬN KIỂM ĐẾM', w / 2, currentY);

  currentY += 24;
  ctx.fillStyle = '#475569';
  ctx.font = '500 13px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(
    'Phương thức: Camera AI LineZone 24/7  ·  Dữ liệu thị giác máy tính đã xác thực',
    w / 2,
    currentY
  );

  // 4. HORIZONTAL INFORMATION TABLE (HÀNG NGANG NHƯ PHẦN BÁO CÁO)
  currentY += 32;
  const tableX = marginX;
  const tableW = w - 2 * marginX;
  const colWidths = [170, 220, 200, 160, 150, 180]; // Total = 1080
  const headerH = 42;
  const rowH = 60;
  const totalTableH = headerH + rowH;

  // Table Outer Border
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(tableX, currentY, tableW, totalTableH, 10);
  ctx.stroke();

  // Header Background
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(tableX, currentY, tableW, headerH, [10, 10, 0, 0]);
  ctx.fill();

  // Header text
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';

  const headers = [
    'MÃ PHIẾU',
    'THỜI GIAN HOÀN TẤT',
    'CHIỀU ĐẾM',
    'IN QUA OUT (+)',
    'QUAY NGƯỢC (-)',
    'TỔNG HEO THỰC TẾ',
  ];

  let curColX = tableX;
  for (let i = 0; i < headers.length; i++) {
    // Header divider line
    if (i > 0) {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(curColX, currentY);
      ctx.lineTo(curColX, currentY + totalTableH);
      ctx.stroke();
    }

    const colW = colWidths[i];
    if (i === 2) {
      ctx.textAlign = 'center';
      ctx.fillText(headers[i], curColX + colW / 2, currentY + 26);
    } else if (i >= 3) {
      ctx.textAlign = 'right';
      ctx.fillText(headers[i], curColX + colW - 16, currentY + 26);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(headers[i], curColX + 16, currentY + 26);
    }
    curColX += colW;
  }

  // Row horizontal divider
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tableX, currentY + headerH);
  ctx.lineTo(tableX + tableW, currentY + headerH);
  ctx.stroke();

  // Row Data Fill
  const dataY = currentY + headerH;

  // Highlight background for final actual count column
  const lastColX = tableX + tableW - colWidths[5];
  ctx.fillStyle = '#fef2f2'; // light red background for actual count
  ctx.beginPath();
  ctx.roundRect(lastColX, dataY, colWidths[5], rowH, [0, 0, 10, 0]);
  ctx.fill();

  // Col 1: Mã Phiếu
  ctx.fillStyle = '#1d4ed8';
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(record.code, tableX + 16, dataY + 36);

  // Col 2: Thời Gian Hoàn Tất
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.fillText(record.endTime, tableX + colWidths[0] + 16, dataY + 36);

  // Col 3: Chiều Đếm
  const col3X = tableX + colWidths[0] + colWidths[1];
  const col3W = colWidths[2];
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
  const dirText = record.directionMode === 'IN_TO_OUT' ? 'Xuất Kho (IN ➔ OUT)' : 'Nhập Kho (OUT ➔ IN)';
  // Pill badge
  ctx.fillStyle = '#eff6ff';
  ctx.strokeStyle = '#bfdbfe';
  ctx.beginPath();
  ctx.roundRect(col3X + 15, dataY + 16, col3W - 30, 28, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1e40af';
  ctx.fillText(dirText, col3X + col3W / 2, dataY + 35);

  // Col 4: IN qua OUT (+)
  const col4X = col3X + colWidths[2];
  ctx.textAlign = 'right';
  ctx.fillStyle = '#059669';
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.fillText(`+${record.forwardCount} con`, col4X + colWidths[3] - 16, dataY + 36);

  // Col 5: Quay Ngược (-)
  const col5X = col4X + colWidths[3];
  ctx.fillStyle = '#d97706';
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.fillText(`-${record.backwardCount} con`, col5X + colWidths[4] - 16, dataY + 36);

  // Col 6: Tổng Heo Thực Tế
  ctx.fillStyle = '#dc2626';
  ctx.font = '900 22px "Courier New", monospace';
  ctx.fillText(`${record.actualCount} CON`, tableX + tableW - 16, dataY + 37);

  // 5. EVIDENCE SNAPSHOT (Ảnh chụp bằng chứng hiện trường tại thời điểm chốt số)
  currentY += totalTableH + 30;
  const snapBoxW = tableW;

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(tableX, currentY, snapBoxW, snapshotBoxHeight, 12);
  ctx.stroke();

  // Snapshot Title Bar
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(tableX, currentY, snapBoxW, 36, [12, 12, 0, 0]);
  ctx.fill();

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('📷  ẢNH CHỤP BẰNG CHỨNG HIỆN TRƯỜNG TẠI THỜI ĐIỂM CHỐT SỐ', tableX + 16, currentY + 23);

  if (snapshotImg) {
    const imgAreaX = tableX + 16;
    const imgAreaY = currentY + 46;
    const imgAreaW = snapBoxW - 32;
    const imgAreaH = snapshotBoxHeight - 56;

    // Background for photo
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(imgAreaX, imgAreaY, imgAreaW, imgAreaH, 8);
    ctx.fill();

    // Scale to fit image while preserving aspect ratio
    const imgAspect = snapshotImg.width / snapshotImg.height;
    const boxAspect = imgAreaW / imgAreaH;

    let drawW = imgAreaW;
    let drawH = imgAreaH;
    let drawX = imgAreaX;
    let drawY = imgAreaY;

    if (imgAspect > boxAspect) {
      drawW = imgAreaW;
      drawH = imgAreaW / imgAspect;
      drawY = imgAreaY + (imgAreaH - drawH) / 2;
    } else {
      drawH = imgAreaH;
      drawW = imgAreaH * imgAspect;
      drawX = imgAreaX + (imgAreaW - drawW) / 2;
    }

    ctx.drawImage(snapshotImg, drawX, drawY, drawW, drawH);
  } else {
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 13px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Không có ảnh chụp camera tại lượt này.', tableX + snapBoxW / 2, currentY + 75);
  }

  // 6. SIGNATURES (CHỈ CÓ 2 CHỮ KÝ: NGƯỜI KIỂM & NGƯỜI ĐỒNG KIỂM)
  currentY += snapshotBoxHeight + 35;

  // Signature line separator
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(marginX, currentY);
  ctx.lineTo(w - marginX, currentY);
  ctx.stroke();

  currentY += 35;
  const sigCol1X = marginX + tableW * 0.25;
  const sigCol2X = marginX + tableW * 0.75;

  // Person 1: NGƯỜI KIỂM (Bộ phận kế toán)
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 15px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('NGƯỜI KIỂM', sigCol1X, currentY);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('( Bộ phận kế toán )', sigCol1X, currentY + 20);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'italic 11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('(Ký & ghi rõ họ tên)', sigCol1X, currentY + 38);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'normal 15px monospace';
  ctx.fillText('......................................................', sigCol1X, currentY + 115);

  // Person 2: NGƯỜI ĐỒNG KIỂM (Bộ phận thuộc trại)
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 15px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('NGƯỜI ĐỒNG KIỂM', sigCol2X, currentY);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('( Bộ phận thuộc trại )', sigCol2X, currentY + 20);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'italic 11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('(Ký & ghi rõ họ tên)', sigCol2X, currentY + 38);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'normal 15px monospace';
  ctx.fillText('......................................................', sigCol2X, currentY + 115);

  // 7. FOOTER
  currentY += 135;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(marginX, currentY);
  ctx.lineTo(w - marginX, currentY);
  ctx.stroke();

  currentY += 22;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'Biên bản ghi nhận kiểm đếm gia súc thông minh Thai Viet Corporation · Xác nhận thực tế tại hiện trường',
    w / 2,
    currentY
  );

  // 8. Trigger Auto Download to computer
  return new Promise<void>((resolve, reject) => {
    try {
      canvas.toBlob(blob => {
        if (!blob) {
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `PHIEU_GHI_NHAN_KIEM_DEM_${record.code}.png`;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            resolve();
          }, 200);
          return;
        }

        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `PHIEU_GHI_NHAN_KIEM_DEM_${record.code}.png`;
        link.href = objectUrl;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(objectUrl);
          resolve();
        }, 600);
      }, 'image/png', 1.0);
    } catch (err) {
      reject(err);
    }
  });
}

