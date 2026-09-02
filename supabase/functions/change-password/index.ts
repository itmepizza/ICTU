// Edge Function: change-password
// Đổi mật khẩu khi user ĐÃ đăng nhập. Khác verify-otp (dùng cho quên mật khẩu): flow này
// KHÔNG gửi OTP — chỉ verify currentPassword bằng signInWithPassword phía server,
// rồi dùng admin.updateUserById để đổi mk (bypass check "Secure password change" của
// client SDK updateUser() gây lỗi "Current password required...").

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Thiếu Authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Thiếu mật khẩu hiện tại hoặc mật khẩu mới.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (String(newPassword).length < 6) {
      return new Response(
        JSON.stringify({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Xác định user gọi lên là ai, từ JWT trong Authorization header.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: getUserError } = await userClient.auth.getUser();
    if (getUserError || !user) {
      return new Response(
        JSON.stringify({ error: 'Phiên đăng nhập không hợp lệ.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify currentPassword bằng client anon riêng, server-side — không đụng session gốc
    // của browser vì đây là instance client khác chạy trong Edge Function.
    const verifyClient = createClient(supabaseUrl, anonKey);
    const { error: verifyError } = await verifyClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) {
      return new Response(
        JSON.stringify({ error: 'Mật khẩu hiện tại không đúng.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Đổi mk bằng admin API — bypass hoàn toàn check "Current password required" của
    // client SDK updateUser(), vì admin API không áp dụng Secure password change.
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });
    if (updateError) {
      console.error('Lỗi đổi mật khẩu:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message || 'Không thể đổi mật khẩu.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabaseAdmin.from('profiles').update({ has_password: true }).eq('id', user.id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('change-password lỗi không mong đợi:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Lỗi server không xác định.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
