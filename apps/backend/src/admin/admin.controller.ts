import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminService } from './admin.service';
import { GuidedToursService } from '../guided-tours/guided-tours.service';
import { CreateTourDto } from '../guided-tours/dto/create-tour.dto';
import { UpdateTourDto } from '../guided-tours/dto/update-tour.dto';
import { CreateStepDto } from '../guided-tours/dto/create-step.dto';
import { UpdateStepDto } from '../guided-tours/dto/update-step.dto';
import { ReorderStepsDto } from '../guided-tours/dto/reorder-steps.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly guidedToursService: GuidedToursService,
  ) {}

  @Get('users')
  async getUsers() {
    return this.adminService.getUsers();
  }

  @Patch('users/:id/plan')
  async updateUserPlan(
    @Param('id') id: string,
    @Body() body: { plan: string },
  ) {
    return this.adminService.updateUserPlan(id, body.plan);
  }

  @Patch('users/:id/admin')
  async toggleAdmin(
    @Param('id') id: string,
    @Body() body: { isAdmin: boolean },
  ) {
    return this.adminService.toggleAdmin(id, body.isAdmin);
  }

  @Get('plan-features')
  async getPlanFeatures() {
    return this.adminService.getAllPlanFeatures();
  }

  @Patch('plan-features/:plan/:key')
  async updatePlanFeature(
    @Param('plan') plan: string,
    @Param('key') key: string,
    @Body() body: { enabled: boolean; numValue?: number | null },
  ) {
    return this.adminService.updatePlanFeature(
      plan,
      key,
      body.enabled,
      body.numValue,
    );
  }

  // ── Stripe product/price management ───────────────────────────────────

  @Get('stripe/products')
  async listStripeProducts() {
    return this.adminService.listStripeProducts();
  }

  @Post('stripe/products/sync')
  async syncStripePlans() {
    return this.adminService.syncStripePlans();
  }

  @Post('stripe/products')
  async createStripeProduct(
    @Body() body: { name: string; description?: string; amount?: number; currency?: string; interval?: 'month' | 'year' },
  ) {
    return this.adminService.createStripeProduct(body);
  }

  @Post('stripe/products/:id/prices')
  async addStripePrice(
    @Param('id') id: string,
    @Body() body: { amount: number; currency?: string; interval?: 'month' | 'year' },
  ) {
    return this.adminService.addStripePrice(id, body);
  }

  @Patch('stripe/products/:id')
  async updateStripeProduct(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; active?: boolean },
  ) {
    return this.adminService.updateStripeProduct(id, body);
  }

  @Delete('stripe/products/:id')
  async deleteStripeProduct(@Param('id') id: string) {
    return this.adminService.archiveStripeProduct(id);
  }

  // ── Guias interativos (Fase 2 — editor visual) ────────────────────────

  @Get('guided-tours/catalog')
  async getTourCatalog() {
    return this.guidedToursService.getTargetCatalog();
  }

  @Get('guided-tours')
  async listTours() {
    return this.guidedToursService.listAllForAdmin();
  }

  @Get('guided-tours/:id')
  async getTour(@Param('id') id: string) {
    return this.guidedToursService.getTourDetail(id);
  }

  @Post('guided-tours')
  async createTour(@Body() body: CreateTourDto) {
    return this.guidedToursService.createTour(body);
  }

  @Patch('guided-tours/:id')
  async updateTour(@Param('id') id: string, @Body() body: UpdateTourDto) {
    return this.guidedToursService.updateTour(id, body);
  }

  @Delete('guided-tours/:id')
  async deleteTour(@Param('id') id: string) {
    return this.guidedToursService.deleteTour(id);
  }

  @Post('guided-tours/:id/steps')
  async addStep(@Param('id') id: string, @Body() body: CreateStepDto) {
    return this.guidedToursService.addStep(id, body);
  }

  @Patch('guided-tours/:id/steps/reorder')
  async reorderSteps(@Param('id') id: string, @Body() body: ReorderStepsDto) {
    return this.guidedToursService.reorderSteps(id, body.orderedStepIds);
  }

  @Patch('guided-tours/:id/steps/:stepId')
  async updateStep(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body() body: UpdateStepDto,
  ) {
    return this.guidedToursService.updateStep(id, stepId, body);
  }

  @Delete('guided-tours/:id/steps/:stepId')
  async deleteStep(@Param('id') id: string, @Param('stepId') stepId: string) {
    return this.guidedToursService.deleteStep(id, stepId);
  }
}
