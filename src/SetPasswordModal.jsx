import React, { useState } from 'react';
import { Loader2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { supabase } from './supabaseClient';

/*
 * Hiện ra MỘT LẦN cho tài khoản đăng nhập bằng Google (chưa từng đặt mật khẩu app)
 * để họ tự đặt một mật khẩu riêng cho việc đăng nhập bằng Email/Mật khẩu sau này.
 *
 * QUAN TRỌNG (đúng theo yêu cầu):
 * - Mật khẩu này KHÔNG liên quan gì tới mật khẩu Gmail — Supabase không có, và không thể có,
 *   quyền truy cập mật khẩu Gmail thật (OAuth không truyền mật khẩu qua ứng dụng thứ ba).
 * - Mật khẩu đặt ở đây được lưu độc lập trong Supabase Auth; đổi mật khẩu Gmail sau này
 *   KHÔNG làm thay đổi mật khẩu này. Mật khẩu này chỉ đổi khi người dùng chủ động đổi
 *   trong AccountSettings (đổi mật khẩu) hoặc qua luồng Quên mật khẩu.
 * - Email đăng nhập app tiếp tục là chính email Gmail họ đã dùng để đăng nhập.
 */
export default function SetPasswordModal({ session, isDarkMode, onDone, onSkip }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const email = session?.user?.email || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp.');
      return;
    }

    setSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSubmitting(false);
      setError('Không thể đặt mật khẩu: ' + updateError.message);
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ has_password: true })
      .eq('id', session.user.id);

    setSubmitting(false);

    if (profileError) {
      // Mật khẩu đã được đặt thành công ở Supabase Auth — chỉ là chưa ghi lại được cờ
      // has_password vào profiles. Không chặn người dùng vì việc này; vẫn coi là xong.
      console.error('Lỗi cập nhật profiles.has_password:', profileError.message);
    }

    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className={`w-full max-w-md rounded-2xl shadow-xl p-6 ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800'}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-[#004b87]/10 flex items-center justify-center shrink-0">
            <KeyRound size={20} className="text-[#004b87]" />
          </div>
          <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display), sans-serif' }}>
            Đặt mật khẩu đăng nhập
          </h2>
        </div>

        <p className={`text-sm mb-5 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Bạn đang đăng nhập bằng Google (<span className="font-medium">{email}</span>). Đặt thêm một mật khẩu
          riêng cho ứng dụng để lần sau có thể đăng nhập trực tiếp bằng email này mà không cần qua Google.
          Mật khẩu này độc lập với mật khẩu Gmail của bạn — đổi mật khẩu Gmail sau này sẽ không ảnh hưởng gì
          tới mật khẩu ở đây.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Mật khẩu mới</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                placeholder="••••••••"
                className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-sm outline-none focus:border-[#004b87] ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-500"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Xác nhận mật khẩu</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
              placeholder="••••••••"
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[#004b87] ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300'}`}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-[#004b87] rounded-lg py-2.5 text-sm font-semibold text-white hover:bg-[#003a68] transition-colors disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Đặt mật khẩu
          </button>

          <button
            type="button"
            onClick={onSkip}
            disabled={submitting}
            className={`w-full text-xs font-medium py-1 ${isDarkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Để sau (sẽ được nhắc lại ở lần đăng nhập tiếp theo)
          </button>
        </form>
      </div>
    </div>
  );
}
