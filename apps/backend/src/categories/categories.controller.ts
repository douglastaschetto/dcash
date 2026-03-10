// apps/backend/src/categories/categories.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Delete, // Adicionado
  Param,  // Adicionado
  Body, 
  UseGuards, 
  Req, 
  UnauthorizedException 
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  async create(@Req() req, @Body() dto: CreateCategoryDto) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    
    if (!userId) {
      throw new UnauthorizedException('Usuário não identificado no sistema.');
    }

    return this.categoriesService.create(userId, dto);
  }

  @Get()
  async findAll(@Req() req) {
    // console.log('--- DEBUG AUTH ---');
    // console.log('Payload do Usuário:', req.user);
    
    const userId = req.user?.id || req.user?.userId || req.user?.sub;

    if (!userId) {
      throw new UnauthorizedException('Token inválido ou ID ausente.');
    }

    return this.categoriesService.findAll(userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;

    if (!userId) {
      throw new UnauthorizedException('Ação não permitida: Usuário ausente.');
    }

    // Chama o serviço passando o ID da categoria e o ID do usuário para checagem de família
    return this.categoriesService.remove(id, userId);
  }
}