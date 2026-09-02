import React, { useState, useEffect } from 'react';
import { Loader2, Moon, Sun, Eye, EyeOff, Check } from 'lucide-react';
import { supabase } from './supabaseClient';
import logoIctu from './assets/logo-ictu.png';
// Ảnh toà nhà KTX dùng cho panel bên trái — thay bằng ảnh thật của trường trong thư mục assets.
import ktxBuilding from './assets/ktx-building.jpg';

/* Hallmark · genre: modern-minimal · macrostructure: Split Panel (Auth)
 * design-system: design.md · designed-as-app
 * Cấu trúc đã đạt chuẩn từ trước — lượt này chỉ đồng bộ font-display, không đổi layout.
 */

// Chuẩn hoá email trước khi gửi tới Supabase (chỉ trim + lowercase).
// KHÔNG được strip dấu chấm Gmail: auth.users.email lưu email gốc y hệt Google trả về (có dấu chấm
// nếu người dùng đăng ký lần đầu qua Google OAuth). Supabase so khớp email đăng nhập theo đúng
// chuỗi ký tự trong auth.users -> nếu strip dấu chấm ở client, email gửi lên sẽ khác chuỗi gốc,
// signInWithPassword báo "Invalid login credentials" dù mật khẩu đúng (đã xác nhận qua Auth log
// thực tế: đổi mật khẩu qua Admin API thành công nhưng đăng nhập ngay sau đó vẫn fail vì email
// bị strip dấu chấm không khớp auth.users.email có dấu chấm).
function normalizeEmail(raw) {
  return raw.trim().toLowerCase();
}

// Mật khẩu phải có: 1 chữ thường, 1 chữ hoa, 1 chữ số, 1 ký hiệu.
const PASSWORD_RULES = [
  { key: 'lower', label: 'chữ thường', test: (v) => /[a-z]/.test(v) },
  { key: 'upper', label: 'chữ HOA', test: (v) => /[A-Z]/.test(v) },
  { key: 'digit', label: 'chữ số', test: (v) => /\d/.test(v) },
  { key: 'symbol', label: 'ký hiệu', test: (v) => /[^A-Za-z0-9]/.test(v) },
  { key: 'length', label: 'tối thiểu 6 ký tự', test: (v) => v.length >= 6 },
];
const PASSWORD_STRENGTH_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

// Checklist sống theo giá trị đang gõ — thay cho 1 dòng chữ mờ tĩnh, để người dùng
// nhìn ngay tiêu chí nào đã đạt (tick xanh) / chưa đạt (vẫn xám), thay vì phải tự
// đọc câu văn rồi tự đối chiếu với ô mật khẩu.
function PasswordRequirements({ value, theme }) {
  return (
    <div className="-mt-2 flex flex-wrap gap-1.5">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        return (
          <span
            key={rule.key}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors duration-200 ${
              met
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                : `border-transparent ${theme.dividerText}`
            }`}
          >
            <Check size={11} strokeWidth={3} className={met ? 'opacity-100' : 'opacity-30'} />
            {rule.label}
          </span>
        );
      })}
    </div>
  );
}

// mode: 'login' | 'register' | 'forgot'
export default function Login({ errorMessage, isDark, setIsDark }) {
  const [mode, setMode] = useState('login');
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(errorMessage || '');
  const [notice, setNotice] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Quên mật khẩu — 2 bước: 'request' (nhập email, gửi mã) -> 'verify' (nhập mã 6 số + mật khẩu mới)
  const [forgotStep, setForgotStep] = useState('request');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => setError(errorMessage || ''), [errorMessage]);

  const resetMessages = () => { setError(''); setNotice(''); };

  const switchMode = (next) => {
    resetMessages();
    setPassword('');
    if (next !== 'forgot') {
      setForgotStep('request');
      setOtpCode('');
      setNewPassword('');
    }
    setMode(next);
  };

  // --- OAuth (Google) ---
  const handleOAuthLogin = async (provider) => {
    resetMessages();
    setLoadingProvider(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setError('Đăng nhập thất bại: ' + error.message);
      setLoadingProvider(null);
    }
  };

  // --- Đăng nhập bằng Email/Mật khẩu ---
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    resetMessages();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
    if (error) setError(dichLoiSupabase(error.message));
    setSubmitting(false);
  };

  // --- Đăng ký bằng Email/Mật khẩu (mặc định role = student) ---
  const handleEmailRegister = async (e) => {
    e.preventDefault();
    resetMessages();
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: { data: { full_name: fullName } },
    });
    setSubmitting(false);
    if (error) {
      setError(dichLoiSupabase(error.message));
      return;
    }
    if (data.session) {
      // Dự án đã tắt xác nhận email -> đăng nhập luôn, không cần làm gì thêm.
      // Tài khoản này đăng ký trực tiếp bằng mật khẩu nên đánh dấu luôn has_password = true
      // (khác với tài khoản tạo qua Google, ban đầu chưa có mật khẩu app).
      await supabase.from('profiles').update({ has_password: true }).eq('id', data.user.id);
      return;
    }
    // Dự án đang bật xác nhận email (mặc định của Supabase)
    setNotice('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản trước khi đăng nhập.');
    setMode('login');
  };

  // --- Quên mật khẩu, bước 1: gửi mã 6 chữ số về email ---
  // LƯU Ý: để email thực sự chứa mã 6 số (thay vì link), template "Reset Password" trong
  // Supabase Dashboard phải dùng {{ .Token }} thay vì {{ .ConfirmationURL }} — đây là cấu hình
  // ở Dashboard, không thể chỉnh từ code phía client.
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    resetMessages();
    setSubmitting(true);
    const { error } = await supabase.functions.invoke('send-otp', {
      body: { email: normalizeEmail(email) },
    });
    setSubmitting(false);
    if (error) {
      setError('Không gửi được mã. Vui lòng thử lại sau.');
      return;
    }
    setNotice('Đã gửi mã gồm 6 chữ số tới email của bạn. Mã có hiệu lực trong thời gian ngắn.');
    setForgotStep('verify');
  };

  // --- Quên mật khẩu, bước 2: xác nhận mã 6 số + đặt mật khẩu mới ---
  const handleForgotVerify = async (e) => {
    e.preventDefault();
    resetMessages();
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (!PASSWORD_STRENGTH_REGEX.test(newPassword)) {
      setError('Mật khẩu mới phải bao gồm chữ thường, chữ hoa, chữ số và ký hiệu.');
      return;
    }
    setSubmitting(true);

    const { data, error } = await supabase.functions.invoke('verify-otp', {
      body: { email: normalizeEmail(email), code: otpCode.trim(), newPassword },
    });
    setSubmitting(false);
    if (error || data?.error) {
      // supabase.functions.invoke không tự parse body lỗi vào `data` khi status khác 2xx,
      // nên phải tự đọc response thật (error.context) để không hiện nhầm "mã sai/hết hạn"
      // cho các lỗi khác (vd. mật khẩu bị Supabase từ chối vì không đủ mạnh).
      let serverMessage = data?.error;
      if (!serverMessage && error?.context) {
        try {
          const body = await error.context.json();
          serverMessage = body?.error;
        } catch {
          // response không phải JSON -> bỏ qua, dùng fallback bên dưới
        }
      }
      setError(serverMessage || 'Mã xác nhận không đúng hoặc đã hết hạn. Vui lòng gửi lại mã.');
      return;
    }

    setNotice('Đổi mật khẩu thành công! Vui lòng đăng nhập lại bằng mật khẩu mới.');
    setPassword('');
    setOtpCode('');
    setNewPassword('');
    setForgotStep('request');
    setMode('login');
  };

  const theme = isDark
    ? {
        panel: 'bg-slate-900',
        title: 'text-white',
        subtitle: 'text-blue-300',
        label: 'text-slate-300',
        input: 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-400',
        divider: 'border-slate-700',
        dividerText: 'text-slate-500',
        footerText: 'text-slate-400',
        link: 'text-blue-400 hover:text-blue-300',
        toggleBtn: 'border-slate-700 text-slate-200 bg-slate-900/70 hover:bg-slate-800',
        oauthBtn: 'border-slate-700 bg-slate-800 hover:bg-slate-700',
        // overlay tối hơn, phủ gần kín ảnh để đồng bộ với bảng điều khiển tối
        overlay: 'from-black/50 via-black/20 to-black/80',
      }
    : {
        panel: 'bg-white',
        title: 'text-slate-900',
        subtitle: 'text-[#004b87]',
        label: 'text-slate-600',
        input: 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-[#004b87]',
        divider: 'border-slate-200',
        dividerText: 'text-slate-400',
        footerText: 'text-slate-500',
        link: 'text-[#004b87] hover:underline',
        toggleBtn: 'border-slate-300 text-slate-600 bg-white/80 hover:bg-white',
        oauthBtn: 'border-slate-300 bg-white hover:bg-slate-50',
        // overlay nhẹ, giữ ảnh sáng rõ để đồng bộ với bảng điều khiển sáng
        overlay: 'from-[#001b33]/25 via-transparent to-[#001b33]/60',
      };

  return (
    <div className="min-h-screen flex">
      {/* ================= Panel trái: ảnh toà nhà KTX ================= */}
      <div
        className="hidden lg:block lg:w-2/3 relative bg-cover bg-center"
        style={{ backgroundImage: `url(${ktxBuilding})` }}
      >
        <div className={`absolute inset-0 bg-gradient-to-b transition-colors duration-500 ${theme.overlay}`} />
      </div>

      {/* ================= Panel phải: form ================= */}
      <div className={`relative w-full lg:w-1/3 flex flex-col ${theme.panel} transition-colors duration-500`}>
        <button
          onClick={() => setIsDark(!isDark)}
          aria-label="Chuyển chế độ sáng/tối"
          className={`absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-500 z-10 ${theme.toggleBtn}`}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
          {isDark ? 'Chế độ sáng' : 'Chế độ tối'}
        </button>

        <div className="w-full max-w-md mx-auto px-8 pt-16 pb-6">
          {/* Logo + tên trường, căn trái theo hàng ngang */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-16 h-16 rounded-full bg-white ring-2 ring-[#004b87]/20 flex items-center justify-center shadow-md overflow-hidden shrink-0">
              <img src={logoIctu} alt="Logo ICTU" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className={`text-sm font-semibold leading-snug whitespace-nowrap transition-colors duration-500 ${theme.title}`}>ICTU Dormitory Management System</p>
              <p className={`text-sm font-bold tracking-wide leading-snug transition-colors duration-500 ${theme.subtitle}`}>
                HỆ THỐNG QUẢN LÝ KÝ TÚC XÁ
              </p>
            </div>
          </div>

          <h2 style={{ fontFamily: 'var(--font-display), sans-serif' }} className={`font-extrabold tracking-tight text-2xl mb-5 transition-colors duration-500 ${theme.title}`}>
            {mode === 'login' && 'Đăng Nhập'}
            {mode === 'register' && 'Đăng Ký'}
            {mode === 'forgot' && 'Quên Mật Khẩu'}
          </h2>

          {/* ================= FORM ================= */}
          {mode === 'register' && (
            <form onSubmit={handleEmailRegister} className="space-y-4">
              <Field theme={theme} label="Họ tên" value={fullName} onChange={setFullName} placeholder="Nguyễn Văn A" required />
              <Field theme={theme} label="Email" type="email" value={email} onChange={setEmail} placeholder="ban@example.com" required />
              <PasswordField theme={theme} value={password} onChange={setPassword} show={showPassword} setShow={setShowPassword} />
              <PasswordRequirements value={password} theme={theme} />

              <p className={`text-xs transition-colors duration-500 ${theme.subtitle}`}>
                Bằng việc đăng ký, bạn đồng ý với{' '}
                <a href="#" className={`transition-colors duration-500 ${theme.link}`}>Điều khoản sử dụng</a> và{' '}
                <a href="#" className={`transition-colors duration-500 ${theme.link}`}>Chính sách bảo mật</a> của KTX Manager.
                Tài khoản mới sẽ được tạo với vai trò <b>Sinh viên</b>.
              </p>

              <SubmitButton submitting={submitting} label="Đăng ký" />
            </form>
          )}

          {mode === 'login' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <Field theme={theme} label="Email" type="email" value={email} onChange={setEmail} placeholder="ban@example.com" required />
              <PasswordField theme={theme} value={password} onChange={setPassword} show={showPassword} setShow={setShowPassword} />

              <div className="text-right -mt-2">
                <button type="button" onClick={() => switchMode('forgot')} className={`text-xs font-medium transition-colors duration-500 ${theme.link}`}>Quên mật khẩu?</button>
              </div>

              <SubmitButton submitting={submitting} label="Đăng nhập" />
            </form>
          )}

          {mode === 'forgot' && forgotStep === 'request' && (
            <form onSubmit={handleForgotRequest} className="space-y-4">
              <Field theme={theme} label="Email" type="email" value={email} onChange={setEmail} placeholder="ban@example.com" required />
              <SubmitButton submitting={submitting} label="Gửi mã 6 chữ số" />
              <p className={`text-sm transition-colors duration-500 ${theme.footerText}`}>
                <button type="button" onClick={() => switchMode('login')} className={`font-semibold transition-colors duration-500 ${theme.link}`}>← Quay lại đăng nhập</button>
              </p>
            </form>
          )}

          {mode === 'forgot' && forgotStep === 'verify' && (
            <form onSubmit={handleForgotVerify} className="space-y-4">
              <p className={`text-xs -mt-1 transition-colors duration-500 ${theme.footerText}`}>
                Đã gửi mã tới <span className="font-medium">{normalizeEmail(email)}</span>.{' '}
                <button type="button" onClick={() => setForgotStep('request')} className={`font-semibold transition-colors duration-500 ${theme.link}`}>Gửi lại</button>
              </p>
              <Field
                theme={theme}
                label="Mã xác nhận (6 chữ số)"
                value={otpCode}
                onChange={(v) => setOtpCode(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
              />
              <PasswordField theme={theme} label="Mật khẩu mới" value={newPassword} onChange={setNewPassword} show={showNewPassword} setShow={setShowNewPassword} />
              <PasswordRequirements value={newPassword} theme={theme} />
              <SubmitButton submitting={submitting} label="Đặt lại mật khẩu" />
              <p className={`text-sm transition-colors duration-500 ${theme.footerText}`}>
                <button type="button" onClick={() => switchMode('login')} className={`font-semibold transition-colors duration-500 ${theme.link}`}>← Quay lại đăng nhập</button>
              </p>
            </form>
          )}

          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
          {notice && <p className="mt-4 text-sm text-emerald-500">{notice}</p>}

          {/* ================= OAuth (chỉ hiện ở Login/Register, không hiện ở Forgot) ================= */}
          {mode !== 'forgot' && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className={`flex-1 border-t transition-colors duration-500 ${theme.divider}`} />
                <span className={`text-xs transition-colors duration-500 ${theme.dividerText}`}>Hoặc</span>
                <div className={`flex-1 border-t transition-colors duration-500 ${theme.divider}`} />
              </div>

              <button
                onClick={() => handleOAuthLogin('google')}
                disabled={loadingProvider !== null || submitting}
                aria-label="Đăng nhập bằng Google"
                className={`w-full flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors duration-500 disabled:opacity-60 ${theme.oauthBtn} ${theme.label}`}
              >
                {loadingProvider === 'google' ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
                Google
              </button>
            </>
          )}

          {/* ================= Link chuyển đổi login/register — luôn nằm dưới cùng ================= */}
          {mode === 'login' && (
            <p className={`text-sm text-center mt-6 transition-colors duration-500 ${theme.footerText}`}>
              Bạn chưa có tài khoản?{' '}
              <button type="button" onClick={() => switchMode('register')} className={`font-semibold transition-colors duration-500 ${theme.link}`}>Tạo một tài khoản mới</button>
            </p>
          )}
          {mode === 'register' && (
            <p className={`text-sm text-center mt-6 transition-colors duration-500 ${theme.footerText}`}>
              Bạn đã có tài khoản?{' '}
              <button type="button" onClick={() => switchMode('login')} className={`font-semibold transition-colors duration-500 ${theme.link}`}>Đăng nhập</button>
            </p>
          )}
        </div>

        {/* ================= Footer ================= */}
        <p className={`shrink-0 py-3 text-center text-[11px] transition-colors duration-500 ${theme.dividerText}`}>
          Copyright © 2026 ICTU. All rights reserved.
        </p>
      </div>
    </div>
  );
}

// Dịch một số lỗi Supabase phổ biến sang tiếng Việt dễ hiểu
function dichLoiSupabase(msg) {
  const map = {
    'Invalid login credentials': 'Email hoặc mật khẩu không đúng.',
    'User already registered': 'Email này đã được đăng ký, vui lòng chọn email khác.',
    'Email not confirmed': 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.',
    'Token has expired or is invalid': 'Mã xác nhận không đúng hoặc đã hết hạn. Vui lòng gửi lại mã.',
    'Email rate limit exceeded': 'Bạn vừa yêu cầu gửi mã quá nhiều lần. Vui lòng thử lại sau ít phút.',
  };
  return map[msg] || msg;
}

function Field({ theme, label, value, onChange, type = 'text', placeholder, required, autoComplete, inputMode, maxLength }) {
  return (
    <div>
      <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${theme.label}`}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors duration-500 ${theme.input}`}
      />
    </div>
  );
}

function PasswordField({ theme, label = 'Mật khẩu', value, onChange, show, setShow }) {
  return (
    <div>
      <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${theme.label}`}>{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          required
          minLength={6}
          className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-sm outline-none transition-colors duration-500 ${theme.input}`}
        />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-500">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function SubmitButton({ submitting, label }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="w-full flex items-center justify-center gap-2 bg-[#004b87] rounded-lg py-2.5 text-sm font-semibold text-white hover:bg-[#003a68] transition-colors disabled:opacity-60"
    >
      {submitting && <Loader2 size={16} className="animate-spin" />}
      {label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.8-.4-4.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 16.3 3 9.7 7.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 45c5.4 0 10.3-1.8 14-5.4l-6.5-5.3C29.4 36.1 26.8 37 24 37c-5.3 0-9.7-3.4-11.3-8l-6.6 5.1C9.6 40.6 16.2 45 24 45z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.3C41.6 35.5 45 30.2 45 24c0-1.4-.1-2.8-.4-4.5z"/>
    </svg>
  );
}
