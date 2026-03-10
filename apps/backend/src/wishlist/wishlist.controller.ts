import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Delete, 
  Param, 
  Put, 
  UseGuards, 
  Request, 
  UnauthorizedException 
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateWishDto } from './dto/update-wish.dto';
import { CreatePriceDto } from './dto/create-price-dto';
import { CreateWishDto } from './dto/create-wish-dto';

// Alterado para plural para bater com o Frontend (api.get('/wishlists'))
@Controller('wishlists') 
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly service: WishlistService) {}

  /**
   * Extração resiliente do ID do usuário do Request
   */
  private getUserId(req: any): string {
    const id = req.user?.id || req.user?.userId || req.user?.sub;
    if (!id) throw new UnauthorizedException('Usuário não identificado.');
    return id;
  }

  @Post()
  async create(@Request() req, @Body() dto: CreateWishDto) {
    const userId = this.getUserId(req);
    return this.service.create(userId, dto);
  }

  @Post(':id/prices')
  async addPrice(@Param('id') id: string, @Body() dto: CreatePriceDto) {
    // Adiciona uma cotação de preço (Price Hunting)
    return this.service.addPrice(id, dto);
  }

  @Get()
  async findAll(@Request() req) {
    const userId = this.getUserId(req);
    return this.service.findAll(userId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Request() req, @Body() dto: UpdateWishDto) {
    const userId = this.getUserId(req);
    
    // Proteção contra envio de ID no body que quebra o Prisma
    const { id: _, ...cleanData } = dto as any;
    
    return this.service.update(id, userId, cleanData);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) { 
    const userId = this.getUserId(req);
    return this.service.remove(id, userId); 
  }

  @Delete('prices/:priceId')
  async removePrice(@Param('priceId') priceId: string) {
    // Remove uma cotação específica
    return this.service.removePrice(priceId);
  }
}