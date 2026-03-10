import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateWishDto } from './dto/create-wish-dto';
import { UpdateWishDto } from './dto/update-wish.dto';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  private async getUserFamily(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true },
    });
    return user?.familyGroupId || null;
  }

  /**
   * CRIAÇÃO
   */
  async create(userId: string, dto: CreateWishDto) {
    if (!userId) throw new BadRequestException('Usuário não autenticado.');
    
    const familyGroupId = await this.getUserFamily(userId);
    
    // Usamos o 'wishlist' conforme definido no seu schema.prisma
    return (this.prisma.wishlist as any).create({
      data: {
        product: dto.product,
        priority: dto.priority || '2 - Médio',
        link: dto.link || '',
        imageUrl: dto.imageUrl || '',
        bought: false,
        userId: userId,
        familyGroupId: familyGroupId,
      },
    });
  }

  /**
   * LEITURA (Busca itens do usuário ou do grupo familiar)
   */
  async findAll(userId: string) {
    const familyGroupId = await this.getUserFamily(userId);

    return (this.prisma.wishlist as any).findMany({
      where: {
        OR: [
          { familyGroupId: familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null },
        ],
      },
      include: { 
        prices: true // Traz as cotações do Price Hunting
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * ATUALIZAÇÃO
   */
  async update(id: string, userId: string, dto: UpdateWishDto) {
    const item = await (this.prisma.wishlist as any).findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Desejo não encontrado.');

    const familyGroupId = await this.getUserFamily(userId);
    
    // Validação de segurança: Dono ou Membro da Família
    const isOwner = item.userId === userId;
    const isFamily = familyGroupId && item.familyGroupId === familyGroupId;

    if (!isOwner && !isFamily) {
      throw new ForbiddenException('Sem permissão para editar este item.');
    }

    return (this.prisma.wishlist as any).update({
      where: { id },
      data: {
        product: dto.product,
        priority: dto.priority,
        link: dto.link,
        imageUrl: dto.imageUrl,
        bought: dto.bought,
      },
    });
  }

  /**
   * REMOÇÃO (Com limpeza de cotações vinculadas)
   */
  async remove(id: string, userId: string) {
    const item = await (this.prisma.wishlist as any).findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item não encontrado.');

    const familyGroupId = await this.getUserFamily(userId);
    
    if (item.userId !== userId && item.familyGroupId !== familyGroupId) {
      throw new ForbiddenException('Acesso negado para excluir este item.');
    }

    // 1. Limpa as cotações vinculadas (Price Hunting) para evitar erro de Foreign Key
    await (this.prisma.priceHunting as any).deleteMany({
      where: { wishlistId: id }
    });

    // 2. Deleta o item principal
    return (this.prisma.wishlist as any).delete({
      where: { id }
    });
  }

  /**
   * PRICE HUNTING: Adiciona nova cotação
   */
  async addPrice(wishlistId: string, dto: any) {
    const item = await (this.prisma.wishlist as any).findUnique({ where: { id: wishlistId } });
    if (!item) throw new NotFoundException('Wishlist não encontrada.');

    return (this.prisma.priceHunting as any).create({
      data: {
        store: dto.store,
        link: dto.link || '',
        cashPrice: Number(dto.cashPrice),
        installments: dto.installments ? Number(dto.installments) : null,
        installmentPrice: dto.installmentPrice ? Number(dto.installmentPrice) : null,
        shipping: Number(dto.shipping || 0),
        wishlistId: wishlistId,
      },
    });
  }

  /**
   * PRICE HUNTING: Remove cotação específica
   */
  async removePrice(priceId: string) {
    try {
      const price = await (this.prisma.priceHunting as any).findUnique({
        where: { id: priceId }
      });

      if (!price) {
        throw new NotFoundException('Cotação não encontrada.');
      }

      return await (this.prisma.priceHunting as any).delete({
        where: { id: priceId }
      });
    } catch (error) {
      console.error('Erro ao deletar preço:', error);
      throw new BadRequestException('Não foi possível remover a cotação.');
    }
  }
}