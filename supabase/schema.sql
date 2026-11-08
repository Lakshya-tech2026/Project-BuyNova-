-- BuyNova production database schema
create extension if not exists pgcrypto;

create table if not exists public.products (
  id bigint primary key,
  name text not null,
  category text not null,
  price_inr integer not null check (price_inr >= 0),
  compare_at_price_inr integer,
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  address text,
  city text,
  state text,
  pincode text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_id uuid references public.customers(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','paid','processing','shipped','delivered','cancelled','payment_failed')),
  payment_status text not null default 'created' check (payment_status in ('created','paid','failed','refunded')),
  currency text not null default 'INR',
  subtotal_inr integer not null check (subtotal_inr >= 0),
  total_inr integer not null check (total_inr >= 0),
  -- Legacy gateway columns retained for compatibility with older databases.
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  payment_method text,
  shipping_address jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id bigint not null references public.products(id),
  product_name text not null,
  unit_price_inr integer not null,
  quantity integer not null check (quantity > 0),
  line_total_inr integer not null
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'cod',
  provider_order_id text,
  provider_payment_id text unique,
  amount_inr integer not null,
  status text not null default 'created' check (status in ('created','authorized','captured','failed','refunded')),
  raw_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists payments_order_id_idx on public.payments(order_id);

-- Seed the starter catalog. Replace/update these products with your real catalogue.
insert into public.products (id,name,category,price_inr,compare_at_price_inr,stock,active) values
(1,'BuyNova Everyday Pack','Essentials',799,999,100,true),
(2,'BuyNova Urban Kit','Lifestyle',999,1299,100,true),
(3,'BuyNova Pro Bundle','Premium',1799,2199,50,true),
(4,'BuyNova Mini Organizer','Essentials',599,799,100,true),
(5,'BuyNova Travel Set','Travel',699,899,75,true),
(6,'BuyNova Daily Bottle','Lifestyle',499,699,100,true),
(7,'BuyNova Executive Kit','Premium',1299,1599,50,true),
(8,'BuyNova Signature Set','Premium',1599,1999,50,true)
on conflict (id) do nothing;

-- Security: all exposed tables are RLS-protected. Server-side service/secret keys are used by API routes.
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;

-- Public storefront can read active products only.
drop policy if exists "public can read active products" on public.products;
create policy "public can read active products" on public.products for select to anon, authenticated using (active = true);

-- Customer/order/payment data is intentionally not exposed to the browser directly.
revoke all on table public.customers, public.orders, public.order_items, public.payments from anon, authenticated;

-- New orders in the current store use COD until Google Pay merchant onboarding is complete.
alter table if exists public.payments alter column provider set default 'cod';

-- Customer support messages submitted through /contact/.
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
