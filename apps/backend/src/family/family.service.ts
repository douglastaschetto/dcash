import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DatabaseService } from '../database/database.service';

const SCHEMA = 'db_dtasc';

const MIGRATABLE_TABLES = [
  'category',
  'transactions',
  'piggy_bank',
  'dream_goal',
  'wishlist',
  'category_limit',
  'fixed_bills',
  'payment_method',
  'todo',
  'financial_challenge',
  'price_hunting',
];

@Injectable()
export class FamilyService {
  constructor(private readonly db: DatabaseService) {}

  private generateInviteCode(): string {
    return 'DCASH-' + randomBytes(3).toString('hex').toUpperCase();
  }

  async createGroup(userId: string) {
    const existing = await this.db.query(
      `SELECT family_group_id FROM ${SCHEMA}.users WHERE id = $1`,
      [userId],
    );
    if (existing[0]?.family_group_id) {
      throw new BadRequestException('Usuário já pertence a um grupo familiar');
    }

    const groupId = crypto.randomUUID();
    const inviteCode = this.generateInviteCode();

    await this.db.query(
      `INSERT INTO ${SCHEMA}.family_groups (id, invite_code, name, owner_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [groupId, inviteCode, 'Minha Família', userId],
    );

    await this.db.query(
      `UPDATE ${SCHEMA}.users SET family_group_id = $1 WHERE id = $2`,
      [groupId, userId],
    );

    await this.migrateUserToFamily(userId, groupId);

    return { id: groupId, inviteCode, name: 'Minha Família' };
  }

  async joinGroup(userId: string, inviteCode: string) {
    const existing = await this.db.query(
      `SELECT family_group_id FROM ${SCHEMA}.users WHERE id = $1`,
      [userId],
    );
    if (existing[0]?.family_group_id) {
      throw new BadRequestException('Usuário já pertence a um grupo familiar');
    }

    const groups = await this.db.query(
      `SELECT id, name, invite_code FROM ${SCHEMA}.family_groups WHERE invite_code = $1`,
      [inviteCode],
    );
    if (!groups.length) {
      throw new NotFoundException('Código de convite inválido');
    }

    const group = groups[0];

    await this.db.query(
      `UPDATE ${SCHEMA}.users SET family_group_id = $1 WHERE id = $2`,
      [group.id, userId],
    );

    await this.migrateUserToFamily(userId, group.id);

    return { id: group.id, inviteCode: group.invite_code, name: group.name };
  }

  async getMembers(userId: string) {
    const user = await this.db.query(
      `SELECT family_group_id FROM ${SCHEMA}.users WHERE id = $1`,
      [userId],
    );
    if (!user.length || !user[0].family_group_id) {
      return { members: [], inviteCode: null };
    }

    const groupId = user[0].family_group_id;

    const [group] = await this.db.query(
      `SELECT id, name, invite_code, owner_id AS "ownerId" FROM ${SCHEMA}.family_groups WHERE id = $1`,
      [groupId],
    );

    const members = await this.db.query(
      `SELECT id, name, email, avatar, created_at FROM ${SCHEMA}.users WHERE family_group_id = $1`,
      [groupId],
    );

    return {
      group: {
        id: group?.id,
        name: group?.name,
        inviteCode: group?.invite_code,
        ownerId: group?.ownerId,
        isOwner: group?.ownerId === userId,
      },
      members,
    };
  }

  async renameGroup(userId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException('Informe um nome para o grupo.');

    const user = await this.db.query(
      `SELECT family_group_id FROM ${SCHEMA}.users WHERE id = $1`,
      [userId],
    );
    const groupId = user[0]?.family_group_id;
    if (!groupId) throw new NotFoundException('Você não pertence a um grupo familiar.');

    const [group] = await this.db.query(
      `SELECT owner_id AS "ownerId" FROM ${SCHEMA}.family_groups WHERE id = $1`,
      [groupId],
    );
    if (group?.ownerId !== userId) {
      throw new ForbiddenException('Apenas quem criou o grupo pode renomeá-lo.');
    }

    await this.db.query(
      `UPDATE ${SCHEMA}.family_groups SET name = $1 WHERE id = $2`,
      [trimmed, groupId],
    );

    return { id: groupId, name: trimmed };
  }

  private async migrateUserToFamily(userId: string, groupId: string) {
    for (const table of MIGRATABLE_TABLES) {
      try {
        await this.db.query(
          `UPDATE ${SCHEMA}.${table} SET family_group_id = $1
           WHERE user_id = $2 AND family_group_id IS NULL`,
          [groupId, userId],
        );
      } catch {
        // tabela pode não ter a coluna family_group_id — ignorar silenciosamente
      }
    }
  }
}
