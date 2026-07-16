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
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
export class PaymentMethodsController {
  constructor(private readonly service: PaymentMethodsService) {}

  private getUserId(req: any): string {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException('Usuário não identificado.');
    return id;
  }

  @Post()
  async create(@Body() dto: CreatePaymentMethodDto, @Req() req: any) {
    return this.service.create(this.getUserId(req), dto);
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.service.findAll(this.getUserId(req));
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreatePaymentMethodDto>,
    @Req() req: any,
  ) {
    return this.service.update(id, this.getUserId(req), dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, this.getUserId(req));
  }
}
