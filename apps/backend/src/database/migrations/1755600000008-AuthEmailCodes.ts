import { MigrationInterface, QueryRunner } from 'typeorm';

const SCHEMA = 'db_dtasc';

/**
 * Two-factor by e-mail:
 *  - users.email_verified: new sign-ups must confirm the e-mail with a code.
 *    Existing accounts are considered verified (they already use the app).
 *  - auth_codes: 6-digit codes (hashed) for e-mail verification, login on a
 *    new device and password reset; limited attempts and short TTL.
 *  - trusted_devices: "lembrar este dispositivo por 30 dias" (hashed token).
 */
export class AuthEmailCodes1755600000008 implements MigrationInterface {
  name = 'AuthEmailCodes1755600000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ${SCHEMA}.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT true`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.auth_codes (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     TEXT NOT NULL REFERENCES ${SCHEMA}.users(id) ON DELETE CASCADE,
        purpose     TEXT NOT NULL CHECK (purpose IN ('verify_email', 'login', 'reset_password')),
        code_hash   TEXT NOT NULL,
        attempts    INTEGER NOT NULL DEFAULT 0,
        expires_at  TIMESTAMPTZ NOT NULL,
        used_at     TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_auth_codes_user_purpose ON ${SCHEMA}.auth_codes(user_id, purpose, created_at DESC)`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA}.trusted_devices (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      TEXT NOT NULL REFERENCES ${SCHEMA}.users(id) ON DELETE CASCADE,
        token_hash   TEXT NOT NULL UNIQUE,
        user_agent   TEXT,
        expires_at   TIMESTAMPTZ NOT NULL,
        last_used_at TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON ${SCHEMA}.trusted_devices(user_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ${SCHEMA}.trusted_devices`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${SCHEMA}.auth_codes`);
    await queryRunner.query(
      `ALTER TABLE ${SCHEMA}.users DROP COLUMN IF EXISTS email_verified`,
    );
  }
}
