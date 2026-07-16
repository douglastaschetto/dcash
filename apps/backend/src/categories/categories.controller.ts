import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  private getUserId(req: any): string {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException('Usuário não identificado.');
    return id;
  }

  @Post()
  async create(@Body() dto: CreateCategoryDto, @Req() req: any) {
    return this.categoriesService.create(this.getUserId(req), dto);
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.categoriesService.findAll(this.getUserId(req));
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @Req() req: any) {
    return this.categoriesService.update(id, this.getUserId(req), dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.categoriesService.remove(id, this.getUserId(req));
  }
}
