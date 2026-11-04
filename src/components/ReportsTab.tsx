import React, { useState } from 'react';
import { BatchRecord } from '../types';
import { FileSpreadsheet, Printer, Copy, Check, MessageSquare, Trash2, ArrowUpDown, Calendar, Clock, ShieldCheck, ExternalLink } from 'lucide-react';

interface ReportsTabProps {
  records: BatchRecord[];
  onSelectForPrint: (record: BatchRecord) => void;
  onClearRecords: () => void;
  onDeleteRecord: (id: string) => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  records,
  onSelectForPrint,
  onClearRecords,
  onDeleteRecord,
}) => {
  const [copiedZalo, setCopiedZalo] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Copy all saved records to clipboard formatted for Zalo
  const handleCopyZalo = async () => {
    if (records.length === 0) {
      setToastMsg('Chưa có dòng thông tin nào được lưu để gửi Zalo!');
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('vi-VN');
    const timeFormatted = now.toLocaleTimeString('vi-VN');
    const totalPigs = records.reduce((sum, r) => sum + r.actualCount, 0);

    let zaloMessage = `🐖 BÁO CÁO ĐẾM HEO TỰ ĐỘNG AI\n`;
    zaloMessage += `🏢 Đơn vị: THAI VIET CORPORATION\n`;
    zaloMessage += `📅 Ngày xuất báo cáo: ${timeFormatted} | ${dateFormatted}\n`;
    zaloMessage += `📊 Tổng số lượt đếm: ${records.length} đợt | TỔNG CỘNG: ${totalPigs} CON HEO\n`;
    zaloMessage += `-------------------------------------------\n`;

    records.forEach((rec, idx) => {
      zaloMessage += `${idx + 1}. Mã phiếu: ${rec.code}\n`;
      zaloMessage += `   ⏱ Thời gian: ${rec.endTime}\n`;
      zaloMessage += `   🐖 Số lượng: ${rec.actualCount} con (Xuôi: +${rec.forwardCount} | Quay đầu: -${rec.backwardCount})\n`;
      zaloMessage += `   🔄 Chiều đếm: ${rec.directionMode === 'IN_TO_OUT' ? 'Xuất Kho (IN ➔ OUT)' : 'Nhập Kho (OUT ➔ IN)'}\n`;
      if (rec.notes) {
        zaloMessage += `   📝 Ghi chú: ${rec.notes}\n`;
      }
      zaloMessage += `\n`;
    });

    zaloMessage += `-------------------------------------------\n`;
    zaloMessage += `✅ Dữ liệu tự động xác thực bằng hệ thống Camera AI LineZone.`;

    try {
      await navigator.clipboard.writeText(zaloMessage);
      setCopiedZalo(true);
      setToastMsg('Đã sao chép nội dung báo cáo Zalo! Bạn chỉ cần nhấn Dán (Ctrl + V) vào nhóm Zalo.');
      setTimeout(() => {
        setCopiedZalo(false);
        setToastMsg(null);
      }, 4000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = zaloMessage;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedZalo(true);
      setToastMsg('Đã sao chép nội dung báo cáo Zalo!');
      setTimeout(() => setCopiedZalo(false), 3000);
    }
  };

  const handleExportCSV = () => {
    if (records.length === 0) return;
    const headers = [
      'STT',
      'Mã phiếu',
      'Thời gian',
      'Tổng số heo (con)',
      'IN qua OUT (+)',
      'Quay ngược (-)',
      'Chiều đếm',
      'Ghi chú',
    ];

    const rows = records.map((r, i) => [
      i + 1,
      r.code,
      `"${r.endTime}"`,
      r.actualCount,
      r.forwardCount,
      r.backwardCount,
      r.directionMode === 'IN_TO_OUT' ? 'Xuất Kho' : 'Nhập Kho',
      `"${r.notes || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bao_cao_dem_heo_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalActual = records.reduce((sum, r) => sum + r.actualCount, 0);
  const totalForward = records.reduce((sum, r) => sum + r.forwardCount, 0);
  const totalBackward = records.reduce((sum, r) => sum + r.backwardCount, 0);

  return (
    <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full flex flex-col space-y-4">
      {/* Top Banner & Quick Actions */}
      <div className="bg-white/80 backdrop-blur-xl p-5 rounded-3xl border border-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.06)] ring-1 ring-sky-100/60 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black uppercase text-slate-900 tracking-tight flex items-center gap-2">
            BÁO CÁO CÁC LÔ HEO ĐÃ LƯU
            <span className="text-xs bg-sky-100 text-sky-800 font-mono px-2.5 py-0.5 rounded-xl font-bold border border-sky-200">
              {records.length} LƯỢT
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Dữ liệu tổng hợp từ các lần ấn nút &quot;LƯU&quot; tại giao diện Camera &amp; Đếm
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* ZALO REPORT BUTTON (3D TACTILE) */}
          <button
            onClick={handleCopyZalo}
            className={`px-4 py-2.5 text-xs font-black rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer border-t border-white/40 ${
              copiedZalo
                ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 text-white shadow-[0_3px_0_0_#047857]'
                : 'bg-gradient-to-b from-sky-500 via-sky-600 to-sky-700 hover:from-sky-400 hover:to-sky-600 text-white shadow-[0_4px_0_0_#0284c7,0_6px_14px_rgba(2,132,199,0.25)] active:shadow-none active:translate-y-0.5'
            }`}
          >
            {copiedZalo ? <Check className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
            <span>{copiedZalo ? 'Đã Sao Chép Zalo!' : 'Báo Cáo Zalo (Copy Tất Cả)'}</span>
          </button>

          <a
            href="https://chat.zalo.me"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 bg-gradient-to-b from-white via-slate-50 to-slate-100 hover:from-white hover:to-slate-200 text-slate-700 text-xs font-bold rounded-2xl border border-slate-200 shadow-[0_3px_0_0_#cbd5e1] active:shadow-none active:translate-y-0.5 flex items-center gap-1 transition-all"
            title="Mở Zalo Web"
          >
            <span>Mở Zalo</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </a>

          <button
            onClick={handleExportCSV}
            disabled={records.length === 0}
            className="px-4 py-2.5 bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-2xl flex items-center gap-1.5 border-t border-emerald-400/40 shadow-[0_4px_0_0_#065f46,0_6px_14px_rgba(5,150,105,0.25)] active:shadow-none active:translate-y-0.5 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Xuất Excel/CSV
          </button>

          {records.length > 0 && (
            <button
              onClick={() => {
                onClearRecords();
                setToastMsg('Đã xóa toàn bộ danh sách báo cáo');
                setTimeout(() => setToastMsg(null), 3000);
              }}
              className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-2xl border border-rose-200 shadow-2xs transition-all cursor-pointer active:scale-95"
              title="Xóa danh sách báo cáo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-3.5 bg-emerald-100/90 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all animate-bounce backdrop-blur-xs">
          <Check className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Summary Stat Cards (Soft 3D Pastel Tiles) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-white/95 shadow-[0_6px_20px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            TỔNG SỐ LƯỢT ĐÃ LƯU
          </span>
          <div className="text-2xl font-black font-mono text-slate-800 mt-1">
            {records.length}
          </div>
          <span className="text-[10px] text-slate-400">chuyến / lượt giao nhận</span>
        </div>

        <div className="bg-gradient-to-b from-white/90 to-emerald-50/50 backdrop-blur-xl p-4 rounded-3xl border border-emerald-100 shadow-[0_6px_20px_rgba(16,185,129,0.06)] ring-1 ring-emerald-50">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            TỔNG HEO ĐÃ ĐẾM QUA VẠCH
          </span>
          <div className="text-2xl font-black font-mono text-emerald-600 mt-1">
            {totalActual}
          </div>
          <span className="text-[10px] text-emerald-600/70">con heo thực tế</span>
        </div>

        <div className="bg-gradient-to-b from-white/90 to-blue-50/50 backdrop-blur-xl p-4 rounded-3xl border border-blue-100 shadow-[0_6px_20px_rgba(59,130,246,0.06)] ring-1 ring-blue-50">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
            LƯỢT ĐI XUÔI (+)
          </span>
          <div className="text-2xl font-black font-mono text-blue-600 mt-1">
            +{totalForward}
          </div>
          <span className="text-[10px] text-blue-600/70">con qua đúng chiều</span>
        </div>

        <div className="bg-gradient-to-b from-white/90 to-amber-50/50 backdrop-blur-xl p-4 rounded-3xl border border-amber-100 shadow-[0_6px_20px_rgba(245,158,11,0.06)] ring-1 ring-amber-50">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
            LƯỢT QUAY NGƯỢC (-)
          </span>
          <div className="text-2xl font-black font-mono text-amber-600 mt-1">
            -{totalBackward}
          </div>
          <span className="text-[10px] text-amber-600/70">con quay đầu lùi lại</span>
        </div>
      </div>

      {/* Saved Records Table (Soft Glass Container) */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.05)] ring-1 ring-sky-100/50 overflow-hidden flex-1 flex flex-col">
        {records.length === 0 ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <MessageSquare className="w-12 h-12 mx-auto stroke-1 text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">Chưa có dòng thông tin nào được lưu</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Tại màn hình <strong>&quot;Camera &amp; Đếm&quot;</strong>, sau khi đếm xong hãy bấm nút <strong>&quot;LƯU&quot;</strong> để lưu lại báo cáo và sử dụng tính năng <strong>&quot;Báo cáo Zalo&quot;</strong>.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4">Mã Phiếu</th>
                  <th className="py-3 px-4">Thời Gian Hoàn Tất</th>
                  <th className="py-3 px-4 text-center">Chiều Đếm</th>
                  <th className="py-3 px-4 text-right">IN qua OUT (+)</th>
                  <th className="py-3 px-4 text-right">Quay Ngược (-)</th>
                  <th className="py-3 px-4 text-right">Tổng Thực Tế</th>
                  <th className="py-3 px-4">Ghi Chú</th>
                  <th className="py-3 px-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {records.map((rec, idx) => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                      {rec.code}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {rec.endTime}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        rec.directionMode === 'IN_TO_OUT'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {rec.directionMode === 'IN_TO_OUT' ? 'Xuất Kho (IN ➔ OUT)' : 'Nhập Kho (OUT ➔ IN)'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                      +{rec.forwardCount}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-600">
                      -{rec.backwardCount}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-red-600 text-base">
                      {rec.actualCount} con
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {rec.notes || '--'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onSelectForPrint(rec)}
                          className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title="Xem lại và in phiếu"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          In Phiếu
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRecord(rec.id);
                            setToastMsg(`Đã xóa bỏ dòng phiếu ${rec.code}`);
                            setTimeout(() => setToastMsg(null), 3000);
                          }}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-2xs"
                          title="Xóa dòng dữ liệu này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
