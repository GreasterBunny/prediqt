-- Prediqt Database Schema
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard → SQL Editor

-- Stocks
create table if not exists stocks (
  id uuid primary key default gen_random_uuid(),
  ticker text not null unique,
  name text not null,
  created_at timestamptz default now()
);

-- Prices (OHLCV)
create table if not exists prices (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references stocks(id) on delete cascade,
  timestamp timestamptz not null,
  open float not null,
  high float not null,
  low float not null,
  close float not null,
  volume float not null,
  unique(stock_id, timestamp)
);

create index if not exists prices_stock_timestamp on prices(stock_id, timestamp desc);

-- Technical Indicators (one row per stock, updated on each run)
create table if not exists indicators (
  stock_id uuid primary key references stocks(id) on delete cascade,
  rsi float,
  macd float,
  sma_50 float,
  sma_200 float,
  updated_at timestamptz default now()
);

-- Predictions
create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  stock_id uuid not null references stocks(id) on delete cascade,
  timestamp timestamptz not null default now(),
  prediction text not null check (prediction in ('up', 'down')),
  confidence float not null check (confidence >= 0 and confidence <= 1),
  model_version text not null default 'v1.0',
  actual text check (actual in ('up', 'down'))  -- filled in after the fact
);

create index if not exists predictions_stock_timestamp on predictions(stock_id, timestamp desc);

-- Seed: initial stocks
insert into stocks (ticker, name) values
  ('AAPL', 'Apple Inc.'),
  ('MSFT', 'Microsoft Corp.'),
  ('NVDA', 'NVIDIA Corp.'),
  ('GOOG', 'Alphabet Inc.'),
  ('AMZN', 'Amazon.com Inc.'),
  ('META', 'Meta Platforms Inc.')
on conflict (ticker) do nothing;

-- ── Paper Trading ──────────────────────────────────────────────
create table if not exists paper_wallet (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  started_at timestamptz default now(),
  initial_balance float not null default 10000,
  cash_balance float not null default 10000,
  experiment_days int not null default 10,
  is_active boolean not null default true
);

create table if not exists paper_trades (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references paper_wallet(id) on delete cascade,
  stock_id uuid not null references stocks(id),
  direction text not null check (direction in ('long', 'short')) default 'long',
  status text not null check (status in ('open', 'closed')) default 'open',
  opened_at timestamptz not null default now(),
  entry_price float not null,
  shares float not null,
  cost_basis float not null,
  entry_confidence float not null,
  entry_prediction text not null check (entry_prediction in ('up', 'down')),
  closed_at timestamptz,
  exit_price float,
  proceeds float,
  pnl float,
  pnl_pct float,
  close_reason text
);

create table if not exists paper_snapshots (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references paper_wallet(id) on delete cascade,
  snapshot_date date not null,
  portfolio_value float not null,
  cash_balance float not null,
  realized_pnl float not null default 0,
  unrealized_pnl float not null default 0,
  unique(wallet_id, snapshot_date)
);
