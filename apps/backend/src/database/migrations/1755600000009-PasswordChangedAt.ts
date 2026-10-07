import { MigrationInterface, QueryRunner } from 'typeorm';

const SCHEMA = 'db_dtasc';

/** Sessions (JWTs) issued before the last password change are rejected. */
export class PasswordChangedAt1755600000009 implements MigrationInterface {
  name = 'PasswordChangedAt1755600000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ${SCHEMA}.users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ${SCHEMA}.users DROP COLUMN IF EXISTS password_changed_at`,
    );
  }
}
