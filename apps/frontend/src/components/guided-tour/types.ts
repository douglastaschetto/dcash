export type TourPlacement = 'top' | 'bottom' | 'left' | 'right';
export type TourActionType = 'none' | 'click' | 'navigate';

export interface TourStep {
  id: string;
  order: number;
  target: string;
  route: string;
  title: string;
  description: string;
  placement: TourPlacement;
  actionType: TourActionType;
  actionValue?: string | null;
}

export interface Tour {
  id: string;
  key: string;
  title: string;
  description?: string | null;
  steps: TourStep[];
}

export type TourStatus = 'idle' | 'loading' | 'running' | 'error';
