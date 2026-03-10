import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Request, 
  Query,
  UnauthorizedException 
} from '@nestjs/common';
import { FixedBillsService } from './fixed-bills.service';
import { CreateFixedBillDto } from './dto/create-fixed-bill.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('fixed-bills')
@UseGuards(JwtAuthGuard)
export class FixedBillsController {
  constructor(private readonly fixedBillsService: FixedBillsService) {}

  @Post()
  async create(
    @Request() req, 
    @Body() dto: CreateFixedBillDto & { endDate?: string }
  ) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    
    if (!userId) {
      throw new UnauthorizedException('Usuário não identificado.');
    }

    // Passamos o DTO completo, que agora pode conter o endDate para a geração das parcelas
    return this.fixedBillsService.create(userId, dto);
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('month') month?: string,
    @Query('year') year?: string
  ) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    
    if (!userId) {
      throw new UnauthorizedException('Usuário não identificado.');
    }

    // Convertemos os parâmetros da Query para Number antes de passar ao Service
    return this.fixedBillsService.findAll(
      userId, 
      month ? Number(month) : undefined, 
      year ? Number(year) : undefined
    );
  }

  @Patch(':id')
  async update(
    @Request() req, 
    @Param('id') id: string, 
    @Body() dto: Partial<CreateFixedBillDto>
  ) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    
    if (!userId) {
      throw new UnauthorizedException('Ação não permitida.');
    }

    return this.fixedBillsService.update(userId, id, dto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    
    if (!userId) {
      throw new UnauthorizedException('Ação não permitida.');
    }

    return this.fixedBillsService.remove(userId, id);
  }
}