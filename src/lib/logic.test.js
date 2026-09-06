import { describe, it, expect } from 'vitest';
import {
  filterVacantRooms, filterRoomsByCriteria,
  calcDebt, applyFeeFilters,
  validateChangeRequest, buildRoomChangeIssuePayload,
  formatAiReport, extractSourceTag,
} from './logic.js';

// ===== Xếp phòng =====
describe('filterVacantRooms', () => {
  const rooms = [
    { id: 'r1', capacity: 4 },
    { id: 'r2', capacity: 2 },
    { id: 'r3', capacity: 3 },
  ];

  it('giữ lại phòng có occ < capacity, loại phòng đã đầy', () => {
    const result = filterVacantRooms(rooms, { r1: 2, r2: 2, r3: 3 });
    expect(result.map((r) => r.id)).toEqual(['r1']);
  });

  it('phòng chưa có ai ở (không nằm trong occupiedMap) coi occ = 0, vẫn trống', () => {
    const result = filterVacantRooms(rooms, {});
    expect(result).toHaveLength(3);
    expect(result.every((r) => r.occ === 0)).toBe(true);
  });
});

describe('filterRoomsByCriteria', () => {
  const vacant = [
    { room_number: 'R101', building_id: 'B1', gender: 'nam', type: '4-giuong', occ: 0, capacity: 4 },
    { room_number: 'R102', building_id: 'B1', gender: 'nu', type: '4-giuong', occ: 0, capacity: 4 },
    { room_number: 'R201', building_id: 'B2', gender: 'nam', type: '2-giuong', occ: 0, capacity: 2 },
  ];

  it('không lọc gì khi tất cả filter = all', () => {
    expect(filterRoomsByCriteria(vacant, { building: 'all', gender: 'all', type: 'all' })).toHaveLength(3);
  });

  it('lọc đúng theo building + gender kết hợp', () => {
    const result = filterRoomsByCriteria(vacant, { building: 'B1', gender: 'nam', type: 'all' });
    expect(result.map((r) => r.room_number)).toEqual(['R101']);
  });

  it('trả về rỗng khi không có phòng nào khớp', () => {
    const result = filterRoomsByCriteria(vacant, { building: 'B2', gender: 'nu', type: 'all' });
    expect(result).toHaveLength(0);
  });
});

// ===== Phí & công nợ =====
describe('calcDebt', () => {
  it('tính đúng công nợ = monthly_fee - paid', () => {
    expect(calcDebt(1000000, 400000)).toBe(600000);
  });

  it('không trả về số âm khi đóng thừa (paid > monthly_fee)', () => {
    expect(calcDebt(1000000, 1500000)).toBe(0);
  });

  it('đóng đủ thì công nợ = 0', () => {
    expect(calcDebt(1000000, 1000000)).toBe(0);
  });
});

describe('applyFeeFilters', () => {
  const rows = [
    { studentId: 1, fullName: 'Nguyễn Văn A', studentCode: 'SV001', room: 'R101', debt: 0 },
    { studentId: 2, fullName: 'Trần Thị B', studentCode: 'SV002', room: 'R102', debt: 200000 },
  ];

  it('lọc statusFilter=paid chỉ lấy debt=0', () => {
    const result = applyFeeFilters(rows, { statusFilter: 'paid', search: '' });
    expect(result.map((r) => r.studentId)).toEqual([1]);
  });

  it('lọc statusFilter=debt chỉ lấy debt>0', () => {
    const result = applyFeeFilters(rows, { statusFilter: 'debt', search: '' });
    expect(result.map((r) => r.studentId)).toEqual([2]);
  });

  it('search theo tên không phân biệt hoa-thường', () => {
    const result = applyFeeFilters(rows, { statusFilter: 'all', search: 'trần thị' });
    expect(result.map((r) => r.studentId)).toEqual([2]);
  });

  it('search theo mã sinh viên', () => {
    const result = applyFeeFilters(rows, { statusFilter: 'all', search: 'sv001' });
    expect(result.map((r) => r.studentId)).toEqual([1]);
  });
});

// ===== Phản ánh / yêu cầu chuyển-trả phòng =====
describe('validateChangeRequest', () => {
  const residency = { building_id: 'B1', floor: 2, room_number: 'R201' };

  it('báo lỗi khi sinh viên không có phòng ở', () => {
    expect(validateChangeRequest(null, 'lý do')).toMatch(/không có phòng ở/);
  });

  it('báo lỗi khi thiếu lý do', () => {
    expect(validateChangeRequest(residency, '   ')).toMatch(/nhập lý do/);
  });

  it('hợp lệ khi có đủ residency + lý do', () => {
    expect(validateChangeRequest(residency, 'Muốn chuyển gần bạn cùng lớp')).toBeNull();
  });
});

describe('buildRoomChangeIssuePayload', () => {
  it('dựng đúng payload insert vào bảng issues', () => {
    const residency = { building_id: 'B1', floor: 2, room_number: 'R201' };
    const payload = buildRoomChangeIssuePayload('student-uuid-1', residency, 'Trả phòng', '  Hết hạn ở  ');

    expect(payload).toEqual({
      student_id: 'student-uuid-1',
      building_id: 'B1',
      floor: 2,
      room_number: 'R201',
      room_id: 'R201',
      title: 'Yêu cầu trả phòng: Hết hạn ở',
      request_type: 'room_change',
      change_type: 'Trả phòng',
      status: 'Chờ xử lý',
    });
  });
});

// ===== AI =====
describe('formatAiReport', () => {
  it('chuyển ### heading thành thẻ h4', () => {
    expect(formatAiReport('### Cơ sở vật chất')).toBe('<h4 class="ai-report-h4">Cơ sở vật chất</h4>');
  });

  it('chuyển gạch đầu dòng thành <ul><li>', () => {
    const out = formatAiReport('- Vòi nước hỏng\n- Đèn hành lang cháy');
    expect(out).toBe('<ul class="ai-report-list"><li>Vòi nước hỏng</li><li>Đèn hành lang cháy</li></ul>');
  });

  it('chuyển **bold** thành <strong>', () => {
    expect(formatAiReport('**Khẩn cấp**: cần xử lý ngay')).toBe('<p class="ai-report-p"><strong>Khẩn cấp</strong>: cần xử lý ngay</p>');
  });

  it('escape HTML để chặn injection từ nội dung AI trả về', () => {
    const out = formatAiReport('<script>alert(1)</script>');
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;script&gt;');
  });

  it('--- chuyển thành <hr>', () => {
    expect(formatAiReport('---')).toBe('<hr class="ai-report-hr" />');
  });
});

describe('extractSourceTag', () => {
  it('nhận diện "Điều X" và gắn tag nguồn tương ứng', () => {
    expect(extractSourceTag('Theo Điều 5, sinh viên phải...')).toBe('Mục 5 — Nội quy KTX');
  });

  it('không có "Điều X" thì trả về tag mặc định', () => {
    expect(extractSourceTag('Giờ đóng cửa là 23h.')).toBe('Dựa trên Nội quy KTX');
  });
});
