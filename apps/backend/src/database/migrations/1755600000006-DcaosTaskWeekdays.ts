import { MigrationInterface, QueryRunner } from 'typeorm';

const SCHEMA = 'db_dtasc';

/**
 * "Quem Vai Fazer?" recurring chores on specific weekdays (e.g. trash on
 * Mon/Wed/Fri). `recurrence = 'weekly'` + non-empty `recurrence_days`
 * (0 = Sunday … 6 = Saturday) jumps to the next listed weekday; an empty
 * array keeps the plain "every 7 days" behaviour. `biweekly` is a new
 * recurrence value (text column, no constraint change needed).
 */
export class DcaosTaskWeekdays1755600000006 implements MigrationInterface {
  name = 'DcaosTaskWeekdays1755600000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ${SCHEMA}.todo ADD COLUMN IF NOT EXISTS recurrence_days INTEGER[] NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ${SCHEMA}.todo DROP COLUMN IF EXISTS recurrence_days`,
    );
  }
}
