import { 
  Injectable, 
  ConflictException, 
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCategoryDto) {
    if (!userId) {
      throw new BadRequestException('ID do usuário é obrigatório.');
    }

    // 1. Busca o vínculo familiar do usuário
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true }
    });

    const familyGroupId = user?.familyGroupId;

    // 2. Verifica duplicidade (Ignora Case Sensitive)
    // Busca se já existe uma categoria com o mesmo nome para este usuário OU para esta família
    const exists = await this.prisma.category.findFirst({
      where: { 
        name: { equals: dto.name, mode: 'insensitive' },
        OR: [
          { familyGroupId: familyGroupId ? familyGroupId : undefined },
          { userId: userId, familyGroupId: null }
        ]
      },
    });

    if (exists) {
      throw new ConflictException('Você já possui uma categoria com este nome');
    }

    // 3. Criação da categoria com todos os campos obrigatórios
    // O erro "Argument type is missing" foi resolvido adicionando dto.type abaixo
    return this.prisma.category.create({
      data: {
        name: dto.name,
        color: dto.color,
        icon: dto.icon,
        type: dto.type, // <-- CAMPO OBRIGATÓRIO ADICIONADO
        userId: userId,
        familyGroupId: familyGroupId,
      },
    });
  }

  async findAll(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true }
    });

    const familyGroupId = user?.familyGroupId;

    // Retorna categorias da família OU categorias privadas do usuário
    return this.prisma.category.findMany({
      where: {
        OR: [
          { familyGroupId: familyGroupId ? familyGroupId : undefined },
          { userId: userId, familyGroupId: null }
        ]
      },
      orderBy: { name: 'asc' }
    });
  }

  async remove(id: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true }
    });

    // deleteMany garante que o usuário só delete se for dono ou da mesma família
    const result = await this.prisma.category.deleteMany({
      where: {
        id: id,
        OR: [
          { familyGroupId: user?.familyGroupId ? user.familyGroupId : undefined },
          { userId: userId, familyGroupId: null }
        ]
      }
    });

    if (result.count === 0) {
      throw new NotFoundException('Categoria não encontrada ou você não tem permissão para excluí-la.');
    }

    return { message: 'Categoria excluída com sucesso' };
  }
}