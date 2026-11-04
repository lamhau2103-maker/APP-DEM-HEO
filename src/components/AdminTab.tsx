import React, { useState } from 'react';
import { ApprovedUser, PendingApproval } from '../types';
import { ShieldCheck, UserPlus, Users, Clock, Trash2, CheckCircle2, AlertCircle, XCircle, Mail, User, ShieldX } from 'lucide-react';

interface AdminTabProps {
  approvedUsers: ApprovedUser[];
  pendingApprovals: PendingApproval[];
  onAddApprovedUser: (email: string, name: string) => boolean;
  onRevokeUser: (email: string) => void;
  onApprovePending: (pendingId: string) => void;
  onRejectPending: (pendingId: string) => void;
}

export const AdminTab: React.FC<AdminTabProps> = ({
  approvedUsers,
  pendingApprovals,
  onAddApprovedUser,
  onRevokeUser,
  onApprovePending,
  onRejectPending,
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleGrantPermission = (e: React.FormEvent) => {
    e.preventDefault();
    const emailTrim = newEmail.trim().toLowerCase();
    const nameTrim = newName.trim();

    if (!emailTrim) {
      showToast('error', 'Vui lòng nhập email người dùng cần cấp quyền.');
      return;
    }
    if (!nameTrim) {
      showToast('error', 'Vui lòng nhập họ tên người dùng.');
      return;
    }

    const success = onAddApprovedUser(emailTrim, nameTrim);
    if (success) {
      showToast('success', `Đã cấp quyền thành công cho "${emailTrim}"! Người dùng có thể đăng nhập vào ứng dụng ngay.`);
      setNewEmail('');
      setNewName('');
    } else {
      showToast('error', `Email "${emailTrim}" đã có trong danh sách được cấp quyền từ trước!`);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full space-y-5">
      {/* Top Banner */}
      <div className="bg-white/80 backdrop-blur-xl p-5 rounded-3xl border border-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.06)] ring-1 ring-sky-100/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 text-emerald-400 flex items-center justify-center shadow-xs border border-slate-700">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase text-slate-900 tracking-tight">
              BẢNG QUẢN TRỊ VIÊN &amp; PHÂN QUYỀN TRUY CẬP (ADMIN)
            </h2>
            <p className="text-xs text-slate-500">
              Cấp quyền đăng nhập cho nhân viên, quản lý danh sách email và phê duyệt yêu cầu sử dụng
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-700 bg-white/80 px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
            {approvedUsers.length} tài khoản kích hoạt
          </span>
          {pendingApprovals.length > 0 && (
            <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100/90 px-3 py-1.5 rounded-xl border border-amber-300 animate-pulse shadow-2xs">
              {pendingApprovals.length} chờ duyệt
            </span>
          )}
        </div>
      </div>

      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 shadow-xs transition-all backdrop-blur-xs ${
            toastMsg.type === 'success'
              ? 'bg-emerald-100/90 border-emerald-300 text-emerald-950'
              : 'bg-rose-100/90 border-rose-300 text-rose-950'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* 1. SECTION: CẤP QUYỀN EMAIL MỚI */}
      <div className="bg-white/80 backdrop-blur-xl p-5 rounded-3xl border border-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.06)] ring-1 ring-sky-100/60 space-y-3.5">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-800 border-b border-slate-100 pb-2">
          <UserPlus className="w-4 h-4 text-sky-600" />
          <span>Cấp Quyền Cho Email Người Dùng Mới</span>
        </div>

        <form onSubmit={handleGrantPermission} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              EMAIL NGƯỜI DÙNG CẦN CẤP QUYỀN:
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="Nhập email nhân viên (vd: kcs.nam@thaiviet.com)..."
                className="w-full pl-9 pr-3 py-2.5 bg-white/90 border border-slate-200 rounded-2xl text-xs font-medium focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-100 outline-none shadow-2xs"
              />
            </div>
          </div>

          <div className="md:col-span-4">
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              HỌ VÀ TÊN NGƯỜI DÙNG:
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nhập tên người dùng..."
                className="w-full pl-9 pr-3 py-2.5 bg-white/90 border border-slate-200 rounded-2xl text-xs font-medium focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-100 outline-none shadow-2xs"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-b from-sky-500 via-sky-600 to-sky-700 hover:from-sky-400 hover:to-sky-600 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-[0_4px_0_0_#0284c7,0_6px_14px_rgba(2,132,199,0.25)] active:shadow-none active:translate-y-0.5 border-t border-sky-300/40 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Cấp Quyền Sử Dụng
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 2. SECTION: DANH SÁCH EMAIL ĐƯỢC CẤP QUYỀN (7 COLS) */}
        <div className="lg:col-span-7 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.06)] ring-1 ring-sky-100/60 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Danh Sách Email Đã Được Cấp Quyền ({approvedUsers.length})</span>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            {approvedUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Chưa có email nào trong danh sách được cấp quyền.
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Email Người Dùng</th>
                    <th className="py-2.5 px-3">Họ Tên</th>
                    <th className="py-2.5 px-3">Ngày Cấp</th>
                    <th className="py-2.5 px-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {approvedUsers.map(u => (
                    <tr key={u.email} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                        {u.email}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {u.name}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-400">
                        {u.approvedAt}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            onRevokeUser(u.email);
                            showToast('success', `Đã thu hồi quyền sử dụng của "${u.email}".`);
                          }}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-bold text-[10px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title="Thu hồi quyền sử dụng email này"
                        >
                          <ShieldX className="w-3 h-3 text-rose-600" />
                          Thu hồi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 3. SECTION: YÊU CẦU BẠN PHÊ DUYỆT (5 COLS) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-amber-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-900 uppercase tracking-wider">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Yêu Cầu Bạn Phê Duyệt ({pendingApprovals.length})</span>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 max-h-[460px] p-3 space-y-2.5">
            {pendingApprovals.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Hiện không có yêu cầu nào đang chờ phê duyệt.
              </div>
            ) : (
              pendingApprovals.map(req => (
                <div
                  key={req.id}
                  className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 space-y-2 hover:bg-amber-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono font-bold text-xs text-slate-900">{req.email}</p>
                      <p className="text-xs text-slate-600 font-medium">Họ tên: {req.name}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {req.requestedAt}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-amber-200/60">
                    <button
                      onClick={() => {
                        onApprovePending(req.id);
                        showToast('success', `Đã duyệt cấp quyền cho "${req.email}".`);
                      }}
                      className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Duyệt Cấp Quyền
                    </button>

                    <button
                      onClick={() => {
                        onRejectPending(req.id);
                        showToast('success', `Đã từ chối yêu cầu của "${req.email}".`);
                      }}
                      className="py-1.5 px-2.5 bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 rounded font-bold text-xs transition-colors cursor-pointer"
                      title="Từ chối yêu cầu"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
