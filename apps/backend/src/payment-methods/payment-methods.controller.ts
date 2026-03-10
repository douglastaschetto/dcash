import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Req,
  UnauthorizedException 
} from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  /**
   * Helper privado para garantir que o ID do usuário seja extraído 
   * corretamente de diferentes formatos de payload JWT.
   */
  private getUserId(req: any): string {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Usuário não identificado no token de autenticação.');
    }
    return userId;
  }

  @Post()
  async create(@Body() createPaymentMethodDto: CreatePaymentMethodDto, @Req() req: any) {
    const userId = this.getUserId(req);
    return this.paymentMethodsService.create(createPaymentMethodDto, userId);
  }

  @Get()
  async findAll(@Req() req: any) {
    const userId = this.getUserId(req);
    // Retorna todos os métodos (Cartões, Contas, etc.) vinculados ao usuário ou sua família
    return this.paymentMethodsService.findAll(userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string, 
    @Body() updateDto: Partial<CreatePaymentMethodDto>, 
    @Req() req: any
  ) {
    const userId = this.getUserId(req);
    return this.paymentMethodsService.update(id, userId, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = this.getUserId(req);
    return this.paymentMethodsService.remove(id, userId);
  }
}