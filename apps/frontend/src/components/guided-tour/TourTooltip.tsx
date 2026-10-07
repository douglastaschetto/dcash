'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useGuidedTour } from './guided-tour-context';

export function TourTooltip() {
  const { currentStep, targetEl, stepNumber, totalSteps, next, back, close } = useGuidedTour();
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!targetEl) return;
    const update = () => setRect(targetEl.getBoundingClientRect());
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [targetEl]);

  if (!rect || !currentStep) return null;

  const gap = 16;
  const style: CSSProperties = { position: 'fixed', zIndex: 9999 };
  if (currentStep.placement === 'bottom') {
    style.top = rect.bottom + gap;
    style.left = Math.min(Math.max(12, rect.left), window.innerWidth - 340);
  } else if (currentStep.placement === 'top') {
    style.bottom = window.innerHeight - rect.top + gap;
    style.left = Math.min(Math.max(12, rect.left), window.innerWidth - 340);
  } else if (currentStep.placement === 'left') {
    style.top = Math.min(Math.max(12, rect.top), window.innerHeight - 220);
    style.right = window.innerWidth - rect.left + gap;
  } else {
    style.top = Math.min(Math.max(12, rect.top), window.innerHeight - 220);
    style.left = rect.right + gap;
  }

  const isLast = stepNumber >= totalSteps;

  return (
    <div
      style={style}
      className="w-80 max-w-[88vw] rounded-2xl bg-card shadow-2xl border border-primary-border p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-accent">
          🎯 Passo {stepNumber} de {totalSteps}
        </span>
        <button onClick={close} className="text-xs text-fg-muted hover:text-danger font-semibold" aria-label="Fechar tutorial">
          ✕
        </button>
      </div>

      <h3 className="text-sm font-semibold text-fg mb-1">{currentStep.title}</h3>
      <p className="text-xs text-fg-2 leading-relaxed">{currentStep.description}</p>

      {currentStep.actionType === 'navigate' && (
        <p className="text-[11px] font-semibold text-info mt-2">🧭 Vamos te levar para outra tela automaticamente.</p>
      )}
      {currentStep.actionType === 'click' && (
        <p className="text-[11px] font-semibold text-info mt-2">👆 Vamos clicar aqui sozinhos ao avançar.</p>
      )}

      <div className="flex items-center justify-between mt-4">
        <button
          onClick={back}
          disabled={stepNumber <= 1}
          className="text-xs font-semibold text-fg-muted disabled:opacity-30 hover:text-accent transition"
        >
          ← Voltar
        </button>
        <div className="flex items-center gap-3">
          <button onClick={close} className="text-xs font-semibold text-fg-muted hover:text-danger transition">
            Pular tour
          </button>
          <button
            onClick={next}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold transition"
          >
            {isLast ? 'Concluir 🎉' : 'Próximo →'}
          </button>
        </div>
      </div>
    </div>
  );
}
