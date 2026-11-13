-- ============================================================
-- Mathagogy – Term Retake Attempts & Study Verification Table
-- Run this script in the Supabase SQL Editor
-- ============================================================

create table if not exists public.retake_attempts (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles(id) on delete cascade,
  grade                  text not null,                 -- 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'
  term                   text not null,                 -- 'Term 1', 'Term 2', 'Term 3'
  take_number            integer not null default 2,    -- 2 = 2nd take (1st retake), 3 = 3rd take, 4 = 4th take, etc.
  initial_score          integer not null default 0,
  initial_total          integer not null default 0,
  initial_percentage     numeric(5, 2) not null default 0.00,
  previous_score         integer default 0,
  previous_percentage    numeric(5, 2) default 0.00,
  score                  integer not null default 0,    -- retake score
  total_questions        integer not null default 0,    -- number of missed questions retaken
  percentage             numeric(5, 2) not null default 0.00, -- retake percentage
  cumulative_score       integer default 0,
  cumulative_percentage  numeric(5, 2) default 0.00,
  improvement_percentage numeric(5, 2) not null default 0.00, -- e.g. +35.00%
  passed                 boolean not null default false,
  answers                jsonb not null default '[]'::jsonb,
  completed_at           timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.retake_attempts enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Users can view own retake_attempts" on public.retake_attempts;
drop policy if exists "Users can insert own retake_attempts" on public.retake_attempts;
drop policy if exists "Admins can view all retake_attempts" on public.retake_attempts;

-- Users can view their own retake attempts
create policy "Users can view own retake_attempts"
  on public.retake_attempts
  for select
  using (auth.uid() = user_id);

-- Users can insert their own retake attempts
create policy "Users can insert own retake_attempts"
  on public.retake_attempts
  for insert
  with check (auth.uid() = user_id);

-- Admins (role = 0) can view all students' retake attempts
create policy "Admins can view all retake_attempts"
  on public.retake_attempts
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 0
    )
  );

-- Performance Indexes
create index if not exists idx_retake_attempts_user_id 
  on public.retake_attempts(user_id);

create index if not exists idx_retake_attempts_grade_term 
  on public.retake_attempts(grade, term);

create index if not exists idx_retake_attempts_completed_at 
  on public.retake_attempts(completed_at desc);

create index if not exists idx_retake_attempts_take_number 
  on public.retake_attempts(take_number);

-- Add columns if table was created previously without multiple take columns
alter table public.retake_attempts add column if not exists take_number integer default 2;
alter table public.retake_attempts add column if not exists previous_score integer default 0;
alter table public.retake_attempts add column if not exists previous_percentage numeric(5, 2) default 0.00;
alter table public.retake_attempts add column if not exists cumulative_score integer default 0;
alter table public.retake_attempts add column if not exists cumulative_percentage numeric(5, 2) default 0.00;

-- Optional compatibility columns for assessment_attempts if used as fallback
alter table public.assessment_attempts add column if not exists take_number integer default 1;
alter table public.assessment_attempts add column if not exists initial_score integer default 0;
alter table public.assessment_attempts add column if not exists initial_total integer default 0;
alter table public.assessment_attempts add column if not exists initial_percentage numeric(5, 2) default 0.00;
alter table public.assessment_attempts add column if not exists improvement_percentage numeric(5, 2) default 0.00;

