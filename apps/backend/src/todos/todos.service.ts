import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

const S = 'db_dtasc';

@Injectable()
export class TodosService {
  private readonly logger = new Logger(TodosService.name);

  constructor(private readonly db: DatabaseService) {}

  private async getScope(userId: string, paramIndex = 1) {
    const res = await this.db.query(
      `SELECT family_group_id FROM ${S}.users WHERE id = $1`,
      [userId],
    );
    const familyGroupId = res[0]?.family_group_id;
    const idx = `$${paramIndex}`;
    return {
      familyGroupId,
      filter: familyGroupId
        ? `family_group_id = ${idx}`
        : `user_id = ${idx} AND family_group_id IS NULL`,
      param: familyGroupId || userId,
    };
  }

  async create(userId: string, title: string) {
    try {
      const scope = await this.getScope(userId);
      const sql = `
        INSERT INTO ${S}.todo (title, is_completed, user_id, family_group_id)
        VALUES ($1, false, $2, $3)
        RETURNING id, title,
          is_completed    AS "isCompleted",
          user_id         AS "userId",
          family_group_id AS "familyGroupId",
          created_at      AS "createdAt"
      `;
      const result = await this.db.query(sql, [title, userId, scope.familyGroupId ?? null]);
      return result[0];
    } catch (error) {
      this.logger.error(`Erro ao criar tarefa: ${error.message}`);
      throw new InternalServerErrorException('Não foi possível criar a tarefa.');
    }
  }

  async findAllPending(userId: string) {
    try {
      const scope = await this.getScope(userId, 1);
      const sql = `
        SELECT id, title,
          is_completed    AS "isCompleted",
          user_id         AS "userId",
          family_group_id AS "familyGroupId",
          created_at      AS "createdAt"
        FROM ${S}.todo
        WHERE is_completed = false AND ${scope.filter}
        ORDER BY created_at DESC
      `;
      return this.db.query(sql, [scope.param]);
    } catch (error) {
      this.logger.error(`Erro ao listar tarefas: ${error.message}`);
      throw new InternalServerErrorException('Erro ao listar tarefas.');
    }
  }

  async findAll(userId: string) {
    try {
      const scope = await this.getScope(userId, 1);
      const sql = `
        SELECT id, title,
          is_completed    AS "isCompleted",
          user_id         AS "userId",
          family_group_id AS "familyGroupId",
          created_at      AS "createdAt"
        FROM ${S}.todo
        WHERE ${scope.filter}
        ORDER BY is_completed ASC, created_at DESC
      `;
      return this.db.query(sql, [scope.param]);
    } catch (error) {
      this.logger.error(`Erro ao listar tarefas: ${error.message}`);
      throw new InternalServerErrorException('Erro ao listar tarefas.');
    }
  }

  async complete(userId: string, id: string) {
    try {
      const scope = await this.getScope(userId, 2);
      const result = await this.db.query(
        `UPDATE ${S}.todo SET is_completed = true WHERE id = $1 AND ${scope.filter} RETURNING id`,
        [id, scope.param],
      );
      if (!result?.length) throw new NotFoundException('Tarefa não encontrada.');
      return { success: true, id: result[0].id };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Erro ao concluir tarefa: ${error.message}`);
      throw new InternalServerErrorException('Erro ao concluir tarefa.');
    }
  }

  async uncomplete(userId: string, id: string) {
    try {
      const scope = await this.getScope(userId, 2);
      const result = await this.db.query(
        `UPDATE ${S}.todo SET is_completed = false WHERE id = $1 AND ${scope.filter} RETURNING id`,
        [id, scope.param],
      );
      if (!result?.length) throw new NotFoundException('Tarefa não encontrada.');
      return { success: true, id: result[0].id };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Erro ao reabrir tarefa.');
    }
  }

  async delete(userId: string, id: string) {
    try {
      const scope = await this.getScope(userId, 2);
      const result = await this.db.query(
        `DELETE FROM ${S}.todo WHERE id = $1 AND ${scope.filter} RETURNING id`,
        [id, scope.param],
      );
      if (!result?.length) throw new NotFoundException('Tarefa não encontrada.');
      return { success: true };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Erro ao deletar tarefa: ${error.message}`);
      throw new InternalServerErrorException('Erro ao remover tarefa.');
    }
  }
}
