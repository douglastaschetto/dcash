import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { TOUR_TARGET_CATALOG, findTourTarget } from './target-catalog';

const S = 'db_dtasc';

interface SeedStep {
  target: string;
  route: string;
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  actionType: 'none' | 'click' | 'navigate';
  actionValue?: string;
}

const PILOT_TOUR = {
  key: 'dashboard-intro',
  title: 'Conhecendo o Painel Início',
  description: 'Um tour rápido pelas principais áreas do DCash.',
  steps: [
    {
      target: 'dashboard-greeting',
      route: '/dashboard-v2',
      title: '👋 Bem-vindo ao Painel Início!',
      description: 'Aqui você vê um resumo rápido da sua vida financeira assim que entra no DCash.',
      placement: 'bottom',
      actionType: 'none',
    },
    {
      target: 'dashboard-balance-card',
      route: '/dashboard-v2',
      title: '💰 Saldo do mês',
      description: 'Este card mostra quanto entrou, quanto saiu e o saldo do mês selecionado.',
      placement: 'bottom',
      actionType: 'none',
    },
    {
      target: 'dashboard-quick-actions',
      route: '/dashboard-v2',
      title: '⚡ Ações rápidas',
      description: 'Lance receitas, despesas, categorias novas ou formas de pagamento sem sair desta tela.',
      placement: 'bottom',
      actionType: 'none',
    },
    {
      target: 'dashboard-dre-toggle',
      route: '/dashboard-v2',
      title: '📊 Veja como DRE',
      description: 'Clique em "Próximo" e observe — vamos alternar sozinhos para a visão de Demonstrativo de Resultado.',
      placement: 'left',
      actionType: 'click',
    },
    {
      target: 'dashboard-installments-card',
      route: '/dashboard-v2',
      title: '🧩 Raio-X de parcelamentos',
      description: 'Veja quanto da sua renda já está comprometida com parcelas.',
      placement: 'top',
      actionType: 'none',
    },
    {
      target: 'dashboard-planning-card',
      route: '/dashboard-v2',
      title: '🎯 Planejamento do mês',
      description: 'Acompanhe se você está dentro do orçamento definido para cada categoria.',
      placement: 'top',
      actionType: 'none',
    },
    {
      target: 'dashboard-quick-actions',
      route: '/dashboard-v2',
      title: '👉 Vamos lançar algo em Transações',
      description: 'Clique em "Próximo" e vamos até a tela de Transações sozinhos.',
      placement: 'bottom',
      actionType: 'navigate',
      actionValue: '/transactions',
    },
    {
      target: 'transactions-lancar-btn',
      route: '/transactions',
      title: '➕ Lançar novo movimento',
      description: 'Aqui você lança receitas, despesas, investimentos ou importa um extrato OFX. Tour concluído! 🎉',
      placement: 'bottom',
      actionType: 'none',
    },
  ] as SeedStep[],
};

@Injectable()
export class GuidedToursService {
  private schemaEnsured = false;
  private seedEnsured = false;

  constructor(private readonly db: DatabaseService) {}

  private async ensureSchema() {
    if (this.schemaEnsured) return;
    await this.db.query(
      `CREATE TABLE IF NOT EXISTS ${S}.guided_tours (
        id          TEXT PRIMARY KEY,
        key         TEXT UNIQUE NOT NULL,
        title       TEXT NOT NULL,
        description TEXT,
        is_active   BOOLEAN NOT NULL DEFAULT true,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      [],
    );
    await this.db.query(
      `CREATE TABLE IF NOT EXISTS ${S}.guided_tour_steps (
        id            TEXT PRIMARY KEY,
        tour_id       TEXT NOT NULL REFERENCES ${S}.guided_tours(id) ON DELETE CASCADE,
        step_order    INTEGER NOT NULL,
        target        TEXT NOT NULL,
        route         TEXT NOT NULL,
        title         TEXT NOT NULL,
        description   TEXT NOT NULL,
        placement     TEXT NOT NULL DEFAULT 'bottom',
        action_type   TEXT NOT NULL DEFAULT 'none',
        action_value  TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      [],
    );
    await this.db.query(
      `CREATE INDEX IF NOT EXISTS idx_guided_tour_steps_tour ON ${S}.guided_tour_steps (tour_id, step_order)`,
      [],
    );
    this.schemaEnsured = true;
  }

  private async ensureSeed() {
    if (this.seedEnsured) return;
    await this.ensureSchema();

    const existing = await this.db.query(`SELECT id FROM ${S}.guided_tours WHERE key = $1`, [PILOT_TOUR.key]);
    if (!existing.length) {
      const tourId = randomUUID();
      await this.db.query(
        `INSERT INTO ${S}.guided_tours (id, key, title, description) VALUES ($1, $2, $3, $4)`,
        [tourId, PILOT_TOUR.key, PILOT_TOUR.title, PILOT_TOUR.description],
      );
      for (let i = 0; i < PILOT_TOUR.steps.length; i++) {
        const step = PILOT_TOUR.steps[i];
        await this.db.query(
          `INSERT INTO ${S}.guided_tour_steps
             (id, tour_id, step_order, target, route, title, description, placement, action_type, action_value)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            randomUUID(), tourId, i + 1, step.target, step.route,
            step.title, step.description, step.placement, step.actionType, step.actionValue || null,
          ],
        );
      }
    }
    this.seedEnsured = true;
  }

  async getByKey(key: string) {
    await this.ensureSeed();
    const tours = await this.db.query(
      `SELECT id, key, title, description FROM ${S}.guided_tours WHERE key = $1 AND is_active = true`,
      [key],
    );
    if (!tours.length) return null;
    const tour = tours[0];
    const steps = await this.db.query(
      `SELECT id, step_order AS "order", target, route, title, description, placement,
              action_type AS "actionType", action_value AS "actionValue"
       FROM ${S}.guided_tour_steps
       WHERE tour_id = $1
       ORDER BY step_order ASC`,
      [tour.id],
    );
    return { ...tour, steps };
  }

  async listActive() {
    await this.ensureSeed();
    return this.db.query(
      `SELECT id, key, title, description FROM ${S}.guided_tours WHERE is_active = true ORDER BY title ASC`,
      [],
    );
  }

  // ── Admin CRUD (Fase 2 — editor visual) ──────────────────────────────

  getTargetCatalog() {
    return TOUR_TARGET_CATALOG;
  }

  async listAllForAdmin() {
    await this.ensureSeed();
    return this.db.query(
      `SELECT t.id, t.key, t.title, t.description, t.is_active AS "isActive", t.created_at AS "createdAt",
              COUNT(s.id)::int AS "stepCount"
       FROM ${S}.guided_tours t
       LEFT JOIN ${S}.guided_tour_steps s ON s.tour_id = t.id
       GROUP BY t.id
       ORDER BY t.created_at DESC`,
      [],
    );
  }

  async getTourDetail(id: string) {
    await this.ensureSeed();
    const tours = await this.db.query(
      `SELECT id, key, title, description, is_active AS "isActive" FROM ${S}.guided_tours WHERE id = $1`,
      [id],
    );
    if (!tours.length) return null;
    const steps = await this.db.query(
      `SELECT id, step_order AS "order", target, route, title, description, placement,
              action_type AS "actionType", action_value AS "actionValue"
       FROM ${S}.guided_tour_steps
       WHERE tour_id = $1
       ORDER BY step_order ASC`,
      [id],
    );
    return { ...tours[0], steps };
  }

  private slugify(title: string): string {
    const diacritics = new RegExp('[\\u0300-\\u036f]', 'g');
    const slug = title
      .normalize('NFD')
      .replace(diacritics, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || 'guia';
  }

  private async generateUniqueKey(title: string): Promise<string> {
    const base = this.slugify(title);
    let candidate = base;
    let suffix = 2;
    for (;;) {
      const existing = await this.db.query(`SELECT 1 FROM ${S}.guided_tours WHERE key = $1`, [candidate]);
      if (!existing.length) return candidate;
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
  }

  async createTour(data: { title: string; description?: string }) {
    await this.ensureSeed();
    const key = await this.generateUniqueKey(data.title);
    const id = randomUUID();
    await this.db.query(
      `INSERT INTO ${S}.guided_tours (id, key, title, description) VALUES ($1, $2, $3, $4)`,
      [id, key, data.title, data.description ?? null],
    );
    return this.getTourDetail(id);
  }

  async updateTour(id: string, data: { title?: string; description?: string; isActive?: boolean }) {
    const tour = await this.getTourDetail(id);
    if (!tour) throw new BadRequestException('Guia não encontrado.');
    await this.db.query(
      `UPDATE ${S}.guided_tours SET
         title = COALESCE($2, title),
         description = COALESCE($3, description),
         is_active = COALESCE($4, is_active)
       WHERE id = $1`,
      [id, data.title ?? null, data.description ?? null, data.isActive ?? null],
    );
    return this.getTourDetail(id);
  }

  async deleteTour(id: string) {
    await this.db.query(`DELETE FROM ${S}.guided_tours WHERE id = $1`, [id]);
    return { success: true };
  }

  async addStep(tourId: string, data: {
    target: string; title: string; description: string;
    placement: string; actionType: string; actionValue?: string;
  }) {
    const tour = await this.getTourDetail(tourId);
    if (!tour) throw new BadRequestException('Guia não encontrado.');
    const targetEntry = findTourTarget(data.target);
    if (!targetEntry) throw new BadRequestException('Alvo não encontrado no catálogo.');

    const maxOrder = await this.db.query(
      `SELECT COALESCE(MAX(step_order), 0) AS "maxOrder" FROM ${S}.guided_tour_steps WHERE tour_id = $1`,
      [tourId],
    );
    const nextOrder = (maxOrder[0]?.maxOrder ?? 0) + 1;

    await this.db.query(
      `INSERT INTO ${S}.guided_tour_steps
         (id, tour_id, step_order, target, route, title, description, placement, action_type, action_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        randomUUID(), tourId, nextOrder, data.target, targetEntry.route,
        data.title, data.description, data.placement, data.actionType, data.actionValue || null,
      ],
    );
    return this.getTourDetail(tourId);
  }

  async updateStep(tourId: string, stepId: string, data: {
    target?: string; title?: string; description?: string;
    placement?: string; actionType?: string; actionValue?: string;
  }) {
    let route: string | null = null;
    if (data.target) {
      const targetEntry = findTourTarget(data.target);
      if (!targetEntry) throw new BadRequestException('Alvo não encontrado no catálogo.');
      route = targetEntry.route;
    }
    await this.db.query(
      `UPDATE ${S}.guided_tour_steps SET
         target = COALESCE($3, target),
         route = COALESCE($4, route),
         title = COALESCE($5, title),
         description = COALESCE($6, description),
         placement = COALESCE($7, placement),
         action_type = COALESCE($8, action_type),
         action_value = COALESCE($9, action_value)
       WHERE id = $1 AND tour_id = $2`,
      [
        stepId, tourId, data.target ?? null, route, data.title ?? null,
        data.description ?? null, data.placement ?? null, data.actionType ?? null, data.actionValue ?? null,
      ],
    );
    return this.getTourDetail(tourId);
  }

  async deleteStep(tourId: string, stepId: string) {
    await this.db.query(`DELETE FROM ${S}.guided_tour_steps WHERE id = $1 AND tour_id = $2`, [stepId, tourId]);
    return this.getTourDetail(tourId);
  }

  async reorderSteps(tourId: string, orderedStepIds: string[]) {
    const steps = await this.db.query(`SELECT id FROM ${S}.guided_tour_steps WHERE tour_id = $1`, [tourId]);
    const validIds = new Set(steps.map((s: { id: string }) => s.id));
    if (orderedStepIds.length !== validIds.size || !orderedStepIds.every((id) => validIds.has(id))) {
      throw new BadRequestException('Lista de passos inválida para este guia.');
    }

    await this.db.transaction(async (client) => {
      for (let i = 0; i < orderedStepIds.length; i++) {
        await client.query(
          `UPDATE ${S}.guided_tour_steps SET step_order = $1 WHERE id = $2 AND tour_id = $3`,
          [i + 1, orderedStepIds[i], tourId],
        );
      }
    });
    return this.getTourDetail(tourId);
  }
}
