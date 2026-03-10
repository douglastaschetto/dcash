import { 
  Controller, 
  Get, 
  Query, 
  UseGuards, 
  Request, 
  UnauthorizedException 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Extração segura do ID do usuário do JWT
   */
  private getUserId(req: any): string {
    const id = req.user?.id || req.user?.userId || req.user?.sub;
    if (!id) throw new UnauthorizedException('Usuário não identificado.');
    return id;
  }

  @Get()
  async getDashboard(
    @Request() req,
    @Query() query: DashboardQueryDto,
  ) {
    const userId = this.getUserId(req);

    // Garante que month e year sejam números válidos, usando a data atual como fallback
    const month = query.month ? Number(query.month) : new Date().getMonth() + 1;
    const year = query.year ? Number(query.year) : new Date().getFullYear();

    // Validação simples de intervalo de mês
    if (month < 1 || month > 12) {
      return this.dashboardService.getData(userId, new Date().getMonth() + 1, year);
    }

    return this.dashboardService.getData(userId, month, year);
  }
}