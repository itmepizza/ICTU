import React, { useState, useEffect, useCallback } from 'react';
import { Database, Shield, Server, RefreshCw, Loader2, ChevronLeft, ChevronRight, ArrowLeft, Lock } from 'lucide-react';
import { supabase } from './supabaseClient';

// Mô tả cố định (không lấy động từ Supabase) — cập nhật tay khi thêm/xoá function.
const EDGE_FUNCTIONS = [
  { name: 'chatbot-ai', desc: 'Proxy gọi Gemini cho chatbot nội quy, gợi ý xếp phòng, tóm tắt phản ánh. Giữ GEMINI_API_KEY phía server.' },
  { name: 'send-otp', desc: 'Sinh mã OTP 6 số, lưu bảng otp_codes (hạn 15 phút), gửi mail qua Resend. Luôn trả success để chống dò email.' },
  { name: 'verify-otp', desc: 'Kiểm tra mã OTP, đặt lại mật khẩu bằng admin API, đánh dấu mã đã dùng.' },
  { name: 'change-password', desc: 'Đổi mật khẩu khi đã đăng nhập: xác minh mật khẩu cũ phía server rồi cập nhật, không cần OTP.' },
  { name: 'admin-backend', desc: 'Chính trang này: chỉ-đọc, chỉ manager, bảng nằm trong whitelist, cột nhạy cảm bị che.' },
];

// invoke() chỉ trả message chung khi non-2xx → đọc body thật từ error.context.
async function callAdmin(body) {
  const { data, error } = await supabase.functions.invoke('admin-backend', { body });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch { /* giữ msg mặc định */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

const cellText = (v) => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

export default function BackendView({ isDarkMode }) {
  const [tab, setTab] = useState('tables');
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openTable, setOpenTable] = useState(null);
  const [rowsData, setRowsData] = useState(null);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [page, setPage] = useState(0);

  const t = isDarkMode
    ? { title: 'text-slate-100', sub: 'text-slate-400', card: 'bg-slate-800 border-slate-700', thead: 'text-slate-400 border-slate-700', divide: 'divide-slate-700', hover: 'hover:bg-slate-700/50', cell: 'text-slate-200', chip: 'bg-slate-700 text-slate-200', chipOn: 'bg-blue-500 text-white', code: 'bg-slate-900 text-slate-300', accent: 'border-l-blue-400' }
    : { title: 'text-slate-800', sub: 'text-slate-500', card: 'bg-white border-slate-200', thead: 'text-slate-500 border-slate-200', divide: 'divide-slate-100', hover: 'hover:bg-slate-50', cell: 'text-slate-800', chip: 'bg-slate-100 text-slate-600', chipOn: 'bg-[#004b87] text-white', code: 'bg-slate-100 text-slate-700', accent: 'border-l-[#004b87]' };

  const loadOverview = useCallback(async () => {
    setLoading(true); setError('');
    try { setOverview(await callAdmin({ action: 'overview' })); }
    catch (e) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  useEffect(() => {
    if (!openTable) return;
    let alive = true;
    setRowsLoading(true);
    callAdmin({ action: 'rows', table: openTable, page })
      .then((d) => { if (alive) setRowsData(d); })
      .catch((e) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setRowsLoading(false); });
    return () => { alive = false; };
  }, [openTable, page]);

  const tables = overview?.schema?.tables || [];
  const policies = overview?.schema?.policies || [];
  const tableMeta = tables.find((x) => x.name === openTable);
  const allowed = new Set(overview?.allowed || []);

  const TabBtn = ({ id, icon, label }) => (
    <button
      onClick={() => { setTab(id); setOpenTable(null); setRowsData(null); setPage(0); }}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 ${tab === id ? t.chipOn : t.chip}`}
    >
      {icon}{label}
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className={`font-display text-2xl font-bold ${t.title}`}>Backend · Supabase</h1>
          <p className={`text-sm mt-1 ${t.sub}`}>Chế độ chỉ-đọc. Dữ liệu đi qua Edge Function <code>admin-backend</code>, có kiểm tra role manager.</p>
        </div>
        <button onClick={loadOverview} disabled={loading} className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold ${t.chip}`}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Làm mới
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <TabBtn id="tables" icon={<Database className="w-4 h-4" />} label="Bảng dữ liệu" />
        <TabBtn id="policies" icon={<Shield className="w-4 h-4" />} label="RLS Policies" />
        <TabBtn id="functions" icon={<Server className="w-4 h-4" />} label="Edge Functions" />
      </div>

      {error && <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm p-3">{error}</div>}
      {loading && !overview && <div className={`flex items-center gap-2 text-sm ${t.sub}`}><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>}

      {/* TAB: BẢNG */}
      {overview && tab === 'tables' && !openTable && (
        <div className={`rounded-xl border border-l-4 ${t.card} ${t.accent} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead><tr className={`text-left border-b ${t.thead}`}>
              <th className="px-4 py-3 font-semibold">Bảng</th><th className="px-4 py-3 font-semibold">Số dòng</th>
              <th className="px-4 py-3 font-semibold">Số cột</th><th className="px-4 py-3 font-semibold">RLS</th><th className="px-4 py-3" />
            </tr></thead>
            <tbody className={`divide-y ${t.divide}`}>
              {tables.map((tb) => (
                <tr key={tb.name} className={t.hover}>
                  <td className={`px-4 py-3 font-mono ${t.cell}`}>{tb.name}</td>
                  <td className={`px-4 py-3 tabular-nums ${t.cell}`}>{overview.counts?.[tb.name] ?? '—'}</td>
                  <td className={`px-4 py-3 tabular-nums ${t.cell}`}>{tb.columns?.length ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${tb.rls ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      <Lock className="w-3 h-3" />{tb.rls ? 'Bật' : 'Tắt'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {allowed.has(tb.name)
                      ? <button onClick={() => { setOpenTable(tb.name); setPage(0); setRowsData(null); }} className="text-sm font-semibold text-blue-600 hover:underline">Xem dữ liệu</button>
                      : <span className={`text-xs ${t.sub}`}>ngoài whitelist</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CHI TIẾT 1 BẢNG */}
      {overview && tab === 'tables' && openTable && (
        <div className="space-y-4">
          <button onClick={() => { setOpenTable(null); setRowsData(null); }} className={`inline-flex items-center gap-1 text-sm font-semibold ${t.sub} hover:underline`}>
            <ArrowLeft className="w-4 h-4" /> Danh sách bảng
          </button>
          <div className={`rounded-xl border border-l-4 p-4 ${t.card} ${t.accent}`}>
            <h2 className={`font-display font-bold font-mono ${t.title}`}>{openTable}</h2>
            <div className="flex flex-wrap gap-2 mt-3">
              {(tableMeta?.columns || []).map((c) => (
                <span key={c.name} className={`text-xs font-mono px-2 py-1 rounded ${t.code}`}>{c.name}: {c.type}{c.notnull ? ' · NOT NULL' : ''}</span>
              ))}
            </div>
            {openTable === 'otp_codes' && <p className={`text-xs mt-3 ${t.sub}`}>Cột <code>code</code> bị che ở server (••••••).</p>}
          </div>

          <div className={`rounded-xl border ${t.card} overflow-x-auto`}>
            {rowsLoading && !rowsData ? (
              <div className={`p-4 flex items-center gap-2 text-sm ${t.sub}`}><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>
            ) : rowsData && rowsData.rows.length === 0 ? (
              <div className={`p-4 text-sm ${t.sub}`}>Bảng trống.</div>
            ) : rowsData && (
              <table className="w-full text-xs">
                <thead><tr className={`text-left border-b ${t.thead}`}>
                  {Object.keys(rowsData.rows[0]).map((k) => <th key={k} className="px-3 py-2 font-semibold font-mono whitespace-nowrap">{k}</th>)}
                </tr></thead>
                <tbody className={`divide-y ${t.divide}`}>
                  {rowsData.rows.map((r, i) => (
                    <tr key={i} className={t.hover}>
                      {Object.keys(rowsData.rows[0]).map((k) => (
                        <td key={k} className={`px-3 py-2 font-mono max-w-[220px] truncate ${t.cell}`} title={cellText(r[k])}>{cellText(r[k])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {rowsData && (
            <div className={`flex items-center justify-between text-sm ${t.sub}`}>
              <span>{rowsData.total} dòng · trang {rowsData.page + 1}/{Math.max(1, Math.ceil(rowsData.total / rowsData.pageSize))}</span>
              <div className="flex gap-2">
                <button disabled={page === 0 || rowsLoading} onClick={() => setPage((p) => p - 1)} className={`p-2 rounded-full disabled:opacity-40 ${t.chip}`} aria-label="Trang trước"><ChevronLeft className="w-4 h-4" /></button>
                <button disabled={(page + 1) * rowsData.pageSize >= rowsData.total || rowsLoading} onClick={() => setPage((p) => p + 1)} className={`p-2 rounded-full disabled:opacity-40 ${t.chip}`} aria-label="Trang sau"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: POLICIES */}
      {overview && tab === 'policies' && (
        <div className={`rounded-xl border border-l-4 ${t.card} ${t.accent} overflow-x-auto`}>
          <table className="w-full text-xs">
            <thead><tr className={`text-left border-b ${t.thead}`}>
              <th className="px-3 py-2 font-semibold">Bảng</th><th className="px-3 py-2 font-semibold">Policy</th>
              <th className="px-3 py-2 font-semibold">Lệnh</th><th className="px-3 py-2 font-semibold">USING</th><th className="px-3 py-2 font-semibold">WITH CHECK</th>
            </tr></thead>
            <tbody className={`divide-y ${t.divide}`}>
              {policies.length === 0 && <tr><td colSpan={5} className={`px-3 py-4 ${t.sub}`}>Không có policy.</td></tr>}
              {policies.map((p, i) => (
                <tr key={i} className={`align-top ${t.hover}`}>
                  <td className={`px-3 py-2 font-mono ${t.cell}`}>{p.table}</td>
                  <td className={`px-3 py-2 ${t.cell}`}>{p.name}</td>
                  <td className={`px-3 py-2 font-mono ${t.cell}`}>{p.cmd}</td>
                  <td className={`px-3 py-2 font-mono ${t.sub} max-w-[280px] break-words`}>{p.using || '—'}</td>
                  <td className={`px-3 py-2 font-mono ${t.sub} max-w-[280px] break-words`}>{p.with_check || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB: EDGE FUNCTIONS */}
      {tab === 'functions' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {EDGE_FUNCTIONS.map((f) => (
            <div key={f.name} className={`rounded-xl border border-l-4 p-4 ${t.card} ${t.accent}`}>
              <div className={`font-mono font-bold ${t.title}`}>{f.name}</div>
              <p className={`text-sm mt-1 ${t.sub}`}>{f.desc}</p>
            </div>
          ))}
          <p className={`text-xs sm:col-span-2 ${t.sub}`}>Danh sách này viết tay trong code, không lấy trực tiếp từ Supabase.</p>
        </div>
      )}
    </div>
  );
}
