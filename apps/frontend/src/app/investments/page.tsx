'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import { AppLayout } from '@/components/app-layout';
import {
  Search, Plus, Trash2, Bell, BellOff, Pencil, X, Loader2,
  TrendingUp, TrendingDown, AlertTriangle, Lock,
  ChevronDown, ChevronUp, BarChart2, Star, CheckCircle2,
} from '@/components/ui/icons';
import { cn } from '@/lib/utils';

/* ── Helpers ─────────────────────────────────────────────────── */
const fmtBRL  = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct  = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
const field   = 'w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition bg-surface-2 border border-border text-fg placeholder:text-fg-muted focus:border-primary';
const label   = 'text-[11px] font-semibold text-fg-muted mb-1 block';

type Tab = 'carteira' | 'pesquisar' | 'alertas';

/* ── Stock dashboard type ────────────────────────────────────── */
interface StockDashboard {
  ticker: string;
  indicators: {
    current_price: number;
    variation_12m: number;
    pl?: number;
    pvp?: number;
    dividend_yield_current?: number;
  };
  history_12m: { date: string; close: number }[];
}

interface PortfolioItem {
  id: string;
  ticker: string;
  companyName?: string;
  quantity: number;
  avgPrice: number;
  targetBuy?: number;
  targetSell?: number;
  notes?: string;
}

interface Alert {
  id: string;
  ticker: string;
  targetPrice: number;
  direction: 'above' | 'below';
  message?: string;
  isActive: boolean;
  triggeredAt?: string;
  createdAt: string;
}

/* ── Mini price chart (pure CSS) ────────────────────────────── */
function MiniChart({ history }: { history: { date: string; close: number }[] }) {
  if (!history?.length) return null;
  const prices = history.slice(-60).map(h => h.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const first = prices[0];
  const last  = prices[prices.length - 1];
  const up    = last >= first;

  return (
    <div className="flex items-end gap-[1px] h-10 w-full">
      {prices.map((p, i) => {
        const h = Math.max(4, ((p - min) / range) * 100);
        return (
          <div key={i} className="flex-1 rounded-sm transition-all"
            style={{ height: `${h}%`, backgroundColor: up ? 'var(--primary)' : 'var(--danger)', opacity: 0.7 + (i / prices.length) * 0.3 }} />
        );
      })}
    </div>
  );
}

/* ── Indicator chip ──────────────────────────────────────────── */
function Chip({ label: l, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-surface-2 rounded-xl px-3 py-2 flex flex-col">
      <span className="text-[11px] font-semibold text-fg-muted">{l}</span>
      <span className={cn('font-semibold text-fg', small ? 'text-[11px]' : 'text-sm')}>{value}</span>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function InvestmentsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('carteira');
  const [isPro, setIsPro] = useState<boolean | null>(null);

  /* ── data ─────────────────────── */
  const [portfolio,  setPortfolio]  = useState<PortfolioItem[]>([]);
  const [alerts,     setAlerts]     = useState<Alert[]>([]);
  const [loading,    setLoading]    = useState(true);

  /* ── search ───────────────────── */
  const [searchTicker,  setSearchTicker]  = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchData,    setSearchData]    = useState<StockDashboard | null>(null);
  const [searchError,   setSearchError]   = useState<string | null>(null);
  const [divData,       setDivData]       = useState<any>(null);

  /* ── portfolio modal ─────────────── */
  const [pmOpen,    setPmOpen]    = useState(false);
  const [pmEdit,    setPmEdit]    = useState<PortfolioItem | null>(null);
  const [pmTicker,  setPmTicker]  = useState('');
  const [pmName,    setPmName]    = useState('');
  const [pmQty,     setPmQty]     = useState('');
  const [pmAvg,     setPmAvg]     = useState('');
  const [pmBuy,     setPmBuy]     = useState('');
  const [pmSell,    setPmSell]    = useState('');
  const [pmNotes,   setPmNotes]   = useState('');
  const [pmSaving,  setPmSaving]  = useState(false);
  const [pmError,   setPmError]   = useState<string | null>(null);

  /* ── alert modal ──────────────── */
  const [amOpen,    setAmOpen]    = useState(false);
  const [amTicker,  setAmTicker]  = useState('');
  const [amPrice,   setAmPrice]   = useState('');
  const [amDir,     setAmDir]     = useState<'above'|'below'>('below');
  const [amMsg,     setAmMsg]     = useState('');
  const [amSaving,  setAmSaving]  = useState(false);
  const [amError,   setAmError]   = useState<string | null>(null);

  /* ── live prices for portfolio ─── */
  const [livePrices, setLivePrices] = useState<Record<string, StockDashboard>>({});
  const [pricesLoading, setPricesLoading] = useState(false);

  /* ── plan check ─────────────────── */
  useEffect(() => {
    api.get('/plan/me')
      .then(r => setIsPro(r.data?.plan?.toLowerCase() === 'pro'))
      .catch(() => setIsPro(false));
  }, []);

  /* ── load data ──────────────────── */
  const load = useCallback(async () => {
    if (!isPro) return;
    setLoading(true);
    try {
      const [pRes, aRes] = await Promise.all([
        api.get('/investments/portfolio'),
        api.get('/investments/alerts'),
      ]);
      setPortfolio(pRes.data || []);
      setAlerts(aRes.data || []);
    } catch {}
    setLoading(false);
  }, [isPro]);

  useEffect(() => { if (isPro) load(); }, [isPro, load]);

  /* ── fetch live prices ──────────── */
  useEffect(() => {
    if (!portfolio.length || !isPro) return;
    const fetchPrices = async () => {
      setPricesLoading(true);
      const results: Record<string, StockDashboard> = {};
      await Promise.allSettled(
        portfolio.map(async (item) => {
          try {
            const r = await api.get(`/investments/market/${item.ticker}`);
            results[item.ticker] = r.data;
          } catch {}
        }),
      );
      setLivePrices(results);
      setPricesLoading(false);
    };
    fetchPrices();
  }, [portfolio, isPro]);

  /* ── search ─────────────────────── */
  const doSearch = async () => {
    const t = searchTicker.trim().toUpperCase();
    if (!t) return;
    const ticker = t.endsWith('.SA') ? t : `${t}.SA`;
    setSearchLoading(true); setSearchError(null); setSearchData(null); setDivData(null);
    try {
      const [dash, divs] = await Promise.all([
        api.get(`/investments/market/${ticker}`),
        api.get(`/investments/market/${ticker}/dividends`).catch(() => ({ data: null })),
      ]);
      setSearchData(dash.data);
      setDivData(divs.data);
    } catch {
      setSearchError('Ação não encontrada. Verifique o ticker (ex: ITSA4 ou MXRF11).');
    } finally { setSearchLoading(false); }
  };

  /* ── portfolio modal helpers ─────── */
  const openAdd = (prefill?: string) => {
    setPmEdit(null); setPmTicker(prefill || ''); setPmName('');
    setPmQty(''); setPmAvg(''); setPmBuy(''); setPmSell(''); setPmNotes('');
    setPmError(null); setPmOpen(true);
  };
  const openEdit = (item: PortfolioItem) => {
    setPmEdit(item); setPmTicker(item.ticker); setPmName(item.companyName || '');
    setPmQty(String(item.quantity)); setPmAvg(String(item.avgPrice));
    setPmBuy(item.targetBuy ? String(item.targetBuy) : '');
    setPmSell(item.targetSell ? String(item.targetSell) : '');
    setPmNotes(item.notes || ''); setPmError(null); setPmOpen(true);
  };
  const savePortfolio = async () => {
    if (!pmTicker.trim()) { setPmError('Informe o ticker.'); return; }
    setPmSaving(true); setPmError(null);
    const body = {
      ticker: pmTicker.trim().toUpperCase(),
      companyName: pmName || undefined,
      quantity: parseFloat(pmQty) || 0,
      avgPrice: parseFloat(pmAvg.replace(',', '.')) || 0,
      targetBuy:  pmBuy  ? parseFloat(pmBuy.replace(',', '.'))  : null,
      targetSell: pmSell ? parseFloat(pmSell.replace(',', '.')) : null,
      notes: pmNotes || undefined,
    };
    try {
      if (pmEdit) {
        await api.patch(`/investments/portfolio/${pmEdit.id}`, body);
      } else {
        await api.post('/investments/portfolio', body);
      }
      setPmOpen(false); load();
    } catch (e: any) {
      setPmError(e.response?.data?.message || 'Erro ao salvar.');
    } finally { setPmSaving(false); }
  };
  const removePortfolio = async (id: string) => {
    if (!confirm('Remover da carteira?')) return;
    await api.delete(`/investments/portfolio/${id}`);
    load();
  };

  /* ── alert modal helpers ─────────── */
  const openAlert = (prefill?: string) => {
    setAmTicker(prefill || ''); setAmPrice(''); setAmDir('below'); setAmMsg('');
    setAmError(null); setAmOpen(true);
  };
  const saveAlert = async () => {
    if (!amTicker.trim() || !amPrice) { setAmError('Preencha ticker e valor alvo.'); return; }
    setAmSaving(true); setAmError(null);
    try {
      await api.post('/investments/alerts', {
        ticker: amTicker.trim().toUpperCase(),
        targetPrice: parseFloat(amPrice.replace(',', '.')),
        direction: amDir,
        message: amMsg || undefined,
      });
      setAmOpen(false); load();
    } catch (e: any) {
      setAmError(e.response?.data?.message || 'Erro ao criar alerta.');
    } finally { setAmSaving(false); }
  };

  /* ── portfolio P&L ──────────────── */
  const portfolioStats = useMemo(() => {
    let totalInvested = 0, totalValue = 0;
    for (const item of portfolio) {
      const live = livePrices[item.ticker];
      const price = live?.indicators?.current_price ?? item.avgPrice;
      totalInvested += item.quantity * item.avgPrice;
      totalValue    += item.quantity * price;
    }
    return { totalInvested, totalValue, pnl: totalValue - totalInvested };
  }, [portfolio, livePrices]);

  /* ── pro gate ───────────────────── */
  if (isPro === null) {
    return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-accent" size={36} /></div></AppLayout>;
  }

  if (!isPro) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
          <div className="p-8 bg-card rounded-2xl border border-border max-w-lg">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-primary-border bg-primary-soft">
              <Lock size={20} strokeWidth={1.75} className="text-accent" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-fg">
              Módulo Pro
            </h2>
            <p className="text-sm text-fg-muted dark:text-fg-2 mt-2 max-w-md">
              A carteira de investimentos, alertas de preço e acompanhamento de ações estão disponíveis exclusivamente no plano <strong>Pro</strong>.
            </p>
          </div>
          <button onClick={() => router.push('/profile')}
            className="btn btn-primary">
            Fazer upgrade para Pro
          </button>
        </div>
      </AppLayout>
    );
  }

  /* ── main render ──────────────────── */
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">
              Carteira de <span className="text-accent">Investimentos</span>
            </h1>
            <p className="text-[11px] font-semibold text-fg-muted">Ações · FIIs · Alertas de preço</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => openAlert()} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-warning-soft text-warning border border-warning/30 hover:bg-warning hover:text-white font-semibold text-xs transition">
              <Bell size={14} /> Alerta
            </button>
            <button onClick={() => openAdd()} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-on-primary font-semibold text-xs transition shadow-lg">
              <Plus size={14} /> Adicionar
            </button>
          </div>
        </div>

        {/* Portfolio summary strip */}
        {portfolio.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-hero-from to-hero-to text-white p-5">
              <p className="text-[11px] font-semibold text-fg-muted">Valor investido</p>
              <p className="text-2xl font-semibold mt-1">R$ {fmtBRL(portfolioStats.totalInvested)}</p>
            </div>
            <div className="rounded-2xl bg-card border border-border p-5">
              <p className="text-[11px] font-semibold text-fg-muted">Valor atual</p>
              <p className="text-2xl font-semibold text-fg mt-1">
                {pricesLoading ? '...' : `R$ ${fmtBRL(portfolioStats.totalValue)}`}
              </p>
            </div>
            <div className={cn('rounded-2xl p-5', portfolioStats.pnl >= 0
              ? 'bg-primary-soft border border-primary-border'
              : 'bg-danger-soft border border-danger/30')}>
              <p className="text-[11px] font-semibold text-fg-muted">P&L</p>
              <p className={cn('text-2xl font-semibold mt-1', portfolioStats.pnl >= 0 ? 'text-accent' : 'text-danger')}>
                {pricesLoading ? '...' : (portfolioStats.pnl >= 0 ? '+' : '') + `R$ ${fmtBRL(portfolioStats.pnl)}`}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-2 rounded-2xl p-1 w-fit">
          {(['carteira','pesquisar','alertas'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-5 py-2 rounded-xl text-[11px] font-semibold transition',
                tab === t ? 'bg-card text-fg shadow-sm' : 'text-fg-muted hover:text-fg-2')}>
              {t === 'carteira' ? '📊 Carteira' : t === 'pesquisar' ? '🔍 Pesquisar' : '🔔 Alertas'}
            </button>
          ))}
        </div>

        {/* ─── CARTEIRA TAB ─────────────────────────────────── */}
        {tab === 'carteira' && (
          <div>
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="animate-spin text-accent" size={32} /></div>
            ) : portfolio.length === 0 ? (
              <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl">
                <BarChart2 size={48} className="text-fg-disabled mx-auto mb-4" />
                <p className="font-semibold text-fg-muted text-sm">Carteira vazia</p>
                <p className="text-fg-muted text-xs mt-1">Adicione ações ou FIIs para acompanhar</p>
                <button onClick={() => openAdd()} className="mt-4 px-6 py-2.5 bg-primary text-on-primary rounded-2xl font-semibold text-xs hover:bg-primary-hover transition">
                  Adicionar primeira ação
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {portfolio.map(item => {
                  const live   = livePrices[item.ticker];
                  const price  = live?.indicators?.current_price;
                  const var12  = live?.indicators?.variation_12m;
                  const dy     = live?.indicators?.dividend_yield_current;
                  const cost   = item.quantity * item.avgPrice;
                  const value  = price ? item.quantity * price : null;
                  const pnl    = value !== null ? value - cost : null;
                  const pnlPct = cost > 0 && pnl !== null ? (pnl / cost) * 100 : null;
                  const up     = var12 !== undefined ? var12 >= 0 : true;

                  return (
                    <div key={item.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3">
                      {/* Ticker row */}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xl font-semibold text-fg tracking-tight">{item.ticker}</p>
                          {item.companyName && <p className="text-[11px] text-fg-muted font-medium truncate max-w-[140px]">{item.companyName}</p>}
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => openEdit(item)} className="p-2 bg-surface-2 text-fg-muted hover:text-accent rounded-xl transition"><Pencil size={13} /></button>
                          <button onClick={() => openAlert(item.ticker)} className="p-2 bg-surface-2 text-fg-muted hover:text-warning rounded-xl transition"><Bell size={13} /></button>
                          <button onClick={() => removePortfolio(item.id)} className="p-2 bg-surface-2 text-fg-muted hover:text-danger rounded-xl transition"><Trash2 size={13} /></button>
                        </div>
                      </div>

                      {/* Mini chart */}
                      {live?.history_12m && (
                        <MiniChart history={live.history_12m} />
                      )}

                      {/* Price + variation */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] text-fg-muted font-semibold">Preço atual</p>
                          <p className="text-xl font-semibold text-fg">
                            {pricesLoading ? '...' : price ? `R$ ${fmtBRL(price)}` : '—'}
                          </p>
                        </div>
                        {var12 !== undefined && (
                          <div className={cn('flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold',
                            up ? 'bg-primary-soft text-accent'
                               : 'bg-danger-soft text-danger')}>
                            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {fmtPct(var12)} 12m
                          </div>
                        )}
                      </div>

                      {/* Indicators grid */}
                      <div className="grid grid-cols-2 gap-2">
                        <Chip label="Qtd." value={String(item.quantity)} small />
                        <Chip label="PM" value={`R$ ${fmtBRL(item.avgPrice)}`} small />
                        {pnl !== null && (
                          <div className={cn('rounded-xl px-3 py-2 flex flex-col', pnl >= 0 ? 'bg-primary-soft' : 'bg-danger-soft')}>
                            <span className="text-[11px] font-semibold text-fg-muted">P&L</span>
                            <span className={cn('font-semibold text-[11px]', pnl >= 0 ? 'text-accent' : 'text-danger')}>
                              {pnl >= 0 ? '+' : ''}R$ {fmtBRL(pnl)}
                            </span>
                          </div>
                        )}
                        {pnlPct !== null && (
                          <div className={cn('rounded-xl px-3 py-2 flex flex-col', pnlPct >= 0 ? 'bg-primary-soft' : 'bg-danger-soft')}>
                            <span className="text-[11px] font-semibold text-fg-muted">Rentab.</span>
                            <span className={cn('font-semibold text-[11px]', pnlPct >= 0 ? 'text-accent' : 'text-danger')}>
                              {fmtPct(pnlPct)}
                            </span>
                          </div>
                        )}
                        {dy && <Chip label="DY" value={`${dy.toFixed(2)}%`} small />}
                      </div>

                      {/* Targets */}
                      {(item.targetBuy || item.targetSell) && (
                        <div className="flex gap-2 border-t border-border pt-2">
                          {item.targetBuy  && <span className="text-[11px] font-semibold text-accent bg-primary-soft px-2 py-1 rounded-lg">▼ Comprar ≤ R$ {fmtBRL(item.targetBuy)}</span>}
                          {item.targetSell && <span className="text-[11px] font-semibold text-danger bg-danger-soft px-2 py-1 rounded-lg">▲ Vender ≥ R$ {fmtBRL(item.targetSell)}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── PESQUISAR TAB ────────────────────────────────── */}
        {tab === 'pesquisar' && (
          <div className="space-y-5">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted" />
                <input className={cn(field, 'pl-10')} placeholder="Ex: ITSA4, MXRF11, PETR4..."
                  value={searchTicker} onChange={e => setSearchTicker(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && doSearch()} />
              </div>
              <button onClick={doSearch} disabled={searchLoading}
                className="px-6 py-3 bg-primary hover:bg-primary-hover text-on-primary rounded-2xl font-semibold text-xs transition disabled:opacity-50 flex items-center gap-2">
                {searchLoading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                Buscar
              </button>
            </div>

            {searchError && (
              <div className="flex items-center gap-3 p-4 bg-danger-soft border border-danger/30 rounded-2xl text-danger">
                <AlertTriangle size={18} className="shrink-0" />
                <p className="text-sm font-semibold">{searchError}</p>
              </div>
            )}

            {searchData && (
              <div className="space-y-4">
                {/* Header */}
                <div className="bg-card border border-border rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[11px] font-semibold text-fg-muted">Resultado</p>
                      <h2 className="text-2xl font-semibold tracking-tight text-fg">{searchData.ticker}</h2>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { openAdd(searchData.ticker); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-2xl font-semibold text-xs hover:bg-primary-hover transition">
                        <Plus size={13} /> Carteira
                      </button>
                      <button onClick={() => { openAlert(searchData.ticker); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-warning-soft text-warning border border-warning/30 rounded-2xl font-semibold text-xs hover:bg-warning hover:text-white transition">
                        <Bell size={13} /> Alerta
                      </button>
                    </div>
                  </div>

                  {/* Price + variation */}
                  <div className="flex items-center gap-4 mb-5">
                    <p className="text-2xl font-semibold text-fg">
                      R$ {fmtBRL(searchData.indicators.current_price)}
                    </p>
                    <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold',
                      searchData.indicators.variation_12m >= 0
                        ? 'bg-primary-soft text-accent'
                        : 'bg-danger-soft text-danger')}>
                      {searchData.indicators.variation_12m >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {fmtPct(searchData.indicators.variation_12m)} (12m)
                    </div>
                  </div>

                  {/* Indicators */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    {searchData.indicators.pl      && <Chip label="P/L"      value={searchData.indicators.pl.toFixed(2)} />}
                    {searchData.indicators.pvp     && <Chip label="P/VP"     value={searchData.indicators.pvp.toFixed(2)} />}
                    {searchData.indicators.dividend_yield_current && (
                      <Chip label="DY (atual)" value={`${searchData.indicators.dividend_yield_current.toFixed(2)}%`} />
                    )}
                    {divData?.dividend_yield_5y_average && (
                      <Chip label="DY (5a média)" value={`${divData.dividend_yield_5y_average.toFixed(2)}%`} />
                    )}
                  </div>

                  {/* Price chart (CSS bars) */}
                  {searchData.history_12m?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-fg-muted mb-2">Histórico 12 meses</p>
                      <div className="flex items-end gap-[2px] h-20 w-full">
                        {(() => {
                          const prices = searchData.history_12m.map(h => h.close);
                          const min = Math.min(...prices);
                          const max = Math.max(...prices);
                          const range = max - min || 1;
                          const first = prices[0];
                          const last  = prices[prices.length - 1];
                          const up    = last >= first;
                          return prices.filter((_, i) => i % 3 === 0).map((p, i) => {
                            const h = Math.max(4, ((p - min) / range) * 100);
                            return (
                              <div key={i} className="flex-1 rounded-sm"
                                style={{ height: `${h}%`, backgroundColor: up ? 'var(--primary)' : 'var(--danger)', opacity: 0.6 + (i / prices.length) * 0.4 }} />
                            );
                          });
                        })()}
                      </div>
                      <div className="flex justify-between text-[11px] text-fg-muted mt-1">
                        <span>{searchData.history_12m[0]?.date?.slice(0,7)}</span>
                        <span>{searchData.history_12m[searchData.history_12m.length-1]?.date?.slice(0,7)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dividends */}
                {divData?.yearly_totals && Object.keys(divData.yearly_totals).length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <p className="text-[11px] font-semibold text-fg-muted mb-4">Dividendos por ano</p>
                    <div className="space-y-2">
                      {Object.entries(divData.yearly_totals as Record<string,number>)
                        .sort((a,b) => Number(b[0]) - Number(a[0]))
                        .map(([year, total]) => {
                          const maxVal = Math.max(...Object.values(divData.yearly_totals as Record<string,number>));
                          const pct = maxVal > 0 ? (total / maxVal) * 100 : 0;
                          return (
                            <div key={year} className="flex items-center gap-3">
                              <span className="w-10 text-[11px] font-semibold text-fg-muted">{year}</span>
                              <div className="flex-1 h-4 bg-surface-2 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-warning" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="w-24 text-[11px] font-semibold text-fg-2 text-right">
                                R$ {fmtBRL(total)}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── ALERTAS TAB ──────────────────────────────────── */}
        {tab === 'alertas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-fg-muted">
                {alerts.length} alerta{alerts.length !== 1 ? 's' : ''} cadastrado{alerts.length !== 1 ? 's' : ''}
              </p>
              <button onClick={() => openAlert()}
                className="btn btn-primary">
                <Plus size={13} /> Novo alerta
              </button>
            </div>

            {alerts.length === 0 ? (
              <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl">
                <Bell size={48} className="text-fg-disabled mx-auto mb-3" />
                <p className="font-semibold text-fg-muted text-sm">Nenhum alerta</p>
                <p className="text-fg-muted text-xs mt-1">Crie alertas para ser notificado quando uma ação atingir um valor</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map(alert => (
                  <div key={alert.id}
                    className={cn('bg-card border rounded-2xl p-4 flex items-center gap-4',
                      alert.triggeredAt ? 'border-border opacity-60' :
                      alert.isActive ? 'border-warning/30' : 'border-border')}>
                    <div className={cn('p-2.5 rounded-xl shrink-0',
                      alert.triggeredAt ? 'bg-primary-soft' :
                      alert.isActive ? 'bg-warning-soft' : 'bg-surface-2')}>
                      {alert.triggeredAt ? <CheckCircle2 size={16} className="text-accent" />
                        : alert.isActive ? <Bell size={16} className="text-warning" />
                        : <BellOff size={16} className="text-fg-muted" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-fg">{alert.ticker}</span>
                        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full',
                          alert.direction === 'above' ? 'bg-primary-soft text-accent'
                                                      : 'bg-danger-soft text-danger')}>
                          {alert.direction === 'above' ? '▲ Acima de' : '▼ Abaixo de'} R$ {fmtBRL(Number(alert.targetPrice))}
                        </span>
                        {alert.triggeredAt && <span className="text-[11px] font-semibold text-accent">✓ Disparado</span>}
                      </div>
                      {alert.message && <p className="text-[11px] text-fg-muted mt-0.5 truncate">{alert.message}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {!alert.triggeredAt && (
                        <button onClick={async () => { await api.patch(`/investments/alerts/${alert.id}/toggle`); load(); }}
                          className="p-2 bg-surface-2 text-fg-muted hover:text-warning rounded-xl transition"
                          title={alert.isActive ? 'Pausar' : 'Ativar'}>
                          {alert.isActive ? <BellOff size={13} /> : <Bell size={13} />}
                        </button>
                      )}
                      <button onClick={async () => { if (!confirm('Excluir alerta?')) return; await api.delete(`/investments/alerts/${alert.id}`); load(); }}
                        className="p-2 bg-surface-2 text-fg-muted hover:text-danger rounded-xl transition">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════════════ PORTFOLIO MODAL ════════════ */}
      {pmOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => setPmOpen(false)} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-3xl p-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <button onClick={() => setPmOpen(false)} className="absolute top-4 right-4 p-2 text-fg-muted hover:text-danger rounded-xl transition"><X size={20} /></button>
            <h2 className="text-xl font-semibold mb-3 tracking-tight">
              {pmEdit ? 'Editar' : 'Adicionar'} <span className="text-accent">Ação</span>
            </h2>
            <div className="space-y-3">
              {pmError && <p className="text-danger text-xs font-semibold">{pmError}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className={label}>Ticker *</p>
                  <input className={cn(field, '')} placeholder="Ex: ITSA4.SA" value={pmTicker}
                    onChange={e => setPmTicker(e.target.value.toUpperCase())} disabled={!!pmEdit} />
                </div>
                <div>
                  <p className={label}>Nome empresa</p>
                  <input className={field} placeholder="Opcional" value={pmName} onChange={e => setPmName(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className={label}>Quantidade</p>
                  <input className={field} type="number" placeholder="0" value={pmQty} onChange={e => setPmQty(e.target.value)} />
                </div>
                <div>
                  <p className={label}>Preço médio (R$)</p>
                  <input className={field} placeholder="0,00" value={pmAvg} onChange={e => setPmAvg(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className={label}>Alvo de compra (R$)</p>
                  <input className={field} placeholder="Opcional" value={pmBuy} onChange={e => setPmBuy(e.target.value)} />
                </div>
                <div>
                  <p className={label}>Alvo de venda (R$)</p>
                  <input className={field} placeholder="Opcional" value={pmSell} onChange={e => setPmSell(e.target.value)} />
                </div>
              </div>
              <div>
                <p className={label}>Observações</p>
                <textarea className={cn(field, 'resize-none h-20')} placeholder="Opcional..." value={pmNotes} onChange={e => setPmNotes(e.target.value)} />
              </div>
              <button onClick={savePortfolio} disabled={pmSaving}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-on-primary rounded-2xl font-semibold text-xs transition disabled:opacity-50 flex items-center justify-center gap-2">
                {pmSaving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                {pmSaving ? 'Salvando...' : (pmEdit ? 'Atualizar' : 'Adicionar à carteira')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ ALERT MODAL ════════════ */}
      {amOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => setAmOpen(false)} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-3xl p-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <button onClick={() => setAmOpen(false)} className="absolute top-4 right-4 p-2 text-fg-muted hover:text-danger rounded-xl transition"><X size={20} /></button>
            <h2 className="text-xl font-semibold mb-3 tracking-tight">
              Novo <span className="text-warning">Alerta de Preço</span>
            </h2>
            <div className="space-y-3">
              {amError && <p className="text-danger text-xs font-semibold">{amError}</p>}
              <div>
                <p className={label}>Ticker *</p>
                <input className={cn(field, '')} placeholder="Ex: PETR4.SA" value={amTicker}
                  onChange={e => setAmTicker(e.target.value.toUpperCase())} />
              </div>
              <div>
                <p className={label}>Quando o preço estiver</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setAmDir('below')}
                    className={cn('py-3 rounded-xl border text-[11px] font-semibold transition',
                      amDir === 'below' ? 'bg-danger text-white border-danger' : 'bg-surface-2 border-border text-fg-2')}>
                    ▼ Abaixo de
                  </button>
                  <button type="button" onClick={() => setAmDir('above')}
                    className={cn('py-3 rounded-xl border text-[11px] font-semibold transition',
                      amDir === 'above' ? 'bg-primary text-on-primary border-primary' : 'bg-surface-2 border-border text-fg-2')}>
                    ▲ Acima de
                  </button>
                </div>
              </div>
              <div>
                <p className={label}>Valor alvo (R$) *</p>
                <input className={field} placeholder="Ex: 12,50" value={amPrice} onChange={e => setAmPrice(e.target.value)} />
              </div>
              <div>
                <p className={label}>Mensagem (opcional)</p>
                <input className={field} placeholder="Ex: Comprar mais" value={amMsg} onChange={e => setAmMsg(e.target.value)} />
              </div>
              <div className="bg-warning-soft border border-warning/30 rounded-xl p-3">
                <p className="text-[11px] font-semibold text-warning mb-1">Notificação WhatsApp</p>
                <p className="text-[11px] text-fg-muted dark:text-fg-2">
                  Quando o alerta disparar, você receberá uma notificação pelo WhatsApp (se configurado no perfil).
                </p>
              </div>
              <button onClick={saveAlert} disabled={amSaving}
                className="btn btn-primary w-full !h-10">
                {amSaving ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />}
                {amSaving ? 'Salvando...' : 'Criar alerta'}
              </button>
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
