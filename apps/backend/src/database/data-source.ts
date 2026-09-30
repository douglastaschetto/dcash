import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * Used only by the TypeORM CLI (migration:generate/run/revert), not by the
 * running app (which builds its own connection in database.module.ts).
 * Schema evolution used to happen ad hoc — `CREATE TABLE IF NOT EXISTS` /
 * `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` executed at runtime from inside
 * service code (see transactions.service.ts history) — with no versioned
 * history. Migrations in `database/migrations/` are now the source of truth
 * for schema changes going forward.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  schema: process.env.DB_SCHEMA,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: false,
  ssl: false,
});
