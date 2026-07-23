'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Menu } from 'lucide-react';

export default function AjudaPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.title = 'DCash — Guia Completo do Usuário';
  }, []);

  useEffect(() => {
    const sections = mainRef.current?.querySelectorAll<HTMLElement>('section.page-section');
    if (!sections) return;
    const q = query.trim().toLowerCase();
    sections.forEach((sec) => {
      if (!q) {
        sec.classList.remove('search-hidden');
        return;
      }
      const match = (sec.textContent || '').toLowerCase().includes(q);
      sec.classList.toggle('search-hidden', !match);
    });
  }, [query]);

  return (
    <>
      <style>{`
        .ajuda-page{
          --bg:#f5f7fa;
          --bg-alt:#ffffff;
          --card:#ffffff;
          --text:#1a2233;
          --text-soft:#4b5567;
          --border:#e2e6ee;
          --accent:#0f766e;
          --accent-soft:#e6f4f2;
          --accent2:#7c3aed;
          --accent2-soft:#f1eafe;
          --good:#0f8a4b;
          --good-soft:#e7f7ee;
          --warn:#b45309;
          --warn-soft:#fef3e2;
          --bad:#c0293a;
          --bad-soft:#fdeaec;
          --pill-basico:#0f766e;
          --pill-inter:#7c3aed;
          --pill-pro:#b45309;
          --shadow:0 1px 3px rgba(20,30,50,.06), 0 8px 24px rgba(20,30,50,.06);
          --radius:14px;
          --sidebar-w:280px;
          background:var(--bg);
          color:var(--text);
          font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
          line-height:1.6;
          font-size:16px;
          min-height:100vh;
        }
        :root[data-theme="dark"] .ajuda-page{
          --bg:#0f1420;
          --bg-alt:#151b2b;
          --card:#161d2e;
          --text:#e8ecf5;
          --text-soft:#a7b0c3;
          --border:#252d42;
          --accent:#2dd4bf;
          --accent-soft:#0f2b28;
          --accent2:#a78bfa;
          --accent2-soft:#241a3d;
          --good:#34d399;
          --good-soft:#0e2a20;
          --warn:#fbbf24;
          --warn-soft:#2e2308;
          --bad:#f87171;
          --bad-soft:#2e1316;
          --pill-basico:#2dd4bf;
          --pill-inter:#a78bfa;
          --pill-pro:#fbbf24;
          --shadow:0 1px 3px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.35);
        }
        .ajuda-page *{box-sizing:border-box;}
        .ajuda-page{scroll-behavior:smooth;}
        .ajuda-page a{color:var(--accent);}
        .ajuda-page h1,.ajuda-page h2,.ajuda-page h3,.ajuda-page h4{line-height:1.25; font-weight:700;}
        .ajuda-page .topbar{
          position:sticky; top:0; z-index:50;
          display:flex; align-items:center; gap:12px;
          padding:10px 20px;
          background:var(--bg-alt);
          border-bottom:1px solid var(--border);
        }
        .ajuda-page .topbar .back-link{
          display:flex; align-items:center; gap:6px;
          font-size:.85rem; font-weight:600; color:var(--text-soft);
          text-decoration:none; padding:6px 10px; border-radius:8px;
        }
        .ajuda-page .topbar .back-link:hover{background:var(--accent-soft); color:var(--accent);}
        .ajuda-page .topbar .logo{font-weight:800; font-size:1.15rem; display:flex; align-items:center; gap:8px;}
        .ajuda-page .topbar .logo .dot{width:10px;height:10px;border-radius:50%;background:var(--accent);display:inline-block;}
        .ajuda-page .topbar input[type="search"]{
          flex:1; max-width:420px; margin-left:auto;
          padding:8px 14px; border-radius:999px; border:1px solid var(--border);
          background:var(--bg); color:var(--text); font-size:.9rem;
        }
        .ajuda-page .icon-btn{
          border:1px solid var(--border); background:var(--bg); color:var(--text);
          border-radius:999px; width:38px; height:38px; cursor:pointer; font-size:1rem;
          display:flex; align-items:center; justify-content:center;
        }
        .ajuda-page .menu-btn{display:none;}
        .ajuda-page .layout{display:flex; max-width:1320px; margin:0 auto;}
        .ajuda-page .sidebar{
          width:var(--sidebar-w); flex-shrink:0;
          position:sticky; top:59px; align-self:flex-start;
          height:calc(100vh - 59px); overflow-y:auto;
          padding:22px 14px 40px;
          border-right:1px solid var(--border);
        }
        .ajuda-page .sidebar h4{
          font-size:.72rem; text-transform:uppercase; letter-spacing:.08em;
          color:var(--text-soft); margin:20px 10px 8px;
        }
        .ajuda-page .sidebar h4:first-child{margin-top:0;}
        .ajuda-page .sidebar a{
          display:flex; align-items:center; gap:8px;
          padding:8px 10px; border-radius:10px; text-decoration:none;
          color:var(--text-soft); font-size:.9rem;
        }
        .ajuda-page .sidebar a:hover{background:var(--accent-soft); color:var(--accent);}
        .ajuda-page main{flex:1; min-width:0; padding:32px clamp(16px,4vw,48px) 80px;}
        .ajuda-page .hero{
          background:linear-gradient(135deg,var(--accent-soft),var(--accent2-soft));
          border:1px solid var(--border);
          border-radius:20px; padding:40px clamp(20px,5vw,56px); margin-bottom:36px;
        }
        .ajuda-page .hero h1{font-size:clamp(1.6rem,3.5vw,2.4rem); margin:0 0 10px;}
        .ajuda-page .hero p{color:var(--text-soft); max-width:60ch; margin:0 0 6px; font-size:1.02rem;}
        .ajuda-page .hero .tags{display:flex; flex-wrap:wrap; gap:8px; margin-top:16px;}
        .ajuda-page .tag{
          font-size:.78rem; font-weight:600; padding:5px 12px; border-radius:999px;
          background:var(--card); border:1px solid var(--border); color:var(--text-soft);
        }
        .ajuda-page section.page-section{
          margin:52px 0; padding-top:8px; scroll-margin-top:75px;
        }
        .ajuda-page section.page-section.search-hidden{display:none;}
        .ajuda-page section.page-section > .head{
          display:flex; align-items:center; gap:14px; margin-bottom:6px;
        }
        .ajuda-page section.page-section > .head .emoji{
          font-size:1.7rem; width:52px; height:52px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          background:var(--card); border:1px solid var(--border); border-radius:14px;
        }
        .ajuda-page section.page-section h2{font-size:1.5rem; margin:0;}
        .ajuda-page section.page-section .subtitle{color:var(--text-soft); margin:2px 0 0; font-size:.95rem;}
        .ajuda-page .card{
          background:var(--card); border:1px solid var(--border); border-radius:var(--radius);
          padding:22px 24px; box-shadow:var(--shadow); margin:18px 0;
        }
        .ajuda-page .grid2{display:grid; grid-template-columns:1fr 1fr; gap:18px;}
        @media (max-width:820px){.ajuda-page .grid2{grid-template-columns:1fr;}}
        .ajuda-page .callout{
          border-radius:14px; padding:16px 18px; margin:16px 0;
          border:1px solid var(--border); display:flex; gap:12px; align-items:flex-start;
        }
        .ajuda-page .callout .ic{font-size:1.2rem; flex-shrink:0; margin-top:1px;}
        .ajuda-page .callout.example{background:var(--accent-soft); border-color:transparent;}
        .ajuda-page .callout.tip{background:var(--good-soft); border-color:transparent;}
        .ajuda-page .callout.warn{background:var(--warn-soft); border-color:transparent;}
        .ajuda-page .callout.bad{background:var(--bad-soft); border-color:transparent;}
        .ajuda-page .callout b{display:block; margin-bottom:2px;}
        .ajuda-page ol,.ajuda-page ul{padding-left:1.3em; margin:10px 0;}
        .ajuda-page li{margin:5px 0;}
        .ajuda-page .plan-pill{
          display:inline-flex; align-items:center; gap:5px;
          font-size:.72rem; font-weight:700; padding:3px 10px; border-radius:999px;
          color:#fff; margin-left:6px; vertical-align:middle;
        }
        .ajuda-page .plan-pill.basico{background:var(--pill-basico); color:#04302c;}
        .ajuda-page .plan-pill.inter{background:var(--pill-inter); color:#2b1259;}
        .ajuda-page .plan-pill.pro{background:var(--pill-pro); color:#3a2404;}
        .ajuda-page table{width:100%; border-collapse:collapse; font-size:.92rem;}
        .ajuda-page th,.ajuda-page td{padding:10px 12px; border-bottom:1px solid var(--border); text-align:left;}
        .ajuda-page th{color:var(--text-soft); font-size:.78rem; text-transform:uppercase; letter-spacing:.04em;}
        .ajuda-page td.center, .ajuda-page th.center{text-align:center;}
        .ajuda-page .badge-yes{color:var(--good); font-weight:700;}
        .ajuda-page .badge-no{color:var(--text-soft);}
        .ajuda-page details{
          background:var(--card); border:1px solid var(--border); border-radius:12px;
          padding:14px 18px; margin:10px 0;
        }
        .ajuda-page details summary{cursor:pointer; font-weight:600; list-style:none;}
        .ajuda-page details summary::-webkit-details-marker{display:none;}
        .ajuda-page details summary::before{content:"▸ "; color:var(--accent);}
        .ajuda-page details[open] summary::before{content:"▾ "; }
        .ajuda-page details p, .ajuda-page details ul{margin-top:10px;}
        .ajuda-page .stepnum{
          display:inline-flex; align-items:center; justify-content:center;
          width:22px; height:22px; border-radius:50%; background:var(--accent);
          color:#fff; font-size:.75rem; font-weight:700; margin-right:8px;
        }
        .ajuda-page code{
          background:var(--accent-soft); color:var(--accent); padding:1px 6px;
          border-radius:5px; font-size:.85em;
        }
        .ajuda-page footer{
          text-align:center; color:var(--text-soft); font-size:.82rem;
          padding:30px 20px; border-top:1px solid var(--border); margin-top:40px;
        }
        .ajuda-page hr.sep{border:none; border-top:1px solid var(--border); margin:40px 0;}
        @media (max-width:960px){
          .ajuda-page .menu-btn{display:flex;}
          .ajuda-page .sidebar{
            position:fixed; left:0; top:59px; z-index:60; background:var(--bg-alt);
            transform:translateX(-105%); transition:transform .2s ease; box-shadow:var(--shadow);
            width:82vw; max-width:320px; height:calc(100vh - 59px);
          }
          .ajuda-page .sidebar.sidebar-open{transform:translateX(0);}
          .ajuda-page .topbar input[type="search"]{max-width:none;}
        }
      `}</style>

      <div className="ajuda-page">
        <div className="topbar">
          <button className="icon-btn menu-btn" aria-label="Abrir menu" onClick={() => setSidebarOpen((v) => !v)}>
            <Menu size={18} />
          </button>
          <a className="back-link" href="/dashboard-v2">
            <ArrowLeft size={16} /> Voltar ao app
          </a>
          <div className="logo"><span className="dot" /> DCash</div>
          <input
            type="search"
            placeholder="Buscar no guia (ex.: cofrinho, fatura, plano)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="layout">
          <nav className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`} onClick={() => setSidebarOpen(false)}>
            <h4>Comece por aqui</h4>
            <a href="#intro">👋 O que é o DCash</a>
            <a href="#primeiros-passos">🚀 Primeiros passos</a>

            <h4>Início</h4>
            <a href="#dashboard">🏠 Painel Início</a>

            <h4>Finanças</h4>
            <a href="#contas">💳 Contas / Carteira</a>
            <a href="#transacoes">🔁 Transações</a>
            <a href="#contas-fixas">📌 Contas Fixas</a>
            <a href="#parcelamentos">🧩 Parcelamentos</a>
            <a href="#categorias">🏷️ Categorias</a>
            <a href="#planejamento">🎯 Planejamento</a>
            <a href="#importar-extrato">📥 Importar Extrato</a>

            <h4>Metas</h4>
            <a href="#cofrinhos">🐷 Cofrinhos</a>
            <a href="#sonhos">🌟 Sonhos</a>
            <a href="#desejos">🛍️ Desejos</a>
            <a href="#desafios">🏆 Desafios</a>

            <h4>Organização</h4>
            <a href="#agenda">📅 Agenda</a>
            <a href="#tarefas">✅ Tarefas</a>
            <a href="#investimentos">📈 Investimentos</a>

            <h4>Conta e assinatura</h4>
            <a href="#perfil">👤 Perfil e Família</a>
            <a href="#planos">💎 Planos e Assinatura</a>

            <h4>Ajuda</h4>
            <a href="#faq">❓ Perguntas Frequentes</a>
            <a href="#glossario">📖 Glossário</a>
          </nav>

          <main ref={mainRef}>

            <div className="hero" id="intro">
              <h1>Guia Completo do DCash</h1>
              <p>O DCash é o seu app de finanças pessoais (e familiares): organiza contas, gastos, contas fixas, parcelamentos, metas e investimentos em um só lugar. Este guia explica, em linguagem simples, para que serve cada tela e como tirar o melhor proveito dela — com exemplos práticos do dia a dia.</p>
              <div className="tags">
                <span className="tag">Sem jargão técnico</span>
                <span className="tag">Exemplo em cada seção</span>
                <span className="tag">Atualizado com o app atual</span>
              </div>
            </div>

            <section className="page-section" id="primeiros-passos">
              <div className="head"><div className="emoji">🚀</div><div><h2>Primeiros passos</h2><p className="subtitle">O caminho mais rápido para o DCash começar a te ajudar de verdade</p></div></div>
              <div className="card">
                <p>Ao entrar pela primeira vez, você verá um checklist “Primeiros passos” na tela Início. Ele te guia por estas 5 etapas — e some sozinho quando todas estiverem concluídas:</p>
                <ol>
                  <li><span className="stepnum">1</span> Cadastre <b>uma conta</b> (seu banco, carteira de dinheiro, cartão de crédito etc.) em <a href="#contas">Contas</a>.</li>
                  <li><span className="stepnum">2</span> Lance <b>sua primeira transação</b> (uma receita ou despesa) em <a href="#transacoes">Transações</a>.</li>
                  <li><span className="stepnum">3</span> Organize seus gastos em pelo menos <b>2 categorias de despesa</b> em <a href="#categorias">Categorias</a>.</li>
                  <li><span className="stepnum">4</span> Crie <b>1 sonho</b> (uma meta de longo prazo) em <a href="#sonhos">Sonhos</a>.</li>
                  <li><span className="stepnum">5</span> Deixe suas <b>tarefas em dia</b> — zere a lista em <a href="#tarefas">Tarefas</a>.</li>
                </ol>
                <div className="callout tip">
                  <div className="ic">💡</div>
                  <div><b>Dica</b>O quiz de boas-vindas que aparece logo no primeiro acesso serve só para te apresentar o app — ele não salva os dados que você digita ali (nome, telefone, cartões, categorias sugeridas). Configure essas informações de verdade nas telas <a href="#perfil">Perfil</a>, <a href="#categorias">Categorias</a>, <a href="#contas">Contas</a> e <a href="#planejamento">Planejamento</a>.</div>
                </div>
              </div>
            </section>

            <hr className="sep" />

            <section className="page-section" id="dashboard">
              <div className="head"><div className="emoji">🏠</div><div><h2>Painel Início</h2><p className="subtitle">Sua visão geral do mês assim que você entra no app</p></div></div>
              <div className="card">
                <p>É a primeira tela que você vê ao entrar. Ela reúne, num só lugar, um resumo do seu dinheiro no mês selecionado: quanto entrou, quanto saiu, quanto sobrou, quanto está comprometido em parcelas e como você está indo comparado ao planejado.</p>
                <ul>
                  <li><b>Cartões de resumo:</b> receita, despesa e saldo do mês, com a comparação (▲/▼) em relação ao mês anterior.</li>
                  <li><b>Gráfico por categoria:</b> mostra onde o dinheiro foi gasto, separado por membro da família quando aplicável. Se uma categoria passar do valor planejado, ela aparece em vermelho com o aviso “acima do orçamento”.</li>
                  <li><b>Aba “DRE”</b> (Demonstrativo de Resultado): visão tipo “empresa”, com resultado do mês, margem (%) e ponto de equilíbrio.</li>
                  <li><b>Raio-X de parcelamentos:</b> mostra que fatia da sua renda já está comprometida com parcelas. Passando de 30%, o card muda de “Saudável” para “Atenção”.</li>
                  <li><b>Mini-calendário</b> com bolinhas coloridas: verde = receita, vermelho = despesa, azul = investimento, laranja = conta fixa.</li>
                  <li><b>Botões rápidos</b> para lançar Nova Receita, Nova Despesa ou Nova Categoria sem sair da tela.</li>
                </ul>
                <div className="callout example">
                  <div className="ic">🧮</div>
                  <div><b>Exemplo</b>Você ganhou R$ 5.000 no mês e gastou R$ 3.800, sendo R$ 900 em parcelas. O painel mostra saldo de R$ 1.200, e no Raio-X de Parcelamentos você vê que 18% da sua renda está comprometida — dentro da faixa saudável.</div>
                </div>
              </div>
            </section>

            <section className="page-section" id="contas">
              <div className="head"><div className="emoji">💳</div><div><h2>Contas / Carteira</h2><p className="subtitle">Onde você cadastra bancos, dinheiro, cartões e financiamentos</p></div></div>
              <div className="card">
                <p>Aqui você cadastra cada “lugar” onde seu dinheiro entra ou sai: conta bancária, dinheiro em espécie, PIX, boleto, cartão de crédito ou um financiamento. Cada uma vira um cartão nesta tela, mostrando o saldo e (para cartão) o limite.</p>
                <ul>
                  <li>Clique em <b>Nova conta</b> para cadastrar; escolha o tipo, dê um nome e informe limite/dia de vencimento se for cartão.</li>
                  <li>Use os filtros no topo para ver só Cartões, só Dinheiro, só Boleto etc.</li>
                  <li>Editar e excluir ficam nos três pontinhos de cada cartão.</li>
                </ul>
                <div className="callout tip">
                  <div className="ic">💡</div>
                  <div><b>Como o saldo é calculado</b>
                    <ul style={{ marginTop: 6 }}>
                      <li><b>Dinheiro, PIX ou boleto:</b> saldo = tudo que entrou menos tudo que saiu naquela conta.</li>
                      <li><b>Cartão de crédito ou financiamento:</b> o número mostrado é o <b>limite ainda disponível</b> (limite total menos as faturas em aberto) — não é “dinheiro guardado”.</li>
                    </ul>
                  </div>
                </div>
                <div className="callout warn">
                  <div className="ic">⚠️</div>
                  <div><b>Atenção ao “Saldo Total”</b>O card de saldo total soma o dinheiro das suas contas com o limite disponível dos cartões. Isso significa que um cartão com bastante limite livre pode “inflar” esse número — ele não representa só o seu dinheiro em caixa.</div>
                </div>
              </div>
            </section>

            <section className="page-section" id="transacoes">
              <div className="head"><div className="emoji">🔁</div><div><h2>Transações</h2><p className="subtitle">O extrato completo de tudo que você lança no DCash</p></div></div>
              <div className="card">
                <p>É a tela onde ficam registradas todas as suas receitas, despesas e investimentos, com filtros por data, categoria, conta, cofrinho e status de pagamento.</p>
                <ul>
                  <li><b>Lançar:</b> use o botão principal para escolher Nova Receita, Nova Despesa ou Investimento.</li>
                  <li><b>Marcar como pago:</b> selecione uma ou várias transações e confirme o pagamento em lote.</li>
                  <li><b>Editar/excluir:</b> disponível em cada linha; se for uma parcela, você escolhe entre excluir só aquela parcela ou o parcelamento inteiro.</li>
                  <li><b>Importar OFX:</b> atalho direto para a tela de <a href="#importar-extrato">Importação de Extrato</a>.</li>
                  <li>Ícones da lista: 📅 conta fixa vinculada, 🧩 parcelado, 🐷 aporte de cofrinho.</li>
                </ul>
                <div className="callout example">
                  <div className="ic">🧮</div>
                  <div><b>Exemplo — parcelamento no cartão</b>Você compra um celular de R$ 1.200 em 4x no cartão. O DCash cria 4 transações de R$ 300, uma por mês. Se a compra foi feita depois do dia de fechamento da fatura, a primeira parcela automaticamente “pula” para o mês seguinte — igual acontece na fatura real do cartão.</div>
                </div>
                <div className="callout tip">
                  <div className="ic">💡</div>
                  <div><b>Investir em um cofrinho ou sonho</b>Ao lançar um “Investimento”, você pode escolher para onde o dinheiro vai: um <a href="#cofrinhos">Cofrinho</a> específico ou direto para um <a href="#sonhos">Sonho</a>. O valor só entra de fato no saldo do cofrinho quando a transação é marcada como paga.</div>
                </div>
              </div>
            </section>

            <section className="page-section" id="contas-fixas">
              <div className="head"><div className="emoji">📌</div><div><h2>Contas Fixas <span className="plan-pill basico">Plano Básico+</span></h2><p className="subtitle">Aluguel, internet, fatura de cartão — tudo que se repete todo mês</p></div></div>
              <div className="card">
                <p>Cadastre uma vez e o DCash lembra por você. Existem dois tipos de conta fixa:</p>
                <ul>
                  <li><b>Conta comum:</b> aluguel, internet, luz, plano de celular etc. Você define descrição, valor, dia de vencimento e categoria.</li>
                  <li><b>Fatura de cartão:</b> vincula direto a um cartão já cadastrado; o valor é somado automaticamente a partir das compras feitas naquele cartão no mês, e o dia de vencimento vem do próprio cadastro do cartão.</li>
                </ul>
                <p>Ao criar uma conta comum, você escolhe se ela deve <b>gerar lançamentos automáticos</b> todo mês (aparecem prontos em Transações) ou ficar <b>apenas como lembrete</b>. Se não definir uma data final, o DCash já gera os lançamentos dos próximos 12 meses.</p>
                <div className="callout example">
                  <div className="ic">🧮</div>
                  <div><b>Exemplo</b>Você cadastra “Aluguel — R$ 1.500, vence dia 5” sem data final. O DCash cria automaticamente o lançamento de aluguel para os próximos 12 meses, e você só marca como pago mês a mês.</div>
                </div>
                <div className="callout warn">
                  <div className="ic">⚠️</div>
                  <div><b>Ao excluir uma conta fixa</b>O DCash apaga a regra e todas as parcelas futuras <b>ainda não pagas</b>. O que já foi pago no passado permanece no seu histórico.</div>
                </div>
              </div>
            </section>

            <section className="page-section" id="parcelamentos">
              <div className="head"><div className="emoji">🧩</div><div><h2>Parcelamentos</h2><p className="subtitle">O raio-X de tudo que você está pagando parcelado</p></div></div>
              <div className="card">
                <p>Uma tela só de consulta (não é aqui que você cria ou edita — isso é feito em <a href="#transacoes">Transações</a>) que agrupa todas as suas compras parceladas e mostra:</p>
                <ul>
                  <li>Quanto ainda falta pagar no total (saldo devedor).</li>
                  <li>Quanto vence este mês e quanto vence no mês seguinte, com a variação entre eles.</li>
                  <li>Quais parcelamentos <b>começam</b> e quais <b>terminam</b> no mês — útil para saber quando vai “sobrar” dinheiro no orçamento.</li>
                  <li>Expandindo um grupo, você vê parcela por parcela: valor, vencimento e se já foi paga.</li>
                </ul>
                <p>Um parcelamento totalmente pago ganha o selo <b>“Quitado”</b>.</p>
              </div>
            </section>

            <section className="page-section" id="categorias">
              <div className="head"><div className="emoji">🏷️</div><div><h2>Categorias</h2><p className="subtitle">Como você organiza para onde o dinheiro vai (e de onde vem)</p></div></div>
              <div className="card">
                <p>As categorias existem em 3 grupos: <b>Receita</b> (salário, freelas...), <b>Despesa</b> (mercado, transporte...) e <b>Reserva/Investimento</b>. Cada categoria tem uma cor e um ícone escolhidos por você, o que ajuda a identificar rapidinho os gráficos do painel Início.</p>
                <ul>
                  <li>Crie ou edite pelo painel lateral, com prévia ao vivo da cor/ícone escolhidos.</li>
                  <li>Os cartões de cada grupo podem ser recolhidos para economizar espaço na tela.</li>
                </ul>
                <div className="callout tip">
                  <div className="ic">💡</div>
                  <div><b>Dica</b>Quanto mais específicas suas categorias de despesa (ex.: “Mercado”, “Delivery”, “Transporte” em vez de só “Gastos gerais”), mais útil fica o gráfico do painel Início e o <a href="#planejamento">Planejamento</a> mensal.</div>
                </div>
              </div>
            </section>

            <section className="page-section" id="planejamento">
              <div className="head"><div className="emoji">🎯</div><div><h2>Planejamento</h2><p className="subtitle">Seu orçamento mês a mês, categoria por categoria</p></div></div>
              <div className="card">
                <p>Aqui você define, para cada mês, quanto pretende gastar em cada categoria de despesa — e depois acompanha se está cumprindo. É diferente da tela “Planos”, que é sobre <a href="#planos">assinatura do DCash</a>.</p>
                <p>Criar um planejamento tem 2 passos:</p>
                <ol>
                  <li><span className="stepnum">1</span> Informe a <b>receita prevista</b> do mês e escolha, num controle deslizante, que <b>% quer guardar de reserva</b>. O DCash calcula sozinho quanto sobra para gastar.</li>
                  <li><span className="stepnum">2</span> Distribua esse valor disponível entre as <b>categorias de despesa</b>. Um contador mostra, em tempo real, quanto ainda falta distribuir (fica vermelho se você passar do limite).</li>
                </ol>
                <p>Não quer redigitar tudo todo mês? Use <b>“Replicar mês anterior”</b> para copiar os valores do mês passado de uma vez.</p>
                <div className="callout example">
                  <div className="ic">🧮</div>
                  <div><b>Exemplo</b>Renda prevista de R$ 4.000, meta de reserva de 10% (R$ 400) → disponível para gastar: R$ 3.600. Você distribui R$ 1.200 em Mercado, R$ 500 em Transporte, R$ 400 em Lazer... e acompanha ao longo do mês se está estourando alguma categoria.</div>
                </div>
                <div className="callout tip">
                  <div className="ic">💡</div>
                  <div>No calendário de 12 meses, meses sem planejamento aparecem em cinza (“Sem planejamento”); a barra fica vermelha quando os gastos passam de 100% do planejado naquele mês.</div>
                </div>
              </div>
            </section>

            <section className="page-section" id="importar-extrato">
              <div className="head"><div className="emoji">📥</div><div><h2>Importar Extrato</h2><p className="subtitle">Traga de uma vez os lançamentos do seu banco (OFX ou CSV)</p></div></div>
              <div className="card">
                <p>Em vez de digitar cada lançamento na mão, você pode importar o arquivo de extrato do seu banco (<code>.ofx</code>) ou uma planilha simples (<code>.csv</code>).</p>
                <ol>
                  <li><span className="stepnum">1</span> Envie o arquivo e, se quiser, já associe a uma conta/cartão específico.</li>
                  <li><span className="stepnum">2</span> O DCash mostra uma prévia de todas as linhas encontradas. Linhas que parecem <b>duplicadas</b> (mesma data, valor e descrição de algo já lançado) ficam marcadas em amarelo e não podem ser selecionadas de novo.</li>
                  <li><span className="stepnum">3</span> Escolha a categoria de cada lançamento (ou deixe em branco para ajustar depois).</li>
                  <li><span className="stepnum">4</span> Confirme para gravar os lançamentos selecionados de uma vez.</li>
                </ol>
                <div className="callout warn">
                  <div className="ic">⚠️</div>
                  <div><b>Revise antes de confirmar</b>Hoje, tudo que vem de um extrato importado entra inicialmente como <b>despesa</b> — mesmo um PIX recebido ou um depósito. Antes de confirmar (ou logo depois, em Transações), edite manualmente para “receita” os lançamentos que forem entradas de dinheiro.</div>
                </div>
                <div className="callout warn">
                  <div className="ic">⚠️</div>
                  <div><b>Cofrinhos não são atualizados sozinhos</b>A importação de extrato não altera o saldo dos seus <a href="#cofrinhos">Cofrinhos</a> automaticamente. Se um valor importado for na verdade um aporte, registre o depósito manualmente na tela de Cofrinhos.</div>
                </div>
              </div>
            </section>

            <hr className="sep" />

            <section className="page-section" id="cofrinhos">
              <div className="head"><div className="emoji">🐷</div><div><h2>Cofrinhos</h2><p className="subtitle">Reservas de dinheiro com metas mensais ou totais</p></div></div>
              <div className="card">
                <p>Um cofrinho é uma “caixinha” digital para guardar dinheiro com um objetivo — viagem, reserva de emergência, presente. Você deposita e retira quando quiser, e acompanha uma barra de progresso.</p>
                <ul>
                  <li><b>Depositar/Retirar:</b> botões dedicados em cada cofrinho.</li>
                  <li><b>Arquivar:</b> “aposenta” o cofrinho sem apagar o histórico — ele some da lista principal, mas os dados continuam guardados.</li>
                </ul>
                <div className="callout warn">
                  <div className="ic">⚠️</div>
                  <div><b>Defina uma meta</b>Se você não definir nenhuma meta mensal ou total, o progresso é calculado como se a meta fosse R$ 1 — ou seja, qualquer valor guardado já aparece como “100% concluído”. Sempre defina uma meta real para o progresso fazer sentido.</div>
                </div>
                <div className="callout example">
                  <div className="ic">🧮</div>
                  <div><b>Exemplo</b>Cofrinho “Viagem para a praia”, meta de R$ 3.000. Você deposita R$ 750 → a barra mostra 25% de progresso.</div>
                </div>
              </div>
            </section>

            <section className="page-section" id="sonhos">
              <div className="head"><div className="emoji">🌟</div><div><h2>Sonhos <span className="plan-pill inter">Plano Intermediário+</span></h2><p className="subtitle">Suas metas de longo prazo, com foto e prazo</p></div></div>
              <div className="card">
                <p>É um “quadro de sonhos” visual: casa própria, carro, viagem dos sonhos. Cada sonho tem uma imagem, um valor-alvo e, se quiser, um prazo.</p>
                <p>Você escolhe como o valor guardado é controlado:</p>
                <ul>
                  <li><b>Manual:</b> você mesmo atualiza o valor guardado sempre que quiser.</li>
                  <li><b>Vinculado a um Cofrinho:</b> o valor guardado do sonho passa a acompanhar automaticamente o saldo daquele cofrinho.</li>
                  <li><b>Vinculado a um item de Desejos:</b> conecta o sonho a um produto da sua lista de desejos.</li>
                </ul>
                <div className="callout tip">
                  <div className="ic">💡</div>
                  <div><b>Dica</b>Se escolher “Manual” e esquecer de atualizar o valor de tempos em tempos, o progresso fica parado — ele não se atualiza sozinho como no modo vinculado a cofrinho.</div>
                </div>
              </div>
            </section>

            <section className="page-section" id="desejos">
              <div className="head"><div className="emoji">🛍️</div><div><h2>Desejos</h2><p className="subtitle">Sua lista de “quero comprar” com caça-preços embutido</p></div></div>
              <div className="card">
                <p>Cadastre produtos que você quer comprar, com prioridade (Essencial, Médio, Baixo) e link de referência. Para cada item, você pode abrir o <b>Caça Preços</b>:</p>
                <ul>
                  <li><b>Preços Salvos:</b> compare cotações que você mesmo cadastrou de diferentes lojas; a mais barata ganha o selo dourado “Melhor”.</li>
                  <li><b>Buscar Online:</b> pesquisa automática de preços (precisa estar configurada pelo administrador do sistema; se não estiver disponível, aparece um aviso explicando).</li>
                  <li><b>Adicionar Manual:</b> registre você mesmo uma cotação que viu em alguma loja.</li>
                </ul>
                <div className="callout warn">
                  <div className="ic">⚠️</div>
                  <div><b>Confira o frete</b>Preços trazidos automaticamente pela busca online são salvos sem considerar o valor real do frete. Antes de decidir onde comprar, confirme o frete direto no site da loja.</div>
                </div>
                <p>Quando você compra o item, marque como <b>“Já Adquirido”</b> — ele fica em tons de cinza na lista, mas continua no seu histórico.</p>
              </div>
            </section>

            <section className="page-section" id="desafios">
              <div className="head"><div className="emoji">🏆</div><div><h2>Desafios <span className="plan-pill basico">Plano Básico+</span></h2><p className="subtitle">Seu diário mensal de metas pessoais</p></div></div>
              <div className="card">
                <p>Não é um jogo automático — é um espaço para você escrever, todo mês, um desafio ou meta pessoal (“Registrar 100% das receitas”, “Não comer fora por 30 dias”) e acompanhar o andamento.</p>
                <ul>
                  <li>Um desafio por mês, com status: <b>Não iniciada</b>, <b>Em andamento</b> ou <b>Concluída</b>.</li>
                  <li>Um anel de progresso mostra sua taxa de desafios concluídos no ano.</li>
                </ul>
                <div className="callout tip">
                  <div className="ic">💡</div>
                  <div>Não existem pontos, streaks ou recompensas automáticas — é um registro para sua própria disciplina e reflexão mensal.</div>
                </div>
              </div>
            </section>

            <hr className="sep" />

            <section className="page-section" id="agenda">
              <div className="head"><div className="emoji">📅</div><div><h2>Agenda</h2><p className="subtitle">Seu calendário financeiro e pessoal, com bolinhas coloridas</p></div></div>
              <div className="card">
                <p>Combina, num único calendário, tudo que tem data: suas transações, contas fixas e eventos que você mesmo cria (consultas, reuniões, lembretes).</p>
                <ul>
                  <li><b>Bolinhas no dia:</b> verde = receita, vermelho = despesa, azul = investimento, laranja = conta fixa.</li>
                  <li><b>Novo Evento:</b> escolha tipo, horário (ou “dia todo”), cor e, se quiser, um alerta por WhatsApp <span className="plan-pill pro">Plano Pro</span>.</li>
                  <li><b>Google Agenda:</b> se conectado no seu Perfil, os eventos podem sincronizar automaticamente <span className="plan-pill inter">Plano Intermediário+</span>.</li>
                  <li>Clique em qualquer dia para ver o resumo detalhado dele num painel lateral.</li>
                </ul>
              </div>
            </section>

            <section className="page-section" id="tarefas">
              <div className="head"><div className="emoji">✅</div><div><h2>Tarefas</h2><p className="subtitle">Uma lista simples de afazeres, pessoal ou da família</p></div></div>
              <div className="card">
                <p>Adicione tarefas rápidas com Enter ou pelo botão “+”. Marque como concluída para movê-la para a seção recolhida “Concluídas”.</p>
                <p>Se você faz parte de um grupo familiar, a tarefa é automaticamente marcada como <b>“Família”</b> (visível para todos os membros); caso contrário é <b>“Pessoal”</b>.</p>
              </div>
            </section>

            <section className="page-section" id="investimentos">
              <div className="head"><div className="emoji">📈</div><div><h2>Investimentos <span className="plan-pill pro">Exclusivo Plano Pro</span></h2><p className="subtitle">Acompanhe sua carteira de ações e FIIs</p></div></div>
              <div className="card">
                <p>Módulo exclusivo do plano Pro para quem investe na bolsa (B3). Três abas:</p>
                <ul>
                  <li><b>Carteira:</b> cadastre suas posições (ticker, quantidade, preço médio) e veja o resultado (lucro/prejuízo) com preços atualizados.</li>
                  <li><b>Pesquisar:</b> consulte indicadores de qualquer ação/FII (dividendos, variação em 12 meses, P/L, P/VP).</li>
                  <li><b>Alertas:</b> seja avisado quando um ativo atingir um preço-alvo (para cima ou para baixo).</li>
                </ul>
                <div className="callout tip">
                  <div className="ic">💡</div>
                  <div><b>Dica</b>Ao pesquisar, digite só o código (ex.: <code>ITSA4</code> ou <code>MXRF11</code>) — não precisa incluir o sufixo “.SA”.</div>
                </div>
                <div className="callout warn">
                  <div className="ic">⚠️</div>
                  <div><b>Alertas disparados não reativam sozinhos</b>Depois que um alerta de preço é disparado (e você é avisado por WhatsApp, se configurado), ele é desativado automaticamente. Para continuar monitorando, crie um novo alerta.</div>
                </div>
              </div>
            </section>

            <hr className="sep" />

            <section className="page-section" id="perfil">
              <div className="head"><div className="emoji">👤</div><div><h2>Perfil e Família</h2><p className="subtitle">Seus dados, preferências e grupo familiar</p></div></div>
              <div className="card">
                <p>Central de configurações da sua conta:</p>
                <ul>
                  <li><b>Dados pessoais:</b> nome, telefone, foto.</li>
                  <li><b>Tema:</b> claro, escuro ou “seguir o sistema”.</li>
                  <li><b>Alertas por WhatsApp</b> <span className="plan-pill pro">Plano Pro</span>: exige telefone cadastrado; escolha o horário preferido para receber avisos.</li>
                  <li><b>Google Agenda</b> <span className="plan-pill inter">Plano Intermediário+</span>: conecte sua conta Google para sincronizar eventos da Agenda.</li>
                  <li><b>Grupo Familiar</b> <span className="plan-pill inter">Plano Intermediário+</span>: crie um grupo e compartilhe um código de convite (formato <code>DCASH-XXXXXX</code>) para que outras pessoas entrem. Dados de contas, transações, categorias e afins passam a ser vistos por todo o grupo.</li>
                </ul>
                <div className="callout tip">
                  <div className="ic">💡</div>
                  <div><b>Vantagem de estar numa família</b>Se o criador do grupo tiver um plano superior ao seu, você herda automaticamente os benefícios desse plano enquanto estiver no grupo.</div>
                </div>
                <div className="callout tip">
                  <div className="ic">💡</div>
                  <div>Só o <b>criador</b> do grupo pode renomeá-lo. Qualquer membro pode copiar o código de convite para compartilhar.</div>
                </div>
              </div>
            </section>

            <section className="page-section" id="planos">
              <div className="head"><div className="emoji">💎</div><div><h2>Planos e Assinatura</h2><p className="subtitle">O que cada plano libera no DCash</p></div></div>
              <div className="card">
                <p>O DCash tem 4 planos: <b>Grátis</b>, <b>Básico</b>, <b>Intermediário</b> e <b>Pro</b>. Você pode ver os preços atuais e fazer upgrade a qualquer momento na tela de Planos (acessível pelo Perfil ou por qualquer aviso de “recurso bloqueado”).</p>
                <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>Recurso</th><th className="center">Grátis</th><th className="center">Básico</th><th className="center">Intermediário</th><th className="center">Pro</th></tr></thead>
                  <tbody>
                    <tr><td>Contas, Transações, Categorias, Planejamento, Agenda, Desejos, Cofrinhos, Tarefas</td><td className="center badge-yes">✓</td><td className="center badge-yes">✓</td><td className="center badge-yes">✓</td><td className="center badge-yes">✓</td></tr>
                    <tr><td>Contas Fixas</td><td className="center badge-no">—</td><td className="center badge-yes">✓</td><td className="center badge-yes">✓</td><td className="center badge-yes">✓</td></tr>
                    <tr><td>Desafios Financeiros</td><td className="center badge-no">—</td><td className="center badge-yes">✓</td><td className="center badge-yes">✓</td><td className="center badge-yes">✓</td></tr>
                    <tr><td>Exportar relatórios</td><td className="center badge-no">—</td><td className="center badge-yes">✓</td><td className="center badge-yes">✓</td><td className="center badge-yes">✓</td></tr>
                    <tr><td>Sonhos</td><td className="center badge-no">—</td><td className="center badge-no">—</td><td className="center badge-yes">✓</td><td className="center badge-yes">✓</td></tr>
                    <tr><td>Grupo Familiar</td><td className="center badge-no">—</td><td className="center badge-no">—</td><td className="center badge-yes">✓</td><td className="center badge-yes">✓</td></tr>
                    <tr><td>Google Agenda</td><td className="center badge-no">—</td><td className="center badge-no">—</td><td className="center badge-yes">✓</td><td className="center badge-yes">✓</td></tr>
                    <tr><td>Alertas por WhatsApp</td><td className="center badge-no">—</td><td className="center badge-no">—</td><td className="center badge-no">—</td><td className="center badge-yes">✓</td></tr>
                    <tr><td>Investimentos</td><td className="center badge-no">—</td><td className="center badge-no">—</td><td className="center badge-no">—</td><td className="center badge-yes">✓</td></tr>
                  </tbody>
                </table>
                </div>
                <p style={{ marginTop: 14 }}>Formas de pagamento aceitas: cartão de crédito, PIX e boleto, processadas com segurança pelos nossos parceiros de pagamento. Após a confirmação do pagamento, seu plano é liberado automaticamente — isso pode levar alguns instantes enquanto o pagamento é confirmado pelo banco/operadora.</p>
                <div className="callout tip">
                  <div className="ic">💡</div>
                  <div><b>Pagamento via boleto ou PIX</b>Boleto pode levar até 3 dias úteis para compensar; PIX e cartão costumam ser confirmados quase na hora. Se a tela de confirmação demorar, não se preocupe — assim que o pagamento for aprovado, seu plano é atualizado automaticamente.</div>
                </div>
              </div>
            </section>

            <hr className="sep" />

            <section className="page-section" id="faq">
              <div className="head"><div className="emoji">❓</div><div><h2>Perguntas Frequentes</h2><p className="subtitle">As dúvidas mais comuns, respondidas direto</p></div></div>

              <details>
                <summary>Por que meu “Saldo Total” está maior do que eu esperava?</summary>
                <p>Porque ele soma o dinheiro das suas contas normais com o <b>limite disponível</b> dos seus cartões de crédito. O limite livre de um cartão não é dinheiro que você tem em caixa — é só quanto ainda pode gastar nele. Veja o saldo de cada conta individualmente em <a href="#contas">Contas</a>.</p>
              </details>

              <details>
                <summary>Preenchi meus dados no quiz inicial (onboarding), mas eles não aparecem no Perfil. Por quê?</summary>
                <p>O quiz de boas-vindas é apenas uma apresentação do app — ele não grava as informações digitadas. Cadastre seus dados reais diretamente em <a href="#perfil">Perfil</a>, <a href="#contas">Contas</a>, <a href="#categorias">Categorias</a> e <a href="#planejamento">Planejamento</a>.</p>
              </details>

              <details>
                <summary>Importei meu extrato e um PIX que recebi apareceu como despesa. Isso é normal?</summary>
                <p>Sim, é um comportamento atual da importação: todo lançamento importado entra como despesa por padrão. Edite manualmente para “receita” os itens que forem entradas de dinheiro logo após a importação.</p>
              </details>

              <details>
                <summary>Meu cofrinho já mostra 100% de progresso com pouco dinheiro guardado. O que houve?</summary>
                <p>Provavelmente você não definiu uma meta (mensal ou total) para esse cofrinho. Sem meta definida, o DCash considera R$ 1 como referência, então qualquer valor já aparece como “concluído”. Edite o cofrinho e defina uma meta real.</p>
              </details>

              <details>
                <summary>Por que não consigo usar Contas Fixas / Sonhos / Investimentos?</summary>
                <p>Esses recursos são liberados a partir de determinados planos — veja a tabela em <a href="#planos">Planos e Assinatura</a>. A tela do recurso mostra um aviso com botão “Ver planos” quando isso acontece.</p>
              </details>

              <details>
                <summary>Cadastrei uma conta fixa sem data final. Isso nunca mais vai parar de gerar lançamentos?</summary>
                <p>O DCash gera automaticamente os lançamentos dos próximos 12 meses a partir da data de cadastro. Perto do fim desse período, revise a conta fixa (ela continua ativa; se quiser, edite para renovar o período).</p>
              </details>

              <details>
                <summary>Excluí uma conta fixa e algumas contas dos meses anteriores sumiram. É normal?</summary>
                <p>Não — excluir uma conta fixa remove a regra e as parcelas <b>futuras não pagas</b>. Lançamentos já pagos no passado não são apagados. Se algo pago sumiu, entre em contato com o suporte.</p>
              </details>

              <details>
                <summary>Um alerta de preço de uma ação disparou e agora não aviso mais nada sobre ela. Por quê?</summary>
                <p>Alertas disparados são desativados automaticamente após o aviso. Crie um novo alerta em <a href="#investimentos">Investimentos → Alertas</a> se quiser continuar acompanhando aquele ativo.</p>
              </details>

              <details>
                <summary>Pedi recuperação de senha e recebi a mensagem de sucesso, mas o e-mail não chegou. O que fazer?</summary>
                <p>Por segurança, o DCash sempre mostra a mensagem de “e-mail enviado” mesmo que o endereço digitado não esteja cadastrado (assim ninguém descobre quais e-mails estão cadastrados). Confira se digitou o e-mail correto — o mesmo usado no cadastro — e verifique a caixa de spam antes de tentar de novo.</p>
              </details>
            </section>

            <hr className="sep" />

            <section className="page-section" id="glossario">
              <div className="head"><div className="emoji">📖</div><div><h2>Glossário</h2><p className="subtitle">Termos usados no DCash, explicados rapidinho</p></div></div>
              <div className="card">
                <div className="grid2">
                  <div>
                    <p><b>Conta fixa</b> — despesa que se repete todo mês (aluguel, internet).</p>
                    <p><b>Parcelamento</b> — compra dividida em várias transações mensais ligadas entre si.</p>
                    <p><b>Cofrinho</b> — reserva de dinheiro com meta e saldo próprio.</p>
                    <p><b>Sonho</b> — meta de longo prazo com imagem e valor-alvo.</p>
                  </div>
                  <div>
                    <p><b>Grupo familiar</b> — conjunto de pessoas que compartilham as mesmas contas/transações/metas no app.</p>
                    <p><b>DRE</b> — Demonstrativo de Resultado: visão “receita menos despesa” do mês, como um mini-balanço.</p>
                    <p><b>Recurso “gated”/bloqueado</b> — funcionalidade disponível apenas a partir de determinado plano de assinatura.</p>
                    <p><b>Staging de importação</b> — área temporária onde ficam os lançamentos de um extrato antes de você confirmar a importação.</p>
                  </div>
                </div>
              </div>
            </section>

            <footer>
              DCash — Guia do Usuário gerado a partir do funcionamento real do sistema · uso interno e de suporte ao cliente
            </footer>

          </main>
        </div>
      </div>
    </>
  );
}
