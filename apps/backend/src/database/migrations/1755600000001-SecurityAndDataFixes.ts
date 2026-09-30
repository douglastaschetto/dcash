import { MigrationInterface, QueryRunner } from 'typeorm';

const SCHEMA = 'db_dtasc';

/**
 * Bundles the schema changes needed for this change set. Note: `users.id`
 * and `family_groups.id` are declared TEXT in this schema (Prisma-era
 * legacy, even though values happen to be UUID-formatted) — every new FK
 * below matches that as TEXT, since Postgres won't create a FK across
 * mismatched column types even when the data would be compatible.
 *
 *  - password_reset_tokens: backs the previously-stubbed forgot-password flow.
 *  - investments / investment_alerts: these tables were referenced by
 *    investments.service.ts but never actually existed in this database —
 *    the module was non-functional. Created here scoped to family_group_id
 *    from the start, bringing it in line with the family-sharing model
 *    used by every other module (investments was the one exception, see
 *    audit).
 *  - transactions.import_hash / reconciliation_staging: previously handled
 *    by `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT
 *    EXISTS` executed at runtime from inside transactions.service.ts on
 *    every OFX import call. Both already exist in this DB from that path;
 *    kept here as idempotent guards so the DDL is versioned instead of
 *    re-checked on every request, and so a fresh environment gets them too.
 */
export class SecurityAndDataFixes1755600000001 implements MigrationInterface {
  name = 'SecurityAndDataFixes1755600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.password_reset_tokens (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     TEXT NOT NULL REFERENCES ${SCHEMA}.users(id) ON DELETE CASCADE,
        token_hash  TEXT NOT NULL UNIQUE,
        expires_at  TIMESTAMP NOT NULL,
        used_at     TIMESTAMP,
        created_at  TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
        ON ${SCHEMA}.password_reset_tokens(user_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.investments (
        id               TEXT PRIMARY KEY,
        user_id          TEXT NOT NULL REFERENCES ${SCHEMA}.users(id) ON DELETE CASCADE,
        family_group_id  TEXT REFERENCES ${SCHEMA}.family_groups(id) ON DELETE SET NULL,
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
      )
    `);
    // Some environments already had this table (created ad hoc, without
    // family scoping) — CREATE TABLE IF NOT EXISTS skips it, so add the column.
    await queryRunner.query(`
      ALTER TABLE ${SCHEMA}.investments
        ADD COLUMN IF NOT EXISTS family_group_id TEXT
        REFERENCES ${SCHEMA}.family_groups(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_investments_family
        ON ${SCHEMA}.investments(family_group_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.investment_alerts (
        id               TEXT PRIMARY KEY,
        user_id          TEXT NOT NULL REFERENCES ${SCHEMA}.users(id) ON DELETE CASCADE,
        family_group_id  TEXT REFERENCES ${SCHEMA}.family_groups(id) ON DELETE SET NULL,
        ticker           TEXT NOT NULL,
        target_price     NUMERIC NOT NULL,
        direction        TEXT NOT NULL,
        message          TEXT,
        is_active        BOOLEAN NOT NULL DEFAULT true,
        triggered_at     TIMESTAMP,
        created_at       TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      ALTER TABLE ${SCHEMA}.investment_alerts
        ADD COLUMN IF NOT EXISTS family_group_id TEXT
        REFERENCES ${SCHEMA}.family_groups(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_investment_alerts_family
        ON ${SCHEMA}.investment_alerts(family_group_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.reconciliation_staging (
        id                TEXT PRIMARY KEY,
        user_id           TEXT NOT NULL,
        family_group_id   TEXT,
        payment_method_id TEXT,
        transaction_date  DATE NOT NULL,
        description       TEXT NOT NULL,
        amount            NUMERIC NOT NULL,
        import_hash       TEXT UNIQUE NOT NULL,
        status            TEXT NOT NULL DEFAULT 'PENDING'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE ${SCHEMA}.transactions ADD COLUMN IF NOT EXISTS import_hash TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ${SCHEMA}.transactions DROP COLUMN IF EXISTS import_hash`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS ${SCHEMA}.reconciliation_staging`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS ${SCHEMA}.investment_alerts`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${SCHEMA}.investments`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS ${SCHEMA}.password_reset_tokens`,
    );
  }
}
