-- Run this once in the Supabase SQL Editor for an existing BuyNova database.
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  order_number text,
  message text not null,
  status text not null default 'new' check (status in ('new','in_progress','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_messages_created_at_idx on public.support_messages(created_at desc);
create index if not exists support_messages_status_idx on public.support_messages(status);
alter table public.support_messages enable row level security;
revoke all on table public.support_messages from anon, authenticated;
