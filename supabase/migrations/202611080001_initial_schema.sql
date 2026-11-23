-- Initial schema for Saldo Claro.
-- Stores only user-entered balances, planned bills, and manually recorded expenses.
-- No bank credentials, card numbers, or bank connections are stored.

create type public.money_source_kind as enum (
  'bank_account',
  'benefit'
);

create type public.bill_occurrence_status as enum (
  'pending',
  'paid',
  'skipped'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.money_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  kind public.money_source_kind not null,
  currency text not null default 'CLP'
    check (currency ~ '^[A-Z]{3}$'),
  can_pay_bills boolean not null default true,
  restriction_note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.balance_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  money_source_id uuid not null,
  amount numeric(14, 0) not null check (amount >= 0),
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (user_id, money_source_id)
    references public.money_sources (user_id, id)
    on delete cascade,
  unique (user_id, id)
);

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, name)
);

create table public.quick_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null,
  label text not null check (length(trim(label)) > 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (user_id, category_id)
    references public.expense_categories (user_id, id)
    on delete cascade,
  unique (user_id, id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  money_source_id uuid,
  category_id uuid not null,
  quick_preset_id uuid,
  label text not null check (length(trim(label)) > 0),
  amount numeric(14, 0) not null check (amount > 0),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (user_id, money_source_id)
    references public.money_sources (user_id, id)
    on delete cascade,
  foreign key (user_id, category_id)
    references public.expense_categories (user_id, id)
    on delete cascade,
  foreign key (user_id, quick_preset_id)
    references public.quick_presets (user_id, id)
    on delete set null (quick_preset_id)
);

create table public.bill_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  money_source_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  estimated_amount numeric(14, 0) not null check (estimated_amount > 0),
  recurrence text not null default 'monthly'
    check (recurrence = 'monthly'),
  day_of_month smallint not null
    check (day_of_month between 1 and 31),
  starts_on date not null,
  ends_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (user_id, money_source_id)
    references public.money_sources (user_id, id)
    on delete cascade,
  unique (user_id, id),
  check (ends_on is null or ends_on >= starts_on)
);

create table public.bill_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  money_source_id uuid not null,
  rule_id uuid,
  name text not null check (length(trim(name)) > 0),
  amount numeric(14, 0) not null check (amount > 0),
  due_on date not null,
  period_month date not null
    check (extract(day from period_month) = 1),
  status public.bill_occurrence_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (user_id, money_source_id)
    references public.money_sources (user_id, id)
    on delete cascade,
  foreign key (user_id, rule_id)
    references public.bill_rules (user_id, id)
    on delete cascade,
  check ((status = 'paid') = (paid_at is not null))
);

-- Only one generated bill per recurring rule and month.
create unique index bill_occurrences_rule_month_unique
  on public.bill_occurrences (rule_id, period_month)
  where rule_id is not null;

create index money_sources_user_active_idx
  on public.money_sources (user_id, is_active);
create index balance_snapshots_source_captured_idx
  on public.balance_snapshots (user_id, money_source_id, captured_at desc);
create index expense_categories_user_active_idx
  on public.expense_categories (user_id, is_active, sort_order);
create index quick_presets_user_active_idx
  on public.quick_presets (user_id, is_active, sort_order);
create index expenses_user_occurred_idx
  on public.expenses (user_id, occurred_at desc);
create index expenses_source_occurred_idx
  on public.expenses (user_id, money_source_id, occurred_at desc);
create index expenses_category_occurred_idx
  on public.expenses (user_id, category_id, occurred_at desc);
create index bill_rules_user_active_idx
  on public.bill_rules (user_id, is_active);
create index bill_occurrences_source_due_idx
  on public.bill_occurrences (user_id, money_source_id, due_on, status);

-- Prevent assigning bills to a source that is not allowed to cover them.
create function public.ensure_bill_source_can_pay()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if not exists (
    select 1
    from public.money_sources as source
    where source.id = new.money_source_id
      and source.user_id = new.user_id
      and source.can_pay_bills
  ) then
    raise exception using
      errcode = '23514',
      message = 'This money source cannot be assigned to bills.';
  end if;

  return new;
end;
$function$;

create trigger bill_rules_check_source
  before insert or update on public.bill_rules
  for each row execute function public.ensure_bill_source_can_pay();

create trigger bill_occurrences_check_source
  before insert or update on public.bill_occurrences
  for each row execute function public.ensure_bill_source_can_pay();

-- Keep active recurring rules and pending bills on eligible sources.
create function public.ensure_source_can_be_restricted()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if old.can_pay_bills and not new.can_pay_bills and (
    exists (
      select 1
      from public.bill_rules as rule
      where rule.user_id = new.user_id
        and rule.money_source_id = new.id
        and rule.is_active
    )
    or exists (
      select 1
      from public.bill_occurrences as occurrence
      where occurrence.user_id = new.user_id
        and occurrence.money_source_id = new.id
        and occurrence.status = 'pending'
    )
  ) then
    raise exception using
      errcode = '23514',
      message = 'Reassign or deactivate bills before restricting this money source.';
  end if;

  return new;
end;
$function$;

create trigger money_sources_check_bill_restriction
  before update of can_pay_bills on public.money_sources
  for each row execute function public.ensure_source_can_be_restricted();

-- Create an app profile when Supabase Auth creates a user.
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  );

  with created_categories as (
    insert into public.expense_categories (user_id, name, sort_order)
    values
      (new.id, 'Compras pequeñas', 0),
      (new.id, 'Colación', 1),
      (new.id, 'Transporte', 2),
      (new.id, 'Otros', 3)
    returning id, name
  )
  insert into public.quick_presets (user_id, category_id, label, sort_order)
  select new.id, category.id, preset.label, preset.sort_order
  from created_categories as category
  join (values
    ('Compras pequeñas', 'Chocolate', 0),
    ('Compras pequeñas', 'Bebida', 1),
    ('Colación', 'Colación', 0),
    ('Transporte', 'Transporte', 0),
    ('Otros', 'Otro gasto', 0)
  ) as preset(category_name, label, sort_order)
    on preset.category_name = category.name;

  return new;
end;
$function$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

-- Idempotently materialize the selected month for active monthly bill rules.
create function public.ensure_monthly_bill_occurrences(p_period_month date)
returns void
language plpgsql
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if p_period_month is null or extract(day from p_period_month) <> 1 then
    raise exception using errcode = '22023', message = 'The period must be the first day of a month.';
  end if;

  insert into public.bill_occurrences (
    user_id,
    money_source_id,
    rule_id,
    name,
    amount,
    due_on,
    period_month
  )
  select
    rule.user_id,
    rule.money_source_id,
    rule.id,
    rule.name,
    rule.estimated_amount,
    make_date(
      extract(year from p_period_month)::integer,
      extract(month from p_period_month)::integer,
      least(
        rule.day_of_month::integer,
        extract(day from (p_period_month + interval '1 month - 1 day'))::integer
      )
    ),
    p_period_month
  from public.bill_rules as rule
  where rule.user_id = auth.uid()
    and rule.is_active
    and p_period_month + interval '1 month - 1 day' >= rule.starts_on
    and (rule.ends_on is null or p_period_month <= rule.ends_on)
  on conflict (rule_id, period_month) where rule_id is not null do nothing;
end;
$function$;

revoke all on function public.ensure_monthly_bill_occurrences(date) from public, anon;
grant execute on function public.ensure_monthly_bill_occurrences(date) to authenticated;

-- Keep source creation and its opening balance in one transaction.
create function public.create_money_source(
  p_name text,
  p_kind public.money_source_kind,
  p_initial_balance numeric,
  p_can_pay_bills boolean,
  p_restriction_note text default null
)
returns uuid
language plpgsql
set search_path = ''
as $function$
declare
  new_source_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  insert into public.money_sources (
    user_id, name, kind, can_pay_bills, restriction_note
  ) values (
    auth.uid(), trim(p_name), p_kind, p_can_pay_bills, nullif(trim(p_restriction_note), '')
  ) returning id into new_source_id;

  insert into public.balance_snapshots (user_id, money_source_id, amount)
  values (auth.uid(), new_source_id, p_initial_balance);

  return new_source_id;
end;
$function$;

revoke all on function public.create_money_source(text, public.money_source_kind, numeric, boolean, text) from public, anon;
grant execute on function public.create_money_source(text, public.money_source_kind, numeric, boolean, text) to authenticated;

-- Save a bill and, for recurring bills, its monthly rule atomically.
create function public.create_bill(
  p_name text,
  p_amount numeric,
  p_due_on date,
  p_money_source_id uuid,
  p_frequency text
)
returns uuid
language plpgsql
set search_path = ''
as $function$
declare
  new_occurrence_id uuid;
  new_rule_id uuid;
  period_start date := date_trunc('month', p_due_on)::date;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if p_frequency is null or p_frequency not in ('monthly', 'once') then
    raise exception using errcode = '22023', message = 'Frequency must be monthly or once.';
  end if;

  if p_frequency = 'monthly' then
    insert into public.bill_rules (
      user_id, money_source_id, name, estimated_amount, recurrence, day_of_month, starts_on
    ) values (
      auth.uid(), p_money_source_id, trim(p_name), p_amount, 'monthly', extract(day from p_due_on)::smallint, p_due_on
    ) returning id into new_rule_id;
  end if;

  insert into public.bill_occurrences (
    user_id, money_source_id, rule_id, name, amount, due_on, period_month
  ) values (
    auth.uid(), p_money_source_id, new_rule_id, trim(p_name), p_amount, p_due_on, period_start
  ) returning id into new_occurrence_id;

  return new_occurrence_id;
end;
$function$;

revoke all on function public.create_bill(text, numeric, date, uuid, text) from public, anon;
grant execute on function public.create_bill(text, numeric, date, uuid, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.money_sources enable row level security;
alter table public.balance_snapshots enable row level security;
alter table public.expense_categories enable row level security;
alter table public.quick_presets enable row level security;
alter table public.expenses enable row level security;
alter table public.bill_rules enable row level security;
alter table public.bill_occurrences enable row level security;

create policy profiles_select_own
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_insert_own
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy profiles_update_own
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy money_sources_select_own
  on public.money_sources for select to authenticated
  using ((select auth.uid()) = user_id);
create policy money_sources_insert_own
  on public.money_sources for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy money_sources_update_own
  on public.money_sources for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy balance_snapshots_manage_own
  on public.balance_snapshots for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy expense_categories_select_own
  on public.expense_categories for select to authenticated
  using ((select auth.uid()) = user_id);
create policy expense_categories_insert_own
  on public.expense_categories for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy expense_categories_update_own
  on public.expense_categories for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy quick_presets_manage_own
  on public.quick_presets for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy expenses_manage_own
  on public.expenses for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy bill_rules_select_own
  on public.bill_rules for select to authenticated
  using ((select auth.uid()) = user_id);
create policy bill_rules_insert_own
  on public.bill_rules for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy bill_rules_update_own
  on public.bill_rules for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy bill_occurrences_manage_own
  on public.bill_occurrences for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.profiles,
  public.money_sources,
  public.balance_snapshots,
  public.expense_categories,
  public.quick_presets,
  public.expenses,
  public.bill_rules,
  public.bill_occurrences
from anon;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.money_sources to authenticated;
grant select, insert, update, delete on public.balance_snapshots to authenticated;
grant select, insert, update on public.expense_categories to authenticated;
grant select, insert, update, delete on public.quick_presets to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;
grant select, insert, update on public.bill_rules to authenticated;
grant select, insert, update, delete on public.bill_occurrences to authenticated;
