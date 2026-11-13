-- Bé Đọc Vần — chạy 1 lần trong Supabase: Dashboard → SQL Editor → New query → dán toàn bộ → Run.

-- ============ Bảng ============

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(name) between 1 and 100),
  code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes on delete cascade,
  name text not null check (length(name) between 1 and 60),
  created_at timestamptz not null default now()
);
create index if not exists students_class_idx on public.students (class_id);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (length(title) between 1 and 120),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists lessons_teacher_idx on public.lessons (teacher_id);

create table if not exists public.lesson_items (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons on delete cascade,
  van text not null check (length(van) between 1 and 20),
  word text not null check (length(word) between 1 and 60),
  emoji text check (length(emoji) <= 16),
  audio_path text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists lesson_items_lesson_idx on public.lesson_items (lesson_id);

create table if not exists public.assignments (
  class_id uuid not null references public.classes on delete cascade,
  lesson_id uuid not null references public.lessons on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, lesson_id)
);
create index if not exists assignments_lesson_idx on public.assignments (lesson_id);

create table if not exists public.attempts (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.students on delete cascade,
  item_id uuid not null references public.lesson_items on delete cascade,
  verdict text not null check (verdict in ('correct', 'near', 'wrong')),
  heard text check (length(heard) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists attempts_student_idx on public.attempts (student_id);
create index if not exists attempts_item_idx on public.attempts (item_id);

-- ============ Quyền: cô chỉ thấy dữ liệu của mình ============

alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_items enable row level security;
alter table public.assignments enable row level security;
alter table public.attempts enable row level security;

drop policy if exists own_classes on public.classes;
create policy own_classes on public.classes for all to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));

drop policy if exists own_lessons on public.lessons;
create policy own_lessons on public.lessons for all to authenticated
  using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));

drop policy if exists own_students on public.students;
create policy own_students on public.students for all to authenticated
  using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = (select auth.uid())))
  with check (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = (select auth.uid())));

drop policy if exists own_items on public.lesson_items;
create policy own_items on public.lesson_items for all to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id and l.teacher_id = (select auth.uid())))
  with check (exists (select 1 from public.lessons l where l.id = lesson_id and l.teacher_id = (select auth.uid())));

drop policy if exists own_assignments on public.assignments;
create policy own_assignments on public.assignments for all to authenticated
  using (
    exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = (select auth.uid()))
    and exists (select 1 from public.lessons l where l.id = lesson_id and l.teacher_id = (select auth.uid())))
  with check (
    exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = (select auth.uid()))
    and exists (select 1 from public.lessons l where l.id = lesson_id and l.teacher_id = (select auth.uid())));

drop policy if exists read_own_attempts on public.attempts;
create policy read_own_attempts on public.attempts for select to authenticated
  using (exists (
    select 1 from public.students s join public.classes c on c.id = s.class_id
    where s.id = student_id and c.teacher_id = (select auth.uid())));

-- Cấp quyền rõ ràng (project tắt "Automatically expose new tables").
-- Học sinh (anon) KHÔNG đọc/ghi bảng trực tiếp — chỉ qua các hàm bên dưới.
revoke all on public.classes, public.students, public.lessons, public.lesson_items,
  public.assignments, public.attempts from anon;
grant select, insert, update, delete on public.classes, public.students, public.lessons,
  public.lesson_items, public.assignments to authenticated;
revoke all on public.attempts from authenticated;
grant select on public.attempts to authenticated;

-- ============ Hàm cho học sinh (không đăng nhập, dùng mã lớp) ============

create or replace function public.student_class(p_code text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'name', c.name,
    'students', coalesce(
      (select json_agg(json_build_object('id', s.id, 'name', s.name) order by s.created_at)
       from students s where s.class_id = c.id), '[]'::json))
  from classes c where c.code = upper(p_code);
$$;

create or replace function public.student_lessons(p_code text)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object(
    'id', l.id,
    'title', l.title,
    'items', coalesce(
      (select json_agg(json_build_object(
          'id', i.id, 'van', i.van, 'word', i.word, 'emoji', i.emoji, 'audio_path', i.audio_path)
        order by i.position, i.created_at)
       from lesson_items i where i.lesson_id = l.id), '[]'::json))
    order by l.position, l.created_at), '[]'::json)
  from classes c
  join assignments a on a.class_id = c.id
  join lessons l on l.id = a.lesson_id
  where c.code = upper(p_code);
$$;

create or replace function public.student_progress(p_code text, p_student uuid)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_object_agg(item_id, best), '{}'::json) from (
    select a.item_id,
      case max(case a.verdict when 'correct' then 2 when 'near' then 1 else 0 end)
        when 2 then 'correct' when 1 then 'near' else 'wrong' end as best
    from attempts a
    join students s on s.id = a.student_id
    join classes c on c.id = s.class_id
    where c.code = upper(p_code) and s.id = p_student
    group by a.item_id
  ) t;
$$;

create or replace function public.record_attempt(
  p_code text, p_student uuid, p_item uuid, p_verdict text, p_heard text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from classes c
    join students s on s.class_id = c.id and s.id = p_student
    join assignments a on a.class_id = c.id
    join lesson_items i on i.lesson_id = a.lesson_id and i.id = p_item
    where c.code = upper(p_code)
  ) then
    raise exception 'invalid attempt';
  end if;
  insert into attempts (student_id, item_id, verdict, heard)
  values (p_student, p_item, p_verdict, left(p_heard, 200));
end $$;

-- ============ Thống kê cho cô (chạy theo quyền của cô) ============

create or replace function public.class_stats(p_class uuid)
returns table (student_id uuid, item_id uuid, total int, correct int, near int, wrong int, last_at timestamptz)
language sql stable security invoker set search_path = public as $$
  select a.student_id, a.item_id,
    count(*)::int,
    (count(*) filter (where a.verdict = 'correct'))::int,
    (count(*) filter (where a.verdict = 'near'))::int,
    (count(*) filter (where a.verdict = 'wrong'))::int,
    max(a.created_at)
  from attempts a
  join students s on s.id = a.student_id
  where s.class_id = p_class
  group by a.student_id, a.item_id;
$$;

revoke all on function public.student_class(text) from public;
revoke all on function public.student_lessons(text) from public;
revoke all on function public.student_progress(text, uuid) from public;
revoke all on function public.record_attempt(text, uuid, uuid, text, text) from public;
revoke all on function public.class_stats(uuid) from public;
grant execute on function public.student_class(text) to anon, authenticated;
grant execute on function public.student_lessons(text) to anon, authenticated;
grant execute on function public.student_progress(text, uuid) to anon, authenticated;
grant execute on function public.record_attempt(text, uuid, uuid, text, text) to anon, authenticated;
grant execute on function public.class_stats(uuid) to authenticated;

-- ============ Kho file giọng mẫu của cô ============

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audio', 'audio', true, 1048576, array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'])
on conflict (id) do nothing;

drop policy if exists audio_select on storage.objects;
create policy audio_select on storage.objects for select to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists audio_insert on storage.objects;
create policy audio_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists audio_update on storage.objects;
create policy audio_update on storage.objects for update to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists audio_delete on storage.objects;
create policy audio_delete on storage.objects for delete to authenticated
  using (bucket_id = 'audio' and (storage.foldername(name))[1] = (select auth.uid())::text);
