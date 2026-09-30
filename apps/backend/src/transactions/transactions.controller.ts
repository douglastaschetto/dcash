import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  Res,
  UseGuards,
  Query,
  Patch,
  UnauthorizedException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { TransactionsService, StagingResult } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ImportConfirmDto } from './dto/import-confirm.dto';
import { AnalyzeStagingDto } from './dto/analyze-staging.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  private getUserId(req: any): string {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException('Usuário não identificado.');
    return id;
  }

  @Post()
  create(@Req() req, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(this.getUserId(req), dto);
  }

  @Post('recurring')
  createRecurring(@Req() req, @Body() body: any) {
    return this.transactionsService.createRecurring(this.getUserId(req), body);
  }

  @Get()
  findAll(@Req() req) {
    return this.transactionsService.findAll(this.getUserId(req));
  }

  @Get('installments')
  getInstallments(@Req() req) {
    return this.transactionsService.getInstallmentsReport(this.getUserId(req));
  }

  @Get('export')
  async exportCsv(@Req() req, @Res() res: Response) {
    const csv = await this.transactionsService.exportCsv(this.getUserId(req));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="dcash-transacoes-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send('﻿' + csv); // BOM para acentuação abrir corretamente no Excel
  }

  // ─── Mark paid (static routes must come before :id) ─────────────────────────

  @Patch('mark-paid')
  markPaidBatch(@Req() req, @Body() body: { ids: string[] }) {
    return this.transactionsService.markAsPaid(
      this.getUserId(req),
      body.ids || [],
    );
  }

  @Patch(':id/paid')
  markSinglePaid(@Param('id') id: string, @Req() req) {
    return this.transactionsService.markAsPaid(this.getUserId(req), [id]);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Req() req, @Body() data: any) {
    return this.transactionsService.update(id, this.getUserId(req), data);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req,
    @Query('deleteAll') deleteAll: string,
  ) {
    return this.transactionsService.remove(
      id,
      this.getUserId(req),
      deleteAll === 'true',
    );
  }

  // ─── OFX / CSV import ────────────────────────────────────────────────────────

  @Post('import/staging')
  @UseInterceptors(FileInterceptor('file'))
  uploadToStaging(
    @Req() req,
    @UploadedFile() file: any,
    @Query('paymentMethodId') paymentMethodId?: string,
  ): Promise<StagingResult[]> {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    return this.transactionsService.processStaging(
      this.getUserId(req),
      Buffer.isBuffer(file.buffer)
        ? file.buffer.toString('utf-8')
        : String(file.buffer),
      paymentMethodId,
    );
  }

  @Get('import/staging')
  getStaging(@Req() req, @Query('paymentMethodId') paymentMethodId?: string) {
    return this.transactionsService.getStaging(
      this.getUserId(req),
      paymentMethodId,
    );
  }

  @Delete('import/staging/:id')
  deleteStagingItem(@Req() req, @Param('id') id: string) {
    return this.transactionsService.deleteStagingItem(this.getUserId(req), id);
  }

  @Post('import/confirm')
  confirmImport(@Req() req, @Body() dto: ImportConfirmDto) {
    const items = (dto as any).items || [];
    return this.transactionsService.confirmImport(this.getUserId(req), items);
  }

  @Post('import/analyze')
  analyzeStaging(@Req() req, @Body() dto: AnalyzeStagingDto) {
    return this.transactionsService.analyzeStaging(
      this.getUserId(req),
      dto.ids,
    );
  }
}
