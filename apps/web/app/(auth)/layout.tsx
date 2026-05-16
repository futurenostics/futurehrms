export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="flex min-h-screen w-full items-stretch justify-center p-7"
      style={{
        background:
          'linear-gradient(135deg, oklch(0.96 0.025 30) 0%, oklch(0.97 0.020 280) 40%, oklch(0.96 0.025 80) 100%)',
      }}
    >
      {children}
    </main>
  );
}
