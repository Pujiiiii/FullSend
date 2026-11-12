-- Esquema de Base de Dades per a StatsTracker (Supabase)

-- 1. Habilitar l'extensió per a UUIDs si cal
create extension if not exists "uuid-ossp";

-- 2. Taula de definicions de les mètriques (les Stats personalitzades de cada usuari)
create table if not exists public.stat_definitions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    description text,
    icon text default '📊',
    color text default '#6366F1',
    type text not null check (type in ('counter', 'numeric', 'boolean', 'rating', 'route')),
    unit text,                          -- p.ex: "km", "h", "€", "L", "llibres"
    target_value numeric,               -- objectiu opcional (p.ex: 100)
    target_period text check (target_period in ('daily', 'weekly', 'monthly', 'yearly', null)),
    aggregation text default 'sum' check (aggregation in ('sum', 'count', 'avg', 'max', 'min')),
    fields_config jsonb default '[]'::jsonb, -- Configuració de camps extres (subcategories, preu, etc.)
    is_archived boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Taula de registres d'activitat (cada vegada que s'afegeix un valor, comptador o ruta)
create table if not exists public.stat_entries (
    id uuid default gen_random_uuid() primary key,
    stat_id uuid references public.stat_definitions(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    value numeric not null,
    note text,
    metadata jsonb default '{}'::jsonb, -- Valors dels camps extres: { subcategory, price, litres, speed, duration, etc. }
    recorded_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- MIGRACIÓ PER A TAULES EXISTENTS (Si ja havies executat la versió anterior)
alter table if exists public.stat_definitions add column if not exists fields_config jsonb default '[]'::jsonb;
alter table if exists public.stat_entries add column if not exists metadata jsonb default '{}'::jsonb;
alter table if exists public.stat_definitions drop constraint if exists stat_definitions_type_check;
alter table if exists public.stat_definitions add constraint stat_definitions_type_check check (type in ('counter', 'numeric', 'boolean', 'rating', 'route'));

-- 4. Índexs per a màxim rendiment en consultes i resums anuals
create index if not exists idx_stat_definitions_user on public.stat_definitions(user_id);
create index if not exists idx_stat_entries_user on public.stat_entries(user_id);
create index if not exists idx_stat_entries_stat_date on public.stat_entries(stat_id, recorded_at);
create index if not exists idx_stat_entries_recorded_at on public.stat_entries(recorded_at);

-- 5. Activar Row Level Security (RLS) per a privacitat total de cada usuari
alter table public.stat_definitions enable row level security;
alter table public.stat_entries enable row level security;

-- Polítiques per a stat_definitions
create policy "Users can view their own stat definitions"
    on public.stat_definitions for select
    using (auth.uid() = user_id);

create policy "Users can insert their own stat definitions"
    on public.stat_definitions for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own stat definitions"
    on public.stat_definitions for update
    using (auth.uid() = user_id);

create policy "Users can delete their own stat definitions"
    on public.stat_definitions for delete
    using (auth.uid() = user_id);

-- Polítiques per a stat_entries
create policy "Users can view their own entries"
    on public.stat_entries for select
    using (auth.uid() = user_id);

create policy "Users can insert their own entries"
    on public.stat_entries for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own entries"
    on public.stat_entries for update
    using (auth.uid() = user_id);

create policy "Users can delete their own entries"
    on public.stat_entries for delete
    using (auth.uid() = user_id);
