import { HttpException, HttpStatus, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { DatabaseService } from '../database/database.service';
import { SUPPORT_KNOWLEDGE_BASE } from './knowledge-base';
import { FINANCIAL_TOOLS } from './financial-tools';
import { PaymentMethodsService } from '../payment-methods/payment-methods.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CategoryLimitsService } from '../category-limits/category-limits.service';
import { FixedBillsService } from '../fixed-bills/fixed-bills.service';
import { PiggyBanksService } from '../piggy-banks/piggy-banks.service';
import { DreamsService } from '../dreams/dreams.service';
import { PlanService } from '../plan/plan.service';

const S = 'db_dtasc';
const MAX_HISTORY_MESSAGES = 20;
const MAX_TOOL_ITERATIONS = 5;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_MESSAGES = 15;
const SUPPORT_EMAIL = 'contato@dtasc.com.br';

type ChatRole = 'user' | 'assistant';

export interface ChatMessageRow {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

@Injectable()
export class SupportAiService {
  private readonly logger = new Logger(SupportAiService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName: string;
  private tableEnsured = false;
  private readonly rateLimitHits = new Map<string, number[]>();

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly transactionsService: TransactionsService,
    private readonly categoryLimitsService: CategoryLimitsService,
    private readonly fixedBillsService: FixedBillsService,
    private readonly piggyBanksService: PiggyBanksService,
    private readonly dreamsService: DreamsService,
    private readonly planService: PlanService,
  ) {
    this.genAI = new GoogleGenerativeAI(this.config.get<string>('GEMINI_API_KEY') ?? '');
    this.modelName = this.config.get<string>('GEMINI_MODEL_NAME') || 'gemini-2.5-flash';
  }

  private async ensureTable() {
    if (this.tableEnsured) return;
    await this.db.query(
      `CREATE TABLE IF NOT EXISTS ${S}.support_chat_messages (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL,
        role        TEXT NOT NULL,
        content     TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      [],
    );
    await this.db.query(
      `CREATE INDEX IF NOT EXISTS idx_support_chat_messages_user_id
        ON ${S}.support_chat_messages (user_id, created_at)`,
      [],
    );
    this.tableEnsured = true;
  }

  private checkRateLimit(userId: string) {
    const now = Date.now();
    const hits = (this.rateLimitHits.get(userId) ?? []).filter(
      (t) => now - t < RATE_LIMIT_WINDOW_MS,
    );
    if (hits.length >= RATE_LIMIT_MAX_MESSAGES) {
      throw new HttpException(
        'Muitas mensagens em pouco tempo. Aguarde um instante antes de continuar.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    hits.push(now);
    this.rateLimitHits.set(userId, hits);
  }

  async getHistory(userId: string): Promise<ChatMessageRow[]> {
    await this.ensureTable();
    return this.db.query<ChatMessageRow>(
      `SELECT id, role, content, created_at AS "createdAt"
       FROM ${S}.support_chat_messages
       WHERE user_id = $1
       ORDER BY created_at ASC
       LIMIT 100`,
      [userId],
    );
  }

  private async saveMessage(userId: string, role: ChatRole, content: string): Promise<ChatMessageRow> {
    const result = await this.db.query<ChatMessageRow>(
      `INSERT INTO ${S}.support_chat_messages (id, user_id, role, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id, role, content, created_at AS "createdAt"`,
      [randomUUID(), userId, role, content],
    );
    return result[0];
  }

  /**
   * Executores das ferramentas financeiras — cada função consulta apenas dados do
   * `userId` autenticado (nunca de um id vindo dos argumentos do modelo), reaproveitando
   * os services já escopados por usuário/família de cada módulo.
   */
  private buildToolExecutors(userId: string): Record<string, (args: any) => Promise<object>> {
    const now = new Date();
    const resolveMonth = (args: any) => Number(args?.month) || now.getMonth() + 1;
    const resolveYear = (args: any) => Number(args?.year) || now.getFullYear();

    return {
      get_accounts: async () => ({
        accounts: await this.paymentMethodsService.findAll(userId),
      }),
      get_monthly_summary: async (args) =>
        this.transactionsService.getMonthlySummary(userId, resolveMonth(args), resolveYear(args)),
      get_transactions: async (args) => ({
        transactions: await this.transactionsService.getTransactionsFiltered(userId, {
          from: args?.from,
          to: args?.to,
          type: args?.type,
          limit: args?.limit,
        }),
      }),
      get_budget_status: async (args) => ({
        categories: await this.categoryLimitsService.getDashboard(userId, resolveMonth(args), resolveYear(args)),
      }),
      get_fixed_bills: async (args) => ({
        fixedBills: await this.fixedBillsService.findAll(userId, resolveMonth(args), resolveYear(args)),
      }),
      get_installments: async () => ({
        installments: await this.transactionsService.getInstallmentsReport(userId),
      }),
      get_piggy_banks: async () => ({
        piggyBanks: await this.piggyBanksService.getDashboard(userId),
      }),
      get_dreams: async () => ({
        dreams: await this.dreamsService.findAll(userId),
      }),
    };
  }

  private buildSystemPrompt(user: { name: string; plan: string }, isPro: boolean): string {
    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    const capabilitiesBlock = isPro
      ? `Como o plano do usuário é Pro, você TEM ferramentas para consultar os dados financeiros reais dele (ou da família, se ele fizer parte de um grupo familiar): contas e saldos, transações, resumo mensal, planejamento/orçamento, contas fixas, parcelamentos, cofrinhos e sonhos.
- Sempre que a pergunta envolver números reais (saldo, quanto gastou, quanto falta pagar, progresso de uma meta, etc.), chame a ferramenta correspondente antes de responder. NUNCA estime, arredonde de cabeça ou invente um valor.
- Se uma ferramenta retornar lista vazia ou erro, diga isso claramente ao usuário em vez de inventar um número.
- Pode combinar mais de uma ferramenta na mesma resposta se a pergunta exigir.
- Essas ferramentas são só de CONSULTA — você nunca cria, edita ou exclui nada. Se o usuário pedir uma ação (ex.: "lança uma despesa", "marca essa conta como paga"), explique que isso ainda precisa ser feito direto no app, na tela correspondente.`
      : `O plano atual do usuário (${user.plan}) não inclui acesso a dados financeiros reais pelo assistente — isso é um benefício exclusivo do plano Pro. Se perguntarem saldo, gastos reais ou qualquer dado pessoal, explique que você não tem acesso a esses dados neste plano, e que consultar dados reais pelo assistente é um recurso do plano Pro.`;

    return `Você é o Assistente de Suporte do DCash, um app de finanças pessoais e familiares. Seu papel é tirar dúvidas de uso do sistema${isPro ? ' e ajudar o usuário a entender sua própria situação financeira real' : ''}.

Hoje é ${today}. Use essa data para resolver expressões como "esse mês", "hoje", "esse ano" etc.

Regras que você deve seguir sempre:
- Para dúvidas sobre COMO USAR o app (telas, botões, regras de negócio), responda apenas com base no CONTEXTO (base de conhecimento) fornecido abaixo. Nunca invente telas, botões, fórmulas ou regras que não estejam documentadas ali.
- Você pode usar o nome e o plano de assinatura do usuário (informados abaixo) para personalizar o tom da resposta e explicar bloqueios de recursos por plano.
- Se a dúvida for sobre um possível bug, cobrança, dado sensível da conta, ou qualquer assunto fora do que você consegue resolver, oriente a pessoa a entrar em contato com ${SUPPORT_EMAIL}.
- Responda sempre em português do Brasil, com tom cordial, direto e objetivo.
- Se não souber a resposta, admita isso em vez de inventar, e sugira o contato de suporte acima.

${capabilitiesBlock}

Dados do usuário logado nesta conversa:
- Nome: ${user.name}
- Plano atual: ${user.plan}

=== BASE DE CONHECIMENTO DCASH ===
${SUPPORT_KNOWLEDGE_BASE}
=== FIM DA BASE DE CONHECIMENTO ===`;
  }

  async sendMessage(userId: string, message: string) {
    await this.ensureTable();
    this.checkRateLimit(userId);

    try {
      const [userRow] = await this.db.query<{ name: string; plan: string }>(
        `SELECT name, plan FROM ${S}.users WHERE id = $1`,
        [userId],
      );
      const user = { name: userRow?.name ?? 'Usuário', plan: userRow?.plan ?? 'free' };
      const effectivePlan = await this.planService.getEffectivePlan(userId);
      const isPro = effectivePlan === 'pro';

      const previousMessages = await this.getHistory(userId);
      const recentHistory = previousMessages.slice(-MAX_HISTORY_MESSAGES);

      const userMessage = await this.saveMessage(userId, 'user', message);

      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: this.buildSystemPrompt(user, isPro),
        tools: isPro ? [{ functionDeclarations: FINANCIAL_TOOLS }] : undefined,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 800,
        },
      });

      const chat = model.startChat({
        history: recentHistory.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      });

      let result = await chat.sendMessage(message);

      if (isPro) {
        const executors = this.buildToolExecutors(userId);
        let iterations = 0;
        while (iterations < MAX_TOOL_ITERATIONS) {
          const calls = result.response.functionCalls();
          if (!calls || calls.length === 0) break;
          iterations++;

          const responseParts: Part[] = [];
          for (const call of calls) {
            let response: object;
            try {
              const executor = executors[call.name];
              if (!executor) throw new Error(`Ferramenta desconhecida: ${call.name}`);
              response = await executor(call.args);
            } catch (toolError) {
              this.logger.error(`Erro ao executar tool "${call.name}": ${toolError.message}`);
              response = { error: 'Não foi possível obter esse dado agora.' };
            }
            responseParts.push({ functionResponse: { name: call.name, response } });
          }

          result = await chat.sendMessage(responseParts);
        }
      }

      const replyText = result.response.text().trim() ||
        'Desculpe, não consegui gerar uma resposta agora. Tente reformular sua pergunta.';

      const assistantMessage = await this.saveMessage(userId, 'assistant', replyText);

      return { userMessage, assistantMessage };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Erro no assistente de suporte: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Não foi possível obter resposta do assistente agora. Tente novamente em instantes ou fale com ${SUPPORT_EMAIL}.`,
      );
    }
  }
}
