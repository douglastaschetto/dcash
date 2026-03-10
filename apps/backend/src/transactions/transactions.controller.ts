import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Delete, 
  Req, 
  UseGuards, 
  Query,
  Patch,
  UnauthorizedException,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * Helper para extração segura do ID do usuário do JWT.
   * Verifica diferentes padrões comuns de payload (id, userId, sub).
   */
  private getUserId(req: any): string {
    const id = req.user?.id || req.user?.userId || req.user?.sub;
    if (!id) throw new UnauthorizedException('Usuário não identificado.');
    return id;
  }

  @Post()
  async create(@Req() req, @Body() createTransactionDto: CreateTransactionDto) {
    const userId = this.getUserId(req);
    return this.transactionsService.create(userId, createTransactionDto);
  }

  @Get()
  async findAll(@Req() req) {
    const userId = this.getUserId(req);
    return this.transactionsService.findAll(userId);
  }

  /**
   * Edição de transação.
   * Utilizado pelo frontend de Contas Fixas para ajustar o valor de um mês específico.
   */
  @Patch(':id')
  async update(
    @Param('id') id: string, 
    @Req() req, 
    @Body() updateTransactionDto: any
  ) {
    const userId = this.getUserId(req);
    return this.transactionsService.update(id, userId, updateTransactionDto);
  }

  /**
   * Remoção de transação.
   * @param id ID da transação
   * @param deleteAll Se 'true', remove todo o grupo de parcelamento (installmentGroup)
   */
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req,
    @Query('deleteAll') deleteAll: string
  ) {
    const userId = this.getUserId(req);
    const shouldDeleteAll = deleteAll === 'true';
    
    return this.transactionsService.remove(id, userId, shouldDeleteAll);
  }
}