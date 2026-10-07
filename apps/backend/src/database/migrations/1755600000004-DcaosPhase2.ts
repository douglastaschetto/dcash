import { MigrationInterface, QueryRunner } from 'typeorm';

const SCHEMA = 'db_dtasc';

/**
 * DCaos phase 2.
 *
 * - "Quem Tem Compromisso?" reuses DCash's `calendar_event` (so /calendar and
 *   DCaos show the same agenda); it only gains who takes part and who created it.
 * - "Faz Todo Dia": `dcaos_habits` + one `dcaos_habit_checks` row per day done.
 *   `assignee_id IS NULL` means a shared family habit anyone can tick.
 * - "Não Esquece": `dcaos_important_dates`, yearly by default.
 * - "Deu Ruim": `dcaos_maintenance` holds both reported problems (`kind =
 *   'issue'`) and preventive routines (`kind = 'preventive'`, `interval_months`
 *   + `next_due`).
 */
export class DcaosPhase21755600000004 implements MigrationInterface {
  name = 'DcaosPhase21755600000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ${SCHEMA}.calendar_event
        ADD COLUMN IF NOT EXISTS participant_ids TEXT[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS created_by      TEXT
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.dcaos_habits (
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
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_dcaos_habits_scope ON ${SCHEMA}.dcaos_habits(family_group_id, user_id)`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.dcaos_habit_checks (
        id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        habit_id   TEXT NOT NULL REFERENCES ${SCHEMA}.dcaos_habits(id) ON DELETE CASCADE,
        user_id    TEXT NOT NULL,
        check_date DATE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (habit_id, check_date)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.dcaos_important_dates (
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
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_dcaos_dates_scope ON ${SCHEMA}.dcaos_important_dates(family_group_id, user_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.dcaos_maintenance (
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
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_dcaos_maint_scope ON ${SCHEMA}.dcaos_maintenance(family_group_id, user_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ${SCHEMA}.dcaos_maintenance`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS ${SCHEMA}.dcaos_important_dates`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS ${SCHEMA}.dcaos_habit_checks`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS ${SCHEMA}.dcaos_habits`);
    await queryRunner.query(`
      ALTER TABLE ${SCHEMA}.calendar_event
        DROP COLUMN IF EXISTS created_by,
        DROP COLUMN IF EXISTS participant_ids
    `);
  }
}
