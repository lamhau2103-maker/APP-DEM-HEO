import React, { useState } from 'react';
import { AuthUser, ApprovedUser, PendingApproval } from '../types';
import { ShieldCheck, Mail, User, Lock, KeyRound, AlertCircle, CheckCircle2, Send, LogIn } from 'lucide-react';

interface LoginScreenProps {
  approvedUsers: ApprovedUser[];
  pendingApprovals: PendingApproval[];
  onLogin: (user: AuthUser) => void;
  onRequestApproval: (email: string, name: string) => boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  approvedUsers,
  pendingApprovals,
  onLogin,
  onRequestApproval,
}) => {
  // User form state
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);

  // Admin form state
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);

  // Helper lấy tên hiển thị mặc định từ Email nếu người dùng để trống Tên
  const getDisplayName = (email: string, rawName: string, approvedName?: string): string => {
    const trimmed = rawName.trim();
    if (trimmed) return trimmed;
    if (approvedName && approvedName.trim()) return approvedName.trim();
    if (email.includes('@')) {
      const prefix = email.split('@')[0].trim();
      if (prefix) return prefix;
    }
    return 'Nhân viên';
  };

  // Handle standard user login (Tên người dùng KHÔNG bắt buộc)
  const handleUserLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setUserSuccess(null);

    const emailTrim = userEmail.trim().toLowerCase();
    const nameTrim = userName.trim();

    if (!emailTrim) {
      setUserError('Vui lòng nhập Email người dùng.');
      return;
    }

    const foundApproved = approvedUsers.find(u => u.email.toLowerCase() === emailTrim);
    if (foundApproved) {
      const finalName = nameTrim || (emailTrim.includes('@') ? emailTrim.split('@')[0] : '') || foundApproved.name || 'Nhân viên';
      onLogin({
        email: emailTrim,
        name: finalName,
        role: 'user',
      });
      return;
    }

    const isPending = pendingApprovals.some(p => p.email.toLowerCase() === emailTrim);
    if (isPending) {
      setUserError('Email của bạn đang trong danh sách chờ Admin phê duyệt. Vui lòng liên hệ Admin để được cấp quyền.');
    } else {
      setUserError('Email này chưa được cấp quyền sử dụng hệ thống. Bạn vui lòng bấm nút "Gửi Yêu Cầu Duyệt" để Admin xem xét.');
    }
  };

  // Handle sending approval request (Tên người dùng KHÔNG bắt buộc)
  const handleSendRequest = () => {
    setUserError(null);
    setUserSuccess(null);

    const emailTrim = userEmail.trim().toLowerCase();
    const nameTrim = userName.trim();

    if (!emailTrim) {
      setUserError('Vui lòng nhập Email người dùng trước khi gửi yêu cầu duyệt.');
      return;
    }

    const isAlreadyApproved = approvedUsers.some(u => u.email.toLowerCase() === emailTrim);
    if (isAlreadyApproved) {
      setUserSuccess('Email này đã được cấp quyền từ trước! Bạn có thể bấm "Đăng Nhập" ngay.');
      return;
    }

    const finalName = getDisplayName(emailTrim, nameTrim);
    const success = onRequestApproval(emailTrim, finalName);
    if (success) {
      setUserSuccess(`Đã gửi yêu cầu phê duyệt cho "${emailTrim}" (${finalName}) thành công! Vui lòng chờ Admin phê duyệt.`);
    } else {
      setUserError('Email này đã có trong danh sách chờ duyệt trước đó. Vui lòng chờ Admin kích hoạt.');
    }
  };

  // Handle Admin login (ID: admin, Password: admin800008 or admin80008)
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);

    const idTrim = adminId.trim();
    const passTrim = adminPassword.trim();

    if (idTrim === 'admin' && (passTrim === 'admin800008' || passTrim === 'admin80008')) {
      onLogin({
        email: 'admin@thaiviet.com',
        name: 'Quản Trị Viên (Admin)',
        role: 'admin',
      });
    } else {
      setAdminError('Tài khoản hoặc mật khẩu Quản trị viên không chính xác.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100/95 via-sky-50/50 to-indigo-50/40 flex items-center justify-center p-4 selection:bg-sky-500 selection:text-white">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.08)] overflow-hidden border border-white/95 ring-1 ring-sky-100/70 flex flex-col">
        {/* Soft, fresh & luminous Brand Banner */}
        <div className="bg-gradient-to-r from-sky-500/95 via-sky-600/90 to-blue-600/95 p-6 text-white text-center relative overflow-hidden">
          {/* Subtle luminous background decoration */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-white/15 rounded-full blur-xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-sky-300/20 rounded-full blur-lg pointer-events-none"></div>

          {/* Thai Viet Corporation Official Logo */}
          <div className="w-20 h-20 rounded-2xl bg-white p-2 mx-auto flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.08)] mb-3 border border-white/90 ring-1 ring-sky-200/50">
            <img
              src="/assets/aistudio/23-logo-thai-viet-corporation_c66d41c5.jpeg"
              alt="Thai Viet Corporation"
              className="w-full h-full object-contain"
            />
          </div>

          <h1 className="text-xl font-black uppercase tracking-tight text-white drop-shadow-xs">
            HỆ THỐNG ĐẾM HEO TỰ ĐỘNG AI
          </h1>
          <p className="text-xs text-sky-100 mt-1 uppercase tracking-wider font-semibold">
            Thai Viet Corporation · Vision LineZone
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* USER LOGIN SECTION */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-slate-800 font-bold text-sm">
              <User className="w-4 h-4 text-sky-600" />
              <span>Đăng Nhập Người Dùng (Nhân Viên / Vận Hành)</span>
            </div>

            <form onSubmit={handleUserLogin} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  EMAIL NGƯỜI DÙNG:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    value={userEmail}
                    onChange={e => setUserEmail(e.target.value)}
                    placeholder="Nhập email của bạn (vd: nhanvien@thaiviet.com)..."
                    className="w-full pl-9 pr-3 py-2.5 bg-white/80 border border-slate-200 rounded-2xl text-xs font-medium focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100 shadow-2xs outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  HỌ VÀ TÊN NGƯỜI DÙNG <span className="text-slate-400 font-normal">(Không bắt buộc)</span>:
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    placeholder="Nhập họ tên (để trống sẽ tự lấy tên theo Email)..."
                    className="w-full pl-9 pr-3 py-2.5 bg-white/80 border border-slate-200 rounded-2xl text-xs font-medium focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100 shadow-2xs outline-none transition-all"
                  />
                </div>
              </div>

              {/* Status alerts */}
              {userError && (
                <div className="p-3 bg-rose-50/90 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2 shadow-2xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div className="leading-snug">{userError}</div>
                </div>
              )}

              {userSuccess && (
                <div className="p-3 bg-emerald-50/90 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-start gap-2 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <div className="leading-snug font-medium">{userSuccess}</div>
                </div>
              )}

              {/* Action Buttons (3D Tactile Styling) */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="submit"
                  className="py-3 px-4 bg-gradient-to-b from-sky-500 via-sky-600 to-sky-700 hover:from-sky-400 hover:to-sky-600 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-[0_4px_0_0_#0284c7,0_6px_12px_rgba(2,132,199,0.2)] active:shadow-none active:translate-y-0.5 border-t border-sky-300/40 transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  Đăng Nhập
                </button>

                <button
                  type="button"
                  onClick={handleSendRequest}
                  className="py-3 px-3 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 hover:from-slate-600 hover:to-slate-800 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-[0_4px_0_0_#1e293b,0_6px_12px_rgba(0,0,0,0.15)] active:shadow-none active:translate-y-0.5 border-t border-slate-500/40 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-sky-300" />
                  Gửi Yêu Cầu Duyệt
                </button>
              </div>
            </form>
          </div>

          {/* DIVIDER */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200/80 w-full"></div>
            <span className="bg-white/90 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest absolute rounded-md">
              HOẶC QUYỀN QUẢN TRỊ VIÊN
            </span>
          </div>

          {/* ADMIN LOGIN SECTION */}
          <div className="p-4 bg-gradient-to-b from-slate-50/80 to-slate-100/50 rounded-2xl border border-slate-200/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Đăng Nhập Quyền Admin
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    ID ADMIN:
                  </label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={adminId}
                      onChange={e => setAdminId(e.target.value)}
                      placeholder="Nhập ID Admin..."
                      className="w-full pl-8 pr-2 py-2 bg-white/90 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:border-sky-500 focus:ring-1 focus:ring-sky-100 outline-none shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    MẬT KHẨU ADMIN:
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      placeholder="Mật khẩu..."
                      className="w-full pl-8 pr-2 py-2 bg-white/90 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:border-sky-500 focus:ring-1 focus:ring-sky-100 outline-none shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {adminError && (
                <div className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{adminError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-gradient-to-b from-slate-900 via-slate-950 to-black hover:from-slate-800 hover:to-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-[0_3px_0_0_#0f172a] active:shadow-none active:translate-y-0.5 border-t border-slate-700/50 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Đăng Nhập Quản Trị Viên (Admin)
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50/60 border-t border-slate-200/60 text-center text-[11px] text-slate-500 font-medium">
          Thai Viet Corporation · Hệ thống giám sát và quản lý chăn nuôi AI
        </div>
      </div>
    </div>
  );
};
