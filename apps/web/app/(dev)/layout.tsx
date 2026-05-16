/**
 * `(dev)` route group — dev-only tooling that lives outside the app
 * shell. The root layout (`app/layout.tsx`) still wraps these pages
 * with html/body, font, and theme provider; this layout just adds a
 * production gate so the dev pages 404 in production builds.
 */
import { notFound } from 'next/navigation';

export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return <>{children}</>;
}
