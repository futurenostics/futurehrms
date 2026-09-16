import { redirect } from 'next/navigation';

/** Legacy medical history — unified under Expenses history. */
export default function OpdHistoryRedirectPage() {
  redirect('/expenses/history');
}
