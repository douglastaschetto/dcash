'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Users,
  Grid3x3,
  CreditCard,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  X,
} from 'lucide-react';

const steps = [
  {
    id: 1,
    title: 'Completar Cadastro',
    description: 'Finalize seus dados pessoais',
    icon: User,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    id: 2,
    title: 'Criar Família',
    description: 'Invite membros da família (opcional)',
    icon: Users,
    color: 'bg-purple-100 text-purple-600',
  },
  {
    id: 3,
    title: 'Categorias',
    description: 'Configure suas categorias de gastos',
    icon: Grid3x3,
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    id: 4,
    title: 'Formas de Pagamento',
    description: 'Adicione seus cartões e contas',
    icon: CreditCard,
    color: 'bg-orange-100 text-orange-600',
  },
  {
    id: 5,
    title: 'Planejamento Mensal',
    description: 'Defina limites de gastos por categoria',
    icon: TrendingUp,
    color: 'bg-rose-100 text-rose-600',
  },
];

const StepContent = ({
  step,
  onComplete,
}: {
  step: (typeof steps)[0];
  onComplete: () => void;
}) => {
  const Icon = step.icon;

  switch (step.id) {
    case 1:
      return (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-emerald-950 mb-2">
              Nome Completo
            </label>
            <input
              type="text"
              placeholder="Seu nome completo"
              className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm outline-none focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-emerald-950 mb-2">
              Telefone
            </label>
            <input
              type="tel"
              placeholder="(11) 99999-9999"
              className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm outline-none focus:border-emerald-600"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-emerald-950 mb-2">
              Data de Nascimento
            </label>
            <input
              type="date"
              className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm outline-none focus:border-emerald-600"
            />
          </div>
          <button
            onClick={onComplete}
            className="w-full rounded-lg bg-emerald-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Continuar
          </button>
        </div>
      );

    case 2:
      return (
        <div className="space-y-6">
          <p className="text-sm text-slate-600">
            Você pode adicionar membros da sua família para compartilhar o controle financeiro.
          </p>
          <div className="space-y-3">
            <input
              type="email"
              placeholder="E-mail do membro"
              className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm outline-none focus:border-emerald-600"
            />
            <button className="w-full rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50">
              + Adicionar Membro
            </button>
          </div>
          <button
            onClick={onComplete}
            className="w-full rounded-lg bg-emerald-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Continuar (Pular se não quiser)
          </button>
        </div>
      );

    case 3:
      const defaultCategories = [
        'Alimentação',
        'Transporte',
        'Saúde',
        'Educação',
        'Lazer',
        'Investimentos',
      ];
      return (
        <div className="space-y-6">
          <p className="text-sm text-slate-600">
            Configure suas categorias de receitas e despesas. Você pode editá-las depois.
          </p>
          <div className="space-y-2">
            {defaultCategories.map((cat) => (
              <label
                key={cat}
                className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 cursor-pointer hover:bg-emerald-100"
              >
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-emerald-600"
                />
                <span className="text-sm font-medium text-emerald-950">{cat}</span>
              </label>
            ))}
          </div>
          <button
            onClick={onComplete}
            className="w-full rounded-lg bg-emerald-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Continuar
          </button>
        </div>
      );

    case 4:
      return (
        <div className="space-y-6">
          <p className="text-sm text-slate-600">
            Adicione suas contas e cartões para começar a controlar suas finanças.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nome do cartão/conta"
              className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm outline-none focus:border-emerald-600"
            />
            <select className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm outline-none focus:border-emerald-600">
              <option>Cartão de Crédito</option>
              <option>Conta Corrente</option>
              <option>Poupança</option>
            </select>
            <button className="w-full rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50">
              + Adicionar Forma de Pagamento
            </button>
          </div>
          <button
            onClick={onComplete}
            className="w-full rounded-lg bg-emerald-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Continuar
          </button>
        </div>
      );

    case 5:
      return (
        <div className="space-y-6">
          <p className="text-sm text-slate-600">
            Define limites de gastos mensais por categoria.
          </p>
          <div className="space-y-4">
            {['Alimentação', 'Transporte', 'Lazer'].map((cat) => (
              <div key={cat}>
                <label className="block text-sm font-medium text-emerald-950 mb-1">
                  {cat}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">R$</span>
                  <input
                    type="number"
                    placeholder="0,00"
                    className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={onComplete}
            className="w-full rounded-lg bg-emerald-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Continuar
          </button>
        </div>
      );

    default:
      return null;
  }
};

export default function OnboardingSetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const handleStepComplete = () => {
    setCompletedSteps([...completedSteps, steps[currentStep].id]);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleFinish = () => {
    router.push('/dashboard-v2');
  };

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-emerald-50 text-slate-950">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 sm:px-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-emerald-950">Bem-vindo ao DCash!</h1>
            <p className="mt-2 text-sm text-slate-600">
              Vamos completar seu perfil e configurar a plataforma para você
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard-v2')}
            className="p-2 text-slate-600 hover:text-slate-950 transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-emerald-950">
              Passo {currentStep + 1} de {steps.length}
            </span>
            <span className="text-sm text-slate-600">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-emerald-200">
            <div
              className="h-2 rounded-full bg-emerald-950 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Steps Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-2">
              {steps.map((s, idx) => {
                const isCompleted = completedSteps.includes(s.id);
                const isCurrent = idx === currentStep;
                const Icon = s.icon;

                return (
                  <button
                    key={s.id}
                    onClick={() => setCurrentStep(idx)}
                    className={`w-full rounded-lg p-4 text-left transition ${
                      isCurrent
                        ? 'border-2 border-emerald-950 bg-emerald-50'
                        : isCompleted
                          ? 'border border-emerald-200 bg-white'
                          : 'border border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <div
                          className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                            isCurrent ? 'bg-emerald-950' : 'bg-slate-300'
                          }`}
                        >
                          {s.id}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-emerald-950">{s.title}</p>
                        <p className="text-xs text-slate-600 truncate">{s.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-lg">
              <div className="mb-8 flex items-center gap-4">
                <div className={`h-16 w-16 rounded-full flex items-center justify-center ${step.color}`}>
                  <step.icon className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-emerald-950">{step.title}</h2>
                  <p className="text-sm text-slate-600">{step.description}</p>
                </div>
              </div>

              <div className="mb-8 border-t border-slate-200 pt-8">
                <StepContent
                  step={step}
                  onComplete={handleStepComplete}
                />
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-3 border-t border-slate-200 pt-6">
                <button
                  onClick={handleSkip}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Pular
                </button>
                {currentStep === steps.length - 1 && completedSteps.length > 0 && (
                  <button
                    onClick={handleFinish}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
                  >
                    Finalizar Setup
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
