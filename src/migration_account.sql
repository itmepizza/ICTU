-- Bổ sung các cột cần thiết cho trang Tài khoản (avatar, sđt, giới tính, mã thẻ SV)
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists phone text,
  add column if not exists gender text default 'male',
  add column if not exists student_code text;

-- Tạo bucket lưu ảnh đại diện (chạy 1 lần).
-- Nếu Dashboard không cho insert trực tiếp vào storage.buckets qua SQL Editor,
-- hãy tạo bucket thủ công: Storage -> New bucket -> tên "avatars" -> Public bucket = ON.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policy: ai cũng xem được ảnh đại diện (bucket public)
create policy if not exists "Public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Policy: người dùng chỉ được tải lên / ghi đè ảnh của chính mình
-- (đường dẫn file phải bắt đầu bằng {user_id}/... — khớp với code AccountSettings.jsx)
create policy if not exists "Users upload own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy if not exists "Users update own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
