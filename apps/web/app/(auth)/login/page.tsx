import type { Metadata } from 'next';
import { LoginCard } from './login-card';

export const metadata: Metadata = { title: 'Login' };

// useSearchParams() inside <LoginCard> reads the `from` query param to
// preserve the original destination after sign-in. Force-dynamic so
// Next doesn't try to prerender without a query.
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return <LoginCard />;
}
