import { MigrationInterface, QueryRunner } from 'typeorm';

const SCHEMA = 'db_dtasc';

/**
 * Adds subscription-lifecycle tracking to `users`. Until now `plan` was set
 * once by whichever payment webhook fired and never re-checked — no
 * expiration, no billing cycle, no way to know a Stripe subscription had
 * lapsed or been cancelled.
 *
 * Stripe becomes the sole source of truth for recurring billing going
 * forward (`stripe_customer_id` / `stripe_subscription_id` let the webhook
 * correlate `invoice.paid` / `invoice.payment_failed` /
 * `customer.subscription.deleted` events — none of which carry
 * `client_reference_id` — back to a user). Mercado Pago's existing one-off
 * `Preference` payments are grandfathered: these columns default NULL for
 * every existing row, so nobody currently on a paid plan is affected.
 *
 * `plan_expires_at IS NULL` means "not tracked" (free plan, MP-grandfathered,
 * or a manual admin override) and is therefore immune to the daily cron
 * sweep that downgrades expired subscriptions — see PaymentService.
 */
export class SubscriptionBilling1755600000002 implements MigrationInterface {
  name = 'SubscriptionBilling1755600000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ${SCHEMA}.users
        ADD COLUMN IF NOT EXISTS plan_billing_cycle TEXT,
        ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
        ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id
        ON ${SCHEMA}.users(stripe_subscription_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id
        ON ${SCHEMA}.users(stripe_customer_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS ${SCHEMA}.idx_users_stripe_customer_id`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS ${SCHEMA}.idx_users_stripe_subscription_id`,
    );
    await queryRunner.query(`
      ALTER TABLE ${SCHEMA}.users
        DROP COLUMN IF EXISTS stripe_subscription_id,
        DROP COLUMN IF EXISTS stripe_customer_id,
        DROP COLUMN IF EXISTS plan_status,
        DROP COLUMN IF EXISTS plan_expires_at,
        DROP COLUMN IF EXISTS plan_billing_cycle
    `);
  }
}
