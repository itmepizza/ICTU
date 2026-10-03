// supabase/functions/admin-backend/index.ts
// Chỉ-đọc. Chỉ role 'manager' gọi được. service_role key nằm trong secrets của Edge Function,
// KHÔNG bao giờ gửi về trình duyệt.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Whitelist bảng được phép xem. Thêm bảng mới thì thêm vào đây.
const ALLOWED = [
  'profiles', 'buildings', 'rooms', 'beds', 'residencies', 'issues',
  'violations', 'notifications', 'fees', 'dorm_contracts', 'ai_events', 'otp_codes',
];
// Cột nhạy cảm bị che giá trị ở server trước khi trả về.
const MASKED: Record<string, string[]> = { otp_codes: ['code'] };

const PAGE_SIZE = 25;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // 1) Xác thực người gọi
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
  const { data: userData } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (!user) return json({ error: 'Chưa đăng nhập.' }, 401);

  // 2) Phân quyền: chỉ manager
  const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (prof?.role !== 'manager') return json({ error: 'Chỉ Ban quản lý KTX được xem backend.' }, 403);

  const body = await req.json().catch(() => ({}));

  try {
    if (body.action === 'overview') {
      const { data: schema, error } = await admin.rpc('admin_schema_info');
      if (error) throw error;
      const counts: Record<string, number | null> = {};
      await Promise.all(ALLOWED.map(async (t) => {
        const { count, error: e } = await admin.from(t).select('*', { count: 'exact', head: true });
        counts[t] = e ? null : count;
      }));
      return json({ schema, counts, allowed: ALLOWED });
    }

    if (body.action === 'rows') {
      const table = String(body.table || '');
      if (!ALLOWED.includes(table)) return json({ error: 'Bảng không nằm trong danh sách cho phép.' }, 400);
      const page = Math.max(0, Number(body.page) || 0);
      const from = page * PAGE_SIZE;
      const { data, count, error } = await admin
        .from(table)
        .select('*', { count: 'exact' })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const masked = MASKED[table] || [];
      const rows = (data || []).map((r: Record<string, unknown>) => {
        const o = { ...r };
        masked.forEach((c) => { if (c in o) o[c] = '••••••'; });
        return o;
      });
      return json({ rows, total: count ?? 0, page, pageSize: PAGE_SIZE });
    }

    return json({ error: 'action không hợp lệ.' }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
