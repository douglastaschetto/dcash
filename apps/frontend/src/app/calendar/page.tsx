'use client';

import { Suspense } from 'react';
import { Plus } from '@/components/ui/icons';
import { AppLayout } from '@/components/app-layout';
import { useAuth } from '@/hooks/useAuth';
import { NEW_EVENT_EVENT, UnifiedCalendar } from '@/components/calendar/UnifiedCalendar';

export default function CalendarPage() {
  useAuth();
  const novoEvento = (
    <button data-tour="calendar-add-btn" onClick={() => window.dispatchEvent(new Event(NEW_EVENT_EVENT))} className="btn btn-primary">
      <Plus size={14} strokeWidth={3} /> Novo evento
    </button>
  );
  return (
    <AppLayout title="Agenda" subtitle="Tudo num lugar só: finanças, compromissos e a casa" actions={novoEvento} noPadding>
      <div className="h-full overflow-y-auto">
        <Suspense fallback={<div className="flex h-64 items-center justify-center text-[11px] font-semibold text-fg-2">Carregando...</div>}>
          <UnifiedCalendar />
        </Suspense>
      </div>
    </AppLayout>
  );
}
