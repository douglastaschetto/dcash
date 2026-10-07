import { MigrationInterface, QueryRunner } from 'typeorm';

const SCHEMA = 'db_dtasc';

/**
 * DCaos — "gerenciador oficial da bagunça familiar" (paid add-on, phase 1).
 *
 * - `addon_subscriptions`: add-ons are billed separately from the DCash plan
 *   (users.plan). One active row per family (or per user without family)
 *   unlocks the module for every member. Stripe is the source of truth —
 *   rows are written by PaymentService's webhook handlers.
 * - `todo` gains the household-task fields used by "Quem Vai Fazer?". The
 *   table is extended (not duplicated) so DCash's existing to-do list and
 *   dashboard keep showing the same tasks.
 * - `dcaos_task_log`: one row per completion (recurring tasks complete many
 *   times) — feeds the household scoreboard.
 * - `dcaos_pantry_items`: pantry stock + shopping list ("Abastece Aí") in a
 *   single table; `on_list` moves an item to the shopping list.
 * - `dcaos_notes`: family notes ("Recados").
 * - `dcaos_notifications`: in-app feed ("O Sistema Lembrou"); `dedupe_key`
 *   keeps scheduled reminders from firing twice for the same occurrence.
 *   Device push (phase 3) will fan out from these same rows.
 */
export class DcaosModule1755600000003 implements MigrationInterface {
  name = 'DcaosModule1755600000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.addon_subscriptions (
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
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_addon_subs_family ON ${SCHEMA}.addon_subscriptions(addon, family_group_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_addon_subs_user ON ${SCHEMA}.addon_subscriptions(addon, user_id)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_addon_subs_stripe ON ${SCHEMA}.addon_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL`,
    );

    await queryRunner.query(`
      ALTER TABLE ${SCHEMA}.todo
        ADD COLUMN IF NOT EXISTS notes        TEXT,
        ADD COLUMN IF NOT EXISTS assignee_id  TEXT,
        ADD COLUMN IF NOT EXISTS created_by   TEXT,
        ADD COLUMN IF NOT EXISTS due_date     DATE,
        ADD COLUMN IF NOT EXISTS recurrence   TEXT NOT NULL DEFAULT 'none',
        ADD COLUMN IF NOT EXISTS points       INTEGER NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS area         TEXT,
        ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS completed_by TEXT
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_todo_assignee ON ${SCHEMA}.todo(assignee_id) WHERE is_completed = false`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.dcaos_task_log (
        id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        task_id         TEXT,
        title           TEXT NOT NULL,
        user_id         TEXT NOT NULL,
        family_group_id TEXT,
        points          INTEGER NOT NULL DEFAULT 1,
        completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_dcaos_task_log_scope ON ${SCHEMA}.dcaos_task_log(family_group_id, completed_at)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.dcaos_pantry_items (
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
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_dcaos_pantry_scope ON ${SCHEMA}.dcaos_pantry_items(family_group_id, user_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.dcaos_notes (
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
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_dcaos_notes_scope ON ${SCHEMA}.dcaos_notes(family_group_id, created_at)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.dcaos_notifications (
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
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_dcaos_notif_user ON ${SCHEMA}.dcaos_notifications(user_id, created_at DESC)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_dcaos_notif_dedupe ON ${SCHEMA}.dcaos_notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS ${SCHEMA}.dcaos_notifications`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS ${SCHEMA}.dcaos_notes`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS ${SCHEMA}.dcaos_pantry_items`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS ${SCHEMA}.dcaos_task_log`);
    await queryRunner.query(`DROP INDEX IF EXISTS ${SCHEMA}.idx_todo_assignee`);
    await queryRunner.query(`
      ALTER TABLE ${SCHEMA}.todo
        DROP COLUMN IF EXISTS completed_by,
        DROP COLUMN IF EXISTS completed_at,
        DROP COLUMN IF EXISTS area,
        DROP COLUMN IF EXISTS points,
        DROP COLUMN IF EXISTS recurrence,
        DROP COLUMN IF EXISTS due_date,
        DROP COLUMN IF EXISTS created_by,
        DROP COLUMN IF EXISTS assignee_id,
        DROP COLUMN IF EXISTS notes
    `);
    await queryRunner.query(
      `DROP TABLE IF EXISTS ${SCHEMA}.addon_subscriptions`,
    );
  }
}
