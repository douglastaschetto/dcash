import {
  Controller, Get, Patch, Body, Param, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async getUsers(@Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.getUsers();
  }

  @Patch('users/:id/plan')
  async updateUserPlan(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { plan: string },
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.updateUserPlan(id, body.plan);
  }

  @Patch('users/:id/admin')
  async toggleAdmin(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { isAdmin: boolean },
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.toggleAdmin(id, body.isAdmin);
  }

  @Get('plan-features')
  async getPlanFeatures(@Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.getAllPlanFeatures();
  }

  @Patch('plan-features/:plan/:key')
  async updatePlanFeature(
    @Request() req,
    @Param('plan') plan: string,
    @Param('key') key: string,
    @Body() body: { enabled: boolean; numValue?: number | null },
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.adminService.updatePlanFeature(plan, key, body.enabled, body.numValue);
  }
}
