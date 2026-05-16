import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Futurenostics HRMS',
    template: '%s · Futurenostics HRMS',
  },
  description: 'Internal HR, payroll, and commission management for Futurenostics.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={poppins.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
