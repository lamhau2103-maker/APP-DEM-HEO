import React from 'react';
import { BatchRecord } from '../types';
import { X, FileSpreadsheet, Trash2, Printer, Calendar, Truck, ArrowUpDown } from 'lucide-react';

interface HistoryModalProps {
  records: BatchRecord[];
  onClose: () => void;
  onSelectForPrint: (record: BatchRecord) => void;
  onClearHistory: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  records,
  onClose,
  onSelectForPrint,
  onClearHistory,
}) => {
  const exportToCSV = () => {
    if (records.length === 0) return;
    const headers = [
      'Mã phiếu',
      'Tên trại',
      'Loại heo',
      'Biển số xe',
      'Sàn xe',
      'Kế hoạch (con)',
      'Thực đếm (con)',
      'IN qua OUT (+)',
      'Quay ngược (-)',
      'Chiều đếm',
      'Bắt đầu',
      'Hoàn tất',
      'Tài xế',
      'KCS Kiểm đếm',
      'Ghi chú',
    ];

    const rows = records.map(r => [
      r.code,
      `"${r.farmName || ''}"`,
      `"${r.pigType || ''}"`,
      r.licensePlate,
      r.deckNumber,
      r.expectedCount,
      r.actualCount,
      r.forwardCount,
      r.backwardCount,
      r.directionMode === 'IN_TO_OUT' ? 'Xuất Kho' : 'Nhập Kho',
      r.startTime,
      r.endTime,
      `"${r.driverName || ''}"`,
      `"${r.inspectorName || ''}"`,
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="font-bold text-base">Lịch Sử Kiểm Đếm & Sổ Cái Các Chuyến Xe</h2>
              <p className="text-xs text-slate-400">Tổng hợp các đợt giao nhận gia súc đã chốt số qua camera AI</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {records.length > 0 && (
              <button
                onClick={exportToCSV}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Xuất Excel / CSV
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {records.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Truck className="w-12 h-12 mx-auto stroke-1 mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">Chưa có chuyến xe nào được lưu trong phiên này</p>
              <p className="text-xs text-slate-400 mt-1">
                Sau khi đếm heo xong, nhấn &quot;Lưu Lô Hàng&quot; hoặc &quot;In Phiếu&quot; để lưu lại lịch sử chuyến xe.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>Tổng cộng: <strong className="text-slate-800">{records.length} lượt đếm</strong></span>
                <span>
                  Tổng heo đã qua vạch:{' '}
                  <strong className="text-red-600 font-mono text-sm">
                    {records.reduce((acc, r) => acc + r.actualCount, 0)} con
                  </strong>
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Mã phiếu</th>
                      <th className="py-2.5 px-3">Thời gian</th>
                      <th className="py-2.5 px-3">Trại / Biển số xe</th>
                      <th className="py-2.5 px-3">Loại heo / Sàn</th>
                      <th className="py-2.5 px-3 text-right">Kế hoạch</th>
                      <th className="py-2.5 px-3 text-right">Thực tế AI</th>
                      <th className="py-2.5 px-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {records.map(record => (
                      <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-mono font-semibold text-blue-700">
                          {record.code}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <div>{record.endTime.split(' ')[0]}</div>
                          <div className="text-[10px] text-slate-400">{record.endTime.split(' ')[1]}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{record.farmName || 'Trại Trung Tâm'}</div>
                          <div className="font-mono text-slate-600 flex items-center gap-1 text-[11px]">
                            <Truck className="w-3 h-3 text-slate-400" />
                            {record.licensePlate || 'Chưa biển số'}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <div>{record.pigType}</div>
                          <div className="text-[11px] text-slate-400 font-semibold">{record.deckNumber}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          {record.expectedCount ? `${record.expectedCount} con` : '--'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="font-mono text-base font-bold text-red-600">
                            {record.actualCount}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            (+{record.forwardCount} / -{record.backwardCount})
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => onSelectForPrint(record)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="In lại phiếu"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {records.length > 0 && (
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => {
                if (window.confirm('Bạn có chắc chắn muốn xoá toàn bộ lịch sử các đợt đếm?')) {
                  onClearHistory();
                }
              }}
              className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xoá toàn bộ lịch sử
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
