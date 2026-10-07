import { MigrationInterface, QueryRunner } from 'typeorm';

const SCHEMA = 'db_dtasc';

/**
 * Google login no longer puts the session token in the redirect URL: the
 * callback stores a one-time "oauth" code (2 min) that the app exchanges for
 * the token through a POST. `meta` carries non-secret flags (firstLogin).
 */
export class OAuthExchangeCode1755600000010 implements MigrationInterface {
  name = 'OAuthExchangeCode1755600000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ${SCHEMA}.auth_codes DROP CONSTRAINT IF EXISTS auth_codes_purpose_check`,
    );
    await queryRunner.query(
      `ALTER TABLE ${SCHEMA}.auth_codes ADD CONSTRAINT auth_codes_purpose_check
         CHECK (purpose IN ('verify_email', 'login', 'reset_password', 'oauth'))`,
    );
    await queryRunner.query(
      `ALTER TABLE ${SCHEMA}.auth_codes ADD COLUMN IF NOT EXISTS meta JSONB`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_auth_codes_hash ON ${SCHEMA}.auth_codes(code_hash)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM ${SCHEMA}.auth_codes WHERE purpose = 'oauth'`);
    await queryRunner.query(`DROP INDEX IF EXISTS ${SCHEMA}.idx_auth_codes_hash`);
    await queryRunner.query(`ALTER TABLE ${SCHEMA}.auth_codes DROP COLUMN IF EXISTS meta`);
    await queryRunner.query(
      `ALTER TABLE ${SCHEMA}.auth_codes DROP CONSTRAINT IF EXISTS auth_codes_purpose_check`,
    );
    await queryRunner.query(
      `ALTER TABLE ${SCHEMA}.auth_codes ADD CONSTRAINT auth_codes_purpose_check
         CHECK (purpose IN ('verify_email', 'login', 'reset_password'))`,
    );
  }
}
