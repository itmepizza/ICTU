// Logic thuần (pure function) tách ra từ App.jsx để có thể unit test độc lập,
// không phụ thuộc React state / Supabase client. App.jsx import và gọi lại
// đúng các hàm này — không viết lại logic riêng cho test.

// ===== Xếp phòng (RoomsView) =====

// Gắn số người đang ở (occ) vào mỗi phòng và lọc ra phòng còn chỗ trống (occ < capacity).
export const filterVacantRooms = (rooms, occupiedMap) =>
  rooms
    .map((r) => ({ ...r, occ: occupiedMap[r.id] || 0 }))
    .filter((r) => r.occ < r.capacity);

// Lọc tiếp theo tòa/giới tính/loại phòng (dùng cho tìm-thủ-công và làm input cho AI gợi ý).
export const filterRoomsByCriteria = (vacantRooms, { building = 'all', gender = 'all', type = 'all' } = {}) =>
  vacantRooms.filter(
    (r) =>
      (building === 'all' || r.building_id === building) &&
      (gender === 'all' || r.gender === gender) &&
      (type === 'all' || r.type === type)
  );

// ===== Phí & công nợ (FeesView) =====

// Đúng công thức đang dùng trong FeesView (client-side hiển thị) và cũng là công thức
// của cột generated `debt` trong bảng `fees` (monthly_fee - paid, không âm).
export const calcDebt = (monthlyFee, paid) => Math.max(Number(monthlyFee) - Number(paid), 0);

export const applyFeeFilters = (rowsWithDebt, { statusFilter = 'all', search = '' } = {}) => {
  const q = search.trim().toLowerCase();
  return rowsWithDebt.filter((r) => {
    const matchStatus = statusFilter === 'all' || (statusFilter === 'paid' ? r.debt === 0 : r.debt > 0);
    const matchSearch =
      !q ||
      r.fullName.toLowerCase().includes(q) ||
      r.studentCode.toLowerCase().includes(q) ||
      r.room.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });
};

// ===== Phản ánh / yêu cầu chuyển-trả phòng (IssuesView) =====

// Validate trước khi cho phép gửi yêu cầu chuyển/trả phòng.
export const validateChangeRequest = (currentResidency, changeReason) => {
  if (!currentResidency) return 'Bạn hiện không có phòng ở nên không thể gửi yêu cầu chuyển/trả phòng.';
  if (!changeReason || !changeReason.trim()) return 'Vui lòng nhập lý do.';
  return null;
};

// Dựng payload insert vào bảng `issues` cho yêu cầu chuyển/trả phòng — tách ra để test
// không cần mock supabase client.
export const buildRoomChangeIssuePayload = (studentId, currentResidency, changeType, changeReason) => ({
  student_id: studentId,
  building_id: currentResidency.building_id,
  floor: currentResidency.floor,
  room_number: currentResidency.room_number,
  room_id: currentResidency.room_number,
  title: `Yêu cầu ${changeType.toLowerCase()}: ${changeReason.trim()}`,
  request_type: 'room_change',
  change_type: changeType,
  status: 'Chờ xử lý',
});

// ===== AI — format báo cáo tổng hợp (ChatbotView / IssuesView AI summary) =====

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const formatAiReport = (raw) => {
  const lines = escapeHtml(raw).split('\n');
  const html = [];
  let listBuf = [];
  const flushList = () => {
    if (listBuf.length) {
      html.push(`<ul class="ai-report-list">${listBuf.join('')}</ul>`);
      listBuf = [];
    }
  };
  for (let rawLine of lines) {
    if (/^---+$/.test(rawLine.trim())) {
      flushList();
      html.push('<hr class="ai-report-hr" />');
      continue;
    }
    if (/^#{1,6}\s+/.test(rawLine)) {
      const content = rawLine
        .replace(/^#{1,6}\s+/, '')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
      flushList();
      html.push(`<h4 class="ai-report-h4">${content}</h4>`);
      continue;
    }
    if (/^\s*[\*\-]\s+/.test(rawLine)) {
      const content = rawLine
        .replace(/^\s*[\*\-]\s+/, '')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
      listBuf.push(`<li>${content}</li>`);
      continue;
    }
    flushList();
    const line = rawLine.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
    if (line.trim() === '') {
      html.push('<div class="ai-report-gap"></div>');
    } else {
      html.push(`<p class="ai-report-p">${line}</p>`);
    }
  }
  flushList();
  return html.join('');
};

// Trích số "Điều X" trong câu trả lời chatbot để gắn nguồn (ChatbotView).
export const extractSourceTag = (content) => {
  const m = content.match(/[Đđ]iều\s*(\d+)/);
  return m ? `Mục ${m[1]} — Nội quy KTX` : 'Dựa trên Nội quy KTX';
};
