import React, { useState } from 'react';
import { BatchRecord } from '../types';
import { Printer, Download, X, CheckCircle2, ShieldCheck, Camera, Loader2 } from 'lucide-react';
import { exportDocketToImage } from '../utils/exportDocketImage';

interface PrintDocketProps {
  record: BatchRecord;
  onClose: () => void;
}

export const PrintDocket: React.FC<PrintDocketProps> = ({ record, onClose }) => {
  const [savingImage, setSavingImage] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // IN PHIẾU: Kết nối trực tiếp máy in hệ thống (Laser/Thermal/Color/PDF)
  const handlePrint = () => {
    window.focus();
    window.print();
  };

  const _unusedLegacyPrint = () => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '1024px';
      iframe.style.height = '1024px';
      iframe.style.border = '0';
      iframe.style.opacity = '0.01';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.focus();
        window.print();
        return;
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>PHIẾU GHI NHẬN KIỂM ĐẾM - ${record.code}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 12mm 10mm;
              }
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                margin: 0;
                padding: 10px;
                color: #0f172a;
                background: #ffffff;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 2px solid #0f172a;
                padding-bottom: 12px;
              }
              .logo-box {
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                padding: 4px;
                width: 65px;
                height: 65px;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .logo-img {
                width: 100%;
                height: 100%;
                object-fit: contain;
              }
              .brand-title {
                color: #dc2626;
                font-weight: 900;
                font-size: 17px;
                text-transform: uppercase;
                margin: 0;
              }
              .brand-sub {
                font-size: 11px;
                font-weight: bold;
                color: #475569;
                text-transform: uppercase;
              }
              .brand-addr {
                font-size: 10.5px;
                color: #334155;
                margin-top: 4px;
                max-width: 500px;
                line-height: 1.4;
              }
              .badge-code {
                display: inline-block;
                font-family: monospace;
                font-size: 14px;
                font-weight: bold;
                color: #1e40af;
                border: 2px solid #2563eb;
                padding: 4px 10px;
                border-radius: 6px;
                background: #eff6ff;
              }
              .doc-title {
                font-size: 22px;
                font-weight: 900;
                text-align: center;
                margin: 16px 0 4px 0;
                text-transform: uppercase;
                color: #0f172a;
              }
              .doc-sub {
                font-size: 11px;
                color: #64748b;
                text-align: center;
                margin-bottom: 16px;
              }
              table.data-table {
                width: 100%;
                border-collapse: collapse;
                border: 2px solid #0f172a;
                border-radius: 8px;
                overflow: hidden;
              }
              table.data-table th, table.data-table td {
                border: 1px solid #cbd5e1;
                padding: 8px 10px;
                font-size: 11.5px;
              }
              table.data-table th {
                background: #f1f5f9 !important;
                font-weight: bold;
                text-transform: uppercase;
                color: #1e293b;
              }
              .snapshot-box {
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                padding: 8px;
                margin-top: 14px;
              }
              .snapshot-title {
                font-size: 11px;
                font-weight: bold;
                margin-bottom: 6px;
                color: #1e293b;
              }
              .snapshot-img {
                max-height: 260px;
                width: 100%;
                object-fit: contain;
                background: #0f172a;
                border-radius: 6px;
              }
              .sig-grid {
                display: flex;
                justify-content: space-around;
                margin-top: 24px;
                padding-top: 10px;
                border-top: 1px solid #cbd5e1;
              }
              .sig-col {
                text-align: center;
                width: 45%;
              }
              .sig-name {
                font-weight: 900;
                font-size: 13px;
                text-transform: uppercase;
              }
              .sig-dept {
                font-weight: bold;
                font-size: 11px;
                color: #475569;
              }
              .sig-guide {
                font-style: italic;
                font-size: 10px;
                color: #94a3b8;
              }
              .sig-dots {
                margin-top: 55px;
                font-family: monospace;
                color: #cbd5e1;
              }
              .footer-text {
                margin-top: 18px;
                text-align: center;
                font-size: 9.5px;
                color: #94a3b8;
                border-top: 1px solid #e2e8f0;
                padding-top: 6px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div style="display: flex; gap: 12px; align-items: center;">
                <div class="logo-box">
                  <img src="/assets/aistudio/23-logo-thai-viet-corporation_c66d41c5.jpeg" class="logo-img" alt="Logo" />
                </div>
                <div>
                  <h1 class="brand-title">THAI VIET CORPORATION</h1>
                  <div class="brand-sub">Hệ Thống Kiểm Đếm Gia Súc Tự Động AI</div>
                  <div class="brand-addr">
                    Địa chỉ: Số 36 Nguyễn Chánh , Khu Phố Phú Cường , Phường Bình Phước , Thành Phố Đồng Nai , Việt Nam
                  </div>
                </div>
              </div>
              <div style="text-align: right;">
                <span class="badge-code">${record.code}</span>
                <div style="font-size: 10px; color: #64748b; margin-top: 4px; font-family: monospace;">LineZone AI Vision</div>
              </div>
            </div>

            <div class="doc-title">PHIẾU GHI NHẬN KIỂM ĐẾM</div>
            <div class="doc-sub">Phương thức: Camera AI LineZone 24/7 · Dữ liệu thị giác máy tính đã xác thực</div>

            <table class="data-table">
              <thead>
                <tr>
                  <th style="text-align: left;">Mã Phiếu</th>
                  <th style="text-align: left;">Thời Gian Hoàn Tất</th>
                  <th style="text-align: center;">Chiều Đếm</th>
                  <th style="text-align: right;">IN qua OUT (+)</th>
                  <th style="text-align: right;">Quay Ngược (-)</th>
                  <th style="text-align: right;">Tổng Heo Thực Tế</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="font-family: monospace; font-weight: bold; color: #1d4ed8;">${record.code}</td>
                  <td style="font-family: monospace; font-weight: bold;">${record.endTime}</td>
                  <td style="text-align: center; font-weight: bold; color: #1e40af;">
                    ${record.directionMode === 'IN_TO_OUT' ? 'Xuất Kho (IN ➔ OUT)' : 'Nhập Kho (OUT ➔ IN)'}
                  </td>
                  <td style="text-align: right; font-family: monospace; font-weight: bold; color: #059669; font-size: 13px;">+${record.forwardCount} con</td>
                  <td style="text-align: right; font-family: monospace; font-weight: bold; color: #d97706; font-size: 13px;">-${record.backwardCount} con</td>
                  <td style="text-align: right; font-family: monospace; font-weight: 900; color: #dc2626; font-size: 16px; background-color: #fef2f2 !important;">
                    ${record.actualCount} CON
                  </td>
                </tr>
              </tbody>
            </table>

            ${
              record.snapshotUrl
                ? `
              <div class="snapshot-box">
                <div class="snapshot-title">📷 ẢNH CHỤP BẰNG CHỨNG HIỆN TRƯỜNG TẠI THỜI ĐIỂM CHỐT SỐ</div>
                <div style="text-align: center; background: #0f172a; border-radius: 6px; padding: 4px;">
                  <img src="${record.snapshotUrl}" class="snapshot-img" alt="Bằng chứng hiện trường" />
                </div>
              </div>
            `
                : ''
            }

            <div class="sig-grid">
              <div class="sig-col">
                <div class="sig-name">NGƯỜI KIỂM</div>
                <div class="sig-dept">( Bộ phận kế toán )</div>
                <div class="sig-guide">(Ký & ghi rõ họ tên)</div>
                <div class="sig-dots">...................................................</div>
              </div>
              <div class="sig-col">
                <div class="sig-name">NGƯỜI ĐỒNG KIỂM</div>
                <div class="sig-dept">( Bộ phận thuộc trại )</div>
                <div class="sig-guide">(Ký & ghi rõ họ tên)</div>
                <div class="sig-dots">...................................................</div>
              </div>
            </div>

            <div class="footer-text">
              Biên bản ghi nhận kiểm đếm gia súc thông minh Thai Viet Corporation · Xác nhận thực tế tại hiện trường
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 3500);
        }
      }, 350);
    } catch {
      window.print();
    }
  };

  // LƯU DẠNG ẢNH: Tự động lưu toàn bộ biên bản về máy tính dưới định dạng PNG
  const handleSaveAsImage = async () => {
    setSavingImage(true);
    setDownloadSuccess(false);
    try {
      await exportDocketToImage(record);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Lỗi xuất ảnh phiếu:', err);
      // Fallback direct print
      window.print();
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 md:p-6 selection:bg-sky-500 selection:text-white">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col max-h-[92vh] border border-white/90 ring-1 ring-sky-100">
        {/* Modal Controls (Hidden when printing) */}
        <div className="no-print flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-sky-500/95 via-sky-600/90 to-blue-600/95 text-white border-b border-sky-400/30">
          <div className="flex items-center gap-2 font-black text-sm tracking-wide">
            <ShieldCheck className="w-4 h-4 text-sky-200" />
            <span>PHIẾU GHI NHẬN KIỂM ĐẾM - THAI VIET CORPORATION</span>
          </div>
          <div className="flex items-center gap-2">
            {downloadSuccess && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-500/90 text-white px-2.5 py-1 rounded-xl shadow-xs animate-bounce">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đã tự động lưu ảnh về máy!
              </span>
            )}

            {/* IN PHIẾU BUTTON (3D TACTILE LIÊN KẾT MÁY IN) */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-gradient-to-b from-white via-slate-50 to-slate-100 hover:from-white hover:to-slate-200 text-sky-900 text-xs font-black rounded-2xl flex items-center gap-1.5 shadow-[0_3px_0_0_#94a3b8] active:shadow-none active:translate-y-0.5 border-t border-white transition-all cursor-pointer"
              title="In liên kết trực tiếp với máy in hệ thống (Ctrl + P)"
            >
              <Printer className="w-3.5 h-3.5 text-sky-700" />
              In Phiếu (Máy In)
            </button>

            {/* LƯU DẠNG ẢNH BUTTON (3D TACTILE AUTO LƯU VỀ MÁY) */}
            <button
              onClick={handleSaveAsImage}
              disabled={savingImage}
              className="px-3.5 py-1.5 bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 disabled:opacity-60 text-white text-xs font-black rounded-2xl flex items-center gap-1.5 shadow-[0_3px_0_0_#065f46] active:shadow-none active:translate-y-0.5 border-t border-emerald-300/40 transition-all cursor-pointer"
              title="Tự động tải ảnh toàn phiếu về máy tính"
            >
              {savingImage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang Tải Ảnh...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Lưu Dạng Ảnh
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-sky-100 hover:text-white rounded-xl transition-colors cursor-pointer ml-1 hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div
          id="printable-docket-area"
          className="p-6 md:p-8 text-slate-900 overflow-y-auto font-sans bg-white space-y-5"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-xs">
                  <img
                    src="/assets/aistudio/23-logo-thai-viet-corporation_c66d41c5.jpeg"
                    alt="Thai Viet Corporation"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-base md:text-lg font-black tracking-tight text-red-600 uppercase">
                    THAI VIET CORPORATION
                  </h1>
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Hệ Thống Kiểm Đếm Gia Súc Tự Động AI
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-700 font-medium mt-2 leading-relaxed max-w-lg">
                Địa chỉ: Số 36 Nguyễn Chánh , Khu Phố Phú Cường , Phường Bình Phước , Thành Phố Đồng Nai , Việt Nam
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block text-xs font-mono font-bold text-blue-800 border-2 border-blue-600 px-3 py-1 rounded bg-blue-50">
                {record.code}
              </span>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                LineZone AI Vision
              </p>
            </div>
          </div>

          {/* Document Title: PHIẾU GHI NHẬN KIỂM ĐẾM */}
          <div className="text-center py-1">
            <h2 className="text-2xl font-black uppercase text-slate-900 tracking-tight">
              PHIẾU GHI NHẬN KIỂM ĐẾM
            </h2>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-600 mt-1">
              <span>Phương thức: Camera AI LineZone 24/7</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Dữ liệu thị giác máy tính đã xác thực
              </span>
            </div>
          </div>

          {/* Core Information Details (HIỂN THỊ ĐỒNG ĐỀU THEO HÀNG NGANG NHƯ PHẦN BÁO CÁO) */}
          <div className="border-2 border-slate-900 rounded-xl overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 border-r border-slate-300">Mã Phiếu</th>
                  <th className="py-3 px-4 border-r border-slate-300">Thời Gian Hoàn Tất</th>
                  <th className="py-3 px-4 text-center border-r border-slate-300">Chiều Đếm</th>
                  <th className="py-3 px-4 text-right border-r border-slate-300">IN qua OUT (+)</th>
                  <th className="py-3 px-4 text-right border-r border-slate-300">Quay Ngược (-)</th>
                  <th className="py-3 px-4 text-right">Tổng Heo Thực Tế</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-4 px-4 font-mono font-black text-blue-700 text-sm border-r border-slate-200">
                    {record.code}
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-slate-800 border-r border-slate-200">
                    {record.endTime}
                  </td>
                  <td className="py-4 px-4 text-center border-r border-slate-200">
                    <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      {record.directionMode === 'IN_TO_OUT' ? 'Xuất Kho (IN ➔ OUT)' : 'Nhập Kho (OUT ➔ IN)'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-bold text-emerald-600 text-sm border-r border-slate-200">
                    +{record.forwardCount} con
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-bold text-amber-600 text-sm border-r border-slate-200">
                    -{record.backwardCount} con
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-black text-red-600 text-xl bg-red-50/60">
                    {record.actualCount} CON
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Ảnh chụp bằng chứng hiện trường tại thời điểm chốt số */}
          <div className="border border-slate-300 rounded-xl p-3 bg-white space-y-2">
            <div className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Camera className="w-4 h-4 text-sky-600" />
              <span>Ảnh chụp bằng chứng hiện trường tại thời điểm chốt số</span>
            </div>

            {record.snapshotUrl ? (
              <div className="aspect-video max-h-60 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
                <img
                  src={record.snapshotUrl}
                  alt="Ảnh chụp bằng chứng hiện trường chốt số"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="py-8 bg-slate-100 rounded-lg text-center text-xs text-slate-400">
                Không có ảnh chụp camera tại lượt này.
              </div>
            )}
          </div>

          {/* Signatures: Exactly 2 People as requested */}
          <div className="grid grid-cols-2 gap-8 text-center pt-6 border-t-2 border-slate-300 mt-6">
            <div>
              <p className="text-xs font-black text-slate-900 uppercase">
                NGƯỜI KIỂM
              </p>
              <p className="text-[11px] font-semibold text-slate-600">
                ( Bộ phận kế toán )
              </p>
              <p className="text-[10px] text-slate-400 italic mt-0.5">
                (Ký &amp; ghi rõ họ tên)
              </p>
              <div className="h-24 flex items-end justify-center">
                <span className="text-xs font-semibold text-slate-400 border-b border-dotted border-slate-400 px-8 pb-1">
                  ........................................
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-black text-slate-900 uppercase">
                NGƯỜI ĐỒNG KIỂM
              </p>
              <p className="text-[11px] font-semibold text-slate-600">
                ( Bộ phận thuộc trại )
              </p>
              <p className="text-[10px] text-slate-400 italic mt-0.5">
                (Ký &amp; ghi rõ họ tên)
              </p>
              <div className="h-24 flex items-end justify-center">
                <span className="text-xs font-semibold text-slate-400 border-b border-dotted border-slate-400 px-8 pb-1">
                  ........................................
                </span>
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="text-center text-[10px] text-slate-400 mt-6 border-t border-slate-200 pt-2 font-medium">
            Biên bản ghi nhận kiểm đếm gia súc thông minh Thai Viet Corporation · Xác nhận thực tế tại hiện trường
          </div>
        </div>
      </div>
    </div>
  );
};
