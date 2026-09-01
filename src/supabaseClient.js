import { createClient } from '@supabase/supabase-js';

// Lấy từ Supabase Dashboard > Settings > API
// Đặt trong file .env (KHÔNG commit .env lên Git, chỉ commit .env.example)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong file .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
