create table if not exists public.student_submissions (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  created_at timestamptz not null default now(),
  submitted_at timestamptz not null,
  student_id text not null,
  student_name text,
  submission_type text not null check (submission_type in ('lesson', 'match')),
  lesson_date date,
  lesson_title text,
  payload jsonb not null,
  status text not null default 'new'
);

create index if not exists student_submissions_student_time_idx
  on public.student_submissions (student_id, submitted_at desc);

create index if not exists student_submissions_type_time_idx
  on public.student_submissions (submission_type, submitted_at desc);

alter table public.student_submissions enable row level security;

-- The website writes and reads this table through server-side API routes with
-- SUPABASE_SERVICE_ROLE_KEY. Do not expose the service role key in browser code.
