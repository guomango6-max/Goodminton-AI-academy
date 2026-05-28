create table if not exists public.student_history_records (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  created_at timestamptz not null default now(),
  happened_at date,
  student_id text not null,
  student_name text,
  record_type text not null check (record_type in ('lesson_record', 'lesson_summary', 'match_review')),
  title text not null,
  payload jsonb not null,
  coach_feedback text,
  coach_liked boolean not null default false,
  coach_feedback_updated_at timestamptz,
  source text not null default 'website',
  status text not null default 'imported'
);

alter table public.student_history_records
  add column if not exists coach_feedback text;

alter table public.student_history_records
  add column if not exists coach_liked boolean not null default false;

alter table public.student_history_records
  add column if not exists coach_feedback_updated_at timestamptz;

create index if not exists student_history_records_student_time_idx
  on public.student_history_records (student_id, happened_at desc, created_at desc);

create index if not exists student_history_records_type_time_idx
  on public.student_history_records (record_type, happened_at desc, created_at desc);

alter table public.student_history_records enable row level security;

-- Intentionally no anon/auth policies: the app accesses this table only through
-- server-side routes with SUPABASE_SERVICE_ROLE_KEY.
