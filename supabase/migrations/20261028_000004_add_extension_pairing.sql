-- Stage 7: browser extension pairing and user-confirmed webpage clips.
-- No plaintext pairing token is stored. The RPC only accepts a SHA-256 hash.

create table if not exists public.extension_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create unique index if not exists extension_tokens_token_hash_uidx
on public.extension_tokens (token_hash);

create index if not exists extension_tokens_user_created_idx
on public.extension_tokens (user_id, created_at desc);

alter table public.extension_tokens enable row level security;

create policy "extension_tokens_select_own"
on public.extension_tokens
for select
to authenticated
using (user_id = auth.uid());

create policy "extension_tokens_insert_own"
on public.extension_tokens
for insert
to authenticated
with check (user_id = auth.uid());

create policy "extension_tokens_update_own"
on public.extension_tokens
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Only revoked_at may change after creation. Tokens cannot be re-enabled.
create or replace function public.protect_extension_token_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id <> old.user_id
    or new.token_hash <> old.token_hash
    or new.created_at <> old.created_at then
    raise exception 'extension token ownership fields are immutable'
      using errcode = '42501';
  end if;

  if old.revoked_at is not null
    and (new.revoked_at is null or new.revoked_at <> old.revoked_at) then
    raise exception 'revoked extension tokens are immutable'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists extension_tokens_protect_fields on public.extension_tokens;

create trigger extension_tokens_protect_fields
before update on public.extension_tokens
for each row
execute function public.protect_extension_token_fields();

-- A webpage may be clipped multiple times. Keep uniqueness for file imports
-- and WeRead syncing, but not for independent extension clips.
drop index if exists public.notes_user_source_uidx;

create unique index if not exists notes_user_source_uidx
on public.notes (user_id, source_type, source_id)
where source_type in ('pdf', 'text', 'weread')
  and source_id is not null;

create or replace function public.verify_and_create_clip(
  p_token_hash text,
  p_title text,
  p_url text,
  p_content text,
  p_reflection text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_note_id uuid;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid pairing token'
      using errcode = 'P0001';
  end if;

  if p_title is null
    or char_length(btrim(p_title)) = 0
    or char_length(p_title) > 200 then
    raise exception 'invalid clip title'
      using errcode = '22023';
  end if;

  if p_url is null
    or char_length(p_url) > 2048
    or p_url !~* '^https?://' then
    raise exception 'invalid clip url'
      using errcode = '22023';
  end if;

  if p_content is null
    or char_length(btrim(p_content)) = 0
    or char_length(p_content) > 100000 then
    raise exception 'invalid clip content'
      using errcode = '22023';
  end if;

  if p_reflection is not null and char_length(p_reflection) > 20000 then
    raise exception 'invalid clip reflection'
      using errcode = '22023';
  end if;

  select et.user_id
  into v_user_id
  from public.extension_tokens et
  where et.token_hash = lower(p_token_hash)
    and et.revoked_at is null
  limit 1;

  if v_user_id is null then
    raise exception 'invalid or revoked pairing token'
      using errcode = 'P0001';
  end if;

  insert into public.notes (
    user_id,
    title,
    summary,
    reflection,
    content,
    visibility,
    source_type,
    source_id
  )
  values (
    v_user_id,
    btrim(p_title),
    null,
    nullif(btrim(coalesce(p_reflection, '')), ''),
    btrim(p_content),
    'private',
    'extension',
    btrim(p_url)
  )
  returning id into v_note_id;

  return v_note_id;
end;
$$;

revoke all on function public.verify_and_create_clip(text, text, text, text, text)
from public;

grant execute on function public.verify_and_create_clip(text, text, text, text, text)
to anon, authenticated;
