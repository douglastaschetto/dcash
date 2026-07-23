'use client';

import { createContext, useContext } from 'react';
import { TourStep, TourStatus } from './types';

export interface GuidedTourContextValue {
  status: TourStatus;
  currentStep: TourStep | null;
  stepNumber: number;
  totalSteps: number;
  targetEl: HTMLElement | null;
  errorMessage: string | null;
  startTour: (key: string) => void;
  next: () => void;
  back: () => void;
  close: () => void;
}

export const GuidedTourContext = createContext<GuidedTourContextValue | null>(null);

export function useGuidedTour(): GuidedTourContextValue {
  const ctx = useContext(GuidedTourContext);
  if (!ctx) throw new Error('useGuidedTour deve ser usado dentro de <GuidedTourProvider>.');
  return ctx;
}
