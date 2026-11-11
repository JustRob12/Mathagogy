-- ============================================================
-- Mathagogy – Assessment Attempts & History Table
-- Run this in the Supabase SQL Editor
-- ============================================================

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

-- Drop existing policies if re-running
drop policy if exists "Users can view own attempts" on public.assessment_attempts;
drop policy if exists "Users can insert own attempts" on public.assessment_attempts;
drop policy if exists "Admins can view all attempts" on public.assessment_attempts;

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

-- Indexes for performance
create index if not exists idx_assessment_attempts_user_id 
  on public.assessment_attempts(user_id);

create index if not exists idx_assessment_attempts_grade_term 
  on public.assessment_attempts(grade, term);

create index if not exists idx_assessment_attempts_completed_at 
  on public.assessment_attempts(completed_at desc);

