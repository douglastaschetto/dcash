import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanService } from './plan.service';

@Controller('plan')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyPlan(@Request() req) {
    return this.planService.getUserPlanContext(req.user.id);
  }
}
