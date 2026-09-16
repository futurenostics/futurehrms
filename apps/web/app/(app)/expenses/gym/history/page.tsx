import { redirect } from 'next/navigation';

/** Legacy gym history — unified under Expenses history. */
export default function GymHistoryRedirectPage() {
  redirect('/expenses/history');
}
