import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marks the schema state described by `baseline.sql` (repo root) as the
 * starting point for versioned migrations. Intentionally a no-op: the
 * tables it would create already exist in every environment this app runs
 * in. Recreating them here would either fail (already exists) or drift
 * from the real schema. Everything from this point forward is a real,
 * reviewable migration instead of ad hoc DDL executed from service code.
 */
export class Baseline1755600000000 implements MigrationInterface {
  name = 'Baseline1755600000000';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    // no-op — see class doc above
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // no-op
  }
}
