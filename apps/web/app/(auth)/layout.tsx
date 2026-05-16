export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="flex min-h-screen w-full items-stretch justify-center p-7"
      style={{ background: 'var(--fn-auth-page-bg)' }}
    >
      {children}
    </main>
  );
}
