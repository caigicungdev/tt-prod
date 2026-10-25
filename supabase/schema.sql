-- =====================================================================
--  Trấn Thành Archive — Góc người hâm mộ
--  Chạy toàn bộ file này MỘT LẦN trong Supabase → SQL Editor → New query → Run.
--  Chạy lại cũng an toàn (dùng "if not exists" / "or replace" / drop policy trước khi tạo).
--
--  Gồm: hồ sơ người dùng, bài viết (chờ duyệt), ảnh, thả tim, bình luận,
--       quyền truy cập (Row Level Security), kho ảnh, và view cho bảng tin.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Bảng
-- ---------------------------------------------------------------------

-- Hồ sơ công khai, tạo tự động khi ai đó đăng nhập Google lần đầu
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Người hâm mộ' check (char_length(display_name) between 1 and 60),
  avatar_url   text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Bài viết: mọi bài mới đều ở trạng thái 'pending' cho tới khi admin duyệt
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles (id) on delete cascade,
  title         text check (title is null or char_length(title) <= 120),
  body          text not null default '' check (char_length(body) <= 3000),
  category      text not null default 'khac'
                  check (category in ('phim', 'gameshow', 'su-kien', 'doi-thuong', 'fanart', 'khac')),
  source        text check (source is null or char_length(source) <= 300),  -- nguồn ảnh / tư liệu
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text check (reject_reason is null or char_length(reject_reason) <= 300),
  reviewed_by   uuid references public.profiles (id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now(),
  constraint post_not_empty check (char_length(coalesce(title, '')) + char_length(body) > 0)
);
create index if not exists posts_status_created_idx on public.posts (status, created_at desc);
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);

-- Ảnh của bài (tối đa 6 ảnh / bài — kiểm tra trong policy bên dưới)
create table if not exists public.post_images (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  path       text not null,                -- đường dẫn trong bucket 'post-images'
  width      int,
  height     int,
  position   smallint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists post_images_post_idx on public.post_images (post_id, position);

-- Thả tim: mỗi người một tim / bài
create table if not exists public.likes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- Bình luận (chỉ trên bài đã duyệt)
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at);

-- ---------------------------------------------------------------------
-- 2. Hàm hỗ trợ
-- ---------------------------------------------------------------------

-- Người đang đăng nhập có phải admin không
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Số bài đang chờ duyệt của người đang đăng nhập (chống spam)
create or replace function public.my_pending_count()
returns int
language sql stable security definer
set search_path = public
as $$
  select count(*)::int from public.posts where author_id = auth.uid() and status = 'pending';
$$;

-- Số ảnh hiện có của một bài (dùng trong policy, tránh policy tự gọi lại chính nó)
create or replace function public.post_image_count(p_post uuid)
returns int
language sql stable security definer
set search_path = public
as $$
  select count(*)::int from public.post_images where post_id = p_post;
$$;

-- Tự tạo hồ sơ từ thông tin Google khi có người đăng nhập lần đầu
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1),
      'Người hâm mộ'
    ), 60),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Người dùng thường không tự đổi được trạng thái / người duyệt của bài
create or replace function public.guard_post_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Chỉ admin mới được sửa bài';
  end if;
  if new.status is distinct from old.status then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;
  -- không cho đổi tác giả / thời gian tạo
  new.author_id  := old.author_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists posts_guard_update on public.posts;
create trigger posts_guard_update
  before update on public.posts
  for each row execute function public.guard_post_update();

-- ---------------------------------------------------------------------
-- 3. Row Level Security — ai được xem / thêm / sửa / xoá gì
-- ---------------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.posts       enable row level security;
alter table public.post_images enable row level security;
alter table public.likes       enable row level security;
alter table public.comments    enable row level security;

-- profiles: ai cũng xem được tên + ảnh đại diện; chỉ tự sửa tên/ảnh của mình
drop policy if exists "profiles: xem công khai" on public.profiles;
create policy "profiles: xem công khai" on public.profiles
  for select using (true);

drop policy if exists "profiles: tự sửa" on public.profiles;
create policy "profiles: tự sửa" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;   -- không được tự set is_admin

-- posts
drop policy if exists "posts: xem" on public.posts;
create policy "posts: xem" on public.posts
  for select using (
    status = 'approved'
    or author_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "posts: đăng bài" on public.posts;
create policy "posts: đăng bài" on public.posts
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reject_reason is null
    and public.my_pending_count() < 5          -- tối đa 5 bài chờ duyệt cùng lúc
  );

drop policy if exists "posts: admin sửa" on public.posts;
create policy "posts: admin sửa" on public.posts
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "posts: xoá" on public.posts;
create policy "posts: xoá" on public.posts
  for delete to authenticated
  using (public.is_admin() or (author_id = auth.uid() and status <> 'approved'));

-- post_images: hiện theo bài; tác giả thêm ảnh khi bài còn chờ duyệt
drop policy if exists "post_images: xem" on public.post_images;
create policy "post_images: xem" on public.post_images
  for select using (
    exists (select 1 from public.posts p where p.id = post_id)   -- RLS của posts tự lọc
  );

drop policy if exists "post_images: thêm" on public.post_images;
create policy "post_images: thêm" on public.post_images
  for insert to authenticated
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = auth.uid() and p.status = 'pending'
    )
    and split_part(path, '/', 1) = auth.uid()::text
    and public.post_image_count(post_id) < 6
  );

drop policy if exists "post_images: xoá" on public.post_images;
create policy "post_images: xoá" on public.post_images
  for delete to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid() and p.status <> 'approved')
  );

-- likes
drop policy if exists "likes: xem" on public.likes;
create policy "likes: xem" on public.likes
  for select using (true);

drop policy if exists "likes: thả tim" on public.likes;
create policy "likes: thả tim" on public.likes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.posts p where p.id = post_id and p.status = 'approved')
  );

drop policy if exists "likes: bỏ tim" on public.likes;
create policy "likes: bỏ tim" on public.likes
  for delete to authenticated
  using (user_id = auth.uid());

-- comments
drop policy if exists "comments: xem" on public.comments;
create policy "comments: xem" on public.comments
  for select using (
    exists (select 1 from public.posts p where p.id = post_id and p.status = 'approved')
    or public.is_admin()
  );

drop policy if exists "comments: viết" on public.comments;
create policy "comments: viết" on public.comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from public.posts p where p.id = post_id and p.status = 'approved')
  );

drop policy if exists "comments: xoá" on public.comments;
create policy "comments: xoá" on public.comments
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- 4. View cho bảng tin (chạy với quyền người xem → vẫn tuân theo RLS ở trên)
-- ---------------------------------------------------------------------
create or replace view public.post_feed
with (security_invoker = true)
as
select
  p.id,
  p.author_id,
  p.title,
  p.body,
  p.category,
  p.source,
  p.status,
  p.reject_reason,
  p.created_at,
  p.reviewed_at,
  pr.display_name as author_name,
  pr.avatar_url   as author_avatar,
  (select count(*) from public.likes l where l.post_id = p.id)::int    as like_count,
  (select count(*) from public.comments c where c.post_id = p.id)::int as comment_count,
  exists (select 1 from public.likes l where l.post_id = p.id and l.user_id = auth.uid()) as liked_by_me,
  coalesce(
    (select json_agg(json_build_object('path', i.path, 'width', i.width, 'height', i.height) order by i.position)
       from public.post_images i where i.post_id = p.id),
    '[]'::json
  ) as images
from public.posts p
join public.profiles pr on pr.id = p.author_id;

create or replace view public.comment_feed
with (security_invoker = true)
as
select c.id, c.post_id, c.author_id, c.body, c.created_at,
       pr.display_name as author_name, pr.avatar_url as author_avatar
from public.comments c
join public.profiles pr on pr.id = c.author_id;

grant select on public.post_feed, public.comment_feed to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Kho ảnh (Storage): bucket công khai để xem, chỉ tải lên vào thư mục của chính mình
--    Đường dẫn ảnh: <user_id>/<post_id>/<số>.webp
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "post-images: tải lên thư mục của mình" on storage.objects;
create policy "post-images: tải lên thư mục của mình" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "post-images: xoá ảnh của mình hoặc admin" on storage.objects;
create policy "post-images: xoá ảnh của mình hoặc admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-images' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- =====================================================================
--  SAU KHI CHẠY XONG: đăng nhập trang web bằng Google một lần, rồi chạy dòng dưới
--  (thay email) để tự cấp quyền admin cho mình:
--
--  update public.profiles set is_admin = true
--  where id = (select id from auth.users where email = 'email-cua-ban@gmail.com');
-- =====================================================================
