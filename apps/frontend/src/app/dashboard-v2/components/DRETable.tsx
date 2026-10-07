import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui';

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type ByMember = Record<string, number>;
type DreCategory = { id?: string; name: string; amount: number; color?: string; byMember?: ByMember; planned?: number | null; overBudget?: boolean };

export type DreData = {
  incomeCategories: DreCategory[];
  expenseCategories: DreCategory[];
  investCategories: DreCategory[];
  totalIncome: number;
  totalExpense: number;
  totalInvest: number;
  receitaLiquida: number;
  resultado: number;
  margem: number;
  pontoEquilibrio: number;
};

export type DreMember = { id: string; name: string; color: string };

const sumBy = (cats: DreCategory[], uid: string) => cats.reduce((s, c) => s + (c.byMember?.[uid] ?? 0), 0);

/**
 * DRE (income statement) with one column per family member and a Total
 * column. With a single person only the Total column is shown.
 */
export function DRETable({ dre, members, trends, expenseNote }: {
  dre: DreData;
  members: DreMember[];
  trends?: { income?: React.ReactNode; expense?: React.ReactNode; liquid?: React.ReactNode; result?: React.ReactNode };
  expenseNote?: React.ReactNode;
}) {
  const cols = members.length > 1 ? members : [];
  const hasInvest = dre.investCategories.length > 0;

  const per = cols.map((m) => {
    const income = sumBy(dre.incomeCategories, m.id);
    const expense = sumBy(dre.expenseCategories, m.id);
    const invest = sumBy(dre.investCategories, m.id);
    const liquid = income - expense;
    const result = liquid - invest;
    return { id: m.id, income, expense, invest, liquid, result, margem: income > 0 ? (result / income) * 100 : 0, pe: expense + invest };
  });

  const grid = { gridTemplateColumns: `minmax(170px,1.5fr) ${cols.map(() => 'minmax(112px,1fr)').join(' ')} minmax(124px,1fr)` };
  const minW = 300 + cols.length * 120;

  const money = (v: number, kind: 'pos' | 'neg' | 'auto' | 'plain', strong = false) => {
    const tone = kind === 'pos' ? 'text-accent' : kind === 'neg' ? 'text-danger' : kind === 'auto' ? (v >= 0 ? 'text-accent' : 'text-danger') : 'text-fg';
    const sign = kind === 'pos' && v > 0 ? '+ ' : kind === 'neg' && v > 0 ? '− ' : kind === 'auto' && v < 0 ? '− ' : kind === 'auto' && v > 0 ? '+ ' : '';
    const abs = kind === 'auto' ? Math.abs(v) : v;
    return <span className={cn('tabular-nums', strong ? 'text-[13px] font-semibold' : 'text-[13px]', v === 0 && !strong ? 'text-fg-disabled' : tone)}>{sign}R$ {fmtBRL(abs)}</span>;
  };

  const cell = (children: React.ReactNode, key: string | number, total = false) => (
    <div key={key} className={cn('flex items-start justify-end px-3 py-1.5', total && 'bg-surface-2/60')}>{children}</div>
  );

  const section = (label: string, values: number[], total: number, kind: 'pos' | 'neg' | 'auto', sub?: React.ReactNode) => (
    <div className="contents">
      <div className="py-1.5 pr-3">
        <p className="text-[13px] font-semibold text-fg">{label}</p>
        {sub && <div className="mt-1">{sub}</div>}
      </div>
      {values.map((v, i) => cell(money(v, kind, true), i))}
      {cell(money(total, kind, true), 'total', true)}
    </div>
  );

  const item = (c: DreCategory, kind: 'pos' | 'neg', note?: React.ReactNode) => (
    <div className="contents" key={`${kind}:${c.id ?? c.name}`}>
      <div className="flex min-w-0 items-start gap-2 py-1 pl-4 pr-3">
        {c.color && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: c.color }} />}
        <div className="min-w-0">
          <p className="truncate text-[13px] text-fg-2">{c.name}</p>
          {note}
        </div>
      </div>
      {cols.map((m) => cell(money(c.byMember?.[m.id] ?? 0, kind), m.id))}
      {cell(money(c.amount, kind), 'total', true)}
    </div>
  );

  const rule = <div className="col-span-full my-1.5 border-t border-border" />;
  const empty = (label: string) => (
    <div className="contents">
      <p className="py-1 pl-4 text-xs text-fg-muted">{label}</p>
      {cols.map((m) => <span key={m.id} />)}
      <span className="bg-surface-2/60" />
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <div className="grid" style={{ ...grid, minWidth: minW }}>
        {/* Header */}
        <div className="pb-2" />
        {cols.map((m) => (
          <div key={m.id} className="flex items-center justify-end gap-1.5 px-3 pb-2 text-xs font-semibold text-fg-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />{m.name}
          </div>
        ))}
        <div className="flex items-center justify-end rounded-t-lg bg-surface-2/60 px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wide text-fg">Total</div>

        {section('Receita bruta', per.map((p) => p.income), dre.totalIncome, 'pos', trends?.income)}
        {dre.incomeCategories.map((c) => item(c, 'pos'))}
        {dre.incomeCategories.length === 0 && empty('Sem receitas lançadas')}
        {rule}

        {section('(−) Despesas operacionais', per.map((p) => p.expense), dre.totalExpense, 'neg', <>{trends?.expense}{expenseNote}</>)}
        {dre.expenseCategories.map((c) => item(c, 'neg', c.planned != null ? (
          <p className={cn('text-[11px] font-medium', c.overBudget ? 'text-danger' : 'text-fg-muted')}>
            {c.overBudget ? `Acima do orçado (R$ ${fmtBRL(c.planned)})` : `Orçado: R$ ${fmtBRL(c.planned)}`}
          </p>
        ) : undefined))}
        {dre.expenseCategories.length === 0 && empty('Sem despesas lançadas')}
        {rule}

        {section('= Receita líquida', per.map((p) => p.liquid), dre.receitaLiquida, 'auto', trends?.liquid)}

        {hasInvest && (
          <>
            {rule}
            {section('(−) Investimentos / poupança', per.map((p) => p.invest), dre.totalInvest, 'neg')}
            {dre.investCategories.map((c) => item(c, 'neg'))}
          </>
        )}

        {/* Result block */}
        <div className="col-span-full mt-3 grid rounded-xl border border-border bg-surface-2/40 py-2" style={grid}>
          <div className="px-4 py-1.5">
            <p className="text-[13px] font-semibold text-fg">= Resultado final</p>
            {trends?.result && <div className="mt-1">{trends.result}</div>}
          </div>
          {per.map((p) => cell(money(p.result, 'auto', true), p.id))}
          {cell(money(dre.resultado, 'auto', true), 'total-result', true)}

          <p className="px-4 py-1.5 text-xs text-fg-muted">Margem líquida</p>
          {per.map((p) => (
            cell(<span className={cn('text-[13px] font-semibold tabular-nums', p.margem >= 0 ? 'text-accent' : 'text-danger')}>{p.margem.toFixed(1)}%</span>, p.id)
          ))}
          {cell(<span className={cn('text-[13px] font-semibold tabular-nums', dre.margem >= 0 ? 'text-accent' : 'text-danger')}>{dre.margem.toFixed(1)}%</span>, 'total-margem', true)}

          <p className="px-4 py-1.5 text-xs text-fg-muted">Ponto de equilíbrio</p>
          {per.map((p) => cell(money(p.pe, 'plain', true), p.id))}
          {cell(money(dre.pontoEquilibrio, 'plain', true), 'total-pe', true)}

          <p className="px-4 py-1.5 text-xs text-fg-muted">Status</p>
          {per.map((p) => (
            cell(<Badge tone={p.result >= 0 ? 'success' : 'danger'}>{p.result >= 0 ? 'Superávit' : 'Déficit'}</Badge>, p.id)
          ))}
          {cell(<Badge tone={dre.resultado >= 0 ? 'success' : 'danger'}>{dre.resultado >= 0 ? 'Superávit' : 'Déficit'}</Badge>, 'total-status', true)}
        </div>
      </div>
    </div>
  );
}
