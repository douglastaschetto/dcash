-- =============================================================================
-- DCash v2 — ajustes de banco (migrations 0001 → 0010) para aplicação manual
-- Gerado em 2026-10-07 a partir de apps/backend/src/database/migrations/
--
-- • Idempotente: pode rodar mais de uma vez (IF NOT EXISTS / DROP IF EXISTS).
-- • Tudo numa transação: se algo falhar, nada é aplicado.
-- • No final registra as migrations em db_dtasc.typeorm_migrations, para o
--   TypeORM não tentar rodá-las de novo.
--
-- Uso:  psql -h <host> -U <user> -d <db> -v ON_ERROR_STOP=1 -f baseline-ajustes.sql
-- Pré-requisito: o schema base (baseline.sql) já existe no banco.
-- =============================================================================

BEGIN;

SET search_path TO db_dtasc, public;

-- -----------------------------------------------------------------------------
-- 0001 · SecurityAndDataFixes — reset de senha, investimentos, conciliação OFX
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS db_dtasc.password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL REFERENCES db_dtasc.users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMP NOT NULL,
  used_at     TIMESTAMP,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON db_dtasc.password_reset_tokens(user_id);

CREATE TABLE IF NOT EXISTS db_dtasc.investments (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES db_dtasc.users(id) ON DELETE CASCADE,
  family_group_id  TEXT REFERENCES db_dtasc.family_groups(id) ON DELETE SET NULL,
  ticker           TEXT NOT NULL,
  company_name     TEXT,
  quantity         NUMERIC NOT NULL DEFAULT 0,
  avg_price        NUMERIC NOT NULL DEFAULT 0,
  target_buy       NUMERIC,
  target_sell      NUMERIC,
  notes            TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ticker)
);
ALTER TABLE db_dtasc.investments
  ADD COLUMN IF NOT EXISTS family_group_id TEXT REFERENCES db_dtasc.family_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_investments_family ON db_dtasc.investments(family_group_id);

CREATE TABLE IF NOT EXISTS db_dtasc.investment_alerts (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES db_dtasc.users(id) ON DELETE CASCADE,
  family_group_id  TEXT REFERENCES db_dtasc.family_groups(id) ON DELETE SET NULL,
  ticker           TEXT NOT NULL,
  target_price     NUMERIC NOT NULL,
  direction        TEXT NOT NULL,
  message          TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  triggered_at     TIMESTAMP,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE db_dtasc.investment_alerts
  ADD COLUMN IF NOT EXISTS family_group_id TEXT REFERENCES db_dtasc.family_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_investment_alerts_family ON db_dtasc.investment_alerts(family_group_id);

CREATE TABLE IF NOT EXISTS db_dtasc.reconciliation_staging (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL,
  family_group_id   TEXT,
  payment_method_id TEXT,
  transaction_date  DATE NOT NULL,
  description       TEXT NOT NULL,
  amount            NUMERIC NOT NULL,
  import_hash       TEXT UNIQUE NOT NULL,
  status            TEXT NOT NULL DEFAULT 'PENDING'
);

ALTER TABLE db_dtasc.transactions ADD COLUMN IF NOT EXISTS import_hash TEXT;

-- -----------------------------------------------------------------------------
-- 0002 · SubscriptionBilling — ciclo de assinatura (Stripe)
-- -----------------------------------------------------------------------------
ALTER TABLE db_dtasc.users
  ADD COLUMN IF NOT EXISTS plan_billing_cycle     TEXT,
  ADD COLUMN IF NOT EXISTS plan_expires_at        TIMESTAMP,
  ADD COLUMN IF NOT EXISTS plan_status            TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON db_dtasc.users(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id     ON db_dtasc.users(stripe_customer_id);

-- -----------------------------------------------------------------------------
-- 0003 · DcaosModule — add-ons, tarefas da casa, despensa, recados, notificações
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS db_dtasc.addon_subscriptions (
  id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  addon                  TEXT NOT NULL,
  user_id                TEXT NOT NULL,
  family_group_id        TEXT,
  status                 TEXT NOT NULL DEFAULT 'active',
  billing_cycle          TEXT,
  expires_at             TIMESTAMP,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_addon_subs_family ON db_dtasc.addon_subscriptions(addon, family_group_id);
CREATE INDEX IF NOT EXISTS idx_addon_subs_user   ON db_dtasc.addon_subscriptions(addon, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_addon_subs_stripe
  ON db_dtasc.addon_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE db_dtasc.todo
  ADD COLUMN IF NOT EXISTS notes        TEXT,
  ADD COLUMN IF NOT EXISTS assignee_id  TEXT,
  ADD COLUMN IF NOT EXISTS created_by   TEXT,
  ADD COLUMN IF NOT EXISTS due_date     DATE,
  ADD COLUMN IF NOT EXISTS recurrence   TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS points       INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS area         TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by TEXT;
CREATE INDEX IF NOT EXISTS idx_todo_assignee ON db_dtasc.todo(assignee_id) WHERE is_completed = false;

CREATE TABLE IF NOT EXISTS db_dtasc.dcaos_task_log (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id         TEXT,
  title           TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  family_group_id TEXT,
  points          INTEGER NOT NULL DEFAULT 1,
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dcaos_task_log_scope ON db_dtasc.dcaos_task_log(family_group_id, completed_at);

CREATE TABLE IF NOT EXISTS db_dtasc.dcaos_pantry_items (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name            TEXT NOT NULL,
  category        TEXT,
  unit            TEXT,
  quantity        NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_quantity    NUMERIC(10,2),
  on_list         BOOLEAN NOT NULL DEFAULT false,
  list_quantity   NUMERIC(10,2) NOT NULL DEFAULT 1,
  checked         BOOLEAN NOT NULL DEFAULT false,
  times_ran_out   INTEGER NOT NULL DEFAULT 0,
  last_bought_at  TIMESTAMPTZ,
  added_by        TEXT,
  user_id         TEXT NOT NULL,
  family_group_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dcaos_pantry_scope ON db_dtasc.dcaos_pantry_items(family_group_id, user_id);

CREATE TABLE IF NOT EXISTS db_dtasc.dcaos_notes (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  author_id       TEXT NOT NULL,
  recipient_id    TEXT,
  message         TEXT NOT NULL,
  color           TEXT NOT NULL DEFAULT 'yellow',
  pinned          BOOLEAN NOT NULL DEFAULT false,
  read_by         TEXT[] NOT NULL DEFAULT '{}',
  reactions       JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_id         TEXT NOT NULL,
  family_group_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dcaos_notes_scope ON db_dtasc.dcaos_notes(family_group_id, created_at);

CREATE TABLE IF NOT EXISTS db_dtasc.dcaos_notifications (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id         TEXT NOT NULL,
  family_group_id TEXT,
  module          TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  link            TEXT,
  dedupe_key      TEXT,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dcaos_notif_user ON db_dtasc.dcaos_notifications(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_dcaos_notif_dedupe
  ON db_dtasc.dcaos_notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 0004 · DcaosPhase2 — agenda compartilhada, hábitos, datas, manutenção
-- -----------------------------------------------------------------------------
ALTER TABLE db_dtasc.calendar_event
  ADD COLUMN IF NOT EXISTS participant_ids TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_by      TEXT;

CREATE TABLE IF NOT EXISTS db_dtasc.dcaos_habits (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title           TEXT NOT NULL,
  icon            TEXT,
  days_of_week    INTEGER[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  reminder_time   TEXT,
  assignee_id     TEXT,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_by      TEXT,
  user_id         TEXT NOT NULL,
  family_group_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dcaos_habits_scope ON db_dtasc.dcaos_habits(family_group_id, user_id);

CREATE TABLE IF NOT EXISTS db_dtasc.dcaos_habit_checks (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  habit_id   TEXT NOT NULL REFERENCES db_dtasc.dcaos_habits(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL,
  check_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (habit_id, check_date)
);

CREATE TABLE IF NOT EXISTS db_dtasc.dcaos_important_dates (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title              TEXT NOT NULL,
  person_name        TEXT,
  kind               TEXT NOT NULL DEFAULT 'birthday',
  event_date         DATE NOT NULL,
  year_known         BOOLEAN NOT NULL DEFAULT true,
  yearly             BOOLEAN NOT NULL DEFAULT true,
  remind_days_before INTEGER NOT NULL DEFAULT 3,
  notes              TEXT,
  created_by         TEXT,
  user_id            TEXT NOT NULL,
  family_group_id    TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dcaos_dates_scope ON db_dtasc.dcaos_important_dates(family_group_id, user_id);

CREATE TABLE IF NOT EXISTS db_dtasc.dcaos_maintenance (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title           TEXT NOT NULL,
  description     TEXT,
  kind            TEXT NOT NULL DEFAULT 'issue',
  area            TEXT,
  priority        TEXT NOT NULL DEFAULT 'medium',
  status          TEXT NOT NULL DEFAULT 'open',
  assignee_id     TEXT,
  professional    TEXT,
  cost            NUMERIC(12,2),
  interval_months INTEGER,
  next_due        DATE,
  reported_by     TEXT,
  resolved_by     TEXT,
  resolved_at     TIMESTAMPTZ,
  user_id         TEXT NOT NULL,
  family_group_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dcaos_maint_scope ON db_dtasc.dcaos_maintenance(family_group_id, user_id);

-- -----------------------------------------------------------------------------
-- 0005 · DcaosPush — inscrições de push (PWA) e preferências de notificação
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS db_dtasc.push_subscriptions (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id      TEXT NOT NULL,
  endpoint     TEXT NOT NULL UNIQUE,
  p256dh       TEXT NOT NULL,
  auth         TEXT NOT NULL,
  user_agent   TEXT,
  failures     INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON db_dtasc.push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS db_dtasc.dcaos_notification_prefs (
  user_id       TEXT PRIMARY KEY,
  push_enabled  BOOLEAN NOT NULL DEFAULT true,
  muted_modules TEXT[] NOT NULL DEFAULT '{}',
  quiet_start   TEXT,
  quiet_end     TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 0006 · DcaosTaskWeekdays — tarefas recorrentes em dias da semana
-- -----------------------------------------------------------------------------
ALTER TABLE db_dtasc.todo ADD COLUMN IF NOT EXISTS recurrence_days INTEGER[] NOT NULL DEFAULT '{}';

-- -----------------------------------------------------------------------------
-- 0007 · DcaosPantryShelfLife — validade média dos itens da despensa
-- -----------------------------------------------------------------------------
ALTER TABLE db_dtasc.dcaos_pantry_items ADD COLUMN IF NOT EXISTS shelf_life_days INTEGER NULL;

-- -----------------------------------------------------------------------------
-- 0008 · AuthEmailCodes — 2FA por e-mail e dispositivos confiáveis
-- (usuários existentes ficam com email_verified = true)
-- -----------------------------------------------------------------------------
ALTER TABLE db_dtasc.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS db_dtasc.auth_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL REFERENCES db_dtasc.users(id) ON DELETE CASCADE,
  purpose     TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_codes_user_purpose ON db_dtasc.auth_codes(user_id, purpose, created_at DESC);

CREATE TABLE IF NOT EXISTS db_dtasc.trusted_devices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL REFERENCES db_dtasc.users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  user_agent   TEXT,
  expires_at   TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON db_dtasc.trusted_devices(user_id);

-- -----------------------------------------------------------------------------
-- 0009 · PasswordChangedAt — invalida sessões antigas após troca de senha
-- -----------------------------------------------------------------------------
ALTER TABLE db_dtasc.users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ NULL;

-- -----------------------------------------------------------------------------
-- 0010 · OAuthExchangeCode — código de uso único no login com Google
-- (a constraint de purpose já sai aqui na versão final, com 'oauth')
-- -----------------------------------------------------------------------------
ALTER TABLE db_dtasc.auth_codes DROP CONSTRAINT IF EXISTS auth_codes_purpose_check;
ALTER TABLE db_dtasc.auth_codes ADD CONSTRAINT auth_codes_purpose_check
  CHECK (purpose IN ('verify_email', 'login', 'reset_password', 'oauth'));
ALTER TABLE db_dtasc.auth_codes ADD COLUMN IF NOT EXISTS meta JSONB;
CREATE INDEX IF NOT EXISTS idx_auth_codes_hash ON db_dtasc.auth_codes(code_hash);

-- -----------------------------------------------------------------------------
-- Histórico do TypeORM — marca 0000 → 0010 como aplicadas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS db_dtasc.typeorm_migrations (
  id          SERIAL PRIMARY KEY,
  "timestamp" BIGINT NOT NULL,
  name        VARCHAR NOT NULL
);

INSERT INTO db_dtasc.typeorm_migrations ("timestamp", name)
SELECT v.ts, v.name
FROM (VALUES
  (1755600000000::bigint, 'Baseline1755600000000'),
  (1755600000001::bigint, 'SecurityAndDataFixes1755600000001'),
  (1755600000002::bigint, 'SubscriptionBilling1755600000002'),
  (1755600000003::bigint, 'DcaosModule1755600000003'),
  (1755600000004::bigint, 'DcaosPhase21755600000004'),
  (1755600000005::bigint, 'DcaosPush1755600000005'),
  (1755600000006::bigint, 'DcaosTaskWeekdays1755600000006'),
  (1755600000007::bigint, 'DcaosPantryShelfLife1755600000007'),
  (1755600000008::bigint, 'AuthEmailCodes1755600000008'),
  (1755600000009::bigint, 'PasswordChangedAt1755600000009'),
  (1755600000010::bigint, 'OAuthExchangeCode1755600000010')
) AS v(ts, name)
WHERE NOT EXISTS (SELECT 1 FROM db_dtasc.typeorm_migrations m WHERE m.name = v.name)
ORDER BY v.ts;

COMMIT;

-- Conferência rápida (opcional):
-- SELECT name FROM db_dtasc.typeorm_migrations ORDER BY "timestamp";
-- SELECT column_name FROM information_schema.columns
--  WHERE table_schema = 'db_dtasc' AND table_name = 'users'
--    AND column_name IN ('password_changed_at', 'email_verified');
