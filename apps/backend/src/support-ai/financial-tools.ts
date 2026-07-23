import { FunctionDeclaration, IntegerSchema, SchemaType } from '@google/generative-ai';

const monthParam: IntegerSchema = {
  type: SchemaType.INTEGER,
  description: 'Mês (1 a 12). Se omitido, usa o mês atual.',
};
const yearParam: IntegerSchema = {
  type: SchemaType.INTEGER,
  description: 'Ano (ex.: 2026). Se omitido, usa o ano atual.',
};

export const FINANCIAL_TOOLS: FunctionDeclaration[] = [
  {
    name: 'get_accounts',
    description:
      'Lista as contas/formas de pagamento do usuário (banco, dinheiro, PIX, boleto, cartão de crédito, financiamento) com o saldo de cada uma. Para cartão de crédito e financiamento, o saldo retornado é o limite disponível, não dinheiro em caixa.',
  },
  {
    name: 'get_monthly_summary',
    description:
      'Retorna o resumo financeiro de um mês: total de receitas, despesas, investimentos, saldo (receita - despesa) e as principais categorias de despesa daquele mês.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: { month: monthParam, year: yearParam },
      required: [],
    },
  },
  {
    name: 'get_transactions',
    description:
      'Lista transações (receitas, despesas ou investimentos) do usuário num intervalo de datas, com limite de resultados. Use para responder perguntas sobre lançamentos específicos, não para somatórios (use get_monthly_summary para isso).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        from: { type: SchemaType.STRING, description: 'Data inicial no formato YYYY-MM-DD. Se omitido, usa o início do mês atual.' },
        to: { type: SchemaType.STRING, description: 'Data final no formato YYYY-MM-DD. Se omitido, usa o fim do mês atual.' },
        type: { type: SchemaType.STRING, description: 'Filtra por tipo: INCOME (receita), EXPENSE (despesa) ou INVESTMENT (investimento). Opcional.' },
        limit: { type: SchemaType.INTEGER, description: 'Quantidade máxima de transações a retornar (padrão 30, máximo 50).' },
      },
      required: [],
    },
  },
  {
    name: 'get_budget_status',
    description:
      'Retorna o planejamento mensal (orçamento) por categoria de despesa: quanto foi planejado e quanto já foi gasto em cada categoria, no mês informado.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: { month: monthParam, year: yearParam },
      required: [],
    },
  },
  {
    name: 'get_fixed_bills',
    description:
      'Lista as contas fixas (aluguel, internet, fatura de cartão etc.) do mês informado, com valor, dia de vencimento e se já foi paga.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: { month: monthParam, year: yearParam },
      required: [],
    },
  },
  {
    name: 'get_installments',
    description:
      'Lista todas as compras parceladas em aberto ou já quitadas do usuário, com valor de cada parcela, quantas faltam pagar e o vencimento.',
  },
  {
    name: 'get_piggy_banks',
    description:
      'Lista os cofrinhos (reservas de dinheiro) do usuário, com saldo atual, meta e progresso em relação à meta.',
  },
  {
    name: 'get_dreams',
    description:
      'Lista os sonhos (metas de longo prazo) do usuário, com valor-alvo, valor já reservado e progresso.',
  },
];
