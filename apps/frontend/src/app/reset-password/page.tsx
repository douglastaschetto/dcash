import { redirect } from 'next/navigation';

/** Password reset now uses a 6-digit e-mail code on the login screen; old links land there. */
export default function ResetPasswordPage() {
  redirect('/login?step=forgot');
}
