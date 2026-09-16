import { redirect } from 'next/navigation';

/** Legacy medical claims list — unified under Expenses. */
export default function OpdClaimsRedirectPage() {
  redirect('/expenses');
}
