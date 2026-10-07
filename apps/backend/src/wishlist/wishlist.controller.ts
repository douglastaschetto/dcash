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
  UnauthorizedException,
  Query,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateWishDto } from './dto/create-wish-dto';
import { UpdateWishDto } from './dto/update-wish.dto';
import { CreatePriceDto } from './dto/create-price-dto';

@Controller('wishlists')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly service: WishlistService) {}

  private uid(req: any): string {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException('Usuário não identificado.');
    return id;
  }

  @Get('search-prices')
  searchPrices(@Query('q') q: string) {
    return this.service.searchPrices(q ?? '');
  }

  @Get('search-images')
  searchImages(@Query('q') q: string) {
    return this.service.searchImages(q ?? '');
  }

  @Post()
  create(@Request() req, @Body() dto: CreateWishDto) {
    return this.service.create(this.uid(req), dto);
  }

  @Get()
  findAll(@Request() req) {
    return this.service.findAll(this.uid(req));
  }

  @Put(':id')
  update(@Param('id') id: string, @Request() req, @Body() dto: UpdateWishDto) {
    return this.service.update(id, this.uid(req), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.service.remove(id, this.uid(req));
  }

  @Post(':id/prices')
  addPrice(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: CreatePriceDto,
  ) {
    return this.service.addPrice(id, this.uid(req), dto);
  }

  @Delete('prices/:priceId')
  removePrice(@Param('priceId') priceId: string, @Request() req) {
    return this.service.removePrice(priceId, this.uid(req));
  }
}
