import type { Metadata } from 'next';
import { LoginCard } from './login-card';

export const metadata: Metadata = { title: 'Login' };

export default function LoginPage() {
  return <LoginCard />;
}
