import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { DatabaseService } from '../database/database.service';

/**
 * Used by the reverse proxy / uptime monitoring. Checks real DB
 * connectivity (not just "the process is alive") since a hung Postgres
 * connection is the failure mode that actually matters for this app.
 */
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async check(@Res() res: Response) {
    try {
      await this.db.query('SELECT 1', []);
      res
        .status(HttpStatus.OK)
        .json({ status: 'ok', db: 'up', timestamp: new Date().toISOString() });
    } catch {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        db: 'down',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
