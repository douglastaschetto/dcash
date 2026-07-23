'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import api from '@/services/api';
import { Tour, TourStatus } from './types';
import { GuidedTourContext, GuidedTourContextValue } from './guided-tour-context';
import { TourSpotlight } from './TourSpotlight';
import { TourTooltip } from './TourTooltip';

const STORAGE_KEY = 'dcash:tour-progress';

function waitForTarget(target: string, timeoutMs = 4000): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const selector = `[data-tour="${CSS.escape(target)}"]`;
    const check = (): HTMLElement | null => {
      const el = document.querySelector<HTMLElement>(selector);
      return el && el.offsetParent !== null ? el : null;
    };

    const immediate = check();
    if (immediate) { resolve(immediate); return; }

    let settled = false;
    const finish = (el: HTMLElement | null) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(timer);
      resolve(el);
    };

    const observer = new MutationObserver(() => {
      const el = check();
      if (el) finish(el);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    const timer = setTimeout(() => finish(null), timeoutMs);
  });
}

export function GuidedTourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [tour, setTour] = useState<Tour | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [status, setStatus] = useState<TourStatus>('idle');
  const [targetEl, setTargetEl] = useState<HTMLElement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const resumedRef = useRef(false);

  const currentStep = tour?.steps[stepIndex] ?? null;

  const persist = useCallback((tourKey: string, idx: number) => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ tourKey, stepIndex: idx })); } catch {}
  }, []);

  const clearPersisted = useCallback(() => {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const fetchTour = useCallback(async (key: string): Promise<Tour | null> => {
    try {
      const { data } = await api.get(`/guided-tours/${key}`);
      return data;
    } catch {
      return null;
    }
  }, []);

  const close = useCallback(() => {
    setStatus('idle');
    setTour(null);
    setStepIndex(0);
    setTargetEl(null);
    setErrorMessage(null);
    clearPersisted();
  }, [clearPersisted]);

  const startTour = useCallback((key: string) => {
    setStatus('loading');
    setErrorMessage(null);
    fetchTour(key).then((data) => {
      if (!data || data.steps.length === 0) {
        setStatus('error');
        setErrorMessage('Não foi possível carregar este tutorial agora.');
        return;
      }
      setTour(data);
      setStepIndex(0);
      persist(key, 0);
      setStatus('running');
    });
  }, [fetchTour, persist]);

  /* Retoma um tour em andamento salvo no sessionStorage (ex.: após um refresh ou navegação). */
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;

    let raw: string | null = null;
    try { raw = sessionStorage.getItem(STORAGE_KEY); } catch {}
    if (!raw) return;

    try {
      const saved = JSON.parse(raw) as { tourKey: string; stepIndex: number };
      setStatus('loading');
      fetchTour(saved.tourKey).then((data) => {
        if (!data || data.steps.length === 0) {
          clearPersisted();
          setStatus('idle');
          return;
        }
        const idx = Math.min(Math.max(saved.stepIndex, 0), data.steps.length - 1);
        setTour(data);
        setStepIndex(idx);
        setStatus('running');
      });
    } catch {
      clearPersisted();
    }
  }, [fetchTour, clearPersisted]);

  /* Localiza o elemento-alvo do passo atual sempre que ele muda; navega de página se preciso. */
  useEffect(() => {
    if (status !== 'running' || !tour || !currentStep) return;
    let cancelled = false;
    setTargetEl(null);

    if (pathname !== currentStep.route) {
      router.push(currentStep.route);
      return; // a instância desta página vai desmontar; a próxima retoma via sessionStorage
    }

    waitForTarget(currentStep.target).then((el) => {
      if (cancelled) return;
      if (!el) {
        setErrorMessage('Não encontramos essa parte da tela por aqui — tutorial encerrado.');
        setStatus('error');
        clearPersisted();
        return;
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTargetEl(el);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, tour, stepIndex]);

  const goToStep = useCallback((idx: number) => {
    if (!tour) return;
    if (idx < 0) return;
    if (idx >= tour.steps.length) { close(); return; }
    setStepIndex(idx);
    persist(tour.key, idx);
  }, [tour, persist, close]);

  const next = useCallback(() => {
    if (!tour || !currentStep) return;
    if (currentStep.actionType === 'click' && targetEl) {
      const el = targetEl;
      setTimeout(() => {
        el.click();
        goToStep(stepIndex + 1);
      }, 900);
      return;
    }
    goToStep(stepIndex + 1);
  }, [tour, currentStep, targetEl, stepIndex, goToStep]);

  const back = useCallback(() => { goToStep(stepIndex - 1); }, [stepIndex, goToStep]);

  const value: GuidedTourContextValue = {
    status,
    currentStep,
    stepNumber: stepIndex + 1,
    totalSteps: tour?.steps.length ?? 0,
    targetEl,
    errorMessage,
    startTour,
    next,
    back,
    close,
  };

  return (
    <GuidedTourContext.Provider value={value}>
      {children}
      {status === 'running' && targetEl && currentStep && (
        <>
          <TourSpotlight targetEl={targetEl} />
          <TourTooltip />
        </>
      )}
      {status === 'error' && errorMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-zinc-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3">
          ⚠️ {errorMessage}
          <button onClick={close} className="underline font-bold">Fechar</button>
        </div>
      )}
    </GuidedTourContext.Provider>
  );
}
