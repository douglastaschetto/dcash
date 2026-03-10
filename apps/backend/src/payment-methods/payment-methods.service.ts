import { 
  Injectable, 
  NotFoundException, 
  ForbiddenException 
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(private prisma: PrismaService) {}

  private async getUserFamily(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true },
    });
    return user?.familyGroupId || null;
  }

  async findAll(userId: string) {
    try {
      const familyGroupId = await this.getUserFamily(userId);

      // Usamos 'as any' para evitar erro caso familyGroupId não esteja no cache do tipo
      return await (this.prisma.paymentMethod as any).findMany({
        where: {
          OR: [
            { familyGroupId: familyGroupId ?? 'undefined' } as any,
            { userId: userId, familyGroupId: null } as any
          ]
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });
    } catch (error) {
      console.error("ERRO NO FINDALL PAYMENT METHODS:", error);
      return [];
    }
  }

  async create(data: CreatePaymentMethodDto, userId: string) {
    const familyGroupId = await this.getUserFamily(userId);
    const { ownerId, ...rest } = data;

    return (this.prisma.paymentMethod as any).create({
      data: { 
        ...rest, 
        userId, 
        familyGroupId, 
        ownerId: ownerId || userId,
        limit: data.limit ? Number(data.limit) : 0, 
        closingDay: data.closingDay ? Number(data.closingDay) : null, 
        dueDay: data.dueDay ? Number(data.dueDay) : null 
      } as any
    });
  }

  async update(id: string, userId: string, data: Partial<CreatePaymentMethodDto>) {
    const [existing, userFamilyId] = await Promise.all([
      (this.prisma.paymentMethod as any).findUnique({ where: { id } }),
      this.getUserFamily(userId)
    ]);

    if (!existing) throw new NotFoundException('Forma de pagamento não encontrada');

    // Lógica de Permissão Familiar
    const hasPermission = userFamilyId && existing.familyGroupId
      ? userFamilyId === existing.familyGroupId
      : existing.userId === userId;

    if (!hasPermission) {
      throw new ForbiddenException('Você não tem permissão para gerenciar este item.');
    }

    const { 
      name, type, icon, color, limit, 
      closingDay, dueDay, description, ownerId 
    } = data as any;

    return this.prisma.paymentMethod.update({
      where: { id },
      data: { 
        name,
        type,
        icon,
        color,
        description,
        ownerId,
        limit: limit !== undefined ? Number(limit) : undefined,
        closingDay: closingDay !== undefined ? Number(closingDay) : undefined,
        dueDay: dueDay !== undefined ? Number(dueDay) : undefined
      }
    });
  }

  async remove(id: string, userId: string) {
    const [existing, userFamilyId] = await Promise.all([
      (this.prisma.paymentMethod as any).findUnique({ where: { id } }),
      this.getUserFamily(userId)
    ]);

    if (!existing) throw new NotFoundException('Item não encontrado');

    const hasPermission = userFamilyId && existing.familyGroupId
      ? userFamilyId === existing.familyGroupId
      : existing.userId === userId;

    if (!hasPermission) throw new ForbiddenException('Acesso negado');

    return (this.prisma.paymentMethod as any).delete({ where: { id } });
  }
}