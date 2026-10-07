import { redirect } from 'next/navigation';

/** "Quem Tem Compromisso?" now lives in the unified DCash calendar. */
export default function DcaosAgendaRedirect() {
  redirect('/calendar');
}
