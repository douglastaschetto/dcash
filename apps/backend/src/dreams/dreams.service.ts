import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateDreamDto } from './dto/create-dream.dto';
import { UpdateDreamDto } from './dto/update-dream.dto';

@Injectable()
export class DreamsService {
  constructor(private prisma: PrismaService) {}

  /**
   * CRIAÇÃO DE SONHO
   */
  async create(userId: string, dto: CreateDreamDto) {
    if (!userId) throw new BadRequestException('Usuário não autenticado.');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true }
    });

    return (this.prisma.dreamGoal as any).create({
      data: {
        title: dto.title,
        targetValue: Number(dto.targetValue),
        savedValue: Number(dto.savedValue || 0),
        imageUrl: dto.imageUrl || null,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        userId: userId,
        familyGroupId: user?.familyGroupId,
        // No Create, se vier nulo ou vazio, salvamos null
        piggyBankId: dto.piggyBankId || null,
        wishlistId: dto.wishlistId || null,
      },
      include: {
        piggyBank: true,
        wishlist: true
      }
    });
  }

  /**
   * LISTAGEM (PRÓPRIOS + FAMÍLIA)
   */
  async findAll(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true }
    });

    return (this.prisma.dreamGoal as any).findMany({
      where: {
        OR: [
          { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null }
        ]
      },
      include: {
        piggyBank: true,
        wishlist: true
      },
      orderBy: { 
        createdAt: 'desc' 
      },
    });
  }

  /**
   * ATUALIZAÇÃO COMPLETA
   * Ajustado para aceitar NULL explicitamente
   */
  async update(id: string, userId: string, dto: UpdateDreamDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true }
    });

    const existingDream = await (this.prisma.dreamGoal as any).findFirst({
      where: {
        id,
        OR: [
          { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId }
        ]
      }
    });

    if (!existingDream) {
      throw new NotFoundException('Sonho não encontrado ou sem permissão.');
    }

    // Lógica para forçar o NULL se a propriedade vier no DTO
    // Se a chave existir no objeto (mesmo que seja null), usamos o valor do DTO.
    // Se a chave NÃO existir (undefined), mantemos o valor que já estava no banco.
    const piggyBankId = dto.hasOwnProperty('piggyBankId') ? dto.piggyBankId : existingDream.piggyBankId;
    const wishlistId = dto.hasOwnProperty('wishlistId') ? dto.wishlistId : existingDream.wishlistId;

    return (this.prisma.dreamGoal as any).update({
      where: { id },
      data: {
        title: dto.title ?? existingDream.title,
        targetValue: dto.targetValue ? Number(dto.targetValue) : existingDream.targetValue,
        savedValue: dto.savedValue !== undefined ? Number(dto.savedValue) : existingDream.savedValue,
        imageUrl: dto.imageUrl ?? existingDream.imageUrl,
        deadline: dto.deadline ? new Date(dto.deadline) : existingDream.deadline,
        piggyBankId: piggyBankId,
        wishlistId: wishlistId,
      },
      include: {
        piggyBank: true,
        wishlist: true
      }
    });
  }

  /**
   * ATUALIZAÇÃO RÁPIDA DE PROGRESSO
   */
  async updateProgress(id: string, userId: string, savedValue: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true }
    });

    const dream = await (this.prisma.dreamGoal as any).findFirst({
      where: {
        id,
        OR: [
          { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId }
        ]
      }
    });

    if (!dream) throw new NotFoundException('Sonho não encontrado.');

    return (this.prisma.dreamGoal as any).update({
      where: { id: dream.id },
      data: { 
        savedValue: Number(savedValue) 
      },
    });
  }

  /**
   * REMOÇÃO
   */
  async remove(id: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true }
    });

    const result = await (this.prisma.dreamGoal as any).deleteMany({
      where: { 
        id, 
        OR: [
          { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId }
        ]
      }
    });

    if (result.count === 0) {
      throw new NotFoundException('Sonho não encontrado.');
    }

    return { deleted: true };
  }
}