import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UpsertChallengeDto } from './dto/upsert-challenge.dto';

const S = 'db_dtasc';

@Injectable()
export class ChallengesService {
  private readonly logger = new Logger(ChallengesService.name);

  constructor(private readonly db: DatabaseService) {}

  private async getUserScope(userId: string) {
    const res = await this.db.query(
      `SELECT family_group_id FROM ${S}.users WHERE id = $1`,
      [userId],
    );
    const familyGroupId = res[0]?.family_group_id;
    return {
      familyGroupId,
      filter: familyGroupId
        ? 'family_group_id = $1'
        : 'user_id = $1 AND family_group_id IS NULL',
      param: familyGroupId || userId,
    };
  }

  async findAll(userId: string, year: number) {
    try {
      const scope = await this.getUserScope(userId);
      const sql = `
        SELECT id, month, year, challenge, status, achieved, observations,
               user_id AS "userId", family_group_id AS "familyGroupId"
        FROM ${S}.financial_challenge
        WHERE ${scope.filter} AND year = $2
        ORDER BY
          CASE month
            WHEN 'Janeiro'   THEN 1  WHEN 'Fevereiro' THEN 2  WHEN 'Março'    THEN 3
            WHEN 'Abril'     THEN 4  WHEN 'Maio'      THEN 5  WHEN 'Junho'    THEN 6
            WHEN 'Julho'     THEN 7  WHEN 'Agosto'    THEN 8  WHEN 'Setembro' THEN 9
            WHEN 'Outubro'   THEN 10 WHEN 'Novembro'  THEN 11 WHEN 'Dezembro' THEN 12
          END ASC
      `;
      return this.db.query(sql, [scope.param, year]);
    } catch (error) {
      this.logger.error(`Erro ao listar desafios: ${error.message}`);
      throw new InternalServerErrorException('Erro ao listar desafios.');
    }
  }

  async upsert(userId: string, dto: UpsertChallengeDto) {
    try {
      const scope = await this.getUserScope(userId);
      const achieved = dto.status === 'Concluída' ? 'Realizado' : 'Não realizado';
      const yearNumber = Number(dto.year);

      // check query: month=$1, year=$2, scope param=$3
      const filterForCheck = scope.filter.replace('$1', '$3');
      const checkSql = `
        SELECT id FROM ${S}.financial_challenge
        WHERE month = $1 AND year = $2 AND ${filterForCheck}
      `;
      const existing = await this.db.query(checkSql, [dto.month, yearNumber, scope.param]);

      if (existing.length > 0) {
        const updateSql = `
          UPDATE ${S}.financial_challenge
          SET challenge = $1, status = $2, achieved = $3, observations = $4
          WHERE id = $5
          RETURNING id, month, year, challenge, status, achieved, observations,
                    user_id AS "userId", family_group_id AS "familyGroupId"
        `;
        const result = await this.db.query(updateSql, [
          dto.challenge,
          dto.status || 'Não iniciada',
          achieved,
          dto.observations || '',
          existing[0].id,
        ]);
        return result[0];
      }

      const insertSql = `
        INSERT INTO ${S}.financial_challenge
          (user_id, family_group_id, month, year, challenge, status, achieved, observations)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, month, year, challenge, status, achieved, observations,
                  user_id AS "userId", family_group_id AS "familyGroupId"
      `;
      const result = await this.db.query(insertSql, [
        userId,
        scope.familyGroupId ?? null,
        dto.month,
        yearNumber,
        dto.challenge,
        dto.status || 'Não iniciada',
        achieved,
        dto.observations || '',
      ]);
      return result[0];
    } catch (error) {
      this.logger.error(`Erro ao salvar desafio: ${error.message}`);
      throw new InternalServerErrorException('Erro ao salvar desafio.');
    }
  }

  async delete(id: string, userId: string) {
    try {
      const scope = await this.getUserScope(userId);
      // id=$1, scope param=$2
      const filterForDelete = scope.filter.replace('$1', '$2');
      const sql = `
        DELETE FROM ${S}.financial_challenge
        WHERE id = $1 AND ${filterForDelete}
        RETURNING id
      `;
      const result = await this.db.query(sql, [id, scope.param]);
      if (!result.length) throw new NotFoundException('Desafio não encontrado.');
      return { deleted: true, id };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Erro ao deletar desafio: ${error.message}`);
      throw new InternalServerErrorException('Erro ao remover desafio.');
    }
  }
}
