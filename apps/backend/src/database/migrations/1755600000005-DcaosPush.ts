import { MigrationInterface, QueryRunner } from 'typeorm';

const SCHEMA = 'db_dtasc';

/**
 * DCaos phase 3 — device notifications (Web Push).
 *
 * - `push_subscriptions`: one row per browser/device that accepted push
 *   (endpoint + keys from PushManager.subscribe). Dead endpoints (HTTP
 *   404/410 from the push service) are deleted on send.
 * - `dcaos_notification_prefs`: per-user switches. In-app notifications are
 *   always stored; these only decide whether a *push* goes out (muted
 *   modules, quiet hours in America/Sao_Paulo).
 */
export class DcaosPush1755600000005 implements MigrationInterface {
  name = 'DcaosPush1755600000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.push_subscriptions (
        id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id      TEXT NOT NULL,
        endpoint     TEXT NOT NULL UNIQUE,
        p256dh       TEXT NOT NULL,
        auth         TEXT NOT NULL,
        user_agent   TEXT,
        failures     INTEGER NOT NULL DEFAULT 0,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMPTZ
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_push_subs_user ON ${SCHEMA}.push_subscriptions(user_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.dcaos_notification_prefs (
        user_id       TEXT PRIMARY KEY,
        push_enabled  BOOLEAN NOT NULL DEFAULT true,
        muted_modules TEXT[] NOT NULL DEFAULT '{}',
        quiet_start   TEXT,
        quiet_end     TEXT,
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS ${SCHEMA}.dcaos_notification_prefs`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS ${SCHEMA}.push_subscriptions`,
    );
  }
}
