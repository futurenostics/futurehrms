import { redirect } from 'next/navigation';

/** Legacy gym claims list — unified under Expenses. */
export default function GymClaimsRedirectPage() {
  redirect('/expenses');
}
