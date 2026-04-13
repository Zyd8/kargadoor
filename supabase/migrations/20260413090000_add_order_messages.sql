-- In-order chat between sender and assigned driver.
-- Run via Supabase migrations or SQL editor.

create table if not exists public."ORDER_MESSAGES" (
  "ID" uuid primary key default gen_random_uuid(),
  "PACKAGE_ID" uuid not null references public."PACKAGES"("ID") on delete cascade,
  "SENDER_ID" uuid not null references auth.users(id) on delete cascade,
  "MESSAGE" text not null check (char_length(trim("MESSAGE")) > 0 and char_length("MESSAGE") <= 2000),
  "CREATED_AT" timestamptz not null default now()
);

create index if not exists "ORDER_MESSAGES_PACKAGE_ID_CREATED_AT_IDX"
  on public."ORDER_MESSAGES" ("PACKAGE_ID", "CREATED_AT");

alter table public."ORDER_MESSAGES" enable row level security;

drop policy if exists "order_messages_select_participants" on public."ORDER_MESSAGES";
create policy "order_messages_select_participants"
  on public."ORDER_MESSAGES"
  for select
  using (
    exists (
      select 1
      from public."PACKAGES" p
      where p."ID" = "PACKAGE_ID"
        and auth.uid() in (p."SENDER_ID", p."DRIVER_ID")
    )
  );

drop policy if exists "order_messages_insert_participants" on public."ORDER_MESSAGES";
create policy "order_messages_insert_participants"
  on public."ORDER_MESSAGES"
  for insert
  with check (
    "SENDER_ID" = auth.uid()
    and exists (
      select 1
      from public."PACKAGES" p
      where p."ID" = "PACKAGE_ID"
        and auth.uid() in (p."SENDER_ID", p."DRIVER_ID")
    )
  );

