import React, { useRef, useState } from 'react';
import { OnnxPigDetector } from '../utils/onnxModel';
import { Cpu, Upload, RefreshCw, CheckCircle2, AlertCircle, FileCode, Sliders, ShieldAlert, Lock, Volume2, VolumeX, Move, ShieldCheck, ArrowUpDown } from 'lucide-react';
import { UserRole } from '../types';

interface AiParamsTabProps {
  userRole: UserRole;
  onnxDetector: OnnxPigDetector;
  isModelLoaded: boolean;
  modelName: string;
  onModelLoaded: (name: string) => void;
  confidenceThreshold: number;
  onConfidenceChange: (val: number) => void;
  countMode: 'net' | 'gross';
  onCountModeChange: (mode: 'net' | 'gross') => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onResetLineZone?: () => void;
}

export const AiParamsTab: React.FC<AiParamsTabProps> = ({
  userRole,
  onnxDetector,
  isModelLoaded,
  modelName,
  onModelLoaded,
  confidenceThreshold,
  onConfidenceChange,
  countMode,
  onCountModeChange,
  soundEnabled,
  onToggleSound,
  onResetLineZone,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isAdmin = userRole === 'admin';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const buffer = await file.arrayBuffer();
      const success = await onnxDetector.loadModelFromBuffer(buffer, file.name);
      if (success) {
        onModelLoaded(file.name);
        setSuccessMsg(`Đã nạp thành công mô hình Roboflow: ${file.name}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tệp ONNX không hợp lệ';
      setErrorMsg(`Lỗi nạp file ONNX: ${msg}. Đảm bảo tệp xuất từ Roboflow ở định dạng ONNX.`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDefault = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const success = await onnxDetector.autoLoadModel();
      if (success) {
        onModelLoaded('weights1.onnx (Gốc)');
        setSuccessMsg('Đã kết nối và nạp thành công /weights1.onnx!');
      } else {
        setErrorMsg('Chưa tìm thấy /weights1.onnx trên máy chủ hoặc preview. Vui lòng bấm nút "Tải Lên Tệp weights1.onnx" bên dưới để chọn file từ máy.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối';
      setErrorMsg(`Không thể nạp tệp: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full relative">
      {/* LOCKED OVERLAY IF NOT ADMIN */}
      {!isAdmin && (
        <div className="absolute inset-0 z-30 bg-slate-100/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-7 rounded-3xl border-2 border-amber-300 shadow-2xl max-w-md text-center space-y-3.5">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black uppercase text-slate-900 tracking-tight">
              TÀI KHOẢN NGƯỜI DÙNG BỊ ẨN MỜ
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Chỉ tài khoản <strong className="text-slate-900">Admin (Quản trị viên)</strong> mới được thao tác nạp tệp trọng số <strong className="font-mono text-sky-700">weights1.onnx</strong> và điều chỉnh các thông số hệ thống AI.
            </p>
            <div className="p-3 bg-amber-50 rounded-xl text-[11px] text-amber-800 font-medium">
              Tài khoản người dùng (Nhân viên) chỉ có quyền theo dõi và giám sát đếm.
            </div>
          </div>
        </div>
      )}

      {/* Main Settings Container (Dimmed if not admin) */}
      <div className={`space-y-4 ${!isAdmin ? 'opacity-40 pointer-events-none select-none filter blur-[0.5px]' : ''}`}>
        {/* Header Banner */}
        <div className="bg-white/80 backdrop-blur-xl p-5 rounded-3xl border border-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.06)] ring-1 ring-sky-100/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shadow-2xs">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase text-slate-900 tracking-tight">
                THÔNG SỐ AI &amp; NẠP TRỌNG SỐ ROBOFLOW
              </h2>
              <p className="text-xs text-slate-500">
                Nạp tệp mạng nơ-ron weights1.onnx và quản lý toàn bộ cấu hình hệ thống
              </p>
            </div>
          </div>

          <span className="text-xs bg-sky-100 text-sky-800 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-mono border border-sky-200">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
            QUYỀN ADMIN: {isAdmin ? 'ĐƯỢC PHÉP' : 'KHÓA'}
          </span>
        </div>

        {/* Current Model Status Banner */}
        <div
          className={`p-4.5 rounded-3xl border flex items-start gap-3.5 backdrop-blur-md shadow-2xs ${
            isModelLoaded
              ? 'bg-emerald-50/80 border-emerald-300/80 text-emerald-950'
              : 'bg-sky-50/80 border-sky-300/80 text-sky-950'
          }`}
        >
          {isModelLoaded ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-bold text-sm">
                Trạng thái: {isModelLoaded ? 'Mô hình Roboflow ONNX đang hoạt động' : 'Chưa kết nối weights1.onnx (Vui lòng nạp weights1.onnx)'}
              </p>
              <span className="font-mono text-xs font-bold text-sky-700 bg-white/90 px-2.5 py-0.5 rounded-xl border border-sky-200 shadow-2xs">
                {modelName}
              </span>
            </div>
            <p className="text-xs mt-1 text-slate-700">
              {isModelLoaded
                ? 'Đã kết nối thành công file trọng số weights1.onnx. Hệ thống chỉ nhận diện hình dạng heo, tự động bỏ qua người và vật.'
                : 'Ứng dụng chỉ nhận diện kết quả từ mô hình ONNX. Bạn hãy chọn tệp weights1.onnx từ máy để nạp trực tiếp.'}
            </p>
          </div>
        </div>

        {/* 1. SECTION: Nạp weights1.onnx */}
        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.06)] ring-1 ring-sky-100/60 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-sky-600" />
              Nạp Tệp Trọng Số Model Roboflow (weights1.onnx)
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Định dạng .onnx</span>
          </div>

          <div className="border-2 border-dashed border-sky-200 hover:border-sky-400 rounded-3xl p-7 text-center bg-sky-50/40 backdrop-blur-xs transition-colors">
            <FileCode className="w-12 h-12 mx-auto text-sky-600 mb-2 stroke-1" />
            <p className="font-bold text-slate-800 text-sm">
              Chọn hoặc Kéo thả tệp <span className="font-mono text-sky-700 font-bold">weights1.onnx</span> từ máy tính của bạn
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Hỗ trợ mô hình YOLOv8, YOLOv11 hoặc YOLOv5 huấn luyện từ Roboflow xuất ở định dạng ONNX.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept=".onnx"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              <button
                type="button"
                disabled={loading || !isAdmin}
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-3 bg-gradient-to-b from-sky-500 via-sky-600 to-sky-700 hover:from-sky-400 hover:to-sky-600 text-white font-black text-xs rounded-2xl flex items-center gap-2 shadow-[0_4px_0_0_#0284c7,0_6px_14px_rgba(2,132,199,0.25)] active:shadow-none active:translate-y-0.5 border-t border-sky-300/40 transition-all cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {loading ? 'Đang nạp model...' : 'Tải Lên Tệp weights1.onnx'}
              </button>

              <button
                type="button"
                disabled={loading || !isAdmin}
                onClick={handleLoadDefault}
                className="px-4 py-3 bg-gradient-to-b from-white via-slate-50 to-slate-100 hover:from-white hover:to-slate-200 text-slate-800 font-bold text-xs rounded-2xl flex items-center gap-1.5 border border-slate-200 shadow-[0_3px_0_0_#cbd5e1] active:shadow-none active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4 text-slate-600" />
                Nạp lại file gốc server
              </button>
            </div>
          </div>

          {successMsg && (
            <div className="p-3.5 bg-emerald-100/90 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center gap-2 font-bold text-xs shadow-2xs backdrop-blur-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-rose-50/90 border border-rose-300 text-rose-800 rounded-2xl flex items-start gap-2 text-xs font-semibold shadow-2xs backdrop-blur-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* 2. SECTION: Cài Đặt Toàn Bộ Thông Số Hệ Thống AI */}
        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.06)] ring-1 ring-sky-100/60 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-600" />
              Cài Đặt Toàn Bộ Thông Số Hệ Thống AI
            </h3>
            <span className="text-[11px] text-slate-400">Cấu hình thời gian thực</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Confidence Threshold */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <label>Ngưỡng Tin Cậy (Confidence Threshold):</label>
                <span className="font-mono text-sky-700 bg-white px-2.5 py-0.5 rounded-lg border border-sky-200 text-xs font-black">
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
                className="w-full accent-sky-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Độ nhạy AI: 65% - 75% là tối ưu. Ngưỡng cao lọc sạch bóng mờ và phản xạ sàn chuồng.
              </p>
            </div>

            {/* Sound Toggle */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {soundEnabled ? (
                  <Volume2 className="w-6 h-6 text-emerald-600" />
                ) : (
                  <VolumeX className="w-6 h-6 text-slate-400" />
                )}
                <div>
                  <p className="font-bold text-xs text-slate-800">Âm thanh bíp khi qua vạch</p>
                  <p className="text-[11px] text-slate-500">Phát âm chime xác nhận khi có heo qua vạch</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleSound}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer transition-colors ${
                  soundEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                }`}
              >
                {soundEnabled ? 'BẬT' : 'TẮT'}
              </button>
            </div>

            {/* Reset LineZone to default */}
            {onResetLineZone && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between md:col-span-2">
                <div className="flex items-center gap-3">
                  <Move className="w-5 h-5 text-sky-600" />
                  <div>
                    <p className="font-bold text-xs text-slate-800">Căn Lại Vị Trí Vạch LineZone Mặc Định</p>
                    <p className="text-[11px] text-slate-500">Đặt lại Điểm A và Điểm B về vị trí ngang chuẩn ở giữa khung hình</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onResetLineZone}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Căn Giữa Vạch
                </button>
              </div>
            )}

            {/* Net vs Gross Mode */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 md:col-span-2">
              <label className="font-bold text-xs text-slate-800 block">
                Phương Thức Tính Tổng Đếm:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onCountModeChange('net')}
                  className={`p-3 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                    countMode === 'net'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="block font-black">Thực tế = (+) trừ (-)</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Tự động trừ số lượng nếu heo giật lùi quay đầu ngược vạch
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onCountModeChange('gross')}
                  className={`p-3 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                    countMode === 'gross'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="block font-black">Cộng dồn chiều xuôi (+)</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Chỉ đếm cá thể qua vạch xuôi, bỏ qua heo quay đầu
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
