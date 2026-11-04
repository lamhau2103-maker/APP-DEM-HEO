import React from 'react';
import { X, Sliders, Volume2, VolumeX, Eye, ArrowUpDown, Sparkles } from 'lucide-react';
import { CountDirection } from '../types';

interface LineSettingsModalProps {
  lineYPercent: number;
  onLineYChange: (val: number) => void;
  direction: CountDirection;
  onToggleDirection: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  countMode: 'net' | 'gross';
  onCountModeChange: (mode: 'net' | 'gross') => void;
  confidenceThreshold: number;
  onConfidenceChange: (val: number) => void;
  onClose: () => void;
}

export const LineSettingsModal: React.FC<LineSettingsModalProps> = ({
  lineYPercent,
  onLineYChange,
  direction,
  onToggleDirection,
  soundEnabled,
  onToggleSound,
  countMode,
  onCountModeChange,
  confidenceThreshold,
  onConfidenceChange,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm">Cài Đặt Vạch LineZone & Tham Số AI</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-sm text-slate-800">
          {/* Line Position Y */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-semibold">
              <label>Vị trí Vạch Đếm (Line Y-Offset):</label>
              <span className="font-mono text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded text-xs">
                {Math.round(lineYPercent * 100)}% từ đỉnh
              </span>
            </div>
            <input
              type="range"
              min="0.15"
              max="0.85"
              step="0.02"
              value={lineYPercent}
              onChange={e => onLineYChange(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Kéo thanh trượt để di chuyển vạch đếm phù hợp với cửa chuồng, cầu dẫn xe hoặc mép cầu cân.
            </p>
          </div>

          {/* Direction */}
          <div className="space-y-1.5">
            <label className="font-semibold block">Chiều Đếm Chính:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (direction !== 'IN_TO_OUT') onToggleDirection();
                }}
                className={`p-2.5 rounded-lg border text-xs font-bold text-left transition-all cursor-pointer ${
                  direction === 'IN_TO_OUT'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span>Xuất Kho (IN ➔ OUT)</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-[10px] text-slate-500 font-normal">
                  Heo chạy từ trong kho/chuồng ra xe tải
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (direction !== 'OUT_TO_IN') onToggleDirection();
                }}
                className={`p-2.5 rounded-lg border text-xs font-bold text-left transition-all cursor-pointer ${
                  direction === 'OUT_TO_IN'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span>Nhập Kho (OUT ➔ IN)</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-[10px] text-slate-500 font-normal">
                  Heo chạy từ xe tải vào kho/chuồng
                </div>
              </button>
            </div>
          </div>

          {/* Counting Logic: Net vs Gross */}
          <div className="space-y-1.5">
            <label className="font-semibold block">Phương Thức Tính Tổng Đếm:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onCountModeChange('net')}
                className={`p-2.5 rounded-lg border text-xs font-bold text-left transition-all cursor-pointer ${
                  countMode === 'net'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="block font-bold">Thực tế = (+) trừ (-)</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  Tự động trừ nếu heo chạy giật lùi ngược vạch
                </span>
              </button>

              <button
                type="button"
                onClick={() => onCountModeChange('gross')}
                className={`p-2.5 rounded-lg border text-xs font-bold text-left transition-all cursor-pointer ${
                  countMode === 'gross'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="block font-bold">Cộng dồn chiều xuôi (+)</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  Chỉ đếm heo qua vạch xuôi, bỏ qua heo quay đầu
                </span>
              </button>
            </div>
          </div>

          {/* Sound & Audio Alert */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2.5">
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-400" />
              )}
              <div>
                <p className="font-semibold text-xs text-slate-800">Âm thanh Chime khi qua vạch</p>
                <p className="text-[11px] text-slate-500">Phát tiếng &apos;bíp&apos; xác nhận mỗi khi có heo qua vạch</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleSound}
              className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                soundEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {soundEnabled ? 'BẬT' : 'TẮT'}
            </button>
          </div>

          {/* AI Confidence Threshold */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-semibold">
              <label>Ngưỡng Tin Cậy Nhận Diện (Confidence):</label>
              <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
                {(confidenceThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.30"
              max="0.90"
              step="0.05"
              value={confidenceThreshold}
              onChange={e => onConfidenceChange(parseFloat(e.target.value))}
              className="w-full accent-slate-700 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Ngưỡng cao giúp lọc bóng hoặc nhiễu; ngưỡng thấp giúp nhạy hơn khi ánh sáng chuồng yếu.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded cursor-pointer transition-colors"
          >
            Áp Dụng & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
