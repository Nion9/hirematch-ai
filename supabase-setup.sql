-- HireMatch.AI — Supabase Schema
-- Paste this entire file into Supabase > SQL Editor > Run

-- Applications table
create table if not exists applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Job info
  job_title text,
  company text,
  job_description text not null,

  -- Resume snapshot
  resume_text text not null,

  -- Analysis results
  score integer,
  score_title text,
  score_desc text,
  strengths jsonb default '[]',
  missing_keywords jsonb default '[]',
  skills jsonb default '[]',
  improvements jsonb default '[]',
  cover_letter text,

  -- Tracking
  status text default 'analysed' check (status in ('analysed','applied','interviewing','offered','rejected','withdrawn'))
);

-- Enable Row Level Security
alter table applications enable row level security;

-- Users can only see their own applications
create policy "Users see own applications"
  on applications for select
  using (auth.uid() = user_id);

create policy "Users insert own applications"
  on applications for insert
  with check (auth.uid() = user_id);

create policy "Users update own applications"
  on applications for update
  using (auth.uid() = user_id);

create policy "Users delete own applications"
  on applications for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_applications_updated
  before update on applications
  for each row execute procedure handle_updated_at();
