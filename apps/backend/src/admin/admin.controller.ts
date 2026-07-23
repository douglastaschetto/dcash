import {
  Controller, Get, Post, Patch, Delete, Body, Param, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminService } from './admin.service';
import { GuidedToursService } from '../guided-tours/guided-tours.service';
import { CreateTourDto } from '../guided-tours/dto/create-tour.dto';
import { UpdateTourDto } from '../guided-tours/dto/update-tour.dto';
import { CreateStepDto } from '../guided-tours/dto/create-step.dto';
import { UpdateStepDto } from '../guided-tours/dto/update-step.dto';
import { ReorderStepsDto } from '../guided-tours/dto/reorder-steps.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly guidedToursService: GuidedToursService,
  ) {}

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

  // ── Guias interativos (Fase 2 — editor visual) ────────────────────────

  @Get('guided-tours/catalog')
  async getTourCatalog(@Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.guidedToursService.getTargetCatalog();
  }

  @Get('guided-tours')
  async listTours(@Request() req) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.guidedToursService.listAllForAdmin();
  }

  @Get('guided-tours/:id')
  async getTour(@Request() req, @Param('id') id: string) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.guidedToursService.getTourDetail(id);
  }

  @Post('guided-tours')
  async createTour(@Request() req, @Body() body: CreateTourDto) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.guidedToursService.createTour(body);
  }

  @Patch('guided-tours/:id')
  async updateTour(@Request() req, @Param('id') id: string, @Body() body: UpdateTourDto) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.guidedToursService.updateTour(id, body);
  }

  @Delete('guided-tours/:id')
  async deleteTour(@Request() req, @Param('id') id: string) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.guidedToursService.deleteTour(id);
  }

  @Post('guided-tours/:id/steps')
  async addStep(@Request() req, @Param('id') id: string, @Body() body: CreateStepDto) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.guidedToursService.addStep(id, body);
  }

  @Patch('guided-tours/:id/steps/reorder')
  async reorderSteps(@Request() req, @Param('id') id: string, @Body() body: ReorderStepsDto) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.guidedToursService.reorderSteps(id, body.orderedStepIds);
  }

  @Patch('guided-tours/:id/steps/:stepId')
  async updateStep(
    @Request() req,
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() body: UpdateStepDto,
  ) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.guidedToursService.updateStep(id, stepId, body);
  }

  @Delete('guided-tours/:id/steps/:stepId')
  async deleteStep(@Request() req, @Param('id') id: string, @Param('stepId') stepId: string) {
    await this.adminService.verifyAdmin(req.user.id);
    return this.guidedToursService.deleteStep(id, stepId);
  }
}
