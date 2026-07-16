import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Req, Query,
  UseGuards, UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InvestmentsService } from './investments.service';

@Controller('investments')
@UseGuards(JwtAuthGuard)
export class InvestmentsController {
  constructor(private readonly svc: InvestmentsService) {}

  private uid(req: any): string {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException('Usuário não identificado.');
    return id;
  }

  /* ── Market data (proxy to Python service) ─────────────────── */

  @Get('market/:ticker')
  async dashboard(@Req() req, @Param('ticker') ticker: string) {
    await this.svc.assertPro(this.uid(req));
    return this.svc.getStockDashboard(ticker);
  }

  @Get('market/:ticker/history')
  async history(
    @Req() req,
    @Param('ticker') ticker: string,
    @Query('period') period = '12mo',
  ) {
    await this.svc.assertPro(this.uid(req));
    return this.svc.getStockHistory(ticker, period);
  }

  @Get('market/:ticker/dividends')
  async dividends(@Req() req, @Param('ticker') ticker: string) {
    await this.svc.assertPro(this.uid(req));
    return this.svc.getStockDividends(ticker);
  }

  @Get('market/:ticker/dividends/map')
  async dividendMap(@Req() req, @Param('ticker') ticker: string) {
    await this.svc.assertPro(this.uid(req));
    return this.svc.getStockDividendMap(ticker);
  }

  /* ── Portfolio ─────────────────────────────────────────────── */

  @Get('portfolio')
  async getPortfolio(@Req() req) {
    await this.svc.assertPro(this.uid(req));
    return this.svc.getPortfolio(this.uid(req));
  }

  @Post('portfolio')
  async addToPortfolio(@Req() req, @Body() body: any) {
    await this.svc.assertPro(this.uid(req));
    return this.svc.upsertPortfolioItem(this.uid(req), body);
  }

  @Patch('portfolio/:id')
  async updatePortfolioItem(@Req() req, @Param('id') id: string, @Body() body: any) {
    await this.svc.assertPro(this.uid(req));
    return this.svc.updatePortfolioItem(this.uid(req), id, body);
  }

  @Delete('portfolio/:id')
  async removePortfolioItem(@Req() req, @Param('id') id: string) {
    await this.svc.assertPro(this.uid(req));
    return this.svc.removePortfolioItem(this.uid(req), id);
  }

  /* ── Alerts ────────────────────────────────────────────────── */

  @Get('alerts')
  async getAlerts(@Req() req) {
    await this.svc.assertPro(this.uid(req));
    return this.svc.getAlerts(this.uid(req));
  }

  @Post('alerts')
  async createAlert(@Req() req, @Body() body: any) {
    await this.svc.assertPro(this.uid(req));
    return this.svc.createAlert(this.uid(req), body);
  }

  @Patch('alerts/:id/toggle')
  async toggleAlert(@Req() req, @Param('id') id: string) {
    await this.svc.assertPro(this.uid(req));
    return this.svc.toggleAlert(this.uid(req), id);
  }

  @Delete('alerts/:id')
  async deleteAlert(@Req() req, @Param('id') id: string) {
    await this.svc.assertPro(this.uid(req));
    return this.svc.deleteAlert(this.uid(req), id);
  }

  /* ── Alert checker (call via cron / external scheduler) ─────── */

  @Post('alerts/check')
  async checkAlerts(@Req() req) {
    await this.svc.assertPro(this.uid(req));
    return this.svc.checkAlerts();
  }
}
