export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="p-fn-7 flex min-h-screen w-full items-stretch justify-center"
      style={{ background: 'var(--fn-auth-page-bg)' }}
    >
      {children}
    </main>
  );
}
