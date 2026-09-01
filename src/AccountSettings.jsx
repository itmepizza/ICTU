import React, { useState, useRef } from 'react';
import { User, Lock, Camera, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from './supabaseClient';
import ImageCropper from './ImageCropper.jsx';

export default function AccountSettings({ profile, session, isDarkMode, onProfileUpdate }) {
  const [tab, setTab] = useState('general'); // 'general' | 'password'

  const t = isDarkMode
    ? {
        page: 'text-slate-100',
        sidebarItem: 'text-slate-300 hover:bg-slate-800',
        sidebarActive: 'bg-blue-900/40 text-white',
        card: 'bg-slate-800 border-slate-700',
        label: 'text-slate-300',
        input: 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500 focus:border-blue-400',
        sub: 'text-slate-400',
      }
    : {
        page: 'text-slate-800',
        sidebarItem: 'text-slate-600 hover:bg-slate-100',
        sidebarActive: 'bg-blue-50 text-[#004b87] font-medium',
        card: 'bg-white border-slate-200',
        label: 'text-slate-600',
        input: 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-[#004b87]',
        sub: 'text-slate-500',
      };

  return (
    <div className={`max-w-4xl mx-auto animate-in fade-in duration-300 ${t.page}`}>
      <h1 className="text-2xl font-bold mb-6">Cài đặt tài khoản</h1>
      <div className="flex gap-8">
        <div className="w-52 shrink-0 space-y-1">
          <SidebarBtn active={tab === 'general'} onClick={() => setTab('general')} icon={<User size={16} />} label="Chung" theme={t} />
          <SidebarBtn active={tab === 'password'} onClick={() => setTab('password')} icon={<Lock size={16} />} label="Đổi mật khẩu" theme={t} />
        </div>

        <div className={`flex-1 rounded-xl border p-6 ${t.card}`}>
          {tab === 'general' && (
            <GeneralTab profile={profile} session={session} isDarkMode={isDarkMode} theme={t} onProfileUpdate={onProfileUpdate} />
          )}
          {tab === 'password' && <PasswordTab isDarkMode={isDarkMode} theme={t} />}
        </div>
      </div>
    </div>
  );
}

function SidebarBtn({ active, onClick, icon, label, theme }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${active ? theme.sidebarActive : theme.sidebarItem}`}
    >
      {icon} {label}
    </button>
  );
}

function GeneralTab({ profile, session, isDarkMode, theme, onProfileUpdate }) {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [gender, setGender] = useState(profile?.gender || 'male');
  const [studentCode, setStudentCode] = useState(profile?.student_code || '');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const [pendingFile, setPendingFile] = useState(null); // file chờ cắt ảnh
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const avatarUrl = profile?.avatar_url;
  const initial = (fullName || session.user.email).trim().charAt(0).toUpperCase();

  const handleSave = async () => {
    setSaving(true);
    setNotice('');
    setError('');
    const { data: updatedRows, error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, gender, student_code: studentCode })
      .eq('id', session.user.id)
      .select();
    setSaving(false);
    if (error) {
      setError('Cập nhật thất bại: ' + error.message);
      return;
    }
    if (!updatedRows || updatedRows.length === 0) {
      setError('Cập nhật thất bại: không có dòng nào được ghi (rất có thể do quyền RLS chặn). Hãy kiểm tra policy "Users can update own profile" trên bảng profiles.');
      return;
    }
    setNotice('Đã cập nhật thông tin tài khoản.');
    onProfileUpdate?.({ full_name: fullName, phone, gender, student_code: studentCode });
  };

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = ''; // cho phép chọn lại cùng 1 file lần sau
  };

  const handleCropConfirm = async (blob) => {
    setUploadingAvatar(true);
    setError('');
    const path = `${session.user.id}/avatar.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });

    if (uploadError) {
      setUploadingAvatar(false);
      setError('Tải ảnh thất bại: ' + uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
    // Thêm timestamp để phá cache trình duyệt, đảm bảo ảnh mới hiện ngay
    const freshUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { data: updatedRows, error: dbError } = await supabase
      .from('profiles')
      .update({ avatar_url: freshUrl })
      .eq('id', session.user.id)
      .select();

    setUploadingAvatar(false);
    setPendingFile(null);

    if (dbError) {
      setError('Lưu ảnh đại diện thất bại: ' + dbError.message);
      return;
    }
    if (!updatedRows || updatedRows.length === 0) {
      setError('Lưu ảnh đại diện thất bại: không có dòng nào được ghi (rất có thể do quyền RLS chặn). Hãy kiểm tra policy "Users can update own profile" trên bảng profiles.');
      return;
    }
    setNotice('Đã cập nhật ảnh đại diện.');
    onProfileUpdate?.({ avatar_url: freshUrl });
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <div className="relative">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-[#004b87] flex items-center justify-center text-white text-2xl font-bold ring-2 ring-offset-2 ring-[#004b87]/30" style={{ '--tw-ring-offset-color': isDarkMode ? '#1e293b' : '#fff' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Ảnh đại diện" className="w-full h-full object-cover" />
            ) : initial}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#004b87] text-white flex items-center justify-center border-2 border-white hover:bg-[#003a68]"
            title="Tải lên ảnh đại diện mới"
          >
            <Camera size={14} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
        </div>
        <div>
          <button onClick={() => fileInputRef.current?.click()} className={`text-sm font-medium border rounded-lg px-3 py-1.5 ${isDarkMode ? 'border-slate-600 text-slate-200 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
            Tải lên
          </button>
          <p className={`text-xs mt-1 ${theme.sub}`}>Ảnh sẽ được cắt vuông 1:1. Tối đa 5MB.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field theme={theme} label="Họ và tên" value={fullName} onChange={setFullName} placeholder="Nguyễn Văn A" />
        <Field theme={theme} label="Số điện thoại" value={phone} onChange={setPhone} placeholder="09xxxxxxxx" />
        <Field theme={theme} label="Mã số thẻ sinh viên" value={studentCode} onChange={setStudentCode} placeholder="DTCXXXXXX" />
        <div>
          <label className={`block text-xs font-medium mb-1 ${theme.label}`}>Giới tính</label>
          <div className="flex gap-4 mt-2.5">
            <label className={`flex items-center gap-2 text-sm cursor-pointer ${theme.label}`}>
              <input type="radio" checked={gender === 'male'} onChange={() => setGender('male')} className="accent-[#004b87]" /> Nam
            </label>
            <label className={`flex items-center gap-2 text-sm cursor-pointer ${theme.label}`}>
              <input type="radio" checked={gender === 'female'} onChange={() => setGender('female')} className="accent-[#004b87]" /> Nữ
            </label>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
      {notice && <p className="text-sm text-emerald-500 mt-4">{notice}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-6 bg-[#004b87] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#003a68] transition disabled:opacity-60 flex items-center gap-2"
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        Cập nhật
      </button>

      {pendingFile && (
        <ImageCropper
          file={pendingFile}
          isDark={isDarkMode}
          submitting={uploadingAvatar}
          onCancel={() => setPendingFile(null)}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}

function Field({ theme, label, value, onChange, placeholder }) {
  return (
    <div>
      <label className={`block text-xs font-medium mb-1 ${theme.label}`}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${theme.input}`}
      />
    </div>
  );
}

function PasswordTab({ isDarkMode, theme }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const handleUpdate = async () => {
    setError('');
    setNotice('');
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    setSaving(true);
    // Supabase không có API kiểm tra mật khẩu hiện tại riêng — updateUser sẽ áp dụng
    // trực tiếp cho phiên đang đăng nhập (đã được xác thực).
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      setError('Đổi mật khẩu thất bại: ' + error.message);
      return;
    }
    setNotice('Đổi mật khẩu thành công.');
    setCurrentPassword('');
    setNewPassword('');
  };

  return (
    <div className="grid grid-cols-2 gap-4 max-w-lg">
      <PasswordField theme={theme} label="Mật khẩu hiện tại" value={currentPassword} onChange={setCurrentPassword} show={showCurrent} setShow={setShowCurrent} />
      <PasswordField theme={theme} label="Mật khẩu mới" value={newPassword} onChange={setNewPassword} show={showNew} setShow={setShowNew} />

      <p className={`col-span-2 text-xs ${theme.sub}`}>
        Lưu ý: nếu tài khoản của bạn đăng nhập qua Google/Facebook (chưa từng đặt mật khẩu), hãy dùng "Quên mật khẩu?" ở màn đăng nhập để thiết lập mật khẩu lần đầu.
      </p>

      {error && <p className="col-span-2 text-sm text-red-500">{error}</p>}
      {notice && <p className="col-span-2 text-sm text-emerald-500">{notice}</p>}

      <button
        onClick={handleUpdate}
        disabled={saving || !newPassword}
        className="col-span-2 w-fit bg-[#004b87] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#003a68] transition disabled:opacity-60 flex items-center gap-2"
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        Cập nhật
      </button>
    </div>
  );
}

function PasswordField({ theme, label, value, onChange, show, setShow }) {
  return (
    <div>
      <label className={`block text-xs font-medium mb-1 ${theme.label}`}>{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nhập mật khẩu..."
          className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-sm outline-none transition-colors ${theme.input}`}
        />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-500">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
