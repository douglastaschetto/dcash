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

const step = (target: string, route: string, title: string, description: string,
  placement: SeedStep['placement'] = 'bottom', actionType: SeedStep['actionType'] = 'none', actionValue?: string): SeedStep =>
  ({ target, route, title, description, placement, actionType, actionValue });

const PAINEL_TOUR = {
  key: 'painel-intro',
  title: 'Conhecendo o Painel gerencial',
  description: 'Finanças e casa numa tela só: o que olhar primeiro todo dia.',
  steps: [
    step('painel-greeting', '/painel', '👋 Seu Painel gerencial', 'É a tela inicial do DCash: junta o resumo das finanças com a rotina da casa. O selo ao lado mostra a família e o mês que você está vendo.'),
    step('painel-quick-actions', '/painel', '⚡ Ações e atalhos', 'Lance receita ou despesa em 1 clique. Os menus "Finanças" e "Casa" levam a qualquer tela, e os atalhos abrem Calendário, Tarefas e Compras.'),
    step('painel-kpis', '/painel', '💰 O mês em 3 números', 'Saldo, receitas e despesas do mês selecionado, comparados com o mês anterior.'),
    step('painel-week', '/painel', '📆 Hoje + próximos 6 dias', 'Cada card é um dia com tarefas, hábitos, contas e eventos. Toque num dia para ver os detalhes logo abaixo.'),
    step('painel-day', '/painel', '☀️ O dia em detalhe', 'Conclua tarefas, marque hábitos e veja as finanças do dia selecionado sem sair do painel. "Marcar" cria um compromisso.', 'top'),
    step('painel-categories', '/painel', '🥧 Para onde vai o dinheiro', 'Ranking de despesas por categoria, com o orçado de cada uma quando há planejamento.', 'top'),
    step('painel-dre-toggle', '/painel', '📊 Visão DRE por pessoa', 'Clique em "Próximo" e mudamos para o DRE: receitas e despesas em colunas por membro da família, com total.', 'left', 'click'),
    step('painel-installments', '/painel', '🗂️ Raio-X dos parcelamentos', 'Saldo devedor, parcelas do mês e do próximo, quitações e parcelas vencidas num só card.', 'top'),
    step('painel-planning', '/painel', '🎯 Planejamento do mês', 'Acompanhe se cada categoria está dentro do limite que você definiu.', 'left'),
    step('painel-status', '/painel', '🧭 Resumo rápido', 'Lista de compras (amarela quando tem item pra comprar), cofrinhos, sonhos e desejos. Toque para abrir cada um.', 'left'),
    step('painel-radar', '/painel', '📡 Radar da família', 'Pontos de atenção automáticos: mês no vermelho, parcelas vencidas, tarefas atrasadas, aniversários… O que é crítico aparece em vermelho no topo. Tour concluído! 🎉', 'left'),
  ],
};

const DCAOS_TOUR = {
  key: 'dcaos-intro',
  title: 'DCaos: a casa organizada',
  description: 'Tarefas, mercado, recados, hábitos, datas e manutenção da família (add-on DCaos).',
  steps: [
    step('dcaos-hub-greeting', '/dcaos', '🏡 Bem-vindo à Casa', 'O resumo da rotina da família. Os botões criam tarefa, item de mercado ou um "deu ruim" rapidinho.'),
    step('dcaos-hub-insights', '/dcaos', '✨ Como está a casa hoje', 'Tarefas do dia, lista de compras, recados, datas e manutenções, com o que precisa de atenção.'),
    step('dcaos-hub-today', '/dcaos', '📝 Hoje, mercado e bilhetes', 'Quem tem o que fazer hoje, a lista de compras de papel e os bilhetinhos da família.', 'top'),
    step('dcaos-hub-modules', '/dcaos', '🧩 Todos os módulos', 'Atalhos para cada parte do DCaos. Vamos passear por eles agora.', 'top'),
    step('dcaos-tasks-page', '/dcaos/tarefas', '📝 Quem Vai Fazer?', 'Tarefas da casa com responsável, prazo e repetição (diária, dias da semana, quinzenal, mensal). Tem placar de quem mais ajudou.', 'top'),
    step('dcaos-market-tabs', '/dcaos/mercado', '🛒 Abastece Aí', 'Lista de compras e despensa no mesmo lugar. Marque "Acabou!" na despensa e o item vai sozinho pra lista.'),
    step('dcaos-notes-composer', '/dcaos/recados', '🗒️ Recados', 'Deixe bilhetes para a família toda ou para alguém. Eles aparecem no painel até a pessoa marcar como lido.'),
    step('dcaos-habits-page', '/dcaos/habitos', '🔁 Faz Todo Dia', 'Hábitos pessoais (saúde, estudo, bem-estar) com sequência de dias. Tarefas da casa ficam em "Quem Vai Fazer?".', 'top'),
    step('dcaos-dates-page', '/dcaos/datas', '🎂 Não Esquece', 'Aniversários, datas comemorativas e vencimento de documentos, com lembrete antes.', 'top'),
    step('dcaos-maintenance-page', '/dcaos/manutencao', '🔧 Deu Ruim', 'Consertos e manutenções preventivas da casa e do carro. Urgências aparecem no Radar do painel. Tour concluído! 🎉', 'top'),
  ],
};

const MARKET_TOUR = {
  key: 'dcaos-mercado',
  title: 'Abastece Aí: lista e despensa',
  description: 'Como usar a lista de compras, a despensa e a vitrine de produtos.',
  steps: [
    step('dcaos-market-tabs', '/dcaos/mercado', '🛒 Duas visões', '"Lista de compras" é o que falta comprar; "Despensa" é o que já tem em casa.'),
    step('dcaos-market-add', '/dcaos/mercado', '✍️ Anote do jeito que fala', 'Digite "2 kg açúcar" ou "3 leite": quantidade, unidade e categoria são preenchidas sozinhas.'),
    step('dcaos-market-pantry-tab', '/dcaos/mercado', '📦 Vamos para a despensa', 'Clique em "Próximo" e abrimos a aba Despensa pra você.', 'bottom', 'click'),
    step('dcaos-market-showcase', '/dcaos/mercado', '✨ Vitrine de produtos', 'Monte a despensa em 1 minuto: escolha os produtos e eles já vêm com quantidade, aviso de estoque baixo e validade média. Tour concluído! 🎉', 'left'),
  ],
};

const NOTES_TOUR = {
  key: 'dcaos-recados',
  title: 'Recados e bilhetinhos',
  description: 'Mandar, ler, reagir e guardar os bilhetes da família.',
  steps: [
    step('dcaos-notes-composer', '/dcaos/recados', '✍️ Escreva um recado', 'Escolha pra quem (família toda ou uma pessoa), a cor e se quer fixar. Ctrl+Enter envia.'),
    step('dcaos-notes-tabs', '/dcaos/recados', '📥 Mural, Meus bilhetes e Enviados', 'O Mural mostra o que você ainda não leu. Ao marcar "Li", o bilhete vai para "Meus bilhetes". Seus recados ficam em "Enviados".'),
    step('painel-notes', '/painel', '💬 Bilhetes no painel', 'Os bilhetes também aparecem no painel. Reaja com ❤️ 👍 😂 😮 😢 😡 (ou toque duas vezes no texto) e toque em "Li" para tirar da tela. Tour concluído! 🎉', 'left'),
  ],
};

const SEED_TOURS = [PILOT_TOUR, PAINEL_TOUR, DCAOS_TOUR, MARKET_TOUR, NOTES_TOUR];

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

    // Built-in tours are inserted once (by key); admin edits afterwards are kept.
    for (const seed of SEED_TOURS) {
      const existing = await this.db.query(`SELECT id FROM ${S}.guided_tours WHERE key = $1`, [seed.key]);
      if (existing.length) continue;
      const tourId = randomUUID();
      await this.db.query(
        `INSERT INTO ${S}.guided_tours (id, key, title, description) VALUES ($1, $2, $3, $4)`,
        [tourId, seed.key, seed.title, seed.description],
      );
      for (let i = 0; i < seed.steps.length; i++) {
        const step = seed.steps[i];
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
