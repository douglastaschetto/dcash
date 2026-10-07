import { MigrationInterface, QueryRunner } from 'typeorm';

const SCHEMA = 'db_dtasc';

/**
 * "Abastece Aí" pantry: average shelf life per item (days). Combined with
 * `last_bought_at` (also set when an item is first stocked) it gives an
 * estimated expiry date for the pantry cards.
 */
export class DcaosPantryShelfLife1755600000007 implements MigrationInterface {
  name = 'DcaosPantryShelfLife1755600000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ${SCHEMA}.dcaos_pantry_items ADD COLUMN IF NOT EXISTS shelf_life_days INTEGER NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ${SCHEMA}.dcaos_pantry_items DROP COLUMN IF EXISTS shelf_life_days`,
    );
  }
}
