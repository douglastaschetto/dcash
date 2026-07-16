import { ArrowRight, BarChart3, Globe, ShieldCheck, Sparkles, Users } from "lucide-react";

export const metadata = {
  title: "Dcash | Controle financeiro pessoal",
  description:
    "Dcash é a solução de gestão financeira da holding Dtasc, para organizar orçamento, metas e resultados com clareza e confiança.",
};

const featureItems = [
  {
    title: "Planejamento simplificado",
    description:
      "Acompanhe receitas, despesas e metas em um painel intuitivo para tomar decisões financeiras mais seguras.",
    icon: BarChart3,
  },
  {
    title: "Controle em um só lugar",
    description:
      "Organize contas, cartões, boletos e objetivos dentro de um fluxo unificado e fácil de navegar.",
    icon: Globe,
  },
  {
    title: "Privacidade e confiança",
    description:
      "A Dtasc cuida da segurança dos seus dados com melhores práticas para proteção e transparência.",
    icon: ShieldCheck,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-emerald-50 text-slate-950">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-6 sm:px-10">
        <div>
          <span className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700">
            Dtasc
          </span>
          <div className="mt-1 text-3xl font-extrabold tracking-tight text-emerald-950">
            Dcash
          </div>
        </div>
        <nav className="hidden items-center gap-8 text-sm font-medium text-emerald-700 md:flex">
          <a href="#solucoes" className="transition hover:text-emerald-950">
            Soluções
          </a>
          <a href="#vantagens" className="transition hover:text-emerald-950">
            Vantagens
          </a>
          <a href="#sobre" className="transition hover:text-emerald-950">
            Sobre
          </a>
        </nav>
        <a
          href="/login"
          className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-5 py-2 text-sm font-semibold text-emerald-950 transition hover:border-emerald-400 hover:bg-emerald-50"
        >
          Comece agora
          <ArrowRight className="h-4 w-4" />
        </a>
      </header>

      <main className="mx-auto flex max-w-[1200px] flex-col gap-24 px-6 pb-20 sm:px-10">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
          <div className="space-y-8">
            <span className="inline-flex rounded-full bg-emerald-950 px-4 py-1 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-sm">
              Gestão Financeira
            </span>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-5xl font-black tracking-tight text-emerald-950 sm:text-6xl">
                Dcash por Dtasc: finanças pessoais com clareza e autonomia.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-slate-700 sm:text-xl">
                Transforme seus objetivos em resultados reais com uma plataforma pensada para orçamento, controle de despesas e metas de vida.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <a
                href="#solucoes"
                className="inline-flex items-center justify-center rounded-full bg-emerald-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Conheça as soluções
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
              <a
                href="#sobre"
                className="inline-flex items-center justify-center rounded-full border border-emerald-300 bg-white px-6 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-50"
              >
                Sobre a holding
              </a>
            </div>
          </div>

          <div className="rounded-[32px] border border-emerald-200 bg-white p-8 shadow-[0_30px_80px_rgba(14,71,74,0.12)]">
            <div className="flex items-center justify-between rounded-3xl bg-emerald-950 p-6 text-white">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-emerald-200">Fluxo inteligente</p>
                <p className="mt-3 text-2xl font-semibold">Controle em tempo real</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-800">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-8 space-y-4 text-slate-700">
              <p>
                Planeje seu próximo mês, organize contas e acompanhe investimentos com relatórios claros e fáceis de usar.
              </p>
              <p>
                Ideal para quem quer ter mais controle sobre gastos mensais e alcançar sonhos com disciplina financeira.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-emerald-50 p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-emerald-700">Meta mensal</p>
                <p className="mt-3 text-2xl font-semibold text-emerald-950">R$ 3.500</p>
              </div>
              <div className="rounded-3xl bg-emerald-50 p-5">
                <p className="text-sm uppercase tracking-[0.24em] text-emerald-700">Economia projetada</p>
                <p className="mt-3 text-2xl font-semibold text-emerald-950">12%</p>
              </div>
            </div>
          </div>
        </section>

        <section id="solucoes" className="space-y-10">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.32em] text-emerald-700">Soluções</p>
            <h2 className="text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl">
              Tudo que você precisa para dominar seu dinheiro.
            </h2>
            <p className="max-w-3xl text-lg leading-8 text-slate-600">
              Dcash une previsibilidade, controle e visão estratégica para pessoas que querem cuidar melhor do orçamento, sem complicação.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {featureItems.map((item) => (
              <article key={item.title} className="rounded-3xl border border-emerald-200 bg-white p-7 shadow-sm">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-950 text-white">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-emerald-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="vantagens" className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.32em] text-emerald-700">Benefícios</p>
            <h2 className="text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl">
              Praticidade para quem quer mais controle e menos surpresas.
            </h2>
            <p className="max-w-xl text-lg leading-8 text-slate-600">
              Receba alertas, gerencie pagamentos recorrentes e acompanhe a evolução do seu patrimônio com visões simples e estratégicas.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-emerald-50 p-6">
                <h3 className="font-semibold text-emerald-950">Dashboard em um clique</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Tudo em um painel com os números essenciais para a sua rotina financeira.
                </p>
              </div>
              <div className="rounded-3xl bg-emerald-50 p-6">
                <h3 className="font-semibold text-emerald-950">Metas alinhadas</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Configure objetivos de economia, despesas e sonhos de consumo de forma transparente.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-[32px] bg-emerald-950 p-10 text-white shadow-[0_30px_80px_rgba(15,75,63,0.24)]">
            <div className="inline-flex rounded-full bg-emerald-800 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200">
              Visão completa
            </div>
            <div className="mt-8 space-y-6">
              <div>
                <p className="text-4xl font-bold">Organize seu financeiro</p>
                <p className="mt-4 max-w-lg leading-8 text-emerald-200">
                  Conecte suas despesas, categorias e metas em uma jornada contínua de melhora financeira.
                </p>
              </div>
              <div className="space-y-4 rounded-3xl bg-emerald-800/90 p-6">
                <div className="flex items-center gap-3 text-emerald-100">
                  <Users className="h-5 w-5" />
                  <span className="font-semibold">Fácil para todos os perfis</span>
                </div>
                <div className="flex items-center gap-3 text-emerald-100">
                  <Globe className="h-5 w-5" />
                  <span className="font-semibold">Acesso pelo navegador</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="sobre" className="rounded-[32px] border border-emerald-200 bg-white p-10 shadow-sm">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.32em] text-emerald-700">Sobre o Dcash</p>
              <h2 className="text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl">
                A solução financeira da holding Dtasc para quem busca controle e crescimento.
              </h2>
              <p className="max-w-xl text-lg leading-8 text-slate-600">
                Dcash foi desenvolvido para apoiar pessoas e famílias na gestão diária do orçamento, com foco em simplicidade, automação e resultados visíveis.
              </p>
            </div>
            <div className="space-y-5 rounded-3xl bg-emerald-50 p-8">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.28em] text-emerald-700">Confiança</p>
                <p className="text-xl font-semibold text-emerald-950">Uma plataforma da Dtasc com mentalidade de inovação e solidez.</p>
              </div>
              <div className="grid gap-4 text-emerald-700 sm:grid-cols-2">
                <div className="rounded-3xl bg-white p-5 shadow-sm">
                  <p className="text-sm uppercase tracking-[0.24em] text-emerald-500">Transparência</p>
                  <p className="mt-3 font-semibold">Dados claros e decisões melhores.</p>
                </div>
                <div className="rounded-3xl bg-white p-5 shadow-sm">
                  <p className="text-sm uppercase tracking-[0.24em] text-emerald-500">Praticidade</p>
                  <p className="mt-3 font-semibold">Controle financeiro sem papelada nem dor de cabeça.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="contato" className="rounded-[32px] bg-emerald-950 p-10 text-white shadow-[0_30px_80px_rgba(15,75,63,0.24)]">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-emerald-200">Pronto para começar?</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Traga mais segurança e clareza para suas finanças.
              </h2>
            </div>
            <div className="space-y-4 rounded-3xl bg-emerald-900/90 p-8">
              <p className="text-emerald-200">
                Converse com a equipe da Dtasc ou explore o Dcash hoje mesmo. Um bom controle financeiro começa com dados claros e metas reais.
              </p>
              <a
                href="mailto:contato@dtasc.com.br"
                className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3 text-center text-sm font-semibold text-emerald-950 transition hover:bg-emerald-100"
              >
                Fale conosco
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-emerald-200 bg-emerald-50 py-8">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-6 text-sm text-emerald-700 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p>© {new Date().getFullYear()} Dtasc. Todos os direitos reservados.</p>
          <p>Desenvolvido para Dcash, solução de gestão financeira pessoal.</p>
        </div>
      </footer>
    </div>
  );
}
