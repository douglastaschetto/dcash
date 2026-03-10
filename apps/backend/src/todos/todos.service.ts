import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class TodosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, title: string) {
    // 1. Busca o grupo do usuário para vincular a tarefa à família
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true },
    });

    return (this.prisma.todo as any).create({
      data: {
        title,
        isCompleted: false,
        userId,
        familyGroupId: user?.familyGroupId,
      } as any,
    });
  }

  async findAllPending(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true },
    });

    // 2. Busca tarefas pendentes do usuário OU da sua família
    return (this.prisma.todo as any).findMany({
      where: {
        isCompleted: false,
        OR: [
          { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async complete(userId: string, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true },
    });

    // 3. Permite completar se for o dono ou membro da família
    const result = await (this.prisma.todo as any).updateMany({
      where: {
        id,
        OR: [
          { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null },
        ],
      },
      data: { isCompleted: true },
    });

    if (result.count === 0) throw new NotFoundException('Tarefa não encontrada.');
    return result;
  }

  async delete(userId: string, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true },
    });

    // 4. Permite deletar seguindo a mesma regra de permissão familiar
    const result = await (this.prisma.todo as any).deleteMany({
      where: {
        id,
        OR: [
          { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null },
        ],
      },
    });

    if (result.count === 0) throw new NotFoundException('Tarefa não encontrada.');
    return result;
  }
}