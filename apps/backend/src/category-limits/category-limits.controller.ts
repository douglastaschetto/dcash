import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  Delete, 
  Param, 
  UseGuards, 
  Request,
  UnauthorizedException 
} from '@nestjs/common';
import { CategoryLimitsService } from './category-limits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpsertCategoryLimitDto } from './dto/upsert-category-limit.dto';

@Controller('category-limits')
@UseGuards(JwtAuthGuard)
export class CategoryLimitsController {
  constructor(private readonly service: CategoryLimitsService) {}

  @Get()
  async findAll(
    @Request() req, 
    @Query('month') month: string, 
    @Query('year') year: string
  ) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    
    if (!userId) {
      throw new UnauthorizedException('Usuário não identificado.');
    }

    // Certifique-se que o método no service é findAll ou getDashboard. 
    // Com base nos ajustes de família, costumamos usar findAll.
    return this.service.findAll(userId, Number(month), Number(year));
  }

  @Post()
  async upsert(@Request() req, @Body() dto: UpsertCategoryLimitDto) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
  
    if (!userId) {
      throw new UnauthorizedException('Usuário não identificado.');
    }

    return this.service.upsertLimit(userId, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    
    if (!userId) {
      throw new UnauthorizedException('Usuário não identificado.');
    }

    return this.service.remove(id, userId);
  }
}