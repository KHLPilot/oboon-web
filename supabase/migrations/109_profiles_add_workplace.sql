alter table public.profiles
  add column if not exists workplace_type text check (workplace_type in ('station', 'district')),
  add column if not exists workplace_code text,
  add column if not exists workplace_label text,
  add column if not exists workplace_lat double precision,
  add column if not exists workplace_lng double precision;
