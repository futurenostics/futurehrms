// Login screen — split layout matching the reference
function LoginScreen() {
  return (
    <div style={{
      width: '100%', minHeight: '100%', padding: 28,
      background: 'linear-gradient(135deg, oklch(0.96 0.025 30) 0%, oklch(0.97 0.020 280) 40%, oklch(0.96 0.025 80) 100%)',
      display: 'flex', alignItems: 'stretch', justifyContent: 'center',
      fontFamily: 'var(--fn-font-sans)',
    }}>
      <div style={{
        width: '100%', maxWidth: 1280, display: 'grid', gridTemplateColumns: '1fr 1fr',
        background: 'var(--fn-bg-panel)', borderRadius: 16,
        border: '1px solid var(--fn-border)',
        boxShadow: '0 30px 60px -20px rgba(40, 30, 70, 0.18), 0 8px 24px -8px rgba(40, 30, 70, 0.08)',
        overflow: 'hidden',
      }}>
        {/* LEFT — form */}
        <LoginForm />
        {/* RIGHT — promo panel */}
        <LoginPromo />
      </div>
    </div>
  );
}

function LoginForm() {
  return (
    <div style={{
      padding: '40px 64px', display: 'flex', flexDirection: 'column',
      background: 'var(--fn-bg-panel)',
    }}>
      {/* Logo top-left */}
      <div>
        <Logo size={18} />
      </div>

      {/* Form block — centered vertically */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        maxWidth: 380, width: '100%', marginInline: 'auto',
      }}>
        {/* Hero icon */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          marginBottom: 28, position: 'relative',
        }}>
          {/* Subtle grid backdrop */}
          <div style={{
            position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
            width: 360, height: 140, opacity: 0.5, pointerEvents: 'none',
            backgroundImage: `
              linear-gradient(to right, color-mix(in oklch, var(--fn-accent) 18%, transparent) 1px, transparent 1px),
              linear-gradient(to bottom, color-mix(in oklch, var(--fn-accent) 18%, transparent) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          }} />
          <div style={{
            width: 64, height: 64, borderRadius: 14,
            background: 'linear-gradient(135deg, var(--fn-accent) 0%, oklch(0.45 0.20 280) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 24px -6px color-mix(in oklch, var(--fn-accent) 50%, transparent), 0 4px 8px -2px rgba(40, 30, 70, 0.12)',
            position: 'relative', zIndex: 1,
          }}>
            <Icon
              d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"
              size={28}
              stroke={2}
              style={{ color: '#fff' }}
            />
          </div>
        </div>

        <h1 style={{
          margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em',
          color: 'var(--fn-fg)', textAlign: 'center',
        }}>
          Login to your account!
        </h1>
        <p style={{
          margin: '8px 0 0', fontSize: 13.5, color: 'var(--fn-fg-muted)',
          textAlign: 'center', lineHeight: 1.5,
        }}>
          Enter your registered email address and password to login.
        </p>

        <form style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--fn-fg)', marginBottom: 6 }}>
              Email
            </label>
            <Input
              icon={I.mail}
              placeholder="eg. asma.ali@futurenostics.com"
              style={{ height: 42 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--fn-fg)', marginBottom: 6 }}>
              Password
            </label>
            <Input
              icon={I.lock}
              type="password"
              defaultValue="••••••••••••"
              suffix={<Icon d={I.eye} size={15} style={{ color: 'var(--fn-fg-faint)', cursor: 'pointer' }} />}
              style={{ height: 42 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fn-fg-muted)', cursor: 'pointer' }}>
              <span style={{
                width: 18, height: 18, borderRadius: 4,
                border: '1.5px solid var(--fn-border-strong)',
                background: 'var(--fn-bg-panel)',
                display: 'inline-block',
              }} />
              Remember me
            </label>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-accent-soft-fg)', cursor: 'pointer' }}>
              Forgot Password?
            </span>
          </div>

          <button style={{
            marginTop: 6, height: 46, padding: '0 16px',
            background: 'var(--fn-accent)', color: 'var(--fn-accent-fg)',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em',
            boxShadow: '0 4px 10px -2px color-mix(in oklch, var(--fn-accent) 45%, transparent)',
          }}>
            Login
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0 0',
            color: 'var(--fn-fg-faint)', fontSize: 12,
          }}>
            <div style={{ flex: 1, borderTop: '1px solid var(--fn-divider)' }} />
            Or login with
            <div style={{ flex: 1, borderTop: '1px solid var(--fn-divider)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <SocialButton kind="google" />
            <SocialButton kind="apple" />
            <SocialButton kind="microsoft" />
          </div>
        </form>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 11.5, color: 'var(--fn-fg-faint)',
      }}>
        <span>© 2026 Futurenostics</span>
        <span style={{ display: 'flex', gap: 14 }}>
          <span style={{ cursor: 'pointer' }}>Privacy</span>
          <span style={{ cursor: 'pointer' }}>Status</span>
          <span style={{ fontFamily: 'var(--fn-font-mono)' }}>v0.7.2-beta</span>
        </span>
      </div>
    </div>
  );
}

function SocialButton({ kind }) {
  const content = {
    google: <GoogleIcon />,
    apple: <AppleIcon />,
    microsoft: <MicrosoftIcon />,
  };
  return (
    <button style={{
      height: 50, background: 'var(--fn-bg-panel)',
      border: '1px solid var(--fn-border-strong)', borderRadius: 8,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', fontFamily: 'inherit',
    }}>
      {content[kind]}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--fn-fg)' }}>
      <path d="M17.05 12.04c-.03-3.07 2.5-4.54 2.61-4.61-1.42-2.08-3.64-2.37-4.43-2.4-1.89-.19-3.68 1.11-4.64 1.11-.97 0-2.44-1.08-4-1.05-2.06.03-3.96 1.2-5.02 3.04-2.14 3.72-.55 9.21 1.54 12.22 1.02 1.47 2.24 3.13 3.85 3.07 1.55-.06 2.13-1 4-1 1.86 0 2.4 1 4.03.97 1.66-.03 2.71-1.5 3.73-2.98 1.17-1.71 1.65-3.37 1.68-3.45-.04-.02-3.22-1.24-3.35-4.92zM14.36 3.61c.86-1.04 1.43-2.48 1.27-3.92-1.23.05-2.71.82-3.6 1.85-.8.92-1.49 2.39-1.3 3.79 1.37.11 2.77-.7 3.63-1.72z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M13 1h10v10H13z" />
      <path fill="#00A4EF" d="M1 13h10v10H1z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  );
}

function LoginPromo() {
  // Orbital diagram with 6 satellite icons around a central logo
  const sats = [
    { angle: -90, r: 110, hue: 200, label: 'cal', d: 'M3 6h18M3 12h18M3 18h18M6 3v3M18 3v3', bg: '#fff' }, // top — calendar grid
    { angle: -150, r: 130, hue: 145, label: 'mail', d: I.mail, bg: 'oklch(0.95 0.06 145)' },
    { angle: 150, r: 130, hue: 245, label: 'chat', d: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z', bg: 'oklch(0.96 0.05 245)' },
    { angle: -30, r: 130, hue: 22, label: 'card', d: I.card, bg: 'oklch(0.96 0.06 22)' },
    { angle: 30, r: 130, hue: 175, label: 'briefcase', d: I.briefcase, bg: 'oklch(0.95 0.06 175)' },
    { angle: 90, r: 130, hue: 280, label: 'users', d: I.users, bg: 'oklch(0.96 0.06 280)' },
  ];

  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(155deg, oklch(0.96 0.03 280) 0%, oklch(0.94 0.04 245) 60%, oklch(0.96 0.025 200) 100%)',
      display: 'flex', flexDirection: 'column', padding: '44px 56px',
    }}>
      <h2 style={{
        margin: 0, fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em',
        color: 'var(--fn-fg)', textAlign: 'center',
      }}>
        One place for{' '}
        <span style={{ color: 'var(--fn-accent)' }}>everyone</span>
      </h2>

      {/* Orbital diagram */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 380 }}>
        <div style={{ width: 360, height: 360, position: 'relative' }}>
          {/* Concentric orbit rings */}
          {[80, 130, 175].map((r, i) => (
            <div key={r} style={{
              position: 'absolute', top: `calc(50% - ${r}px)`, left: `calc(50% - ${r}px)`,
              width: r * 2, height: r * 2, borderRadius: 99,
              border: `1px solid color-mix(in oklch, var(--fn-accent) ${22 - i * 5}%, transparent)`,
              opacity: 0.9,
            }} />
          ))}

          {/* Central logo */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 80, height: 80, borderRadius: 18,
            background: 'linear-gradient(135deg, var(--fn-accent) 0%, oklch(0.42 0.20 280) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 16px 30px -8px color-mix(in oklch, var(--fn-accent) 55%, transparent), 0 6px 12px -4px rgba(40, 30, 70, 0.15)',
            zIndex: 2,
          }}>
            <span style={{
              fontSize: 30, fontWeight: 700, letterSpacing: '-0.05em',
              fontFamily: 'var(--fn-font-display)', color: '#fff', position: 'relative',
            }}>
              F
              <span style={{
                position: 'absolute', right: -8, bottom: 4, width: 6, height: 6,
                background: 'oklch(0.94 0.06 175)', borderRadius: 99,
              }} />
            </span>
          </div>

          {/* Satellites */}
          {sats.map((s, i) => {
            const rad = (s.angle * Math.PI) / 180;
            const x = Math.cos(rad) * s.r;
            const y = Math.sin(rad) * s.r;
            return (
              <div key={i} style={{
                position: 'absolute', top: `calc(50% + ${y}px)`, left: `calc(50% + ${x}px)`,
                transform: 'translate(-50%, -50%)',
                width: 52, height: 52, borderRadius: 14,
                background: s.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 16px -4px rgba(40, 30, 70, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.5)',
                color: `oklch(0.42 0.16 ${s.hue})`,
                zIndex: 3,
              }}>
                <Icon d={s.d} size={22} stroke={1.8} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer caption */}
      <div style={{ marginTop: 'auto' }}>
        <p style={{
          margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--fn-fg-muted)',
          textAlign: 'center', fontStyle: 'italic',
        }}>
          Built for <strong style={{ color: 'var(--fn-fg)', fontWeight: 600, fontStyle: 'normal' }}>HR, finance, and engineering</strong> — one source of truth for every person, project, and payout.
        </p>

        {/* Pagination dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 18 }}>
          <span style={{ width: 24, height: 4, borderRadius: 99, background: 'var(--fn-accent)' }} />
          <span style={{ width: 6, height: 4, borderRadius: 99, background: 'color-mix(in oklch, var(--fn-accent) 25%, transparent)' }} />
          <span style={{ width: 6, height: 4, borderRadius: 99, background: 'color-mix(in oklch, var(--fn-accent) 25%, transparent)' }} />
        </div>
      </div>
    </div>
  );
}

window.LoginScreen = LoginScreen;
