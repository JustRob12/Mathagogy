-- ============================================================
-- Mathagogy – Topic Post-Test Attempts & History Table
-- Run this script in the Supabase SQL Editor
-- ============================================================

create table if not exists public.post_test_attempts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  grade           text not null,                 -- 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'
  term            text not null,                 -- 'Term 1', 'Term 2', 'Term 3'
  topic           text not null,                 -- Mathematical topic assessed
  score           integer not null default 0,
  total_questions integer not null default 0,
  percentage      numeric(5, 2) not null default 0.00,
  passed          boolean not null default false,
  answers         jsonb not null default '[]'::jsonb,
  completed_at    timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.post_test_attempts enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Users can view own post_test_attempts" on public.post_test_attempts;
drop policy if exists "Users can insert own post_test_attempts" on public.post_test_attempts;
drop policy if exists "Admins can view all post_test_attempts" on public.post_test_attempts;

-- Users can view their own post-test attempts
create policy "Users can view own post_test_attempts"
  on public.post_test_attempts
  for select
  using (auth.uid() = user_id);

-- Users can insert their own post-test attempts
create policy "Users can insert own post_test_attempts"
  on public.post_test_attempts
  for insert
  with check (auth.uid() = user_id);

-- Admins (role = 0) can view all students' post-test attempts
create policy "Admins can view all post_test_attempts"
  on public.post_test_attempts
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 0
    )
  );

-- Indexes for optimal query performance
create index if not exists idx_post_test_attempts_user_id 
  on public.post_test_attempts(user_id);

create index if not exists idx_post_test_attempts_grade_term 
  on public.post_test_attempts(grade, term);

create index if not exists idx_post_test_attempts_topic 
  on public.post_test_attempts(topic);

create index if not exists idx_post_test_attempts_completed_at 
  on public.post_test_attempts(completed_at desc);

-- Optional compatibility column for assessment_attempts if used as fallback
alter table public.assessment_attempts add column if not exists topic text;
