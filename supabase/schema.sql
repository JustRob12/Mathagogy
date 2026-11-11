-- ============================================================
-- Mathagogy – Supabase Database Setup
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ----------------------------------------------------------------
-- 1. PROFILES TABLE
--    Extends auth.users with name, username, and role.
--
--    role:
--      0 = Admin
--      1 = Student  (default for every new signup)
-- ----------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text,
  username    text unique not null,
  role        smallint not null default 1   -- 1 = Student
                        check (role in (0, 1)),
  created_at  timestamptz default now()
);

-- ----------------------------------------------------------------
-- 2. ROW-LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Users can update their own profile (but NOT their own role)
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins (role = 0) can read all profiles
create policy "Admins can view all profiles"
  on public.profiles
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 0
    )
  );

-- Admins can update any profile (including role changes)
create policy "Admins can update any profile"
  on public.profiles
  for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 0
    )
  );

-- ----------------------------------------------------------------
-- 3. TRIGGER – auto-create profile on sign-up
--    Reads name and username from auth.users.raw_user_meta_data
-- ----------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, username, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'username',
    1   -- default: Student; change to 0 in Supabase dashboard to make Admin
  );
  return new;
end;
$$;

-- Drop old trigger if it exists (safe re-run)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ----------------------------------------------------------------
-- 4. HOW TO SET A USER AS ADMIN
--    In the Supabase dashboard > Table Editor > profiles table,
--    find the user and change their `role` column from 1 → 0.
--
--    Or run:
--    UPDATE public.profiles SET role = 0 WHERE username = 'your_username';
-- ----------------------------------------------------------------

-- ----------------------------------------------------------------
-- 5. ASSESSMENT ATTEMPTS TABLE
--    Records student test submissions, scores, and history
-- ----------------------------------------------------------------
create table if not exists public.assessment_attempts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  grade           text not null,                 -- 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'
  term            text not null,                 -- 'Term 1', 'Term 2', 'Term 3', 'Likert Scale'
  test_type       text not null default 'diagnostic', -- 'diagnostic' or 'likert'
  score           integer not null default 0,
  total_questions integer not null default 50,
  percentage      numeric(5, 2) not null default 0.00,
  passed          boolean not null default false,
  answers         jsonb not null default '[]'::jsonb,
  weak_topics     jsonb not null default '[]'::jsonb,
  category_scores jsonb default null,
  completed_at    timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.assessment_attempts enable row level security;

-- Users can view their own attempts
create policy "Users can view own attempts"
  on public.assessment_attempts
  for select
  using (auth.uid() = user_id);

-- Users can insert their own attempts
create policy "Users can insert own attempts"
  on public.assessment_attempts
  for insert
  with check (auth.uid() = user_id);

-- Admins can view all attempts
create policy "Admins can view all attempts"
  on public.assessment_attempts
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 0
    )
  );

-- Indexes for fast queries
create index if not exists idx_assessment_attempts_user_id 
  on public.assessment_attempts(user_id);

create index if not exists idx_assessment_attempts_grade_term 
  on public.assessment_attempts(grade, term);

create index if not exists idx_assessment_attempts_completed_at 
  on public.assessment_attempts(completed_at desc);


