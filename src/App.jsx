import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Users, Building, MessageSquareWarning, 
  Bot, Search, Bell, X, Plus, LogOut, CheckCircle2, 
  AlertCircle, Info, Send, Loader2, Sparkles, Building2,
  UserCircle2, Moon, Sun, RefreshCw, Phone, Mail, Shield, HeartPulse,
  PanelLeft, Calculator, Wallet, Menu
} from 'lucide-react';
import { supabase } from './supabaseClient';
import Login from './Login.jsx';
import ICTULandingPage from './ICTULandingPage.jsx';
import AccountSettings from './AccountSettings.jsx';
import SetPasswordModal from './SetPasswordModal.jsx';
import logoIctu from './assets/logo-ictu.png';

/* Hallmark · genre: modern-minimal · macrostructure: Workbench — Responsive Rail
 * design-system: design.md · designed-as-app
 * scope này: shell (header/sidebar/drawer) + NavItem + ExpandableStatCard/ProgressBar + DashboardView + ChatbotView.
 * RoomsView/IssuesView/StudentsView/FeesView kế thừa token màu qua design.md nhưng cấu trúc
 * nội dung bên trong CHƯA được redesign ở lượt này.
 */

// --- CROSSFADE GIỮA CÁC "PHA" CỦA APP (checking session -> landing -> login -> app) ---
// App() có nhiều early-return (màn chờ kiểm tra session, IntroFlow/landing, Login, app chính).
// Mỗi early-return được bọc bởi CrossfadeSwitch với activeKey riêng; vì cả 4 nhánh đều trả về
// CrossfadeSwitch ở vị trí gốc của cây, React coi đó là CÙNG 1 instance qua các lần re-render
// (chỉ đổi prop activeKey) thay vì unmount/mount lại — nhờ vậy state fade bên trong không bị mất,
// cho phép crossfade mượt giữa ICTULandingPage -> Login và Login -> App sau khi đăng nhập.
//
// QUAN TRỌNG: khi KHÔNG đang chuyển pha (activeKey === displayKey), render thẳng `children`
// (không lưu qua state) để nội dung luôn "sống" — mọi click/đổi state bên trong (VD: chuyển tab,
// mở modal trong App chính) vẫn re-render bình thường. Chỉ đóng băng (dùng bản children cũ,
// lưu ở ref) đúng trong khoảng thời gian đang fade sang pha khác, để không bị giật hình lúc chuyển cảnh.
function CrossfadeSwitch({ activeKey, duration = 500, children }) {
  const [displayKey, setDisplayKey] = useState(activeKey);
  const [fading, setFading] = useState(false);
  const prevChildrenRef = useRef(children);

  useEffect(() => {
    if (activeKey === displayKey) return undefined;
    setFading(true);
    const timer = setTimeout(() => {
      setDisplayKey(activeKey);
      setFading(false);
    }, duration);
    return () => clearTimeout(timer);
  }, [activeKey, displayKey, duration]);

  const isSamePhase = activeKey === displayKey;
  if (isSamePhase) {
    // Luôn cập nhật bản "cuối cùng biết" của pha hiện tại, để nếu pha kế đổi thì có sẵn
    // nội dung đúng để đóng băng lúc fade-out (thay vì hiện nội dung cũ hơn nữa).
    prevChildrenRef.current = children;
  }

  return (
    <div style={{ opacity: fading ? 0 : 1, transition: `opacity ${duration}ms ease-in-out` }}>
      {isSamePhase ? children : prevChildrenRef.current}
    </div>
  );
}

// --- MOCK DATA ---
const MOCK_ROOMS = [
  { id: 'R101', building: 'Tòa A1', capacity: 8, occupied: 8, gender: 'Nam', type: 'Phòng tiêu chuẩn' },
  { id: 'R102', building: 'Tòa A1', capacity: 8, occupied: 5, gender: 'Nam', type: 'Phòng tiêu chuẩn' },
  { id: 'R103', building: 'Tòa A1', capacity: 8, occupied: 6, gender: 'Nam', type: 'Phòng tiêu chuẩn' },
  { id: 'R305', building: 'Tòa A1', capacity: 8, occupied: 0, gender: 'Nam', type: 'Phòng tiêu chuẩn' },
  { id: 'R201', building: 'Tòa A2', capacity: 4, occupied: 4, gender: 'Nữ', type: 'Phòng cao cấp' },
  { id: 'R202', building: 'Tòa A2', capacity: 4, occupied: 1, gender: 'Nữ', type: 'Phòng cao cấp' },
  { id: 'R203', building: 'Tòa A2', capacity: 4, occupied: 3, gender: 'Nữ', type: 'Phòng cao cấp' },
  { id: 'R301', building: 'Tòa A3', capacity: 2, occupied: 2, gender: 'Nam', type: 'Phòng cao cấp' },
  { id: 'R302', building: 'Tòa A3', capacity: 2, occupied: 0, gender: 'Nữ', type: 'Phòng cao cấp' },
  { id: 'R303', building: 'Tòa A3', capacity: 4, occupied: 1, gender: 'Nam', type: 'Phòng tiêu chuẩn' },
];

const MOCK_ISSUES = [
  { id: 'IS001', room: 'R101', student: 'Nguyễn Văn A', title: 'Hỏng bóng đèn', desc: 'Bóng đèn tuýp giữa phòng bị cháy từ hôm qua.', status: 'Chờ xử lý', date: '2026-08-01' },
  { id: 'IS002', room: 'R202', student: 'Trần Thị B', title: 'Nước yếu', desc: 'Vòi nước nhà tắm chảy rất yếu, không đủ dùng.', status: 'Chờ xử lý', date: '2026-08-02' },
  { id: 'IS003', room: 'R102', student: 'Lê Văn C', title: 'Bạn cùng phòng ồn ào', desc: 'Sinh viên giường số 3 thường xuyên chơi game nới to tiếng sau 23h.', status: 'Đang giải quyết', date: '2026-08-03' },
  { id: 'IS004', room: 'R201', student: 'Phạm Thị D', title: 'Hỏng quạt trần', desc: 'Quạt trần số 1 kêu to và quay chậm.', status: 'Đã xử lý', date: '2026-07-28' },
];

// GHI CHÚ: Chưa có nguồn dữ liệu sinh viên chính thức (bảng `profiles` thật hoặc hệ thống quản lý
// đào tạo của trường) nối vào mục "Sinh viên nội trú", nên tạm dùng danh sách ẢO (mock) dưới đây
// để dựng giao diện Hồ sơ sinh viên nội trú. Khi có nguồn dữ liệu thật, thay MOCK_STUDENTS bằng
// truy vấn Supabase (VD: supabase.from('profiles').select('*').eq('role', 'student')) tương tự
// cách RoomsView / IssuesView đang lấy dữ liệu thật.
const MOCK_STUDENTS = [
  { id: 'DTC2210101', fullName: 'Nguyễn Văn An', dob: '12/02/2007', gender: 'Nam', phone: '0912 345 101' },
  { id: 'DTC2210102', fullName: 'Trần Thị Bích', dob: '25/06/2006', gender: 'Nữ', phone: '0987 654 102' },
  { id: 'DTC2210103', fullName: 'Lê Văn Cường', dob: '03/11/2007', gender: 'Nam', phone: '0905 123 103' },
  { id: 'DTC2210104', fullName: 'Phạm Thị Dung', dob: '19/09/2006', gender: 'Nữ', phone: '0978 234 104' },
  { id: 'DTC2210105', fullName: 'Hoàng Văn Đức', dob: '07/04/2007', gender: 'Nam', phone: '0913 345 105' },
  { id: 'DTC2210106', fullName: 'Vũ Thị Hà', dob: '30/01/2006', gender: 'Nữ', phone: '0966 456 106' },
  { id: 'DTC2210107', fullName: 'Đặng Văn Hiếu', dob: '14/08/2007', gender: 'Nam', phone: '0934 567 107' },
  { id: 'DTC2210108', fullName: 'Ngô Thị Lan', dob: '22/12/2006', gender: 'Nữ', phone: '0945 678 108' },
  { id: 'DTC2210109', fullName: 'Bùi Văn Minh', dob: '05/05/2007', gender: 'Nam', phone: '0921 789 109' },
  { id: 'DTC2210110', fullName: 'Đỗ Thị Ngọc', dob: '17/10/2006', gender: 'Nữ', phone: '0989 890 110' },
];

// GHI CHÚ: MOCK_STUDENTS vẫn dùng tạm cho StudentsView (chưa yêu cầu nối lượt này).
// Bảng phí/công nợ đã nối Supabase thật (bảng `fees`) — xem FeesView bên dưới, không còn
// dùng dữ liệu ảo nữa.

// GHI CHÚ: Trước đây thông báo dùng dữ liệu mẫu tĩnh (INITIAL_NOTIFICATIONS) giống nhau cho mọi người dùng.
// Đã thay bằng dữ liệu thật lấy từ bảng `notifications` trong Supabase (xem hàm loadNotifications trong App()),
// vì thông báo cần gắn với đúng người nhận (sinh viên cụ thể / vai trò quản lý) — dữ liệu tĩnh không đáp ứng được yêu cầu này.

// Định dạng "x phút/giờ/ngày trước" từ cột created_at (timestamptz) của Supabase.
// Format nhẹ nội dung markdown do Gemini trả về (### heading, **bold**, gạch đầu dòng *, ---)
// thành HTML an toàn: escape HTML trước, chỉ áp cú pháp markdown-lite sau — không trộn lẫn
// nội dung gốc với markup được inject.
const escapeHtml = (s) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const formatAiReport = (raw) => {
  const lines = escapeHtml(raw).split('\n');
  const html = [];
  let listBuf = [];
  const flushList = () => {
    if (listBuf.length) { html.push(`<ul class="ai-report-list">${listBuf.join('')}</ul>`); listBuf = []; }
  };
  for (let rawLine of lines) {
    if (/^---+$/.test(rawLine.trim())) { flushList(); html.push('<hr class="ai-report-hr" />'); continue; }
    if (/^#{1,6}\s+/.test(rawLine)) {
      const content = rawLine.replace(/^#{1,6}\s+/, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
      flushList(); html.push(`<h4 class="ai-report-h4">${content}</h4>`); continue;
    }
    if (/^\s*[\*\-]\s+/.test(rawLine)) {
      const content = rawLine.replace(/^\s*[\*\-]\s+/, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
      listBuf.push(`<li>${content}</li>`); continue;
    }
    flushList();
    const line = rawLine.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
    if (line.trim() === '') { html.push('<div class="ai-report-gap"></div>'); } else { html.push(`<p class="ai-report-p">${line}</p>`); }
  }
  flushList();
  return html.join('');
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
};

const DORM_RULES = `
NỘI QUY KÝ TÚC XÁ (Tài liệu cho AI):
1. Giờ giấc: Mở cửa lúc 5h30 sáng, đóng cửa lúc 23h00 đêm. Sau 23h sinh viên không được ra vào trừ trường hợp cấp cứu có báo quản lý.
2. Vệ sinh: Đổ rác đúng giờ (18h-20h), không vứt rác xuống hành lang. Tự dọn vệ sinh phòng ở.
3. An ninh: Không cờ bạc, rượu chè, sử dụng chất cấm. Không đun nấu bằng bếp điện/bếp ga trong phòng.
4. Khách viếng thăm: Phải đăng ký tại phòng bảo vệ, chỉ được tiếp khách tại phòng khách tầng 1, không đưa người lạ vào phòng ở. Giờ tiếp khách từ 8h00 đến 21h00.
5. Phí nội trú: Đóng phí từ ngày 1 đến ngày 10 hàng tháng. Quá hạn 15 ngày sẽ bị cắt điện nước.
`;

// --- GEMINI API HELPER ---
// Key KHÔNG nằm ở client nữa. Gọi qua Supabase Edge Function "chatbot-ai" —
// key thật lưu ở Edge Function secret (GEMINI_API_KEY), chỉ server đọc được.
const callGemini = async (prompt, systemInstruction) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke('chatbot-ai', {
        body: { prompt, systemInstruction: systemInstruction || "Bạn là trợ lý AI hữu ích." }
      });
      if (error) {
        // Lỗi 4xx (key/model sai phía server) -> retry vô ích, dừng ngay
        const status = error.context?.status;
        console.error(`Edge Function chatbot-ai lỗi (status ${status}):`, error.message);
        if (status >= 400 && status < 500) {
          throw new Error(`Chatbot AI lỗi ${status}: ${error.message}`);
        }
        throw error;
      }
      return data?.text || "Không có phản hồi từ AI.";
    } catch (error) {
      if (error.message?.includes('Chatbot AI lỗi 4') || attempt === 4) throw error;
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
};

// Nhãn hiển thị cho 2 loại quyền có thể xin cấp qua "Yêu cầu quyền truy cập đặc biệt".
// Dùng chung giữa AccessRequestModal (form gửi yêu cầu) và IssuesView (màn xét duyệt)
// để tránh lặp lại chuỗi text ở nhiều nơi.
const ACCESS_ROLE_LABEL = { manager: 'Ban quản lý KTX', accountant: 'Kế toán' };
// Tiêu đề thông báo dùng chung khi sinh viên gửi "Yêu cầu quyền truy cập đặc biệt" (xem
// AccessRequestModal). Trích ra hằng số để lọc thông báo này ở nơi khác (loadNotifications) mà
// không phải gõ lại chuỗi text — thông báo loại này CHỈ dành cho Ban quản lý KTX, kế toán không
// được xem/duyệt (chỉ Ban quản lý KTX mới có quyền Xác nhận/Từ chối, xem handleAccessDecision).
const ACCESS_REQUEST_NOTIF_TITLE = 'Yêu cầu quyền truy cập đặc biệt';

// --- SIDEBAR CONTROL OPTIONS ---
const SIDEBAR_MODE_OPTIONS = [
  { value: 'expanded', label: 'Mở rộng' },
  { value: 'collapsed', label: 'Thu gọn' },
  { value: 'hover', label: 'Mở rộng khi di chuột' },
];

// --- MAIN APP COMPONENT ---
export default function App() {
  // true = đang hiện trang giới thiệu (ICTULandingPage); bấm "Vào hệ thống" mới chuyển sang Login/Dashboard.
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Rời trang giới thiệu -> đẩy 1 mục lịch sử "login" để nút Back của TRÌNH DUYỆT (không phải
  // nút trong app) quay lại được ICTULandingPage, thay vì thoát hẳn ứng dụng/tab.
  const enterSystem = () => {
    window.history.pushState({ ictuView: 'login' }, '');
    setShowLanding(false);
  };

  useEffect(() => {
    const handlePopState = () => {
      // Bấm Back trên trình duyệt trong khi đang ở Login -> quay về landing.
      // (Nếu đã đăng nhập/vào dashboard thì không can thiệp, để hành vi Back mặc định của trình duyệt xử lý.)
      if (!showLanding) setShowLanding(true);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showLanding]);

  // Chế độ hiển thị thanh bên: 'expanded' (luôn mở), 'collapsed' (luôn thu gọn),
  // 'hover' (thu gọn, mở rộng tạm thời khi rê chuột vào). Mặc định: hover.
  const [sidebarMode, setSidebarModeRaw] = useState(() => {
    if (typeof window === 'undefined') return 'hover';
    return localStorage.getItem('ktx-sidebar-mode') || 'hover';
  });
  const setSidebarMode = (mode) => {
    setSidebarModeRaw(mode);
    localStorage.setItem('ktx-sidebar-mode', mode);
  };
  const [isSidebarHovering, setIsSidebarHovering] = useState(false);
  const [isSidebarControlOpen, setIsSidebarControlOpen] = useState(false);
  const sidebarControlRef = useRef(null);
  // Drawer sidebar cho màn hình < lg (dưới ngưỡng này sidebar cố định không còn phù hợp,
  // xem design.md § Macrostructure family — "Workbench Responsive Rail").
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Trạng thái "đang mở rộng" thực tế trên giao diện, suy ra từ chế độ đã chọn
  const isSidebarOpen = sidebarMode === 'expanded' || (sidebarMode === 'hover' && isSidebarHovering);
  // Chiều rộng dành cho nội dung chính (và cho ô logo) chỉ theo chế độ đã chọn (không theo hover tạm thời),
  // để khi ở chế độ "hover" thanh bên sẽ NỔI ĐÈ lên nội dung thay vì đẩy layout giật cục.
  const isMainShiftedOpen = sidebarMode === 'expanded';
  const [isDarkMode, setIsDarkModeRaw] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('ktx-dark-mode') === 'true'; // mặc định false (light mode)
  });

  // Đổi dark mode ở bất kỳ đâu (Login hoặc App) đều lưu chung 1 chỗ,
  // để 2 màn luôn đồng bộ và giữ nguyên cho các lần đăng nhập sau.
  const setIsDarkMode = (value) => {
    setIsDarkModeRaw(value);
    localStorage.setItem('ktx-dark-mode', value ? 'true' : 'false');
  };
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  // Hội thoại chatbot sống ở App (không phải trong ChatbotView) để không bị xóa mỗi lần đóng/mở
  // khung chat nổi — chỉ mất khi tải lại trang (state React reset tự nhiên khi reload).
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', content: 'Xin chào! Tôi là AI Trợ lý của KTX ICTU. Ban quản lý hoặc sinh viên có thể hỏi tôi bất kỳ thông tin nào liên quan đến Nội quy KTX.' }
  ]);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isAccessRequestOpen, setIsAccessRequestOpen] = useState(false);
  // Tab con của màn "Quản lý Phản ánh & Vi phạm nội quy" ('issues' = Phản ánh & Sự cố | 'violations'
  // = Vi phạm nội quy). Đặt ở đây (không phải bên trong IssuesView) để khi người dùng click vào 1
  // thông báo, ta vừa setActiveTab('issues') vừa chọn đúng tab con tương ứng trước khi màn hình mở ra.
  const [issuesSubTab, setIssuesSubTab] = useState('issues');
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Đóng dropdown profile / thông báo khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
      if (sidebarControlRef.current && !sidebarControlRef.current.contains(e.target)) {
        setIsSidebarControlOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Đóng mọi dropdown/drawer bằng phím Escape — trước đây chỉ đóng được bằng click
  // ra ngoài, người dùng chỉ thao tác bàn phím không có cách thoát (xem design.md
  // § Microinteractions, mục bắt buộc accessibility).
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key !== 'Escape') return;
      setIsProfileOpen(false);
      setIsNotifOpen(false);
      setIsSidebarControlOpen(false);
      setIsMobileNavOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Đóng drawer mobile mỗi khi chuyển tab, để không phải tự tay đóng sau khi điều hướng.
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [activeTab]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Cập nhật UI ngay (optimistic) rồi mới ghi xuống Supabase, để cảm giác bấm mượt.
  // LƯU Ý GIỚI HẠN: thông báo "phản ánh mới" gửi theo recipient_role='manager' là 1 dòng dữ liệu
  // dùng chung cho mọi quản lý — nên khi 1 quản lý đánh dấu đã đọc, dòng đó sẽ thành "đã đọc" chung
  // cho tất cả quản lý khác (do chỉ có 1 cột `read` dùng chung). Nếu cần trạng thái đã đọc RIÊNG cho
  // từng quản lý, cần bảng phụ notification_reads(notification_id, user_id) — ngoài phạm vi yêu cầu hiện tại.
  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (unreadIds.length > 0) {
      const { error } = await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
      if (error) console.error('Lỗi đánh dấu đã đọc tất cả:', error.message);
    }
  };

  const markOneRead = async (id) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) console.error('Lỗi đánh dấu đã đọc:', error.message);
  };

  // Click vào 1 thông báo: đánh dấu đã đọc NHƯ CŨ, đồng thời điều hướng tới đúng nơi để xử lý.
  // - type 'issue'     -> màn "Quản lý Phản ánh & Vi phạm nội quy" (bên sinh viên là "Báo cáo sự cố"),
  //                        tab con "Phản ánh & Sự cố" — bao gồm cả báo sự cố, yêu cầu chuyển/trả phòng,
  //                        yêu cầu quyền truy cập đặc biệt (tất cả đang dùng chung type 'issue').
  // - type 'violation' -> cùng màn đó nhưng tab con "Vi phạm nội quy".
  // Các loại thông báo khác ('ai', 'room', ...) chỉ đánh dấu đã đọc, không điều hướng — không nằm
  // trong phạm vi yêu cầu hiện tại.
  const handleNotificationClick = (n) => {
    markOneRead(n.id);
    setIsNotifOpen(false);
    if (n.type === 'issue') {
      setIssuesSubTab('issues');
      setActiveTab('issues');
    } else if (n.type === 'violation') {
      setIssuesSubTab('violations');
      setActiveTab('issues');
    }
  };

  const [session, setSession] = useState(undefined); // undefined = đang kiểm tra, null = chưa đăng nhập
  const [profile, setProfile] = useState(null);
  const [authError, setAuthError] = useState(null);
  // Tài khoản đăng nhập bằng Google chưa từng đặt mật khẩu app (profile.has_password === false)
  // sẽ được nhắc đặt mật khẩu 1 lần mỗi phiên; bấm "Để sau" chỉ ẩn tạm cho phiên này.
  const [skipPasswordPrompt, setSkipPasswordPrompt] = useState(false);

  // Bắt lỗi OAuth trả về qua query string (?error=...), dọn URL sạch sẽ
  // để không bị lặp lại lỗi khi reload, đồng thời hiện thông báo dễ hiểu.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get('error_code');
    if (errorCode) {
      const messages = {
        bad_oauth_state: 'Phiên đăng nhập đã hết hạn hoặc bị trùng lặp (thường do mở nhiều tab / bấm nút đăng nhập nhiều lần). Vui lòng thử lại ở một tab duy nhất.',
      };
      setAuthError(messages[errorCode] || params.get('error_description') || 'Đăng nhập thất bại, vui lòng thử lại.');
      // Xóa query string khỏi URL để không hiện lại lỗi cũ khi F5
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Kiểm tra session hiện tại + lắng nghe thay đổi đăng nhập/đăng xuất
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setAuthError(null); // đăng nhập thành công -> xóa lỗi cũ nếu có
    });

    return () => subscription.unsubscribe();
  }, []);

  // Khi có session, lấy thông tin profile (bao gồm role) từ bảng profiles
  const fetchProfile = () => {
    if (!session?.user) {
      setProfile(null);
      return;
    }
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error) console.error('Lỗi tải profile:', error.message);
        setProfile(data);
      });
  };

  useEffect(fetchProfile, [session]);

  // Vai trò hiện tại — đặt sớm (trước các early-return bên dưới) vì effect tải thông báo cần dùng đến.
  const role = profile?.role || 'student';

  // Sinh viên không có mục Tổng quan -> tự chuyển sang Quản lý Phòng khi vào app
  useEffect(() => {
    if (profile?.role === 'student' && activeTab === 'dashboard') {
      setActiveTab('rooms');
    }
  }, [profile]);

  // --- THÔNG BÁO: tải danh sách + lắng nghe thời gian thực từ bảng `notifications` ---
  // Sinh viên: chỉ nhận thông báo có recipient_id = chính mình (VD: cập nhật trạng thái phản ánh).
  // Ban quản lý (manager): nhận cả thông báo riêng (recipient_id = mình) LẪN thông báo dùng chung
  // cho toàn bộ quản lý (recipient_role = 'manager', VD: có phản ánh mới từ sinh viên).
  const loadNotifications = async () => {
    if (!session?.user) { setNotifications([]); return; }
    let query = supabase.from('notifications').select('*');
    query = (role === 'manager' || role === 'accountant')
      ? query.or(`recipient_id.eq.${session.user.id},recipient_role.eq.manager`)
      : query.eq('recipient_id', session.user.id);
    query = query.order('created_at', { ascending: false }).limit(50);
    const { data, error } = await query;
    if (error) {
      console.error('Lỗi tải thông báo:', error.message);
      return;
    }
    setNotifications(
      role === 'accountant'
        ? (data || []).filter(n => !(n.recipient_role === 'manager' && n.title === ACCESS_REQUEST_NOTIF_TITLE))
        : (data || [])
    );
  };

  useEffect(() => {
    loadNotifications();
    if (!session?.user) return;

    // Supabase Realtime chỉ lọc được theo 1 điều kiện đơn giản trên kênh, nên đăng ký nhận
    // TẤT CẢ bản ghi INSERT mới của bảng notifications rồi tự lọc lại ở client theo đúng người nhận.
    const channel = supabase
      .channel(`notifications-${session.user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const n = payload.new;
        const isAccessRequestBroadcast = n.recipient_role === 'manager' && n.title === ACCESS_REQUEST_NOTIF_TITLE;
        const canSeeSharedBroadcast = role === 'manager' || (role === 'accountant' && !isAccessRequestBroadcast);
        const isForMe = n.recipient_id === session.user.id || (canSeeSharedBroadcast && n.recipient_role === 'manager');
        if (isForMe) setNotifications((prev) => [n, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, role]);

  // Cập nhật ngay vào state hiện tại (không cần chờ SELECT lại) — dùng khi
  // AccountSettings vừa ghi thành công vào DB, để avatar/tên hiện lên tức thì.
  const updateProfileLocally = (patch) => {
    setProfile((prev) => ({ ...prev, ...patch }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Đảm bảo sau đăng xuất luôn về màn Login, kể cả khi trước đó user đã có
    // sẵn session lúc tải trang (bỏ qua bước "Vào hệ thống" nên showLanding
    // chưa từng bị set false) — nếu không sẽ rơi về lại ICTULandingPage.
    setShowLanding(false);
  };

  // Đang kiểm tra session lần đầu -> hiện màn hình chờ
  if (session === undefined) {
    return (
      <CrossfadeSwitch activeKey="checking">
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-[#004b87]" size={32} />
        </div>
      </CrossfadeSwitch>
    );
  }

  // Chưa đăng nhập + chưa bấm "Vào hệ thống" -> hiện ICTULandingPage thẳng (đã bỏ
  // chuỗi mở màn IntroFlow — Let's Go / % loading — nên vào thẳng trang giới thiệu).
  // Bọc CrossfadeSwitch để khi bấm "Vào hệ thống" (ICTULandingPage -> Login) cũng mượt.
  if (!session && showLanding) {
    return (
      <CrossfadeSwitch activeKey="landing">
        <ICTULandingPage onEnterSystem={enterSystem} isDark={isDarkMode} setIsDark={setIsDarkMode} />
      </CrossfadeSwitch>
    );
  }

  // Chưa đăng nhập -> hiện trang Login (kèm lỗi nếu vừa có OAuth thất bại)
  // Bọc CrossfadeSwitch để lúc đăng nhập thành công (Login -> App chính) cũng mượt.
  if (!session) {
    return (
      <CrossfadeSwitch activeKey="login">
        <Login errorMessage={authError} isDark={isDarkMode} setIsDark={setIsDarkMode} />
      </CrossfadeSwitch>
    );
  }

  const displayName = profile?.full_name || session.user.email;
  const roleLabel = { manager: 'Ban Quản lý KTX', accountant: 'Kế toán', student: 'Sinh viên' }[role];
  const avatarInitial = displayName.trim().charAt(0).toUpperCase();

  // Danh sách mục điều hướng — dùng chung cho sidebar cố định (desktop, từ lg) và
  // drawer trượt ra (mobile, dưới lg), để không lặp lại logic phân quyền 2 nơi.
  const renderNavItems = (isOpenState) => (
    <>
      {role !== 'student' && (
        <NavItem icon={<LayoutDashboard />} label="Tổng quan" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} isOpen={isOpenState} />
      )}
      <NavItem icon={<Building />} label="Quản lý Phòng & Xếp chỗ" isActive={activeTab === 'rooms'} onClick={() => setActiveTab('rooms')} isOpen={isOpenState} />
      {(role === 'manager' || role === 'accountant') && (
        <NavItem icon={<Users />} label="Sinh viên nội trú" isActive={activeTab === 'students'} onClick={() => setActiveTab('students')} isOpen={isOpenState} />
      )}
      {(role === 'manager' || role === 'accountant') && (
        <NavItem icon={<Wallet />} label="Phí & Công nợ" isActive={activeTab === 'fees'} onClick={() => setActiveTab('fees')} isOpen={isOpenState} />
      )}
      <NavItem icon={<MessageSquareWarning />} label={role === 'student' ? 'Báo cáo sự cố' : 'Quản lý Phản ánh'} isActive={activeTab === 'issues'} onClick={() => setActiveTab('issues')} isOpen={isOpenState} />
    </>
  );

  // Layout Container
  // Bọc CrossfadeSwitch (activeKey="app") để chuyển cảnh Login -> App chính cũng crossfade,
  // đồng bộ với 3 nhánh early-return phía trên (xem ghi chú tại định nghĩa CrossfadeSwitch).
  return (
    <CrossfadeSwitch activeKey="app">
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-500 ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      {/* Nhắc đặt mật khẩu app cho tài khoản Google chưa từng đặt (profiles.has_password === false).
          Không phải màn chặn cứng: người dùng có thể "Để sau" và tiếp tục dùng app bình thường. */}
      {profile && profile.has_password === false && !skipPasswordPrompt && (
        <SetPasswordModal
          session={session}
          isDarkMode={isDarkMode}
          onDone={() => updateProfileLocally({ has_password: true })}
          onSkip={() => setSkipPasswordPrompt(true)}
        />
      )}

      {/* Thanh trên cùng — trải dài toàn bộ chiều ngang trang, logo nằm gọn bên trong thanh này */}
      <header className={`fixed top-0 left-0 right-0 h-16 z-30 flex items-stretch border-b shadow-sm transition-colors duration-500 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="w-14 sm:w-20 shrink-0 flex items-center justify-center gap-1">
          {/* Nút mở drawer điều hướng — chỉ hiện dưới lg, thay thế cho sidebar cố định
              không còn khớp trên màn hình nhỏ (xem design.md § Macrostructure family). */}
          <button
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Mở menu điều hướng"
            aria-expanded={isMobileNavOpen}
            className={`lg:hidden p-2 -ml-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <Menu size={20} />
          </button>
          <img src={logoIctu} alt="Logo ICTU" className="hidden sm:block w-9 h-9 rounded-full object-cover shrink-0" />
        </div>
        <div className="flex-1 flex items-center justify-between gap-2 sm:gap-4 pr-3 sm:pr-6 min-w-0">
          {/* Ô tìm kiếm co giãn theo không gian còn lại thay vì độ rộng cố định w-96 — trước đây
              tràn khung trên màn hình < 700px (xem audit). Ẩn hẳn dưới sm, nhường chỗ cho icon riêng. */}
          <div className={`hidden sm:flex items-center rounded-full px-4 py-2 w-full max-w-[260px] md:max-w-xs lg:max-w-sm border transition-colors duration-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 focus-within:border-blue-400' : 'bg-slate-100 border-slate-200 focus-within:border-blue-400 focus-within:bg-white'}`}>
            <Search size={18} className={isDarkMode ? 'text-slate-400' : 'text-slate-400'} />
            <input type="text" placeholder="Tìm kiếm sinh viên, phòng, sự cố..." className={`bg-transparent border-none outline-none ml-2 w-full text-sm transition-colors duration-500 ${isDarkMode ? 'placeholder-slate-400 text-slate-100' : 'placeholder-slate-400'}`} />
          </div>
          <button
            aria-label="Tìm kiếm"
            className={`sm:hidden p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <Search size={18} />
          </button>
          <div className="flex items-center gap-2 sm:gap-4 ml-auto sm:ml-0">
            {/* Thông báo */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ''}`}
                aria-expanded={isNotifOpen}
                aria-haspopup="true"
                className={`relative p-2 rounded-lg transition-colors duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-500 hover:text-[#004b87]'}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                )}
              </button>

              {isNotifOpen && (
                <div className={`absolute right-0 top-full mt-2 w-80 rounded-lg shadow-lg border z-30 overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <div className={`flex items-center justify-between px-4 py-3 border-b transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                    <h4 className={`text-sm font-semibold transition-colors duration-500 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Thông báo</h4>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs font-medium text-[#004b87] hover:underline">
                        Đánh dấu đã đọc tất cả
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 && (
                      <p className={`text-sm text-center py-6 transition-colors duration-500 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Không có thông báo nào.</p>
                    )}
                    {notifications.map((n) => {
                      const Icon = n.type === 'ai' ? Bot : n.type === 'room' ? Building2 : MessageSquareWarning;
                      return (
                        <button
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`w-full text-left flex gap-3 px-4 py-3 border-b transition-colors duration-500 ${
                            isDarkMode ? 'border-slate-700/60' : 'border-slate-50'
                          } ${
                            n.read
                              ? (isDarkMode ? 'bg-slate-900/40 hover:bg-slate-700/40' : 'bg-slate-50 hover:bg-slate-100')
                              : (isDarkMode ? 'bg-slate-800 hover:bg-slate-700/60' : 'bg-white hover:bg-slate-50')
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500 ${
                            n.type === 'ai'
                              ? (isDarkMode ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-100 text-purple-600')
                              : n.type === 'room'
                              ? (isDarkMode ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-100 text-indigo-600')
                              : (isDarkMode ? 'bg-orange-900/40 text-orange-300' : 'bg-orange-100 text-orange-600')
                          }`}>
                            <Icon size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate transition-colors duration-500 ${n.read ? 'font-normal' : 'font-semibold'} ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                              {n.title}
                            </p>
                            <p className={`text-xs mt-0.5 line-clamp-2 transition-colors duration-500 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{n.description}</p>
                            <p className={`text-[11px] mt-1 transition-colors duration-500 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{timeAgo(n.created_at)}</p>
                          </div>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Profile + dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-label={`Tài khoản: ${displayName}`}
                aria-expanded={isProfileOpen}
                aria-haspopup="true"
                className={`flex items-center gap-3 pl-2 sm:pl-4 rounded-lg py-1 pr-1 transition-colors duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400`}
              >
                <div className="w-8 h-8 rounded-full bg-[#004b87] text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : avatarInitial}
                </div>
                <div className="hidden md:block text-sm text-left">
                  <p className={`font-semibold transition-colors duration-500 ${isDarkMode ? 'text-slate-100' : 'text-slate-700'}`}>{displayName}</p>
                  <p className={`text-xs transition-colors duration-500 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{roleLabel}</p>
                </div>
              </button>

              {isProfileOpen && (
                <div className={`absolute right-0 top-full mt-2 w-48 rounded-lg shadow-lg border py-1 z-30 transition-colors duration-500 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <button
                    onClick={() => { setActiveTab('account'); setIsProfileOpen(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors duration-500 ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    <UserCircle2 size={16} /> Tài khoản
                  </button>
                  <button
                    onClick={() => { setIsContactOpen(true); setIsProfileOpen(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors duration-500 ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    <Phone size={16} /> Thông tin liên hệ
                  </button>
                  {/* Chỉ sinh viên mới xin nâng quyền lên Ban quản lý KTX. Ban quản lý/kế toán không cần mục này. */}
                  {role === 'student' && (
                    <button
                      onClick={() => { setIsAccessRequestOpen(true); setIsProfileOpen(false); }}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors duration-500 ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      <Shield size={16} /> Yêu cầu quyền truy cập đặc biệt
                    </button>
                  )}
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors duration-500 ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    {isDarkMode ? <Sun size={16} /> : <Moon size={16} />} {isDarkMode ? 'Chế độ sáng' : 'Chế độ tối'}
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors duration-500 ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'}`}
                  >
                    <RefreshCw size={16} /> Refresh
                  </button>
                  <div className={`my-1 border-t transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`} />
                  <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-red-500 transition-colors duration-500 ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-red-50'}`}
                  >
                    <LogOut size={16} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hàng bên dưới thanh trên cùng: thanh bên + nội dung chính (đẩy xuống bằng pt-16 để tránh header cố định đè lên) */}
      <div className="flex flex-1 pt-16">
        {/* Sidebar cố định — chỉ hiện từ lg trở lên. Dưới lg dùng drawer riêng bên dưới
            (xem design.md § Macrostructure family — "Workbench Responsive Rail"). */}
        <aside
          onMouseEnter={() => sidebarMode === 'hover' && setIsSidebarHovering(true)}
          onMouseLeave={() => sidebarMode === 'hover' && setIsSidebarHovering(false)}
          className={`hidden lg:flex ${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-[#004b87] text-white flex-col fixed top-16 left-0 h-[calc(100vh-4rem)] z-20 ${
            sidebarMode === 'hover' && isSidebarHovering ? 'shadow-2xl' : ''
          }`}
        >
          <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto overflow-x-hidden">
            {renderNavItems(isSidebarOpen)}
          </nav>

          {/* Sidebar control — thay cho nút Đăng xuất trước đây (Đăng xuất đã có trong menu tài khoản ở góc phải).
              Popup giữ nguyên cho đến khi người dùng chọn 1 mục hoặc click ra ngoài (xử lý ở handleClickOutside). */}
          <div className="relative p-2 border-t border-blue-800" ref={sidebarControlRef}>
            {isSidebarControlOpen && (
              <div
                className={`absolute bottom-full left-2 mb-2 w-56 rounded-xl border shadow-2xl overflow-hidden z-30 transition-colors duration-500 ${
                  isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}
              >
                <div className={`px-4 pt-3 pb-2 text-sm font-semibold border-b transition-colors duration-500 ${isDarkMode ? 'text-slate-200 border-slate-700' : 'text-slate-700 border-slate-100'}`}>
                  Chế độ thanh bên
                </div>
                <div className="py-1">
                  {SIDEBAR_MODE_OPTIONS.map((opt) => {
                    const selected = sidebarMode === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => { setSidebarMode(opt.value); setIsSidebarControlOpen(false); }}
                        className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors duration-500 ${
                          isDarkMode ? 'hover:bg-slate-700/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span className="w-3 shrink-0 flex justify-center">
                          {selected && <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${isDarkMode ? 'bg-blue-400' : 'bg-[#004b87]'}`} />}
                        </span>
                        <span className={`transition-colors duration-500 ${selected ? (isDarkMode ? 'text-white font-medium' : 'text-slate-900 font-medium') : (isDarkMode ? 'text-slate-300' : 'text-slate-600')}`}>
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => setIsSidebarControlOpen(!isSidebarControlOpen)}
              className={`group relative flex items-center justify-center p-2 rounded transition-colors ${
                isSidebarControlOpen ? 'bg-blue-700 text-white' : 'text-blue-200 hover:bg-blue-700 hover:text-white'
              }`}
              title="Chế độ thanh bên"
            >
              <PanelLeft size={20} />
              <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 z-50">
                Chế độ thanh bên
              </span>
            </button>
          </div>
        </aside>

        {/* Drawer điều hướng mobile — thay thế sidebar cố định dưới lg. Overlay tối phía sau
            đóng khi bấm ra ngoài; panel tự đóng qua phím Escape (xử lý ở handleEscape) hoặc
            khi chuyển tab (xem useEffect [activeTab]). */}
        <div
          className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-300 ${isMobileNavOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          aria-hidden={!isMobileNavOpen}
        >
          <div
            onClick={() => setIsMobileNavOpen(false)}
            className="absolute inset-0 bg-slate-900/50"
          />
          <aside
            role="dialog"
            aria-label="Menu điều hướng"
            className={`absolute top-0 left-0 h-full w-72 max-w-[80vw] bg-[#004b87] text-white flex flex-col shadow-2xl transition-transform duration-300 ease-out ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <div className="h-16 flex items-center justify-between px-4 border-b border-blue-800 shrink-0">
              <div className="flex items-center gap-2">
                <img src={logoIctu} alt="Logo ICTU" className="w-8 h-8 rounded-full object-cover" />
                <span className="text-sm font-semibold">ICTU KTX</span>
              </div>
              <button
                onClick={() => setIsMobileNavOpen(false)}
                aria-label="Đóng menu"
                className="p-2 rounded-lg text-blue-100 hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
              {renderNavItems(true)}
            </nav>
          </aside>
        </div>

        {/* Main Content */}
        <main className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isMainShiftedOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        {/* Dynamic Content */}
        <div className={`p-4 sm:p-6 flex-1 overflow-auto transition-colors duration-500 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
          {activeTab === 'dashboard' && <DashboardView isDarkMode={isDarkMode} role={role} />}
          {activeTab === 'rooms' && <RoomsView isDarkMode={isDarkMode} role={role} session={session} />}
          {activeTab === 'issues' && <IssuesView isDarkMode={isDarkMode} role={role} session={session} subTab={issuesSubTab} onSubTabChange={setIssuesSubTab} />}
          {activeTab === 'account' && (
            <AccountSettings profile={profile} session={session} isDarkMode={isDarkMode} onProfileUpdate={updateProfileLocally} />
          )}
          {activeTab === 'students' && <StudentsView isDarkMode={isDarkMode} />}
          {activeTab === 'fees' && <FeesView isDarkMode={isDarkMode} />}
        </div>
        </main>
      </div>

      {/* AI Chatbot — nút tròn nổi góc phải, dùng được từ mọi trang */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#004b87] text-white shadow-xl hover:bg-[#003a68] hover:scale-105 transition-all flex items-center justify-center"
          title="AI Chatbot"
        >
          <Bot size={26} />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center">
            <Sparkles size={10} className="text-[#004b87]" />
          </span>
        </button>
      )}

      {isChatOpen && (
        <div className={`fixed bottom-6 right-6 z-40 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-3rem)] rounded-2xl shadow-2xl border overflow-hidden flex flex-col transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <ChatbotView isDarkMode={isDarkMode} floating onClose={() => setIsChatOpen(false)} messages={chatMessages} setMessages={setChatMessages} />
        </div>
      )}

      {isContactOpen && (
        <ContactInfoModal isDarkMode={isDarkMode} onClose={() => setIsContactOpen(false)} />
      )}

      {isAccessRequestOpen && (
        <AccessRequestModal isDarkMode={isDarkMode} session={session} onClose={() => setIsAccessRequestOpen(false)} />
      )}
    </div>
    </CrossfadeSwitch>
  );
}

function ContactInfoModal({ isDarkMode, onClose }) {
  const t = isDarkMode
    ? { overlay: 'bg-slate-900/80', card: 'bg-slate-800 border-slate-700', title: 'text-slate-100', sub: 'text-slate-400', section: 'bg-slate-900/50 border-slate-700', label: 'text-slate-300', value: 'text-slate-400' }
    : { overlay: 'bg-black/50', card: 'bg-white border-slate-200', title: 'text-slate-800', sub: 'text-slate-500', section: 'bg-slate-50 border-slate-100', label: 'text-slate-700', value: 'text-slate-500' };

  const SECTIONS = [
    {
      title: 'PHÒNG QUẢN LÝ CƠ SỞ VẬT CHẤT',
      icon: <Building size={16} />,
      items: [
        { icon: <Phone size={14} />, text: '0208.3904 389' },
        { icon: <Mail size={14} />, text: 'phongqtpv@ictu.edu.vn' },
      ],
    },
    {
      title: 'PHÒNG CÔNG TÁC HSSV',
      icon: <Users size={16} />,
      items: [
        { icon: <Phone size={14} />, text: '0280 3904365' },
        { icon: <Mail size={14} />, text: 'phongcthssv@ictu.edu.vn' },
      ],
    },
    {
      title: 'TỔ BẢO VỆ',
      icon: <Shield size={16} />,
      items: [
        { icon: <UserCircle2 size={14} />, text: 'Tổ trưởng: Nguyễn Mạnh Tuấn' },
        { icon: <Phone size={14} />, text: '0983 646135' },
      ],
    },
    {
      title: 'TRẠM Y TẾ',
      icon: <HeartPulse size={16} />,
      items: [
        { icon: <Mail size={14} />, text: 'tramyte@ictu.edu.vn' },
      ],
    },
    {
      title: 'QUẢN LÝ KÝ TÚC XÁ',
      icon: <Building2 size={16} />,
      items: [
        { icon: <Phone size={14} />, text: '0869 329 188' },
      ],
    },
  ];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors duration-500 ${t.overlay}`} onClick={onClose}>
      <div
        className={`w-full max-w-md rounded-2xl border shadow-xl p-6 max-h-[85vh] overflow-y-auto transition-colors duration-500 ${t.card}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <img src={logoIctu} alt="Logo ICTU" className="w-9 h-9 rounded-full object-cover" />
            <div>
              <h3 className={`font-bold text-base leading-tight transition-colors duration-500 ${t.title}`}>Thông tin liên hệ</h3>
              <p className={`text-xs transition-colors duration-500 ${t.sub}`}>Trường ĐH Công nghệ Thông tin và Truyền thông – ĐH Thái Nguyên</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-1 rounded-full transition-colors duration-500 ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <X size={18} />
          </button>
        </div>

        <div className={`rounded-lg border p-3 mb-4 space-y-1.5 transition-colors duration-500 ${t.section}`}>
          <p className={`flex items-center gap-2 text-sm transition-colors duration-500 ${t.label}`}><Mail size={14} /> contact@ictu.edu.vn</p>
          <p className={`flex items-center gap-2 text-sm transition-colors duration-500 ${t.label}`}><Phone size={14} /> 02083 846 254</p>
        </div>

        <div className="space-y-3">
          {SECTIONS.map((sec) => (
            <div key={sec.title} className={`rounded-lg border p-3 transition-colors duration-500 ${t.section}`}>
              <h4 className={`flex items-center gap-2 text-xs font-bold tracking-wide mb-2 text-[#004b87]`}>
                {sec.icon} {sec.title}
              </h4>
              <div className="space-y-1 pl-1">
                {sec.items.map((it, i) => (
                  <p key={i} className={`flex items-center gap-2 text-sm transition-colors duration-500 ${t.value}`}>
                    {it.icon} {it.text}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Modal cho SINH VIÊN gửi "Yêu cầu quyền truy cập đặc biệt" — nay chia làm 2 loại: xin quyền
// Ban quản lý KTX hoặc xin quyền Kế toán (targetRole). Tái sử dụng bảng `issues` sẵn có (giống
// cách "Yêu cầu trả/chuyển phòng" đã làm), thêm request_type = 'access_request' để phân biệt,
// và tái dùng cột change_type (vốn dùng cho loại chuyển/trả phòng) để lưu vai trò đang xin
// ('manager' | 'accountant') — tránh phải thêm cột mới trong Supabase. Sau khi gửi, yêu cầu này
// xuất hiện trong màn "Quản lý Phản ánh & Vi phạm nội quy" (tab Phản ánh & Sự cố) bên phía Ban
// quản lý KTX, nhưng CHỈ có 2 lựa chọn xử lý là "Xác nhận" / "Từ chối" (xem IssuesView) thay vì
// 3 mức như phản ánh sự cố thông thường. "Xác nhận" sẽ đổi role của sinh viên đó thành đúng vai
// trò đã xin (manager hoặc accountant) trực tiếp trong bảng `profiles` — do chọn cách cập nhật
// khi F5/đăng nhập lại (không dùng Realtime), sinh viên cần tải lại trang để thấy giao diện mới.
function AccessRequestModal({ isDarkMode, session, onClose }) {
  const [targetRole, setTargetRole] = useState('manager'); // 'manager' | 'accountant'
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'success'

  const t = isDarkMode
    ? { overlay: 'bg-slate-900/80', card: 'bg-slate-800 border-slate-700', title: 'text-slate-100', sub: 'text-slate-400', label: 'text-slate-300', input: 'bg-slate-700 border-slate-600 text-slate-100' }
    : { overlay: 'bg-black/50', card: 'bg-white border-slate-200', title: 'text-slate-800', sub: 'text-slate-500', label: 'text-slate-700', input: 'bg-white border-slate-300 text-slate-800' };

  const ROLE_OPTIONS = [
    { value: 'manager', label: 'Ban quản lý KTX', desc: 'Quản lý phòng, sinh viên, phản ánh & vi phạm nội quy', icon: Shield },
    { value: 'accountant', label: 'Kế toán', desc: 'Theo dõi phí phòng và công nợ của sinh viên', icon: Calculator },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do xin cấp quyền truy cập đặc biệt.');
      return;
    }
    setSubmitting(true);

    // LƯU Ý: không gắn building_id/floor/room_number/room_id vì yêu cầu này không liên quan tới
    // 1 phòng cụ thể. Nếu Supabase báo lỗi NOT NULL cho các cột đó (bảng "issues" hiện đang bắt
    // buộc nhập vì mọi loại yêu cầu trước đây — báo hỏng, chuyển/trả phòng — đều gắn với 1 phòng),
    // cần chạy: ALTER TABLE issues ALTER COLUMN building_id DROP NOT NULL; (tương tự cho floor,
    // room_number, room_id) trong Supabase SQL Editor rồi thử lại.
    const { data: newIssue, error: err } = await supabase.from('issues').insert({
      student_id: session.user.id,
      title: `Yêu cầu quyền truy cập đặc biệt (${ACCESS_ROLE_LABEL[targetRole]}): ${reason.trim()}`,
      request_type: 'access_request',
      change_type: targetRole,
      status: 'Chờ xử lý',
    }).select().single();
    setSubmitting(false);

    if (err) {
      setError(
        err.message?.includes('null value')
          ? 'Gửi yêu cầu thất bại: bảng "issues" đang bắt buộc nhập tòa/tầng/phòng cho mọi yêu cầu. ' +
            'Cần nới lỏng ràng buộc NOT NULL cho các cột building_id, floor, room_number, room_id ' +
            '(ALTER TABLE issues ALTER COLUMN <cột> DROP NOT NULL;) rồi thử lại.'
          : 'Gửi yêu cầu thất bại: ' + err.message
      );
      return;
    }

    const { error: notifErr } = await supabase.from('notifications').insert({
      recipient_role: 'manager',
      type: 'issue',
      title: ACCESS_REQUEST_NOTIF_TITLE,
      description: `${session.user.email} vừa gửi yêu cầu quyền ${ACCESS_ROLE_LABEL[targetRole]}. Lý do: ${reason.trim()}`,
      issue_id: newIssue?.id ?? null,
      read: false,
    });
    if (notifErr) console.error('Lỗi tạo thông báo yêu cầu quyền truy cập đặc biệt:', notifErr.message);

    setStep('success');
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors duration-500 ${t.overlay}`} onClick={onClose}>
      <div className={`w-full max-w-md rounded-2xl shadow-2xl border p-6 transition-colors duration-500 ${t.card}`} onClick={(e) => e.stopPropagation()}>
        {step === 'form' ? (
          <>
            <div className="flex items-center justify-between mb-1">
              <h3 className={`text-lg font-bold flex items-center gap-2 transition-colors duration-500 ${t.title}`}><Shield size={20} /> Yêu cầu quyền truy cập đặc biệt</h3>
              <button onClick={onClose} className={t.sub}><X size={20} /></button>
            </div>
            <p className={`text-sm mb-4 transition-colors duration-500 ${t.sub}`}>
              Yêu cầu sẽ được gửi tới Ban quản lý KTX để xét duyệt. Nếu được xét duyệt, tài khoản của bạn
              sẽ được cấp đúng quyền bạn chọn bên dưới.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1.5 transition-colors duration-500 ${t.label}`}>Loại quyền muốn xin</label>
                <div className="flex flex-col gap-2">
                  {ROLE_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    const selected = targetRole === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTargetRole(opt.value)}
                        className={`text-left rounded-lg border p-3 transition-colors duration-500 ${
                          selected
                            ? (isDarkMode ? 'border-blue-500 bg-blue-950/40' : 'border-[#004b87] bg-blue-50')
                            : (isDarkMode ? 'border-slate-600 hover:bg-slate-700/50' : 'border-slate-300 hover:bg-slate-50')
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={18} className={selected ? 'text-[#004b87]' : t.sub} />
                          <div>
                            <p className={`text-sm font-semibold transition-colors duration-500 ${t.title}`}>{opt.label}</p>
                            <p className={`text-xs mt-0.5 transition-colors duration-500 ${t.sub}`}>{opt.desc}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 transition-colors duration-500 ${t.label}`}>Lý do</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="Trình bày lý do bạn cần quyền truy cập đặc biệt..."
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400 transition-colors duration-500 ${t.input}`}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-500 ${isDarkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                  Hủy
                </button>
                <button type="submit" disabled={submitting} className="bg-[#004b87] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#003a68] transition shadow-sm disabled:opacity-70 flex items-center gap-2">
                  {submitting && <Loader2 size={16} className="animate-spin" />} Gửi yêu cầu
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
            <h3 className={`text-lg font-bold mb-1 transition-colors duration-500 ${t.title}`}>Đã gửi yêu cầu</h3>
            <p className={`text-sm mb-5 transition-colors duration-500 ${t.sub}`}>Ban quản lý KTX sẽ xem xét và phản hồi yêu cầu xin quyền {ACCESS_ROLE_LABEL[targetRole]} của bạn sớm nhất.</p>
            <button onClick={onClose} className="bg-[#004b87] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#003a68] transition shadow-sm">
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- SUB COMPONENTS ---

function NavItem({ icon, label, isActive, onClick, isOpen, highlight }) {
  return (
    <button
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all whitespace-nowrap overflow-hidden
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#004b87]
        ${isOpen ? '' : 'justify-center'}
        ${isActive 
          ? highlight ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'bg-blue-900/50 text-white font-medium border-l-4 border-yellow-400' 
          : highlight ? 'text-indigo-200 hover:bg-blue-800 hover:text-white' : 'text-blue-100 hover:bg-blue-800 hover:text-white border-l-4 border-transparent'
        }`}
    >
      <div className="min-w-[20px] flex items-center justify-center">{icon}</div>
      {isOpen && <span className="text-sm">{label}</span>}
      {isOpen && highlight && <Sparkles size={14} className="ml-auto text-yellow-300" />}

      {/* Tooltip hiện tên khi thanh bên đang thu gọn (collapsed hoặc hover chưa kích hoạt) */}
      {!isOpen && (
        <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 z-50">
          {label}
        </span>
      )}
    </button>
  );
}

function DashboardView({ isDarkMode, role }) {
  const t = isDarkMode
    ? { title: 'text-slate-100', sub: 'text-slate-400', card: 'bg-slate-800 border-slate-700', heading: 'text-slate-200', theadBg: 'bg-slate-900 text-slate-400 border-slate-700', divide: 'divide-slate-700', cell: 'text-slate-200', trackBg: 'bg-slate-700', pct: 'text-slate-400' }
    : { title: 'text-slate-800', sub: 'text-slate-500', card: 'bg-white border-slate-200', heading: 'text-slate-700', theadBg: 'bg-slate-50 text-slate-600 border-slate-200', divide: 'divide-slate-100', cell: 'text-slate-800', trackBg: 'bg-slate-100', pct: 'text-slate-600' };

  const [loading, setLoading] = useState(true);
  const [expandedStat, setExpandedStat] = useState(null); // key của box đang mở rộng, null = tất cả đóng
  const [studentCount, setStudentCount] = useState(0);
  const [pendingIssues, setPendingIssues] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);
  const [debtStudentCount, setDebtStudentCount] = useState(0);
  const [buildingStats, setBuildingStats] = useState([]);
  const [totalCapacity, setTotalCapacity] = useState(0);
  const [totalOccupied, setTotalOccupied] = useState(0);

  const formatVND = (n) => n.toLocaleString('vi-VN') + ' đ';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [
        { count: sCount },
        { count: iCount },
        { data: buildings },
        { data: rooms },
        { data: activeRes },
        { data: fees },
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('issues').select('id', { count: 'exact', head: true }).eq('status', 'Chờ xử lý'),
        supabase.from('buildings').select('id, name').order('name'),
        supabase.from('rooms').select('id, building_id, capacity'),
        supabase.from('residencies').select('bed_id, beds(room_id)').eq('status', 'active'),
        supabase.from('fees').select('debt, student_id'),
      ]);
      if (cancelled) return;

      const occupiedByRoom = {};
      (activeRes || []).forEach((row) => {
        const roomId = row.beds?.room_id;
        if (roomId) occupiedByRoom[roomId] = (occupiedByRoom[roomId] || 0) + 1;
      });

      const stats = (buildings || []).map((b) => {
        const roomsOfBuilding = (rooms || []).filter((r) => r.building_id === b.id);
        const capacity = roomsOfBuilding.reduce((sum, r) => sum + (r.capacity || 0), 0);
        const occupied = roomsOfBuilding.reduce((sum, r) => sum + (occupiedByRoom[r.id] || 0), 0);
        const percent = capacity ? Math.round((occupied / capacity) * 100) : 0;
        return { name: b.name, totalRooms: roomsOfBuilding.length, capacity, occupied, percent };
      });

      const capSum = (rooms || []).reduce((sum, r) => sum + (r.capacity || 0), 0);
      const occSum = Object.values(occupiedByRoom).reduce((sum, n) => sum + n, 0);

      setStudentCount(sCount || 0);
      setPendingIssues(iCount || 0);
      setBuildingStats(stats);
      setTotalCapacity(capSum);
      setTotalOccupied(occSum);
      setTotalDebt((fees || []).reduce((sum, f) => sum + Number(f.debt || 0), 0));
      setDebtStudentCount((fees || []).filter((f) => Number(f.debt) > 0).length);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const occupancyPercent = totalCapacity ? Math.round((totalOccupied / totalCapacity) * 100) : 0;
  const vacantBeds = Math.max(totalCapacity - totalOccupied, 0);

  // Danh sách "hoạt động AI gần đây" tách thành mảng để dựng dạng timeline bên dưới
  // thay vì lặp lại icon-box giống StatCard (xem design.md — tránh khuôn 2 card song sinh).
  const recentActivity = [
    { icon: <Bot size={13} />, dot: isDarkMode ? 'bg-blue-400' : 'bg-blue-600', text: <><span className="font-semibold">Chatbot</span> đã trả lời 24 câu hỏi nội quy trong 24h qua.</>, time: '10 phút trước' },
    { icon: <Building size={13} />, dot: isDarkMode ? 'bg-emerald-400' : 'bg-emerald-600', text: <><span className="font-semibold">AI Xếp phòng</span> vừa tự động gợi ý phòng R202 cho 1 sinh viên nữ.</>, time: '2 giờ trước' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-[#004b87]" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 style={{ fontFamily: 'var(--font-display), sans-serif' }} className={`text-2xl font-extrabold tracking-tight transition-colors duration-500 ${t.title}`}>Tổng quan hệ thống</h1>
        <p className={`text-sm mt-1 transition-colors duration-500 ${t.sub}`}>Thông số hoạt động KTX Đại học CNTT & Truyền thông</p>
      </div>

      {/* 5 box thống kê dạng accordion ngang: mặc định tất cả đóng (khuôn StatCard cũ), click 1 box
          để nó "kéo dài" ra (flex-grow tăng) và hiện dòng chi tiết bên dưới con số — box đang mở
          trước đó tự thu lại vì chỉ 1 key được lưu trong expandedStat. Dùng flexGrow thay vì đổi
          cột grid để layout co giãn mượt, không bị lệch hàng khi 1 ô phình to. */}
      <div className="flex flex-wrap gap-4">
        {[
          { key: 'occupancy', title: 'Tỷ lệ lấp đầy toàn KTX', value: `${occupancyPercent}%`, detail: `${totalOccupied}/${totalCapacity} giường đang sử dụng — ${studentCount} sinh viên`, icon: <CheckCircle2 />, color: 'blue' },
          { key: 'students', title: 'Tổng sinh viên', value: studentCount.toLocaleString('vi-VN'), detail: `${totalOccupied} đang nội trú / ${studentCount} tài khoản sinh viên`, icon: <Users />, color: 'indigo' },
          { key: 'vacant', title: 'Giường trống', value: vacantBeds.toLocaleString('vi-VN'), detail: `${vacantBeds}/${totalCapacity} giường còn khả dụng toàn KTX`, icon: <Building />, color: 'green' },
          { key: 'issues', title: 'Phản ánh chờ xử lý', value: pendingIssues.toLocaleString('vi-VN'), detail: 'Cần giải quyết ngay — xem chi tiết ở Quản lý Phản ánh', icon: <AlertCircle />, color: 'orange' },
          { key: 'debt', title: 'Tổng công nợ', value: formatVND(totalDebt), detail: `${debtStudentCount} sinh viên còn nợ / ${studentCount} tổng sinh viên`, icon: <Wallet />, color: 'red' },
        ].map((s) => (
          <ExpandableStatCard
            key={s.key}
            isDarkMode={isDarkMode}
            title={s.title}
            value={s.value}
            detail={s.detail}
            icon={s.icon}
            color={s.color}
            isOpen={expandedStat === s.key}
            onToggle={() => setExpandedStat((prev) => (prev === s.key ? null : s.key))}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bảng tòa nhà: nhấn "rule" mảnh phía trên thay vì đóng khung shadow giống hệt khối
            timeline bên cạnh — tránh cặp thẻ song sinh cùng kiểu. */}
        <div className={`lg:col-span-8 rounded-lg border-t-2 pt-4 transition-colors duration-500 ${isDarkMode ? 'border-t-slate-700' : 'border-t-slate-200'}`}>
          <h3 className={`font-bold mb-4 flex items-center gap-2 transition-colors duration-500 ${t.heading}`}>
            <Building2 size={18} className="text-[#004b87]"/> Tổng quan tòa nhà
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className={`font-medium border-b transition-colors duration-500 ${t.theadBg}`}>
                <tr>
                  <th className="py-3 px-4">Tòa nhà</th>
                  <th className="py-3 px-4">Tổng số phòng</th>
                  <th className="py-3 px-4">Giường đang sử dụng</th>
                  <th className="py-3 px-4">Tỷ lệ</th>
                </tr>
              </thead>
              <tbody className={`divide-y transition-colors duration-500 ${t.divide}`}>
                {buildingStats.length === 0 && (
                  <tr><td colSpan={4} className={`py-6 text-center text-sm transition-colors duration-500 ${t.sub}`}>Chưa có dữ liệu tòa nhà.</td></tr>
                )}
                {buildingStats.map((b) => (
                  <tr key={b.name}>
                    <td className={`py-3 px-4 font-medium transition-colors duration-500 ${t.cell}`}>{b.name}</td>
                    <td className={`py-3 px-4 transition-colors duration-500 ${t.cell}`}>{b.totalRooms}</td>
                    <td className={`py-3 px-4 transition-colors duration-500 ${t.cell}`}>{b.occupied}/{b.capacity}</td>
                    <td className="py-3 px-4"><ProgressBar percent={b.percent} color="bg-blue-500" isDarkMode={isDarkMode}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hoạt động AI gần đây: dạng timeline (đường nối dọc + chấm mốc) thay cho danh sách
            icon-box lặp lại kiểu StatCard — tạo khác biệt cấu trúc thật giữa 2 khối trong hàng. */}
        <div className={`lg:col-span-4 rounded-lg border p-5 flex flex-col transition-colors duration-500 ${t.card}`}>
          <h3 className={`font-bold mb-5 flex items-center gap-2 transition-colors duration-500 ${t.heading}`}>
            <Sparkles size={18} className="text-yellow-500"/> Hoạt động AI gần đây
          </h3>
          <div className={`flex-1 relative pl-5 border-l-2 border-dashed space-y-5 transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            {recentActivity.map((item, idx) => (
              <div key={idx} className="relative text-sm">
                <span className={`absolute -left-[25px] top-0.5 w-3 h-3 rounded-full ring-4 transition-colors duration-500 ${item.dot} ${isDarkMode ? 'ring-slate-800' : 'ring-white'}`} />
                <p className={t.cell}>{item.text}</p>
                <span className={`text-xs transition-colors duration-500 ${t.sub}`}>{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoomsView({ isDarkMode, role, session }) {
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [occupiedMap, setOccupiedMap] = useState({}); // room_id -> số giường đang ở
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const t = isDarkMode
    ? { title: 'text-slate-100', sub: 'text-slate-400', card: 'bg-slate-800 border-slate-700', headerBg: 'bg-slate-900 border-slate-700', heading: 'text-slate-200', select: 'bg-slate-700 border-slate-600 text-slate-200', theadTxt: 'text-slate-400 border-slate-700', divide: 'divide-slate-700', hover: 'hover:bg-slate-700/50', cell: 'text-slate-200' }
    : { title: 'text-slate-800', sub: 'text-slate-500', card: 'bg-white border-slate-200', headerBg: 'bg-slate-50 border-slate-100', heading: 'text-slate-700', select: 'bg-white border-slate-300', theadTxt: 'text-slate-500 border-slate-200', divide: 'divide-slate-100', hover: 'hover:bg-slate-50', cell: 'text-slate-800' };

  const loadData = async () => {
    setLoading(true);
    const [{ data: b }, { data: r }, { data: res }] = await Promise.all([
      supabase.from('buildings').select('*').order('name'),
      supabase.from('rooms').select('*, buildings(name)').order('room_number'),
      supabase.from('residencies').select('bed_id, beds(room_id)').eq('status', 'active'),
    ]);
    setBuildings(b || []);
    setRooms(r || []);
    const map = {};
    (res || []).forEach((row) => {
      const roomId = row.beds?.room_id;
      if (roomId) map[roomId] = (map[roomId] || 0) + 1;
    });
    setOccupiedMap(map);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filteredRooms = buildingFilter === 'all' ? rooms : rooms.filter(r => r.building_id === buildingFilter);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex justify-between items-end">
        <div>
          <h1 className={`text-2xl font-bold transition-colors duration-500 ${t.title}`}>Quản lý Phòng & Xếp chỗ</h1>
          <p className={`text-sm mt-1 transition-colors duration-500 ${t.sub}`}>Quản lý tòa, tầng, phòng, giường ký túc xá</p>
        </div>
        <div className="flex gap-2">
          {role === 'student' && (
            <button onClick={() => setIsRegisterOpen(true)} className="bg-[#004b87] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#003a68] transition shadow-sm flex items-center gap-2">
              <Plus size={16} /> Đăng ký phòng ở mới
            </button>
          )}
          {(role === 'manager' || role === 'accountant') && (
            <button onClick={() => setIsAddOpen(true)} className="bg-[#004b87] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#003a68] transition shadow-sm flex items-center gap-2">
              <Plus size={16} /> Thêm phòng
            </button>
          )}
        </div>
      </div>

      <div className={`rounded-xl shadow-sm border overflow-hidden flex flex-col flex-1 transition-colors duration-500 ${t.card}`}>
        <div className={`p-4 border-b flex justify-between items-center transition-colors duration-500 ${t.headerBg}`}>
          <h3 className={`font-semibold transition-colors duration-500 ${t.heading}`}>Danh sách phòng hiện tại</h3>
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className={`text-sm border rounded-md px-2 py-1 outline-none transition-colors duration-500 ${t.select}`}
          >
            <option value="all">Tất cả các tòa</option>
            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto flex-1 p-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#004b87]" size={24} /></div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className={`border-b transition-colors duration-500 ${t.theadTxt}`}>
                <tr>
                  <th className="pb-3 font-medium">Phòng</th>
                  <th className="pb-3 font-medium">Tầng</th>
                  <th className="pb-3 font-medium">Loại</th>
                  <th className="pb-3 font-medium">Giới tính</th>
                  <th className="pb-3 font-medium">Trạng thái (Giường)</th>
                </tr>
              </thead>
              <tbody className={`divide-y transition-colors duration-500 ${t.divide}`}>
                {filteredRooms.length === 0 && (
                  <tr><td colSpan={5} className={`py-6 text-center text-sm transition-colors duration-500 ${t.sub}`}>Không có phòng nào.</td></tr>
                )}
                {filteredRooms.map(room => {
                  const occ = occupiedMap[room.id] || 0;
                  return (
                    <tr key={room.id} className={t.hover}>
                      <td className="py-3 font-semibold text-[#004b87]">{room.room_number} <span className={`text-xs font-normal ml-1 transition-colors duration-500 ${t.sub}`}>({room.buildings?.name})</span></td>
                      <td className={`py-3 transition-colors duration-500 ${t.cell}`}>Tầng {room.floor}</td>
                      <td className={`py-3 transition-colors duration-500 ${t.cell}`}>{room.type}</td>
                      <td className={`py-3 transition-colors duration-500 ${t.cell}`}>{room.gender}</td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium transition-colors duration-500 ${
                          isDarkMode
                            ? (occ >= room.capacity ? 'bg-red-900/40 text-red-300' : occ === 0 ? 'bg-green-900/40 text-green-300' : 'bg-blue-900/40 text-blue-300')
                            : (occ >= room.capacity ? 'bg-red-100 text-red-700' : occ === 0 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')
                        }`}>
                          {occ}/{room.capacity}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isAddOpen && (
        <AddRoomModal isDarkMode={isDarkMode} buildings={buildings} onClose={() => setIsAddOpen(false)} onCreated={loadData} />
      )}
      {isRegisterOpen && (
        <RegisterHousingModal isDarkMode={isDarkMode} session={session} rooms={rooms} buildings={buildings} occupiedMap={occupiedMap} onClose={() => setIsRegisterOpen(false)} onRegistered={loadData} />
      )}
    </div>
  );
}

function RegisterHousingModal({ isDarkMode, session, rooms, buildings, occupiedMap, onClose, onRegistered }) {
  const [findMode, setFindMode] = useState('manual'); // 'manual' | 'ai' | 'change'
  const [step, setStep] = useState('browse'); // 'browse' | 'detail' | 'success'
  const [selectedRoom, setSelectedRoom] = useState(null); // phòng đang xem chi tiết

  // Bộ lọc thủ công
  const [fBuilding, setFBuilding] = useState('all');
  const [fGender, setFGender] = useState('all');
  const [fType, setFType] = useState('all');

  // AI gợi ý
  const [aiCriteria, setAiCriteria] = useState('Sinh viên năm nhất, muốn ở phòng cao cấp, ưu tiên phòng còn ít người để yên tĩnh.');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  const [registering, setRegisteringId] = useState(null); // room.id đang đăng ký
  const [error, setError] = useState('');

  // Yêu cầu trả/chuyển phòng — dành cho sinh viên đang có phòng ở (residency active)
  const [currentResidency, setCurrentResidency] = useState(null); // { building_id, floor, room_number, buildings:{name} }
  const [loadingResidency, setLoadingResidency] = useState(true);
  const [changeType, setChangeType] = useState('Chuyển phòng'); // 'Chuyển phòng' | 'Trả phòng'
  const [changeReason, setChangeReason] = useState('');
  const [changeSubmitting, setChangeSubmitting] = useState(false);
  const [changeError, setChangeError] = useState('');

  // Tải thông tin phòng hiện tại của sinh viên (nếu có) — dùng cho mục "Yêu cầu trả/chuyển phòng"
  useEffect(() => {
    (async () => {
      setLoadingResidency(true);
      const { data } = await supabase
        .from('residencies')
        .select('id, bed_id, beds(room_id, rooms(id, room_number, floor, building_id, buildings(name)))')
        .eq('student_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();
      const room = data?.beds?.rooms;
      setCurrentResidency(room ? {
        building_id: room.building_id,
        floor: room.floor,
        room_number: room.room_number,
        buildings: room.buildings,
      } : null);
      setLoadingResidency(false);
    })();
  }, [session.user.id]);

  const handleSubmitChangeRequest = async () => {
    setChangeError('');
    if (!currentResidency) {
      setChangeError('Bạn hiện không có phòng ở nên không thể gửi yêu cầu chuyển/trả phòng.');
      return;
    }
    if (!changeReason.trim()) {
      setChangeError('Vui lòng nhập lý do.');
      return;
    }
    setChangeSubmitting(true);

    const { data: newIssue, error: err } = await supabase.from('issues').insert({
      student_id: session.user.id,
      building_id: currentResidency.building_id,
      floor: currentResidency.floor,
      room_number: currentResidency.room_number,
      room_id: currentResidency.room_number,
      title: `Yêu cầu ${changeType.toLowerCase()}: ${changeReason.trim()}`,
      request_type: 'room_change',
      change_type: changeType,
      status: 'Chờ xử lý',
    }).select().single();
    setChangeSubmitting(false);
    if (err) { setChangeError('Gửi yêu cầu thất bại: ' + err.message); return; }

    const roomLabel = `${currentResidency.room_number}${currentResidency.buildings?.name ? ` (${currentResidency.buildings.name})` : ''}`;
    const { error: notifErr } = await supabase.from('notifications').insert({
      recipient_role: 'manager',
      type: 'issue',
      title: `Yêu cầu ${changeType.toLowerCase()}`,
      description: `${session.user.email} yêu cầu ${changeType.toLowerCase()} ${roomLabel}. Lý do: ${changeReason.trim()}`,
      issue_id: newIssue?.id ?? null,
      read: false,
    });
    if (notifErr) console.error('Lỗi tạo thông báo yêu cầu trả/chuyển phòng:', notifErr.message);

    setStep('success');
  };

  const t = isDarkMode
    ? { overlay: 'bg-black/70', card: 'bg-slate-800 border-slate-700 text-slate-100', label: 'text-slate-300', input: 'bg-slate-700 border-slate-600 text-slate-100', sub: 'text-slate-400', row: 'border-slate-700 hover:bg-slate-700/40', tabActive: 'border-[#004b87] text-[#004b87]', tabInactive: 'border-transparent text-slate-400' }
    : { overlay: 'bg-black/60', card: 'bg-white border-slate-200 text-slate-800', label: 'text-slate-600', input: 'bg-white border-slate-300 text-slate-800', sub: 'text-slate-500', row: 'border-slate-100 hover:bg-slate-50', tabActive: 'border-[#004b87] text-[#004b87]', tabInactive: 'border-transparent text-slate-400' };

  const vacantRooms = rooms
    .map(r => ({ ...r, occ: occupiedMap[r.id] || 0 }))
    .filter(r => r.occ < r.capacity);

  const manualResults = vacantRooms.filter(r =>
    (fBuilding === 'all' || r.building_id === fBuilding) &&
    (fGender === 'all' || r.gender === fGender) &&
    (fType === 'all' || r.type === fType)
  );

  const handleAISuggest = async () => {
    setAiLoading(true);
    setAiSuggestion(null);
    const roomsForAI = vacantRooms.map(r => ({ room_number: r.room_number, building: r.buildings?.name, capacity: r.capacity, occupied: r.occ, gender: r.gender, type: r.type, description: r.description || null }));
    const prompt = `
      Danh sách phòng còn trống:
      ${JSON.stringify(roomsForAI)}
      Tiêu chí sinh viên: ${aiCriteria}
      Dựa vào danh sách trên, hãy gợi ý MỘT phòng phù hợp nhất. Trả lời ngắn gọn tên phòng (đúng định dạng "Rxxx") và giải thích lý do ngắn gọn.
    `;
    const systemPrompt = "Bạn là AI quản lý KTX. Chỉ gợi ý phòng có capacity > occupied và đúng giới tính, loại phòng. Trường description (nếu có) là mô tả do chính sinh viên đang ở phòng đó tự viết (VD: \"dành cho người thích yên tĩnh\") — hãy ưu tiên đối chiếu nó với tiêu chí sinh viên đang tìm phòng khi có thể.";
    try {
      const response = await callGemini(prompt, systemPrompt);
      setAiSuggestion(response);
    } catch (error) {
      setAiSuggestion("Lỗi khi gọi AI. Vui lòng thử lại.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleRegister = async (room) => {
    setError('');
    setRegisteringId(room.id);

    // Kiểm tra sinh viên đã có chỗ ở đang active chưa
    const { data: existing } = await supabase.from('residencies').select('id').eq('student_id', session.user.id).eq('status', 'active').maybeSingle();
    if (existing) {
      setError('Bạn đã có phòng ở. Vui lòng liên hệ ban quản lý để chuyển/trả phòng trước khi đăng ký phòng ở mới.');
      setRegisteringId(null);
      return;
    }

    // Tìm 1 giường trống trong phòng này
    const { data: bedsInRoom } = await supabase.from('beds').select('id').eq('room_id', room.id);
    const { data: activeRes } = await supabase.from('residencies').select('bed_id').eq('status', 'active');
    const occupiedBedIds = new Set((activeRes || []).map(r => r.bed_id));
    const freeBed = (bedsInRoom || []).find(b => !occupiedBedIds.has(b.id));

    if (!freeBed) {
      setError('Rất tiếc, phòng này vừa hết giường trống. Vui lòng chọn phòng khác.');
      setRegisteringId(null);
      return;
    }

    const { error: err } = await supabase.from('residencies').insert({
      student_id: session.user.id, bed_id: freeBed.id, status: 'active',
    });
    setRegisteringId(null);
    if (err) { setError('Đăng ký thất bại: ' + err.message); return; }

    // Báo cho Ban quản lý KTX khi có sinh viên vừa được xếp vào phòng — dù chọn qua "AI gợi ý"
    // hay tự tìm/chọn thủ công đều tính là 1 sự kiện xếp phòng nên đều tạo thông báo (type: 'room').
    // Nếu bước tạo thông báo lỗi (VD: RLS chưa cấu hình đúng), không chặn luồng đăng ký ở của sinh viên.
    const roomLabel = `${room.room_number}${room.buildings?.name ? ` (${room.buildings.name})` : ''}`;
    const { error: notifErr } = await supabase.from('notifications').insert({
      recipient_role: 'manager',
      type: 'room',
      title: findMode === 'ai' ? 'AI Xếp phòng' : 'Đăng ký phòng ở mới',
      description: findMode === 'ai'
        ? `AI vừa gợi ý và ${session.user.email} đã đăng ký vào phòng ${roomLabel}.`
        : `${session.user.email} vừa đăng ký ở phòng ${roomLabel}.`,
      read: false,
    });
    if (notifErr) console.error('Lỗi tạo thông báo xếp phòng:', notifErr.message);

    setStep('success');
  };

  const handleBack = () => { onRegistered(); onClose(); };

  const RoomRow = ({ room }) => (
    <div className={`flex items-center justify-between px-4 py-3 border-b transition-colors duration-500 ${t.row}`}>
      <div>
        <p className="font-semibold text-[#004b87]">{room.room_number} <span className={`text-xs font-normal ml-1 transition-colors duration-500 ${t.sub}`}>({room.buildings?.name}, tầng {room.floor})</span></p>
        <p className={`text-xs transition-colors duration-500 ${t.sub}`}>{room.type} · {room.gender} · còn {room.capacity - room.occ}/{room.capacity} giường</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => { setSelectedRoom(room); setStep('detail'); }}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors duration-500 ${isDarkMode ? 'border-slate-600 text-slate-200 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
        >
          Chi tiết
        </button>
        <button
          onClick={() => handleRegister(room)}
          disabled={registering === room.id}
          className="bg-[#004b87] text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[#003a68] disabled:opacity-60 flex items-center gap-1.5"
        >
          {registering === room.id && <Loader2 size={12} className="animate-spin" />} Đăng ký
        </button>
      </div>
    </div>
  );

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors duration-500 ${t.overlay}`} onClick={step === 'browse' ? onClose : undefined}>
      {step === 'browse' && (
        <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-lg rounded-2xl border shadow-xl overflow-hidden max-h-[85vh] flex flex-col transition-colors duration-500 ${t.card}`}>
          <div className="p-5 pb-3">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-lg">Đăng ký phòng ở mới</h3>
              <button onClick={onClose} className={`p-1 rounded-full transition-colors duration-500 ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><X size={18} /></button>
            </div>
          </div>

          <div className="p-5 pt-0 overflow-y-auto flex-1">
            <div className="space-y-4">
              <div className={`flex gap-1 p-1 rounded-lg w-fit transition-colors duration-500 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                <button onClick={() => setFindMode('manual')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${findMode === 'manual' ? 'bg-[#004b87] text-white' : t.sub}`}>Tìm thủ công</button>
                <button onClick={() => setFindMode('ai')} className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 ${findMode === 'ai' ? 'bg-[#004b87] text-white' : t.sub}`}><Sparkles size={12} /> AI gợi ý</button>
                <button onClick={() => setFindMode('change')} className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 whitespace-nowrap ${findMode === 'change' ? 'bg-[#004b87] text-white' : t.sub}`}><RefreshCw size={12} /> Yêu cầu trả/chuyển phòng</button>
              </div>

              {findMode === 'change' ? (
                <>
                  {loadingResidency ? (
                    <div className="flex justify-center py-6"><Loader2 className="animate-spin text-[#004b87]" size={22} /></div>
                  ) : !currentResidency ? (
                    <p className={`text-sm text-center py-6 transition-colors duration-500 ${t.sub}`}>Bạn hiện không có phòng ở nên không thể gửi yêu cầu chuyển/trả phòng.</p>
                  ) : (
                    <>
                      <div className={`p-3 rounded-lg border text-sm transition-colors duration-500 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <p className={t.sub}>Phòng hiện tại</p>
                        <p className="font-semibold text-[#004b87]">{currentResidency.room_number} <span className={`text-xs font-normal ml-1 transition-colors duration-500 ${t.sub}`}>({currentResidency.buildings?.name}, tầng {currentResidency.floor})</span></p>
                      </div>

                      <div>
                        <p className={`text-xs font-medium mb-1.5 transition-colors duration-500 ${t.label}`}>Loại yêu cầu</p>
                        <div className={`flex gap-1 p-1 rounded-lg w-fit transition-colors duration-500 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                          <button type="button" onClick={() => setChangeType('Chuyển phòng')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${changeType === 'Chuyển phòng' ? 'bg-[#004b87] text-white' : t.sub}`}>Chuyển phòng</button>
                          <button type="button" onClick={() => setChangeType('Trả phòng')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${changeType === 'Trả phòng' ? 'bg-[#004b87] text-white' : t.sub}`}>Trả phòng</button>
                        </div>
                      </div>

                      <div>
                        <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${t.label}`}>Lý do {changeType === 'Trả phòng' ? 'trả phòng' : 'chuyển phòng'}</label>
                        <textarea
                          value={changeReason}
                          onChange={(e) => setChangeReason(e.target.value)}
                          rows={3}
                          placeholder="VD: Gia đình chuyển nơi ở, muốn đổi phòng gần bạn cùng lớp..."
                          className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-500 ${t.input}`}
                        />
                      </div>

                      {changeError && <p className="text-sm text-red-500">{changeError}</p>}

                      <button
                        onClick={handleSubmitChangeRequest}
                        disabled={changeSubmitting}
                        className="w-full bg-[#004b87] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#003a68] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                      >
                        {changeSubmitting && <Loader2 size={16} className="animate-spin" />} Gửi yêu cầu
                      </button>
                    </>
                  )}
                </>
              ) : findMode === 'manual' ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <select value={fBuilding} onChange={(e) => setFBuilding(e.target.value)} className={`text-xs rounded-lg border px-2 py-2 transition-colors duration-500 ${t.input}`}>
                      <option value="all">Tất cả tòa</option>
                      {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <select value={fGender} onChange={(e) => setFGender(e.target.value)} className={`text-xs rounded-lg border px-2 py-2 transition-colors duration-500 ${t.input}`}>
                      <option value="all">Giới tính</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                    <select value={fType} onChange={(e) => setFType(e.target.value)} className={`text-xs rounded-lg border px-2 py-2 transition-colors duration-500 ${t.input}`}>
                      <option value="all">Loại phòng</option>
                      <option value="Phòng tiêu chuẩn">Tiêu chuẩn</option>
                      <option value="Phòng cao cấp">Cao cấp</option>
                    </select>
                  </div>
                  <div className={`rounded-lg border overflow-hidden transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    {manualResults.length === 0 ? (
                      <p className={`text-sm text-center py-6 transition-colors duration-500 ${t.sub}`}>Không tìm thấy phòng phù hợp.</p>
                    ) : manualResults.map(r => <RoomRow key={r.id} room={r} />)}
                  </div>
                </>
              ) : (
                <>
                  <textarea value={aiCriteria} onChange={(e) => setAiCriteria(e.target.value)} rows={3} className={`w-full rounded-lg border px-3 py-2 text-sm italic transition-colors duration-500 ${t.input}`} />
                  <button onClick={handleAISuggest} disabled={aiLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                    {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
                    {aiLoading ? "Đang phân tích..." : "Phân tích & Gợi ý phòng"}
                  </button>
                  {aiSuggestion && (
                    <div className={`p-3 rounded-lg border text-sm whitespace-pre-wrap leading-relaxed transition-colors duration-500 ${isDarkMode ? 'bg-slate-900 border-indigo-900 text-slate-300' : 'bg-indigo-50 border-indigo-100 text-slate-700'}`}>
                      {aiSuggestion}
                    </div>
                  )}
                  {aiSuggestion && (() => {
                    const match = vacantRooms.find(r => aiSuggestion.includes(r.room_number));
                    return match ? (
                      <div className={`rounded-lg border overflow-hidden transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                        <RoomRow room={match} />
                      </div>
                    ) : null;
                  })()}
                </>
              )}
            </div>

            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
          </div>
        </div>
      )}

      {step === 'detail' && selectedRoom && (
        <RoomDetailPanel
          room={selectedRoom}
          theme={t}
          isDarkMode={isDarkMode}
          registering={registering === selectedRoom.id}
          error={error}
          onBack={() => { setError(''); setStep('browse'); setSelectedRoom(null); }}
          onClose={onClose}
          onRegister={() => handleRegister(selectedRoom)}
        />
      )}

      {step === 'success' && (
        <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-sm rounded-2xl border shadow-xl p-6 text-center transition-colors duration-500 ${t.card}`}>
          <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} />
          </div>
          <p className="text-sm leading-relaxed mb-6">
            {findMode === 'change'
              ? `Yêu cầu ${changeType.toLowerCase()} đã được gửi đến Ban quản lý KTX. Vui lòng chờ xử lý.`
              : 'Đăng ký chỗ ở thành công! Bạn có thể xem thông tin phòng của mình bất kỳ lúc nào.'}
          </p>
          <button onClick={handleBack} className="w-full bg-[#004b87] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#003a68] transition">Quay lại</button>
        </div>
      )}
    </div>
  );
}

// Trang chi tiết 1 phòng — mở khi bấm "Chi tiết" trên RoomRow.
// "Mô tả phòng" đọc từ cột rooms.description do chính sinh viên đang ở phòng đó tự viết
// (VD: "dành cho người thích yên tĩnh"), dùng để sinh viên khác tham khảo và AI xếp phòng
// đối chiếu tiêu chí chính xác hơn (xem handleAISuggest ở trên).
function RoomDetailPanel({ room, theme: t, isDarkMode, registering, error, onBack, onClose, onRegister }) {
  const freeBeds = room.capacity - room.occ;
  const isFull = freeBeds <= 0;

  return (
    <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-lg rounded-2xl border shadow-xl overflow-hidden max-h-[85vh] flex flex-col transition-colors duration-500 ${t.card}`}>
      <div className="p-5 pb-4">
        <div className="flex justify-between items-center mb-2">
          <button onClick={onBack} className={`text-xs font-medium hover:underline transition-colors duration-500 ${t.sub}`}>← Quay lại</button>
          <button onClick={onClose} className={`p-1 rounded-full transition-colors duration-500 ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><X size={18} /></button>
        </div>

        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-2xl text-[#004b87]">{room.room_number}</h3>
            <p className={`text-sm mt-0.5 transition-colors duration-500 ${t.sub}`}>{room.type} · {room.gender}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <p className={`text-sm font-medium transition-colors duration-500 ${t.sub}`}>Trạng thái</p>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors duration-500 ${
              isFull
                ? (isDarkMode ? 'bg-red-900/40 text-red-300 border-red-800' : 'bg-red-100 text-red-700 border-red-200')
                : (isDarkMode ? 'bg-green-900/40 text-green-300 border-green-800' : 'bg-green-100 text-green-700 border-green-200')
            }`}>
              {isFull ? 'Hết chỗ' : 'Còn trống'}
            </span>
          </div>
        </div>
      </div>

      <div className={`border-t transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`} />

      <div className="p-5 space-y-4 overflow-y-auto flex-1">
        <div>
          <p className={`text-xs font-medium mb-1 transition-colors duration-500 ${t.sub}`}>Vị trí</p>
          <p className={`text-sm transition-colors duration-500 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{room.buildings?.name}, tầng {room.floor}</p>
        </div>

        <div>
          <p className={`text-xs font-medium mb-1 transition-colors duration-500 ${t.sub}`}>Mô tả phòng</p>
          {room.description ? (
            <p className={`text-sm leading-relaxed whitespace-pre-wrap transition-colors duration-500 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{room.description}</p>
          ) : (
            <p className={`text-sm italic transition-colors duration-500 ${t.sub}`}>
              Chưa có mô tả. Sinh viên đang ở phòng này có thể bổ sung mô tả (VD: "dành cho người thích yên tĩnh") để giúp bạn cùng phòng tương lai và AI xếp phòng chính xác hơn.
            </p>
          )}
        </div>

        <div>
          <p className={`text-xs font-medium mb-1 transition-colors duration-500 ${t.sub}`}>Số giường trống</p>
          <p className={`text-sm font-semibold transition-colors duration-500 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{freeBeds}/{room.capacity}</p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      <div className={`p-5 pt-4 border-t flex justify-end transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
        <button
          onClick={onRegister}
          disabled={registering || isFull}
          className="bg-[#004b87] text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-[#003a68] disabled:opacity-60 flex items-center gap-2"
        >
          {registering && <Loader2 size={14} className="animate-spin" />}
          {isFull ? 'Đã hết chỗ' : 'Đăng ký'}
        </button>
      </div>
    </div>
  );
}

function AddRoomModal({ isDarkMode, buildings, onClose, onCreated }) {
  const [buildingId, setBuildingId] = useState(buildings[0]?.id || '');
  const [floor, setFloor] = useState(1);
  const [roomNumber, setRoomNumber] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [gender, setGender] = useState('Nam');
  const [type, setType] = useState('Phòng tiêu chuẩn');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const t = isDarkMode
    ? { overlay: 'bg-slate-900/80', card: 'bg-slate-800 border-slate-700 text-slate-100', label: 'text-slate-300', input: 'bg-slate-700 border-slate-600 text-slate-100' }
    : { overlay: 'bg-black/50', card: 'bg-white border-slate-200 text-slate-800', label: 'text-slate-600', input: 'bg-white border-slate-300 text-slate-800' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!buildingId || !roomNumber.trim()) { setError('Vui lòng chọn tòa và nhập số phòng.'); return; }
    setSubmitting(true);
    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .insert({ building_id: buildingId, floor: Number(floor), room_number: roomNumber.trim(), capacity: Number(capacity), gender, type })
      .select()
      .single();
    if (roomErr) { setSubmitting(false); setError('Tạo phòng thất bại: ' + roomErr.message); return; }

    const bedsToInsert = Array.from({ length: Number(capacity) }, (_, i) => ({ room_id: room.id, bed_number: i + 1 }));
    const { error: bedsErr } = await supabase.from('beds').insert(bedsToInsert);
    setSubmitting(false);
    if (bedsErr) { setError('Tạo giường thất bại: ' + bedsErr.message); return; }

    onCreated();
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors duration-500 ${t.overlay}`} onClick={onClose}>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className={`w-full max-w-sm rounded-2xl border shadow-xl p-6 space-y-3 transition-colors duration-500 ${t.card}`}>
        <h3 className="font-bold text-lg mb-1">Thêm phòng mới</h3>

        <div>
          <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${t.label}`}>Tòa nhà</label>
          <select value={buildingId} onChange={(e) => setBuildingId(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-500 ${t.input}`}>
            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${t.label}`}>Tầng</label>
            <input type="number" min={1} value={floor} onChange={(e) => setFloor(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-500 ${t.input}`} />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${t.label}`}>Số phòng</label>
            <input type="text" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="R401" className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-500 ${t.input}`} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${t.label}`}>Số giường</label>
            <input type="number" min={1} max={12} value={capacity} onChange={(e) => setCapacity(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-500 ${t.input}`} />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${t.label}`}>Giới tính</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-500 ${t.input}`}>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>
          </div>
        </div>

        <div>
          <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${t.label}`}>Loại phòng</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-500 ${t.input}`}>
            <option value="Phòng tiêu chuẩn">Phòng tiêu chuẩn</option>
            <option value="Phòng cao cấp">Phòng cao cấp</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-500 ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>Hủy</button>
          <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-medium bg-[#004b87] text-white hover:bg-[#003a68] disabled:opacity-60 flex items-center gap-2">
            {submitting && <Loader2 size={16} className="animate-spin" />} Tạo phòng
          </button>
        </div>
      </form>
    </div>
  );
}

function IssuesView({ isDarkMode, role, session, subTab: subTabProp, onSubTabChange }) {
  // subTab có thể được điều khiển từ App (khi click vào 1 thông báo cần nhảy thẳng tới đúng tab con
  // "Phản ánh & Sự cố" hay "Vi phạm nội quy"), hoặc tự quản lý nội bộ như trước nếu App không truyền prop.
  const [internalSubTab, setInternalSubTab] = useState('issues'); // 'issues' | 'violations'
  const subTab = subTabProp ?? internalSubTab;
  const setSubTab = (value) => {
    setInternalSubTab(value);
    if (onSubTabChange) onSubTabChange(value);
  };
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiSummaryAt, setAiSummaryAt] = useState(null);
  const [aiError, setAiError] = useState(false);

  const [issues, setIssues] = useState([]);
  const [violations, setViolations] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNewIssueOpen, setIsNewIssueOpen] = useState(false);
  const [isNewViolationOpen, setIsNewViolationOpen] = useState(false);
  const [isNewViolationReportOpen, setIsNewViolationReportOpen] = useState(false);

  const isStudent = role === 'student';

  const t = isDarkMode
    ? { title: 'text-slate-100', sub: 'text-slate-400', card: 'bg-slate-800 border-slate-700', theadBg: 'bg-slate-900 text-slate-400 border-slate-700', divide: 'divide-slate-700', hover: 'hover:bg-slate-700/50', cell: 'text-slate-200', mono: 'text-slate-500' }
    : { title: 'text-slate-800', sub: 'text-slate-500', card: 'bg-white border-slate-200', theadBg: 'bg-slate-50 text-slate-600 border-slate-200', divide: 'divide-slate-100', hover: 'hover:bg-slate-50', cell: 'text-slate-800', mono: 'text-slate-500' };

  const loadData = async () => {
    setLoading(true);
    const [{ data: is }, { data: vi }, { data: st }] = await Promise.all([
      supabase.from('issues').select('*, buildings(name), profiles(full_name)').order('created_at', { ascending: false }),
      supabase.from('violations').select('*, profiles(full_name)').order('date', { ascending: false }),
      (role === 'manager' || role === 'accountant') ? supabase.from('profiles').select('id, full_name').eq('role', 'student') : Promise.resolve({ data: [] }),
    ]);
    setIssues(is || []);
    setViolations(vi || []);
    setStudents(st || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [role]);

  const updateIssueStatus = async (id, status) => {
    // Lấy lại phản ánh liên quan TỪ state hiện có (đã tải sẵn) để biết student_id + nội dung,
    // dùng cho việc tạo thông báo — không cần gọi thêm 1 lượt SELECT tới Supabase.
    const target = issues.find(i => i.id === id);
    const isRoomChange = target?.request_type === 'room_change';

    // QUAN TRỌNG: với yêu cầu trả/chuyển phòng, phải kết thúc residency (bảng "residencies")
    // TRƯỚC khi đánh dấu issue là "Đã xử lý", và phải kiểm tra CHẮC CHẮN có dòng nào thực sự
    // bị cập nhật hay không (bằng .select() sau update) — không chỉ dựa vào việc không có `error`.
    // Lý do: nếu RLS (Row Level Security) của Supabase chặn quyền UPDATE của vai trò quản lý trên
    // bảng "residencies", Supabase KHÔNG trả về lỗi mà chỉ âm thầm trả về 0 dòng bị ảnh hưởng.
    // Trước đây bước này chạy SAU khi issues.status đã là "Đã xử lý" và lỗi chỉ log ra console,
    // nên giao diện vẫn hiển thị yêu cầu "đã xử lý" trong khi sinh viên vẫn còn active trong phòng
    // => phòng vẫn bị tính có người, không trống. Đây là nguyên nhân của bug đã báo.
    if (isRoomChange && status === 'Đã xử lý' && target?.student_id) {
      const { data: endedRows, error: resErr } = await supabase
        .from('residencies')
        .update({ status: 'ended' })
        .eq('student_id', target.student_id)
        .eq('status', 'active')
        .select('id');

      if (resErr) {
        console.error('Lỗi cập nhật chỗ ở của sinh viên:', resErr.message);
        alert(
          'Không thể loại sinh viên khỏi phòng (lỗi khi cập nhật bảng "residencies"). ' +
          'Yêu cầu KHÔNG được đánh dấu "Đã xử lý" để tránh sai lệch dữ liệu.\n\n' +
          'Nguyên nhân thường gặp: chính sách RLS (Row Level Security) trên bảng "residencies" ' +
          'chưa cho phép vai trò quản lý (manager) UPDATE dòng của sinh viên khác. ' +
          'Vui lòng kiểm tra/bổ sung policy UPDATE cho role manager trong Supabase.\n\nChi tiết lỗi: ' + resErr.message
        );
        return; // dừng lại — KHÔNG update issues.status, KHÔNG gửi thông báo
      }
      if (!endedRows || endedRows.length === 0) {
        // Không có lỗi, nhưng cũng không có dòng "active" nào bị sửa. Hai khả năng:
        // (1) RLS chặn ngầm (update "thành công" nhưng ảnh hưởng 0 dòng — không phân biệt được
        //     với trường hợp (2) chỉ từ phía client), hoặc
        // (2) sinh viên này thực sự không còn residency active nào (đã bị xử lý từ trước).
        // Để an toàn dữ liệu, vẫn CHẶN việc đánh dấu "Đã xử lý" và báo rõ cho quản lý tự kiểm tra,
        // thay vì mặc định coi là thành công.
        console.warn('Không tìm thấy/không thể cập nhật residency active của sinh viên:', target.student_id);
        alert(
          'Không tìm thấy chỗ ở đang hoạt động (active) của sinh viên này để kết thúc, ' +
          'hoặc thao tác cập nhật bị chặn bởi quyền truy cập (RLS). ' +
          'Yêu cầu KHÔNG được đánh dấu "Đã xử lý". Vui lòng kiểm tra lại dữ liệu "residencies" ' +
          'và quyền UPDATE của vai trò quản lý trước khi thử lại.'
        );
        return;
      }
    }

    const { error } = await supabase.from('issues').update({ status }).eq('id', id);
    if (error) {
      console.error('Lỗi cập nhật trạng thái phản ánh:', error.message);
      return;
    }

    // Theo yêu cầu: khi chuyển sang "Đang giải quyết" hoặc "Đã xử lý", báo cho đúng sinh viên
    // đã gửi phản ánh đó (recipient_id = student_id), với nội dung cố định theo trạng thái.
    // Chuyển về "Chờ xử lý" (nếu quản lý bấm lùi trạng thái) không được yêu cầu nên KHÔNG tạo thông báo.
    if (target?.student_id && (status === 'Đang giải quyết' || status === 'Đã xử lý')) {
      const description = isRoomChange
        ? (status === 'Đã xử lý'
            ? `Yêu cầu ${(target.change_type || 'trả/chuyển phòng').toLowerCase()} của bạn đã được xử lý. Bạn hiện không còn ở phòng nào, vui lòng đăng ký phòng mới nếu có nhu cầu.`
            : `Yêu cầu ${(target.change_type || 'trả/chuyển phòng').toLowerCase()} của bạn đang được xem xét.`)
        : (status === 'Đang giải quyết'
            ? 'Sự cố của bạn đang được giải quyết.'
            : 'Sự cố của bạn đã được xử lý.');
      const { error: notifErr } = await supabase.from('notifications').insert({
        recipient_id: target.student_id,
        type: 'issue',
        title: `Cập nhật phản ánh: ${target.title}`,
        description,
        issue_id: id,
        read: false,
      });
      if (notifErr) console.error('Lỗi tạo thông báo cho sinh viên:', notifErr.message);
    }

    loadData();
  };

  // Xử lý riêng cho request_type = 'access_request' (Xác nhận / Từ chối), tách khỏi updateIssueStatus
  // vì luồng hoàn toàn khác: không có trạng thái trung gian, và "Xác nhận" phải NÂNG ROLE sinh viên
  // đó thành ĐÚNG vai trò đã xin — issue.change_type là 'manager' hoặc 'accountant' (xem
  // AccessRequestModal). Các yêu cầu cũ tạo từ trước khi có lựa chọn này sẽ không có change_type,
  // nên mặc định về 'manager' để giữ hành vi cũ. Thao tác đổi quyền cần kiểm tra chắc chắn thành
  // công (không chỉ dựa vào việc không có `error`) giống hệt cách đã làm với bảng "residencies" ở
  // trên, vì lý do y hệt: RLS chặn ngầm sẽ không trả lỗi mà chỉ âm thầm ảnh hưởng 0 dòng.
  // GHI CHÚ: đổi giao diện chỉ áp dụng khi sinh viên F5/đăng nhập lại (không dùng Supabase Realtime
  // để đẩy thay đổi role tức thời) — đây là lựa chọn đã chốt, không phải giới hạn kỹ thuật.
  const handleAccessDecision = async (issue, decision) => {
    const newStatus = decision === 'approve' ? 'Xác nhận' : 'Từ chối';
    const grantedRole = issue.change_type === 'accountant' ? 'accountant' : 'manager';
    const grantedLabel = ACCESS_ROLE_LABEL[grantedRole];

    if (decision === 'approve') {
      const { data: updatedProfiles, error: profErr } = await supabase
        .from('profiles')
        .update({ role: grantedRole })
        .eq('id', issue.student_id)
        .select('id');

      if (profErr) {
        console.error('Lỗi nâng quyền sinh viên:', profErr.message);
        alert(
          `Không thể cấp quyền ${grantedLabel} cho tài khoản này (lỗi khi cập nhật bảng "profiles"). ` +
          'Yêu cầu KHÔNG được đánh dấu "Xác nhận".\n\n' +
          'Nguyên nhân thường gặp: chính sách RLS trên bảng "profiles" chưa cho phép vai trò quản lý ' +
          '(manager) UPDATE cột role của tài khoản khác. Vui lòng kiểm tra/bổ sung policy UPDATE phù hợp ' +
          'trong Supabase.\n\nChi tiết lỗi: ' + profErr.message
        );
        return;
      }
      if (!updatedProfiles || updatedProfiles.length === 0) {
        console.warn('Không có dòng profile nào được cập nhật cho:', issue.student_id);
        alert(
          'Không tìm thấy tài khoản sinh viên này để nâng quyền, hoặc thao tác bị chặn bởi quyền truy cập (RLS). ' +
          'Yêu cầu KHÔNG được đánh dấu "Xác nhận". Vui lòng kiểm tra lại trước khi thử lại.'
        );
        return;
      }
    }

    const { error } = await supabase.from('issues').update({ status: newStatus }).eq('id', issue.id);
    if (error) {
      console.error('Lỗi cập nhật trạng thái yêu cầu quyền truy cập:', error.message);
      alert(
        (decision === 'approve'
          ? `Đã cấp quyền ${grantedLabel} cho tài khoản này, NHƯNG không thể đánh dấu yêu cầu là "Xác nhận" ` +
            '(lỗi khi cập nhật bảng "issues"). '
          : 'Không thể đánh dấu yêu cầu là "Từ chối" (lỗi khi cập nhật bảng "issues"). '
        ) +
        'Nguyên nhân thường gặp: cột "status" của bảng "issues" đang có CHECK constraint chỉ cho phép ' +
        'một số giá trị cố định (VD: "Chờ xử lý", "Đang giải quyết", "Đã xử lý"), chưa cho phép giá trị ' +
        '"Xác nhận"/"Từ chối". Cần cập nhật lại CHECK constraint đó trong Supabase.\n\nChi tiết lỗi: ' + error.message
      );
      return;
    }

    const description = decision === 'approve'
      ? `Yêu cầu quyền truy cập đặc biệt của bạn đã được xác nhận. Tài khoản của bạn hiện đã có quyền ${grantedLabel} — vui lòng tải lại trang (F5) hoặc đăng nhập lại để cập nhật giao diện.`
      : 'Yêu cầu quyền truy cập đặc biệt của bạn đã bị từ chối.';
    const { error: notifErr } = await supabase.from('notifications').insert({
      recipient_id: issue.student_id,
      type: 'issue',
      title: 'Cập nhật yêu cầu quyền truy cập đặc biệt',
      description,
      issue_id: issue.id,
      read: false,
    });
    if (notifErr) console.error('Lỗi tạo thông báo cho sinh viên:', notifErr.message);

    loadData();
  };

  const handleSummarize = async () => {
    setAiLoading(true);
    setAiSummary(null);
    setAiError(false);
    const prompt = `
      Danh sách phản ánh của sinh viên:
      ${JSON.stringify(issues.map(i => ({ location: locationLabel(i), noi_dung: i.title, status: i.status })))}
      Hãy tóm tắt ngắn gọn các vấn đề này theo nhóm (VD: Cơ sở vật chất, Điện nước, An ninh/Trật tự). Báo cáo những vấn đề nào đang cấp bách.
    `;
    const systemPrompt = "Bạn là AI hỗ trợ Ban quản lý KTX. Hãy phân tích và tóm tắt danh sách sự cố một cách chuyên nghiệp, giúp BQL nắm bắt tình hình nhanh chóng.";
    try {
      const response = await callGemini(prompt, systemPrompt);
      setAiSummary(response);
      setAiSummaryAt(new Date().toISOString());
    } catch (error) {
      setAiSummary("Không thể tạo báo cáo. Vui lòng kiểm tra kết nối và thử lại.");
      setAiError(true);
      setAiSummaryAt(new Date().toISOString());
    } finally {
      setAiLoading(false);
    }
  };

  // Nhận cả object `v` (không chỉ id) vì cần student_id + title để gửi thông báo cho đúng người.
  // student_id ở đây có thể là NGƯỜI VI PHẠM (nếu quản lý tự ghi nhận qua NewViolationModal) hoặc
  // NGƯỜI PHẢN ÁNH (nếu sinh viên tự phản ánh người khác qua NewViolationReportModal) — cả 2 trường
  // hợp đều đúng là "người cần biết cập nhật này", nên dùng chung 1 chỗ gửi thông báo.
  const updateViolationStatus = async (v, status) => {
    setViolations(prev => prev.map(item => (item.id === v.id ? { ...item, status } : item)));
    const { error } = await supabase.from('violations').update({ status }).eq('id', v.id);
    if (error) { console.error('Lỗi cập nhật trạng thái vi phạm:', error.message); return; }

    const statusText = status === 'Đã xử lý' ? 'đã được xử lý' : status === 'Đang xử lý' ? 'đang được xử lý' : 'đã cập nhật trạng thái';
    const { error: notifErr } = await supabase.from('notifications').insert({
      recipient_id: v.student_id,
      type: 'violation',
      title: `Cập nhật vi phạm: ${v.title}`,
      description: `Phản ánh/vi phạm "${v.title}" ${statusText}.`,
      read: false,
    });
    if (notifErr) console.error('Lỗi tạo thông báo cập nhật vi phạm:', notifErr.message);
  };

  const statusBadge = (status) => (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-colors duration-500 ${
      isDarkMode
        ? (status === 'Chờ xử lý' || status === 'Chưa xử lý' ? 'bg-orange-900/30 text-orange-300 border-orange-800' :
           status === 'Đang giải quyết' || status === 'Đang xử lý' ? 'bg-blue-900/30 text-blue-300 border-blue-800' :
           status === 'Từ chối' ? 'bg-red-900/30 text-red-300 border-red-800' :
           'bg-green-900/30 text-green-300 border-green-800')
        : (status === 'Chờ xử lý' || status === 'Chưa xử lý' ? 'bg-orange-50 text-orange-700 border-orange-200' :
           status === 'Đang giải quyết' || status === 'Đang xử lý' ? 'bg-blue-50 text-blue-700 border-blue-200' :
           status === 'Từ chối' ? 'bg-red-50 text-red-700 border-red-200' :
           'bg-green-50 text-green-700 border-green-200')
    }`}>{status}</span>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className={`text-2xl font-bold transition-colors duration-500 ${t.title}`}>{isStudent ? 'Báo cáo sự cố' : 'Quản lý Phản ánh & Vi phạm nội quy'}</h1>
          <p className={`text-sm mt-1 transition-colors duration-500 ${t.sub}`}>
            {isStudent ? 'Gửi và theo dõi các phản ánh sự cố, vi phạm nội quy bạn đã báo cáo cho Ban quản lý KTX.' : 'Theo dõi, xử lý và dùng AI tóm tắt các vấn đề sinh viên báo cáo.'}
          </p>
        </div>
        <div className="flex gap-2">
          {isStudent && (
            <button onClick={() => setIsNewIssueOpen(true)} className="bg-[#004b87] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#003a68] transition shadow-sm flex items-center gap-2">
              <Plus size={16} /> Báo cáo sự cố
            </button>
          )}
          {isStudent && (
            <button onClick={() => setIsNewViolationReportOpen(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition shadow-sm flex items-center gap-2">
              <AlertCircle size={16} /> Phản ánh vi phạm
            </button>
          )}
          {!isStudent && subTab === 'issues' && (
            <button onClick={handleSummarize} disabled={aiLoading} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition shadow-sm flex items-center gap-2 disabled:opacity-70">
              {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {aiLoading ? "Đang tổng hợp..." : "AI Tóm tắt báo cáo"}
            </button>
          )}
          {!isStudent && subTab === 'violations' && (role === 'manager' || role === 'accountant') && (
            <button onClick={() => setIsNewViolationOpen(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition shadow-sm flex items-center gap-2">
              <Plus size={16} /> Ghi nhận vi phạm
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs: chỉ hiện cho Quản lý/Kế toán, sinh viên chỉ có 1 màn "Báo cáo sự cố" */}
      {!isStudent && (
        <div className={`flex gap-1 border-b transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <button onClick={() => setSubTab('issues')} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors duration-500 ${subTab === 'issues' ? 'border-[#004b87] text-[#004b87]' : `border-transparent ${t.sub}`}`}>
            Phản ánh & Sự cố
          </button>
          <button onClick={() => setSubTab('violations')} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors duration-500 ${subTab === 'violations' ? 'border-[#004b87] text-[#004b87]' : `border-transparent ${t.sub}`}`}>
            Vi phạm nội quy
          </button>
        </div>
      )}

      {/* Hallmark · component-scope redesign: card báo cáo AI. Trước đây dùng màu tím rời rạc
       * (bg-purple-50/text-purple-900) không nằm trong design.md, và render nội dung markdown
       * thô (dấu ** hiện trực tiếp). Bản mới: border-left accent #004b87/blue-400 — cùng ngôn ngữ
       * thị giác với StatCard/ChatbotView AI-card — kèm header có icon badge, timestamp, nút đóng,
       * và formatAiReport() dịch cú pháp in đậm, tiêu đề, gạch đầu dòng thành markup thật thay vì hiện thô.
       */}
      {aiSummary && !isStudent && subTab === 'issues' && (
        <div
          className={`rounded-lg pl-4 pr-4 py-4 border-l-4 border-y border-r shadow-sm animate-in fade-in slide-in-from-top-4 transition-colors duration-500 ${
            aiError
              ? (isDarkMode ? 'border-l-red-400 bg-slate-800 border-y-slate-700 border-r-slate-700' : 'border-l-red-500 bg-white border-y-slate-200 border-r-slate-200')
              : (isDarkMode ? 'border-l-blue-400 bg-slate-800 border-y-slate-700 border-r-slate-700' : 'border-l-[#004b87] bg-white border-y-slate-200 border-r-slate-200')
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-500 ${
                aiError
                  ? (isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600')
                  : (isDarkMode ? 'bg-blue-400/10 text-blue-300' : 'bg-blue-50 text-[#004b87]')
              }`}>
                <Bot size={16} />
              </span>
              <div>
                <h3
                  style={{ fontFamily: 'var(--font-display), sans-serif' }}
                  className={`font-bold text-sm tracking-tight transition-colors duration-500 ${t.title}`}
                >
                  Báo cáo Tổng hợp từ Trợ lý AI
                </h3>
                {aiSummaryAt && (
                  <p className={`text-xs mt-0.5 transition-colors duration-500 ${t.sub}`}>{timeAgo(aiSummaryAt)}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {aiError && (
                <button
                  onClick={handleSummarize}
                  className={`text-xs font-medium px-2.5 py-1.5 rounded-md border flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${isDarkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <RefreshCw size={12} /> Thử lại
                </button>
              )}
              <button
                onClick={() => { setAiSummary(null); setAiSummaryAt(null); setAiError(false); }}
                aria-label="Đóng báo cáo"
                title="Đóng"
                className={`p-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-400'}`}
              >
                <X size={15} />
              </button>
            </div>
          </div>
          <div
            className={`text-sm leading-relaxed transition-colors duration-500 ${t.cell} [&_.ai-report-h4]:font-bold [&_.ai-report-h4]:text-[13px] [&_.ai-report-h4]:uppercase [&_.ai-report-h4]:tracking-wide [&_.ai-report-h4]:mt-3 [&_.ai-report-h4]:mb-1.5 [&_.ai-report-hr]:my-3 [&_.ai-report-hr]:border-t ${isDarkMode ? '[&_.ai-report-hr]:border-slate-700 [&_.ai-report-h4]:text-blue-300' : '[&_.ai-report-hr]:border-slate-200 [&_.ai-report-h4]:text-[#004b87]'} [&_.ai-report-list]:list-disc [&_.ai-report-list]:pl-5 [&_.ai-report-list]:space-y-1 [&_.ai-report-list]:my-1.5 [&_.ai-report-p]:my-1.5 [&_.ai-report-gap]:h-1 [&_strong]:font-semibold [&_em]:not-italic [&_em]:font-medium ${isDarkMode ? '[&_em]:text-slate-300' : '[&_em]:text-slate-600'}`}
            dangerouslySetInnerHTML={{ __html: formatAiReport(aiSummary) }}
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#004b87]" size={24} /></div>
      ) : (isStudent || subTab === 'issues') ? (
        <div className={`rounded-xl shadow-sm border overflow-hidden transition-colors duration-500 ${t.card}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className={`font-medium border-b transition-colors duration-500 ${t.theadBg}`}>
                <tr>
                  {!isStudent && <th className="py-3 px-4">Sinh viên</th>}
                  <th className="py-3 px-4">Nội dung phản ánh</th>
                  <th className="py-3 px-4">Địa điểm</th>
                  <th className="py-3 px-4">Ngày báo</th>
                  <th className="py-3 px-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody className={`divide-y transition-colors duration-500 ${t.divide}`}>
                {issues.length === 0 && (
                  <tr><td colSpan={isStudent ? 4 : 5} className={`py-6 text-center text-sm transition-colors duration-500 ${t.sub}`}>
                    {isStudent ? 'Bạn chưa gửi phản ánh nào.' : 'Chưa có phản ánh nào.'}
                  </td></tr>
                )}
                {issues.map(issue => (
                  <tr key={issue.id} className={t.hover}>
                    {!isStudent && <td className={`py-3 px-4 font-medium transition-colors duration-500 ${t.cell}`}>{issue.profiles?.full_name || '—'}</td>}
                    <td className={`py-3 px-4 max-w-xs truncate transition-colors duration-500 ${t.cell}`}>
                      {issue.request_type === 'room_change' && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mr-1.5 align-middle transition-colors duration-500 ${isDarkMode ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                          {issue.change_type || 'Trả/chuyển phòng'}
                        </span>
                      )}
                      {issue.request_type === 'access_request' && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mr-1.5 align-middle transition-colors duration-500 ${
                          issue.change_type === 'accountant'
                            ? (isDarkMode ? 'bg-teal-900/40 text-teal-300' : 'bg-teal-100 text-teal-700')
                            : (isDarkMode ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-100 text-purple-700')
                        }`}>
                          Xin quyền {ACCESS_ROLE_LABEL[issue.change_type === 'accountant' ? 'accountant' : 'manager']}
                        </span>
                      )}
                      {issue.title}
                    </td>
                    <td className={`py-3 px-4 transition-colors duration-500 ${t.sub}`}>{locationLabel(issue)}</td>
                    <td className={`py-3 px-4 transition-colors duration-500 ${t.sub}`}>{new Date(issue.created_at).toLocaleDateString('vi-VN')}</td>
                    <td className="py-3 px-4">
                      {issue.request_type === 'access_request' ? (
                        role === 'manager' ? (
                          issue.status === 'Chờ xử lý' ? (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleAccessDecision(issue, 'approve')}
                                className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors duration-500 ${isDarkMode ? 'bg-green-900/30 text-green-300 border-green-800 hover:bg-green-900/50' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}
                              >
                                Xác nhận
                              </button>
                              <button
                                onClick={() => handleAccessDecision(issue, 'reject')}
                                className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors duration-500 ${isDarkMode ? 'bg-red-900/30 text-red-300 border-red-800 hover:bg-red-900/50' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : statusBadge(issue.status)
                        ) : statusBadge(issue.status)
                      ) : role === 'manager' ? (
                        <select
                          value={issue.status}
                          onChange={(e) => updateIssueStatus(issue.id, e.target.value)}
                          className={`text-xs rounded-full border px-2 py-1 outline-none transition-colors duration-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-300'}`}
                        >
                          <option value="Chờ xử lý">Chờ xử lý</option>
                          {issue.request_type !== 'room_change' && <option value="Đang giải quyết">Đang giải quyết</option>}
                          <option value="Đã xử lý">Đã xử lý</option>
                        </select>
                      ) : statusBadge(issue.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className={`rounded-xl shadow-sm border overflow-hidden transition-colors duration-500 ${t.card}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className={`font-medium border-b transition-colors duration-500 ${t.theadBg}`}>
                <tr>
                  <th className="py-3 px-4">Sinh viên</th>
                  <th className="py-3 px-4">Nội dung vi phạm</th>
                  <th className="py-3 px-4">Mức độ</th>
                  <th className="py-3 px-4">Ngày</th>
                  <th className="py-3 px-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody className={`divide-y transition-colors duration-500 ${t.divide}`}>
                {violations.length === 0 && (
                  <tr><td colSpan={5} className={`py-6 text-center text-sm transition-colors duration-500 ${t.sub}`}>Chưa có vi phạm nào được ghi nhận.</td></tr>
                )}
                {violations.map(v => (
                  <tr key={v.id} className={t.hover}>
                    <td className={`py-3 px-4 font-medium transition-colors duration-500 ${t.cell}`}>{v.profiles?.full_name || '—'}</td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className={`font-medium truncate transition-colors duration-500 ${t.cell}`}>{v.title}</p>
                      <p className={`text-xs truncate transition-colors duration-500 ${t.sub}`}>{v.description}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium transition-colors duration-500 ${
                        v.severity === 'Nghiêm trọng' ? (isDarkMode ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-700') :
                        v.severity === 'Trung bình' ? (isDarkMode ? 'bg-orange-900/40 text-orange-300' : 'bg-orange-100 text-orange-700') :
                        (isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')
                      }`}>{v.severity}</span>
                    </td>
                    <td className={`py-3 px-4 transition-colors duration-500 ${t.sub}`}>{new Date(v.date).toLocaleDateString('vi-VN')}</td>
                    <td className="py-3 px-4">
                      {(role === 'manager' || role === 'accountant') ? (
                        <select
                          value={v.status}
                          onChange={(e) => updateViolationStatus(v, e.target.value)}
                          className={`text-xs rounded-full border px-2 py-1 outline-none transition-colors duration-500 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-300'}`}
                        >
                          <option value="Chưa xử lý">Chưa xử lý</option>
                          <option value="Đang xử lý">Đang xử lý</option>
                          <option value="Đã xử lý">Đã xử lý</option>
                        </select>
                      ) : statusBadge(v.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sinh viên: bảng riêng cho các vi phạm họ ĐÃ TỰ phản ánh (khác bảng "issues" ở trên).
       * Dữ liệu lấy từ cùng mảng `violations` đã tải sẵn — RLS "Students view own violations"
       * (student_id = auth.uid()) tự giới hạn chỉ trả về đúng các dòng của chính họ, không cần
       * query/thêm state riêng.
       */}
      {!loading && isStudent && (
        <div className={`rounded-xl shadow-sm border overflow-hidden transition-colors duration-500 ${t.card}`}>
          <div className={`px-4 py-3 border-b transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            <h3 className={`text-sm font-semibold transition-colors duration-500 ${t.title}`}>Vi phạm bạn đã phản ánh</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className={`font-medium border-b transition-colors duration-500 ${t.theadBg}`}>
                <tr>
                  <th className="py-3 px-4">Nội dung phản ánh</th>
                  <th className="py-3 px-4">Mức độ</th>
                  <th className="py-3 px-4">Ngày</th>
                  <th className="py-3 px-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody className={`divide-y transition-colors duration-500 ${t.divide}`}>
                {violations.length === 0 && (
                  <tr><td colSpan={4} className={`py-6 text-center text-sm transition-colors duration-500 ${t.sub}`}>Bạn chưa phản ánh vi phạm nào.</td></tr>
                )}
                {violations.map(v => (
                  <tr key={v.id} className={t.hover}>
                    <td className="py-3 px-4 max-w-xs">
                      <p className={`font-medium truncate transition-colors duration-500 ${t.cell}`}>{v.title}</p>
                      <p className={`text-xs truncate transition-colors duration-500 ${t.sub}`}>{v.description}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium transition-colors duration-500 ${
                        v.severity === 'Nghiêm trọng' ? (isDarkMode ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-700') :
                        v.severity === 'Trung bình' ? (isDarkMode ? 'bg-orange-900/40 text-orange-300' : 'bg-orange-100 text-orange-700') :
                        (isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600')
                      }`}>{v.severity}</span>
                    </td>
                    <td className={`py-3 px-4 transition-colors duration-500 ${t.sub}`}>{new Date(v.date).toLocaleDateString('vi-VN')}</td>
                    <td className="py-3 px-4">{statusBadge(v.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isNewIssueOpen && (
        <NewIssueModal isDarkMode={isDarkMode} session={session} onClose={() => setIsNewIssueOpen(false)} onCreated={loadData} />
      )}
      {isNewViolationReportOpen && (
        <NewViolationReportModal isDarkMode={isDarkMode} session={session} onClose={() => setIsNewViolationReportOpen(false)} onCreated={loadData} />
      )}
      {isNewViolationOpen && (
        <NewViolationModal isDarkMode={isDarkMode} students={students} onClose={() => setIsNewViolationOpen(false)} onCreated={loadData} />
      )}
    </div>
  );
}

// "Tòa A1, tầng 4, phòng R103" — có cột mới thì dùng, phản ánh cũ thiếu cột thì hiện mã phòng cũ
function locationLabel(issue) {
  if (issue.buildings?.name && issue.floor && issue.room_number) {
    return `${issue.buildings.name}, tầng ${issue.floor}, phòng ${issue.room_number}`;
  }
  return issue.room_id || issue.room_number || '—';
}

function NewIssueModal({ isDarkMode, session, onClose, onCreated }) {
  const [step, setStep] = useState('form'); // 'form' | 'success'
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [buildingId, setBuildingId] = useState('');
  const [floor, setFloor] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(true);

  const t = isDarkMode
    ? { overlay: 'bg-black/70', card: 'bg-slate-800 border-slate-700 text-slate-100', label: 'text-slate-300', input: 'bg-slate-700 border-slate-600 text-slate-100' }
    : { overlay: 'bg-black/60', card: 'bg-white border-slate-200 text-slate-800', label: 'text-slate-600', input: 'bg-white border-slate-300 text-slate-800' };

  useEffect(() => {
    (async () => {
      const [{ data: b }, { data: r }] = await Promise.all([
        supabase.from('buildings').select('*').order('name'),
        supabase.from('rooms').select('id, building_id, floor, room_number').order('room_number'),
      ]);
      setBuildings(b || []);
      setRooms(r || []);
      setLoadingOptions(false);
    })();
  }, []);

  const floorsOfBuilding = [...new Set(rooms.filter(r => r.building_id === buildingId).map(r => r.floor))].sort((a, b) => a - b);
  const roomsOfFloor = rooms.filter(r => r.building_id === buildingId && String(r.floor) === String(floor));

  const handleBuildingChange = (val) => { setBuildingId(val); setFloor(''); setRoomNumber(''); };
  const handleFloorChange = (val) => { setFloor(val); setRoomNumber(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!buildingId || !floor || !roomNumber || !content.trim()) {
      setError('Vui lòng chọn đầy đủ tòa, tầng, phòng và nhập nội dung phản ánh.');
      return;
    }
    setSubmitting(true);
    // .select().single() để lấy lại id vừa tạo — dùng gắn vào thông báo (issue_id) cho quản lý.
    const { data: newIssue, error: err } = await supabase.from('issues').insert({
      student_id: session.user.id,
      building_id: buildingId,
      floor: Number(floor),
      room_number: roomNumber,
      room_id: roomNumber, // giữ tương thích với cột cũ
      title: content.trim(),
      status: 'Chờ xử lý',
    }).select().single();
    setSubmitting(false);
    if (err) { setError('Gửi thất bại: ' + err.message); return; }

    // Báo cho TOÀN BỘ Ban quản lý KTX (recipient_role = 'manager', không gắn 1 người cụ thể)
    // rằng vừa có phản ánh mới. Nếu bước này lỗi (VD: RLS chưa cấu hình), không chặn luồng gửi
    // phản ánh của sinh viên — chỉ log lỗi ra console để dễ debug.
    const { error: notifErr } = await supabase.from('notifications').insert({
      recipient_role: 'manager',
      type: 'issue',
      title: `Phản ánh mới: ${content.trim()}`,
      description: `Phòng ${roomNumber} vừa gửi một phản ánh mới, đang chờ xử lý.`,
      issue_id: newIssue?.id ?? null,
      read: false,
    });
    if (notifErr) console.error('Lỗi tạo thông báo cho quản lý:', notifErr.message);

    setStep('success');
  };

  const handleBack = () => {
    onCreated();
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors duration-500 ${t.overlay}`} onClick={step === 'form' ? onClose : undefined}>
      {step === 'form' ? (
        <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className={`w-full max-w-sm rounded-2xl border shadow-xl p-6 space-y-3 transition-colors duration-500 ${t.card}`}>
          <h3 className="font-bold text-lg mb-1">Báo cáo sự cố</h3>

          {loadingOptions ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-[#004b87]" size={22} /></div>
          ) : (
            <>
              <div>
                <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${t.label}`}>Tòa</label>
                <select value={buildingId} onChange={(e) => handleBuildingChange(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-500 ${t.input}`}>
                  <option value="">-- Chọn tòa --</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${t.label}`}>Tầng</label>
                  <select value={floor} onChange={(e) => handleFloorChange(e.target.value)} disabled={!buildingId} className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-500 ${t.input} disabled:opacity-50`}>
                    <option value="">-- Tầng --</option>
                    {floorsOfBuilding.map(f => <option key={f} value={f}>Tầng {f}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${t.label}`}>Phòng</label>
                  <select value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} disabled={!floor} className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-500 ${t.input} disabled:opacity-50`}>
                    <option value="">-- Phòng --</option>
                    {roomsOfFloor.map(r => <option key={r.id} value={r.room_number}>{r.room_number}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${t.label}`}>Nội dung phản ánh</label>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="Mô tả sự cố bạn gặp phải..." className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-500 ${t.input}`} />
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-500 ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>Hủy</button>
            <button type="submit" disabled={submitting || loadingOptions} className="px-4 py-2 rounded-lg text-sm font-medium bg-[#004b87] text-white hover:bg-[#003a68] disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 size={16} className="animate-spin" />} Xác nhận
            </button>
          </div>
        </form>
      ) : (
        <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-sm rounded-2xl border shadow-xl p-6 text-center transition-colors duration-500 ${t.card}`}>
          <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} />
          </div>
          <p className="text-sm leading-relaxed mb-6">
            Ban quản lý ký túc xá đã nhận được phản ánh của bạn, chúng tôi sẽ xử lý nhanh nhất có thể.
          </p>
          <button onClick={handleBack} className="w-full bg-[#004b87] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#003a68] transition">
            Quay lại
          </button>
        </div>
      )}
    </div>
  );
}

function NewViolationModal({ isDarkMode, students, onClose, onCreated }) {
  const [studentId, setStudentId] = useState(students[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('Nhẹ');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const t = isDarkMode
    ? { overlay: 'bg-slate-900/80', card: 'bg-slate-800 border-slate-700 text-slate-100', label: 'text-slate-300', input: 'bg-slate-700 border-slate-600 text-slate-100' }
    : { overlay: 'bg-black/50', card: 'bg-white border-slate-200 text-slate-800', label: 'text-slate-600', input: 'bg-white border-slate-300 text-slate-800' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!studentId || !title.trim()) { setError('Vui lòng chọn sinh viên và nhập tiêu đề.'); return; }
    setSubmitting(true);
    const { error: err } = await supabase.from('violations').insert({
      student_id: studentId, title: title.trim(), description: description.trim(), severity,
    });
    setSubmitting(false);
    if (err) { setError('Ghi nhận thất bại: ' + err.message); return; }

    // Báo ngay cho sinh viên bị nêu tên rằng họ vừa bị ghi nhận vi phạm — không chờ tới lúc
    // đổi trạng thái mới biết (khác với updateViolationStatus, đây là thông báo LÚC TẠO MỚI).
    const { error: notifErr } = await supabase.from('notifications').insert({
      recipient_id: studentId,
      type: 'violation',
      title: `Bạn bị ghi nhận vi phạm: ${title.trim()}`,
      description: description.trim() || 'Vui lòng xem chi tiết trong mục Vi phạm nội quy.',
      read: false,
    });
    if (notifErr) console.error('Lỗi tạo thông báo vi phạm:', notifErr.message);
    onCreated();
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors duration-500 ${t.overlay}`} onClick={onClose}>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className={`w-full max-w-sm rounded-2xl border shadow-xl p-6 space-y-3 transition-colors duration-500 ${t.card}`}>
        <h3 className="font-bold text-lg mb-1">Ghi nhận vi phạm nội quy</h3>
        <div>
          <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${t.label}`}>Sinh viên</label>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-500 ${t.input}`}>
            {students.length === 0 && <option value="">Không có sinh viên</option>}
            {students.map(s => <option key={s.id} value={s.id}>{s.full_name || s.id}</option>)}
          </select>
        </div>
        <div>
          <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${t.label}`}>Tiêu đề vi phạm</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Vi phạm giờ giới nghiêm" className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-500 ${t.input}`} />
        </div>
        <div>
          <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${t.label}`}>Mô tả</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-500 ${t.input}`} />
        </div>
        <div>
          <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${t.label}`}>Mức độ</label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-500 ${t.input}`}>
            <option value="Nhẹ">Nhẹ</option>
            <option value="Trung bình">Trung bình</option>
            <option value="Nghiêm trọng">Nghiêm trọng</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-500 ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>Hủy</button>
          <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 flex items-center gap-2">
            {submitting && <Loader2 size={16} className="animate-spin" />} Ghi nhận
          </button>
        </div>
      </form>
    </div>
  );
}

// Modal cho SINH VIÊN "Phản ánh vi phạm" — khác NewViolationModal (quản lý ghi nhận vi phạm của
// MỘT sinh viên cụ thể do đã chọn từ danh sách). Ở đây sinh viên không có quyền tra danh sách sinh
// viên khác (bảng `profiles` chỉ SELECT được hồ sơ của chính mình), nên KHÔNG chọn được "đối tượng
// vi phạm" theo student_id thật — phải mô tả đối tượng bằng chữ (vị trí/phòng) trong nội dung.
// Ghi thẳng vào bảng `violations` (dùng chung 1 bảng với vi phạm do quản lý ghi nhận) để hiện NGAY
// trong tab "Vi phạm nội quy" phía quản lý — không cần bảng/route riêng.
// LƯU Ý QUAN TRỌNG (cần xác nhận lại phía Supabase trước khi dùng thật):
// 1) violations.student_id đang lưu = người VI PHẠM (theo cách NewViolationModal dùng). Ở luồng
//    này ta không biết ai vi phạm nên tạm lưu student_id = người GỬI PHẢN ÁNH (session.user.id) và
//    gắn tiền tố "[Phản ánh SV]" vào title để quản lý không hiểu nhầm chính SV này vi phạm.
// 2) RLS bảng `violations` trước giờ chỉ/insert bởi quản lý (qua NewViolationModal) — CẦN THÊM
//    policy INSERT cho role student (student_id = auth.uid()) thì thao tác dưới đây mới chạy được,
//    nếu chưa có sẽ gặp lỗi quyền (RLS) tương tự các lỗi CHECK constraint gặp trước đây trong dự án.
function NewViolationReportModal({ isDarkMode, session, onClose, onCreated }) {
  const [step, setStep] = useState('form'); // 'form' | 'success'
  const [target, setTarget] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('Nhẹ');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const t = isDarkMode
    ? { overlay: 'bg-black/70', card: 'bg-slate-800 border-slate-700 text-slate-100', label: 'text-slate-300', input: 'bg-slate-700 border-slate-600 text-slate-100' }
    : { overlay: 'bg-black/60', card: 'bg-white border-slate-200 text-slate-800', label: 'text-slate-600', input: 'bg-white border-slate-300 text-slate-800' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !description.trim()) {
      setError('Vui lòng nhập tiêu đề và mô tả vi phạm.');
      return;
    }
    setSubmitting(true);
    const fullTitle = `[Phản ánh SV] ${title.trim()}`;
    const fullDescription = target.trim()
      ? `Đối tượng/vị trí: ${target.trim()}\n${description.trim()}`
      : description.trim();

    const { data: newViolation, error: err } = await supabase.from('violations').insert({
      student_id: session.user.id,
      title: fullTitle,
      description: fullDescription,
      severity,
      // KHÔNG set status thủ công — bảng violations có CHECK constraint riêng cho status
      // (khác bảng issues), giá trị 'Chờ xử lý' không thuộc enum này -> insert bị lỗi 400.
      // NewViolationModal (quản lý) không set status và chạy đúng, nên để DB tự áp default.
    }).select().single();
    setSubmitting(false);
    if (err) { setError('Gửi thất bại: ' + err.message); return; }

    // Broadcast cho toàn bộ Ban quản lý (recipient_role='manager') — cùng cơ chế "nổi" trong
    // chuông thông báo như yêu cầu quyền truy cập đặc biệt. type: 'violation' đã được
    // handleNotificationClick (trong App) xử lý sẵn để điều hướng thẳng tới tab "Vi phạm nội quy".
    const { error: notifErr } = await supabase.from('notifications').insert({
      recipient_role: 'manager',
      type: 'violation',
      title: fullTitle,
      description: fullDescription.slice(0, 140),
      read: false,
    });
    if (notifErr) console.error('Lỗi tạo thông báo phản ánh vi phạm:', notifErr.message);

    setStep('success');
  };

  const handleBack = () => { onCreated(); onClose(); };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors duration-500 ${t.overlay}`} onClick={step === 'form' ? onClose : undefined}>
      {step === 'form' ? (
        <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className={`w-full max-w-sm rounded-2xl border shadow-xl p-6 space-y-3 transition-colors duration-500 ${t.card}`}>
          <h3 className="font-bold text-lg mb-1 flex items-center gap-2"><AlertCircle size={18} className="text-red-500" /> Phản ánh vi phạm nội quy</h3>

          <div>
            <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${t.label}`}>Tiêu đề</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Cờ bạc trong phòng, ồn ào sau 23h..." className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-500 ${t.input}`} />
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${t.label}`}>Đối tượng / vị trí (nếu biết)</label>
            <input type="text" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="VD: Phòng R203, Tòa A2" className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-500 ${t.input}`} />
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${t.label}`}>Mô tả chi tiết</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Mô tả sự việc bạn muốn phản ánh..." className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-500 ${t.input}`} />
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1 transition-colors duration-500 ${t.label}`}>Mức độ (theo đánh giá của bạn)</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors duration-500 ${t.input}`}>
              <option value="Nhẹ">Nhẹ</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Nghiêm trọng">Nghiêm trọng</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-500 ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>Hủy</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 flex items-center gap-2">
              {submitting && <Loader2 size={16} className="animate-spin" />} Gửi phản ánh
            </button>
          </div>
        </form>
      ) : (
        <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-sm rounded-2xl border shadow-xl p-6 text-center transition-colors duration-500 ${t.card}`}>
          <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} />
          </div>
          <p className="text-sm leading-relaxed mb-6">
            Ban quản lý ký túc xá đã nhận được phản ánh vi phạm của bạn, chúng tôi sẽ xem xét sớm nhất có thể.
          </p>
          <button onClick={handleBack} className="w-full bg-[#004b87] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#003a68] transition">
            Quay lại
          </button>
        </div>
      )}
    </div>
  );
}

function StudentsView({ isDarkMode }) {
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');

  const t = isDarkMode
    ? { title: 'text-slate-100', sub: 'text-slate-400', card: 'bg-slate-800 border-slate-700', headerBg: 'bg-slate-900 border-slate-700', heading: 'text-slate-200', select: 'bg-slate-700 border-slate-600 text-slate-200', input: 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400', theadTxt: 'text-slate-400 border-slate-700', divide: 'divide-slate-700', hover: 'hover:bg-slate-700/50', cell: 'text-slate-200' }
    : { title: 'text-slate-800', sub: 'text-slate-500', card: 'bg-white border-slate-200', headerBg: 'bg-slate-50 border-slate-100', heading: 'text-slate-700', select: 'bg-white border-slate-300', input: 'bg-white border-slate-300 placeholder-slate-400', theadTxt: 'text-slate-500 border-slate-200', divide: 'divide-slate-100', hover: 'hover:bg-slate-50', cell: 'text-slate-800' };

  const filtered = MOCK_STUDENTS.filter(s => {
    const matchGender = genderFilter === 'all' || s.gender === genderFilter;
    const q = search.trim().toLowerCase();
    const matchSearch = !q || s.fullName.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
    return matchGender && matchSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div>
        <h1 className={`text-2xl font-bold transition-colors duration-500 ${t.title}`}>Sinh viên nội trú</h1>
        <p className={`text-sm mt-1 transition-colors duration-500 ${t.sub}`}>
          Hồ sơ sinh viên đang ở ký túc xá. Danh sách bên dưới là dữ liệu mẫu (ảo) do chưa kết nối nguồn dữ liệu chính thức.
        </p>
      </div>

      <div className={`rounded-xl shadow-sm border overflow-hidden flex flex-col flex-1 transition-colors duration-500 ${t.card}`}>
        <div className={`p-4 border-b flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between transition-colors duration-500 ${t.headerBg}`}>
          <h3 className={`font-semibold transition-colors duration-500 ${t.heading}`}>Danh sách sinh viên ({filtered.length})</h3>
          <div className="flex gap-2">
            <div className={`flex items-center border rounded-md px-2 py-1 transition-colors duration-500 ${t.input}`}>
              <Search size={14} className={t.sub} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên hoặc mã SV..."
                className="bg-transparent border-none outline-none ml-2 text-sm w-48"
              />
            </div>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className={`text-sm border rounded-md px-2 py-1 outline-none transition-colors duration-500 ${t.select}`}
            >
              <option value="all">Tất cả giới tính</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto flex-1 p-4">
          <table className="w-full text-sm text-left">
            <thead className={`border-b transition-colors duration-500 ${t.theadTxt}`}>
              <tr>
                <th className="pb-3 font-medium">Mã sinh viên</th>
                <th className="pb-3 font-medium">Họ và tên</th>
                <th className="pb-3 font-medium">Ngày sinh</th>
                <th className="pb-3 font-medium">Giới tính</th>
                <th className="pb-3 font-medium">Số điện thoại</th>
              </tr>
            </thead>
            <tbody className={`divide-y transition-colors duration-500 ${t.divide}`}>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className={`py-6 text-center text-sm transition-colors duration-500 ${t.sub}`}>Không tìm thấy sinh viên nào.</td></tr>
              )}
              {filtered.map(s => (
                <tr key={s.id} className={t.hover}>
                  <td className="py-3 font-semibold text-[#004b87]">{s.id}</td>
                  <td className={`py-3 transition-colors duration-500 ${t.cell}`}>{s.fullName}</td>
                  <td className={`py-3 transition-colors duration-500 ${t.cell}`}>{s.dob}</td>
                  <td className="py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium transition-colors duration-500 ${
                      isDarkMode
                        ? (s.gender === 'Nam' ? 'bg-blue-900/40 text-blue-300' : 'bg-pink-900/40 text-pink-300')
                        : (s.gender === 'Nam' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700')
                    }`}>
                      {s.gender}
                    </span>
                  </td>
                  <td className={`py-3 transition-colors duration-500 ${t.cell}`}>
                    <span className="inline-flex items-center gap-1.5">
                      <Phone size={13} className={t.sub} /> {s.phone}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FeesView({ isDarkMode }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'debt'
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const period = new Date().toISOString().slice(0, 7); // kỳ thu hiện tại, dạng 'YYYY-MM'

  const t = isDarkMode
    ? { title: 'text-slate-100', sub: 'text-slate-400', card: 'bg-slate-800 border-slate-700', headerBg: 'bg-slate-900 border-slate-700', heading: 'text-slate-200', select: 'bg-slate-700 border-slate-600 text-slate-200', input: 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400', theadTxt: 'text-slate-400 border-slate-700', divide: 'divide-slate-700', hover: 'hover:bg-slate-700/50', cell: 'text-slate-200' }
    : { title: 'text-slate-800', sub: 'text-slate-500', card: 'bg-white border-slate-200', headerBg: 'bg-slate-50 border-slate-100', heading: 'text-slate-700', select: 'bg-white border-slate-300', input: 'bg-white border-slate-300 placeholder-slate-400', theadTxt: 'text-slate-500 border-slate-200', divide: 'divide-slate-100', hover: 'hover:bg-slate-50', cell: 'text-slate-800' };

  const formatVND = (n) => n.toLocaleString('vi-VN') + ' đ';

  // Bảng `fees` chỉ lưu bản ghi khi kế toán/quản lý đã nhập; sinh viên (profiles.role='student')
  // và phòng hiện ở (qua residencies active) là nguồn thật đầy đủ — ghép lại để mỗi sinh viên
  // luôn có 1 dòng dù chưa từng có bản ghi phí cho kỳ này (monthlyFee/paid mặc định 0).
  const loadData = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: activeRes }, { data: fees }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, student_code').eq('role', 'student').order('full_name'),
      supabase.from('residencies').select('student_id, beds(room_id, rooms(room_number))').eq('status', 'active'),
      supabase.from('fees').select('*').eq('period', period),
    ]);

    const roomByStudent = {};
    (activeRes || []).forEach((r) => {
      roomByStudent[r.student_id] = r.beds?.rooms?.room_number || null;
    });
    const feeByStudent = {};
    (fees || []).forEach((f) => { feeByStudent[f.student_id] = f; });

    setRows((profiles || []).map((p) => {
      const fee = feeByStudent[p.id];
      return {
        studentId: p.id,
        studentCode: p.student_code || '—',
        fullName: p.full_name || '—',
        room: roomByStudent[p.id] || '—',
        monthlyFee: fee ? Number(fee.monthly_fee) : 0,
        paid: fee ? Number(fee.paid) : 0,
      };
    }));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const updateLocal = (studentId, patch) => {
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, ...patch } : r)));
  };

  const saveFee = async (studentId) => {
    const row = rows.find((r) => r.studentId === studentId);
    if (!row) return;
    setSavingId(studentId);
    const { error } = await supabase
      .from('fees')
      .upsert({ student_id: studentId, period, monthly_fee: row.monthlyFee, paid: row.paid }, { onConflict: 'student_id,period' });
    if (error) console.error('Lỗi lưu phí:', error.message);
    setSavingId(null);
  };

  const withDebt = rows.map((r) => ({ ...r, debt: Math.max(r.monthlyFee - r.paid, 0) }));
  const totalCollected = withDebt.reduce((sum, r) => sum + r.paid, 0);
  const totalDebt = withDebt.reduce((sum, r) => sum + r.debt, 0);
  const debtCount = withDebt.filter((r) => r.debt > 0).length;

  const filtered = withDebt.filter((r) => {
    const matchStatus = statusFilter === 'all' || (statusFilter === 'paid' ? r.debt === 0 : r.debt > 0);
    const q = search.trim().toLowerCase();
    const matchSearch = !q || r.fullName.toLowerCase().includes(q) || r.studentCode.toLowerCase().includes(q) || r.room.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div>
        <h1 className={`text-2xl font-bold transition-colors duration-500 ${t.title}`}>Phí & Công nợ</h1>
        <p className={`text-sm mt-1 transition-colors duration-500 ${t.sub}`}>
          Theo dõi phí phòng và công nợ của sinh viên nội trú — kỳ {period}.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`rounded-xl border p-4 transition-colors duration-500 ${t.card}`}>
          <p className={`text-xs font-medium transition-colors duration-500 ${t.sub}`}>Tổng đã thu</p>
          <p className="text-xl font-bold text-green-600 mt-1">{formatVND(totalCollected)}</p>
        </div>
        <div className={`rounded-xl border p-4 transition-colors duration-500 ${t.card}`}>
          <p className={`text-xs font-medium transition-colors duration-500 ${t.sub}`}>Tổng công nợ</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatVND(totalDebt)}</p>
        </div>
        <div className={`rounded-xl border p-4 transition-colors duration-500 ${t.card}`}>
          <p className={`text-xs font-medium transition-colors duration-500 ${t.sub}`}>Sinh viên còn nợ</p>
          <p className={`text-xl font-bold mt-1 transition-colors duration-500 ${t.title}`}>{debtCount} / {withDebt.length}</p>
        </div>
      </div>

      <div className={`rounded-xl shadow-sm border overflow-hidden flex flex-col flex-1 transition-colors duration-500 ${t.card}`}>
        <div className={`p-4 border-b flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between transition-colors duration-500 ${t.headerBg}`}>
          <h3 className={`font-semibold transition-colors duration-500 ${t.heading}`}>Danh sách phí phòng ({filtered.length})</h3>
          <div className="flex gap-2">
            <div className={`flex items-center border rounded-md px-2 py-1 transition-colors duration-500 ${t.input}`}>
              <Search size={14} className={t.sub} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên, mã SV hoặc phòng..."
                className="bg-transparent border-none outline-none ml-2 text-sm w-48"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`text-sm border rounded-md px-2 py-1 outline-none transition-colors duration-500 ${t.select}`}
            >
              <option value="all">Tất cả</option>
              <option value="paid">Đã đóng đủ</option>
              <option value="debt">Còn nợ</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto flex-1 p-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#004b87]" size={24} /></div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className={`border-b transition-colors duration-500 ${t.theadTxt}`}>
                <tr>
                  <th className="pb-3 font-medium">Mã sinh viên</th>
                  <th className="pb-3 font-medium">Họ và tên</th>
                  <th className="pb-3 font-medium">Phòng</th>
                  <th className="pb-3 font-medium">Phí tháng</th>
                  <th className="pb-3 font-medium">Đã đóng</th>
                  <th className="pb-3 font-medium">Công nợ</th>
                  <th className="pb-3 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className={`divide-y transition-colors duration-500 ${t.divide}`}>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className={`py-6 text-center text-sm transition-colors duration-500 ${t.sub}`}>Không tìm thấy dữ liệu phù hợp.</td></tr>
                )}
                {filtered.map(r => (
                  <tr key={r.studentId} className={t.hover}>
                    <td className="py-3 font-semibold text-[#004b87]">{r.studentCode}</td>
                    <td className={`py-3 transition-colors duration-500 ${t.cell}`}>{r.fullName}</td>
                    <td className={`py-3 transition-colors duration-500 ${t.cell}`}>{r.room}</td>
                    <td className="py-3">
                      <input
                        type="number"
                        value={r.monthlyFee}
                        onChange={(e) => updateLocal(r.studentId, { monthlyFee: Number(e.target.value) || 0 })}
                        onBlur={() => saveFee(r.studentId)}
                        className={`w-24 text-sm rounded-md border px-2 py-1 outline-none transition-colors duration-500 ${t.input}`}
                      />
                    </td>
                    <td className="py-3">
                      <input
                        type="number"
                        value={r.paid}
                        onChange={(e) => updateLocal(r.studentId, { paid: Number(e.target.value) || 0 })}
                        onBlur={() => saveFee(r.studentId)}
                        className={`w-24 text-sm rounded-md border px-2 py-1 outline-none transition-colors duration-500 ${t.input}`}
                      />
                      {savingId === r.studentId && <Loader2 size={12} className="inline-block animate-spin ml-1.5 text-[#004b87]" />}
                    </td>
                    <td className={`py-3 font-medium ${r.debt > 0 ? 'text-red-600' : t.cell}`}>{formatVND(r.debt)}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium border transition-colors duration-500 ${
                        r.debt > 0
                          ? (isDarkMode ? 'bg-red-900/30 text-red-300 border-red-800' : 'bg-red-50 text-red-700 border-red-200')
                          : (isDarkMode ? 'bg-green-900/30 text-green-300 border-green-800' : 'bg-green-50 text-green-700 border-green-200')
                      }`}>
                        {r.debt > 0 ? 'Còn nợ' : 'Đã đóng đủ'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatbotView({ isDarkMode, floating, onClose, messages, setMessages }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Câu hỏi gợi ý cho màn hình toàn trang khi chưa có hội thoại nào — giúp người dùng mới
  // hình dung phạm vi trả lời của bot (đúng 5 nhóm trong DORM_RULES) thay vì khung chat trống trơn.
  const SUGGESTED_TOPICS = [
    'Giờ đóng cửa KTX là mấy giờ?',
    'Quy định đổ rác thế nào?',
    'Thủ tục đăng ký khách tới thăm ra sao?',
    'Đóng phí nội trú trước ngày nào?',
  ];

  const t = isDarkMode
    ? { shell: 'bg-slate-800 border-slate-700', body: 'bg-slate-900/40', aiCard: 'bg-slate-800 border-slate-700 text-slate-200', aiAccent: 'border-l-blue-400', userChip: 'bg-slate-700 text-slate-100', inputWrap: 'bg-slate-800 border-slate-700', inputField: 'bg-slate-700 text-slate-100 placeholder-slate-500', tag: 'bg-slate-900/60 text-slate-400 border-slate-600', suggestChip: 'border-slate-600 text-slate-300 hover:bg-slate-700', loadingText: 'text-slate-400' }
    : { shell: 'bg-white border-slate-200', body: 'bg-slate-50/50', aiCard: 'bg-white border-slate-200 text-slate-700', aiAccent: 'border-l-[#004b87]', userChip: 'bg-blue-50 text-[#004b87]', inputWrap: 'bg-white border-slate-100', inputField: 'bg-slate-100 placeholder-slate-400', tag: 'bg-blue-50/70 text-[#004b87] border-blue-100', suggestChip: 'border-slate-200 text-slate-600 hover:bg-slate-50', loadingText: 'text-slate-500' };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Dò số "Điều X" được nhắc trong câu trả lời để gắn thành thẻ nguồn nhỏ bên dưới — thay cho
  // bong bóng chat thuần túy, giúp câu trả lời có cảm giác được đối chiếu với nội quy thật.
  const extractSourceTag = (content) => {
    const m = content.match(/[Đđ]iều\s*(\d+)/);
    return m ? `Mục ${m[1]} — Nội quy KTX` : 'Dựa trên Nội quy KTX';
  };

  const sendMessage = async (rawText) => {
    const userMessage = rawText.trim();
    if (!userMessage || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    const systemInstruction = `
      Bạn là trợ lý ảo của Ký túc xá Đại học CNTT & Truyền thông Thái Nguyên (ICTU). 
      CHỈ TRẢ LỜI dựa trên nội quy được cung cấp dưới đây, KHÔNG tự bịa ra luật. 
      Trả lời ngắn gọn, lịch sự, dễ hiểu và dẫn lại mục nội quy nếu có thể.
      
      ${DORM_RULES}
    `;

    try {
      const response = await callGemini(userMessage, systemInstruction);
      setMessages(prev => [...prev, { role: 'ai', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: "Xin lỗi, hệ thống đang bận. Vui lòng thử lại sau." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    sendMessage(input);
  };

  return (
    <div className={`transition-colors duration-500 ${floating ? 'h-full w-full' : 'h-[calc(100vh-120px)] max-w-3xl mx-auto'} flex flex-col rounded-lg border overflow-hidden animate-in fade-in duration-500 ${t.shell}`}>
      <div className="px-4 py-3.5 bg-[#004b87] text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <Bot size={19} className="text-blue-100" />
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display), sans-serif' }} className="font-bold text-sm tracking-tight">AI Trợ lý Nội quy</h2>
            <p className="text-[11px] text-blue-200 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span> Sẵn sàng trả lời
            </p>
          </div>
        </div>
        {floating && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#004b87]"
            title="Đóng"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto px-4 py-5 space-y-5 transition-colors duration-500 ${t.body}`}>
        {messages.map((msg, idx) => (
          msg.role === 'user' ? (
            <div key={idx} className="flex justify-end">
              <div className={`max-w-[80%] px-3.5 py-2 rounded-lg text-sm leading-relaxed transition-colors duration-500 ${t.userChip}`}>
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={idx} className="flex justify-start">
              <div className={`max-w-[85%] border-l-4 border-y border-r rounded-lg pl-3.5 pr-4 py-3 transition-colors duration-500 ${t.aiAccent} ${t.aiCard}`}>
                <div
                  className="text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }}
                />
                {idx !== 0 && (
                  <span className={`inline-flex items-center gap-1 mt-2.5 text-[11px] font-medium px-2 py-0.5 rounded border transition-colors duration-500 ${t.tag}`}>
                    <Info size={11} /> {extractSourceTag(msg.content)}
                  </span>
                )}
              </div>
            </div>
          )
        ))}

        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTED_TOPICS.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                disabled={isLoading}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-50 ${t.suggestChip}`}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className={`border-l-4 border-y border-r rounded-lg pl-3.5 pr-4 py-3 flex items-center gap-2 transition-colors duration-500 ${t.aiAccent} ${t.aiCard}`}>
              <Loader2 size={14} className="animate-spin text-[#004b87] shrink-0" />
              <span className={`text-xs transition-colors duration-500 ${t.loadingText}`}>Đang tra cứu nội quy…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={`p-3.5 border-t transition-colors duration-500 ${t.inputWrap}`}>
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="VD: Mấy giờ KTX đóng cửa? Nếu em về muộn thì sao?"
            className={`flex-1 border-none outline-none rounded-lg px-3.5 py-2.5 text-sm transition-colors duration-500 focus-visible:ring-2 focus-visible:ring-amber-400 ${t.inputField}`}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-[#004b87] text-white w-11 rounded-lg flex items-center justify-center hover:bg-[#003a68] transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

// --- UTILS ---
// Chọn cỡ chữ theo độ dài chuỗi giá trị (số đã format, VD "1.245.000 đ") để con số dài
// (tiền tệ, số lớn) không tràn khung hay bị đẩy xuống dòng — thay vì 1 cỡ cố định cho mọi giá trị.
function pickValueTextClass(value, isOpen) {
  const len = String(value).length;
  if (isOpen) {
    if (len > 14) return 'text-xl sm:text-2xl';
    if (len > 10) return 'text-2xl sm:text-3xl';
    if (len > 7) return 'text-3xl sm:text-4xl';
    return 'text-4xl sm:text-5xl';
  }
  if (len > 10) return 'text-base';
  if (len > 7) return 'text-xl';
  if (len > 5) return 'text-2xl';
  return 'text-3xl';
}

// Box thống kê có thể mở/thu (dùng cho hàng 5 chỉ số của Tổng quan). Đóng: giống StatCard cũ.
// Mở: to hơn (flexGrow tăng qua style, không đổi cột grid, nên các box khác co lại mượt thay vì
// bố cục bị lệch), hiện thêm dòng chi tiết, GIỮ NGUYÊN màu viền trái của chính box đó (không đổi
// thành nền màu đặc như bản cũ) — đúng yêu cầu "mở ra vẫn cùng màu viền".
function ExpandableStatCard({ title, value, detail, icon, color, isDarkMode, isOpen, onToggle }) {
  const borderColors = {
    blue: isDarkMode ? 'border-l-blue-400' : 'border-l-blue-600',
    green: isDarkMode ? 'border-l-emerald-400' : 'border-l-emerald-600',
    orange: isDarkMode ? 'border-l-orange-400' : 'border-l-orange-600',
    indigo: isDarkMode ? 'border-l-indigo-400' : 'border-l-indigo-600',
    red: isDarkMode ? 'border-l-red-400' : 'border-l-red-600',
  };
  const iconColors = {
    blue: isDarkMode ? 'text-blue-400' : 'text-blue-600',
    green: isDarkMode ? 'text-emerald-400' : 'text-emerald-600',
    orange: isDarkMode ? 'text-orange-400' : 'text-orange-600',
    indigo: isDarkMode ? 'text-indigo-400' : 'text-indigo-600',
    red: isDarkMode ? 'text-red-400' : 'text-red-600',
  };
  const valueSize = pickValueTextClass(value, isOpen);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      style={{ flexGrow: isOpen ? 3 : 1, flexBasis: '10rem' }}
      className={`text-left rounded-lg border-l-4 border-y border-r px-4 py-4 transition-[flex-grow,background-color,border-color] duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${borderColors[color] || borderColors.blue} ${isDarkMode ? 'bg-slate-800 border-y-slate-700 border-r-slate-700 hover:bg-slate-800/80' : 'bg-white border-y-slate-200 border-r-slate-200 hover:bg-slate-50'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className={`text-xs font-semibold uppercase tracking-wide transition-colors duration-500 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{title}</h4>
        <span className={`shrink-0 transition-colors duration-500 ${iconColors[color] || iconColors.blue}`}>
          {React.cloneElement(icon, { size: 16 })}
        </span>
      </div>
      <div className="mt-2">
        <span
          style={{ fontFamily: 'var(--font-display), sans-serif' }}
          className={`block font-extrabold tracking-tight tabular-nums whitespace-nowrap leading-none transition-[font-size] duration-300 ${valueSize} ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}
        >
          {value}
        </span>
      </div>
      {/* grid-template-rows 0fr -> 1fr: animate chiều cao mở/đóng mượt mà không cần đo bằng JS */}
      <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}`}>
        <p className={`overflow-hidden text-xs sm:text-sm transition-colors duration-500 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{detail}</p>
      </div>
    </button>
  );
}

function ProgressBar({ percent, color, isDarkMode }) {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className={`w-full h-2 rounded-full overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percent}%` }}></div>
      </div>
      <span className={`text-xs font-medium w-8 transition-colors duration-500 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{percent}%</span>
    </div>
  );
}