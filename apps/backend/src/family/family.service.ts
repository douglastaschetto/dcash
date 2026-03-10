import { 
  Injectable, 
  BadRequestException, 
  NotFoundException 
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FamilyService {
  constructor(private prisma: PrismaService) {}

  /**
   * Função de Migração:
   * Percorre todas as tabelas e vincula dados antigos (familyGroupId: null)
   * ao novo grupo da família do usuário.
   */
  private async migrateUserToFamily(userId: string, familyGroupId: string) {
    const tablesToUpdate = [
      'category',
      'transaction',
      'piggyBank',
      'dreamGoal',
      'wishlist',
      'categoryLimit',
      'fixedBill',
      'paymentMethod',
      'todo',
      'financialChallenge',
      'priceHunting'
    ];

    try {
      const updatePromises = tablesToUpdate.map((modelName) => {
        // Verificamos se o model existe no prisma antes de tentar o updateMany
        if (this.prisma[modelName]) {
          return this.prisma[modelName].updateMany({
            where: {
              userId: userId,
              familyGroupId: null, 
            },
            data: {
              familyGroupId: familyGroupId,
            },
          });
        }
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Erro na migração de dados:', error);
      // Não lançamos erro aqui para não travar a entrada no grupo, 
      // mas registramos no log.
    }
  }

  async createGroup(userId: string) {
    // 1. Busca o usuário e garante que ele existe
    const user = await this.prisma.user.findUnique({ 
      where: { id: userId } 
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    // 2. Verifica se o usuário já está em algum grupo
    if (user.familyGroupId) {
      throw new BadRequestException('Você já pertence a um grupo familiar.');
    }

    // 3. Gera código de convite único (Ex: DCASH-A1B2C3)
    const inviteCode = `DCASH-${randomBytes(3).toString('hex').toUpperCase()}`;

    // 4. Cria o grupo (O id explícito resolve o erro TS2322)
    const group = await this.prisma.familyGroup.create({
      data: {
        id: uuidv4(), 
        name: `Família ${user.name || 'Dcash'}`,
        inviteCode,
        members: {
          connect: { id: userId }
        }
      }
    });

    // 5. Migra dados antigos para o novo grupo
    await this.migrateUserToFamily(userId, group.id);

    return group;
  }

  async joinGroup(userId: string, inviteCode: string) {
    // 1. Verifica se o código de convite existe
    const group = await this.prisma.familyGroup.findUnique({
      where: { inviteCode: inviteCode.toUpperCase() }
    });

    if (!group) {
      throw new BadRequestException('Código de convite inválido ou expirado.');
    }

    // 2. Verifica se o usuário já não está em outro grupo
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.familyGroupId) {
      throw new BadRequestException('Você já pertence a um grupo familiar.');
    }

    // 3. Vincula o usuário ao grupo
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { familyGroupId: group.id },
    });

    // 4. Migra dados antigos para o novo grupo
    await this.migrateUserToFamily(userId, group.id);

    return updatedUser;
  }
}